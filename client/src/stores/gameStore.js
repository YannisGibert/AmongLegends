import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useGameStore = defineStore('game', () => {
  const phase = ref(null)
  const lolStartedAt = ref(null) // timestamp (ms), set when the LoL game starts
  const currentCommand = ref(null) // { id, text }
  const droideTimerEnd = ref(null) // timestamp (ms) when next command arrives
  const votes = ref({}) // { [targetId]: roleGuess }
  const votesSubmitted = ref(false)
  const voteProgress = ref(null) // { phase, submitted, total }
  const finalScores = ref(null) // array of PlayerScoreDTO
  const lastError = ref(null)
  const hostControlTargets = ref({ droides: [], doubleFaces: [] }) // spectating-host god-mode panel

  function setVote(targetId, roleGuess) {
    votes.value = { ...votes.value, [targetId]: roleGuess }
  }

  function resetVotes() {
    votes.value = {}
    votesSubmitted.value = false
    voteProgress.value = null
  }

  function reset() {
    phase.value = null
    lolStartedAt.value = null
    currentCommand.value = null
    droideTimerEnd.value = null
    votes.value = {}
    votesSubmitted.value = false
    voteProgress.value = null
    finalScores.value = null
    lastError.value = null
    hostControlTargets.value = { droides: [], doubleFaces: [] }
  }

  return {
    phase,
    lolStartedAt,
    currentCommand,
    droideTimerEnd,
    votes,
    votesSubmitted,
    voteProgress,
    finalScores,
    lastError,
    hostControlTargets,
    setVote,
    resetVotes,
    reset,
  }
})
