const Player = require('../models/Player');
const { ALL_ROLES } = require('../config/constants');
const { pickRandom } = require('../utils/arrayUtils');

const BOT_NAMES = [
  'Faker Bot', 'Uzi Bot', 'Caps Bot', 'Rekkles Bot', 'ShowMaker Bot',
  'Ruler Bot', 'Zeus Bot', 'Keria Bot', 'Gumayusi Bot', 'Oner Bot',
];

let botCounter = 0;

function addBot(lobby) {
  const totalBots = Array.from(lobby.players.values()).filter((p) => p.isBot).length;
  if (totalBots >= 10) throw new Error('Limite de bots atteinte.');

  const botId = `bot_${Date.now()}_${++botCounter}`;
  const name = BOT_NAMES[totalBots % BOT_NAMES.length];

  const bot = new Player({ id: botId, username: name, isBot: true });
  lobby.players.set(botId, bot);
  return bot;
}

function removeBot(lobby, botId) {
  const bot = lobby.players.get(botId);
  if (!bot || !bot.isBot) throw new Error('Bot introuvable.');
  lobby.players.delete(botId);
}

// Called server-side right after voting phase starts.
// Bots immediately submit random votes so they don't block the phase.
function autoVoteBots(lobby, phase) {
  const game = lobby.currentGame;
  if (!game) return;

  const bots = lobby.getActivePlayers().filter((p) => p.isBot);
  if (bots.length === 0) return;

  for (const bot of bots) {
    // Determine targets based on voting phase
    let targets;
    if (phase === 'self') {
      const myTeamPlayers = lobby.getTeamPlayers(bot.team);
      targets = myTeamPlayers.filter((p) => p.id !== bot.id);
    } else {
      const enemyTeam = bot.team === 'equipe1' ? 'equipe2' : 'equipe1';
      targets = lobby.getTeamPlayers(enemyTeam);
    }

    const votes = targets.map((target) => ({
      targetId: target.id,
      roleGuess: pickRandom(ALL_ROLES),
      phase,
    }));

    // Append bot votes (bots don't vote twice in same phase)
    const existing = game.votes.get(bot.id) || [];
    const alreadyVotedThisPhase = existing.some((v) => v.phase === phase);
    if (!alreadyVotedThisPhase) {
      game.votes.set(bot.id, [...existing, ...votes]);
      if (phase === 'self') {
        game.selfVotesSubmitted.add(bot.id);
      } else {
        game.enemyVotesSubmitted.add(bot.id);
      }
    }
  }
}

module.exports = { addBot, removeBot, autoVoteBots };
