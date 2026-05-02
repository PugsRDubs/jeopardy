import { nanoid } from 'nanoid'

const STORAGE_KEY = 'trivia-boards'

function getBoards() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function saveBoards(boards) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(boards))
}

function createBoard(name) {
  const boards = getBoards()
  const board = {
    id: nanoid(),
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    categories: new Array(6).fill(''),
    questions: Array.from({ length: 6 }, () =>
      Array.from({ length: 5 }, () => ({ question: '', answer: '' }))
    )
  }
  boards.push(board)
  saveBoards(boards)
  return board
}

function updateBoard(updatedBoard) {
  const boards = getBoards()
  const idx = boards.findIndex(b => b.id === updatedBoard.id)
  if (idx === -1) return null
  boards[idx] = { ...updatedBoard, updatedAt: Date.now() }
  saveBoards(boards)
  return boards[idx]
}

function deleteBoard(id) {
  const boards = getBoards()
  saveBoards(boards.filter(b => b.id !== id))
}

function renameBoard(id, newName) {
  const boards = getBoards()
  const board = boards.find(b => b.id === id)
  if (board) {
    board.name = newName
    board.updatedAt = Date.now()
    saveBoards(boards)
  }
}

function getBoard(id) {
  return getBoards().find(b => b.id === id)
}

function importBoard(boardData) {
  const boards = getBoards()
  const board = {
    id: nanoid(),
    name: boardData.name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    categories: boardData.categories,
    questions: boardData.questions
  }
  boards.push(board)
  saveBoards(boards)
  return board
}

export { getBoards, createBoard, updateBoard, deleteBoard, renameBoard, getBoard, importBoard }
