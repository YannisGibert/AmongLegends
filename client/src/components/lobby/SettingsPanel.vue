<script setup>
import { ref, watch } from 'vue'
import { useLobbyStore } from '@/stores/lobbyStore'
import { useSocket } from '@/composables/useSocket'

const lobbyStore = useLobbyStore()
const { emit } = useSocket()

// ─── Boolean toggles ────────────────────────────────────────────────────────
const enemyVoting = ref(lobbyStore.settings.enableEnemyVoting)
const symmetricRoles = ref(lobbyStore.settings.symmetricRoles !== false)
const testMode = ref(lobbyStore.settings.testMode === true)
const showTimers = ref(lobbyStore.settings.showTimers === true)
const championDraft = ref(lobbyStore.settings.championDraft === true)

// ─── Number inputs ───────────────────────────────────────────────────────────
const droideMin = ref(lobbyStore.settings.droideMinSeconds ?? 120)
const droideMax = ref(lobbyStore.settings.droideMaxSeconds ?? 600)
const dfMin = ref(lobbyStore.settings.doubleFaceMinSeconds ?? 60)
const dfMax = ref(lobbyStore.settings.doubleFaceMaxSeconds ?? 600)
const championChance = ref(lobbyStore.settings.championDraftChance ?? 100)

// Sync from store when another player's update arrives
watch(() => lobbyStore.settings, (s) => {
  enemyVoting.value = s.enableEnemyVoting
  symmetricRoles.value = s.symmetricRoles !== false
  testMode.value = s.testMode === true
  showTimers.value = s.showTimers === true
  championDraft.value = s.championDraft === true
  droideMin.value = s.droideMinSeconds ?? 120
  droideMax.value = s.droideMaxSeconds ?? 600
  dfMin.value = s.doubleFaceMinSeconds ?? 60
  dfMax.value = s.doubleFaceMaxSeconds ?? 600
  championChance.value = s.championDraftChance ?? 100
}, { deep: true })

function toggle(key, refVal) {
  refVal.value = !refVal.value
  emit('lobby:update_settings', { settings: { [key]: refVal.value } })
}

function updateNum(key, refVal) {
  const v = Number(refVal.value)
  if (!isNaN(v) && v >= 0) {
    emit('lobby:update_settings', { settings: { [key]: v } })
  }
}
</script>

