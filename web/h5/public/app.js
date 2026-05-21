import {
  LINE_POSITIONS,
  buildDisplayLines,
  calculateHexagram,
  loadHexagramDataFromUrl,
  shakeLine
} from './shared/hexagram.js'

const DISCLAIMER = '仅供传统文化学习与自我反思参考'
const CATEGORIES = ['感情', '学业', '考试', '事业', '求职', '选择', '其他']
const HISTORY_KEY = 'liuyai-wenxiang-h5-history'
const pendingCoins = [1, 2, 3].map((index) => ({
  id: `pending-${index}`,
  side: 'pending',
  label: '待摇',
  shortLabel: '-',
  value: '?'
}))

const app = document.querySelector('#app')
const state = {
  view: 'home',
  categories: CATEGORIES,
  selectedCategoryIndex: 0,
  question: '',
  createdAt: '',
  lines: [],
  currentCoins: pendingCoins,
  lastShakeText: '准备生成初爻',
  nextLineIndex: 1,
  isShaking: false,
  isComplete: false,
  plate: null,
  aiLoading: false,
  aiSource: '',
  aiErrorText: '',
  sections: [],
  savedRecordId: '',
  records: loadRecords(),
  historyFilter: '全部',
  selectedRecord: null,
  toast: ''
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
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

function loadRecords() {
  try {
    const records = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')

    return Array.isArray(records) ? records : []
  } catch (error) {
    return []
  }
}

function saveRecords(records) {
  state.records = records.slice(0, 30)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(state.records))
}

function showToast(message) {
  state.toast = message
  render()
  window.clearTimeout(showToast.timer)
  showToast.timer = window.setTimeout(() => {
    state.toast = ''
    render()
  }, 1800)
}

