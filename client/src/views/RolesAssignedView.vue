<script setup>
import { computed, ref } from 'vue'
import { useLobbyStore } from '@/stores/lobbyStore'
import { usePlayerStore } from '@/stores/playerStore'
import { useSocket } from '@/composables/useSocket'
import { ROLE_INFO, LOL_ROLE_INFO } from '@/constants'

const lobbyStore = useLobbyStore()
const playerStore = usePlayerStore()
const { emit } = useSocket()

const isHost = computed(() => playerStore.isHost)
const myRole = computed(() => playerStore.secretRole)
const myTeam = computed(() => playerStore.team)
const myLolRole = computed(() => {
  const me = lobbyStore.players.find(p => p.id === playerStore.id)
  return me?.lolRole || null
})

const roleInfo = computed(() => myRole.value ? ROLE_INFO[myRole.value] : null)
const lolRoleInfo = computed(() => myLolRole.value ? LOL_ROLE_INFO[myLolRole.value] : null)

const myTeamPlayers = computed(() => {
  if (myTeam.value === 'equipe1') return lobbyStore.equipe1Players
  if (myTeam.value === 'equipe2') return lobbyStore.equipe2Players
  return []
})

const roleRevealed = ref(false)

function startLol() {
  emit('game:lol_started', {})
}
</script>

<template>
  <div class="roles-view">
    <div class="roles-content animate-fade-in">
      <h2 class="text-gold text-center mb-1">🎭 Rôles attribués !</h2>
      <p class="text-secondary text-center text-sm mb-6">
        Mémorisez bien votre rôle secret — ne le montrez à personne !
      </p>

      <!-- My secret role card -->
      <div class="role-reveal-section">
        <div v-if="myRole" class="secret-role-card card-glow" :style="{ '--role-color': roleInfo?.color }">
          <div class="role-card-header">
            <span class="role-card-label">VOTRE RÔLE SECRET</span>
          </div>
          <div class="role-emoji-big">{{ roleInfo?.emoji }}</div>
          <div class="role-name-big">{{ myRole }}</div>
          <div class="role-objective">
            <span class="obj-label">Objectif :</span>
            {{ roleInfo?.objective }}
          </div>
          <div class="role-desc text-secondary text-sm">{{ roleInfo?.description }}</div>

          <!-- Romeo partner info -->
          <div v-if="myRole === 'Romeo' && playerStore.romeoPartnerName" class="romeo-partner">
            <span>💘 Votre âme sœur : </span>
            <strong>{{ playerStore.romeoPartnerName }}</strong>
          </div>

          <!-- Double Face info -->
          <div v-if="myRole === 'Double-Face'" class="doubleface-note">
            <span>🎲 Votre état changera aléatoirement pendant la partie</span>
          </div>
        </div>
        <div v-else class="no-role card text-center text-muted">
          <p>Vous êtes spectateur cette manche.</p>
        </div>
      </div>

      <!-- LoL Role -->
      <div v-if="myLolRole" class="lol-role-card card mt-4">
        <div class="lol-role-header text-muted text-xs">VOTRE RÔLE LOL</div>
        <div class="lol-role-body">
          <span class="lol-role-emoji">{{ lolRoleInfo?.emoji }}</span>
          <span class="lol-role-name" :style="{ color: lolRoleInfo?.color }">{{ myLolRole }}</span>
        </div>
      </div>

      <!-- My team overview -->
      <div class="team-overview card mt-4">
        <h3 class="text-secondary text-sm mb-2">VOTRE ÉQUIPE</h3>
        <div class="team-list">
          <div
            v-for="player in myTeamPlayers"
            :key="player.id"
            class="team-member"
            :class="{ 'is-me': player.id === playerStore.id }"
          >
            <span class="lol-role-tag" :style="{ background: LOL_ROLE_INFO[player.lolRole]?.color + '33', color: LOL_ROLE_INFO[player.lolRole]?.color }">
              {{ LOL_ROLE_INFO[player.lolRole]?.emoji }} {{ player.lolRole }}
            </span>
            <span class="member-name">{{ player.username }}</span>
            <span v-if="player.id === playerStore.id" class="badge badge-gold" style="font-size: 0.65rem">Vous</span>
          </div>
        </div>
      </div>

      <!-- Host: Launch LoL game -->
      <div v-if="isHost" class="launch-section mt-6">
        <p class="text-secondary text-sm text-center mb-3">
          Lancez la partie sur League of Legends, puis cliquez ici une fois en jeu.
        </p>
        <button class="btn btn-success btn-block btn-lg animate-glow" @click="startLol">
          ✅ La partie LoL a commencé !
        </button>
      </div>
      <div v-else class="waiting-host card text-center mt-6">
        <p class="text-secondary animate-pulse">En attente du lancement de la partie LoL...</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.roles-view {
  flex: 1;
  padding: 2rem;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

.roles-content {
  width: 100%;
  max-width: 560px;
}

.secret-role-card {
  background: var(--blue-card);
  border: 2px solid var(--role-color, var(--gold));
  border-radius: 16px;
  padding: 2rem;
  text-align: center;
  box-shadow: 0 0 30px rgba(0, 0, 0, 0.4), 0 0 0 1px var(--role-color, var(--gold));
  position: relative;
  overflow: hidden;
}

.secret-role-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, var(--role-color, var(--gold)) 0%, transparent 70%);
  opacity: 0.08;
  pointer-events: none;
}

.role-card-header {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--text-muted);
  margin-bottom: 1rem;
}

.role-emoji-big {
  font-size: 4rem;
  margin-bottom: 0.5rem;
  animation: bounceIn 0.6s ease forwards;
}

.role-name-big {
  font-size: 2rem;
  font-weight: 900;
  color: var(--role-color, var(--gold));
  margin-bottom: 1rem;
  letter-spacing: 0.05em;
}

.role-objective {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.75rem;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 6px;
}

.obj-label {
  color: var(--text-muted);
  margin-right: 0.4rem;
}

.role-desc {
  line-height: 1.5;
}

.romeo-partner, .doubleface-note {
  margin-top: 1rem;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  font-size: 0.88rem;
  background: rgba(255, 255, 255, 0.06);
}

.lol-role-card {
  background: var(--blue-panel);
  padding: 1rem 1.25rem;
}

.lol-role-header {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 0.5rem;
}

.lol-role-body {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.lol-role-emoji { font-size: 1.5rem; }
.lol-role-name { font-size: 1.3rem; font-weight: 700; }

.team-overview {
  background: var(--blue-panel);
}

.team-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.team-member {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.03);
}

.team-member.is-me {
  background: rgba(200, 155, 60, 0.1);
}

.lol-role-tag {
  padding: 0.15em 0.5em;
  border-radius: 4px;
  font-size: 0.78rem;
  font-weight: 600;
  flex-shrink: 0;
}

.member-name {
  font-size: 0.9rem;
  flex: 1;
}

.no-role { padding: 2rem; }
.launch-section { text-align: center; }
.waiting-host { padding: 1rem; }
</style>
