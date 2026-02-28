const LobbyManager = require('../managers/LobbyManager');
const { registerLobbyHandlers } = require('./handlers/lobbyHandlers');
const { registerGameHandlers } = require('./handlers/gameHandlers');
const { registerDroideHandlers } = require('./handlers/droideHandlers');
const { registerVotingHandlers } = require('./handlers/votingHandlers');

function attachSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    registerLobbyHandlers(io, socket);
    registerGameHandlers(io, socket);
    registerDroideHandlers(io, socket);
    registerVotingHandlers(io, socket);

    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
      const lobby = LobbyManager.handleDisconnect(socket.id, io);
      if (lobby) {
        io.to(lobby.code).emit('lobby:updated', { lobby: lobby.toDTO() });
      }
    });

    socket.on('error', (err) => {
      console.error(`[Socket] Error on ${socket.id}:`, err);
    });
  });
}

module.exports = { attachSocketHandlers };
