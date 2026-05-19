import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { handleChatRequest } from './chat.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.resolve(__dirname, '../public')
const preferredPort = Number(process.env.PORT || 5175)

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml'
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  })
  res.end(JSON.stringify(payload))
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0

    req.on('data', (chunk) => {
      size += chunk.length

      if (size > 1024 * 1024) {
        reject(new Error('Request body too large'))
        req.destroy()
        return
      }

      chunks.push(chunk)
    })
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')

      if (!raw) {
        resolve({})
        return
      }

      try {
        resolve(JSON.parse(raw))
      } catch (error) {
        reject(new Error('Request body must be JSON'))
      }
    })
    req.on('error', reject)
  })
}

async function handleApi(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      Allow: 'POST, OPTIONS'
    })
    res.end()
    return
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, message: 'Method not allowed' })
    return
  }

  try {
    const body = await readRequestBody(req)
    const result = await handleChatRequest(body)
    sendJson(res, result.status, result.body)
  } catch (error) {
    sendJson(res, 400, {
      ok: false,
      message: error.message || '请求格式错误'
    })
  }
}

async function serveStatic(req, res) {
  const url = new URL(req.url, 'http://localhost')
  const decodedPath = decodeURIComponent(url.pathname)
  const relativePath = decodedPath === '/' ? '/index.html' : decodedPath
  let filePath = path.resolve(publicDir, `.${relativePath}`)

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403)
    res.end('Forbidden')
    return
  }

  try {
    const fileStat = await stat(filePath)

    if (fileStat.isDirectory()) {
      filePath = path.join(filePath, 'index.html')
    }

    const content = await readFile(filePath)
    const ext = path.extname(filePath).toLowerCase()

    res.writeHead(200, {
      'Content-Type': CONTENT_TYPES[ext] || 'application/octet-stream'
    })
    res.end(content)
  } catch (error) {
    const content = await readFile(path.join(publicDir, 'index.html'))

    res.writeHead(200, {
      'Content-Type': CONTENT_TYPES['.html']
    })
    res.end(content)
  }
}

const server = createServer((req, res) => {
  if (req.url.startsWith('/api/chat')) {
    handleApi(req, res)
    return
  }

  serveStatic(req, res)
})

function listen(port) {
  server.once('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      listen(port + 1)
      return
    }

    throw error
  })

  server.listen(port, () => {
    console.log(`H5 dev server: http://localhost:${port}`)
  })
}

listen(preferredPort)
