import { describe, expect, it } from 'vitest'
import { ComponentRegistry } from '../registry.js'
import type { RegistryEntry, RegistryEntryMeta } from '../types.js'

/**
 * registry 의 entry ordering 결정성 회귀 방지 테스트.
 *
 * spec: `_workspace/01_arch/api-contracts.md` §4 — 9 케이스.
 *
 * 정렬 정책: title 알파벳 (`localeCompare('en', { sensitivity:'base', numeric:true })`)
 * + tie-break id. dev/build 양쪽 mode 가 같은 ordering 을 만들도록 단일 source.
 */

function makeMeta(idAndTitle: string): RegistryEntryMeta {
  return {
    id: idAndTitle,
    title: idAndTitle,
    jogakNames: ['Default'],
    autoArgTypes: {},
    userArgTypes: {},
    source: '',
    filePath: '',
    metaExtras: {},
  }
}

function makeEntry(idAndTitle: string): RegistryEntry {
  return {
    id: idAndTitle,
    title: idAndTitle,
    jogaks: [{ name: 'Default' }],
    meta: { title: idAndTitle, component: undefined },
  }
}

describe('ComponentRegistry — ordering 결정성', () => {
  it('Case 1: registerMeta 를 임의 순서로 호출해도 getAllMeta / getMetaTree 결과가 항상 동일하다', () => {
    const ids = [
      'Components/Card',
      'Components/Badge',
      'Forms/Input',
      'Components/Button',
      'Forms/Select',
    ]
    const shuffles: string[][] = [
      ids.slice(),
      [...ids].reverse(),
      [ids[2]!, ids[0]!, ids[4]!, ids[1]!, ids[3]!],
    ]
    const metaSnapshots: string[][] = []
    const treeSnapshots: string[] = []
    for (const order of shuffles) {
      const reg = new ComponentRegistry()
      for (const id of order) {
        reg.registerMeta(makeMeta(id))
      }
      metaSnapshots.push(reg.getAllMeta().map((m) => m.id))
      treeSnapshots.push(JSON.stringify(reg.getMetaTree()))
    }
    expect(metaSnapshots[0]).toEqual(metaSnapshots[1])
    expect(metaSnapshots[0]).toEqual(metaSnapshots[2])
    expect(treeSnapshots[0]).toEqual(treeSnapshots[1])
    expect(treeSnapshots[0]).toEqual(treeSnapshots[2])
  })

  it('Case 2: register 를 임의 순서로 호출해도 getAll / getTree 결과가 항상 동일하다', () => {
    const ids = [
      'Components/Card',
      'Components/Badge',
      'Forms/Input',
      'Components/Button',
      'Forms/Select',
    ]
    const shuffles: string[][] = [
      ids.slice(),
      [...ids].reverse(),
      [ids[3]!, ids[1]!, ids[4]!, ids[0]!, ids[2]!],
    ]
    const allSnapshots: string[][] = []
    const treeSnapshots: string[] = []
    for (const order of shuffles) {
      const reg = new ComponentRegistry()
      for (const id of order) {
        reg.register(makeEntry(id))
      }
      allSnapshots.push(reg.getAll().map((e) => e.id))
      treeSnapshots.push(JSON.stringify(reg.getTree()))
    }
    expect(allSnapshots[0]).toEqual(allSnapshots[1])
    expect(allSnapshots[0]).toEqual(allSnapshots[2])
    expect(treeSnapshots[0]).toEqual(treeSnapshots[1])
    expect(treeSnapshots[0]).toEqual(treeSnapshots[2])
  })

  it('Case 3: getAllMeta 결과는 title 알파벳 정렬을 따른다', () => {
    const reg = new ComponentRegistry()
    reg.registerMeta(makeMeta('Components/Button'))
    reg.registerMeta(makeMeta('Components/Badge'))
    reg.registerMeta(makeMeta('Components/Avatar'))
    expect(reg.getAllMeta().map((m) => m.id)).toEqual([
      'Components/Avatar',
      'Components/Badge',
      'Components/Button',
    ])
  })

  it('Case 4: 숫자 포함 title 은 자연 정렬한다 (Item2 < Item10)', () => {
    const reg = new ComponentRegistry()
    reg.registerMeta(makeMeta('List/Item10'))
    reg.registerMeta(makeMeta('List/Item2'))
    reg.registerMeta(makeMeta('List/Item1'))
    expect(reg.getAllMeta().map((m) => m.id)).toEqual([
      'List/Item1',
      'List/Item2',
      'List/Item10',
    ])
  })

  it('Case 5: 대소문자 차이는 정렬에 영향 없되 결정적이다', () => {
    // sensitivity: 'base' 로 'alpha' / 'Alpha' 는 동등 → tie-break id 로 결정.
    // 동일 registry 에 대해 두 번 호출이 항상 같은 결과를 내는지만 검증
    // (절대 순서는 환경별 차이 회피로 단언하지 않음).
    const reg = new ComponentRegistry()
    reg.registerMeta(makeMeta('alpha'))
    reg.registerMeta(makeMeta('Beta'))
    reg.registerMeta(makeMeta('Alpha'))
    const a = reg.getAllMeta().map((m) => m.id)
    const b = reg.getAllMeta().map((m) => m.id)
    expect(a).toEqual(b)
    // Beta 는 'b' base 라 'a' base 의 alpha/Alpha 보다 뒤에 와야 한다.
    expect(a[a.length - 1]).toBe('Beta')
    // alpha / Alpha 가 인접해 있어야 한다 (사이에 다른 것 없음).
    const alphaIdx = a.indexOf('alpha')
    const AlphaIdx = a.indexOf('Alpha')
    expect(Math.abs(alphaIdx - AlphaIdx)).toBe(1)
  })

  it('Case 6: getTree 결과의 Object.keys 순서가 결정적이다', () => {
    const reg = new ComponentRegistry()
    for (const id of ['Z/last', 'A/first', 'M/middle']) {
      reg.register(makeEntry(id))
    }
    const tree = reg.getTree()
    expect(Object.keys(tree)).toEqual(['A', 'M', 'Z'])
    // 각 카테고리의 leaf 도 결정적.
    const z = tree['Z']
    expect(z !== undefined && !('id' in z) ? Object.keys(z) : []).toEqual(['last'])
  })

  it('Case 7: registerMeta → unregister → registerMeta 사이클 후에도 정렬 유지', () => {
    const reg = new ComponentRegistry()
    reg.registerMeta(makeMeta('B'))
    reg.registerMeta(makeMeta('A'))
    reg.registerMeta(makeMeta('C'))
    reg.unregister('B')
    reg.registerMeta(makeMeta('B'))
    expect(reg.getAllMeta().map((m) => m.id)).toEqual(['A', 'B', 'C'])
  })

  it('Case 8: 동일 데이터셋이면 build path 와 dev path 의 ordering 이 일치한다', () => {
    const dataset = ['Components/Button', 'Components/Badge', 'Forms/Input']

    // build path: glob().sort() 로 sorted file 순서로 register(entry).
    const buildReg = new ComponentRegistry()
    for (const id of [...dataset].sort()) {
      buildReg.register(makeEntry(id))
    }

    // dev path: 임의 순서로 registerMeta + hydrateEntry.
    const devReg = new ComponentRegistry()
    const shuffled: string[] = [dataset[2]!, dataset[0]!, dataset[1]!]
    for (const id of shuffled) {
      devReg.registerMeta(makeMeta(id))
      devReg.hydrateEntry(id, [], undefined)
    }

    expect(buildReg.getAllMeta().map((m) => m.id)).toEqual(
      devReg.getAllMeta().map((m) => m.id),
    )
    expect(buildReg.getAll().map((e) => e.id)).toEqual(
      devReg.getAll().map((e) => e.id),
    )
    expect(JSON.stringify(buildReg.getMetaTree())).toEqual(
      JSON.stringify(devReg.getMetaTree()),
    )
    // 트리의 카테고리/leaf 키 ordering 만 비교 (구체 RegistryEntry payload 는
    // 양 path 의 makeEntry vs makeMeta+hydrateEntry 차이로 다를 수 있음).
    expect(Object.keys(buildReg.getTree())).toEqual(
      Object.keys(devReg.getTree()),
    )
  })

  it('Case 9: mutation 없으면 getAllMeta / getMetaTree / getAll / getTree 가 동일 reference 를 반환한다', () => {
    const reg = new ComponentRegistry()
    reg.registerMeta(makeMeta('A'))
    reg.registerMeta(makeMeta('B'))
    expect(reg.getAllMeta()).toBe(reg.getAllMeta())
    expect(reg.getMetaTree()).toBe(reg.getMetaTree())
    // hydrated 경로 — register() 는 batch 안에서 registerMeta + hydrateEntry 호출.
    reg.register(makeEntry('A'))
    expect(reg.getAll()).toBe(reg.getAll())
    expect(reg.getTree()).toBe(reg.getTree())
    // getAllMeta/getMetaTree 도 register() 후 다시 동일 reference 유지.
    expect(reg.getAllMeta()).toBe(reg.getAllMeta())
    expect(reg.getMetaTree()).toBe(reg.getMetaTree())
  })
})
