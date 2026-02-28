<script setup>
import { computed } from 'vue'
import { useLobbyStore } from '@/stores/lobbyStore'
import { usePlayerStore } from '@/stores/playerStore'
import { useSocket } from '@/composables/useSocket'
import TeamSlot from './TeamSlot.vue'
import SettingsPanel from './SettingsPanel.vue'

const lobbyStore = useLobbyStore()
const playerStore = usePlayerStore()
const { emit } = useSocket()

const isHost = computed(() => playerStore.isHost)

const canStart = computed(() => {
  const e1 = lobbyStore.equipe1Players.length
  const e2 = lobbyStore.equipe2Players.length
  return e1 === 5 && (e2 === 0 || e2 === 5)
})

const startTooltip = computed(() => {
  if (!canStart.value) {
    return "L'Équipe 1 doit avoir 5 joueurs. L'Équipe 2 doit avoir 5 ou 0 joueurs."
  }
  return ''
})

const totalBots = computed(() =>
  lobbyStore.players.filter((p) => p.isBot).length
)

function startGame() {
  emit('game:start', {})
}

function addBot() {
  emit('lobby:add_bot', {})
}
</script>

<template>
  <div class="lobby-waiting">
    <div class="lobby-layout">
      <!-- Left: Teams -->
      <div class="teams-section">
        <div class="teams-grid">
          <TeamSlot team="equipe1" label="Équipe 1" :players="lobbyStore.equipe1Players" />
          <TeamSlot team="equipe2" label="Équipe 2" :players="lobbyStore.equipe2Players" />
        </div>
        <div class="spectateurs-row">
          <TeamSlot team="spectateur" label="Salle d'attente" :players="lobbyStore.spectateurs" />
        </div>
      </div>

      <!-- Right: Controls -->
      <div class="controls-section">
        <!-- Settings (host only) -->
        <SettingsPanel v-if="isHost" />

        <!-- Lobby info -->
        <div class="card info-card">
          <h3 class="text-gold mb-2">📋 Comment démarrer</h3>
          <ol class="instructions-list">
            <li>Partagez le <strong>code du lobby</strong> à vos amis</li>
            <li>Assignez <strong>5 joueurs</strong> par équipe</li>
            <li>L'host lance la partie</li>
          </ol>
          <div class="team-counts mt-4">
            <div class="team-count" :class="{ ok: lobbyStore.equipe1Players.length === 5 }">
              <span>Équipe 1</span>
              <span class="count-badge">{{ lobbyStore.equipe1Players.length }}/5</span>
            </div>
            <div class="team-count" :class="{ ok: lobbyStore.equipe2Players.length === 5 || lobbyStore.equipe2Players.length === 0 }">
              <span>Équipe 2</span>
              <span class="count-badge">{{ lobbyStore.equipe2Players.length }}/5</span>
            </div>
          </div>
        </div>

        <!-- Bot section (host only, testing) -->
        <div v-if="isHost" class="card bot-card">
          <div class="bot-header">
            <h3 class="text-sm" style="color: var(--text-secondary)">🤖 Mode test</h3>
            <span v-if="totalBots > 0" class="badge badge-purple">{{ totalBots }} bot{{ totalBots > 1 ? 's' : '' }}</span>
          </div>
          <p class="text-muted text-xs mb-2">
            Les bots remplissent les équipes et votent aléatoirement.
          </p>
          <button
            class="btn btn-ghost btn-sm btn-block bot-btn"
            :disabled="totalBots >= 10"
            @click="addBot"
          >
            + Ajouter un bot
          </button>
        </div>

        <!-- Start button (host only) -->
        <div v-if="isHost" class="start-section">
          <button
            class="btn btn-primary btn-block btn-lg animate-glow"
            :disabled="!canStart"
            :title="startTooltip"
            @click="startGame"
          >
            🚀 Lancer la partie
          </button>
          <p v-if="!canStart" class="text-muted text-sm text-center mt-2">
            {{ startTooltip }}
          </p>
        </div>
        <div v-else class="waiting-host card text-center">
          <div class="animate-pulse">⏳</div>
          <p class="text-secondary mt-2">En attente de l'host...</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lobby-waiting {
  flex: 1;
  padding: 1.5rem;
}

.lobby-layout {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 1.5rem;
  max-width: 1100px;
  margin: 0 auto;
}

.teams-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.teams-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.controls-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.info-card {
  background: var(--blue-panel);
}

.instructions-list {
  padding-left: 1.2rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.team-counts {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.team-count {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
  font-size: 0.88rem;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.team-count.ok {
  background: rgba(39, 174, 96, 0.12);
  color: var(--green-light);
}

.count-badge {
  font-weight: 700;
}

/* Bot card */
.bot-card {
  background: rgba(142, 68, 173, 0.08);
  border-color: rgba(142, 68, 173, 0.25);
  padding: 0.9rem;
}

.bot-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.4rem;
}

.bot-btn {
  border-color: rgba(142, 68, 173, 0.35);
  color: #c39bd3;
}

.bot-btn:hover:not(:disabled) {
  background: rgba(142, 68, 173, 0.12);
  border-color: rgba(142, 68, 173, 0.6);
}

.waiting-host {
  padding: 1.5rem;
  font-size: 1.5rem;
}

@media (max-width: 768px) {
  .lobby-layout {
    grid-template-columns: 1fr;
  }
  .teams-grid {
    grid-template-columns: 1fr;
  }
}
</style>
