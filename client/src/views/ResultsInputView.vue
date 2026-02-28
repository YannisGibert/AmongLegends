<script setup>
import { ref, computed } from 'vue'
import { useLobbyStore } from '@/stores/lobbyStore'
import { usePlayerStore } from '@/stores/playerStore'
import { useSocket } from '@/composables/useSocket'

const lobbyStore = useLobbyStore()
const playerStore = usePlayerStore()
const { emit } = useSocket()

const isHost = computed(() => playerStore.isHost)
const equipe1 = computed(() => lobbyStore.equipe1Players)
const equipe2 = computed(() => lobbyStore.equipe2Players)
const hasEquipe2 = computed(() => equipe2.value.length > 0)

const winner = ref('')
const equipe1Stats = ref({ mostKills: '', mostDeaths: '', mostDamage: '', mostAssists: '' })
const equipe2Stats = ref({ mostKills: '', mostDeaths: '', mostDamage: '', mostAssists: '' })

const canSubmit = computed(() => {
  if (!winner.value) return false
  const e1ok = Object.values(equipe1Stats.value).every(v => v !== '')
  if (!e1ok) return false
  if (hasEquipe2.value) {
    const e2ok = Object.values(equipe2Stats.value).every(v => v !== '')
    if (!e2ok) return false
  }
  return true
})

function submit() {
  if (!canSubmit.value) return
  emit('results:submit', {
    winner: winner.value,
    equipe1: equipe1Stats.value,
    equipe2: hasEquipe2.value ? equipe2Stats.value : {},
  })
}
</script>

<template>
  <div class="results-view">
    <div class="results-content animate-fade-in">
      <h2 class="text-gold text-center mb-2">🏁 Résultats de la partie</h2>
      <p class="text-secondary text-center text-sm mb-6">
        {{ isHost ? 'Saisissez les résultats de la partie LoL' : 'L\'host est en train de saisir les résultats...' }}
      </p>

      <div v-if="isHost" class="results-form">
        <!-- Winner -->
        <div class="card mb-4">
          <h3 class="mb-3">🏆 Équipe gagnante</h3>
          <div class="winner-options">
            <button
              class="winner-btn"
              :class="{ selected: winner === 'equipe1' }"
              @click="winner = 'equipe1'"
            >
              🔵 Équipe 1 a gagné
            </button>
            <button
              v-if="hasEquipe2"
              class="winner-btn"
              :class="{ selected: winner === 'equipe2' }"
              @click="winner = 'equipe2'"
            >
              🔴 Équipe 2 a gagné
            </button>
          </div>
        </div>

        <!-- Equipe 1 stats -->
        <div class="card mb-4">
          <h3 class="team-title team-blue mb-3">🔵 Équipe 1 — Performance individuelle</h3>
          <div class="stats-grid">
            <div class="form-group">
              <label class="form-label">⚔ Plus de kills</label>
              <select v-model="equipe1Stats.mostKills" class="form-select">
                <option value="">— Choisir —</option>
                <option v-for="p in equipe1" :key="p.id" :value="p.id">{{ p.username }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">💀 Plus de morts</label>
              <select v-model="equipe1Stats.mostDeaths" class="form-select">
                <option value="">— Choisir —</option>
                <option v-for="p in equipe1" :key="p.id" :value="p.id">{{ p.username }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">💥 Plus de dégâts</label>
              <select v-model="equipe1Stats.mostDamage" class="form-select">
                <option value="">— Choisir —</option>
                <option v-for="p in equipe1" :key="p.id" :value="p.id">{{ p.username }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">🤝 Plus d'assists</label>
              <select v-model="equipe1Stats.mostAssists" class="form-select">
                <option value="">— Choisir —</option>
                <option v-for="p in equipe1" :key="p.id" :value="p.id">{{ p.username }}</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Equipe 2 stats -->
        <div v-if="hasEquipe2" class="card mb-6">
          <h3 class="team-title team-red mb-3">🔴 Équipe 2 — Performance individuelle</h3>
          <div class="stats-grid">
            <div class="form-group">
              <label class="form-label">⚔ Plus de kills</label>
              <select v-model="equipe2Stats.mostKills" class="form-select">
                <option value="">— Choisir —</option>
                <option v-for="p in equipe2" :key="p.id" :value="p.id">{{ p.username }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">💀 Plus de morts</label>
              <select v-model="equipe2Stats.mostDeaths" class="form-select">
                <option value="">— Choisir —</option>
                <option v-for="p in equipe2" :key="p.id" :value="p.id">{{ p.username }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">💥 Plus de dégâts</label>
              <select v-model="equipe2Stats.mostDamage" class="form-select">
                <option value="">— Choisir —</option>
                <option v-for="p in equipe2" :key="p.id" :value="p.id">{{ p.username }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">🤝 Plus d'assists</label>
              <select v-model="equipe2Stats.mostAssists" class="form-select">
                <option value="">— Choisir —</option>
                <option v-for="p in equipe2" :key="p.id" :value="p.id">{{ p.username }}</option>
              </select>
            </div>
          </div>
        </div>

        <button
          class="btn btn-primary btn-block btn-lg"
          :disabled="!canSubmit"
          @click="submit"
        >
          ➡ Passer aux votes
        </button>
      </div>

      <div v-else class="waiting-host card text-center" style="padding: 3rem;">
        <div style="font-size: 3rem; margin-bottom: 1rem;">📊</div>
        <p class="text-secondary animate-pulse">L'host saisit les résultats de la partie...</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.results-view {
  flex: 1;
  padding: 2rem;
  display: flex;
  justify-content: center;
}

.results-content {
  width: 100%;
  max-width: 600px;
}

.winner-options {
  display: flex;
  gap: 1rem;
}

.winner-btn {
  flex: 1;
  padding: 1rem;
  border-radius: 8px;
  border: 2px solid var(--border);
  background: var(--blue-dark);
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.winner-btn:hover {
  border-color: var(--gold);
}

.winner-btn.selected {
  border-color: var(--gold);
  background: rgba(200, 155, 60, 0.15);
  color: var(--gold);
}

.team-title { font-size: 0.95rem; font-weight: 700; }
.team-blue { color: var(--equipe1-light); }
.team-red { color: var(--equipe2-light); }

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.waiting-host { background: var(--blue-panel); }

@media (max-width: 480px) {
  .stats-grid { grid-template-columns: 1fr; }
  .winner-options { flex-direction: column; }
}
</style>
