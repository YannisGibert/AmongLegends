<script setup>
import { computed, onMounted, ref } from 'vue'
import { useLobbyStore } from '@/stores/lobbyStore'
import { usePlayerStore } from '@/stores/playerStore'
import { useSocket } from '@/composables/useSocket'

const lobbyStore = useLobbyStore()
const playerStore = usePlayerStore()
const { emit } = useSocket()

const isHost = computed(() => playerStore.isHost)
const myChampion = computed(() => {
  const me = lobbyStore.players.find((p) => p.id === playerStore.id)
  return me?.champion || null
})

const activePlayers = computed(() =>
  lobbyStore.players.filter((p) => p.team === 'equipe1' || p.team === 'equipe2')
)

// Data Dragon version (fetched once)
const ddVersion = ref(null)
const revealed = ref(false)

onMounted(async () => {
  try {
    const res = await fetch('https://ddragon.leagueoflegends.com/api/versions.json')
    const versions = await res.json()
    ddVersion.value = versions[0]
  } catch {
    ddVersion.value = '15.1.1' // fallback
  }

  // Trigger reveal animation after a short delay
  setTimeout(() => { revealed.value = true }, 300)
})

function championImgUrl(champion) {
  if (!ddVersion.value || !champion) return ''
  return `https://ddragon.leagueoflegends.com/cdn/${ddVersion.value}/img/champion/${champion}.png`
}

function confirmChampions() {
  emit('game:confirm_champions', {})
}

const equipe1 = computed(() => activePlayers.value.filter((p) => p.team === 'equipe1'))
const equipe2 = computed(() => activePlayers.value.filter((p) => p.team === 'equipe2'))
</script>

<template>
  <div class="champion-reveal">
    <!-- My champion highlight -->
    <div class="my-champion-section" v-if="myChampion">
      <div class="my-champion-label text-muted text-xs">VOTRE CHAMPION</div>
      <div class="my-champion-card" :class="{ revealed }">
        <img
          v-if="ddVersion && myChampion"
          :src="championImgUrl(myChampion)"
          :alt="myChampion"
          class="my-champion-img"
          loading="lazy"
        />
        <div class="my-champion-name">{{ myChampion }}</div>
      </div>
    </div>

    <!-- All teams -->
    <div class="teams-reveal" :class="{ revealed }">
      <div class="team-reveal-col" v-if="equipe1.length > 0">
        <div class="team-reveal-header header-blue">Équipe 1</div>
        <div
          v-for="(player, i) in equipe1"
          :key="player.id"
          class="champ-row"
          :style="{ animationDelay: `${i * 0.12}s` }"
          :class="{ 'is-me': player.id === playerStore.id }"
        >
          <img
            v-if="ddVersion && player.champion"
            :src="championImgUrl(player.champion)"
            :alt="player.champion"
            class="champ-icon"
            loading="lazy"
          />
          <div class="champ-info">
            <div class="champ-name">{{ player.champion || '???' }}</div>
            <div class="champ-player text-muted text-xs">{{ player.username }}</div>
          </div>
        </div>
      </div>

      <div class="team-reveal-col" v-if="equipe2.length > 0">
        <div class="team-reveal-header header-red">Équipe 2</div>
        <div
          v-for="(player, i) in equipe2"
          :key="player.id"
          class="champ-row"
          :style="{ animationDelay: `${(i + 5) * 0.12}s` }"
          :class="{ 'is-me': player.id === playerStore.id }"
        >
          <img
            v-if="ddVersion && player.champion"
            :src="championImgUrl(player.champion)"
            :alt="player.champion"
            class="champ-icon"
            loading="lazy"
          />
          <div class="champ-info">
            <div class="champ-name">{{ player.champion || '???' }}</div>
            <div class="champ-player text-muted text-xs">{{ player.username }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Host confirm -->
    <div v-if="isHost" class="host-confirm">
      <button class="btn btn-primary btn-lg animate-glow" @click="confirmChampions">
        ✅ Tout le monde a vu son champion — Continuer
      </button>
    </div>
    <div v-else class="waiting-text text-secondary text-center">
      <div class="animate-pulse">⏳ En attente de l'host...</div>
    </div>
  </div>
</template>

<style scoped>
.champion-reveal {
  flex: 1;
  padding: 2rem 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  max-width: 900px;
  margin: 0 auto;
}

/* My champion */
.my-champion-section {
  text-align: center;
}

.my-champion-label {
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 0.75rem;
}

.my-champion-card {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  background: var(--blue-card);
  border: 2px solid var(--gold);
  border-radius: 16px;
  padding: 1rem 2rem;
  opacity: 0;
  transform: scale(0.85);
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.my-champion-card.revealed {
  opacity: 1;
  transform: scale(1);
}

.my-champion-img {
  width: 80px;
  height: 80px;
  border-radius: 10px;
  object-fit: cover;
  border: 2px solid var(--gold);
}

.my-champion-name {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--gold);
}

/* Teams grid */
.teams-reveal {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  width: 100%;
}

.team-reveal-col {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.team-reveal-header {
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  margin-bottom: 0.25rem;
}

.header-blue {
  background: rgba(26, 107, 224, 0.15);
  color: var(--equipe1-light);
  border: 1px solid rgba(26, 107, 224, 0.3);
}

.header-red {
  background: rgba(192, 57, 43, 0.15);
  color: var(--equipe2-light);
  border: 1px solid rgba(192, 57, 43, 0.3);
}

.champ-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  animation: slideIn 0.4s ease both;
  opacity: 0;
}

.teams-reveal.revealed .champ-row {
  animation: slideIn 0.4s ease both;
}

.champ-row.is-me {
  background: rgba(200, 155, 60, 0.12);
  border: 1px solid rgba(200, 155, 60, 0.25);
}

.champ-icon {
  width: 44px;
  height: 44px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid var(--border);
}

.champ-name {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
}

.champ-player {
  margin-top: 0.1rem;
}

/* Host confirm */
.host-confirm {
  margin-top: 1rem;
}

.waiting-text {
  margin-top: 1rem;
  font-size: 1rem;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; transform: translateX(0); }
}

@media (max-width: 640px) {
  .teams-reveal {
    grid-template-columns: 1fr;
  }
}
</style>
