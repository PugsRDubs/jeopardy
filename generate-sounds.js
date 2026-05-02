import fs from 'fs'
import path from 'path'

function createWav(samples, sampleRate = 44100) {
  const numSamples = samples.length
  const buffer = Buffer.alloc(44 + numSamples * 2)

  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + numSamples * 2, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(numSamples * 2, 40)

  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    buffer.writeInt16LE(Math.floor(s * 32767), 44 + i * 2)
  }
  return buffer
}

function generateBuzz() {
  const sr = 44100
  const dur = 0.25
  const n = Math.floor(sr * dur)
  const samples = []
  for (let i = 0; i < n; i++) {
    const t = i / sr
    const env = Math.exp(-t * 8)
    const osc1 = Math.sin(2 * Math.PI * 620 * t)
    const osc2 = Math.sin(2 * Math.PI * 1240 * t) * 0.3
    const noise = (Math.random() * 2 - 1) * 0.1
    const s = (osc1 + osc2 + noise) * env * 0.7
    samples.push(s)
  }
  return samples
}

function generateCorrect() {
  const sr = 44100
  const n = Math.floor(sr * 0.6)
  const samples = new Array(n).fill(0)
  const notes = [
    { freq: 523.25, start: 0, dur: 0.5, vol: 0.5 },
    { freq: 659.25, start: 0.1, dur: 0.45, vol: 0.4 },
    { freq: 783.99, start: 0.2, dur: 0.4, vol: 0.35 }
  ]
  for (const note of notes) {
    const startSample = Math.floor(sr * note.start)
    const durSamples = Math.floor(sr * note.dur)
    for (let i = 0; i < durSamples; i++) {
      const idx = startSample + i
      if (idx >= n) break
      const t = i / sr
      const attack = Math.min(1, t * 40)
      const decay = Math.exp(-t * 4)
      const env = attack * decay
      samples[idx] += Math.sin(2 * Math.PI * note.freq * t) * env * note.vol
      samples[idx] += Math.sin(2 * Math.PI * note.freq * 2 * t) * env * note.vol * 0.15
    }
  }
  return samples
}

function generateWrong() {
  const sr = 44100
  const dur = 0.7
  const n = Math.floor(sr * dur)
  const samples = []
  for (let i = 0; i < n; i++) {
    const t = i / sr
    const env = Math.exp(-t * 2.5)
    const freq1 = 220 + Math.sin(t * 8) * 30
    const freq2 = 165 + Math.sin(t * 6) * 20
    const osc1 = Math.sin(2 * Math.PI * freq1 * t)
    const osc2 = Math.sin(2 * Math.PI * freq2 * t)
    const sq = Math.sin(2 * Math.PI * 110 * t) > 0 ? 0.2 : -0.2
    const s = (osc1 * 0.5 + osc2 * 0.35 + sq) * env * 0.6
    samples.push(s)
  }
  return samples
}

function generateGameOver() {
  const sr = 44100
  const n = Math.floor(sr * 1.2)
  const samples = new Array(n).fill(0)
  const melody = [
    { freq: 523.25, start: 0, dur: 0.2, vol: 0.4 },
    { freq: 659.25, start: 0.18, dur: 0.2, vol: 0.35 },
    { freq: 783.99, start: 0.36, dur: 0.2, vol: 0.35 },
    { freq: 1046.50, start: 0.54, dur: 0.6, vol: 0.45 },
    { freq: 783.99, start: 0.72, dur: 0.3, vol: 0.2 },
    { freq: 1046.50, start: 0.9, dur: 0.3, vol: 0.25 }
  ]
  for (const note of melody) {
    const startSample = Math.floor(sr * note.start)
    const durSamples = Math.floor(sr * note.dur)
    for (let i = 0; i < durSamples; i++) {
      const idx = startSample + i
      if (idx >= n) break
      const t = i / sr
      const attack = Math.min(1, t * 60)
      const decay = Math.exp(-t * 3)
      const env = attack * decay
      samples[idx] += Math.sin(2 * Math.PI * note.freq * t) * env * note.vol
      samples[idx] += Math.sin(2 * Math.PI * note.freq * 2 * t) * env * note.vol * 0.1
    }
  }
  return samples
}

function generateCellClick() {
  const sr = 44100
  const dur = 0.08
  const n = Math.floor(sr * dur)
  const samples = []
  for (let i = 0; i < n; i++) {
    const t = i / sr
    const env = Math.exp(-t * 40)
    const osc = Math.sin(2 * Math.PI * 800 * t)
    const perc = Math.sin(2 * Math.PI * 2000 * t) * 0.3
    const s = (osc + perc) * env * 0.3
    samples.push(s)
  }
  return samples
}

