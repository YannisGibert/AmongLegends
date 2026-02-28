<script setup>
import { ref, computed } from 'vue'
import { useLobbyStore } from '@/stores/lobbyStore'
import { usePlayerStore } from '@/stores/playerStore'
import { useGameStore } from '@/stores/gameStore'
import { useSocket } from '@/composables/useSocket'
import { ALL_ROLES, GamePhase } from '@/constants'

const lobbyStore = useLobbyStore()
const playerStore = usePlayerStore()
const gameStore = useGameStore()
const { emit } = useSocket()

const phase = computed(() => lobbyStore.phase)
const isSelfVoting = computed(() => phase.value === GamePhase.VOTING_SELF)
const isEnemyVoting = computed(() => phase.value === GamePhase.VOTING_ENEMY)

const myTeam = computed(() => playerStore.team)

const targetsToVote = computed(() => {
  if (isSelfVoting.value) {
    // Vote for teammates (not yourself)
    const team = myTeam.value === 'equipe1' ? lobbyStore.equipe1Players : lobbyStore.equipe2Players
    return team.filter(p => p.id !== playerStore.id)
  } else if (isEnemyVoting.value) {
    // Vote for enemy team
    const team = myTeam.value === 'equipe1' ? lobbyStore.equipe2Players : lobbyStore.equipe1Players
    return team
  }
  return []
})

const votes = computed(() => gameStore.votes)
const allVoted = computed(() => {
  return targetsToVote.value.every(p => votes.value[p.id])
})

const submitted = computed(() => gameStore.votesSubmitted)
const progress = computed(() => gameStore.voteProgress)

function setVote(targetId, role) {
  gameStore.setVote(targetId, role)
}

function submitVotes() {
  if (!allVoted.value || submitted.value) return
  const voteArray = Object.entries(votes.value).map(([targetId, roleGuess]) => ({ targetId, roleGuess }))
  emit('vote:submit', { votes: voteArray, phase: isSelfVoting.value ? 'self' : 'enemy' })
}
</script>

