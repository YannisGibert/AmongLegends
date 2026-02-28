const { Roles } = require('../config/constants');
const { randomBetween } = require('../utils/arrayUtils');

function _randomDelayMs(lobby) {
  const minMs = (lobby.settings.doubleFaceMinSeconds ?? 60) * 1000;
  const maxMs = (lobby.settings.doubleFaceMaxSeconds ?? 600) * 1000;
  return randomBetween(minMs, maxMs);
}

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

  // Calculate next flip delay
  const delayMs = _randomDelayMs(lobby);

  // Emit current mode; include countdown if showTimers is enabled
  const payload = { mode };
  if (lobby.settings.showTimers) payload.nextFlipMs = delayMs;
  io.to(playerId).emit('doubleFace:state_changed', payload);

  // Clear previous timer if any
  const oldTimer = lobby.currentGame.doubleFaceTimers.get(playerId);
  if (oldTimer) clearTimeout(oldTimer);

  const timer = setTimeout(() => {
    if (!lobby.currentGame) return;
    const nextMode = mode === 'allie' ? 'imposteur' : 'allie';
    _scheduleStateChange(playerId, nextMode, lobby, io);
  }, delayMs);

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
