<script setup>
import { ref, watch } from 'vue'
import { useLobbyStore } from '@/stores/lobbyStore'
import { useSocket } from '@/composables/useSocket'

const lobbyStore = useLobbyStore()
const { emit } = useSocket()

const enemyVoting = ref(lobbyStore.settings.enableEnemyVoting)
const symmetricRoles = ref(lobbyStore.settings.symmetricRoles !== false)

watch(() => lobbyStore.settings.enableEnemyVoting, (v) => { enemyVoting.value = v })
watch(() => lobbyStore.settings.symmetricRoles, (v) => { symmetricRoles.value = v !== false })

function toggleEnemyVoting() {
  enemyVoting.value = !enemyVoting.value
  emit('lobby:update_settings', { settings: { enableEnemyVoting: enemyVoting.value } })
}

function toggleSymmetricRoles() {
  symmetricRoles.value = !symmetricRoles.value
  emit('lobby:update_settings', { settings: { symmetricRoles: symmetricRoles.value } })
}
</script>

<template>
  <div class="settings-panel card">
    <h3 class="text-gold mb-3">⚙ Paramètres</h3>

    <div class="setting-row" @click="toggleSymmetricRoles">
      <div class="setting-info">
        <div class="setting-label">Rôles symétriques</div>
        <div class="setting-desc text-muted text-xs">
          Activé : les deux équipes ont la même distribution de rôles. Désactivé : full random, doublons possibles.
        </div>
      </div>
      <div class="toggle" :class="{ active: symmetricRoles }">
        <div class="toggle-knob"></div>
      </div>
    </div>

    <div class="setting-row" @click="toggleEnemyVoting">
      <div class="setting-info">
        <div class="setting-label">Vote équipe adverse</div>
        <div class="setting-desc text-muted text-xs">
          Après le vote interne, chaque équipe tente de deviner les rôles adverses
        </div>
      </div>
      <div class="toggle" :class="{ active: enemyVoting }">
        <div class="toggle-knob"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-panel {
  cursor: default;
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