function setView(view) {
  state.view = view
  render()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function resetDraft() {
  state.createdAt = ''
  state.lines = []
  state.currentCoins = pendingCoins
  state.lastShakeText = '准备生成初爻'
  state.nextLineIndex = 1
  state.isShaking = false
  state.isComplete = false
  state.plate = null
  state.aiLoading = false
  state.aiSource = ''
  state.aiErrorText = ''
  state.sections = []
  state.savedRecordId = ''
}

function lineSymbol(line) {
  if (!line || line.empty) {
    return '<div class="line-symbol"><div class="empty-symbol"></div></div>'
  }

  const movingDot = line.moving ? '<span class="moving-dot"></span>' : ''

  if (line.type === 'yang') {
    return `<div class="line-symbol ${line.moving ? 'moving' : ''}"><div class="yang-symbol"></div>${movingDot}</div>`
  }

  return [
    `<div class="line-symbol ${line.moving ? 'moving' : ''}">`,
    '<div class="yin-symbol"><div class="yin-segment"></div><div class="yin-segment"></div></div>',
    movingDot,
    '</div>'
  ].join('')
}

function renderBrandMark() {
  return '<div class="brand-mark" aria-hidden="true"><span></span></div>'
}

function renderCategoryChips(selectedIndex = state.selectedCategoryIndex) {
  return state.categories.map((category, index) => {
    const active = selectedIndex === index ? ' active' : ''

    return `<button class="chip${active}" type="button" data-category-index="${index}">${escapeHtml(category)}</button>`
  }).join('')
}

function renderHome() {
  return `
    <section class="view home-view">
      <div class="home-hero">
        ${renderBrandMark()}
        <div class="brand-row">
          <h1 class="home-title">六爻问象</h1>
          <div class="seal"><span>六<br>爻</span></div>
        </div>
        <p class="home-subtitle">电子摇卦，静心观象</p>
      </div>

      <section class="panel">
        <div class="section-heading">
          <h2 class="section-title">请输入你想问的问题</h2>
          <span class="input-count" data-role="question-count">${state.question.length}/120</span>
        </div>
        <textarea
          class="question-input"
          id="questionInput"
          maxlength="120"
          placeholder="例如：我该不该接受这个新机会？"
        >${escapeHtml(state.question)}</textarea>
      </section>

      <section class="panel">
        <div class="section-heading">
          <h2 class="section-title">问题类型</h2>
        </div>
        <div class="chip-list">${renderCategoryChips()}</div>
      </section>

      <div class="tip-bar">
        <span class="tip-badge">卦</span>
        <span>一事一问，静心起卦；程序负责排盘，AI辅助解读</span>
      </div>

      <button class="primary-button" type="button" data-action="start-shake">开始摇卦</button>
      <button class="secondary-button" type="button" data-action="show-history">查看历史记录</button>
      <p class="disclaimer">${DISCLAIMER}</p>
    </section>
  `
}

function renderQuestionPanel() {
  return `
    <section class="panel question-panel">
      <div class="round-icon">问</div>
      <div>
        <span class="question-label">我的问题</span>
        <span class="question-text">${escapeHtml(state.question || '未填写问题')}</span>
        <span class="question-meta">${escapeHtml(state.categories[state.selectedCategoryIndex] || '其他')}</span>
      </div>
    </section>
  `
}

function renderCoinTray() {
  return state.currentCoins.map((coin) => {
    const side = coin.side === 'front' ? 'front' : coin.side === 'back' ? 'back' : 'pending'
    const shaking = state.isShaking ? ' shaking' : ''

    return `<div class="coin ${side}${shaking}"><span>${escapeHtml(coin.shortLabel)}</span></div>`
  }).join('')
}

function renderLineList(lines, nextLineIndex = state.nextLineIndex, isComplete = state.isComplete) {
  return buildDisplayLines(lines).map((line) => {
    const current = line.index === nextLineIndex && !isComplete ? ' current' : ''
    const done = line.empty ? '' : ' done'
    const status = line.empty
      ? (line.index === nextLineIndex && !isComplete ? '正在生成' : '未生成')
      : '已生成'

    return `
      <div class="line-item${current}${done}">
        <span class="line-position">${line.position}</span>
        ${lineSymbol(line)}
        <span class="line-status">${status}</span>
      </div>
    `
  }).join('')
}

function renderShake() {
  const progress = Math.round((state.lines.length / 6) * 100)
  const current = state.isComplete ? 6 : state.nextLineIndex

  return `
    <section class="view">
      <header class="topbar">
        <button class="text-button" type="button" data-action="home">返回</button>
        <h1 class="topbar-title">摇卦中</h1>
        <button class="text-button" type="button" data-action="reset-shake">重置</button>
      </header>

      ${renderQuestionPanel()}

      <section class="shake-stage">
        <h2 class="stage-title">第 <span class="stage-number">${current}</span> / 6 爻</h2>
        <p class="stage-subtitle">${state.isComplete ? '六爻已成，请查看结果' : '请静心默念问题'}</p>
        <div class="progress-bar"><div class="progress-fill" style="width: ${progress}%"></div></div>
      </section>

      <section class="panel coin-panel">
        <div class="section-heading">
          <h2 class="section-title">三枚硬币</h2>
          <span class="muted">${state.isShaking ? '摇动中' : (state.isComplete ? '已完成' : `第 ${state.nextLineIndex} 次`)}</span>
        </div>
        <div class="coin-tray">${renderCoinTray()}</div>
        <p class="coin-summary">${escapeHtml(state.lastShakeText)}</p>
      </section>

      <section class="panel">
        <div class="section-heading">
          <h2 class="section-title">六爻生成</h2>
          <span class="muted">从下往上</span>
        </div>
        <div class="line-list">${renderLineList(state.lines)}</div>
      </section>

      <button class="primary-button" type="button" data-action="shake-once" ${state.isComplete || state.isShaking ? 'disabled' : ''}>
        ${state.isComplete ? '六爻已完成' : (state.isShaking ? '正在摇卦' : '继续摇卦')}
      </button>
      <button class="secondary-button" type="button" data-action="show-result">查看结果</button>

      <div class="tip-bar">
        <span class="tip-badge">序</span>
        <span>六爻从下往上生成，初爻在最下，上爻在最上</span>
      </div>
    </section>
  `
}

function localPlateFromLines(lines) {
  const plate = calculateHexagram(lines)

  return {
    ...plate,
    displayLines: buildDisplayLines(plate.linesFromBottom)
  }
}

function splitSections(sections) {
  const list = Array.isArray(sections) ? sections : []
  const conclusion = list.find((section) => section.title === '直接结论') || list[0] || null

  return {
    conclusion,
    analysis: list.filter((section) => section !== conclusion)
  }
}

function renderPlate(plate) {
  if (!plate) {
    return '<section class="panel"><p class="ai-loading">正在根据程序排盘结果生成解读...</p></section>'
  }

  const displayLines = plate.displayLines || buildDisplayLines(plate.linesFromBottom || [])

  return `
    <section class="panel plate-panel">
      <div class="plate-lines">
        ${displayLines.map((line) => `
          <div class="plate-line">
            <span class="plate-position">${line.position}</span>
            ${lineSymbol(line)}
          </div>
        `).join('')}
      </div>
      <div>
        <div class="plate-info-row">
          <span class="plate-label">本卦</span>
          <span class="plate-value">${escapeHtml(plate.originalHexagram.name)}</span>
          <span class="plate-meta">上${escapeHtml(plate.originalHexagram.upperTrigram.name)}下${escapeHtml(plate.originalHexagram.lowerTrigram.name)}</span>
        </div>
        <div class="plate-info-row">
          <span class="plate-label">变卦</span>
          <span class="plate-value">${escapeHtml(plate.changedHexagram.name)}</span>
          <span class="plate-meta">上${escapeHtml(plate.changedHexagram.upperTrigram.name)}下${escapeHtml(plate.changedHexagram.lowerTrigram.name)}</span>
        </div>
        <div class="plate-info-row">
          <span class="plate-label">动爻</span>
          <span class="plate-value moving-text">${escapeHtml(plate.movingLinesText)}</span>
        </div>
      </div>
    </section>
  `
}

function renderAnalysisSections(sections) {
  if (!sections.length) {
    return ''
  }

  return `
    <section class="analysis-list">
      ${sections.map((section, index) => `
        <article class="panel analysis-item">
          <div class="analysis-number">${index + 1}</div>
          <div>
            <h3 class="analysis-title">${escapeHtml(section.title)}</h3>
            <p class="analysis-content">${escapeHtml(section.content)}</p>
          </div>
        </article>
      `).join('')}
    </section>
  `
}

function renderResult(record = null) {
  const plate = record ? record.plate : state.plate
  const sections = record ? record.sections : state.sections
  const split = splitSections(sections)
  const question = record ? record.question : state.question
  const category = record ? record.category : state.categories[state.selectedCategoryIndex]
  const createdAt = record ? record.createdAt : state.createdAt
  const source = record ? record.aiSource : state.aiSource
  const isDetail = !!record

  return `
    <section class="view">
      <header class="topbar">
        <button class="text-button" type="button" data-action="${isDetail ? 'show-history' : 'shake'}">返回</button>
        <h1 class="topbar-title">${isDetail ? '记录详情' : '解卦结果'}</h1>
        <button class="text-button" type="button" data-action="home">首页</button>
      </header>

      <section class="panel question-panel">
        <div class="round-icon">问</div>
        <div>
          <span class="question-text">${escapeHtml(question)}</span>
          <span class="muted">问题类型：${escapeHtml(category)}</span>
          <span class="muted">起卦时间：${escapeHtml(createdAt)}</span>
        </div>
      </section>

      ${renderPlate(plate)}

      <section class="panel">
        <div class="ai-header">
          <h2 class="section-title">AI 结论</h2>
          <span class="source-badge">${source === 'deepseek' ? 'DeepSeek 生成' : '兜底参考'}</span>
        </div>
        ${state.aiLoading && !isDetail ? '<p class="ai-loading">正在根据程序排盘结果生成解读...</p>' : ''}
        ${split.conclusion ? `<p class="conclusion">${escapeHtml(split.conclusion.content)}</p>` : ''}
        ${state.aiErrorText && !isDetail ? `<p class="ai-error">${escapeHtml(state.aiErrorText)}</p>` : ''}
      </section>

      ${renderAnalysisSections(split.analysis)}

      ${isDetail ? `
        <button class="primary-button" type="button" data-action="home">再次起卦</button>
        <button class="secondary-button" type="button" data-action="share-record" data-record-id="${escapeHtml(record.id)}">复制文本</button>
        <button class="danger-button" type="button" data-action="delete-record" data-record-id="${escapeHtml(record.id)}">删除记录</button>
      ` : `
        <div class="action-row">
          <button class="secondary-button" type="button" data-action="save-record" ${state.savedRecordId ? 'disabled' : ''}>${state.savedRecordId ? '已保存' : '保存记录'}</button>
          <button class="primary-button" type="button" data-action="share-current">分享结果</button>
        </div>
        <button class="secondary-button" type="button" data-action="home">重新起卦</button>
        <button class="secondary-button" type="button" data-action="show-history">历史记录</button>
      `}

      <p class="disclaimer">${DISCLAIMER}</p>
    </section>
  `
}

function renderHistory() {
  const filter = state.historyFilter
  const filters = ['全部', ...CATEGORIES]
  const records = filter === '全部'
    ? state.records
    : state.records.filter((record) => record.category === filter)

  return `
    <section class="view">
      <header class="topbar">
        <button class="text-button" type="button" data-action="home">首页</button>
        <h1 class="topbar-title">历史记录</h1>
        <button class="text-button" type="button" data-action="start-shake">起卦</button>
      </header>

      <div class="chip-list panel">
        ${filters.map((item) => `<button class="chip${filter === item ? ' active' : ''}" type="button" data-history-filter="${escapeHtml(item)}">${escapeHtml(item)}</button>`).join('')}
      </div>

      ${records.length ? `
        <div class="record-list">
          ${records.map((record) => `
            <button class="record-item" type="button" data-action="open-record" data-record-id="${escapeHtml(record.id)}">
              <span class="record-title">${escapeHtml(record.question)}</span>
              <span class="record-meta">${escapeHtml(record.createdAt)} · ${escapeHtml(record.category)}</span>
              <span class="record-gua">${escapeHtml(record.plate.originalHexagram.name)} → ${escapeHtml(record.plate.changedHexagram.name)}</span>
              <span class="record-summary">${escapeHtml(record.summary || '查看详情')}</span>
            </button>
          `).join('')}
        </div>
      ` : '<p class="empty-state">暂无记录</p>'}
    </section>
  `
}

function render() {
  const content = state.view === 'home'
    ? renderHome()
    : state.view === 'shake'
      ? renderShake()
      : state.view === 'result'
        ? renderResult()
        : state.view === 'history'
          ? renderHistory()
          : renderResult(state.selectedRecord)

  app.innerHTML = `${content}${state.toast ? `<div class="toast">${escapeHtml(state.toast)}</div>` : ''}`
}

async function startShake() {
  const question = state.question.trim()

  if (!question) {
    showToast('请先输入问题')
    return
  }

  resetDraft()
  state.question = question
  state.view = 'shake'
  render()
}

async function shakeOnce() {
  if (state.isShaking || state.isComplete) {
    return
  }

  const lineIndex = state.nextLineIndex
  state.isShaking = true
  state.currentCoins = pendingCoins
  state.lastShakeText = `正在摇${LINE_POSITIONS[lineIndex - 1]}`
  render()

  window.setTimeout(() => {
    const nextLine = shakeLine(lineIndex)
    const lines = state.lines.concat(nextLine)

    state.createdAt = state.createdAt || formatDate(new Date())
    state.lines = lines
    state.currentCoins = nextLine.coins
    state.lastShakeText = `${nextLine.position}：${nextLine.coinText}，得${nextLine.name}`
    state.nextLineIndex = lines.length + 1
    state.isComplete = lines.length === 6
    state.isShaking = false
    render()
    showToast(state.isComplete ? '六爻已成' : `${nextLine.position}已生成`)
  }, 420)
}

function resetShake() {
  resetDraft()
  state.view = 'shake'
  render()
}

async function showResult() {
  if (!state.isComplete) {
    showToast('请先摇满六爻')
    return
  }

  state.view = 'result'
  state.aiLoading = true
  state.aiErrorText = ''
  state.plate = localPlateFromLines(state.lines)
  state.sections = []
  render()

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        question: state.question,
        category: state.categories[state.selectedCategoryIndex],
        createdAt: state.createdAt,
        lines: state.lines.map((line) => ({
          index: line.index,
          score: line.score,
          coins: (line.coins || []).map((coin) => ({ side: coin.side }))
        }))
      })
    })
    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.message || 'AI 解读调用失败')
    }

    state.plate = result.plate || state.plate
    state.sections = Array.isArray(result.sections) ? result.sections : []
    state.aiSource = result.source || 'fallback'
    state.aiErrorText = result.ok ? '' : 'AI 解读暂未完成，已展示兜底参考。'
    saveCurrentRecord()
  } catch (error) {
    state.sections = [
      {
        title: '直接结论',
        content: '当前暂未取得 AI 解读结果。请先结合本卦、变卦和动爻，从现实条件与可行动项入手思考。'
      },
      {
        title: '免责声明',
        content: DISCLAIMER
      }
    ]
    state.aiSource = 'fallback'
    state.aiErrorText = error.message || 'AI 解读调用失败，请稍后重试。'
  } finally {
    state.aiLoading = false
    render()
  }
}

