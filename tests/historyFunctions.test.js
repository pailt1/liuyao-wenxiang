const assert = require('node:assert/strict')
const saveRecord = require('../cloudfunctions/saveRecord')
const getHistory = require('../cloudfunctions/getHistory')
const getRecordDetail = require('../cloudfunctions/getRecordDetail')

const sampleRecord = {
  question: '什么时候找到对象',
  category: '感情',
  createdAt: '2026-05-15 14:40',
  lines: [
    { index: 1, position: '初爻', name: '少阳', image: '阳爻', type: 'yang', moving: false },
    { index: 2, position: '二爻', name: '少阴', image: '阴爻', type: 'yin', moving: false },
    { index: 3, position: '三爻', name: '少阳', image: '阳爻', type: 'yang', moving: false },
    { index: 4, position: '四爻', name: '少阴', image: '阴爻', type: 'yin', moving: false },
    { index: 5, position: '五爻', name: '少阳', image: '阳爻', type: 'yang', moving: false },
    { index: 6, position: '上爻', name: '少阴', image: '阴爻', type: 'yin', moving: false }
  ],
  originalHexagram: { displayName: '第63卦 水火既济' },
  changedHexagram: { displayName: '第63卦 水火既济' },
  movingLinesText: '无动爻',
  aiSections: [
    { title: '免责声明', content: '仅供传统文化学习与自我反思参考' }
  ],
  aiSource: 'fallback'
}

const sanitized = saveRecord._private.sanitizeRecord({ record: sampleRecord })
assert.equal(sanitized.question, sampleRecord.question)
assert.equal(sanitized.category, '感情')
assert.equal(sanitized.lines.length, 6)
assert.equal(sanitized.originalHexagramName, '第63卦 水火既济')
assert.equal(sanitized.changedHexagramName, '第63卦 水火既济')
assert.equal(sanitized.disclaimer, '仅供传统文化学习与自我反思参考')

assert.throws(() => {
  saveRecord._private.sanitizeRecord({ record: { question: '问题', lines: [] } })
}, /完整六爻/)

assert.equal(getHistory._private.normalizeLimit(0), 30)
assert.equal(getHistory._private.normalizeLimit(200), 50)
assert.equal(getHistory._private.normalizeLimit(2), 2)

const historyItem = getHistory._private.toHistoryItem({
  _id: 'record-id',
  question: '问题',
  category: '其他',
  createdAt: '2026-05-15 14:40',
  originalHexagramName: '第1卦 乾为天',
  changedHexagramName: '第1卦 乾为天',
  movingLinesText: '无动爻',
  openid: 'private-openid'
})
assert.equal(historyItem.id, 'record-id')
assert.equal(historyItem.openid, undefined)

assert.equal(getRecordDetail._private.sanitizeId('  abc  '), 'abc')
assert.equal(getRecordDetail._private.sanitizeId(null), '')

console.log('history function tests passed')
