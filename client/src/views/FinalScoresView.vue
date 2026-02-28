<script setup>
import { computed } from 'vue'
import { useLobbyStore } from '@/stores/lobbyStore'
import { usePlayerStore } from '@/stores/playerStore'
import { useGameStore } from '@/stores/gameStore'
import { useSocket } from '@/composables/useSocket'
import { ROLE_INFO } from '@/constants'

const lobbyStore = useLobbyStore()
const playerStore = usePlayerStore()
const gameStore = useGameStore()
const { emit } = useSocket()

const isHost = computed(() => playerStore.isHost)

const sortByScore = (players) =>
  [...players].sort((a, b) => b.cumulativeScore - a.cumulativeScore)

const equipe1Scores = computed(() => {
  if (!gameStore.finalScores) return []
  return sortByScore(gameStore.finalScores.filter(p => p.team === 'equipe1'))
})

const equipe2Scores = computed(() => {
  if (!gameStore.finalScores) return []
  return sortByScore(gameStore.finalScores.filter(p => p.team === 'equipe2'))
})

const getRank = (index) => {
  if (index === 0) return '🥇'
  if (index === 1) return '🥈'
  if (index === 2) return '🥉'
  return `${index + 1}.`
}

function playAgain(keepTeams) {
  emit('game:play_again', { keepTeams })
}
</script>

<template>
  <div class="scores-view">
    <div class="scores-content animate-fade-in">
      <h2 class="text-gold text-center mb-1">🏆 Scores finaux</h2>
      <p class="text-secondary text-sm text-center mb-2">
        Manche {{ lobbyStore.roundNumber }} — Classement de la manche
      </p>

      <!-- Two team tables -->
      <div class="teams-grid mb-6">

        <!-- Équipe 1 -->
        <div class="scores-table card">
          <div class="team-header header-blue">
            <span>🔵 Équipe 1</span>
            <span class="text-xs">{{ equipe1Scores.length }} joueurs</span>
          </div>
          <div class="table-header">
            <span>#</span>
            <span>Joueur</span>
            <span>Rôle</span>
            <span class="text-center">Manche</span>
            <span class="text-center">Total</span>
          </div>
          <div
            v-for="(player, index) in equipe1Scores"
            :key="player.id"
            class="table-row"
            :class="{ 'is-me': player.id === playerStore.id, 'is-top': index === 0 }"
          >
            <span class="rank">{{ getRank(index) }}</span>
            <span class="player-name-col">
              <span class="player-avatar-sm" :class="{ 'bot-avatar': player.isBot }">
                {{ player.isBot ? '🤖' : player.username[0] }}
              </span>
              {{ player.username }}
            </span>
            <span class="role-col">
              <span class="role-emoji-sm">{{ ROLE_INFO[player.secretRole]?.emoji }}</span>
              <span class="role-text" :style="{ color: ROLE_INFO[player.secretRole]?.color }">{{ player.secretRole }}</span>
            </span>
            <span class="score-col text-center">
              <span class="round-score" :class="{ positive: player.lastRoundScore >= 0, negative: player.lastRoundScore < 0 }">
                {{ player.lastRoundScore >= 0 ? '+' : '' }}{{ player.lastRoundScore }}
              </span>
              <span class="breakdown-inline text-xs">
                (🗳{{ player.breakdown?.voting >= 0 ? '+' : '' }}{{ player.breakdown?.voting ?? 0 }}
                👁{{ player.breakdown?.discovery >= 0 ? '+' : '' }}{{ player.breakdown?.discovery ?? 0 }}
                🎭{{ player.breakdown?.role >= 0 ? '+' : '' }}{{ player.breakdown?.role ?? 0 }})
              </span>
            </span>
            <span class="cumulative-col text-center font-bold">{{ player.cumulativeScore }}</span>
          </div>
        </div>

        <!-- Équipe 2 (hidden in 5-player mode) -->
        <div v-if="equipe2Scores.length > 0" class="scores-table card">
          <div class="team-header header-red">
            <span>🔴 Équipe 2</span>
            <span class="text-xs">{{ equipe2Scores.length }} joueurs</span>
          </div>
          <div class="table-header">
            <span>#</span>
            <span>Joueur</span>
            <span>Rôle</span>
            <span class="text-center">Manche</span>
            <span class="text-center">Total</span>
          </div>
          <div
            v-for="(player, index) in equipe2Scores"
            :key="player.id"
            class="table-row"
            :class="{ 'is-me': player.id === playerStore.id, 'is-top': index === 0 }"
          >
            <span class="rank">{{ getRank(index) }}</span>
            <span class="player-name-col">
              <span class="player-avatar-sm" :class="{ 'bot-avatar': player.isBot }">
                {{ player.isBot ? '🤖' : player.username[0] }}
              </span>
              {{ player.username }}
            </span>
            <span class="role-col">
              <span class="role-emoji-sm">{{ ROLE_INFO[player.secretRole]?.emoji }}</span>
              <span class="role-text" :style="{ color: ROLE_INFO[player.secretRole]?.color }">{{ player.secretRole }}</span>
            </span>
            <span class="score-col text-center">
              <span class="round-score" :class="{ positive: player.lastRoundScore >= 0, negative: player.lastRoundScore < 0 }">
                {{ player.lastRoundScore >= 0 ? '+' : '' }}{{ player.lastRoundScore }}
              </span>
              <span class="breakdown-inline text-xs">
                (🗳{{ player.breakdown?.voting >= 0 ? '+' : '' }}{{ player.breakdown?.voting ?? 0 }}
                👁{{ player.breakdown?.discovery >= 0 ? '+' : '' }}{{ player.breakdown?.discovery ?? 0 }}
                🎭{{ player.breakdown?.role >= 0 ? '+' : '' }}{{ player.breakdown?.role ?? 0 }})
              </span>
            </span>
            <span class="cumulative-col text-center font-bold">{{ player.cumulativeScore }}</span>
          </div>
        </div>

      </div>

      <!-- Score legend -->
      <div class="legend card mb-6 text-sm">
        <h4 class="text-gold mb-2">📖 Légende des scores</h4>
        <div class="legend-grid">
          <span>🗳 Votes : ±pts selon votes corrects/incorrects</span>
          <span>👁 Discrétion : pts selon si vous avez été découvert</span>
          <span>🎭 Rôle : pts selon votre objectif de rôle</span>
        </div>
      </div>

      <!-- Host actions -->
      <div v-if="isHost" class="play-again-section">
        <h3 class="text-center mb-4">🔄 Rejouer ?</h3>
        <div class="play-again-btns">
          <button class="btn btn-primary btn-lg" @click="playAgain(true)">
            ✅ Rejouer — Mêmes équipes
          </button>
          <button class="btn btn-secondary btn-lg" @click="playAgain(false)">
            🔀 Rejouer — Réassigner les équipes
          </button>
        </div>
      </div>
      <div v-else class="waiting-host card text-center" style="padding: 1.5rem;">
        <p class="text-secondary animate-pulse">En attente de l'host pour relancer...</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scores-view {
  flex: 1;
  padding: 2rem;
  display: flex;
  justify-content: center;
}

