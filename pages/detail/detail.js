const { buildDisplayLines } = require('../../utils/hexagram')

Page({
  data: {
    loading: false,
    errorText: '',
    record: null,
    displayLines: buildDisplayLines([]),
    disclaimer: '仅供传统文化学习与自我反思参考'
  },

  onLoad(options) {
    this.loadDetail(options.id)
  },

  loadDetail(id) {
    if (!id) {
      this.setData({
        errorText: '缺少历史记录 id'
      })
      return
    }

    if (!wx.cloud) {
      this.setData({
        errorText: '当前环境未启用微信云开发，暂时无法读取历史详情。'
      })
      return
    }

    this.setData({
      loading: true,
      errorText: ''
    })

    wx.cloud.callFunction({
      name: 'getRecordDetail',
      data: { id },
      success: (res) => {
        const result = res.result || {}
        const record = result.record || null

        this.setData({
          loading: false,
          record,
          displayLines: record ? buildDisplayLines(record.lines || []) : buildDisplayLines([]),
          errorText: result.ok ? '' : (result.message || '读取历史详情失败')
        })
      },
      fail: () => {
        this.setData({
          loading: false,
          errorText: '读取历史详情失败，请检查云函数部署。'
        })
      }
    })
  },

  goHome() {
    wx.navigateTo({
      url: '/pages/index/index'
    })
  },

  copyRecordText() {
    const record = this.data.record

    if (!record) {
      return
    }

    const aiText = (record.aiSections || [])
      .map((section) => `${section.title}\n${section.content}`)
      .join('\n\n')
    const text = [
      `问题：${record.question}`,
      `类型：${record.category}`,
      `起卦时间：${record.createdAt}`,
      `本卦：${record.originalHexagram && record.originalHexagram.displayName}`,
      `变卦：${record.changedHexagram && record.changedHexagram.displayName}`,
      `动爻：${record.movingLinesText}`,
      '',
      aiText,
      '',
      this.data.disclaimer
    ].join('\n')

    wx.setClipboardData({
      data: text
    })
  },

  deleteRecord() {
    wx.showToast({
      title: '删除功能后续接入',
      icon: 'none'
    })
  }
})
