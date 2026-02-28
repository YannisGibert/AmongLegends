import { defineStore } from 'pinia'
import { ref } from 'vue'

export const usePlayerStore = defineStore('player', () => {
  const id = ref(null)
  const username = ref('')
  const isHost = ref(false)
  const team = ref(null)

  // Private - only this player knows their secret role
  const secretRole = ref(null)
  const romeoPartnerId = ref(null)
  const romeoPartnerName = ref(null)
  const doubleFaceMode = ref(null) // 'allie' | 'imposteur' | null

  function setIdentity(player) {
    id.value = player.id
    username.value = player.username
    isHost.value = player.isHost
    team.value = player.team
  }

  function setSecretRole(roleDTO) {
    secretRole.value = roleDTO.role
    romeoPartnerId.value = roleDTO.romeoPartnerId || null
    romeoPartnerName.value = roleDTO.romeoPartnerName || null
  }

  function syncFromLobby(players) {
    const me = players.find((p) => p.id === id.value)
    if (me) {
      isHost.value = me.isHost
      team.value = me.team
    }
  }

  function reset() {
    secretRole.value = null
    romeoPartnerId.value = null
    romeoPartnerName.value = null
    doubleFaceMode.value = null
  }

  return {
    id,
    username,
    isHost,
    team,
    secretRole,
    romeoPartnerId,
    romeoPartnerName,
    doubleFaceMode,
    setIdentity,
    setSecretRole,
    syncFromLobby,
    reset,
  }
})
