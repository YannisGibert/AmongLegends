const { v4: uuidv4 } = require('uuid');

class Game {
  constructor({ roundNumber }) {
    this.id = uuidv4();
    this.roundNumber = roundNumber;

    // Who won
    this.result = null; // { winner: 'equipe1'|'equipe2', equipe1: {...}, equipe2: {...} }

    // Votes: Map<voterId, [{ targetId, roleGuess, phase }]>
    this.votes = new Map();

    // Track who submitted votes
    this.selfVotesSubmitted = new Set();
    this.enemyVotesSubmitted = new Set();

    // Double Face state tracking
    this.doubleFaceStates = new Map(); // playerId -> 'allie'|'imposteur'
    this.doubleFaceTimers = new Map(); // playerId -> timeout reference

    // Droide commands (per-player, sent privately)
    this.droideCommands = new Map(); // playerId -> current command
    this.commandHistory = [];
    this.droideTimers = new Map();   // playerId -> per-player setTimeout reference
    this.lolStartedAt = null;                 // timestamp, used for time-gated quests
    this.droideFirstQuestGiven = new Set();   // playerIds who already received their first quest
    this.droideRecentQuestIds = new Map();    // playerId -> last quest ids given (avoid immediate repeats)

    // Death count per player submitted by host at game end
    this.playerDeaths = {}; // { [playerId]: deathCount }

    // Final scores for this round
    this.scores = null; // Map<playerId, { round, breakdown }>
  }
}

module.exports = Game;
