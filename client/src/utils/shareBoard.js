async function compressData(data) {
  const encoder = new TextEncoder()
  const stream = new Blob([encoder.encode(data)]).stream()
  const compressed = stream.pipeThrough(new CompressionStream('gzip'))
  return new Response(compressed).arrayBuffer()
}

async function decompressData(buffer) {
  const stream = new Blob([buffer]).stream()
  const decompressed = stream.pipeThrough(new DecompressionStream('gzip'))
  return new Response(decompressed).text()
}

function arrayBufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToArrayBuffer(str) {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

export async function encodeBoard(board) {
  const shareData = {
    name: board.name,
    categories: board.categories,
    questions: board.questions
  }
  const json = JSON.stringify(shareData)
  const compressed = await compressData(json)
  return arrayBufferToBase64Url(compressed)
}

export async function decodeBoard(encoded) {
  const buffer = base64UrlToArrayBuffer(encoded)
  const json = await decompressData(buffer)
  const data = JSON.parse(json)
  if (!data.name || !data.categories || !data.questions) {
    throw new Error('Invalid board data')
  }
  return data
}

export function getShareUrl(encoded) {
  return `${window.location.origin}?share=${encoded}`
}
