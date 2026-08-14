const LobbyManager = require('../../managers/LobbyManager');
const GameManager = require('../../managers/GameManager');
const DoubleFaceManager = require('../../managers/DoubleFaceManager');
const BotManager = require('../../managers/BotManager');
const VotingManager = require('../../managers/VotingManager');
const ChampionManager = require('../../managers/ChampionManager');
const { GamePhase, Roles, Teams } = require('../../config/constants');

// Only the host, spectating (not playing), may use the live game-master controls
function _requireSpectatingHost(lobby, socket) {
  const requester = lobby.players.get(socket.id);
  if (!requester?.isHost || requester.team !== Teams.SPECTATEUR) {
    socket.emit('error:general', { message: 'Réservé à l\'host spectateur.' });
    return null;
  }
  if (lobby.phase !== GamePhase.LOL_STARTED || !lobby.currentGame) {
    socket.emit('error:general', { message: 'Partie non active.' });
    return null;
  }
  return requester;
}

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
      io.to(lobby.code).emit('game:phase_changed', { phase: lobby.phase, lolStartedAt: lobby.currentGame?.lolStartedAt ?? null });
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

  // Host: confirm the wheel result → assign secret roles (+ optional champion draft)
  socket.on('game:confirm_roles', async () => {
    try {
      const lobby = LobbyManager.getLobbyBySocket(socket.id);
      if (!lobby) return socket.emit('error:general', { message: 'Lobby introuvable.' });

      const requester = lobby.players.get(socket.id);
      if (!requester?.isHost) return socket.emit('error:general', { message: 'Seul l\'host peut confirmer.' });
      if (lobby.phase !== GamePhase.ROLE_WHEEL) return socket.emit('error:general', { message: 'Phase incorrecte.' });

      // Assign secret roles (sets lobby.phase = ROLES_ASSIGNED)
      GameManager.confirmRoles(lobby);

      // Check champion draft — may override phase to CHAMPION_REVEAL
      await ChampionManager.maybeAssignChampions(lobby);

      // Broadcast updated lobby (LoL roles + champion names if assigned)
      io.to(lobby.code).emit('lobby:updated', { lobby: lobby.toDTO() });
      io.to(lobby.code).emit('game:phase_changed', { phase: lobby.phase, lolStartedAt: lobby.currentGame?.lolStartedAt ?? null });

      // Always send private secret roles to each player
      for (const player of lobby.getActivePlayers()) {
        io.to(player.id).emit('game:roles_assigned', player.toPrivateDTO());
      }
    } catch (err) {
      socket.emit('error:general', { message: err.message });
    }
  });

  // Host: confirm champion reveal → proceed to roles assigned
  socket.on('game:confirm_champions', () => {
    try {
      const lobby = LobbyManager.getLobbyBySocket(socket.id);
      if (!lobby) return socket.emit('error:general', { message: 'Lobby introuvable.' });

      const requester = lobby.players.get(socket.id);
      if (!requester?.isHost) return socket.emit('error:general', { message: 'Seul l\'host peut confirmer.' });
      if (lobby.phase !== GamePhase.CHAMPION_REVEAL) return socket.emit('error:general', { message: 'Phase incorrecte.' });

      lobby.phase = GamePhase.ROLES_ASSIGNED;
      io.to(lobby.code).emit('lobby:updated', { lobby: lobby.toDTO() });
      io.to(lobby.code).emit('game:phase_changed', { phase: lobby.phase, lolStartedAt: lobby.currentGame?.lolStartedAt ?? null });
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
      io.to(lobby.code).emit('game:phase_changed', { phase: lobby.phase, lolStartedAt: lobby.currentGame?.lolStartedAt ?? null });
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
      io.to(lobby.code).emit('game:phase_changed', { phase: lobby.phase, lolStartedAt: lobby.currentGame?.lolStartedAt ?? null });
    } catch (err) {
      socket.emit('error:general', { message: err.message });
    }
  });

  // Host: submit match results
  socket.on('results:submit', ({ winner, equipe1, equipe2, deaths }) => {
    try {
      const lobby = LobbyManager.getLobbyBySocket(socket.id);
      if (!lobby) return socket.emit('error:general', { message: 'Lobby introuvable.' });

      const requester = lobby.players.get(socket.id);
      if (!requester?.isHost) return socket.emit('error:general', { message: 'Seul l\'host peut soumettre les résultats.' });
      if (lobby.phase !== GamePhase.LOL_ENDED) return socket.emit('error:general', { message: 'Phase incorrecte.' });

      if (!['equipe1', 'equipe2'].includes(winner)) {
        return socket.emit('error:general', { message: 'Gagnant invalide.' });
      }

      GameManager.submitResults(lobby, { winner, equipe1, equipe2 }, deaths || {});
      GameManager.startVotingSelf(lobby);

      // Bots vote instantly so they don't block the phase
      BotManager.autoVoteBots(lobby, 'self');

      io.to(lobby.code).emit('lobby:updated', { lobby: lobby.toDTO() });
      io.to(lobby.code).emit('game:phase_changed', { phase: lobby.phase, lolStartedAt: lobby.currentGame?.lolStartedAt ?? null });

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
      io.to(lobby.code).emit('game:phase_changed', { phase: lobby.phase, lolStartedAt: lobby.currentGame?.lolStartedAt ?? null });
    } catch (err) {
      socket.emit('error:general', { message: err.message });
    }
  });

  // Host (spectating): fetch the Droide/Double-Face players available to target
  socket.on('game:host_control_targets', () => {
    try {
      const lobby = LobbyManager.getLobbyBySocket(socket.id);
      if (!lobby) return socket.emit('error:general', { message: 'Lobby introuvable.' });
      if (!_requireSpectatingHost(lobby, socket)) return;

      const droides = lobby.getActivePlayers()
        .filter((p) => p.secretRole === Roles.DROIDE)
        .map((p) => ({ id: p.id, username: p.username, team: p.team }));

      const doubleFaces = lobby.getActivePlayers()
        .filter((p) => p.secretRole === Roles.DOUBLE_FACE)
        .map((p) => ({
          id: p.id,
          username: p.username,
          team: p.team,
          currentMode: lobby.currentGame.doubleFaceStates.get(p.id) || null,
        }));

      socket.emit('game:host_control_targets', { droides, doubleFaces });
    } catch (err) {
      socket.emit('error:general', { message: err.message });
    }
  });

  // Host (spectating): force a specific Double Face player's mode
  socket.on('doubleFace:host_set_mode', ({ targetPlayerId, mode }) => {
    try {
      const lobby = LobbyManager.getLobbyBySocket(socket.id);
      if (!lobby) return socket.emit('error:general', { message: 'Lobby introuvable.' });
      if (!_requireSpectatingHost(lobby, socket)) return;

      if (!['allie', 'imposteur'].includes(mode)) {
        return socket.emit('error:general', { message: 'Mode invalide.' });
      }
      const target = lobby.players.get(targetPlayerId);
      if (!target || target.secretRole !== Roles.DOUBLE_FACE) {
        return socket.emit('error:general', { message: 'Cible invalide.' });
      }

      DoubleFaceManager.hostSetMode(targetPlayerId, mode, lobby, io);
    } catch (err) {
      socket.emit('error:general', { message: err.message });
    }
  });

  // Host (spectating): overwrite a Droide's current quest with custom text
  socket.on('game:host_set_droide_quest', ({ targetPlayerId, text }) => {
    try {
      const lobby = LobbyManager.getLobbyBySocket(socket.id);
      if (!lobby) return socket.emit('error:general', { message: 'Lobby introuvable.' });
      if (!_requireSpectatingHost(lobby, socket)) return;

      if (!text || !text.trim()) {
        return socket.emit('error:general', { message: 'Quête vide.' });
      }
      const target = lobby.players.get(targetPlayerId);
      if (!target || target.secretRole !== Roles.DROIDE) {
        return socket.emit('error:general', { message: 'Cible invalide.' });
      }

      GameManager.hostSetDroideQuest(targetPlayerId, text.trim(), lobby, io);
    } catch (err) {
      socket.emit('error:general', { message: err.message });
    }
  });
}

module.exports = { registerGameHandlers };
