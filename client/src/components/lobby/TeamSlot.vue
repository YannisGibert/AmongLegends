<script setup>
import { computed, ref } from 'vue'
import { usePlayerStore } from '@/stores/playerStore'
import { useSocket } from '@/composables/useSocket'

const props = defineProps({
  team: String,
  label: String,
  players: Array,
})

const playerStore = usePlayerStore()
const { emit } = useSocket()

const isHost = computed(() => playerStore.isHost)
const myTeam = computed(() => playerStore.team)
const isDragOver = ref(false)

function movePlayer(targetId, team) {
  emit('lobby:assign_team', { targetPlayerId: targetId, team })
}

function joinTeam() {
  emit('lobby:assign_team', { targetPlayerId: playerStore.id, team: props.team })
}

function removeBot(botId) {
  emit('lobby:remove_bot', { botId })
}

// Drag-and-drop (host only)
function onDragStart(event, player) {
  event.dataTransfer.setData('playerId', player.id)
  event.dataTransfer.effectAllowed = 'move'
}

function onDragOver(event) {
  if (!isHost.value) return
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
  isDragOver.value = true
}

function onDragLeave() {
  isDragOver.value = false
}

function onDrop(event) {
  isDragOver.value = false
  if (!isHost.value) return
  const playerId = event.dataTransfer.getData('playerId')
  if (!playerId) return
  movePlayer(playerId, props.team)
}

const teamClass = computed(() => {
  if (props.team === 'equipe1') return 'team-blue'
  if (props.team === 'equipe2') return 'team-red'
  return 'team-spectateur'
})

const canJoin = computed(() => myTeam.value !== props.team)
</script>

<template>
  <div
    class="team-slot card"
    :class="[teamClass, { 'drag-over': isDragOver }]"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <div class="slot-header">
      <span class="slot-label">{{ label }}</span>
      <span class="slot-count text-muted text-xs">{{ players.length }}{{ team !== 'spectateur' ? '/5' : '' }}</span>
    </div>

    <div class="players-list">
      <div
        v-for="player in players"
        :key="player.id"
        class="player-row"
        :class="{
          'is-me': player.id === playerStore.id,
          'is-bot': player.isBot,
          'draggable': isHost,
        }"
        :draggable="isHost"
        @dragstart="onDragStart($event, player)"
      >
        <div class="player-info">
          <span v-if="isHost" class="drag-handle">⠿</span>
          <span v-if="player.isBot" class="bot-icon">🤖</span>
          <span v-else class="player-dot" :class="{ offline: !player.isConnected }"></span>
          <span class="player-name">{{ player.username }}</span>
          <span v-if="player.isHost" class="badge badge-gold host-badge">Host</span>
          <span v-if="!player.isConnected && !player.isBot" class="badge badge-grey">Déco</span>
          <span v-if="player.cumulativeScore" class="player-score">{{ player.cumulativeScore }}pts</span>
        </div>

        <div class="row-actions">
          <!-- Bot: remove button -->
          <button
            v-if="isHost && player.isBot"
            class="btn btn-ghost btn-sm remove-bot-btn"
            title="Retirer le bot"
            @click="removeBot(player.id)"
          >✕</button>
        </div>
      </div>

      <div v-if="players.length === 0" class="empty-slot text-muted text-sm">
        {{ isHost ? 'Glissez des joueurs ici' : 'Aucun joueur' }}
      </div>
    </div>

    <button
      v-if="canJoin"
      class="btn btn-secondary btn-sm btn-block mt-2 join-btn"
      @click="joinTeam"
    >
      Rejoindre
    </button>
  </div>
</template>

<style scoped>
.team-slot {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 120px;
  transition: border-color 0.2s, background-color 0.2s;
}

.team-slot.drag-over {
  background: rgba(255, 255, 255, 0.06);
  border-style: dashed;
}

.team-blue { border-color: rgba(26, 107, 224, 0.4); }
.team-blue .slot-label { color: var(--equipe1-light); }
.team-red { border-color: rgba(192, 57, 43, 0.4); }
.team-red .slot-label { color: var(--equipe2-light); }
.team-spectateur { border-color: var(--border); }
.team-spectateur .slot-label { color: var(--text-secondary); }

.slot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.slot-label {
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.players-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  flex: 1;
}

.player-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.3rem 0.5rem;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.04);
  gap: 0.5rem;
  user-select: none;
}

.player-row.draggable {
  cursor: grab;
}

.player-row.draggable:active {
  cursor: grabbing;
  opacity: 0.5;
}

.player-row.is-me {
  background: rgba(200, 155, 60, 0.1);
  border: 1px solid rgba(200, 155, 60, 0.2);
}

.player-row.is-bot {
  background: rgba(142, 68, 173, 0.08);
  border: 1px solid rgba(142, 68, 173, 0.15);
  opacity: 0.85;
}

.player-info {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex: 1;
  min-width: 0;
}

.player-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--green-light);
  flex-shrink: 0;
}

.player-dot.offline {
  background: var(--text-muted);
}

.drag-handle {
  font-size: 0.75rem;
  color: var(--text-muted);
  opacity: 0.4;
  flex-shrink: 0;
  cursor: grab;
}

.bot-icon {
  font-size: 0.8rem;
  flex-shrink: 0;
}

.player-name {
  font-size: 0.9rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.host-badge {
  font-size: 0.65rem;
  padding: 0.1em 0.4em;
}

.player-score {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--gold);
  margin-left: auto;
  flex-shrink: 0;
}

.row-actions {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}

.remove-bot-btn {
  color: var(--red-light);
  opacity: 0.6;
}

.remove-bot-btn:hover:not(:disabled) {
  opacity: 1;
  background: rgba(192, 57, 43, 0.15) !important;
}

.empty-slot {
  text-align: center;
  padding: 0.5rem;
  opacity: 0.5;
}

.join-btn {
  margin-top: auto;
}
</style>