.scores-content {
  width: 100%;
  max-width: 1100px;
}

/* Two-column grid for teams */
.teams-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
  align-items: start;
}

.scores-table {
  overflow: hidden;
  padding: 0;
}

/* Team header */
.team-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.65rem 1rem;
  font-weight: 700;
  font-size: 0.9rem;
  border-bottom: 1px solid var(--border);
}

.header-blue {
  background: rgba(26, 107, 224, 0.15);
  color: var(--equipe1-light);
}

.header-red {
  background: rgba(192, 57, 43, 0.15);
  color: var(--equipe2-light);
}

.table-header {
  display: grid;
  grid-template-columns: 36px 1fr 90px 80px 70px;
  padding: 0.5rem 0.75rem;
  background: rgba(200, 155, 60, 0.06);
  border-bottom: 1px solid var(--border);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  text-transform: uppercase;
  gap: 0.4rem;
}

.table-row {
  display: grid;
  grid-template-columns: 36px 1fr 90px 80px 70px;
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid rgba(200, 155, 60, 0.06);
  align-items: center;
  transition: background 0.2s;
  gap: 0.4rem;
}

.table-row:last-child { border-bottom: none; }
.table-row:hover { background: rgba(255, 255, 255, 0.03); }

.table-row.is-me { background: rgba(200, 155, 60, 0.08); }
.table-row.is-top { background: rgba(200, 155, 60, 0.12); }

.rank { font-weight: 700; font-size: 0.95rem; }

.player-name-col {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 600;
  font-size: 0.85rem;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-avatar-sm {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--gold-dark);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.75rem;
  color: var(--gold-light);
  flex-shrink: 0;
}

.bot-avatar {
  background: rgba(142, 68, 173, 0.3);
  font-size: 0.85rem;
}

.role-col {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.role-emoji-sm { font-size: 0.9rem; }
.role-text { font-size: 0.75rem; font-weight: 600; }

.score-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
}

.round-score {
  font-size: 1.1rem;
  font-weight: 800;
}
.round-score.positive { color: var(--green-light); }
.round-score.negative { color: var(--red-light); }

.breakdown-inline {
  color: var(--text-muted);
  font-size: 0.6rem;
  white-space: nowrap;
}

.cumulative-col {
  font-size: 1rem;
  color: var(--gold);
}

.legend { background: var(--blue-panel); }
.legend-grid {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  color: var(--text-secondary);
}

.play-again-section { text-align: center; }

.play-again-btns {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.waiting-host { background: var(--blue-panel); }

@media (max-width: 850px) {
  .teams-grid { grid-template-columns: 1fr; }
}

@media (max-width: 500px) {
  .table-header { grid-template-columns: 32px 1fr 70px 60px; }
  .table-header span:nth-child(3) { display: none; }
  .table-row { grid-template-columns: 32px 1fr 70px 60px; }
  .table-row > span:nth-child(3) { display: none; }
  .play-again-btns { flex-direction: column; }
}
</style>
