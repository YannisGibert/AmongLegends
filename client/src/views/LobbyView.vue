<script setup>
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLobbyStore } from '@/stores/lobbyStore'
import { usePlayerStore } from '@/stores/playerStore'
import { useSocket } from '@/composables/useSocket'
import { GamePhase } from '@/constants'

import LobbyWaiting from '@/components/lobby/LobbyWaiting.vue'
import RoleWheelView from '@/views/RoleWheelView.vue'
import RolesAssignedView from '@/views/RolesAssignedView.vue'
import GameActiveView from '@/views/GameActiveView.vue'
import ResultsInputView from '@/views/ResultsInputView.vue'
import VotingView from '@/views/VotingView.vue'
import FinalScoresView from '@/views/FinalScoresView.vue'

const route = useRoute()
const router = useRouter()
const lobbyStore = useLobbyStore()
const playerStore = usePlayerStore()
const { emit } = useSocket()

const phaseComponents = {
  [GamePhase.LOBBY_WAITING]: LobbyWaiting,
  [GamePhase.ROLE_WHEEL]: RoleWheelView,
  [GamePhase.ROLES_ASSIGNED]: RolesAssignedView,
  [GamePhase.LOL_STARTED]: GameActiveView,
  [GamePhase.LOL_ENDED]: ResultsInputView,
  [GamePhase.RESULTS_INPUT]: ResultsInputView,
  [GamePhase.VOTING_SELF]: VotingView,
  [GamePhase.VOTING_ENEMY]: VotingView,
  [GamePhase.FINAL_SCORES]: FinalScoresView,
}

const currentComponent = computed(() => {
  return phaseComponents[lobbyStore.phase] || LobbyWaiting
})

const lobbyCode = computed(() => route.params.code)

onMounted(() => {
  // If we don't have a lobby yet (e.g., page refresh), redirect home
  if (!lobbyStore.code) {
    router.push('/')
  }
})

watch(() => lobbyStore.code, (code) => {
  if (!code) router.push('/')
})
</script>

<template>
  <div class="lobby-page">
    <!-- Header bar -->
    <header class="lobby-header">
      <div class="header-left">
        <span class="header-logo text-gold">⚔ Among Legends</span>
        <span class="header-round text-muted text-sm" v-if="lobbyStore.roundNumber > 0">
          Manche {{ lobbyStore.roundNumber }}
        </span>
      </div>
      <div class="header-right">
        <div class="lobby-code-chip">
          <span class="text-muted text-xs">CODE</span>
          <span class="code-value">{{ lobbyStore.code }}</span>
          <button
            class="btn btn-ghost btn-sm copy-btn"
            title="Copier le code"
            @click="navigator.clipboard?.writeText(lobbyStore.code)"
          >
            📋
          </button>
        </div>
        <div class="player-count text-muted text-sm">
          {{ lobbyStore.players.length }} joueur{{ lobbyStore.players.length > 1 ? 's' : '' }}
        </div>
      </div>
    </header>

    <!-- Dynamic phase component -->
    <main class="lobby-main">
      <component :is="currentComponent" />
    </main>
  </div>
</template>

<style scoped>
.lobby-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.lobby-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.5rem;
  background: rgba(10, 14, 35, 0.95);
  border-bottom: 1px solid var(--border);
  backdrop-filter: blur(10px);
  position: sticky;
  top: 0;
  z-index: 100;
  gap: 1rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-logo {
  font-weight: 800;
  font-size: 1.1rem;
  letter-spacing: 0.02em;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.lobby-code-chip {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: var(--blue-panel);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.3rem 0.6rem;
}

.code-value {
  font-weight: 800;
  font-size: 1rem;
  letter-spacing: 0.15em;
  color: var(--gold);
}

.copy-btn {
  padding: 0.1rem 0.3rem;
  font-size: 0.75rem;
}

.lobby-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}
</style>
