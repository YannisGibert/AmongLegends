const LobbyManager = require('../../managers/LobbyManager');
const GameManager = require('../../managers/GameManager');
const { GamePhase } = require('../../config/constants');

function registerDroideHandlers(io, socket) {
  socket.on('droide:next_command', () => {
    try {
      const lobby = LobbyManager.getLobbyBySocket(socket.id);
      if (!lobby) return socket.emit('error:general', { message: 'Lobby introuvable.' });

      const requester = lobby.players.get(socket.id);
      if (!requester?.isHost) return socket.emit('error:general', { message: 'Seul l\'host peut déclencher une commande.' });
      if (lobby.phase !== GamePhase.LOL_STARTED) return socket.emit('error:general', { message: 'La partie n\'a pas encore commencé.' });

      const assignments = GameManager.nextDroideCommands(lobby);
      if (assignments.length === 0) return socket.emit('error:general', { message: 'Aucun joueur Droide dans la partie.' });

      // Send each command privately to its Droide player only
      for (const { playerId, command } of assignments) {
        io.to(playerId).emit('droide:command_changed', { command });
      }
    } catch (err) {
      socket.emit('error:general', { message: err.message });
    }
  });
}

module.exports = { registerDroideHandlers };
