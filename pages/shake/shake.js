const { LINE_POSITIONS, buildDisplayLines, shakeLine } = require('../../utils/hexagram')

function createPendingCoins() {
  return [1, 2, 3].map((index) => ({
    id: `pending-${index}`,
    side: 'pending',
    label: '待摇',
    shortLabel: '—',
    value: '?'
  }))
}

function formatDate(date) {
  const pad = (value) => String(value).padStart(2, '0')

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join('-') + ' ' + [
    pad(date.getHours()),
    pad(date.getMinutes())
  ].join(':')
}

Page({
  data: {
    question: '',
    category: '其他',
    createdAt: '',
    lines: [],
    displayLines: buildDisplayLines([]),
    currentCoins: createPendingCoins(),
    lastShakeText: '准备生成初爻',
    nextLineIndex: 1,
    nextLineLabel: '第 1 次',
    progressPercent: 0,
    isShaking: false,
    isComplete: false,
    disclaimer: '仅供传统文化学习与自我反思参考'
  },

  onLoad() {
    const currentQuestion = wx.getStorageSync('currentQuestion') || {}

    this.setData({
      question: currentQuestion.question || '未填写问题',
      category: currentQuestion.category || '其他'
    })
  },

  shakeOnce() {
    if (this.data.isShaking) {
      return
    }

    if (this.data.isComplete) {
      wx.showToast({
        title: '六爻已完成',
        icon: 'none'
      })
      return
    }

    this.setData({
      isShaking: true,
      currentCoins: createPendingCoins(),
      lastShakeText: `正在摇${LINE_POSITIONS[this.data.nextLineIndex - 1]}`
    })

    const lineIndex = this.data.nextLineIndex

    this.shakeTimer = setTimeout(() => {
      const createdAt = this.data.createdAt || formatDate(new Date())
      const nextLine = shakeLine(lineIndex)
      const lines = this.data.lines.concat(nextLine)
      const isComplete = lines.length === 6

      this.setData({
        createdAt,
        lines,
        displayLines: buildDisplayLines(lines),
        currentCoins: nextLine.coins,
        lastShakeText: `${nextLine.position}：${nextLine.coinText}，得${nextLine.name}`,
        nextLineIndex: lines.length + 1,
        nextLineLabel: isComplete ? '已完成' : `第 ${lines.length + 1} 次`,
        progressPercent: Math.round((lines.length / 6) * 100),
        isShaking: false,
        isComplete
      })

      wx.showToast({
        title: isComplete ? '六爻已成' : `${nextLine.position}已生成`,
        icon: 'none'
      })
    }, 420)
  },

  resetShake() {
    if (this.shakeTimer) {
      clearTimeout(this.shakeTimer)
    }

    this.setData({
      createdAt: '',
      lines: [],
      displayLines: buildDisplayLines([]),
      currentCoins: createPendingCoins(),
      lastShakeText: '准备生成初爻',
      nextLineIndex: 1,
      nextLineLabel: '第 1 次',
      progressPercent: 0,
      isShaking: false,
      isComplete: false
    })
  },

  onUnload() {
    if (this.shakeTimer) {
      clearTimeout(this.shakeTimer)
    }
  },

  goToResult() {
    if (!this.data.isComplete) {
      wx.showToast({
        title: '请先摇满六爻',
        icon: 'none'
      })
      return
    }

    wx.setStorageSync('currentHexagramDraft', {
      question: this.data.question,
      category: this.data.category,
      createdAt: this.data.createdAt,
      lines: this.data.lines
    })

    wx.navigateTo({
      url: '/pages/result/result'
    })
  }
})