<template>
  <div class="settings-panel card">
    <h3 class="text-gold mb-3">⚙ Paramètres</h3>

    <!-- Rôles symétriques -->
    <div class="setting-row" @click="toggle('symmetricRoles', symmetricRoles)">
      <div class="setting-info">
        <div class="setting-label">Rôles symétriques</div>
        <div class="setting-desc text-muted text-xs">
          Activé : les deux équipes ont la même distribution de rôles.
        </div>
      </div>
      <div class="toggle" :class="{ active: symmetricRoles }"><div class="toggle-knob"></div></div>
    </div>

    <!-- Vote équipe adverse -->
    <div class="setting-row" @click="toggle('enableEnemyVoting', enemyVoting)">
      <div class="setting-info">
        <div class="setting-label">Vote équipe adverse</div>
        <div class="setting-desc text-muted text-xs">
          Après le vote interne, chaque équipe tente de deviner les rôles adverses.
        </div>
      </div>
      <div class="toggle" :class="{ active: enemyVoting }"><div class="toggle-knob"></div></div>
    </div>

    <!-- Mode Test -->
    <div class="setting-row" @click="toggle('testMode', testMode)">
      <div class="setting-info">
        <div class="setting-label">🧪 Mode Test</div>
        <div class="setting-desc text-muted text-xs">
          Active l'ajout de bots et le forçage des rôles par joueur.
        </div>
      </div>
      <div class="toggle" :class="{ active: testMode }"><div class="toggle-knob"></div></div>
    </div>

    <div class="settings-section-title">⏱ Timers</div>

    <!-- Timers visibles -->
    <div class="setting-row" @click="toggle('showTimers', showTimers)">
      <div class="setting-info">
        <div class="setting-label">Timers visibles</div>
        <div class="setting-desc text-muted text-xs">
          Chaque Droide et Double-Face voit le countdown de son prochain événement.
        </div>
      </div>
      <div class="toggle" :class="{ active: showTimers }"><div class="toggle-knob"></div></div>
    </div>

    <!-- Droide timings -->
    <div class="timer-group">
      <div class="timer-label">🤖 Droide — intervalle</div>
      <div class="timer-inputs">
        <div class="timer-input-row">
          <label class="text-muted text-xs">Min (s)</label>
          <input
            type="number" min="10" max="3600"
            class="num-input"
            v-model.number="droideMin"
            @change="updateNum('droideMinSeconds', droideMin)"
          />
        </div>
        <div class="timer-input-row">
          <label class="text-muted text-xs">Max (s)</label>
          <input
            type="number" min="10" max="3600"
            class="num-input"
            v-model.number="droideMax"
            @change="updateNum('droideMaxSeconds', droideMax)"
          />
        </div>
      </div>
    </div>

    <!-- Double Face timings -->
    <div class="timer-group">
      <div class="timer-label">🎲 Double-Face — intervalle</div>
      <div class="timer-inputs">
        <div class="timer-input-row">
          <label class="text-muted text-xs">Min (s)</label>
          <input
            type="number" min="10" max="3600"
            class="num-input"
            v-model.number="dfMin"
            @change="updateNum('doubleFaceMinSeconds', dfMin)"
          />
        </div>
        <div class="timer-input-row">
          <label class="text-muted text-xs">Max (s)</label>
          <input
            type="number" min="10" max="3600"
            class="num-input"
            v-model.number="dfMax"
            @change="updateNum('doubleFaceMaxSeconds', dfMax)"
          />
        </div>
      </div>
    </div>

    <div class="settings-section-title">🏆 Draft Champion LoL</div>

    <!-- Champion Draft toggle -->
    <div class="setting-row" @click="toggle('championDraft', championDraft)">
      <div class="setting-info">
        <div class="setting-label">Draft de champion</div>
        <div class="setting-desc text-muted text-xs">
          Après la roue, un champion LoL aléatoire est assigné à chaque joueur.
        </div>
      </div>
      <div class="toggle" :class="{ active: championDraft }"><div class="toggle-knob"></div></div>
    </div>

    <!-- Champion chance -->
    <div v-if="championDraft" class="timer-group">
      <div class="timer-label">Chance de déclenchement</div>
      <div class="timer-inputs">
        <div class="timer-input-row">
          <label class="text-muted text-xs">%</label>
          <input
            type="number" min="1" max="100"
            class="num-input"
            v-model.number="championChance"
            @change="updateNum('championDraftChance', championChance)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-panel {
  cursor: default;
}

.settings-section-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-top: 0.75rem;
  margin-bottom: 0.25rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border);
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  cursor: pointer;
  padding: 0.5rem 0;
  border-radius: 6px;
  transition: background 0.2s;
}

.setting-row:hover {
  background: rgba(255, 255, 255, 0.03);
}

.setting-row + .setting-row {
  border-top: 1px solid var(--border);
  padding-top: 0.75rem;
  margin-top: 0.25rem;
}

.setting-info {
  flex: 1;
}

.setting-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
}

.setting-desc {
  margin-top: 0.15rem;
  line-height: 1.4;
}

/* Timer groups */
.timer-group {
  padding: 0.5rem 0;
  border-top: 1px solid var(--border);
}

.timer-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 0.4rem;
}

.timer-inputs {
  display: flex;
  gap: 1.5rem;
}

.timer-input-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.num-input {
  width: 70px;
  background: var(--blue-dark);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 0.88rem;
  padding: 0.3rem 0.5rem;
  text-align: center;
}

.num-input:focus {
  outline: none;
  border-color: var(--gold);
}

/* Toggle switch */
.toggle {
  width: 44px;
  height: 24px;
  background: var(--blue-dark);
  border-radius: 12px;
  border: 1px solid var(--border);
  position: relative;
  transition: all 0.2s;
  flex-shrink: 0;
}

.toggle.active {
  background: var(--gold-dark);
  border-color: var(--gold);
}

.toggle-knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--text-muted);
  transition: all 0.2s;
}

.toggle.active .toggle-knob {
  transform: translateX(20px);
  background: var(--gold);
}
</style>
