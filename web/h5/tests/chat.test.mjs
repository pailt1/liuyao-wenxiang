import assert from 'node:assert/strict'
import test from 'node:test'
import { DISCLAIMER, REQUIRED_SECTION_TITLES, handleChatRequest, _private } from '../server/chat.js'

const sampleBody = {
  question: '我该不该接受这个新机会？',
  category: '事业',
  createdAt: '2026-05-19 20:00',
  lines: [
    { score: 6, coins: [{ side: 'back' }, { side: 'back' }, { side: 'back' }] },
    { score: 7, coins: [{ side: 'front' }, { side: 'back' }, { side: 'back' }] },
    { score: 8, coins: [{ side: 'front' }, { side: 'front' }, { side: 'back' }] },
    { score: 9, coins: [{ side: 'front' }, { side: 'front' }, { side: 'front' }] },
    { score: 7, coins: [{ side: 'front' }, { side: 'back' }, { side: 'back' }] },
    { score: 8, coins: [{ side: 'front' }, { side: 'front' }, { side: 'back' }] }
  ]
}

test('/api/chat backend computes plate and returns fallback without DEEPSEEK_API_KEY', async () => {
  const originalKey = process.env.DEEPSEEK_API_KEY
  delete process.env.DEEPSEEK_API_KEY

  const result = await handleChatRequest(sampleBody)

  assert.equal(result.status, 200)
  assert.equal(result.body.ok, false)
  assert.equal(result.body.source, 'fallback')
  assert.equal(result.body.plate.originalHexagram.name, '泽水困')
  assert.equal(result.body.plate.changedHexagram.name, '水泽节')
  assert.equal(result.body.plate.movingLinesText, '初爻（阴爻变阳爻）、四爻（阳爻变阴爻）')
  assert.deepEqual(result.body.sections.map((section) => section.title), REQUIRED_SECTION_TITLES)
  assert.ok(result.body.sections.at(-1).content.includes(DISCLAIMER))

  if (originalKey) {
    process.env.DEEPSEEK_API_KEY = originalKey
  }
})

test('AI sections are normalized and absolute wording is sanitized', () => {
  const normalized = _private.normalizeSections([
    { title: '直接结论', content: '不要说百分百成功，也不要说一定失败。' },
    { title: '免责声明', content: '传统文化参考。' }
  ])

  assert.equal(normalized.length, REQUIRED_SECTION_TITLES.length)
  assert.ok(!normalized[0].content.includes('百分百'))
  assert.ok(!normalized[0].content.includes('一定失败'))
  assert.ok(normalized.at(-1).content.includes(DISCLAIMER))
})
