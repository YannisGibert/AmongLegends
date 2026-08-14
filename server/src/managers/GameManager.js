const { GamePhase, Teams, Roles } = require('../config/constants');
const Game = require('../models/Game');
const { assignLolRoles, assignSecretRoles } = require('./RoleManager');
const DoubleFaceManager = require('./DoubleFaceManager');
const { calculateScores } = require('./ScoreManager');
const { randomBetween, pickRandom } = require('../utils/arrayUtils');
const { DROIDE_QUESTS, oppositeTeam } = require('../data/droideQuests');

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

// Picks an eligible quest for playerId given their lolRole, elapsed game time and
// history, resolves its text (delayMs is used to fill in "x minutes" mentions).
function _pickQuestForPlayer(playerId, lobby, delayMs) {
  const game = lobby.currentGame;
  const player = lobby.players.get(playerId);

  const elapsedMin = game.lolStartedAt ? (Date.now() - game.lolStartedAt) / 60000 : 0;
  const isFirst = !game.droideFirstQuestGiven.has(playerId);
  const hasEnemyTeam = lobby.getTeamPlayers(oppositeTeam(player.team)).length > 0;
  const recent = game.droideRecentQuestIds.get(playerId) || [];

  const eligible = (q) =>
    (q.scope === 'global' || q.scope === player.lolRole) &&
    (!q.firstQuestOnly || isFirst) &&
    !(q.excludeOwnPositions && q.excludeOwnPositions.includes(player.lolRole)) &&
    (!q.minGameMinutes || elapsedMin >= q.minGameMinutes) &&
    (q.maxGameMinutes == null || elapsedMin <= q.maxGameMinutes) &&
    (!q.requiresEnemyTeam || hasEnemyTeam);

  let pool = DROIDE_QUESTS.filter(eligible);
  const nonRecent = pool.filter((q) => !recent.includes(q.id));
  if (nonRecent.length > 0) pool = nonRecent;

  // Should never happen (unconstrained global quests always qualify), but guard anyway
  if (pool.length === 0) {
    pool = DROIDE_QUESTS.filter(
      (q) => q.scope === 'global' && !q.firstQuestOnly && !q.minGameMinutes && q.maxGameMinutes == null && !q.requiresEnemyTeam
    );
  }

  const quest = pickRandom(pool);
  const minutesUntilNext = Math.round(delayMs / 60000);
  const text = quest.build(player, lobby, minutesUntilNext);

  game.droideFirstQuestGiven.add(playerId);
  game.droideRecentQuestIds.set(playerId, [quest.id, ...recent].slice(0, 2));

  const command = { id: quest.id, text };
  game.commandHistory.push({ playerId, ...command, at: Date.now() });
  game.droideCommands.set(playerId, command);
  return command;
}

function _emitDroideCommand(playerId, lobby, io, command, delayMs) {
  const payload = { command };
  if (lobby.settings.showTimers) payload.nextCommandMs = delayMs;
  io.to(playerId).emit('droide:command_changed', payload);

  _scheduleNextDroide(playerId, delayMs, lobby, io);
}

function _scheduleDroideForPlayer(playerId, lobby, io) {
  if (!lobby.currentGame) return;

  const delayMs = _randomDroideDelayMs(lobby);
  const command = _pickQuestForPlayer(playerId, lobby, delayMs);
  _emitDroideCommand(playerId, lobby, io, command, delayMs);
}

function _scheduleNextDroide(playerId, delayMs, lobby, io) {
  const timer = setTimeout(() => {
    if (!lobby.currentGame) return;
    const player = lobby.players.get(playerId);
    if (!player || player.secretRole !== Roles.DROIDE) return;

    const nextDelayMs = _randomDroideDelayMs(lobby);
    const command = _pickQuestForPlayer(playerId, lobby, nextDelayMs);
    _emitDroideCommand(playerId, lobby, io, command, nextDelayMs);
  }, delayMs);

  const oldTimer = lobby.currentGame.droideTimers.get(playerId);
  if (oldTimer) clearTimeout(oldTimer);
  lobby.currentGame.droideTimers.set(playerId, timer);
}

// Host override: replace a Droide's current quest with custom text right now,
// scheduling the next automatic quest from this point exactly like a normal one.
function hostSetDroideQuest(playerId, text, lobby, io) {
  if (!lobby.currentGame) return;
  const game = lobby.currentGame;

  const command = { id: 'host-custom', text };
  game.droideFirstQuestGiven.add(playerId);
  game.commandHistory.push({ playerId, ...command, at: Date.now(), hostOverride: true });
  game.droideCommands.set(playerId, command);

  const delayMs = _randomDroideDelayMs(lobby);
  _emitDroideCommand(playerId, lobby, io, command, delayMs);
}

function startLol(lobby, io) {
  lobby.phase = GamePhase.LOL_STARTED;
  lobby.currentGame.lolStartedAt = Date.now();

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

function submitResults(lobby, result, deaths = {}) {
  lobby.currentGame.result = result;
  lobby.currentGame.playerDeaths = deaths;
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

  const assignments = [];
  for (const droide of droidePlayers) {
    const delayMs = _randomDroideDelayMs(lobby);
    const command = _pickQuestForPlayer(droide.id, lobby, delayMs);
    assignments.push({ playerId: droide.id, command });
  }
  return assignments;
}

// Called when a Droide player reconnects with a new socket.id
function restartDroideTimer(newId, oldId, lobby, io) {
  if (!lobby.currentGame) return;

  // Rekey droide command
  const cmd = lobby.currentGame.droideCommands.get(oldId);
  if (cmd !== undefined) {
    lobby.currentGame.droideCommands.delete(oldId);
    lobby.currentGame.droideCommands.set(newId, cmd);
  }

  const player = lobby.players.get(newId);
  if (!player || player.secretRole !== Roles.DROIDE) return;

  // Cancel old timer (still pointing at old id in closure)
  const oldTimer = lobby.currentGame.droideTimers.get(oldId);
  if (oldTimer) {
    clearTimeout(oldTimer);
    lobby.currentGame.droideTimers.delete(oldId);
  }

  // Reschedule with new id
  _scheduleDroideForPlayer(newId, lobby, io);
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
  restartDroideTimer,
  hostSetDroideQuest,
};
