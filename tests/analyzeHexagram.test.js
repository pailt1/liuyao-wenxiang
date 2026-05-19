const assert = require('node:assert/strict')
const { main, _private } = require('../cloudfunctions/analyzeHexagram')
const {
  DISCLAIMER,
  REQUIRED_SECTION_TITLES,
  SYSTEM_PROMPT,
  buildUserPrompt
} = require('../cloudfunctions/analyzeHexagram/prompt')

const sampleEvent = {
  question: '什么时候找到对象',
  category: '感情',
  createdAt: '2026-05-15 13:30',
  originalHexagram: '第47卦 泽水困',
  changedHexagram: '第60卦 水泽节',
  movingLinesText: '初爻（阴爻变阳爻）、四爻（阳爻变阴爻）',
  linesFromBottom: [
    { index: 1, position: '初爻', name: '老阴', image: '阴爻', type: 'yin', moving: true },
    { index: 2, position: '二爻', name: '少阳', image: '阳爻', type: 'yang', moving: false },
    { index: 3, position: '三爻', name: '少阴', image: '阴爻', type: 'yin', moving: false },
    { index: 4, position: '四爻', name: '老阳', image: '阳爻', type: 'yang', moving: true },
    { index: 5, position: '五爻', name: '少阳', image: '阳爻', type: 'yang', moving: false },
    { index: 6, position: '上爻', name: '少阴', image: '阴爻', type: 'yin', moving: false }
  ]
}

async function run() {
  const originalApiKey = process.env.AI_API_KEY

  delete process.env.AI_API_KEY

  const fallback = await main(sampleEvent)
  assert.equal(fallback.ok, false)
  assert.equal(fallback.source, 'fallback')
  assert.deepEqual(fallback.sections.map((section) => section.title), REQUIRED_SECTION_TITLES)
  assert.ok(fallback.sections[fallback.sections.length - 1].content.includes(DISCLAIMER))

  const userPrompt = buildUserPrompt(sampleEvent)
  assert.ok(SYSTEM_PROMPT.includes('不允许重新识别卦象'))
  assert.ok(userPrompt.includes('本卦：第47卦 泽水困'))
  assert.ok(userPrompt.includes('变卦：第60卦 水泽节'))
  assert.ok(userPrompt.includes('六爻自下而上'))

  const normalized = _private.normalizeSections([
    { title: '直接结论', content: '不要说百分百成功，也不要说一定失败。' },
    { title: '免责声明', content: '传统文化参考。' }
  ])
  assert.equal(normalized.length, REQUIRED_SECTION_TITLES.length)
  assert.ok(!normalized[0].content.includes('百分百'))
  assert.ok(!normalized[0].content.includes('一定失败'))
  assert.ok(normalized[normalized.length - 1].content.includes(DISCLAIMER))

  if (originalApiKey) {
    process.env.AI_API_KEY = originalApiKey
  }

  console.log('analyzeHexagram tests passed')
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