function saveCurrentRecord() {
  if (!state.plate || !state.sections.length || state.savedRecordId) {
    return
  }

  const conclusion = splitSections(state.sections).conclusion
  const record = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    question: state.question,
    category: state.categories[state.selectedCategoryIndex],
    createdAt: state.createdAt,
    lines: state.lines,
    plate: state.plate,
    sections: state.sections,
    aiSource: state.aiSource,
    summary: conclusion ? conclusion.content.slice(0, 64) : ''
  }

  saveRecords([record, ...state.records])
  state.savedRecordId = record.id
}

function openRecord(recordId) {
  const record = state.records.find((item) => item.id === recordId)

  if (!record) {
    showToast('记录不存在')
    return
  }

  state.selectedRecord = record
  setView('detail')
}

function deleteRecord(recordId) {
  saveRecords(state.records.filter((record) => record.id !== recordId))
  state.selectedRecord = null
  showToast('已删除')
  setView('history')
}

function buildShareText(record) {
  const split = splitSections(record.sections)
  const conclusion = split.conclusion ? split.conclusion.content : ''

  return [
    `问题：${record.question}`,
    `本卦：${record.plate.originalHexagram.name}`,
    `变卦：${record.plate.changedHexagram.name}`,
    `动爻：${record.plate.movingLinesText}`,
    '',
    conclusion,
    '',
    DISCLAIMER
  ].join('\n')
}

