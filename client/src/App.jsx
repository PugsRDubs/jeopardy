import { useState, useEffect, useRef } from 'react'
import io from 'socket.io-client'
import Home from './pages/Home'
import JoinGame from './pages/JoinGame'
import PlayerView from './pages/PlayerView'
import HostSelect from './pages/HostSelect'
import Lobby from './pages/Lobby'
import GameGrid from './pages/GameGrid'
import GameOver from './pages/GameOver'
import { decodeBoard, encodeBoard } from './utils/shareBoard'
import { importBoard, createBoard, getBoards, updateBoard } from './utils/boardStorage'

const socket = io({
  transports: ['polling', 'websocket'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 10
})

function App() {
  const [page, setPage] = useState('home')
  const [playerData, setPlayerData] = useState(null)
  const [gameState, setGameState] = useState(null)
  const [gameCode, setGameCode] = useState(null)
  const [currentBoard, setCurrentBoard] = useState(null)
  const [leaderboard, setLeaderboard] = useState(null)
  const [codeValidated, setCodeValidated] = useState(false)
  const [codeError, setCodeError] = useState('')
  const [importMsg, setImportMsg] = useState('')
  const [creating, setCreating] = useState(false)
  const importProcessed = useRef(false)
  const gameStartSound = useRef(null)
  const buttonSound = useRef(null)

  useEffect(() => {
    gameStartSound.current = new Audio('/sounds/game-start.wav')
    buttonSound.current = new Audio('/sounds/button.wav')
  }, [])

  useEffect(() => {
    if (importProcessed.current) return
    const params = new URLSearchParams(window.location.search)
    const share = params.get('share')
    if (share) {
      importProcessed.current = true
      decodeBoard(share)
          .then((board) => {
            importBoard(board)
            sessionStorage.setItem('importMsg', `Imported "${board.name}"!`)
            params.delete('share')
            const cleanUrl = params.toString()
              ? `${window.location.pathname}?${params}`
              : window.location.pathname
            window.history.replaceState({}, '', cleanUrl)
            setPage('host-select')
          })
        .catch(() => {
          sessionStorage.setItem('importMsg', 'Failed to import board. Invalid link.')
          setPage('host-select')
        })
    }
  }, [])

  useEffect(() => {
    const handler = ({ code }) => {
      console.log('App: game:created received', code)
      setCreating(false)
      setGameCode(code)
      setPage('lobby')
    }
    socket.on('game:created', handler)
    return () => socket.off('game:created', handler)
  }, [])

  useEffect(() => {
    const handler = () => {
      setCodeError('You have been kicked from the game')
      setPage('home')
      setPlayerData(null)
      setGameCode(null)
      setCodeValidated(false)
    }
    socket.on('game:kicked', handler)
    return () => socket.off('game:kicked', handler)
  }, [])

  const goHome = () => {
    setPage('home')
    setPlayerData(null)
    setGameState(null)
    setGameCode(null)
    setCurrentBoard(null)
    setLeaderboard(null)
    setCodeValidated(false)
    setCodeError('')
    setCreating(false)
  }

  const handleCodeSubmit = (code) => {
    setCodeValidated(false)
    setCodeError('')
    socket.emit('game:check', { code }, (response) => {
      if (!response.exists) {
        setCodeError('Game not found')
        return
      }
      setCodeValidated(true)
      setGameCode(code)
      setPage('join')
    })
  }

  return (
    <>
       {page === 'home' && (
        <Home
          onJoin={handleCodeSubmit}
          codeError={codeError}
          onHost={() => setPage('host-select')}
        />
      )}
      {page === 'join' && (
        <JoinGame
          code={gameCode}
          socket={socket}
          onConnected={(player, gs) => {
            setPlayerData(player)
            setGameState(gs)
            if (gs && gs.phase === 'GAME_OVER') {
              setLeaderboard(gs.leaderboard)
              setPage('game-over')
            } else {
              setPage('player')
            }
          }}
          onBack={() => { setGameCode(null); setCodeValidated(false); setPage('home') }}
        />
      )}
      {page === 'player' && (
        <PlayerView
          socket={socket}
          playerData={playerData}
          gameCode={gameCode}
          gameState={gameState}
          onDisconnect={() => {
            setPage('home')
            setPlayerData(null)
            setGameCode(null)
          }}
        />
      )}
       {page === 'host-select' && (
        <HostSelect
          socket={socket}
          creating={creating}
          onBack={goHome}
          onEditBoard={(board) => {
            const boardToEdit = board || createBoard('New Board')
            sessionStorage.setItem('boardToEdit', JSON.stringify(boardToEdit))
            setPage('create-board')
          }}
          onSelectBoard={(board) => {
            console.log('App: onSelectBoard called', board.name)
            setCreating(true)
            setCurrentBoard(board)
            // Update board's updatedAt so it sorts to top
            board.updatedAt = Date.now()
            updateBoard(board)
            socket.emit('game:create', { board })
          }}
        />
      )}
      {page === 'lobby' && (
        <Lobby
          socket={socket}
          gameCode={gameCode}
          onBack={goHome}
          onKick={(playerId) => {
            socket.emit('game:kick', { code: gameCode, playerId })
          }}
          onStart={() => {
            if (gameStartSound.current) {
              gameStartSound.current.currentTime = 0
              gameStartSound.current.play()
            }
            socket.emit('game:started', { code: gameCode })
            setPage('game-grid')
          }}
        />
      )}
      {page === 'game-grid' && (
        <GameGrid
          socket={socket}
          gameCode={gameCode}
          board={currentBoard}
          onGameOver={(lb) => {
            setLeaderboard(lb)
            setPage('game-over')
          }}
          onBack={goHome}
        />
      )}
       {page === 'game-over' && (
        <GameOver
          leaderboard={leaderboard || []}
          onBack={goHome}
        />
      )}
    </>
  )
}

export default App