function generateGameStart() {
  const sr = 44100
  const n = Math.floor(sr * 0.35)
  const samples = new Array(n).fill(0)
  const notes = [
    { freq: 523.25, start: 0, dur: 0.15, vol: 0.35 },
    { freq: 783.99, start: 0.12, dur: 0.2, vol: 0.3 }
  ]
  for (const note of notes) {
    const startSample = Math.floor(sr * note.start)
    const durSamples = Math.floor(sr * note.dur)
    for (let i = 0; i < durSamples; i++) {
      const idx = startSample + i
      if (idx >= n) break
      const t = i / sr
      const attack = Math.min(1, t * 80)
      const decay = Math.exp(-t * 6)
      const env = attack * decay
      samples[idx] += Math.sin(2 * Math.PI * note.freq * t) * env * note.vol
    }
  }
  return samples
}

function generatePlayerJoin() {
  const sr = 44100
  const dur = 0.12
  const n = Math.floor(sr * dur)
  const samples = []
  for (let i = 0; i < n; i++) {
    const t = i / sr
    const env = Math.exp(-t * 15)
    const freq = 600 + (t / dur) * 400
    const osc = Math.sin(2 * Math.PI * freq * t)
    const s = osc * env * 0.25
    samples.push(s)
  }
  return samples
}

function generateStartBuzzing() {
  const sr = 44100
  const dur = 0.2
  const n = Math.floor(sr * dur)
  const samples = []
  for (let i = 0; i < n; i++) {
    const t = i / sr
    const env = Math.exp(-t * 5)
    const freq = 400 + (t / dur) * 600
    const osc1 = Math.sin(2 * Math.PI * freq * t)
    const osc2 = Math.sin(2 * Math.PI * (freq * 1.5) * t) * 0.2
    const s = (osc1 + osc2) * env * 0.3
    samples.push(s)
  }
  return samples
}

function generateButtonPress() {
  const sr = 44100
  const dur = 0.05
  const n = Math.floor(sr * dur)
  const samples = []
  for (let i = 0; i < n; i++) {
    const t = i / sr
    const env = Math.exp(-t * 60)
    const osc = Math.sin(2 * Math.PI * 1200 * t)
    const s = osc * env * 0.2
    samples.push(s)
  }
  return samples
}

function generateQuit() {
  const sr = 44100
  const dur = 0.3
  const n = Math.floor(sr * dur)
  const samples = []
  for (let i = 0; i < n; i++) {
    const t = i / sr
    const env = Math.exp(-t * 5)
    const freq = 300 - (t / dur) * 100
    const osc = Math.sin(2 * Math.PI * freq * t)
    const s = osc * env * 0.3
    samples.push(s)
  }
  return samples
}

function generateCellHover() {
  const sr = 44100
  const dur = 0.04
  const n = Math.floor(sr * dur)
  const samples = []
  for (let i = 0; i < n; i++) {
    const t = i / sr
    const env = Math.exp(-t * 80)
    const osc = Math.sin(2 * Math.PI * 900 * t)
    const s = osc * env * 0.08
    samples.push(s)
  }
  return samples
}

const outDir = path.join(process.cwd(), 'client', 'public', 'sounds')
fs.mkdirSync(outDir, { recursive: true })

fs.writeFileSync(path.join(outDir, 'buzz.wav'), createWav(generateBuzz()))
console.log('Generated: buzz.wav')

fs.writeFileSync(path.join(outDir, 'correct.wav'), createWav(generateCorrect()))
console.log('Generated: correct.wav')

fs.writeFileSync(path.join(outDir, 'wrong.wav'), createWav(generateWrong()))
console.log('Generated: wrong.wav')

fs.writeFileSync(path.join(outDir, 'gameover.wav'), createWav(generateGameOver()))
console.log('Generated: gameover.wav')

fs.writeFileSync(path.join(outDir, 'cell-click.wav'), createWav(generateCellClick()))
console.log('Generated: cell-click.wav')

fs.writeFileSync(path.join(outDir, 'game-start.wav'), createWav(generateGameStart()))
console.log('Generated: game-start.wav')

fs.writeFileSync(path.join(outDir, 'player-join.wav'), createWav(generatePlayerJoin()))
console.log('Generated: player-join.wav')

fs.writeFileSync(path.join(outDir, 'start-buzzing.wav'), createWav(generateStartBuzzing()))
console.log('Generated: start-buzzing.wav')

fs.writeFileSync(path.join(outDir, 'button.wav'), createWav(generateButtonPress()))
console.log('Generated: button.wav')

fs.writeFileSync(path.join(outDir, 'quit.wav'), createWav(generateQuit()))
console.log('Generated: quit.wav')

fs.writeFileSync(path.join(outDir, 'cell-hover.wav'), createWav(generateCellHover()))
console.log('Generated: cell-hover.wav')

console.log('All sounds generated!')
