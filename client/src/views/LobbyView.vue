<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLobbyStore } from '@/stores/lobbyStore'
import { usePlayerStore } from '@/stores/playerStore'
import { useGameStore } from '@/stores/gameStore'
import { useSocket } from '@/composables/useSocket'
import { GamePhase } from '@/constants'

import LobbyWaiting from '@/components/lobby/LobbyWaiting.vue'
import RoleWheelView from '@/views/RoleWheelView.vue'
import ChampionRevealView from '@/views/ChampionRevealView.vue'
import RolesAssignedView from '@/views/RolesAssignedView.vue'
import GameActiveView from '@/views/GameActiveView.vue'
import ResultsInputView from '@/views/ResultsInputView.vue'
import VotingView from '@/views/VotingView.vue'
import FinalScoresView from '@/views/FinalScoresView.vue'

const route = useRoute()
const router = useRouter()
const lobbyStore = useLobbyStore()
const playerStore = usePlayerStore()
const gameStore = useGameStore()
const { emit } = useSocket()

// ─── Live game timer ──────────────────────────────────────────────────────────
const gameElapsedDisplay = ref(null)
let gameTimerInterval = null

onMounted(() => {
  gameTimerInterval = setInterval(() => {
    if (lobbyStore.phase !== GamePhase.LOL_STARTED || !gameStore.lolStartedAt) {
      gameElapsedDisplay.value = null
      return
    }
    const elapsedSec = Math.max(0, Math.floor((Date.now() - gameStore.lolStartedAt) / 1000))
    const m = Math.floor(elapsedSec / 60)
    const s = elapsedSec % 60
    gameElapsedDisplay.value = `${m}:${s.toString().padStart(2, '0')}`
  }, 1000)
})

onUnmounted(() => {
  clearInterval(gameTimerInterval)
})

const isHost = computed(() => playerStore.isHost)

function leaveLobby() {
  emit('lobby:leave', {})
}

function disbandLobby() {
  if (!confirm('Dissoudre le lobby ? Tous les joueurs seront renvoyés au menu principal.')) return
  emit('lobby:disband', {})
}

const phaseComponents = {
  [GamePhase.LOBBY_WAITING]: LobbyWaiting,
  [GamePhase.ROLE_WHEEL]: RoleWheelView,
  [GamePhase.CHAMPION_REVEAL]: ChampionRevealView,
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
        <div class="game-timer-chip" v-if="gameElapsedDisplay">
          <span class="text-muted text-xs">⏱</span>
          <span class="code-value">{{ gameElapsedDisplay }}</span>
        </div>
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
        <div class="header-actions">
          <button class="btn btn-ghost btn-sm leave-btn" @click="leaveLobby" title="Quitter le lobby">
            ↩ Quitter
          </button>
          <button v-if="isHost" class="btn btn-ghost btn-sm disband-btn" @click="disbandLobby" title="Dissoudre le lobby">
            🗑 Dissoudre
          </button>
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

.lobby-code-chip,
.game-timer-chip {
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

.header-actions {
  display: flex;
  gap: 0.4rem;
  flex-shrink: 0;
}

.leave-btn {
  font-size: 0.78rem;
  color: var(--text-secondary);
  border-color: var(--border);
}

.leave-btn:hover:not(:disabled) {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.06) !important;
}

.disband-btn {
  font-size: 0.78rem;
  color: var(--red-light);
  border-color: rgba(192, 57, 43, 0.3);
}

.disband-btn:hover:not(:disabled) {
  background: rgba(192, 57, 43, 0.12) !important;
  border-color: rgba(192, 57, 43, 0.6);
}

.lobby-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}
</style>
