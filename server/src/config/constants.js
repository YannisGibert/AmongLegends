const GamePhase = {
  LOBBY_WAITING: 'LOBBY_WAITING',
  ROLE_WHEEL: 'ROLE_WHEEL',
  CHAMPION_REVEAL: 'CHAMPION_REVEAL',
  ROLES_ASSIGNED: 'ROLES_ASSIGNED',
  LOL_STARTED: 'LOL_STARTED',
  LOL_ENDED: 'LOL_ENDED',
  RESULTS_INPUT: 'RESULTS_INPUT',
  VOTING_SELF: 'VOTING_SELF',
  VOTING_ENEMY: 'VOTING_ENEMY',
  FINAL_SCORES: 'FINAL_SCORES',
};

const Roles = {
  IMPOSTEUR: 'Imposteur',
  DROIDE: 'Droide',
  ESCROC: 'Escroc',
  SERPENTIN: 'Serpentin',
  ROMEO: 'Romeo',
  SUPER_HEROS: 'Super-Heros',
  DOUBLE_FACE: 'Double-Face',
};

const ALL_ROLES = Object.values(Roles);

const LolRoles = ['Top', 'Jungle', 'Mid', 'ADC', 'Support'];

const Teams = {
  EQUIPE1: 'equipe1',
  EQUIPE2: 'equipe2',
  SPECTATEUR: 'spectateur',
};

const ROLE_CONFIG = {
  [Roles.IMPOSTEUR]: {
    immuneToDiscovery: false,
    description: "Perdre la partie sans se faire démasquer comme Imposteur.",
  },
  [Roles.DROIDE]: {
    immuneToDiscovery: false,
    description: "Gagner la partie en suivant les ordres vocaux donnés pendant la partie.",
  },
  [Roles.ESCROC]: {
    immuneToDiscovery: false,
    description: "Gagner la partie tout en faisant voter les autres comme si tu étais l'Imposteur.",
  },
  [Roles.SERPENTIN]: {
    immuneToDiscovery: false,
    description: "Gagner la partie tout en ayant le plus de morts ET le plus de dégâts de ton équipe.",
  },
  [Roles.ROMEO]: {
    immuneToDiscovery: false,
    description: "Tu es lié à une âme sœur. Tu dois mourir autant de fois qu'elle (ou moins).",
  },
  [Roles.SUPER_HEROS]: {
    immuneToDiscovery: true,
    description: "Gagner absolument la partie. Bonus si tu es premier en kills, dégâts ou assists.",
  },
  [Roles.DOUBLE_FACE]: {
    immuneToDiscovery: false,
    description: "Gagner quand tu es en mode Allié, perdre quand tu es en mode Imposteur. Ton état change aléatoirement.",
  },
};

module.exports = { GamePhase, Roles, ALL_ROLES, LolRoles, Teams, ROLE_CONFIG };
