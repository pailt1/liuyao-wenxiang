App({
  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({
        traceUser: true
      })
    }
  },

  globalData: {
    appName: '六爻问象',
    disclaimer: '仅供传统文化学习与自我反思参考'
  }
})
