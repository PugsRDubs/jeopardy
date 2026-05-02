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
  cors: { origin: '*' },
  pingInterval: 10000,
  pingTimeout: 5000,
  transports: ['websocket', 'polling']
})

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
    const game = getGame(code)
    callback({ exists: !!game, phase: game ? game.phase : null })
  })

  socket.on('game:create', ({ board }, callback) => {
    const code = createGame(socket.id, board)
    socket.join(code)
    callback({ code })
  })

  socket.on('game:join', ({ code, name }, callback) => {
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
    const player = { id: socket.id, name, score: 0, disconnected: false }
    game.players.push(player)
    socket.join(game.code)
    const playerList = game.players.map(p => ({ id: p.id, name: p.name, score: p.score, disconnected: p.disconnected }))
    io.to(game.hostId).emit('game:player-list', playerList)
    callback({ success: true, player })
  })

  socket.on('game:reconnect', ({ code, name }, callback) => {
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
  })

  socket.on('game:kick', ({ code, playerId }) => {
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
  })

  socket.on('game:started', ({ code }) => {
    const game = getGame(code)
    if (!game || game.hostId !== socket.id) return
    if (game.players.length < 2) {
      socket.emit('game:error', { message: 'Need at least 2 players' })
      return
    }
    game.phase = 'GRID'
    broadcastPhase(game, 'GRID')
  })

  socket.on('game:select-question', ({ code, catIdx, valIdx }) => {
    const game = getGame(code)
    if (!game || game.hostId !== socket.id) return
    if (game.phase !== 'GRID') return
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
  })

  socket.on('game:start-buzzing', ({ code }) => {
    const game = getGame(code)
    if (!game || game.hostId !== socket.id) return
    if (game.phase !== 'REVEALED') return
    game.phase = 'BUZZING'
    broadcastPhase(game, 'BUZZING', { failedPlayers: game.failedPlayers })
  })

  socket.on('game:back', ({ code }) => {
    const game = getGame(code)
    if (!game || game.hostId !== socket.id) return
    if (game.phase !== 'REVEALED') return
    game.phase = 'GRID'
    game.currentQuestion = null
    broadcastPhase(game, 'GRID')
  })

  socket.on('game:buzz', ({ code }) => {
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
        playerName: player.name,
        question: game.board.questions[game.currentQuestion.catIdx][game.currentQuestion.valIdx].question,
        answer: game.board.questions[game.currentQuestion.catIdx][game.currentQuestion.valIdx].answer
      })
      io.to(socket.id).emit('game:you-buzzed')
      broadcastPhase(game, 'ANSWERING')
    }
  })

  socket.on('game:cancel-buzzing', ({ code }) => {
    const game = getGame(code)
    if (!game || game.hostId !== socket.id) return
    if (game.phase !== 'BUZZING') return
    game.phase = 'REVEALED'
    broadcastPhase(game, 'REVEALED')
  })

  socket.on('game:answer-correct', ({ code }) => {
    const game = getGame(code)
    if (!game || game.hostId !== socket.id) return
    if (game.phase !== 'ANSWERING') return
    const player = game.players.find(p => p.id === game.firstBuzz)
    if (player) {
      player.score += (game.currentQuestion.valIdx + 1) * 100
      io.to(game.code).emit('game:score-update', { playerId: player.id, score: player.score })
    }
    handleQuestionEnd(game)
  })

  socket.on('game:answer-wrong', ({ code }) => {
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
  })

  socket.on('game:cancel-answer', ({ code }) => {
    const game = getGame(code)
    if (!game || game.hostId !== socket.id) return
    if (game.phase !== 'ANSWERING') return
    game.phase = 'GRID'
    game.currentQuestion = null
    game.buzzedPlayers = []
    game.failedPlayers = []
    game.firstBuzz = null
    broadcastPhase(game, 'GRID')
  })

  socket.on('game:end-question', ({ code }) => {
    const game = getGame(code)
    if (!game || game.hostId !== socket.id) return
    if (game.phase !== 'ANSWERING' && game.phase !== 'BUZZING') return
    handleQuestionEnd(game)
  })

  socket.on('game:continue', ({ code }) => {
    const game = getGame(code)
    if (!game || game.hostId !== socket.id) return
    if (game.phase !== 'QUESTION_ENDED') return
    game.phase = 'GRID'
    broadcastPhase(game, 'GRID')
  })

  socket.on('game:host-quit', ({ code }) => {
    const game = getGame(code)
    if (!game || game.hostId !== socket.id) return
    io.to(game.code).emit('game:host-quit')
    games.delete(code)
  })

  socket.on('disconnect', () => {
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
