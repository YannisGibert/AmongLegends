import { ref } from 'vue'

const audioCache = new Map()
const isMuted = ref(false)

let frenchVoice = null
function pickFrenchVoice() {
  const voices = window.speechSynthesis?.getVoices() || []
  frenchVoice = voices.find((v) => v.lang?.startsWith('fr')) || null
}
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = pickFrenchVoice
  pickFrenchVoice()
}

export function useAudio() {
  function speak(text) {
    if (isMuted.value || !text || !window.speechSynthesis) return

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'fr-FR'
    if (frenchVoice) utterance.voice = frenchVoice
    window.speechSynthesis.speak(utterance)
  }

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

  function ting() {
    if (isMuted.value) return

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1)
      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.4)
      osc.onended = () => ctx.close()
    } catch (e) {
      console.warn('[Audio] ting failed:', e)
    }
  }

  function toggleMute() {
    isMuted.value = !isMuted.value
    if (isMuted.value) window.speechSynthesis?.cancel()
  }

  return { play, speak, ting, toggleMute, isMuted }
}
