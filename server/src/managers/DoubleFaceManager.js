const { Roles } = require('../config/constants');
const { randomBetween } = require('../utils/arrayUtils');

const MIN_INTERVAL_MS = 1 * 60 * 1000;  // 1 minute
const MAX_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

function startForGame(lobby, io) {
  if (!lobby.currentGame) return;

  const doubleFacePlayers = lobby.getActivePlayers().filter(
    (p) => p.secretRole === Roles.DOUBLE_FACE
  );

  for (const player of doubleFacePlayers) {
    const initialMode = Math.random() < 0.5 ? 'allie' : 'imposteur';
    _scheduleStateChange(player.id, initialMode, lobby, io);
  }
}

function _scheduleStateChange(playerId, mode, lobby, io) {
  if (!lobby.currentGame) return;

  // Store current mode
  lobby.currentGame.doubleFaceStates.set(playerId, mode);

  // Find player's socket id (playerId IS socket.id in this app)
  io.to(playerId).emit('doubleFace:state_changed', { mode });

  // Schedule next flip
  const delayMs = randomBetween(MIN_INTERVAL_MS, MAX_INTERVAL_MS);
  const timer = setTimeout(() => {
    if (!lobby.currentGame) return;
    const nextMode = mode === 'allie' ? 'imposteur' : 'allie';
    _scheduleStateChange(playerId, nextMode, lobby, io);
  }, delayMs);

  // Clear previous timer if any
  const oldTimer = lobby.currentGame.doubleFaceTimers.get(playerId);
  if (oldTimer) clearTimeout(oldTimer);

  lobby.currentGame.doubleFaceTimers.set(playerId, timer);
}

function stopForGame(game) {
  if (!game) return;
  for (const timer of game.doubleFaceTimers.values()) {
    clearTimeout(timer);
  }
  game.doubleFaceTimers.clear();
  // doubleFaceStates preserved for scoring
}

function cleanup(game) {
  stopForGame(game);
  if (game) {
    game.doubleFaceStates.clear();
  }
}

module.exports = { startForGame, stopForGame, cleanup };