async function shareRecord(record) {
  const text = buildShareText(record)

  try {
    if (navigator.share) {
      await navigator.share({
        title: '六爻问象',
        text
      })
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(text)
      showToast('已复制')
    } else {
      showToast('当前浏览器不支持复制')
    }
  } catch (error) {
    showToast('分享未完成')
  }
}

function currentRecordForShare() {
  if (state.savedRecordId) {
    return state.records.find((record) => record.id === state.savedRecordId)
  }

  saveCurrentRecord()
  return state.records.find((record) => record.id === state.savedRecordId)
}

function closestElement(target, selector) {
  let element = target && target.nodeType === 1 ? target : target.parentElement

  while (element && element !== document) {
    if (element.matches && element.matches(selector)) {
      return element
    }

    element = element.parentElement
  }

  return null
}

document.addEventListener('input', (event) => {
  if (event.target.id !== 'questionInput') {
    return
  }

  state.question = event.target.value.slice(0, 120)
  const count = document.querySelector('[data-role="question-count"]')

  if (count) {
    count.textContent = `${state.question.length}/120`
  }
})

document.addEventListener('click', async (event) => {
  const categoryButton = closestElement(event.target, '[data-category-index]')

  if (categoryButton) {
    state.selectedCategoryIndex = Number(categoryButton.dataset.categoryIndex)
    render()
    return
  }

  const filterButton = closestElement(event.target, '[data-history-filter]')

  if (filterButton) {
    state.historyFilter = filterButton.dataset.historyFilter
    render()
    return
  }

  const button = closestElement(event.target, '[data-action]')

  if (!button) {
    return
  }

  const action = button.dataset.action

  if (action === 'start-shake') {
    await startShake()
  } else if (action === 'shake-once') {
    await shakeOnce()
  } else if (action === 'reset-shake') {
    resetShake()
  } else if (action === 'show-result') {
    await showResult()
  } else if (action === 'home') {
    resetDraft()
    setView('home')
  } else if (action === 'shake') {
    setView('shake')
  } else if (action === 'show-history') {
    setView('history')
  } else if (action === 'save-record') {
    saveCurrentRecord()
    render()
    showToast('已保存')
  } else if (action === 'share-current') {
    const record = currentRecordForShare()

    if (record) {
      await shareRecord(record)
    }
  } else if (action === 'share-record') {
    const record = state.records.find((item) => item.id === button.dataset.recordId)

    if (record) {
      await shareRecord(record)
    }
  } else if (action === 'open-record') {
    openRecord(button.dataset.recordId)
  } else if (action === 'delete-record') {
    deleteRecord(button.dataset.recordId)
  }
})

loadHexagramDataFromUrl()
  .then(() => {
    render()
  })
  .catch((error) => {
    app.innerHTML = `
      <section class="view">
        <h1 class="topbar-title">载入失败</h1>
        <p class="ai-error">${escapeHtml(error.message || '无法加载卦象数据')}</p>
      </section>
    `
  })
