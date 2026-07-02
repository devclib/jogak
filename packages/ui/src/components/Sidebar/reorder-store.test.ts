/**
 * reorder-store 회귀 가드.
 */
import { describe, expect, test } from 'vitest'
import { applyOrder, reorderInPlace, updateOrder, loadReorderMap, saveReorderMap } from './reorder-store.js'

describe('applyOrder', () => {
  test('저장 순서 없으면 원 순서 유지', () => {
    expect(applyOrder(['a', 'b', 'c'], '', {})).toEqual(['a', 'b', 'c'])
  })

  test('저장 순서대로 재정렬', () => {
    expect(applyOrder(['a', 'b', 'c'], '', { '': ['c', 'a', 'b'] })).toEqual(['c', 'a', 'b'])
  })

  test('저장 순서에 없는 items는 뒤에 원 순서 유지', () => {
    expect(applyOrder(['a', 'b', 'c', 'd'], '', { '': ['b'] })).toEqual(['b', 'a', 'c', 'd'])
  })

  test('저장 순서에 있으나 현재 items에 없는 것은 skip', () => {
    expect(applyOrder(['a', 'b', 'c'], '', { '': ['x', 'b', 'y', 'a'] })).toEqual(['b', 'a', 'c'])
  })
})

describe('reorderInPlace', () => {
  test('dragged를 dropTarget 앞에 삽입 (일반 dnd)', () => {
    expect(reorderInPlace(['a', 'b', 'c', 'd'], 'a', 'c')).toEqual(['b', 'a', 'c', 'd'])
    expect(reorderInPlace(['a', 'b', 'c', 'd'], 'd', 'a')).toEqual(['d', 'a', 'b', 'c'])
  })

  test('dragged === dropTarget이면 no-op', () => {
    expect(reorderInPlace(['a', 'b'], 'a', 'a')).toEqual(['a', 'b'])
  })

  test('dropTarget이 없으면 원 순서', () => {
    expect(reorderInPlace(['a', 'b'], 'a', 'z')).toEqual(['a', 'b'])
  })
})

describe('updateOrder', () => {
  test('새 parentKey 순서 저장', () => {
    const map = updateOrder({}, 'root', ['a', 'b'])
    expect(map).toEqual({ root: ['a', 'b'] })
  })

  test('기존 parentKey 갱신 (다른 키 보존)', () => {
    const map = updateOrder({ x: ['1'], y: ['2'] }, 'y', ['3'])
    expect(map).toEqual({ x: ['1'], y: ['3'] })
  })
})

describe('load/save round-trip', () => {
  test('localStorage 없어도 안전', () => {
    // window 미노출 환경 (node) — no-op 반환.
    expect(loadReorderMap()).toEqual({})
    saveReorderMap({ x: ['a'] })
  })
})
