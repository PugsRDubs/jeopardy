import fs from 'fs'
import path from 'path'

function generateWav(filename, frequency, duration, type = 'sine', volume = 0.5, fadeOut = true) {
  const sampleRate = 44100
  const numSamples = Math.floor(sampleRate * duration)
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
    const t = i / sampleRate
    let sample = 0
    if (type === 'sine') {
      sample = Math.sin(2 * Math.PI * frequency * t)
    } else if (type === 'square') {
      sample = Math.sin(2 * Math.PI * frequency * t) > 0 ? 1 : -1
    } else if (type === 'sweep') {
      const f = frequency + (frequency * 2 * t) / duration
      sample = Math.sin(2 * Math.PI * f * t)
    } else if (type === 'noise' || type === 'sawtooth') {
      sample = (Math.sin(2 * Math.PI * frequency * t) > 0 ? 1 : -1) * 0.5 + (Math.random() * 0.5 - 0.25)
    }
    if (fadeOut && i > numSamples * 0.7) {
      sample *= 1 - (i - numSamples * 0.7) / (numSamples * 0.3)
    }
    sample *= volume
    const intSample = Math.max(-1, Math.min(1, sample))
    buffer.writeInt16LE(Math.floor(intSample * 32767), 44 + i * 2)
  }

  fs.writeFileSync(filename, buffer)
  console.log(`Generated: ${filename}`)
}

const outDir = path.join(process.cwd(), 'client', 'public', 'sounds')
fs.mkdirSync(outDir, { recursive: true })

generateWav(path.join(outDir, 'buzz.wav'), 800, 0.15, 'square', 0.6, false)
generateWav(path.join(outDir, 'correct.wav'), 523, 0.1, 'sine', 0.5, false)
generateWav(path.join(outDir, 'wrong.wav'), 200, 0.3, 'sawtooth', 0.4, true)
generateWav(path.join(outDir, 'gameover.wav'), 440, 0.5, 'sweep', 0.4, true)

console.log('All sounds generated!')
