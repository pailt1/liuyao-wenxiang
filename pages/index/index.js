Page({
  data: {
    categories: ['感情', '学业', '考试', '事业', '求职', '选择', '其他'],
    selectedCategoryIndex: 0,
    question: '',
    questionLength: 0,
    disclaimer: '仅供传统文化学习与自我反思参考'
  },

  onQuestionInput(event) {
    const question = event.detail.value

    this.setData({
      question,
      questionLength: question.length
    })
  },

  selectCategory(event) {
    const index = Number(event.currentTarget.dataset.index)

    this.setData({
      selectedCategoryIndex: index
    })
  },

  goToShake() {
    const question = this.data.question.trim()

    if (!question) {
      wx.showToast({
        title: '请先输入问题',
        icon: 'none'
      })
      return
    }

    wx.setStorageSync('currentQuestion', {
      question,
      category: this.data.categories[this.data.selectedCategoryIndex]
    })

    wx.navigateTo({
      url: '/pages/shake/shake'
    })
  },

  goToHistory() {
    wx.navigateTo({
      url: '/pages/history/history'
    })
  }
})
