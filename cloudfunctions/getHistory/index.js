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

function normalizeLimit(value) {
  const limit = Number(value) || 30

  return Math.max(1, Math.min(limit, 50))
}

function toHistoryItem(record) {
  return {
    id: record._id,
    question: record.question,
    category: record.category,
    createdAt: record.createdAt,
    originalHexagramName: record.originalHexagramName,
    changedHexagramName: record.changedHexagramName,
    movingLinesText: record.movingLinesText
  }
}

exports.main = async (event = {}) => {
  try {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID
    const db = cloud.database()
    const result = await db.collection(COLLECTION_NAME)
      .where({ openid })
      .orderBy('createdAtDB', 'desc')
      .limit(normalizeLimit(event.limit))
      .get()

    return {
      ok: true,
      records: (result.data || []).map(toHistoryItem)
    }
  } catch (error) {
    return {
      ok: false,
      message: error.message || '获取历史记录失败',
      records: []
    }
  }
}

module.exports._private = {
  normalizeLimit,
  toHistoryItem
}
