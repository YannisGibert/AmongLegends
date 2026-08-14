import { io } from 'socket.io-client'
import { ref } from 'vue'
import { useLobbyStore } from '@/stores/lobbyStore'
import { usePlayerStore } from '@/stores/playerStore'
import { useGameStore } from '@/stores/gameStore'

let socket = null
const isConnected = ref(false)
const error = ref(null)
let _keepAliveTimer = null

export function useSocket() {
  function connect() {
    if (socket?.connected) return socket

    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || ''

    socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket'], // WebSocket pur — requis pour Cloud Run (pas de polling)
    })

    socket.on('connect', () => {
      isConnected.value = true
      error.value = null
      console.log('[Socket] Connected:', socket.id)
      // Auto-rejoin if we were already in a lobby (e.g. after server restart / reconnect)
      const ls = useLobbyStore()
      const ps = usePlayerStore()
      if (ls.code && ps.username) {
        socket.emit('lobby:join', { username: ps.username, lobbyCode: ls.code })
      }
      // Keep Render.com free tier alive: send HTTP ping every 10 min
      if (_keepAliveTimer) clearInterval(_keepAliveTimer)
      _keepAliveTimer = setInterval(() => {
        fetch((import.meta.env.VITE_SOCKET_URL || '') + '/health').catch(() => {})
      }, 10 * 60 * 1000)
    })

    socket.on('disconnect', () => {
      isConnected.value = false
      console.log('[Socket] Disconnected')
      clearInterval(_keepAliveTimer)
      _keepAliveTimer = null
    })

    socket.on('connect_error', (err) => {
      error.value = 'Impossible de se connecter au serveur.'
      console.error('[Socket] Connection error:', err)
    })

    _wireStoreEvents()
    return socket
  }

  function disconnect() {
    if (socket) {
      socket.disconnect()
      socket = null
      isConnected.value = false
    }
  }

  function emit(event, data) {
    if (!socket?.connected) {
      console.warn('[Socket] Not connected, cannot emit:', event)
      return
    }
    socket.emit(event, data)
  }

  function getSocket() {
    return socket
  }

  return { connect, disconnect, emit, getSocket, isConnected, error }
}

function _wireStoreEvents() {
  if (!socket) return

  const lobbyStore = useLobbyStore()
  const playerStore = usePlayerStore()
  const gameStore = useGameStore()

  // ─── Lobby events ───
  socket.on('lobby:created', ({ lobbyCode, lobby, player }) => {
    lobbyStore.updateLobby(lobby)
    playerStore.setIdentity({ ...player, id: socket.id })
    lobbyStore.code = lobbyCode
  })

  socket.on('lobby:joined', ({ lobbyCode, lobby, player }) => {
    lobbyStore.updateLobby(lobby)
    playerStore.setIdentity({ ...player, id: socket.id })
    lobbyStore.code = lobbyCode
  })

  socket.on('lobby:updated', ({ lobby }) => {
    lobbyStore.updateLobby(lobby)
  })

  // Player left voluntarily OR lobby was disbanded by host
  const _resetAndLeave = () => {
    lobbyStore.reset()
    playerStore.reset()
    gameStore.reset()
  }
  socket.on('lobby:left', _resetAndLeave)
  socket.on('lobby:disbanded', _resetAndLeave)

  // ─── Game phase ───
  socket.on('game:phase_changed', ({ phase, lolStartedAt }) => {
    lobbyStore.phase = phase
    gameStore.phase = phase
    if (lolStartedAt !== undefined) gameStore.lolStartedAt = lolStartedAt
    // Reset votes when entering any voting phase
    if (phase === 'VOTING_SELF' || phase === 'VOTING_ENEMY') {
      gameStore.resetVotes()
    }
    // Reset full game state when returning to lobby (e.g. after play_again)
    if (phase === 'LOBBY_WAITING') {
      gameStore.reset()
    }
  })

  // ─── Private role assignment ───
  socket.on('game:roles_assigned', (roleDTO) => {
    playerStore.setSecretRole(roleDTO)
  })

  // ─── Double Face ───
  socket.on('doubleFace:state_changed', ({ mode, nextFlipMs }) => {
    playerStore.doubleFaceMode = mode
    playerStore.doubleFaceTimerEnd = nextFlipMs ? Date.now() + nextFlipMs : null
  })

  // ─── Droide commands ───
  socket.on('droide:command_changed', ({ command, nextCommandMs }) => {
    gameStore.currentCommand = command
    gameStore.droideTimerEnd = nextCommandMs ? Date.now() + nextCommandMs : null
  })

  // ─── Host god-mode panel (spectating host only) ───
  socket.on('game:host_control_targets', ({ droides, doubleFaces }) => {
    gameStore.hostControlTargets = { droides, doubleFaces }
  })

  // ─── Vote progress ───
  socket.on('vote:progress', (data) => {
    gameStore.voteProgress = data
  })

  socket.on('vote:acknowledged', () => {
    gameStore.votesSubmitted = true
  })

  // ─── Final scores ───
  socket.on('scores:final', ({ players }) => {
    gameStore.finalScores = players
  })

  // ─── Errors ───
  socket.on('error:general', ({ message }) => {
    gameStore.lastError = message
    // Auto-clear after 4s
    setTimeout(() => {
      if (gameStore.lastError === message) gameStore.lastError = null
    }, 4000)
  })
}
