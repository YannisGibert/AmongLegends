const { Teams } = require('../config/constants');

class Player {
  constructor({ id, username, isHost = false, isBot = false }) {
    this.id = id;
    this.username = username;
    this.isHost = isHost;
    this.isBot = isBot;
    this.isConnected = true;
    this.team = Teams.SPECTATEUR;

    // Set per round, reset each game
    this.lolRole = null;
    this.secretRole = null;
    this.romeoPartnerId = null;
    this.romeoPartnerName = null;

    // Cumulative across all rounds in this lobby
    this.cumulativeScore = 0;
    this.roundScores = [];
  }

  toDTO() {
    return {
      id: this.id,
      username: this.username,
      isHost: this.isHost,
      isBot: this.isBot,
      isConnected: this.isConnected,
      team: this.team,
      lolRole: this.lolRole,
      cumulativeScore: this.cumulativeScore,
      roundScores: this.roundScores,
      // secretRole intentionally omitted from DTO
    };
  }

  toPrivateDTO() {
    return {
      role: this.secretRole,
      romeoPartnerId: this.romeoPartnerId,
      romeoPartnerName: this.romeoPartnerName,
    };
  }

  resetForNewRound() {
    this.lolRole = null;
    this.secretRole = null;
    this.romeoPartnerId = null;
    this.romeoPartnerName = null;
  }
}

module.exports = Player;
