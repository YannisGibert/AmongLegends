const { GamePhase } = require('../config/constants');

class Lobby {
  constructor({ code, hostId }) {
    this.code = code;
    this.hostId = hostId;
    this.phase = GamePhase.LOBBY_WAITING;

    this.settings = {
      enableEnemyVoting: false,
      symmetricRoles: true, // both teams get the same role distribution when true
      playerCount: 10, // derived from actual player count when game starts
    };

    // Map<socketId, Player>
    this.players = new Map();

    this.currentGame = null;
    this.completedGames = [];
    this.roundNumber = 0;

    this.createdAt = Date.now();
  }

  toDTO() {
    return {
      code: this.code,
      hostId: this.hostId,
      phase: this.phase,
      settings: this.settings,
      players: Array.from(this.players.values()).map((p) => p.toDTO()),
      roundNumber: this.roundNumber,
    };
  }

  getTeamPlayers(team) {
    return Array.from(this.players.values()).filter((p) => p.team === team);
  }

  getActivePlayers() {
    return Array.from(this.players.values()).filter(
      (p) => p.team === 'equipe1' || p.team === 'equipe2'
    );
  }
}

module.exports = Lobby;
