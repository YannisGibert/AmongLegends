const { GamePhase, Teams } = require('../config/constants');

function submitVote(lobby, voterId, votes, phase) {
  const game = lobby.currentGame;
  if (!game) throw new Error('Pas de partie en cours.');

  // votes = [{ targetId, roleGuess }]
  const enrichedVotes = votes.map((v) => ({ ...v, phase }));
  game.votes.set(voterId, (game.votes.get(voterId) || []).concat(enrichedVotes));

  if (phase === 'self') {
    game.selfVotesSubmitted.add(voterId);
  } else {
    game.enemyVotesSubmitted.add(voterId);
  }
}

function checkAllVotedSelf(lobby) {
  const game = lobby.currentGame;
  if (!game) return false;
  const eligible = lobby.getActivePlayers();
  return eligible.every((p) => game.selfVotesSubmitted.has(p.id));
}

function checkAllVotedEnemy(lobby) {
  const game = lobby.currentGame;
  if (!game) return false;
  const eligible = lobby.getActivePlayers();
  return eligible.every((p) => game.enemyVotesSubmitted.has(p.id));
}

function buildReceivedVotesMap(game) {
  // Returns Map<targetId, [{ voterId, roleGuess, phase }]>
  const map = new Map();
  for (const [voterId, votes] of game.votes.entries()) {
    for (const vote of votes) {
      if (!map.has(vote.targetId)) map.set(vote.targetId, []);
      map.get(vote.targetId).push({ voterId, roleGuess: vote.roleGuess, phase: vote.phase });
    }
  }
  return map;
}

module.exports = { submitVote, checkAllVotedSelf, checkAllVotedEnemy, buildReceivedVotesMap };
