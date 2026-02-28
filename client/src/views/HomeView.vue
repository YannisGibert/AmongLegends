<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSocket } from '@/composables/useSocket'
import { useLobbyStore } from '@/stores/lobbyStore'
import { watch } from 'vue'

const router = useRouter()
const { emit } = useSocket()
const lobbyStore = useLobbyStore()

const mode = ref('home') // 'home' | 'create' | 'join'
const username = ref('')
const joinCode = ref('')
const loading = ref(false)

// Watch for lobby code to redirect
watch(() => lobbyStore.code, (code) => {
  if (code) {
    router.push(`/lobby/${code}`)
  }
})

function createLobby() {
  if (!username.value.trim()) return
  loading.value = true
  emit('lobby:create', { username: username.value.trim() })
  setTimeout(() => { loading.value = false }, 3000)
}

function joinLobby() {
  if (!username.value.trim() || !joinCode.value.trim()) return
  loading.value = true
  emit('lobby:join', { username: username.value.trim(), lobbyCode: joinCode.value.trim() })
  setTimeout(() => { loading.value = false }, 3000)
}
</script>

<template>
  <div class="home-page">
    <div class="home-content animate-fade-in">
      <!-- Logo / Title -->
      <div class="logo-section">
        <div class="logo-emblem">⚔</div>
        <h1 class="logo-title">
          <span class="text-gold">Among</span> Legends
        </h1>
        <p class="logo-subtitle">Le méta-jeu League of Legends entre amis</p>
      </div>

      <!-- Home actions -->
      <div v-if="mode === 'home'" class="action-cards">
        <button class="action-card action-create" @click="mode = 'create'">
          <div class="action-icon">🛡</div>
          <div class="action-label">Créer un lobby</div>
          <div class="action-desc">Devenez l'host et invitez vos amis</div>
        </button>
        <button class="action-card action-join" @click="mode = 'join'">
          <div class="action-icon">🗡</div>
          <div class="action-label">Rejoindre un lobby</div>
          <div class="action-desc">Entrez le code partagé par l'host</div>
        </button>
      </div>

      <!-- Create form -->
      <div v-else-if="mode === 'create'" class="form-card card animate-fade-in">
        <h2 class="text-gold mb-4">Créer un lobby</h2>
        <div class="form-group mb-4">
          <label class="form-label">Votre pseudo</label>
          <input
            v-model="username"
            class="form-input"
            placeholder="Ex: Faker123"
            maxlength="20"
            @keyup.enter="createLobby"
            autofocus
          />
        </div>
        <button
          class="btn btn-primary btn-block btn-lg"
          :disabled="!username.trim() || loading"
          @click="createLobby"
        >
          {{ loading ? 'Connexion...' : 'Créer le lobby' }}
        </button>
        <button class="btn btn-ghost btn-block mt-2" @click="mode = 'home'">
          ← Retour
        </button>
      </div>

      <!-- Join form -->
      <div v-else-if="mode === 'join'" class="form-card card animate-fade-in">
        <h2 class="text-gold mb-4">Rejoindre un lobby</h2>
        <div class="form-group mb-4">
          <label class="form-label">Votre pseudo</label>
          <input
            v-model="username"
            class="form-input"
            placeholder="Ex: Faker123"
            maxlength="20"
            autofocus
          />
        </div>
        <div class="form-group mb-4">
          <label class="form-label">Code du lobby</label>
          <input
            v-model="joinCode"
            class="form-input code-input"
            placeholder="Ex: AB3X7K"
            maxlength="6"
            @input="joinCode = joinCode.toUpperCase()"
            @keyup.enter="joinLobby"
          />
        </div>
        <button
          class="btn btn-primary btn-block btn-lg"
          :disabled="!username.trim() || !joinCode.trim() || loading"
          @click="joinLobby"
        >
          {{ loading ? 'Connexion...' : 'Rejoindre' }}
        </button>
        <button class="btn btn-ghost btn-block mt-2" @click="mode = 'home'">
          ← Retour
        </button>
      </div>

      <!-- Footer -->
      <p class="home-footer text-muted text-sm text-center mt-8">
        Among Legends • Un méta-jeu non officiel pour League of Legends
      </p>
    </div>
  </div>
</template>

<style scoped>
.home-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.home-content {
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.logo-section {
  text-align: center;
}

.logo-emblem {
  font-size: 3.5rem;
  margin-bottom: 0.5rem;
  filter: drop-shadow(0 0 20px rgba(200, 155, 60, 0.5));
  animation: glow 3s ease-in-out infinite;
}

.logo-title {
  font-size: 2.8rem;
  font-weight: 900;
  letter-spacing: 0.04em;
  line-height: 1;
  margin-bottom: 0.5rem;
}

.logo-subtitle {
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.action-cards {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.action-card {
  background: var(--blue-panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.action-card:hover {
  border-color: var(--gold);
  box-shadow: var(--shadow-gold);
  transform: translateY(-2px);
}

.action-icon {
  font-size: 1.8rem;
  margin-bottom: 0.25rem;
}

.action-label {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
}

.action-desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.form-card {
  padding: 2rem;
}

.code-input {
  font-size: 1.3rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-align: center;
  text-transform: uppercase;
}
</style>
