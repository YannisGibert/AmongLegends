import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { usePlayerStore } from './playerStore'

export const useLobbyStore = defineStore('lobby', () => {
  const code = ref(null)
  const phase = ref(null)
  const settings = ref({ enableEnemyVoting: false, playerCount: 10 })
  const forcedRoles = ref({}) // { [playerId]: roleName } — testMode only
  const players = ref([]) // array of PlayerDTO (no secretRoles)
  const roundNumber = ref(0)
  const hostId = ref(null)

  const equipe1Players = computed(() => players.value.filter((p) => p.team === 'equipe1'))
  const equipe2Players = computed(() => players.value.filter((p) => p.team === 'equipe2'))
  const spectateurs = computed(() => players.value.filter((p) => p.team === 'spectateur'))

  const hostPlayer = computed(() => players.value.find((p) => p.isHost))

  const currentPlayer = computed(() => {
    const playerStore = usePlayerStore()
    return players.value.find((p) => p.id === playerStore.id)
  })

  function updateLobby(lobbyDTO) {
    code.value = lobbyDTO.code
    phase.value = lobbyDTO.phase
    settings.value = lobbyDTO.settings
    forcedRoles.value = lobbyDTO.forcedRoles || {}
    players.value = lobbyDTO.players
    roundNumber.value = lobbyDTO.roundNumber
    hostId.value = lobbyDTO.hostId

    // Sync player store's host status and team
    const playerStore = usePlayerStore()
    playerStore.syncFromLobby(lobbyDTO.players)
  }

  function reset() {
    code.value = null
    phase.value = null
    settings.value = { enableEnemyVoting: false, playerCount: 10 }
    forcedRoles.value = {}
    players.value = []
    roundNumber.value = 0
    hostId.value = null
  }

  return {
    code,
    phase,
    settings,
    forcedRoles,
    players,
    roundNumber,
    hostId,
    equipe1Players,
    equipe2Players,
    spectateurs,
    hostPlayer,
    currentPlayer,
    updateLobby,
    reset,
  }
})
