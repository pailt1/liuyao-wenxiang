let HEXAGRAM_DATA = null

export const LINE_RULES = {
  6: { type: 'yin', moving: true, name: '老阴', image: '阴爻' },
  7: { type: 'yang', moving: false, name: '少阳', image: '阳爻' },
  8: { type: 'yin', moving: false, name: '少阴', image: '阴爻' },
  9: { type: 'yang', moving: true, name: '老阳', image: '阳爻' }
}

export const LINE_POSITIONS = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻']

export const LINE_TYPE_META = {
  yin: { code: '0', image: '阴爻', staticName: '少阴' },
  yang: { code: '1', image: '阳爻', staticName: '少阳' }
}

export function loadHexagramData(data) {
  if (!data || !data.trigrams || !data.hexagrams) {
    throw new Error('Invalid hexagram data')
  }

  HEXAGRAM_DATA = data
  return HEXAGRAM_DATA
}

export async function loadHexagramDataFromUrl(url = './shared/hexagrams.json') {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to load hexagram data: ${response.status}`)
  }

  return loadHexagramData(await response.json())
}

function requireHexagramData() {
  if (!HEXAGRAM_DATA) {
    throw new Error('Hexagram data has not been loaded')
  }

  return HEXAGRAM_DATA
}

export function tossCoin() {
  const isFront = Math.random() >= 0.5

  return {
    side: isFront ? 'front' : 'back',
    label: isFront ? '正面' : '反面',
    shortLabel: isFront ? '正' : '反',
    value: isFront ? 3 : 2
  }
}

export function lineFromScore(score) {
  const numericScore = Number(score)
  const rule = LINE_RULES[numericScore]

  if (!rule) {
    throw new Error(`Invalid line score: ${score}`)
  }

  return {
    score: numericScore,
    type: rule.type,
    moving: rule.moving,
    name: rule.name,
    image: rule.image
  }
}

export function createLineFromScore(score, index) {
  if (index < 1 || index > 6) {
    throw new Error(`Invalid line index: ${index}`)
  }

  const line = lineFromScore(score)

  return {
    index,
    position: LINE_POSITIONS[index - 1],
    coinText: '',
    displayText: `${line.name} · ${line.image}`,
    ...line
  }
}

export function shakeLine(index) {
  if (index < 1 || index > 6) {
    throw new Error(`Invalid line index: ${index}`)
  }

  const coins = [tossCoin(), tossCoin(), tossCoin()].map((coin, coinIndex) => ({
    ...coin,
    id: `${index}-${coinIndex}`
  }))
  const score = coins.reduce((total, coin) => total + coin.value, 0)
  const line = lineFromScore(score)

  return {
    index,
    position: LINE_POSITIONS[index - 1],
    coins,
    coinText: coins.map((coin) => coin.label).join('、'),
    displayText: `${line.name} · ${line.image}`,
    ...line
  }
}

export function normalizeLine(line, zeroIndex) {
  const index = line.index || zeroIndex + 1

  if (index < 1 || index > 6) {
    throw new Error(`Invalid line index: ${index}`)
  }

  if (!line.type && typeof line.score !== 'number') {
    throw new Error(`Line ${index} must include type or score`)
  }

  const baseLine = typeof line.score === 'number'
    ? lineFromScore(line.score)
    : {
      type: line.type,
      moving: !!line.moving,
      name: line.name,
      image: line.image
    }
  const meta = LINE_TYPE_META[baseLine.type]

  if (!meta) {
    throw new Error(`Invalid line type at ${index}: ${baseLine.type}`)
  }

  return {
    ...line,
    index,
    position: line.position || LINE_POSITIONS[index - 1],
    type: baseLine.type,
    moving: !!baseLine.moving,
    name: baseLine.name || meta.staticName,
    image: baseLine.image || meta.image,
    displayText: line.displayText || `${baseLine.name || meta.staticName} · ${baseLine.image || meta.image}`
  }
}

export function normalizeLines(lines) {
  if (!Array.isArray(lines) || lines.length !== 6) {
    throw new Error('Hexagram calculation requires exactly 6 lines')
  }

  return lines.map((line, index) => normalizeLine(line, index))
}

export function lineTypeToCode(type) {
  const meta = LINE_TYPE_META[type]

  if (!meta) {
    throw new Error(`Invalid line type: ${type}`)
  }

  return meta.code
}

export function linesToCode(lines) {
  return lines.map((line) => lineTypeToCode(line.type)).join('')
}

export function getTrigramByCode(code) {
  const trigram = requireHexagramData().trigrams[code]

  if (!trigram) {
    throw new Error(`Unknown trigram code: ${code}`)
  }

  return {
    code,
    ...trigram
  }
}

export function getHexagramByCode(code) {
  const hexagram = requireHexagramData().hexagrams[code]

  if (!hexagram) {
    throw new Error(`Unknown hexagram code: ${code}`)
  }

  const lowerCode = code.slice(0, 3)
  const upperCode = code.slice(3, 6)
  const lowerTrigram = getTrigramByCode(lowerCode)
  const upperTrigram = getTrigramByCode(upperCode)

  return {
    code,
    lowerCode,
    upperCode,
    lowerTrigram,
    upperTrigram,
    displayName: `第${hexagram.number}卦 ${hexagram.name}`,
    ...hexagram
  }
}

export function getChangedType(line) {
  if (!line.moving) {
    return line.type
  }

  return line.type === 'yin' ? 'yang' : 'yin'
}

export function buildChangedLine(line) {
  const type = getChangedType(line)
  const meta = LINE_TYPE_META[type]

  return {
    ...line,
    type,
    moving: false,
    name: meta.staticName,
    image: meta.image,
    displayText: `${meta.staticName} · ${meta.image}`,
    changedFrom: line.type
  }
}

export function getMovingLines(lines, changedLines) {
  return lines
    .filter((line) => line.moving)
    .map((line) => {
      const changedLine = changedLines[line.index - 1]

      return {
        index: line.index,
        position: line.position,
        name: line.name,
        fromType: line.type,
        toType: changedLine.type,
        text: `${line.position}${line.name}`,
        changeText: `${line.image}变${changedLine.image}`
      }
    })
}

export function formatMovingLines(movingLines) {
  if (!movingLines.length) {
    return '无动爻'
  }

  return movingLines.map((line) => `${line.position}（${line.changeText}）`).join('、')
}

export function calculateHexagram(lines) {
  const originalLines = normalizeLines(lines)
  const changedLines = originalLines.map((line) => buildChangedLine(line))
  const originalCode = linesToCode(originalLines)
  const changedCode = linesToCode(changedLines)
  const movingLines = getMovingLines(originalLines, changedLines)

  return {
    originalCode,
    changedCode,
    originalHexagram: getHexagramByCode(originalCode),
    changedHexagram: getHexagramByCode(changedCode),
    movingLines,
    movingLinesText: formatMovingLines(movingLines),
    linesFromBottom: originalLines,
    changedLinesFromBottom: changedLines
  }
}

export function buildDisplayLines(lines) {
  return LINE_POSITIONS.map((position, zeroIndex) => {
    const index = zeroIndex + 1
    const line = lines.find((item) => item.index === index)

    return line || {
      index,
      position,
      empty: true,
      displayText: '待摇'
    }
  }).reverse()
}
