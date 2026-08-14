<script setup>
import { computed, watch, ref, onMounted, onUnmounted } from 'vue'
import { useLobbyStore } from '@/stores/lobbyStore'
import { usePlayerStore } from '@/stores/playerStore'
import { useGameStore } from '@/stores/gameStore'
import { useSocket } from '@/composables/useSocket'
import { useAudio } from '@/composables/useAudio'
import { ROLE_INFO, LOL_ROLE_INFO } from '@/constants'

const lobbyStore = useLobbyStore()
const playerStore = usePlayerStore()
const gameStore = useGameStore()
const { emit: socketEmit } = useSocket()
const { speak, ting, isMuted, toggleMute } = useAudio()

const isHost = computed(() => playerStore.isHost)
const myRole = computed(() => playerStore.secretRole)
const roleInfo = computed(() => myRole.value ? ROLE_INFO[myRole.value] : null)
const isDroide = computed(() => myRole.value === 'Droide')
const isDoubleFace = computed(() => myRole.value === 'Double-Face')
const doubleFaceMode = computed(() => playerStore.doubleFaceMode)

const myTeam = computed(() => playerStore.team)
const myTeamPlayers = computed(() => {
  if (myTeam.value === 'equipe1') return lobbyStore.equipe1Players
  if (myTeam.value === 'equipe2') return lobbyStore.equipe2Players
  return []
})

// ─── God-mode panel (host, spectating only) ──────────────────────────────────
const isSpectatingHost = computed(() => isHost.value && myTeam.value === 'spectateur')
const selectedDroideId = ref('')
const customQuestText = ref('')

function teamLabel(team) {
  return team === 'equipe1' ? 'Éq. 1' : 'Éq. 2'
}

function hostSetDoubleFaceMode(targetPlayerId, mode) {
  socketEmit('doubleFace:host_set_mode', { targetPlayerId, mode })
}

function sendCustomQuest() {
  if (!selectedDroideId.value || !customQuestText.value.trim()) return
  socketEmit('game:host_set_droide_quest', { targetPlayerId: selectedDroideId.value, text: customQuestText.value.trim() })
  customQuestText.value = ''
}

// ─── Timer countdowns ─────────────────────────────────────────────────────────
const droideSecondsLeft = ref(null)
const dfSecondsLeft = ref(null)

