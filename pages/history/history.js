Page({
  data: {
    loading: false,
    records: [],
    filteredRecords: [],
    filters: ['全部', '考试', '感情', '事业'],
    selectedFilter: '全部',
    errorText: '',
    disclaimer: '仅供传统文化学习与自我反思参考'
  },

  onShow() {
    this.loadHistory()
  },

  loadHistory() {
    if (!wx.cloud) {
      this.setData({
        loading: false,
        errorText: '当前环境未启用微信云开发，暂时无法读取历史记录。'
      })
      return
    }

    this.setData({
      loading: true,
      errorText: ''
    })

    wx.cloud.callFunction({
      name: 'getHistory',
      data: {
        limit: 50
      },
      success: (res) => {
        const result = res.result || {}

        this.setData({
          loading: false,
          records: result.records || [],
          filteredRecords: this.filterRecords(result.records || [], this.data.selectedFilter),
          errorText: result.ok ? '' : (result.message || '读取历史记录失败')
        })
      },
      fail: () => {
        this.setData({
          loading: false,
          errorText: '读取历史记录失败，请检查云函数部署。'
        })
      }
    })
  },

  filterRecords(records, filter) {
    if (filter === '全部') {
      return records
    }

    return records.filter((record) => record.category === filter)
  },

  selectFilter(event) {
    const filter = event.currentTarget.dataset.filter

    this.setData({
      selectedFilter: filter,
      filteredRecords: this.filterRecords(this.data.records, filter)
    })
  },

  goToDetail(event) {
    const id = event.currentTarget.dataset.id

    if (!id) {
      return
    }

    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    })
  },

  goHome() {
    wx.navigateTo({
      url: '/pages/index/index'
    })
  }
})
