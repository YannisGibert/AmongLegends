const { GamePhase } = require('../config/constants');
const { shuffle } = require('../utils/arrayUtils');

let championsCache = null;
let versionCache = null;

async function _fetchChampions() {
  if (championsCache) return championsCache;

  const versionsRes = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
  const versions = await versionsRes.json();
  versionCache = versions[0];

  const champRes = await fetch(
    `https://ddragon.leagueoflegends.com/cdn/${versionCache}/data/fr_FR/champion.json`
  );
  const data = await champRes.json();

  championsCache = Object.keys(data.data); // array of champion IDs (e.g. 'Ahri', 'Zed')
  return championsCache;
}

async function maybeAssignChampions(lobby) {
  if (!lobby.settings.championDraft) return false;
  if (Math.random() * 100 >= lobby.settings.championDraftChance) return false;

  try {
    const champions = await _fetchChampions();
    const activePlayers = lobby.getActivePlayers();
    const shuffled = shuffle([...champions]);

    for (let i = 0; i < activePlayers.length; i++) {
      activePlayers[i].champion = shuffled[i % shuffled.length];
    }

    lobby.phase = GamePhase.CHAMPION_REVEAL;
    return true;
  } catch (err) {
    console.error('[ChampionManager] Failed to fetch champions:', err.message);
    return false;
  }
}

function getVersion() {
  return versionCache;
}

module.exports = { maybeAssignChampions, getVersion };
