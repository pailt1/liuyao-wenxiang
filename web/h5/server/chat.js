import {
  buildDisplayLines,
  calculateHexagram,
  createLineFromScore,
  loadHexagramData
} from '../public/shared/hexagram.js'
import HEXAGRAM_DATA from './hexagram-data.js'

export const DISCLAIMER = '仅供传统文化学习与自我反思参考'

export const REQUIRED_SECTION_TITLES = [
  '直接结论',
  '卦象识别',
  '本卦含义',
  '变卦趋势',
  '动爻分析',
  '针对用户问题的判断',
  '现实行动建议',
  '免责声明'
]

const DEFAULT_DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-chat'
const MAX_QUESTION_LENGTH = 120
const FORBIDDEN_PATTERNS = [
  /必然/g,
  /一定失败/g,
  /一定成功/g,
  /百分百/g,
  /100%/g,
  /绝对准确/g,
  /花钱化解/g,
  /改命/g,
  /转运/g
]

const SYSTEM_PROMPT = [
  '你是一名“易经六爻文化解读助手”，你的任务是根据系统已经计算好的卦象数据进行解释。',
  '',
  '重要规则：',
  '1. 不允许重新识别卦象。',
  '2. 必须以输入数据中的本卦、变卦、动爻为准。',
  '3. 不得输出“必然发生”“百分百成功”“一定失败”等绝对化判断。',
  '4. 必须把解读定位为传统文化参考、心理反思和行动建议。',
  '5. 对考试、求职、感情、健康、投资等问题，要给出现实层面的建议。',
  '6. 语气要清晰、直接、克制，不恐吓用户，不制造焦虑。',
  `7. 输出必须包含：${REQUIRED_SECTION_TITLES.join('、')}。`,
  `8. 免责声明必须包含“${DISCLAIMER}”。`,
  '9. 必须根据本次输入的本卦、变卦、动爻、六爻结构给出差异化分析，不允许只按问题类型套用通用答案。',
  '10. 如果同一个问题对应不同卦象，结论、趋势和行动建议必须体现卦象差异。',
  '11. 直接结论必须点名本卦、变卦或动爻中的至少两个具体信息。',
  '',
  '请只返回 JSON，不要返回 Markdown。JSON 结构：',
  '{"sections":[{"title":"直接结论","content":"..."},{"title":"卦象识别","content":"..."}]}'
].join('\n')

let hexagramDataPromise = null

async function ensureHexagramData() {
  if (!hexagramDataPromise) {
    const data = HEXAGRAM_DATA && HEXAGRAM_DATA.default ? HEXAGRAM_DATA.default : HEXAGRAM_DATA

    hexagramDataPromise = Promise.resolve(loadHexagramData(data))
  }

  return hexagramDataPromise
}

function sanitizeText(text) {
  return FORBIDDEN_PATTERNS.reduce((value, pattern) => {
    return value.replace(pattern, '较为确定的表达')
  }, String(text || ''))
}

function cleanQuestion(value) {
  return String(value || '').trim().slice(0, MAX_QUESTION_LENGTH)
}

function cleanCategory(value) {
  return String(value || '其他').trim().slice(0, 12) || '其他'
}

function buildLines(lines) {
  if (!Array.isArray(lines) || lines.length !== 6) {
    throw new Error('需要完整的六爻数据')
  }

  return lines.map((line, index) => {
    const score = Number(line && line.score)
    const normalizedLine = createLineFromScore(score, index + 1)
    const coins = Array.isArray(line.coins)
      ? line.coins.map((coin, coinIndex) => ({
        id: `${index + 1}-${coinIndex}`,
        side: coin.side === 'front' ? 'front' : 'back',
        label: coin.side === 'front' ? '正面' : '反面',
        shortLabel: coin.side === 'front' ? '正' : '反',
        value: coin.side === 'front' ? 3 : 2
      }))
      : []

    return {
      ...normalizedLine,
      coins,
      coinText: coins.length ? coins.map((coin) => coin.label).join('、') : normalizedLine.coinText
    }
  })
}

function formatLines(lines) {
  return lines.map((line) => {
    const score = typeof line.score === 'number' ? `，点数${line.score}` : ''
    const moving = line.moving ? '，动爻' : '，静爻'
    const coins = line.coinText ? `，硬币：${line.coinText}` : ''

    return `${line.position}（第${line.index}爻）：${line.name}，${line.image}${score}${moving}${coins}`
  }).join('\n')
}

