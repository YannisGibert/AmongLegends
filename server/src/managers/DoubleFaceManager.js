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

// Called when a Double Face player reconnects with a new socket.id
function restartPlayerTimer(newId, oldId, lobby, io) {
  if (!lobby.currentGame) return;

  // Rekey state
  const currentMode = lobby.currentGame.doubleFaceStates.get(oldId);
  if (currentMode !== undefined) {
    lobby.currentGame.doubleFaceStates.delete(oldId);
  }

  const player = lobby.players.get(newId);
  if (!player || player.secretRole !== Roles.DOUBLE_FACE) return;

  // Cancel old timer
  const oldTimer = lobby.currentGame.doubleFaceTimers.get(oldId);
  if (oldTimer) {
    clearTimeout(oldTimer);
    lobby.currentGame.doubleFaceTimers.delete(oldId);
  }

  // Restart with preserved mode (or fresh random)
  _scheduleStateChange(newId, currentMode || (Math.random() < 0.5 ? 'allie' : 'imposteur'), lobby, io);
}

function cleanup(game) {
  stopForGame(game);
  if (game) {
    game.doubleFaceStates.clear();
  }
}

// Host override: force a specific Double Face player's mode right now,
// rescheduling their next automatic flip from this point.
function hostSetMode(playerId, mode, lobby, io) {
  if (!lobby.currentGame) return;
  _scheduleStateChange(playerId, mode, lobby, io);
}

module.exports = { startForGame, stopForGame, cleanup, restartPlayerTimer, hostSetMode };
