<script setup>
import { onMounted, onUnmounted } from 'vue'
import { RouterView } from 'vue-router'
import { useSocket } from '@/composables/useSocket'
import { useGameStore } from '@/stores/gameStore'

const { connect, disconnect } = useSocket()
const gameStore = useGameStore()

onMounted(() => {
  connect()
})

onUnmounted(() => {
  disconnect()
})
</script>

<template>
  <div id="app-wrapper">
    <!-- Global error toast -->
    <Transition name="toast">
      <div v-if="gameStore.lastError" class="global-toast toast-error">
        ⚠ {{ gameStore.lastError }}
      </div>
    </Transition>

    <RouterView />
  </div>
</template>

<style scoped>
#app-wrapper {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
}

.global-toast {
  position: fixed;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  min-width: 260px;
  max-width: 480px;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-16px);
}
</style>