function buildUserPrompt(input, plate) {
  const original = plate.originalHexagram
  const changed = plate.changedHexagram
  const changedLines = plate.changedLinesFromBottom
  const changedLineText = changedLines.map((line) => {
    const changedFrom = line.changedFrom ? `，由${line.changedFrom === 'yin' ? '阴' : '阳'}变来` : ''

    return `${line.position}：${line.name}，${line.image}${changedFrom}`
  }).join('\n')

  return [
    '请根据以下六爻排盘数据进行分析：',
    '',
    `用户问题：${input.question}`,
    `问题类型：${input.category}`,
    `起卦时间：${input.createdAt}`,
    '',
    '本卦（程序计算结果，必须以此为准）：',
    `名称：${original.displayName}`,
    `编码：${plate.originalCode}`,
    `上卦：${original.upperTrigram.name}（${original.upperTrigram.symbol}，${original.upperTrigram.nature}）`,
    `下卦：${original.lowerTrigram.name}（${original.lowerTrigram.symbol}，${original.lowerTrigram.nature}）`,
    '',
    '变卦（程序计算结果，必须以此为准）：',
    `名称：${changed.displayName}`,
    `编码：${plate.changedCode}`,
    `上卦：${changed.upperTrigram.name}（${changed.upperTrigram.symbol}，${changed.upperTrigram.nature}）`,
    `下卦：${changed.lowerTrigram.name}（${changed.lowerTrigram.symbol}，${changed.lowerTrigram.nature}）`,
    '',
    `动爻：${plate.movingLinesText}`,
    '',
    '六爻自下而上：',
    formatLines(plate.linesFromBottom),
    '',
    '变化后的六爻自下而上：',
    changedLineText,
    '',
    '本次解读的差异化要求：',
    '- 先判断本卦呈现的当前状态，再判断变卦呈现的变化方向；',
    '- 动爻必须逐条解释，说明它为什么会影响本题；',
    '- 结论和建议必须引用本卦名、变卦名、动爻位置中的具体信息；',
    '- 不要输出可以套用于任意卦象的泛泛建议；',
    '- 如果无动爻，要明确说明“无动爻”代表本卦与变卦一致，重在守势与现状观察；',
    '',
    '请按照以下结构输出：',
    REQUIRED_SECTION_TITLES.map((title, index) => `${index + 1}. ${title}`).join('\n'),
    '',
    '要求：',
    '- 不要重新计算卦象；',
    '- 不要说得过于绝对；',
    '- 不要恐吓用户；',
    '- 要结合现实条件分析；',
    '- 语言要像一个懂六爻但很理性的朋友；',
    '- 每一节都要尽量体现本次卦象的具体差异；',
    '- 只返回 JSON。'
  ].join('\n')
}

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
    const content = sanitizeText(sectionMap[title])

    return {
      title,
      content: title === '免责声明' && !content.includes(DISCLAIMER)
        ? `${content ? `${content}\n` : ''}${DISCLAIMER}`
        : content
    }
  })
}

function parseJsonContent(content) {
  const text = String(content || '').trim()
  const withoutFence = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')

  return JSON.parse(withoutFence)
}

function parseModelContent(content) {
  try {
    const parsed = parseJsonContent(content)
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

function buildModelPayload(input, plate) {
  return {
    model: process.env.DEEPSEEK_MODEL || DEFAULT_DEEPSEEK_MODEL,
    temperature: 0.55,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(input, plate) }
    ]
  }
}

async function requestDeepSeek(input, plate) {
  const apiKey = process.env.DEEPSEEK_API_KEY

  if (!apiKey) {
    throw new Error('后端未配置 DEEPSEEK_API_KEY')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch(DEFAULT_DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(buildModelPayload(input, plate)),
      signal: controller.signal
    })
    const raw = await response.text()

    if (!response.ok) {
      throw new Error(`DeepSeek API error ${response.status}: ${raw.slice(0, 160)}`)
    }

    const json = JSON.parse(raw)
    const content = json.choices &&
      json.choices[0] &&
      json.choices[0].message &&
      json.choices[0].message.content

    if (!content) {
      throw new Error('DeepSeek response missing message content')
    }

    return parseModelContent(content)
  } finally {
    clearTimeout(timeout)
  }
}

function publicPlate(plate) {
  return {
    originalCode: plate.originalCode,
    changedCode: plate.changedCode,
    originalHexagram: plate.originalHexagram,
    changedHexagram: plate.changedHexagram,
    movingLines: plate.movingLines,
    movingLinesText: plate.movingLinesText,
    linesFromBottom: plate.linesFromBottom,
    changedLinesFromBottom: plate.changedLinesFromBottom,
    displayLines: buildDisplayLines(plate.linesFromBottom)
  }
}

export async function handleChatRequest(body) {
  await ensureHexagramData()

  const input = {
    question: cleanQuestion(body && body.question),
    category: cleanCategory(body && body.category),
    createdAt: String((body && body.createdAt) || '').trim() || new Date().toISOString(),
    lines: buildLines(body && body.lines)
  }

  if (!input.question) {
    return {
      status: 400,
      body: {
        ok: false,
        message: '请先输入问题'
      }
    }
  }

  const plate = calculateHexagram(input.lines)
  const plateForClient = publicPlate(plate)

  try {
    const sections = await requestDeepSeek(input, plate)

    return {
      status: 200,
      body: {
        ok: true,
        source: 'deepseek',
        plate: plateForClient,
        sections
      }
    }
  } catch (error) {
    return {
      status: 200,
      body: {
        ok: false,
        source: 'fallback',
        message: error.message || 'AI 调用失败',
        plate: plateForClient,
        sections: createFallbackSections(error.message || 'AI 调用失败')
      }
    }
  }
}

export const _private = {
  buildLines,
  buildModelPayload,
  createFallbackSections,
  normalizeSections,
  parseModelContent
}
