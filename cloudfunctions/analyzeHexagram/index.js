let cloud

try {
  cloud = require('wx-server-sdk')
} catch (error) {
  cloud = {
    DYNAMIC_CURRENT_ENV: null,
    init() {}
  }
}

const https = require('https')
const {
  DISCLAIMER,
  REQUIRED_SECTION_TITLES,
  SYSTEM_PROMPT,
  buildUserPrompt
} = require('./prompt')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const DEFAULT_BASE_URL = 'https://api.openai.com/v1/chat/completions'
const DEFAULT_MODEL = 'gpt-4o-mini'
const FORBIDDEN_PATTERNS = [
  /必然/g,
  /一定失败/g,
  /百分百/g,
  /100%/g,
  /绝对准确/g,
  /花钱化解/g,
  /改命/g,
  /转运/g
]

function createFallbackSections(reason) {
  return [
    {
      title: '直接结论',
      content: '当前暂未取得 AI 解读结果。你可以先把本次卦象作为一个提醒：围绕问题本身梳理现实条件、可行动项和风险点。'
    },
    {
      title: '卦象识别',
      content: '本卦、变卦、动爻均以程序排盘结果为准，AI 不参与重新识别。'
    },
    {
      title: '本卦含义',
      content: '本卦含义将在 AI 服务配置完成后生成。'
    },
    {
      title: '变卦趋势',
      content: '变卦趋势将在 AI 服务配置完成后生成。'
    },
    {
      title: '动爻分析',
      content: '动爻提示将在 AI 服务配置完成后生成。'
    },
    {
      title: '针对用户问题的判断',
      content: '建议先把问题拆成可验证的信息、可选择的路径和需要等待的外部条件，不把卦象当作确定结论。'
    },
    {
      title: '现实行动建议',
      content: '记录当下最重要的一个行动、一个备选方案和一个需要求证的信息，再结合实际反馈调整。'
    },
    {
      title: '免责声明',
      content: `${DISCLAIMER}。${reason ? `当前使用兜底文案：${reason}` : ''}`
    }
  ]
}

function sanitizeText(text) {
  return FORBIDDEN_PATTERNS.reduce((value, pattern) => {
    return value.replace(pattern, '较为确定的表达')
  }, text)
}

function normalizeSections(sections) {
  if (!Array.isArray(sections)) {
    return null
  }

  const sectionMap = sections.reduce((map, section) => {
    if (section && section.title) {
      map[section.title] = section.content || ''
    }

    return map
  }, {})

  return REQUIRED_SECTION_TITLES.map((title) => {
    const content = sectionMap[title] || ''
    const safeContent = sanitizeText(content)

    return {
      title,
      content: title === '免责声明' && !safeContent.includes(DISCLAIMER)
        ? `${safeContent ? `${safeContent}\n` : ''}${DISCLAIMER}`
        : safeContent
    }
  })
}

function parseModelContent(content) {
  try {
    const parsed = JSON.parse(content)
    const sections = normalizeSections(parsed.sections)

    if (!sections) {
      throw new Error('AI response does not contain sections')
    }

    return sections
  } catch (error) {
    return [
      ...createFallbackSections('AI 返回格式暂不可解析').slice(0, 7),
      {
        title: '免责声明',
        content: `${DISCLAIMER}。AI 原始返回未按结构化格式输出，已使用兜底展示。`
      }
    ]
  }
}

function requestJson(url, apiKey, body) {
  return new Promise((resolve, reject) => {
    const requestUrl = new URL(url)
    const payload = JSON.stringify(body)
    const req = https.request({
      method: 'POST',
      hostname: requestUrl.hostname,
      path: `${requestUrl.pathname}${requestUrl.search}`,
      port: requestUrl.port || 443,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 30000
    }, (res) => {
      const chunks = []

      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8')

        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`AI API error ${res.statusCode}: ${raw.slice(0, 200)}`))
          return
        }

        try {
          resolve(JSON.parse(raw))
        } catch (error) {
          reject(new Error('AI API returned invalid JSON'))
        }
      })
    })

    req.on('timeout', () => {
      req.destroy(new Error('AI API timeout'))
    })
    req.on('error', reject)
    req.write(payload)
    req.end()
  })
}

function buildModelPayload(event) {
  return {
    model: process.env.AI_MODEL || DEFAULT_MODEL,
    temperature: 0.4,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(event) }
    ],
    response_format: { type: 'json_object' }
  }
}

exports.main = async (event) => {
  const apiKey = process.env.AI_API_KEY

  if (!event || !event.originalHexagram || !event.changedHexagram || !event.linesFromBottom) {
    return {
      ok: false,
      source: 'fallback',
      sections: createFallbackSections('缺少完整排盘数据')
    }
  }

  if (!apiKey) {
    return {
      ok: false,
      source: 'fallback',
      sections: createFallbackSections('云函数未配置 AI_API_KEY')
    }
  }

  try {
    const response = await requestJson(
      process.env.AI_BASE_URL || DEFAULT_BASE_URL,
      apiKey,
      buildModelPayload(event)
    )
    const content = response.choices &&
      response.choices[0] &&
      response.choices[0].message &&
      response.choices[0].message.content

    if (!content) {
      throw new Error('AI response missing message content')
    }

    return {
      ok: true,
      source: 'ai',
      sections: parseModelContent(content)
    }
  } catch (error) {
    return {
      ok: false,
      source: 'fallback',
      sections: createFallbackSections(error.message || 'AI 调用失败')
    }
  }
}

module.exports._private = {
  buildModelPayload,
  createFallbackSections,
  normalizeSections,
  parseModelContent
}