<template>
  <div class="voting-view">
    <div class="voting-content animate-fade-in">
      <div class="voting-header">
        <h2 class="text-gold">
          {{ isSelfVoting ? '🔍 Vote — Votre équipe' : '🕵 Vote — Équipe adverse' }}
        </h2>
        <p class="text-secondary text-sm mt-1">
          {{ isSelfVoting
            ? 'Devinez le rôle secret de chacun de vos coéquipiers'
            : 'Devinez le rôle secret de chaque membre de l\'équipe adverse'
          }}
        </p>

        <!-- Progress tracker -->
        <div v-if="progress" class="vote-progress mt-3">
          <div class="progress-label text-xs text-muted">
            {{ progress.submitted }}/{{ progress.total }} joueurs ont voté
          </div>
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: `${(progress.submitted / progress.total) * 100}%` }"
            ></div>
          </div>
        </div>
      </div>

      <!-- Already submitted -->
      <div v-if="submitted" class="submitted-state card text-center">
        <div style="font-size: 3rem; margin-bottom: 0.75rem;">✅</div>
        <h3 class="text-gold mb-2">Votes soumis !</h3>
        <p class="text-secondary animate-pulse">En attente des autres joueurs...</p>
        <div v-if="progress" class="mt-3 text-muted text-sm">
          {{ progress.submitted }}/{{ progress.total }} joueurs ont voté
        </div>
      </div>

      <!-- Vote form -->
      <div v-else class="vote-form">
        <!-- Team table -->
        <div class="vote-table card">
          <!-- Team header -->
          <div class="vote-table-header" :class="isSelfVoting ? (myTeam === 'equipe1' ? 'header-blue' : 'header-red') : (myTeam === 'equipe1' ? 'header-red' : 'header-blue')">
            <span class="team-label">
              {{ isSelfVoting
                ? (myTeam === 'equipe1' ? '🔵 Équipe 1 — Votre équipe' : '🔴 Équipe 2 — Votre équipe')
                : (myTeam === 'equipe1' ? '🔴 Équipe 2 — Équipe adverse' : '🔵 Équipe 1 — Équipe adverse')
              }}
            </span>
            <span class="team-count text-xs">{{ targetsToVote.length }} joueurs</span>
          </div>

          <!-- Column headers -->
          <div class="vote-col-headers">
            <span>Joueur</span>
            <span>Rôle deviné</span>
            <span class="text-center">✓</span>
          </div>

          <!-- Player rows -->
          <div
            v-for="player in targetsToVote"
            :key="player.id"
            class="vote-row"
            :class="{ voted: !!votes[player.id] }"
          >
            <div class="vote-player">
              <div class="player-avatar">{{ player.username[0].toUpperCase() }}</div>
              <span class="player-name">{{ player.username }}</span>
            </div>
            <div class="vote-select">
              <select
                :value="votes[player.id] || ''"
                @change="setVote(player.id, $event.target.value)"
                class="form-select"
              >
                <option value="">— Quel est son rôle ? —</option>
                <option v-for="role in ALL_ROLES" :key="role" :value="role">{{ role }}</option>
              </select>
            </div>
            <div class="vote-status">
              <span v-if="votes[player.id]" class="text-success">✓</span>
              <span v-else class="text-muted">?</span>
            </div>
          </div>
        </div>

        <button
          class="btn btn-primary btn-block btn-lg mt-4"
          :disabled="!allVoted"
          @click="submitVotes"
        >
          {{ allVoted ? '✅ Soumettre mes votes' : `Encore ${targetsToVote.length - Object.keys(votes).filter(k => targetsToVote.some(p => p.id === k)).length} vote(s) manquant(s)` }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.voting-view {
  flex: 1;
  padding: 2rem;
  display: flex;
  justify-content: center;
}

.voting-content {
  width: 100%;
  max-width: 600px;
}

.voting-header {
  margin-bottom: 1.5rem;
}

.vote-progress {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.progress-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--gold);
  border-radius: 3px;
  transition: width 0.4s ease;
}

.submitted-state {
  padding: 3rem 2rem;
  background: var(--blue-panel);
}

.vote-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Team table */
.vote-table {
  overflow: hidden;
  padding: 0;
}

.vote-table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.7rem 1rem;
  border-bottom: 1px solid var(--border);
  font-weight: 700;
  font-size: 0.88rem;
}

.header-blue {
  background: rgba(26, 107, 224, 0.15);
  color: var(--equipe1-light);
}

.header-red {
  background: rgba(192, 57, 43, 0.15);
  color: var(--equipe2-light);
}

.team-label { letter-spacing: 0.04em; }
.team-count { opacity: 0.7; }

.vote-col-headers {
  display: grid;
  grid-template-columns: 1fr 1fr 32px;
  padding: 0.4rem 1rem;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-muted);
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid var(--border);
}

.vote-row {
  display: grid;
  grid-template-columns: 1fr 1fr 32px;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  transition: background 0.2s;
}

.vote-row:last-child { border-bottom: none; }
.vote-row:hover { background: rgba(255, 255, 255, 0.02); }

.vote-row.voted {
  background: rgba(39, 174, 96, 0.05);
}

.vote-player {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.player-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--gold-dark);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--gold-light);
  flex-shrink: 0;
}

.player-name {
  font-weight: 600;
  font-size: 0.9rem;
}

.vote-select { width: 100%; }

.vote-status {
  text-align: center;
  font-size: 1.1rem;
}

@media (max-width: 600px) {
  .vote-col-headers { display: none; }
  .vote-row {
    grid-template-columns: 1fr 32px;
    grid-template-rows: auto auto;
  }
  .vote-player { grid-column: 1; }
  .vote-select { grid-column: 1; }
  .vote-status { grid-column: 2; grid-row: 1 / 3; align-self: center; }
}
</style>
