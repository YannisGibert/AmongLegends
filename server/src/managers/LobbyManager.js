const Lobby = require('../models/Lobby');
const Player = require('../models/Player');
const { generateLobbyCode } = require('../utils/lobbyCodeGen');
const { GamePhase } = require('../config/constants');
const DoubleFaceManager = require('./DoubleFaceManager');

// In-memory store
const lobbies = new Map();

function createLobby(socket, username) {
  let code;
  do {
    code = generateLobbyCode();
  } while (lobbies.has(code));

  const lobby = new Lobby({ code, hostId: socket.id });
  const player = new Player({ id: socket.id, username, isHost: true });
  player.team = 'spectateur';

  lobby.players.set(socket.id, player);
  lobbies.set(code, lobby);
  socket.join(code);

  return { lobby, player };
}

function joinLobby(socket, username, code) {
  const upperCode = code.toUpperCase();
  const lobby = lobbies.get(upperCode);

  if (!lobby) {
    throw new Error('Lobby introuvable. Vérifie le code.');
  }
  if (
    lobby.phase !== GamePhase.LOBBY_WAITING &&
    !Array.from(lobby.players.values()).some((p) => p.id === socket.id)
  ) {
    throw new Error('La partie a déjà commencé.');
  }

  // Reconnection: player was already in the lobby
  if (lobby.players.has(socket.id)) {
    const existing = lobby.players.get(socket.id);
    existing.isConnected = true;
    socket.join(upperCode);
    return { lobby, player: existing, reconnected: true };
  }

  const player = new Player({ id: socket.id, username, isHost: false });
  player.team = 'spectateur';
  lobby.players.set(socket.id, player);
  socket.join(upperCode);

  return { lobby, player, reconnected: false };
}

function getLobbyByCode(code) {
  return lobbies.get(code.toUpperCase()) || null;
}

function getLobbyBySocket(socketId) {
  for (const lobby of lobbies.values()) {
    if (lobby.players.has(socketId)) return lobby;
  }
  return null;
}

function handleDisconnect(socketId, io) {
  const lobby = getLobbyBySocket(socketId);
  if (!lobby) return null;

  const player = lobby.players.get(socketId);
  if (!player) return null;

  player.isConnected = false;

  // If host disconnects, transfer host to next connected player
  if (player.isHost) {
    const nextPlayer = Array.from(lobby.players.values()).find(
      (p) => p.isConnected && p.id !== socketId
    );
    if (nextPlayer) {
      player.isHost = false;
      nextPlayer.isHost = true;
      lobby.hostId = nextPlayer.id;
    }
  }

  // If all players disconnected, cleanup lobby after 10 minutes
  const connectedCount = Array.from(lobby.players.values()).filter(
    (p) => p.isConnected
  ).length;

  if (connectedCount === 0) {
    setTimeout(() => {
      const currentLobby = lobbies.get(lobby.code);
      if (currentLobby) {
        cleanupLobby(currentLobby);
        lobbies.delete(lobby.code);
      }
    }, 10 * 60 * 1000);
  }

  return lobby;
}

function cleanupLobby(lobby) {
  if (lobby.currentGame) {
    DoubleFaceManager.cleanup(lobby.currentGame);
  }
  lobbies.delete(lobby.code);
}

function getPlayerFromLobby(lobby, socketId) {
  return lobby.players.get(socketId) || null;
}

module.exports = {
  createLobby,
  joinLobby,
  getLobbyByCode,
  getLobbyBySocket,
  handleDisconnect,
  cleanupLobby,
  getPlayerFromLobby,
};
