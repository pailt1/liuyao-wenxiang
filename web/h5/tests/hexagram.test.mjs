import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  buildDisplayLines,
  calculateHexagram,
  createLineFromScore,
  linesToCode,
  loadHexagramData,
  normalizeLines
} from '../public/shared/hexagram.js'

const hexagramData = JSON.parse(await readFile(new URL('../public/shared/hexagrams.json', import.meta.url), 'utf8'))
loadHexagramData(hexagramData)

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

test('H5 hexagram data includes eight trigrams and sixty-four hexagrams', () => {
  assert.equal(Object.keys(hexagramData.trigrams).length, 8)
  assert.equal(Object.keys(hexagramData.hexagrams).length, 64)
})

test('lines are stored from bottom to top and displayed from top to bottom', () => {
  const orderLines = normalizeLines(linesFromScores([7, 8, 7, 8, 7, 8]))

  assert.deepEqual(orderLines.map((line) => line.position), ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'])
  assert.equal(linesToCode(orderLines), '101010')
  assert.deepEqual(buildDisplayLines(orderLines).map((line) => line.index), [6, 5, 4, 3, 2, 1])
})

test('static lines keep original and changed hexagram identical', () => {
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
})

test('single and multiple moving lines change all moving positions', () => {
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
})
