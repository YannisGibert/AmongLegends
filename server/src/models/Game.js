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
    this.commandDeck = [];           // shuffled deck of commands
    this.commandHistory = [];
    this.droideCommandTimer = null;  // auto-send interval reference

    // Final scores for this round
    this.scores = null; // Map<playerId, { round, breakdown }>
  }
}

module.exports = Game;
