import { ref } from 'vue'

const audioCache = new Map()
const isMuted = ref(false)

export function useAudio() {
  function play(audioPath) {
    if (isMuted.value || !audioPath) return

    try {
      let audio = audioCache.get(audioPath)
      if (!audio) {
        audio = new Audio(audioPath)
        audioCache.set(audioPath, audio)
      } else {
        audio.currentTime = 0
      }
      audio.play().catch((e) => {
        // Autoplay may be blocked by browser; user must interact first
        console.warn('[Audio] Playback failed:', e.message)
      })
    } catch (e) {
      console.warn('[Audio] Error:', e)
    }
  }

  function toggleMute() {
    isMuted.value = !isMuted.value
  }

  return { play, toggleMute, isMuted }
}
