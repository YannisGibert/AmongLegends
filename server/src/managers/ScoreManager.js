const { Roles, ROLE_CONFIG } = require('../config/constants');
const { buildReceivedVotesMap } = require('./VotingManager');

function calculateScores(game, lobby) {
  const players = lobby.getActivePlayers();
  const scores = {};

  for (const player of players) {
    scores[player.id] = {
      round: 0,
      breakdown: {
        voting: 0,
        discovery: 0,
        role: 0,
      },
    };
  }

  const receivedVotes = buildReceivedVotesMap(game);

  // Step 1: Universal voting score (votes YOU made)
  for (const player of players) {
    const myVotes = game.votes.get(player.id) || [];
    let votingScore = 0;

    for (const vote of myVotes) {
      const target = lobby.players.get(vote.targetId);
      if (!target) continue;
      const correct = target.secretRole === vote.roleGuess;
      votingScore += correct ? 1 : -1;
    }

    scores[player.id].round += votingScore;
    scores[player.id].breakdown.voting = votingScore;
  }

  // Step 2: Universal discovery score (how well you hid YOUR role)
  for (const player of players) {
    const isImmune = ROLE_CONFIG[player.secretRole]?.immuneToDiscovery;
    const votesReceived = receivedVotes.get(player.id) || [];
    let discoveryScore = 0;

    for (const vote of votesReceived) {
      const guessedCorrectly = vote.roleGuess === player.secretRole;
      if (guessedCorrectly) {
        discoveryScore -= 1;
      } else {
        discoveryScore += 1;
      }
    }

    if (isImmune) {
      // Super-Heros: no discovery malus but keeps the bonus for not being found
      discoveryScore = Math.max(0, discoveryScore);
    }

    scores[player.id].round += discoveryScore;
    scores[player.id].breakdown.discovery = discoveryScore;
  }

  // Step 3: Role-specific scoring
  const result = game.result;
  if (!result) return scores;

  for (const player of players) {
    const playerWon = player.team === result.winner;
    const votesReceived = receivedVotes.get(player.id) || [];
    const teamResult = result[player.team] || {};
    let roleScore = 0;

    switch (player.secretRole) {
      case Roles.IMPOSTEUR: {
        roleScore += playerWon ? -3 : 2;
        // +1 EXTRA per person who did NOT vote "Imposteur" against them
        const nonImposteurVotes = votesReceived.filter(
          (v) => v.roleGuess !== Roles.IMPOSTEUR
        ).length;
        roleScore += nonImposteurVotes;
        break;
      }

      case Roles.ESCROC: {
        roleScore += playerWon ? 2 : -3;
        // +1 per person who voted "Imposteur" against them
        const imposteurVotes = votesReceived.filter(
          (v) => v.roleGuess === Roles.IMPOSTEUR
        ).length;
        roleScore += imposteurVotes;
        break;
      }

      case Roles.ROMEO: {
        roleScore += playerWon ? 2 : -2;
        roleScore += 1; // condition toujours considérée comme respectée
        break;
      }

      case Roles.SERPENTIN: {
        roleScore += playerWon ? 2 : -2;
        if (teamResult.mostDamage === player.id) roleScore += 1;
        if (teamResult.mostDeaths === player.id) roleScore += 1;
        break;
      }

      case Roles.SUPER_HEROS: {
        roleScore += playerWon ? 2 : -3;
        if (teamResult.mostKills === player.id) roleScore += 1;
        if (teamResult.mostDamage === player.id) roleScore += 1;
        if (teamResult.mostAssists === player.id) roleScore += 1;
        break;
      }

      case Roles.DOUBLE_FACE: {
        const finalMode = game.doubleFaceStates.get(player.id);
        const bonTiming =
          (playerWon && finalMode === 'allie') ||
          (!playerWon && finalMode === 'imposteur');
        roleScore += bonTiming ? 2 : 0;
        break;
      }

      case Roles.DROIDE: {
        roleScore += playerWon ? 2 : -2;
        roleScore += 1; // condition toujours considérée comme respectée
        break;
      }
    }

    scores[player.id].round += roleScore;
    scores[player.id].breakdown.role = roleScore;
  }

  // Step 4: Apply to cumulative scores
  for (const player of players) {
    const s = scores[player.id];
    player.cumulativeScore += s.round;
    player.roundScores.push(s.round);
  }

  return scores;
}

module.exports = { calculateScores };
