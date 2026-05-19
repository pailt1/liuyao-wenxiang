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

function sanitizeId(id) {
  return String(id || '').trim()
}

exports.main = async (event = {}) => {
  try {
    const id = sanitizeId(event.id)

    if (!id) {
      throw new Error('缺少记录 id')
    }

    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID
    const db = cloud.database()
    const result = await db.collection(COLLECTION_NAME).doc(id).get()
    const record = result.data

    if (!record || record.openid !== openid) {
      throw new Error('记录不存在或无权访问')
    }

    delete record.openid

    return {
      ok: true,
      record
    }
  } catch (error) {
    return {
      ok: false,
      message: error.message || '获取历史详情失败',
      record: null
    }
  }
}

module.exports._private = {
  sanitizeId
}
