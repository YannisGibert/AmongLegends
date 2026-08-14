const { pickRandom } = require('../utils/arrayUtils');

const LOL_POSITIONS = ['Top', 'Jungle', 'Mid', 'ADC', 'Support'];

function oppositeTeam(team) {
  return team === 'equipe1' ? 'equipe2' : 'equipe1';
}

function randomPosition(exclude = []) {
  return pickRandom(LOL_POSITIONS.filter((p) => !exclude.includes(p)));
}

function enemyAt(position, player, lobby) {
  return lobby.getTeamPlayers(oppositeTeam(player.team)).find((p) => p.lolRole === position);
}

function allyAt(position, player, lobby) {
  return lobby.getTeamPlayers(player.team).find((p) => p.lolRole === position && p.id !== player.id);
}

function randomAlly(player, lobby, exclude = []) {
  const teammates = lobby.getTeamPlayers(player.team).filter((p) => p.id !== player.id && !exclude.includes(p.lolRole));
  return pickRandom(teammates);
}

// ─── Quest bank ───────────────────────────────────────────────────────────────
// scope: 'global' | one of LOL_POSITIONS
// build(player, lobby, minutesUntilNext) -> resolved text sent to the Droide

const DROIDE_QUESTS = [
  // ─── Global ───────────────────────────────────────────────────────────────
  {
    id: 'mentir-actions',
    scope: 'global',
    build: () => "Mens sur tes actions (invocateurs utilisés, ultime utilisé, etc.) si on te pose la question.",
  },
  {
    id: 'tuer-poste-ennemi',
    scope: 'global',
    requiresEnemyTeam: true,
    build: (player, lobby) => {
      const position = randomPosition();
      const target = enemyAt(position, player, lobby);
      return `Tu ne peux plus tuer aucun autre joueur que le ${position} ennemi (${target?.username ?? '?'}) jusqu'à l'avoir tué.`;
    },
  },
  {
    id: 'ne-pas-farm',
    scope: 'global',
    build: (player, lobby, minutesUntilNext) => {
      if (player.lolRole === 'Support') {
        return `Prends le plus de farm possible pendant ${minutesUntilNext} minutes.`;
      }
      return `Ne farm pas pendant ${minutesUntilNext} minutes.`;
    },
  },
  {
    id: 'pick-exotique',
    scope: 'global',
    firstQuestOnly: true,
    build: (player) => `Prends un pick exotique à ton poste (${player.lolRole}) pour cette partie.`,
  },
  {
    id: 'mauvaise-page-rune',
    scope: 'global',
    firstQuestOnly: true,
    build: () => "Prends une mauvaise page de runes pour cette partie.",
  },
  {
    id: 'ulti-premiere-occasion',
    scope: 'global',
    build: () => "Utilise ton ultime à la première occasion, même si ce n'est pas nécessaire.",
  },
  {
    id: 'vendre-item',
    scope: 'global',
    build: () => "Vends l'objet que tu es en train de construire et commence un nouvel objet.",
  },
  {
    id: 'voler-camp-jungle',
    scope: 'global',
    excludeOwnPositions: ['Jungle'],
    build: () =>
      "Vole un camp de ton jungle sans qu'il s'en rende compte. S'il remarque quelque chose, recommence jusqu'à ce qu'il ne remarque rien ou jusqu'à la prochaine quête Droide.",
  },
  {
    id: 'forcer-teamfight',
    scope: 'global',
    minGameMinutes: 15,
    build: () => "Force un teamfight.",
  },
  {
    id: 'ne-pas-parler',
    scope: 'global',
    build: (player, lobby, minutesUntilNext) => `Ne parle pas pendant ${minutesUntilNext} minutes.`,
  },
  {
    id: 'aucun-call',
    scope: 'global',
    build: () => "Ne lance aucun call sur tes actions, agis sans prévenir personne.",
  },
  {
    id: 'bottes-non-adaptees',
    scope: 'global',
    build: () => "Achète des bottes non adaptées à la game (remplace tes bottes actuelles si tu en as déjà).",
  },
  {
    id: 'prochain-item-actif',
    scope: 'global',
    build: () => "Le prochain objet que tu achètes doit avoir un actif (être activable).",
  },
  {
    id: 'sandbag-quete-poste',
    scope: 'global',
    maxGameMinutes: 15,
    build: () => "Fais en sorte d'avancer le moins possible ta quête de poste jusqu'à la prochaine quête Droide.",
  },
  {
    id: 'tilt-action-ratee',
    scope: 'global',
    build: () => "Tilt à la prochaine action qui se passe mal pour toi.",
  },

  // ─── Top ──────────────────────────────────────────────────────────────────
  {
    id: 'top-proxy',
    scope: 'Top',
    build: () => "Proxy jusqu'à la prochaine quête Droide.",
  },
  {
    id: 'top-camp-fake',
    scope: 'Top',
    build: () => "Plains-toi que tu te fais camp, même si ce n'est pas le cas.",
  },
  {
    id: 'top-splitpush',
    scope: 'Top',
    minGameMinutes: 20,
    build: () => "Perma split push jusqu'à la prochaine quête Droide.",
  },
  {
    id: 'top-tp-move',
    scope: 'Top',
    build: () => "Force l'utilisation de ta TP pour faire un move avec tes alliés, même si ce n'est pas nécessaire.",
  },
  {
    id: 'top-coeur-acier',
    scope: 'Top',
    build: () => "Arrête l'objet que tu es en train de construire et fais un Cœur d'Acier maintenant.",
  },

  // ─── Jungle ───────────────────────────────────────────────────────────────
  {
    id: 'jg-camp-poste',
    scope: 'Jungle',
    requiresEnemyTeam: true,
    build: (player, lobby) => {
      const position = randomPosition(['Jungle']);
      const target = enemyAt(position, player, lobby);
      return `Camp le ${position} ennemi (${target?.username ?? '?'}) jusqu'à la prochaine quête Droide.`;
    },
  },
  {
    id: 'jg-force-gank',
    scope: 'Jungle',
    build: () => "Force un gank ou un dive.",
  },
  {
    id: 'jg-mauvais-gank',
    scope: 'Jungle',
    build: () => `Fais un très mauvais gank sur la lane ${pickRandom(['Top', 'Mid', 'Bot'])}.`,
  },
  {
    id: 'jg-objectif-proche',
    scope: 'Jungle',
    build: () => "Fais l'objectif neutre le plus proche et force-le quoi qu'il arrive.",
  },
  {
    id: 'jg-invade',
    scope: 'Jungle',
    build: (player, lobby, minutesUntilNext) => `Perma invade pendant ${minutesUntilNext} minutes, même sans prio.`,
  },
  {
    id: 'jg-fullclear',
    scope: 'Jungle',
    build: (player, lobby, minutesUntilNext) => `Full clear et ne gank pas pendant ${minutesUntilNext} minutes.`,
  },
  {
    id: 'jg-smite-perma',
    scope: 'Jungle',
    build: () => "Utilise ton smite en permanence dès qu'il est disponible, jusqu'à la prochaine quête Droide.",
  },

  // ─── Mid ──────────────────────────────────────────────────────────────────
  {
    id: 'mid-no-roam',
    scope: 'Mid',
    build: () => "Ne roam pas jusqu'à la prochaine quête Droide.",
  },
  {
    id: 'mid-perma-roam',
    scope: 'Mid',
    build: (player, lobby, minutesUntilNext) => `Perma roam et ne reste pas au mid pendant ${minutesUntilNext} minutes.`,
  },
  {
    id: 'mid-build-resist',
    scope: 'Mid',
    build: () => "Construis un objet Armure si tu es contre un AP, ou un objet Résistance Magique si tu es contre un AD.",
  },
  {
    id: 'mid-rabadon',
    scope: 'Mid',
    build: () => "Arrête ton objet actuel et fais un Rabadon maintenant.",
  },
  {
    id: 'mid-focus-adc',
    scope: 'Mid',
    requiresEnemyTeam: true,
    build: (player, lobby) => {
      const target = enemyAt('ADC', player, lobby);
      return `Focus l'ADC ennemi (${target?.username ?? '?'}) jusqu'à la prochaine quête Droide. À chaque teamfight ou action, ton objectif premier est de le tuer en lui laissant le moins de counterplay possible.`;
    },
  },

  // ─── ADC ──────────────────────────────────────────────────────────────────
  {
    id: 'adc-onhit-brulure',
    scope: 'ADC',
    build: () => "Le prochain objet doit être un objet On-Hit si tu es AD, ou de Brûlure si tu es AP.",
  },
  {
    id: 'adc-crit-burst',
    scope: 'ADC',
    build: () => "Le prochain objet doit être un objet Critique, ou un objet de Burst complet si tu es AP.",
  },
  {
    id: 'adc-no-defensif',
    scope: 'ADC',
    build: () => "Tu ne peux plus acheter d'objet défensif (Garde-Ange, Zhonya, Bulle Runique, etc.).",
  },
  {
    id: 'adc-focus-mid',
    scope: 'ADC',
    requiresEnemyTeam: true,
    build: (player, lobby) => {
      const target = enemyAt('Mid', player, lobby);
      return `Focus le Mid ennemi (${target?.username ?? '?'}) jusqu'à la prochaine quête Droide. À chaque teamfight ou action, ton objectif premier est de le tuer en lui laissant le moins de counterplay possible.`;
    },
  },

  // ─── Support ──────────────────────────────────────────────────────────────
  {
    id: 'sup-no-ward',
    scope: 'Support',
    build: () => "Ne pose et ne casse aucune ward/pink jusqu'à la prochaine quête Droide.",
  },
  {
    id: 'sup-voler-cannon',
    scope: 'Support',
    build: (player, lobby) => {
      const ally = randomAlly(player, lobby, ['Jungle', 'Support']);
      return `Vole le sbire canon de ton ${ally?.lolRole ?? '?'} (${ally?.username ?? '?'}) sans qu'il/elle s'en aperçoive. S'il/elle remarque quelque chose, recommence jusqu'à ce qu'il/elle ne remarque rien ou jusqu'à la prochaine quête Droide.`;
    },
  },
  {
    id: 'sup-no-heal',
    scope: 'Support',
    build: (player, lobby, minutesUntilNext) => `Ne heal, shield ou peel aucun allié pendant ${minutesUntilNext} minutes.`,
  },
  {
    id: 'sup-base-open',
    scope: 'Support',
    build: (player, lobby) => {
      const position = randomPosition(['ADC', 'Support']);
      const ally = allyAt(position, player, lobby);
      return `Base instantanément et ouvre la vision vers le ${position} (${ally?.username ?? '?'}).`;
    },
  },
  {
    id: 'sup-force-invade',
    scope: 'Support',
    build: () => "Force une invade avec ton jungle.",
  },
  {
    id: 'sup-force-dive',
    scope: 'Support',
    build: () => "Force un dive sur la map.",
  },
  {
    id: 'sup-roam-no-return',
    scope: 'Support',
    build: () => "Roam et ne reviens pas bot jusqu'à la prochaine quête Droide.",
  },
  {
    id: 'sup-summoner-inutile',
    scope: 'Support',
    build: () => "Utilise ton invocateur secondaire (Exhaust, Ignite, etc.) de manière inutile.",
  },
  {
    id: 'sup-voler-kills',
    scope: 'Support',
    build: () => 'Essaie de voler le plus de kills possible à tes alliés "sans faire exprès".',
  },
  {
    id: 'sup-peel-designe',
    scope: 'Support',
    minGameMinutes: 15,
    build: (player, lobby) => {
      const ally = randomAlly(player, lobby);
      return `Peel le/la ${ally?.lolRole ?? '?'} désigné(e) (${ally?.username ?? '?'}) jusqu'à la prochaine quête Droide.`;
    },
  },
];

module.exports = { DROIDE_QUESTS, oppositeTeam };
