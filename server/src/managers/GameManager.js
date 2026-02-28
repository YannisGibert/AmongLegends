const { GamePhase, Teams, Roles } = require('../config/constants');
const Game = require('../models/Game');
const { assignLolRoles, assignSecretRoles } = require('./RoleManager');
const DoubleFaceManager = require('./DoubleFaceManager');
const { calculateScores } = require('./ScoreManager');
const { shuffle } = require('../utils/arrayUtils');
const { DROIDE_COMMANDS } = require('../data/commands');

function validateTeams(lobby) {
  const e1 = lobby.getTeamPlayers(Teams.EQUIPE1);
  const e2 = lobby.getTeamPlayers(Teams.EQUIPE2);

  if (e1.length === 0) throw new Error('L\'Équipe 1 est vide.');
  if (e1.length !== 5) throw new Error('L\'Équipe 1 doit avoir exactement 5 joueurs.');

  // 5-player mode: equipe2 can be empty
  if (e2.length > 0 && e2.length !== 5) {
    throw new Error('L\'Équipe 2 doit avoir exactement 5 joueurs (ou être vide pour une partie à 5).');
  }
}

function startGame(lobby) {
  validateTeams(lobby);

  lobby.roundNumber += 1;
  const game = new Game({ roundNumber: lobby.roundNumber });
  lobby.currentGame = game;

  // Assign LoL roles
  assignLolRoles(lobby);

  // Update settings
  const e2 = lobby.getTeamPlayers(Teams.EQUIPE2);
  lobby.settings.playerCount = e2.length > 0 ? 10 : 5;

  lobby.phase = GamePhase.ROLE_WHEEL;
  return game;
}

function respinLolRoles(lobby) {
  assignLolRoles(lobby);
}

function confirmRoles(lobby) {
  // Assign secret Among Legends roles
  assignSecretRoles(lobby);
  lobby.phase = GamePhase.ROLES_ASSIGNED;
}

const DROIDE_INTERVAL_MS = 8 * 60 * 1000; // new command every 8 minutes

function _sendDroideCommands(lobby, io) {
  const assignments = nextDroideCommands(lobby);
  for (const { playerId, command } of assignments) {
    io.to(playerId).emit('droide:command_changed', { command });
  }
}

function startLol(lobby, io) {
  lobby.phase = GamePhase.LOL_STARTED;

  // Initialize Droide command deck
  lobby.currentGame.commandDeck = shuffle([...DROIDE_COMMANDS]);

  // Start Double Face timers
  DoubleFaceManager.startForGame(lobby, io);

  // Send first Droide commands immediately, then every 8 minutes
  _sendDroideCommands(lobby, io);
  lobby.currentGame.droideCommandTimer = setInterval(() => {
    _sendDroideCommands(lobby, io);
  }, DROIDE_INTERVAL_MS);
}

function endLol(lobby) {
  DoubleFaceManager.stopForGame(lobby.currentGame);

  // Clear Droide auto-command timer
  if (lobby.currentGame?.droideCommandTimer) {
    clearInterval(lobby.currentGame.droideCommandTimer);
    lobby.currentGame.droideCommandTimer = null;
  }

  lobby.phase = GamePhase.LOL_ENDED;
}

function submitResults(lobby, result) {
  // result = { winner: 'equipe1'|'equipe2', equipe1: { mostKills, mostDeaths, mostDamage, mostAssists }, equipe2: {...} }
  lobby.currentGame.result = result;
  lobby.phase = GamePhase.RESULTS_INPUT;
}

function startVotingSelf(lobby) {
  lobby.phase = GamePhase.VOTING_SELF;
}

function startVotingEnemy(lobby) {
  lobby.phase = GamePhase.VOTING_ENEMY;
}

function finalizScores(lobby) {
  const scores = calculateScores(lobby.currentGame, lobby);
  lobby.currentGame.scores = scores;
  lobby.completedGames.push(lobby.currentGame);
  lobby.currentGame = null;
  lobby.phase = GamePhase.FINAL_SCORES;
  return scores;
}

// Returns an array of { playerId, command } for each Droide player, with unique commands per player
function nextDroideCommands(lobby) {
  const game = lobby.currentGame;
  if (!game) return [];

  const droidePlayers = lobby.getActivePlayers().filter((p) => p.secretRole === Roles.DROIDE);
  if (droidePlayers.length === 0) return [];

  // Ensure the deck has enough unique cards for all Droide players
  if (game.commandDeck.length < droidePlayers.length) {
    game.commandDeck = [...game.commandDeck, ...shuffle([...DROIDE_COMMANDS])];
  }

  const assignments = [];
  for (const droide of droidePlayers) {
    const command = game.commandDeck.shift();
    game.commandHistory.push(command);
    game.droideCommands.set(droide.id, command);
    assignments.push({ playerId: droide.id, command });
  }
  return assignments;
}

function playAgain(lobby, keepTeams) {
  if (!keepTeams) {
    // Reset all players to spectateur
    for (const player of lobby.players.values()) {
      player.team = Teams.SPECTATEUR;
    }
  }

  // Reset per-round state for all players
  for (const player of lobby.players.values()) {
    player.resetForNewRound();
  }

  lobby.phase = GamePhase.LOBBY_WAITING;
  lobby.currentGame = null;
}

module.exports = {
  startGame,
  respinLolRoles,
  confirmRoles,
  startLol,
  endLol,
  submitResults,
  startVotingSelf,
  startVotingEnemy,
  finalizScores,
  nextDroideCommands,
  playAgain,
};
