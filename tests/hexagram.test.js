const assert = require('node:assert/strict')
const hexagramData = require('../data/hexagrams.json')
const runtimeHexagramData = require('../data/hexagrams')
const {
  buildDisplayLines,
  calculateHexagram,
  createLineFromScore,
  linesToCode,
  normalizeLines
} = require('../utils/hexagram')

function linesFromScores(scores) {
  return scores.map((score, index) => createLineFromScore(score, index + 1))
}

function calculateFromScores(scores) {
  return calculateHexagram(linesFromScores(scores))
}

function assertHexagram(result, originalName, changedName, movingText) {
  assert.equal(result.originalHexagram.name, originalName)
  assert.equal(result.changedHexagram.name, changedName)
  assert.equal(result.movingLinesText, movingText)
}

assert.equal(Object.keys(hexagramData.trigrams).length, 8)
assert.equal(Object.keys(hexagramData.hexagrams).length, 64)
assert.deepEqual(runtimeHexagramData, hexagramData)

const orderLines = normalizeLines(linesFromScores([7, 8, 7, 8, 7, 8]))
assert.deepEqual(orderLines.map((line) => line.position), ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'])
assert.equal(linesToCode(orderLines), '101010')
assert.deepEqual(buildDisplayLines(orderLines).map((line) => line.index), [6, 5, 4, 3, 2, 1])

assertHexagram(
  calculateFromScores([7, 7, 7, 7, 7, 7]),
  '乾为天',
  '乾为天',
  '无动爻'
)

assertHexagram(
  calculateFromScores([8, 8, 8, 8, 8, 8]),
  '坤为地',
  '坤为地',
  '无动爻'
)

assertHexagram(
  calculateFromScores([7, 8, 7, 8, 7, 8]),
  '水火既济',
  '水火既济',
  '无动爻'
)

assertHexagram(
  calculateFromScores([6, 8, 8, 8, 8, 8]),
  '坤为地',
  '地雷复',
  '初爻（阴爻变阳爻）'
)

const multiMoving = calculateFromScores([6, 7, 8, 9, 7, 8])
assertHexagram(
  multiMoving,
  '泽水困',
  '水泽节',
  '初爻（阴爻变阳爻）、四爻（阳爻变阴爻）'
)
assert.deepEqual(multiMoving.movingLines.map((line) => line.position), ['初爻', '四爻'])

console.log('hexagram tests passed')
