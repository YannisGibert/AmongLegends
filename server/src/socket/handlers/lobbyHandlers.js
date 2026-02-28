const LobbyManager = require('../../managers/LobbyManager');
const BotManager = require('../../managers/BotManager');

function registerLobbyHandlers(io, socket) {
  socket.on('lobby:create', ({ username }) => {
    try {
      if (!username || username.trim().length < 2) {
        return socket.emit('error:general', { message: 'Pseudo trop court (min 2 caractères).' });
      }
      const { lobby, player } = LobbyManager.createLobby(socket, username.trim());
      socket.emit('lobby:created', { lobbyCode: lobby.code, lobby: lobby.toDTO(), player: player.toDTO() });
      io.to(lobby.code).emit('lobby:updated', { lobby: lobby.toDTO() });
    } catch (err) {
      socket.emit('error:general', { message: err.message });
    }
  });

  socket.on('lobby:join', ({ username, lobbyCode }) => {
    try {
      if (!username || username.trim().length < 2) {
        return socket.emit('error:general', { message: 'Pseudo trop court (min 2 caractères).' });
      }
      if (!lobbyCode) {
        return socket.emit('error:general', { message: 'Code lobby manquant.' });
      }
      const { lobby, player, reconnected } = LobbyManager.joinLobby(socket, username.trim(), lobbyCode);
      socket.emit('lobby:joined', {
        lobbyCode: lobby.code,
        lobby: lobby.toDTO(),
        player: player.toDTO(),
        reconnected,
      });
      io.to(lobby.code).emit('lobby:updated', { lobby: lobby.toDTO() });
    } catch (err) {
      socket.emit('error:general', { message: err.message });
    }
  });

  socket.on('lobby:assign_team', ({ targetPlayerId, team }) => {
    try {
      const lobby = LobbyManager.getLobbyBySocket(socket.id);
      if (!lobby) return socket.emit('error:general', { message: 'Lobby introuvable.' });

      const requester = lobby.players.get(socket.id);
      const target = lobby.players.get(targetPlayerId);

      if (!target) return socket.emit('error:general', { message: 'Joueur introuvable.' });

      // Only host can move others; any player can move themselves
      if (targetPlayerId !== socket.id && !requester?.isHost) {
        return socket.emit('error:general', { message: 'Seul l\'host peut déplacer les autres joueurs.' });
      }

      const validTeams = ['equipe1', 'equipe2', 'spectateur'];
      if (!validTeams.includes(team)) {
        return socket.emit('error:general', { message: 'Équipe invalide.' });
      }

      target.team = team;
      io.to(lobby.code).emit('lobby:updated', { lobby: lobby.toDTO() });
    } catch (err) {
      socket.emit('error:general', { message: err.message });
    }
  });

  socket.on('lobby:add_bot', () => {
    try {
      const lobby = LobbyManager.getLobbyBySocket(socket.id);
      if (!lobby) return socket.emit('error:general', { message: 'Lobby introuvable.' });

      const requester = lobby.players.get(socket.id);
      if (!requester?.isHost) return socket.emit('error:general', { message: 'Seul l\'host peut ajouter des bots.' });

      BotManager.addBot(lobby);
      io.to(lobby.code).emit('lobby:updated', { lobby: lobby.toDTO() });
    } catch (err) {
      socket.emit('error:general', { message: err.message });
    }
  });

  socket.on('lobby:remove_bot', ({ botId }) => {
    try {
      const lobby = LobbyManager.getLobbyBySocket(socket.id);
      if (!lobby) return socket.emit('error:general', { message: 'Lobby introuvable.' });

      const requester = lobby.players.get(socket.id);
      if (!requester?.isHost) return socket.emit('error:general', { message: 'Seul l\'host peut retirer des bots.' });

      BotManager.removeBot(lobby, botId);
      io.to(lobby.code).emit('lobby:updated', { lobby: lobby.toDTO() });
    } catch (err) {
      socket.emit('error:general', { message: err.message });
    }
  });

  socket.on('lobby:update_settings', ({ settings }) => {
    try {
      const lobby = LobbyManager.getLobbyBySocket(socket.id);
      if (!lobby) return socket.emit('error:general', { message: 'Lobby introuvable.' });

      const requester = lobby.players.get(socket.id);
      if (!requester?.isHost) {
        return socket.emit('error:general', { message: 'Seul l\'host peut modifier les paramètres.' });
      }

      if (typeof settings.enableEnemyVoting === 'boolean') {
        lobby.settings.enableEnemyVoting = settings.enableEnemyVoting;
      }
      if (typeof settings.symmetricRoles === 'boolean') {
        lobby.settings.symmetricRoles = settings.symmetricRoles;
      }

      io.to(lobby.code).emit('lobby:updated', { lobby: lobby.toDTO() });
    } catch (err) {
      socket.emit('error:general', { message: err.message });
    }
  });
}

module.exports = { registerLobbyHandlers };
