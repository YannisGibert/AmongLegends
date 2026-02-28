export const GamePhase = {
  LOBBY_WAITING: 'LOBBY_WAITING',
  ROLE_WHEEL: 'ROLE_WHEEL',
  ROLES_ASSIGNED: 'ROLES_ASSIGNED',
  LOL_STARTED: 'LOL_STARTED',
  LOL_ENDED: 'LOL_ENDED',
  RESULTS_INPUT: 'RESULTS_INPUT',
  VOTING_SELF: 'VOTING_SELF',
  VOTING_ENEMY: 'VOTING_ENEMY',
  FINAL_SCORES: 'FINAL_SCORES',
}

export const ALL_ROLES = [
  'Imposteur',
  'Droide',
  'Escroc',
  'Serpentin',
  'Romeo',
  'Super-Heros',
  'Double-Face',
]

export const ROLE_INFO = {
  'Imposteur': {
    emoji: '🎭',
    color: '#e74c3c',
    description: 'Perdre la partie sans se faire démasquer comme Imposteur.',
    objective: 'PERDRE la partie',
  },
  'Droide': {
    emoji: '🤖',
    color: '#3498db',
    description: 'Gagner la partie en suivant les ordres donnés pendant la partie.',
    objective: 'GAGNER + Suivre les ordres',
  },
  'Escroc': {
    emoji: '🃏',
    color: '#e67e22',
    description: 'Gagner la partie tout en faisant voter les autres comme si tu étais l\'Imposteur.',
    objective: 'GAGNER + Passer pour l\'Imposteur',
  },
  'Serpentin': {
    emoji: '🐍',
    color: '#27ae60',
    description: 'Gagner la partie tout en ayant le plus de morts ET le plus de dégâts de ton équipe.',
    objective: 'GAGNER + Plus de morts + Plus de dégâts',
  },
  'Romeo': {
    emoji: '💘',
    color: '#e91e8c',
    description: 'Tu es lié à une âme sœur. Tu dois avoir le même nombre de morts qu\'elle.',
    objective: 'Même nombre de morts que ton âme sœur',
  },
  'Super-Heros': {
    emoji: '🦸',
    color: '#f1c40f',
    description: 'Gagner absolument la partie. Bonus si tu es premier en kills, dégâts ou assists.',
    objective: 'GAGNER (obligatoire)',
  },
  'Double-Face': {
    emoji: '🎲',
    color: '#9b59b6',
    description: 'Gagner quand tu es en mode Allié, perdre quand tu es en mode Imposteur. Ton état change aléatoirement.',
    objective: 'Bon timing selon ton mode actuel',
  },
}

export const LOL_ROLE_INFO = {
  Top: { emoji: '🛡', color: '#e74c3c' },
  Jungle: { emoji: '🌿', color: '#27ae60' },
  Mid: { emoji: '⚡', color: '#f1c40f' },
  ADC: { emoji: '🏹', color: '#3498db' },
  Support: { emoji: '💚', color: '#8e44ad' },
}
