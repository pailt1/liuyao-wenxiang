let cloud

try {
  cloud = require('wx-server-sdk')
} catch (error) {
  cloud = {
    DYNAMIC_CURRENT_ENV: null,
    init() {},
    getWXContext() {
      return { OPENID: 'test-openid' }
    },
    database() {
      throw new Error('wx-server-sdk is not available')
    }
  }
}

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const COLLECTION_NAME = 'records'
const DISCLAIMER = '仅供传统文化学习与自我反思参考'

function trimText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength)
}

function buildSummary(record) {
  return {
    question: trimText(record.question, 120),
    category: trimText(record.category || '其他', 20),
    createdAt: trimText(record.createdAt, 32),
    originalHexagramName: trimText(record.originalHexagram && record.originalHexagram.displayName, 40),
    changedHexagramName: trimText(record.changedHexagram && record.changedHexagram.displayName, 40),
    movingLinesText: trimText(record.movingLinesText || '无动爻', 120)
  }
}

function sanitizeRecord(input) {
  const record = input && input.record ? input.record : input
  const summary = buildSummary(record || {})

  if (!summary.question) {
    throw new Error('缺少用户问题')
  }

  if (!Array.isArray(record.lines) || record.lines.length !== 6) {
    throw new Error('缺少完整六爻数据')
  }

  return {
    ...summary,
    lines: record.lines,
    originalHexagram: record.originalHexagram || null,
    changedHexagram: record.changedHexagram || null,
    movingLines: Array.isArray(record.movingLines) ? record.movingLines : [],
    aiSections: Array.isArray(record.aiSections) ? record.aiSections : [],
    aiSource: trimText(record.aiSource || 'fallback', 20),
    disclaimer: DISCLAIMER
  }
}

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID
    const db = cloud.database()
    const record = sanitizeRecord(event)

    const result = await db.collection(COLLECTION_NAME).add({
      data: {
        ...record,
        openid,
        createdAtDB: db.serverDate(),
        updatedAtDB: db.serverDate()
      }
    })

    return {
      ok: true,
      id: result._id
    }
  } catch (error) {
    return {
      ok: false,
      message: error.message || '保存历史记录失败'
    }
  }
}

module.exports._private = {
  buildSummary,
  sanitizeRecord
}
