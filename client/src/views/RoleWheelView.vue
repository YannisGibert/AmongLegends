<script setup>
import { ref, computed } from 'vue'
import { useLobbyStore } from '@/stores/lobbyStore'
import { usePlayerStore } from '@/stores/playerStore'
import { useSocket } from '@/composables/useSocket'
import { LOL_ROLE_INFO } from '@/constants'

const lobbyStore = useLobbyStore()
const playerStore = usePlayerStore()
const { emit } = useSocket()

const isHost = computed(() => playerStore.isHost)
const spinning = ref(false)
const revealed = ref(false)

function spin() {
  if (spinning.value) return
  spinning.value = true
  revealed.value = false
  // Spin for 2 seconds then reveal
  setTimeout(() => {
    spinning.value = false
    revealed.value = true
  }, 2500)
}

function respin() {
  emit('game:respin_lol_roles', {})
  revealed.value = false
  spinning.value = false
}

function confirmAndContinue() {
  emit('game:confirm_roles', {})
}

const equipe1 = computed(() => lobbyStore.equipe1Players)
const equipe2 = computed(() => lobbyStore.equipe2Players)
const hasEquipe2 = computed(() => equipe2.value.length > 0)
</script>

<template>
  <div class="wheel-view">
    <div class="wheel-content animate-fade-in">
      <h2 class="text-gold text-center mb-2">🎯 Attribution des rôles LoL</h2>
      <p class="text-secondary text-center text-sm mb-6">
        La roue attribue les rôles League of Legends à chaque joueur
      </p>

      <!-- Wheel animation area -->
      <div class="wheel-area" @click="isHost && !revealed && !spinning && spin()">
        <div class="wheel-ring" :class="{ spinning }">
          <div
            v-for="(role, key) in LOL_ROLE_INFO"
            :key="key"
            class="wheel-segment"
            :style="{ '--color': role.color }"
          >
            <span class="wheel-emoji">{{ role.emoji }}</span>
            <span class="wheel-role-name">{{ key }}</span>
          </div>
        </div>
        <div v-if="!spinning && !revealed" class="wheel-center">
          <span class="text-gold text-sm">Cliquer pour lancer</span>
        </div>
        <div v-else-if="spinning" class="wheel-center">
          <span class="animate-spin" style="font-size: 2rem">⚙</span>
        </div>
        <div v-else class="wheel-center">
          <span style="font-size: 1.5rem">✓</span>
        </div>
      </div>

      <!-- Results -->
      <Transition name="results">
        <div v-if="revealed" class="results-section">
          <!-- Equipe 1 -->
          <div class="team-results">
            <h3 class="team-title team-blue-title">🔵 Équipe 1</h3>
            <div class="role-grid">
              <div
                v-for="player in equipe1"
                :key="player.id"
                class="role-chip"
                :style="{ '--role-color': LOL_ROLE_INFO[player.lolRole]?.color || '#888' }"
              >
                <span class="role-emoji">{{ LOL_ROLE_INFO[player.lolRole]?.emoji || '?' }}</span>
                <div class="role-details">
                  <span class="role-player">{{ player.username }}</span>
                  <span class="role-name">{{ player.lolRole || '?' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Equipe 2 -->
          <div v-if="hasEquipe2" class="team-results">
            <h3 class="team-title team-red-title">🔴 Équipe 2</h3>
            <div class="role-grid">
              <div
                v-for="player in equipe2"
                :key="player.id"
                class="role-chip"
                :style="{ '--role-color': LOL_ROLE_INFO[player.lolRole]?.color || '#888' }"
              >
                <span class="role-emoji">{{ LOL_ROLE_INFO[player.lolRole]?.emoji || '?' }}</span>
                <div class="role-details">
                  <span class="role-player">{{ player.username }}</span>
                  <span class="role-name">{{ player.lolRole || '?' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Confirm button (host only) -->
          <div v-if="isHost" class="confirm-area">
            <button class="btn btn-ghost btn-lg" @click="respin">
              🎲 Relancer
            </button>
            <button class="btn btn-primary btn-lg animate-glow" @click="confirmAndContinue">
              ✅ Confirmer et attribuer les rôles secrets
            </button>
          </div>
          <div v-else class="waiting-host card text-center">
            <p class="text-secondary">En attente de l'host pour confirmer...</p>
          </div>
        </div>
      </Transition>

      <!-- Spin button (host only, before reveal) -->
      <div v-if="isHost && !revealed" class="spin-controls">
        <button
          class="btn btn-primary btn-lg"
          :disabled="spinning"
          @click="spin"
        >
          {{ spinning ? '🎲 Attribution en cours...' : '🎲 Lancer la roue' }}
        </button>
      </div>
      <div v-else-if="!isHost && !revealed" class="waiting-host card text-center">
        <p class="text-secondary animate-pulse">En attente de l'host pour lancer la roue...</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wheel-view {
  flex: 1;
  padding: 2rem;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

.wheel-content {
  width: 100%;
  max-width: 700px;
}

.wheel-area {
  display: flex;
  justify-content: center;
  margin: 1.5rem 0;
  cursor: pointer;
  position: relative;
}

.wheel-ring {
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: conic-gradient(
    #e74c3c 0deg 72deg,
    #27ae60 72deg 144deg,
    #f1c40f 144deg 216deg,
    #3498db 216deg 288deg,
    #8e44ad 288deg 360deg
  );
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  position: relative;
  border: 3px solid var(--gold-dark);
  box-shadow: 0 0 30px rgba(200, 155, 60, 0.3);
  transition: transform 0.3s;
}

.wheel-ring.spinning {
  animation: wheelSpin 2.5s cubic-bezier(0.17, 0.67, 0.21, 0.99) forwards;
}

@keyframes wheelSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(1440deg); }
}

.wheel-segment {
  position: absolute;
  display: none;
}

.wheel-center {
  position: absolute;
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: var(--blue-dark);
  border: 3px solid var(--gold);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--gold);
  font-weight: 700;
  text-align: center;
  font-size: 0.8rem;
  z-index: 2;
}

.results-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-top: 1.5rem;
}

.team-results {
  background: var(--blue-panel);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 1.25rem;
}

.team-title {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
}

.team-blue-title { color: var(--equipe1-light); }
.team-red-title { color: var(--equipe2-light); }

.role-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.role-chip {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  border-left: 3px solid var(--role-color, #888);
}

.role-emoji {
  font-size: 1.3rem;
  flex-shrink: 0;
}

.role-details {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.role-player {
  font-weight: 600;
  font-size: 0.9rem;
}

.role-name {
  font-size: 0.78rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.confirm-area {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.5rem;
  flex-wrap: wrap;
}

.spin-controls {
  display: flex;
  justify-content: center;
  margin-top: 1rem;
}

.waiting-host {
  padding: 1rem;
  text-align: center;
}

.results-enter-active { animation: fadeIn 0.5s ease; }
.results-leave-active { animation: fadeIn 0.3s ease reverse; }
</style>
