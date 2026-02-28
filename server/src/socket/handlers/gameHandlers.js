const LobbyManager = require('../../managers/LobbyManager');
const GameManager = require('../../managers/GameManager');
const BotManager = require('../../managers/BotManager');
const VotingManager = require('../../managers/VotingManager');
const { GamePhase } = require('../../config/constants');

// Lazy-require to avoid circular dependency (votingHandlers exports finalize)
function getVotingHelpers() {
  return require('./votingHandlers');
}

function registerGameHandlers(io, socket) {
  // Host: start the game (triggers role wheel)
  socket.on('game:start', () => {
    try {
      const lobby = LobbyManager.getLobbyBySocket(socket.id);
      if (!lobby) return socket.emit('error:general', { message: 'Lobby introuvable.' });

      const requester = lobby.players.get(socket.id);
      if (!requester?.isHost) return socket.emit('error:general', { message: 'Seul l\'host peut démarrer.' });
      if (lobby.phase !== GamePhase.LOBBY_WAITING) return socket.emit('error:general', { message: 'Phase incorrecte.' });

      GameManager.startGame(lobby);
      io.to(lobby.code).emit('lobby:updated', { lobby: lobby.toDTO() });
      io.to(lobby.code).emit('game:phase_changed', { phase: lobby.phase });
    } catch (err) {
      socket.emit('error:general', { message: err.message });
    }
  });

  // Host: re-spin the LoL role wheel
  socket.on('game:respin_lol_roles', () => {
    try {
      const lobby = LobbyManager.getLobbyBySocket(socket.id);
      if (!lobby) return socket.emit('error:general', { message: 'Lobby introuvable.' });

      const requester = lobby.players.get(socket.id);
      if (!requester?.isHost) return socket.emit('error:general', { message: 'Seul l\'host peut relancer la roue.' });
      if (lobby.phase !== GamePhase.ROLE_WHEEL) return socket.emit('error:general', { message: 'Phase incorrecte.' });

      GameManager.respinLolRoles(lobby);
      io.to(lobby.code).emit('lobby:updated', { lobby: lobby.toDTO() });
    } catch (err) {
      socket.emit('error:general', { message: err.message });
    }
  });

  // Host: confirm the wheel result → assign secret roles
  socket.on('game:confirm_roles', () => {
    try {
      const lobby = LobbyManager.getLobbyBySocket(socket.id);
      if (!lobby) return socket.emit('error:general', { message: 'Lobby introuvable.' });

      const requester = lobby.players.get(socket.id);
      if (!requester?.isHost) return socket.emit('error:general', { message: 'Seul l\'host peut confirmer.' });
      if (lobby.phase !== GamePhase.ROLE_WHEEL) return socket.emit('error:general', { message: 'Phase incorrecte.' });

      GameManager.confirmRoles(lobby);

      // Broadcast updated lobby (LoL roles visible to all)
      io.to(lobby.code).emit('lobby:updated', { lobby: lobby.toDTO() });
      io.to(lobby.code).emit('game:phase_changed', { phase: lobby.phase });

      // Send private secret roles to each player
      for (const player of lobby.getActivePlayers()) {
        io.to(player.id).emit('game:roles_assigned', player.toPrivateDTO());
      }
    } catch (err) {
      socket.emit('error:general', { message: err.message });
    }
  });

  // Host: LoL game has started
  socket.on('game:lol_started', () => {
    try {
      const lobby = LobbyManager.getLobbyBySocket(socket.id);
      if (!lobby) return socket.emit('error:general', { message: 'Lobby introuvable.' });

      const requester = lobby.players.get(socket.id);
      if (!requester?.isHost) return socket.emit('error:general', { message: 'Seul l\'host peut faire ça.' });
      if (lobby.phase !== GamePhase.ROLES_ASSIGNED) return socket.emit('error:general', { message: 'Phase incorrecte.' });

      GameManager.startLol(lobby, io);
      io.to(lobby.code).emit('lobby:updated', { lobby: lobby.toDTO() });
      io.to(lobby.code).emit('game:phase_changed', { phase: lobby.phase });
    } catch (err) {
      socket.emit('error:general', { message: err.message });
    }
  });

  // Host: LoL game has ended
  socket.on('game:lol_ended', () => {
    try {
      const lobby = LobbyManager.getLobbyBySocket(socket.id);
      if (!lobby) return socket.emit('error:general', { message: 'Lobby introuvable.' });

      const requester = lobby.players.get(socket.id);
      if (!requester?.isHost) return socket.emit('error:general', { message: 'Seul l\'host peut faire ça.' });
      if (lobby.phase !== GamePhase.LOL_STARTED) return socket.emit('error:general', { message: 'Phase incorrecte.' });

      GameManager.endLol(lobby);
      io.to(lobby.code).emit('lobby:updated', { lobby: lobby.toDTO() });
      io.to(lobby.code).emit('game:phase_changed', { phase: lobby.phase });
    } catch (err) {
      socket.emit('error:general', { message: err.message });
    }
  });

  // Host: submit match results
  socket.on('results:submit', ({ winner, equipe1, equipe2 }) => {
    try {
      const lobby = LobbyManager.getLobbyBySocket(socket.id);
      if (!lobby) return socket.emit('error:general', { message: 'Lobby introuvable.' });

      const requester = lobby.players.get(socket.id);
      if (!requester?.isHost) return socket.emit('error:general', { message: 'Seul l\'host peut soumettre les résultats.' });
      if (lobby.phase !== GamePhase.LOL_ENDED) return socket.emit('error:general', { message: 'Phase incorrecte.' });

      if (!['equipe1', 'equipe2'].includes(winner)) {
        return socket.emit('error:general', { message: 'Gagnant invalide.' });
      }

      GameManager.submitResults(lobby, { winner, equipe1, equipe2 });
      GameManager.startVotingSelf(lobby);

      // Bots vote instantly so they don't block the phase
      BotManager.autoVoteBots(lobby, 'self');

      io.to(lobby.code).emit('lobby:updated', { lobby: lobby.toDTO() });
      io.to(lobby.code).emit('game:phase_changed', { phase: lobby.phase });

      // Broadcast initial vote progress (bots already counted)
      const { finalize, _broadcastVoteProgress } = getVotingHelpers();
      _broadcastVoteProgress(io, lobby, 'self');

      // If only bots in the game, finalize immediately (edge case)
      if (VotingManager.checkAllVotedSelf(lobby)) {
        finalize(io, lobby);
      }
    } catch (err) {
      socket.emit('error:general', { message: err.message });
    }
  });

  // Host: play again
  socket.on('game:play_again', ({ keepTeams }) => {
    try {
      const lobby = LobbyManager.getLobbyBySocket(socket.id);
      if (!lobby) return socket.emit('error:general', { message: 'Lobby introuvable.' });

      const requester = lobby.players.get(socket.id);
      if (!requester?.isHost) return socket.emit('error:general', { message: 'Seul l\'host peut relancer.' });
      if (lobby.phase !== GamePhase.FINAL_SCORES) return socket.emit('error:general', { message: 'Phase incorrecte.' });

      GameManager.playAgain(lobby, keepTeams);
      io.to(lobby.code).emit('lobby:updated', { lobby: lobby.toDTO() });
      io.to(lobby.code).emit('game:phase_changed', { phase: lobby.phase });
    } catch (err) {
      socket.emit('error:general', { message: err.message });
    }
  });
}

module.exports = { registerGameHandlers };
