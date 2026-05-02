import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { customAlphabet } from 'nanoid'
import path from 'path'
import fs from 'fs'

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
const generateCode = customAlphabet(ALPHABET, 6)

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    credentials: true
  },
  pingInterval: 3000,
  pingTimeout: 5000,
  transports: ['websocket', 'polling']
})

function validateBoard(board) {
  if (!board || typeof board !== 'object') return false
  if (!Array.isArray(board.categories) || board.categories.length !== 6) return false
  if (!Array.isArray(board.questions) || board.questions.length !== 6) return false
  for (let i = 0; i < 6; i++) {
    if (typeof board.categories[i] !== 'string' || board.categories[i].trim() === '') return false
    if (!Array.isArray(board.questions[i]) || board.questions[i].length !== 5) return false
    for (let j = 0; j < 5; j++) {
      const q = board.questions[i][j]
      if (!q || typeof q !== 'object') return false
      if (typeof q.question !== 'string' || q.question.trim() === '') return false
      if (typeof q.answer !== 'string' || q.answer.trim() === '') return false
    }
  }
  return true
}

function validateName(name) {
  if (typeof name !== 'string') return false
  const trimmed = name.trim()
  return trimmed.length >= 1 && trimmed.length <= 20
}

function validateIndices(catIdx, valIdx) {
  return Number.isInteger(catIdx) && catIdx >= 0 && catIdx < 6 &&
         Number.isInteger(valIdx) && valIdx >= 0 && valIdx < 5
}

const games = new Map()

function getGame(code) {
  return games.get(code.toUpperCase())
}

function buildLeaderboard(game) {
  const sorted = [...game.players].sort((a, b) => b.score - a.score)
  const result = []
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i]
    const rank = i === 0 ? 1 : (p.score === sorted[i - 1].score ? result[i - 1].rank : i + 1)
    result.push({ id: p.id, name: p.name, score: p.score, rank })
  }
  return result
}

function checkGameOver(game) {
  const totalQuestions = game.board.categories.length * 5
  if (game.questionsCompleted >= totalQuestions) {
    game.phase = 'GAME_OVER'
    return buildLeaderboard(game)
  }
  return null
}

function createGame(hostId, board) {
  const code = generateCode()
  games.set(code, {
    code,
    hostId,
    board,
    players: [],
    phase: 'LOBBY',
    currentQuestion: null,
    buzzedPlayers: [],
    failedPlayers: [],
    firstBuzz: null,
    questionsCompleted: 0,
    questionStates: board.categories.map(() => new Array(5).fill(false))
  })
  return code
}

function endQuestion(game) {
  if (game.currentQuestion) {
    const { catIdx, valIdx } = game.currentQuestion
    if (!game.questionStates[catIdx][valIdx]) {
      game.questionStates[catIdx][valIdx] = true
      game.questionsCompleted++
    }
  }
  game.currentQuestion = null
  game.buzzedPlayers = []
  game.failedPlayers = []
  game.firstBuzz = null
}

function broadcastPhase(game, phase, extra = {}) {
  io.to(game.code).emit('game:phase-change', { phase, ...extra })
}

function handleQuestionEnd(game) {
  const answer = game.currentQuestion
    ? game.board.questions[game.currentQuestion.catIdx][game.currentQuestion.valIdx].answer
    : ''
  const question = game.currentQuestion
    ? game.board.questions[game.currentQuestion.catIdx][game.currentQuestion.valIdx].question
    : ''
  endQuestion(game)
  const playerList = game.players.map(p => ({ id: p.id, name: p.name, score: p.score, disconnected: p.disconnected }))
  io.to(game.hostId).emit('game:player-list', playerList)
  io.to(game.hostId).emit('game:question-states', game.questionStates)
  const leaderboard = checkGameOver(game)
  if (leaderboard) {
    broadcastPhase(game, 'GAME_OVER', { leaderboard })
  } else {
    game.phase = 'QUESTION_ENDED'
    io.to(game.hostId).emit('game:question-ended', { question, answer, leaderboard: buildLeaderboard(game) })
    broadcastPhase(game, 'QUESTION_ENDED')
  }
}