function formatTimer(sec) {
  if (sec == null || sec < 0) return null
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

const droideTimerDisplay = computed(() => formatTimer(droideSecondsLeft.value))
const dfTimerDisplay = computed(() => formatTimer(dfSecondsLeft.value))

let timerInterval = null

onMounted(() => {
  if (isSpectatingHost.value) socketEmit('game:host_control_targets', {})

  timerInterval = setInterval(() => {
    const now = Date.now()
    if (gameStore.droideTimerEnd) {
      droideSecondsLeft.value = Math.max(0, (gameStore.droideTimerEnd - now) / 1000)
    } else {
      droideSecondsLeft.value = null
    }
    if (playerStore.doubleFaceTimerEnd) {
      dfSecondsLeft.value = Math.max(0, (playerStore.doubleFaceTimerEnd - now) / 1000)
    } else {
      dfSecondsLeft.value = null
    }
  }, 500)
})

onUnmounted(() => {
  clearInterval(timerInterval)
})

// Read the quest aloud when a new Droide command arrives.
// immediate:true because the socket event can land before this component
// mounts (it's set on a global store), so a plain watch would miss the first one.
watch(() => gameStore.currentCommand, (cmd) => {
  if (!isDroide.value || !cmd) return
  ting()
  if (cmd.text) speak(cmd.text)
}, { immediate: true })

// Notify when the Double Face win objective flips
watch(() => doubleFaceMode.value, (mode) => {
  if (isDoubleFace.value && mode) ting()
}, { immediate: true })

function endLol() {
  socketEmit('game:lol_ended', {})
}
</script>

<template>
  <div class="game-active">
    <div class="game-layout">

      <!-- Main content -->
      <div class="game-main">

        <!-- Role reminder card -->
        <div class="role-reminder card" :style="{ '--role-color': roleInfo?.color }">
          <div class="reminder-header">
            <span class="reminder-label text-muted text-xs">VOTRE RÔLE SECRET</span>
            <button class="btn btn-ghost btn-sm" @click="toggleMute" :title="isMuted ? 'Activer le son' : 'Couper le son'">
              {{ isMuted ? '🔇' : '🔊' }}
            </button>
          </div>
          <div class="reminder-body">
            <span class="reminder-emoji">{{ roleInfo?.emoji }}</span>
            <div>
              <div class="reminder-name" :style="{ color: roleInfo?.color }">{{ myRole }}</div>
              <div class="reminder-obj text-secondary text-sm">{{ roleInfo?.objective }}</div>
            </div>
          </div>

          <!-- Romeo partner -->
          <div v-if="myRole === 'Romeo' && playerStore.romeoPartnerName" class="romeo-info mt-2">
            💘 Âme sœur : <strong>{{ playerStore.romeoPartnerName }}</strong>
          </div>
        </div>

        <!-- Double Face state -->
        <Transition name="state">
          <div
            v-if="isDoubleFace && doubleFaceMode"
            class="double-face-card"
            :class="doubleFaceMode === 'allie' ? 'mode-allie' : 'mode-imposteur'"
          >
            <div class="df-icon">{{ doubleFaceMode === 'allie' ? '🤝' : '🎭' }}</div>
            <div class="df-label">MODE ACTUEL</div>
            <div class="df-mode">{{ doubleFaceMode === 'allie' ? 'ALLIÉ' : 'IMPOSTEUR' }}</div>
            <div class="df-desc text-sm">
              {{ doubleFaceMode === 'allie'
                ? 'Tu dois GAGNER la partie'
                : 'Tu dois PERDRE la partie' }}
            </div>
            <div v-if="dfTimerDisplay" class="df-timer text-xs">
              ⏱ Prochain changement dans <strong>{{ dfTimerDisplay }}</strong>
            </div>
          </div>
        </Transition>

        <!-- Droide command -->
        <Transition name="command">
          <div v-if="isDroide && gameStore.currentCommand" class="droide-command card">
            <div class="command-header text-muted text-xs">📡 ORDRE REÇU</div>
            <div class="command-text">{{ gameStore.currentCommand.text }}</div>
            <div v-if="droideTimerDisplay" class="droide-timer text-xs">
              ⏱ Prochain ordre dans <strong>{{ droideTimerDisplay }}</strong>
            </div>
          </div>
        </Transition>

        <div v-if="isDroide && !gameStore.currentCommand" class="droide-waiting card text-center">
          <p class="text-secondary animate-pulse">📡 En attente d'un ordre...</p>
        </div>

        <!-- Team panel -->
        <div class="team-panel card">
          <h3 class="text-secondary text-xs mb-2">VOTRE ÉQUIPE</h3>
          <div class="team-list">
            <div
              v-for="player in myTeamPlayers"
              :key="player.id"
              class="team-member"
              :class="{ 'is-me': player.id === playerStore.id }"
            >
              <span class="lol-badge" :style="{ background: LOL_ROLE_INFO[player.lolRole]?.color + '33', color: LOL_ROLE_INFO[player.lolRole]?.color }">
                {{ LOL_ROLE_INFO[player.lolRole]?.emoji }} {{ player.lolRole }}
              </span>
              <span class="member-name">{{ player.username }}</span>
              <span v-if="player.id === playerStore.id" class="badge badge-gold" style="font-size: 0.6rem">Vous</span>
              <span v-if="player.cumulativeScore != null" class="member-score">{{ player.cumulativeScore }}pts</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Host controls panel -->
      <div v-if="isHost" class="host-panel card">
        <h3 class="text-gold mb-4">🎮 Contrôles Host</h3>

        <!-- End game -->
        <div class="host-section">
          <p class="text-secondary text-sm mb-2">Fin de la partie LoL :</p>
          <button class="btn btn-danger btn-block" @click="endLol">
            🏁 La partie LoL est terminée
          </button>
        </div>

        <!-- God-mode: spectating host only -->
        <div v-if="isSpectatingHost" class="host-section god-mode-section">
          <p class="text-gold text-sm mb-2">🕹 Contrôle en direct</p>

          <p class="text-secondary text-xs mb-2">🎭 Forcer un Double-Face :</p>
          <div v-if="gameStore.hostControlTargets.doubleFaces.length === 0" class="text-muted text-xs mb-3">
            Aucun Double-Face dans cette partie.
          </div>
          <div
            v-for="df in gameStore.hostControlTargets.doubleFaces"
            :key="df.id"
            class="god-mode-row"
          >
            <span class="god-mode-name">{{ df.username }} <span class="text-muted text-xs">({{ teamLabel(df.team) }})</span></span>
            <div class="god-mode-actions">
              <button class="btn btn-ghost btn-sm" @click="hostSetDoubleFaceMode(df.id, 'allie')">Allié</button>
              <button class="btn btn-ghost btn-sm" @click="hostSetDoubleFaceMode(df.id, 'imposteur')">Imposteur</button>
            </div>
          </div>

          <p class="text-secondary text-xs mt-3 mb-2">🤖 Donner une quête à un Droide :</p>
          <div v-if="gameStore.hostControlTargets.droides.length === 0" class="text-muted text-xs">
            Aucun Droide dans cette partie.
          </div>
          <template v-else>
            <select v-model="selectedDroideId" class="form-select mb-2">
              <option value="">Choisir un Droide...</option>
              <option v-for="d in gameStore.hostControlTargets.droides" :key="d.id" :value="d.id">
                {{ d.username }} ({{ teamLabel(d.team) }})
              </option>
            </select>
            <textarea
              v-if="selectedDroideId"
              v-model="customQuestText"
              class="god-mode-textarea"
              placeholder="Écris la nouvelle quête..."
              rows="3"
            ></textarea>
            <button
              v-if="selectedDroideId"
              class="btn btn-primary btn-sm btn-block mt-2"
              :disabled="!customQuestText.trim()"
              @click="sendCustomQuest"
            >
              📡 Envoyer la quête
            </button>
          </template>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.game-active {
  flex: 1;
  padding: 1.5rem;
}

.game-layout {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 1.5rem;
  max-width: 900px;
  margin: 0 auto;
  align-items: start;
}

.game-main {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Role reminder */
.role-reminder {
  border-color: var(--role-color, var(--gold));
  background: var(--blue-card);
}

.reminder-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.reminder-label {
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.reminder-body {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.reminder-emoji { font-size: 2rem; }
.reminder-name { font-size: 1.3rem; font-weight: 700; }
.romeo-info { font-size: 0.88rem; color: var(--text-secondary); }

/* Double Face */
.double-face-card {
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  border: 2px solid;
  animation: bounceIn 0.4s ease;
}

.mode-allie {
  background: rgba(26, 107, 224, 0.15);
  border-color: var(--equipe1-light);
  color: var(--equipe1-light);
}

.mode-imposteur {
  background: rgba(192, 57, 43, 0.15);
  border-color: var(--equipe2-light);
  color: var(--equipe2-light);
}

.df-icon { font-size: 2.5rem; margin-bottom: 0.5rem; }
.df-label { font-size: 0.7rem; letter-spacing: 0.1em; opacity: 0.7; }
.df-mode { font-size: 2rem; font-weight: 900; letter-spacing: 0.1em; }
.df-desc { color: inherit; opacity: 0.8; margin-top: 0.25rem; }
.df-timer { opacity: 0.65; margin-top: 0.5rem; }

/* Droide command */
.droide-command {
  border-color: #3498db;
  background: rgba(52, 152, 219, 0.1);
}

.command-header {
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.command-text {
  font-size: 1.5rem;
  font-weight: 800;
  color: #4d9fff;
}

.droide-timer { color: #4d9fff; opacity: 0.7; margin-top: 0.5rem; }

.droide-waiting { padding: 1rem; }

/* Team panel */
.team-panel { background: var(--blue-panel); }

.team-list {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.team-member {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.5rem;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.03);
}

.team-member.is-me {
  background: rgba(200, 155, 60, 0.1);
}

.lol-badge {
  padding: 0.15em 0.5em;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  flex-shrink: 0;
}

.member-name { font-size: 0.88rem; flex: 1; }
.member-score { font-size: 0.65rem; font-weight: 700; color: var(--gold); flex-shrink: 0; }

/* Host panel */
.host-panel {
  background: var(--blue-panel);
  position: sticky;
  top: 80px;
}

.host-section { }

.god-mode-section {
  border-top: 1px solid var(--border);
  padding-top: 1rem;
  margin-top: 0.5rem;
}

.god-mode-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.4rem 0;
  border-bottom: 1px solid var(--border);
}

.god-mode-name {
  font-size: 0.85rem;
  font-weight: 600;
}

.god-mode-actions {
  display: flex;
  gap: 0.3rem;
  flex-shrink: 0;
}

.god-mode-textarea {
  width: 100%;
  background: var(--blue-dark);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 0.85rem;
  font-family: inherit;
  padding: 0.5rem;
  resize: vertical;
}

.god-mode-textarea:focus {
  outline: none;
  border-color: var(--gold);
}

/* Transitions */
.state-enter-active, .state-leave-active { transition: all 0.4s ease; }
.state-enter-from, .state-leave-to { opacity: 0; transform: scale(0.9); }

.command-enter-active, .command-leave-active { transition: all 0.3s ease; }
.command-enter-from, .command-leave-to { opacity: 0; transform: translateY(-10px); }

@media (max-width: 768px) {
  .game-layout {
    grid-template-columns: 1fr;
  }
  .host-panel {
    position: static;
    order: -1;
  }
}
</style>
