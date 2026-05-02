import { useState } from 'react'
import io from 'socket.io-client'
import Home from './pages/Home'
import JoinGame from './pages/JoinGame'
import PlayerView from './pages/PlayerView'
import HostSelect from './pages/HostSelect'
import Lobby from './pages/Lobby'
import GameGrid from './pages/GameGrid'
import GameOver from './pages/GameOver'
import CreateBoard from './pages/CreateBoard'

const socket = io()

function App() {
  const [page, setPage] = useState('home')
  const [playerData, setPlayerData] = useState(null)
  const [gameState, setGameState] = useState(null)
  const [gameCode, setGameCode] = useState(null)
  const [currentBoard, setCurrentBoard] = useState(null)
  const [leaderboard, setLeaderboard] = useState(null)
  const [codeValidated, setCodeValidated] = useState(false)
  const [codeError, setCodeError] = useState('')

  const goHome = () => {
    setPage('home')
    setPlayerData(null)
    setGameState(null)
    setGameCode(null)
    setCurrentBoard(null)
    setLeaderboard(null)
    setCodeValidated(false)
    setCodeError('')
  }

  const handleCodeSubmit = async (code) => {
    setCodeValidated(false)
    setCodeError('')
    socket.emit('game:check', { code }, (response) => {
      if (!response.exists) {
        setCodeError('Game not found')
        return
      }
      if (response.phase !== 'LOBBY') {
        setCodeError('Game already in progress')
        return
      }
      setCodeValidated(true)
      setGameCode(code)
      setPage('join')
    })
  }

  socket.on('game:kicked', () => {
    setCodeError('You have been kicked from the game')
    setPage('home')
    setPlayerData(null)
    setGameCode(null)
    setCodeValidated(false)
  })

  return (
    <>
      {page === 'home' && (
        <Home
          onJoin={handleCodeSubmit}
          codeError={codeError}
          onHost={() => setPage('host-select')}
          onCreate={() => setPage('create-board')}
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
          onBack={goHome}
          onCreateNew={() => setPage('create-board')}
          onSelectBoard={(board) => {
            setCurrentBoard(board)
            socket.emit('game:create', { board }, ({ code }) => {
              setGameCode(code)
              setPage('lobby')
            })
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
      {page === 'create-board' && (
        <CreateBoard
          onBack={goHome}
        />
      )}
    </>
  )
}

export default App
