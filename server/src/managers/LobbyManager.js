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
  // Reconnection with same socket.id (common case: page refresh before full disconnect)
  if (lobby.players.has(socket.id)) {
    const existing = lobby.players.get(socket.id);
    existing.isConnected = true;
    socket.join(upperCode);
    return { lobby, player: existing, reconnected: true, oldId: null };
  }

  // Reconnection with new socket.id (socket dropped and reconnected during active game)
  if (lobby.phase !== GamePhase.LOBBY_WAITING) {
    const existingPlayer = Array.from(lobby.players.values()).find(
      (p) => !p.isBot && p.username === username && !p.isConnected
    );
    if (existingPlayer) {
      const oldId = existingPlayer.id;
      existingPlayer.id = socket.id;
      existingPlayer.isConnected = true;
      lobby.players.delete(oldId);
      lobby.players.set(socket.id, existingPlayer);
      if (existingPlayer.isHost) lobby.hostId = socket.id;
      socket.join(upperCode);
      return { lobby, player: existingPlayer, reconnected: true, oldId };
    }
    throw new Error('La partie a déjà commencé.');
  }

  const player = new Player({ id: socket.id, username, isHost: false });
  player.team = 'spectateur';
  lobby.players.set(socket.id, player);
  socket.join(upperCode);

  return { lobby, player, reconnected: false, oldId: null };
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

  // If host disconnects, transfer host to next connected non-bot player
  if (player.isHost) {
    const nextPlayer = Array.from(lobby.players.values()).find(
      (p) => p.isConnected && !p.isBot && p.id !== socketId
    );
    if (nextPlayer) {
      player.isHost = false;
      nextPlayer.isHost = true;
      lobby.hostId = nextPlayer.id;
    }
  }

  // If no real (non-bot) players remain connected, cleanup lobby after 3 minutes
  const realConnected = Array.from(lobby.players.values()).filter(
    (p) => p.isConnected && !p.isBot
  ).length;

  if (realConnected === 0) {
    setTimeout(() => {
      const currentLobby = lobbies.get(lobby.code);
      if (!currentLobby) return;
      const stillConnected = Array.from(currentLobby.players.values()).filter(
        (p) => p.isConnected && !p.isBot
      ).length;
      if (stillConnected === 0) {
        cleanupLobby(currentLobby);
      }
    }, 3 * 60 * 1000);
  }

  return lobby;
}

function cleanupLobby(lobby) {
  if (lobby.currentGame) {
    DoubleFaceManager.cleanup(lobby.currentGame);
    // Clear per-player Droide timers
    if (lobby.currentGame.droideTimers) {
      for (const timer of lobby.currentGame.droideTimers.values()) {
        clearTimeout(timer);
      }
      lobby.currentGame.droideTimers.clear();
    }
  }
  lobbies.delete(lobby.code);
}

// Voluntarily remove a player (they clicked "Quitter")
// Returns the lobby if it still has players, null if it was deleted.
function removePlayer(lobby, socketId) {
  const player = lobby.players.get(socketId);
  if (!player) return null;

  lobby.players.delete(socketId);

  // Transfer host to next connected non-bot player if needed
  if (player.isHost) {
    const nextHost = Array.from(lobby.players.values()).find(
      (p) => p.isConnected && !p.isBot
    );
    if (nextHost) {
      nextHost.isHost = true;
      lobby.hostId = nextHost.id;
    }
  }

  // If no real (non-bot) players remain, disband the lobby
  const realPlayers = Array.from(lobby.players.values()).filter((p) => !p.isBot);
  if (realPlayers.length === 0) {
    cleanupLobby(lobby);
    return null;
  }

  return lobby;
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
  removePlayer,
  getPlayerFromLobby,
};
