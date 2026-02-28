function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function pickRandomN(array, n) {
  return shuffle(array).slice(0, n);
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

module.exports = { shuffle, pickRandom, pickRandomN, randomBetween };
