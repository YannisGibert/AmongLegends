const LobbyManager = require('../../managers/LobbyManager');
const GameManager = require('../../managers/GameManager');
const BotManager = require('../../managers/BotManager');
const VotingManager = require('../../managers/VotingManager');
const { GamePhase } = require('../../config/constants');

function registerVotingHandlers(io, socket) {
  socket.on('vote:submit', ({ votes, phase }) => {
    try {
      const lobby = LobbyManager.getLobbyBySocket(socket.id);
      if (!lobby) return socket.emit('error:general', { message: 'Lobby introuvable.' });

      const validPhases = [GamePhase.VOTING_SELF, GamePhase.VOTING_ENEMY];
      if (!validPhases.includes(lobby.phase)) {
        return socket.emit('error:general', { message: 'Phase de vote incorrecte.' });
      }

      const currentPhaseKey = lobby.phase === GamePhase.VOTING_SELF ? 'self' : 'enemy';

      VotingManager.submitVote(lobby, socket.id, votes, currentPhaseKey);

      // Acknowledge receipt
      socket.emit('vote:acknowledged');

      // Broadcast updated submission count (only count human players in progress display)
      _broadcastVoteProgress(io, lobby, currentPhaseKey);

      // Check if all have voted
      if (lobby.phase === GamePhase.VOTING_SELF && VotingManager.checkAllVotedSelf(lobby)) {
        if (lobby.settings.enableEnemyVoting && lobby.settings.playerCount === 10) {
          GameManager.startVotingEnemy(lobby);
          // Bots vote instantly for enemy phase too
          BotManager.autoVoteBots(lobby, 'enemy');
          io.to(lobby.code).emit('lobby:updated', { lobby: lobby.toDTO() });
          io.to(lobby.code).emit('game:phase_changed', { phase: lobby.phase });
          _broadcastVoteProgress(io, lobby, 'enemy');
          // Check again in case only bots remain
          if (VotingManager.checkAllVotedEnemy(lobby)) {
            finalize(io, lobby);
          }
        } else {
          finalize(io, lobby);
        }
      } else if (lobby.phase === GamePhase.VOTING_ENEMY && VotingManager.checkAllVotedEnemy(lobby)) {
        finalize(io, lobby);
      }
    } catch (err) {
      socket.emit('error:general', { message: err.message });
    }
  });
}

function _broadcastVoteProgress(io, lobby, phaseKey) {
  const game = lobby.currentGame;
  if (!game) return;
  const humanPlayers = lobby.getActivePlayers().filter((p) => !p.isBot);
  const humanSubmitted = humanPlayers.filter((p) =>
    phaseKey === 'self'
      ? game.selfVotesSubmitted.has(p.id)
      : game.enemyVotesSubmitted.has(p.id)
  ).length;

  io.to(lobby.code).emit('vote:progress', {
    phase: phaseKey,
    submitted: humanSubmitted,
    total: humanPlayers.length,
  });
}

function finalize(io, lobby) {
  const scores = GameManager.finalizScores(lobby);

  const scoresPayload = [];
  for (const player of lobby.getActivePlayers()) {
    const s = scores[player.id];
    scoresPayload.push({
      id: player.id,
      username: player.username,
      team: player.team,
      isBot: player.isBot,
      secretRole: player.secretRole,
      cumulativeScore: player.cumulativeScore,
      roundScores: player.roundScores,
      lastRoundScore: s?.round ?? 0,
      breakdown: s?.breakdown ?? {},
    });
  }

  io.to(lobby.code).emit('lobby:updated', { lobby: lobby.toDTO() });
  io.to(lobby.code).emit('game:phase_changed', { phase: lobby.phase });
  io.to(lobby.code).emit('scores:final', { players: scoresPayload });
}

module.exports = { registerVotingHandlers, finalize, _broadcastVoteProgress };
