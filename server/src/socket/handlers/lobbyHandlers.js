const LobbyManager = require('../../managers/LobbyManager');
const BotManager = require('../../managers/BotManager');
const GameManager = require('../../managers/GameManager');
const DoubleFaceManager = require('../../managers/DoubleFaceManager');

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
      const { lobby, player, reconnected, oldId } = LobbyManager.joinLobby(socket, username.trim(), lobbyCode);

      // If the player reconnected with a new socket.id during an active game, restart their timers
      if (reconnected && oldId && lobby.currentGame) {
        GameManager.restartDroideTimer(socket.id, oldId, lobby, io);
        DoubleFaceManager.restartPlayerTimer(socket.id, oldId, lobby, io);
      }

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

      const boolKeys = ['enableEnemyVoting', 'symmetricRoles', 'uniqueRolesPerTeam', 'testMode', 'showTimers', 'championDraft'];
      const numKeys = ['droideMinSeconds', 'droideMaxSeconds', 'doubleFaceMinSeconds', 'doubleFaceMaxSeconds', 'championDraftChance'];

      for (const key of boolKeys) {
        if (typeof settings[key] === 'boolean') lobby.settings[key] = settings[key];
      }
      for (const key of numKeys) {
        if (typeof settings[key] === 'number' && settings[key] >= 0) lobby.settings[key] = settings[key];
      }

      io.to(lobby.code).emit('lobby:updated', { lobby: lobby.toDTO() });
    } catch (err) {
      socket.emit('error:general', { message: err.message });
    }
  });

  socket.on('lobby:set_forced_role', ({ targetPlayerId, role }) => {
    try {
      const lobby = LobbyManager.getLobbyBySocket(socket.id);
      if (!lobby) return socket.emit('error:general', { message: 'Lobby introuvable.' });

      const requester = lobby.players.get(socket.id);
      if (!requester?.isHost) return socket.emit('error:general', { message: 'Seul l\'host peut forcer les rôles.' });
      if (!lobby.settings.testMode) return socket.emit('error:general', { message: 'Le mode test est désactivé.' });

      if (role === null || role === undefined || role === '') {
        delete lobby.forcedRoles[targetPlayerId];
      } else {
        lobby.forcedRoles[targetPlayerId] = role;
      }

      io.to(lobby.code).emit('lobby:updated', { lobby: lobby.toDTO() });
    } catch (err) {
      socket.emit('error:general', { message: err.message });
    }
  });

  // Player voluntarily leaves the lobby
  socket.on('lobby:leave', () => {
    try {
      const lobby = LobbyManager.getLobbyBySocket(socket.id);
      if (!lobby) return;

      const lobbyCode = lobby.code;
      const remainingLobby = LobbyManager.removePlayer(lobby, socket.id);

      socket.leave(lobbyCode);
      socket.emit('lobby:left', {});

      if (remainingLobby) {
        io.to(lobbyCode).emit('lobby:updated', { lobby: remainingLobby.toDTO() });
      }
    } catch (err) {
      socket.emit('error:general', { message: err.message });
    }
  });

  // Host disbands (destroys) the lobby for everyone
  socket.on('lobby:disband', () => {
    try {
      const lobby = LobbyManager.getLobbyBySocket(socket.id);
      if (!lobby) return socket.emit('error:general', { message: 'Lobby introuvable.' });

      const requester = lobby.players.get(socket.id);
      if (!requester?.isHost) return socket.emit('error:general', { message: 'Seul l\'host peut dissoudre le lobby.' });

      // Notify all players before cleanup
      io.to(lobby.code).emit('lobby:disbanded', {});
      LobbyManager.cleanupLobby(lobby);
    } catch (err) {
      socket.emit('error:general', { message: err.message });
    }
  });
}

module.exports = { registerLobbyHandlers };
