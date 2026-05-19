import { handleChatRequest } from '../server/chat.js'

function parseBody(body) {
  if (!body) {
    return {}
  }

  if (typeof body === 'string') {
    return JSON.parse(body)
  }

  return body
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS')
    res.status(204).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, message: 'Method not allowed' })
    return
  }

  try {
    const result = await handleChatRequest(parseBody(req.body))

    res.status(result.status).json(result.body)
  } catch (error) {
    res.status(400).json({
      ok: false,
      message: error.message || '请求格式错误'
    })
  }
}