io.on('connection', (socket) => {
  socket.on('game:check', ({ code }, callback) => {
    try {
      const game = getGame(code)
      callback({ exists: !!game, phase: game ? game.phase : null })
    } catch (err) {
      console.error('Error in game:check:', err)
      callback({ error: 'Internal server error' })
    }
  })

  socket.on('game:create', ({ board }) => {
    try {
      if (!validateBoard(board)) {
        socket.emit('game:error', { message: 'Invalid board data' })
        return
      }
      const code = createGame(socket.id, board)
      socket.join(code)
      socket.emit('game:created', { code })
    } catch (err) {
      console.error('Error in game:create:', err)
      socket.emit('game:error', { message: 'Internal server error' })
    }
  })

  socket.on('game:join', ({ code, name }, callback) => {
    try {
      if (!validateName(name)) {
        callback({ error: 'Invalid name' })
        return
      }
      const game = getGame(code)
      if (!game) {
        callback({ error: 'Game not found' })
        return
      }
      const existingPlayer = game.players.find(p => p.name === name)
      if (existingPlayer) {
        if (!existingPlayer.disconnected) {
          callback({ error: 'Name already taken' })
          return
        }
        existingPlayer.id = socket.id
        existingPlayer.disconnected = false
        socket.join(game.code)
        if (game.phase !== 'LOBBY') {
          const playerList = game.players.map(p => ({ id: p.id, name: p.name, score: p.score, disconnected: p.disconnected }))
          io.to(game.hostId).emit('game:player-list', playerList)
        }
        const leaderboard = game.phase === 'GAME_OVER' ? buildLeaderboard(game) : null
        callback({
          success: true,
          player: existingPlayer,
          reconnected: true,
          gameState: {
            phase: game.phase,
            score: existingPlayer.score,
            leaderboard
          }
        })
        return
      }
      if (game.phase !== 'LOBBY') {
        callback({ error: 'Game already in progress' })
        return
      }
      const player = { id: socket.id, name: name.trim(), score: 0, disconnected: false }
      game.players.push(player)
      socket.join(game.code)
      const playerList = game.players.map(p => ({ id: p.id, name: p.name, score: p.score, disconnected: p.disconnected }))
      io.to(game.hostId).emit('game:player-list', playerList)
      callback({ success: true, player })
    } catch (err) {
      console.error('Error in game:join:', err)
      callback({ error: 'Internal server error' })
    }
  })

  socket.on('game:reconnect', ({ code, name }, callback) => {
    try {
      if (!validateName(name)) {
        callback({ error: 'Invalid name' })
        return
      }
      const game = getGame(code)
      if (!game) {
        callback({ error: 'Game not found' })
        return
      }
      const player = game.players.find(p => p.name === name)
      if (!player) {
        callback({ error: 'Player not found in game' })
        return
      }
      player.id = socket.id
      player.disconnected = false
      socket.join(game.code)
      if (game.phase !== 'LOBBY') {
        const playerList = game.players.map(p => ({ id: p.id, name: p.name, score: p.score, disconnected: p.disconnected }))
        io.to(game.hostId).emit('game:player-list', playerList)
      }
      const leaderboard = game.phase === 'GAME_OVER' ? buildLeaderboard(game) : null
      callback({
        success: true,
        player,
        gameState: {
          phase: game.phase,
          score: player.score,
          leaderboard
        }
      })
    } catch (err) {
      console.error('Error in game:reconnect:', err)
      callback({ error: 'Internal server error' })
    }
  })

  socket.on('game:kick', ({ code, playerId }) => {
    try {
      const game = getGame(code)
      if (!game || game.hostId !== socket.id) return
      if (game.phase !== 'LOBBY') return
      const playerIdx = game.players.findIndex(p => p.id === playerId)
      if (playerIdx !== -1) {
        const kickedPlayer = game.players[playerIdx]
        io.to(kickedPlayer.id).emit('game:kicked')
        game.players.splice(playerIdx, 1)
        const playerList = game.players.map(p => ({ id: p.id, name: p.name, score: p.score, disconnected: p.disconnected }))
        io.to(game.code).emit('game:player-list', playerList)
      }
    } catch (err) {
      console.error('Error in game:kick:', err)
    }
  })

  socket.on('game:started', ({ code }) => {
    try {
      const game = getGame(code)
      if (!game || game.hostId !== socket.id) return
      if (game.players.length < 2) {
        socket.emit('game:error', { message: 'Need at least 2 players' })
        return
      }
      game.phase = 'GRID'
      broadcastPhase(game, 'GRID')
    } catch (err) {
      console.error('Error in game:started:', err)
    }
  })

  socket.on('game:select-question', ({ code, catIdx, valIdx }) => {
    try {
      const game = getGame(code)
      if (!game || game.hostId !== socket.id) return
      if (game.phase !== 'GRID') return
      if (!validateIndices(catIdx, valIdx)) return
      if (game.questionStates[catIdx][valIdx]) return
      game.phase = 'REVEALED'
      game.currentQuestion = { catIdx, valIdx }
      game.buzzedPlayers = []
      game.failedPlayers = []
      game.firstBuzz = null
      io.to(game.hostId).emit('game:question-reveal', {
        category: game.board.categories[catIdx],
        value: (valIdx + 1) * 100,
        question: game.board.questions[catIdx][valIdx].question,
        answer: game.board.questions[catIdx][valIdx].answer,
        catIdx,
        valIdx
      })
      broadcastPhase(game, 'REVEALED')
    } catch (err) {
      console.error('Error in game:select-question:', err)
    }
  })

  socket.on('game:start-buzzing', ({ code }) => {
    try {
      const game = getGame(code)
      if (!game || game.hostId !== socket.id) return
      if (game.phase !== 'REVEALED') return
      game.phase = 'BUZZING'
      broadcastPhase(game, 'BUZZING', { failedPlayers: game.failedPlayers })
    } catch (err) {
      console.error('Error in game:start-buzzing:', err)
    }
  })

  socket.on('game:back', ({ code }) => {
    try {
      const game = getGame(code)
      if (!game || game.hostId !== socket.id) return
      if (game.phase !== 'REVEALED') return
      game.phase = 'GRID'
      game.currentQuestion = null
      broadcastPhase(game, 'GRID')
    } catch (err) {
      console.error('Error in game:back:', err)
    }
  })

  socket.on('game:buzz', ({ code }) => {
    try {
      const game = getGame(code)
      if (!game || game.phase !== 'BUZZING') return
      if (game.failedPlayers.includes(socket.id)) return
      if (game.buzzedPlayers.includes(socket.id)) return
      const player = game.players.find(p => p.id === socket.id)
      if (!player) return
      game.buzzedPlayers.push(socket.id)
      if (game.buzzedPlayers.length === 1) {
        game.firstBuzz = socket.id
        game.phase = 'ANSWERING'
        io.to(game.hostId).emit('game:first-buzz', {
          playerId: socket.id,
          playerName: player.name
        })
        io.to(socket.id).emit('game:you-buzzed')
        broadcastPhase(game, 'ANSWERING')
      }
    } catch (err) {
      console.error('Error in game:buzz:', err)
    }
  })

  socket.on('game:cancel-buzzing', ({ code }) => {
    try {
      const game = getGame(code)
      if (!game || game.hostId !== socket.id) return
      if (game.phase !== 'BUZZING') return
      game.phase = 'REVEALED'
      broadcastPhase(game, 'REVEALED')
    } catch (err) {
      console.error('Error in game:cancel-buzzing:', err)
    }
  })

  socket.on('game:answer-correct', ({ code }) => {
    try {
      const game = getGame(code)
      if (!game || game.hostId !== socket.id) return
      if (game.phase !== 'ANSWERING') return
      const player = game.players.find(p => p.id === game.firstBuzz)
      if (player) {
        player.score += (game.currentQuestion.valIdx + 1) * 100
        io.to(game.code).emit('game:score-update', { playerId: player.id, score: player.score })
      }
      handleQuestionEnd(game)
    } catch (err) {
      console.error('Error in game:answer-correct:', err)
    }
  })

  socket.on('game:answer-wrong', ({ code }) => {
    try {
      const game = getGame(code)
      if (!game || game.hostId !== socket.id) return
      if (game.phase !== 'ANSWERING') return
      game.failedPlayers.push(game.firstBuzz)
      const activePlayers = game.players.filter(p => !game.failedPlayers.includes(p.id) && !p.disconnected)
      if (activePlayers.length === 0) {
        handleQuestionEnd(game)
      } else {
        game.buzzedPlayers = []
        game.firstBuzz = null
        game.phase = 'BUZZING'
        broadcastPhase(game, 'BUZZING', { failedPlayers: game.failedPlayers })
      }
    } catch (err) {
      console.error('Error in game:answer-wrong:', err)
    }
  })

  socket.on('game:cancel-answer', ({ code }) => {
    try {
      const game = getGame(code)
      if (!game || game.hostId !== socket.id) return
      if (game.phase !== 'ANSWERING') return
      game.phase = 'GRID'
      game.currentQuestion = null
      game.buzzedPlayers = []
      game.failedPlayers = []
      game.firstBuzz = null
      broadcastPhase(game, 'GRID')
    } catch (err) {
      console.error('Error in game:cancel-answer:', err)
    }
  })

  socket.on('game:end-question', ({ code }) => {
    try {
      const game = getGame(code)
      if (!game || game.hostId !== socket.id) return
      if (game.phase !== 'ANSWERING' && game.phase !== 'BUZZING') return
      handleQuestionEnd(game)
    } catch (err) {
      console.error('Error in game:end-question:', err)
    }
  })

  socket.on('game:continue', ({ code }) => {
    try {
      const game = getGame(code)
      if (!game || game.hostId !== socket.id) return
      if (game.phase !== 'QUESTION_ENDED') return
      game.phase = 'GRID'
      broadcastPhase(game, 'GRID')
    } catch (err) {
      console.error('Error in game:continue:', err)
    }
  })

  socket.on('game:host-quit', ({ code }) => {
    try {
      const game = getGame(code)
      if (!game || game.hostId !== socket.id) return
      io.to(game.code).emit('game:host-quit')
      games.delete(code)
    } catch (err) {
      console.error('Error in game:host-quit:', err)
    }
  })

  socket.on('disconnect', () => {
    try {
      for (const [code, game] of games) {
        if (game.hostId === socket.id) {
          io.to(game.code).emit('host:disconnect')
          games.delete(code)
          return
        }
        const playerIdx = game.players.findIndex(p => p.id === socket.id)
        if (playerIdx !== -1) {
          if (game.phase === 'LOBBY') {
            game.players.splice(playerIdx, 1)
            const playerList = game.players.map(p => ({ id: p.id, name: p.name, score: p.score, disconnected: p.disconnected }))
            io.to(game.hostId).emit('game:player-list', playerList)
          } else {
            game.players[playerIdx].disconnected = true
            const playerList = game.players.map(p => ({ id: p.id, name: p.name, score: p.score, disconnected: p.disconnected }))
            io.to(game.hostId).emit('game:player-list', playerList)
          }
        }
      }
    } catch (err) {
      console.error('Error in disconnect handler:', err)
    }
  })
})

const PORT = process.env.PORT || 3001

const distPath = path.join(process.cwd(), '..', 'client', 'dist')
app.use(express.static(distPath))
app.get('*', (req, res) => {
  if (req.url.startsWith('/socket.io')) return
  const indexPath = path.join(distPath, 'index.html')
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath)
  } else {
    res.status(503).send('App is building, please refresh in a moment.')
  }
})

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
