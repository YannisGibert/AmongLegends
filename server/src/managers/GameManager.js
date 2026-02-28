const { GamePhase, Teams, Roles } = require('../config/constants');
const Game = require('../models/Game');
const { assignLolRoles, assignSecretRoles } = require('./RoleManager');
const DoubleFaceManager = require('./DoubleFaceManager');
const { calculateScores } = require('./ScoreManager');
const { shuffle, randomBetween } = require('../utils/arrayUtils');
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

// ─── Droide per-player timers ────────────────────────────────────────────────

function _randomDroideDelayMs(lobby) {
  const minMs = (lobby.settings.droideMinSeconds ?? 120) * 1000;
  const maxMs = (lobby.settings.droideMaxSeconds ?? 600) * 1000;
  return randomBetween(minMs, maxMs);
}

function _nextCommandForPlayer(playerId, lobby) {
  const game = lobby.currentGame;
  if (game.commandDeck.length === 0) {
    game.commandDeck = shuffle([...DROIDE_COMMANDS]);
  }
  const command = game.commandDeck.shift();
  game.commandHistory.push(command);
  game.droideCommands.set(playerId, command);
  return command;
}

function _scheduleDroideForPlayer(playerId, lobby, io) {
  if (!lobby.currentGame) return;

  const delayMs = _randomDroideDelayMs(lobby);
  const command = _nextCommandForPlayer(playerId, lobby);

  const payload = { command };
  if (lobby.settings.showTimers) payload.nextCommandMs = delayMs;
  io.to(playerId).emit('droide:command_changed', payload);

  _scheduleNextDroide(playerId, delayMs, lobby, io);
}

function _scheduleNextDroide(playerId, delayMs, lobby, io) {
  const timer = setTimeout(() => {
    if (!lobby.currentGame) return;
    const player = lobby.players.get(playerId);
    if (!player || player.secretRole !== Roles.DROIDE) return;

    const nextDelayMs = _randomDroideDelayMs(lobby);
    const command = _nextCommandForPlayer(playerId, lobby);

    const payload = { command };
    if (lobby.settings.showTimers) payload.nextCommandMs = nextDelayMs;
    io.to(playerId).emit('droide:command_changed', payload);

    _scheduleNextDroide(playerId, nextDelayMs, lobby, io);
  }, delayMs);

  const oldTimer = lobby.currentGame.droideTimers.get(playerId);
  if (oldTimer) clearTimeout(oldTimer);
  lobby.currentGame.droideTimers.set(playerId, timer);
}

function startLol(lobby, io) {
  lobby.phase = GamePhase.LOL_STARTED;

  // Initialize command deck
  lobby.currentGame.commandDeck = shuffle([...DROIDE_COMMANDS]);

  // Start Double Face timers
  DoubleFaceManager.startForGame(lobby, io);

  // Start per-player Droide timers (sends first command immediately, then recursive)
  const droidePlayers = lobby.getActivePlayers().filter((p) => p.secretRole === Roles.DROIDE);
  for (const player of droidePlayers) {
    _scheduleDroideForPlayer(player.id, lobby, io);
  }
}

function endLol(lobby) {
  DoubleFaceManager.stopForGame(lobby.currentGame);

  // Clear per-player Droide timers
  if (lobby.currentGame?.droideTimers) {
    for (const timer of lobby.currentGame.droideTimers.values()) {
      clearTimeout(timer);
    }
    lobby.currentGame.droideTimers.clear();
  }

  lobby.phase = GamePhase.LOL_ENDED;
}

function submitResults(lobby, result) {
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

// Returns next commands for all Droide players (used by external triggers if needed)
function nextDroideCommands(lobby) {
  const game = lobby.currentGame;
  if (!game) return [];

  const droidePlayers = lobby.getActivePlayers().filter((p) => p.secretRole === Roles.DROIDE);
  if (droidePlayers.length === 0) return [];

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
    for (const player of lobby.players.values()) {
      player.team = Teams.SPECTATEUR;
    }
  }

  for (const player of lobby.players.values()) {
    player.resetForNewRound();
  }

  // Clear forced roles for next round
  lobby.forcedRoles = {};

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
