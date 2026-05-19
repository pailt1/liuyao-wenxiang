const { buildDisplayLines, calculateHexagram } = require('../../utils/hexagram')

function buildAnalysisPayload(pageData) {
  return {
    question: pageData.question,
    category: pageData.category,
    createdAt: pageData.createdAt,
    originalHexagram: pageData.originalHexagram ? pageData.originalHexagram.displayName : '',
    changedHexagram: pageData.changedHexagram ? pageData.changedHexagram.displayName : '',
    movingLinesText: pageData.movingLinesText,
    linesFromBottom: pageData.lines.map((line) => ({
      index: line.index,
      position: line.position,
      name: line.name,
      image: line.image,
      type: line.type,
      moving: line.moving
    }))
  }
}

function buildRecordPayload(pageData, aiSections, aiSource) {
  return {
    question: pageData.question,
    category: pageData.category,
    createdAt: pageData.createdAt,
    lines: pageData.lines,
    originalHexagram: pageData.originalHexagram,
    changedHexagram: pageData.changedHexagram,
    movingLines: pageData.movingLines,
    movingLinesText: pageData.movingLinesText,
    aiSections,
    aiSource
  }
}

function splitAISections(sections) {
  const list = Array.isArray(sections) ? sections : []
  const conclusion = list.find((section) => section.title === '直接结论') || list[0] || null

  return {
    aiConclusion: conclusion,
    aiAnalysisSections: list.filter((section) => section !== conclusion)
  }
}

Page({
  data: {
    question: '未填写问题',
    category: '其他',
    createdAt: '未生成',
    lines: [],
    displayLines: buildDisplayLines([]),
    originalHexagram: null,
    changedHexagram: null,
    movingLines: [],
    movingLinesText: '待识别',
    hasHexagram: false,
    errorText: '',
    aiLoading: false,
    aiSections: [],
    aiConclusion: null,
    aiAnalysisSections: [],
    aiSource: '',
    aiErrorText: '',
    recordId: '',
    recordSaveStatus: 'idle',
    recordSaveText: '',
    disclaimer: '仅供传统文化学习与自我反思参考'
  },

  onLoad() {
    const draft = wx.getStorageSync('currentHexagramDraft') || {}
    const lines = draft.lines || []
    let plate = null
    let errorText = ''

    try {
      if (lines.length === 6) {
        plate = calculateHexagram(lines)
      }
    } catch (error) {
      errorText = error.message || '排盘失败，请重新摇卦'
    }

    this.setData({
      question: draft.question || '未填写问题',
      category: draft.category || '其他',
      createdAt: draft.createdAt || '未生成',
      lines,
      displayLines: buildDisplayLines(lines),
      originalHexagram: plate ? plate.originalHexagram : null,
      changedHexagram: plate ? plate.changedHexagram : null,
      movingLines: plate ? plate.movingLines : [],
      movingLinesText: plate ? plate.movingLinesText : '待识别',
      hasHexagram: !!plate,
      errorText
    })

    if (plate) {
      this.requestAIAnalysis()
    }
  },

  requestAIAnalysis() {
    if (!wx.cloud) {
      this.setData({
        aiLoading: false,
        aiSource: 'fallback',
        aiErrorText: '当前环境未启用微信云开发，暂时无法调用 AI 解读。',
        aiSections: [
          {
            title: '免责声明',
            content: this.data.disclaimer
          }
        ]
      })
      return
    }

    this.setData({
      aiLoading: true,
      aiErrorText: '',
      aiSections: []
    })

    wx.cloud.callFunction({
      name: 'analyzeHexagram',
      data: buildAnalysisPayload(this.data),
      success: (res) => {
        const result = res.result || {}
        const sections = result.sections || []
        const splitSections = splitAISections(sections)

        this.setData({
          aiLoading: false,
          aiSource: result.source || 'fallback',
          aiSections: sections,
          aiConclusion: splitSections.aiConclusion,
          aiAnalysisSections: splitSections.aiAnalysisSections,
          aiErrorText: result.ok ? '' : 'AI 解读暂未完成，已展示兜底参考。'
        })

        this.saveCurrentRecord(sections, result.source || 'fallback')
      },
      fail: () => {
        const fallbackSections = [
          {
            title: '直接结论',
            content: '当前暂未取得 AI 解读结果。请先结合本卦、变卦和动爻，从现实条件与可行动项入手思考。'
          },
          {
            title: '免责声明',
            content: this.data.disclaimer
          }
        ]
        const splitSections = splitAISections(fallbackSections)

        this.setData({
          aiLoading: false,
          aiSource: 'fallback',
          aiErrorText: 'AI 解读调用失败，请稍后重试。',
          aiSections: fallbackSections,
          aiConclusion: splitSections.aiConclusion,
          aiAnalysisSections: splitSections.aiAnalysisSections
        })

        this.saveCurrentRecord(fallbackSections, 'fallback')
      }
    })
  },

  saveCurrentRecord(aiSections, aiSource) {
    if (!this.data.hasHexagram || this.data.recordId || this.data.recordSaveStatus === 'saving') {
      return
    }

    if (!wx.cloud) {
      this.setData({
        recordSaveStatus: 'failed',
        recordSaveText: '云开发未启用，当前结果未保存。'
      })
      return
    }

    this.setData({
      recordSaveStatus: 'saving',
      recordSaveText: '正在保存到历史记录...'
    })

    wx.cloud.callFunction({
      name: 'saveRecord',
      data: {
        record: buildRecordPayload(this.data, aiSections, aiSource)
      },
      success: (res) => {
        const result = res.result || {}

        if (result.ok) {
          this.setData({
            recordId: result.id,
            recordSaveStatus: 'saved',
            recordSaveText: '已保存到历史记录'
          })
          return
        }

        this.setData({
          recordSaveStatus: 'failed',
          recordSaveText: result.message || '保存历史记录失败'
        })
      },
      fail: () => {
        this.setData({
          recordSaveStatus: 'failed',
          recordSaveText: '保存历史记录失败，请检查云函数部署。'
        })
      }
    })
  },

  goToHistory() {
    wx.navigateTo({
      url: '/pages/history/history'
    })
  },

  goHome() {
    wx.navigateTo({
      url: '/pages/index/index'
    })
  },

  saveRecordManually() {
    this.saveCurrentRecord(this.data.aiSections, this.data.aiSource || 'fallback')
  },

  goToDetail() {
    if (!this.data.recordId) {
      return
    }

    wx.navigateTo({
      url: `/pages/detail/detail?id=${this.data.recordId}`
    })
  },

  onShareAppMessage() {
    return {
      title: `${this.data.question} · ${this.data.originalHexagram ? this.data.originalHexagram.name : '六爻问象'}`,
      path: '/pages/index/index'
    }
  }
})
