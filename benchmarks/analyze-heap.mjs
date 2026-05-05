#!/usr/bin/env node
/**
 * .heapsnapshot 파일에서 큰 retainer를 식별한다.
 *
 * V8 snapshot 포맷:
 *   nodes:   flat Int array. [type, name(strIdx), id, self_size, edge_count, ...] per node
 *   strings: array of all interned strings
 *   meta.node_fields: field 이름 순서
 *   meta.node_types[0]: type enum (index 0)
 *
 * 출력:
 *   1) string top N (self_size 기준) — 가장 큰 문자열들
 *   2) string 내용을 카테고리(jogak source / vite transformed / sourcemap / etc)로 묶어 합산
 *   3) constructor별 self_size 합 + count (object 노드)
 *
 * 사용:
 *   node benchmarks/analyze-heap.mjs benchmarks/heap-normal.heapsnapshot
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const path = process.argv[2]
if (path === undefined) {
  process.stderr.write('usage: analyze-heap.mjs <path-to.heapsnapshot>\n')
  process.exit(1)
}

const TOP_N = 30

process.stdout.write(`[analyze] reading ${path}\n`)
const buf = readFileSync(resolve(path), 'utf8')
process.stdout.write(`[analyze] file ${(buf.length / 1024 / 1024).toFixed(1)} MB; parsing...\n`)
const snap = JSON.parse(buf)

const fields = snap.snapshot.meta.node_fields
const idxType = fields.indexOf('type')
const idxName = fields.indexOf('name')
const idxSelf = fields.indexOf('self_size')
const idxEdges = fields.indexOf('edge_count')
const stride = fields.length
const types = snap.snapshot.meta.node_types[0]
const nodes = snap.nodes
const strings = snap.strings
const nodeCount = nodes.length / stride

process.stdout.write(`[analyze] nodes=${nodeCount} strings=${strings.length}\n`)

// 0) type별 self_size 합 (전체 분포)
const byType = new Map()
const STRING_TYPES = new Set(['string', 'concatenated string', 'sliced string'])
const stringNodes = []
const objectByCtor = new Map()
const arrayByName = new Map()
let totalStringSelf = 0
let totalObjectSelf = 0
let totalAllSelf = 0

for (let i = 0; i < nodes.length; i += stride) {
  const t = types[nodes[i + idxType]]
  const size = nodes[i + idxSelf]
  totalAllSelf += size
  const cur = byType.get(t)
  if (cur === undefined) byType.set(t, { count: 1, totalSelf: size })
  else {
    cur.count++
    cur.totalSelf += size
  }
  if (STRING_TYPES.has(t)) {
    stringNodes.push({ size, name: strings[nodes[i + idxName]] ?? '' })
    totalStringSelf += size
  } else if (t === 'object') {
    const ctor = strings[nodes[i + idxName]] ?? '?'
    const c = objectByCtor.get(ctor)
    if (c === undefined) objectByCtor.set(ctor, { count: 1, totalSelf: size })
    else { c.count++; c.totalSelf += size }
    totalObjectSelf += size
  } else if (t === 'array') {
    const name = strings[nodes[i + idxName]] ?? '(array)'
    const c = arrayByName.get(name)
    if (c === undefined) arrayByName.set(name, { count: 1, totalSelf: size })
    else { c.count++; c.totalSelf += size }
  }
}

process.stdout.write(`\n=== node type breakdown (self_size sum) ===\n`)
process.stdout.write(`total self_size across all nodes: ${(totalAllSelf / 1024 / 1024).toFixed(1)} MB\n\n`)
const typeList = [...byType.entries()].sort((a, b) => b[1].totalSelf - a[1].totalSelf)
for (const [t, { count, totalSelf }] of typeList) {
  process.stdout.write(
    `${(totalSelf / 1024 / 1024).toFixed(2).padStart(7)} MB  ${count.toString().padStart(8)}×  ${t}\n`,
  )
}

// 1) string size top
stringNodes.sort((a, b) => b.size - a.size)
process.stdout.write(`\n=== top ${TOP_N} string nodes (self_size) ===\n`)
process.stdout.write(`total string self_size: ${(totalStringSelf / 1024 / 1024).toFixed(1)} MB across ${stringNodes.length}\n\n`)
for (let i = 0; i < Math.min(TOP_N, stringNodes.length); i++) {
  const s = stringNodes[i]
  const preview = s.name.length > 100 ? s.name.slice(0, 100) + '…' : s.name
  process.stdout.write(`${(s.size / 1024).toFixed(1).padStart(9)} KB  ${preview.replace(/\n/g, '\\n')}\n`)
}

// 2) string category buckets
function classify(s) {
  // 패턴 기반 분류
  if (/Comp\d+\.jogak\.tsx/.test(s)) return 'jogak fixture (?raw inline)'
  if (/^import .* from /.test(s) && /generated\/Comp\d+/.test(s)) return 'jogak virtual module'
  if (s.includes('//# sourceMappingURL=data:application/json;base64')) return 'inline sourcemap'
  if (s.startsWith('data:application/json;base64,')) return 'base64 sourcemap'
  if (/\bfile:\/\/.*node_modules/.test(s)) return 'file:// to node_modules'
  if (/\\u[0-9a-f]{4}/.test(s) && s.length > 5000) return 'large encoded blob'
  if (s.includes('react-refresh')) return 'react-refresh runtime'
  if (s.includes('@vite/') || s.includes('vite/dist/client')) return 'vite client runtime'
  if (s.length >= 10000) return 'other large (≥10KB)'
  return null
}

const buckets = new Map()
for (const { size, name } of stringNodes) {
  if (size < 1024) continue // < 1KB는 무시 (cardinality 너무 큼)
  const cat = classify(name) ?? 'other'
  const cur = buckets.get(cat)
  if (cur === undefined) buckets.set(cat, { count: 1, total: size })
  else { cur.count++; cur.total += size }
}
const bucketList = [...buckets.entries()].sort((a, b) => b[1].total - a[1].total)
process.stdout.write(`\n=== string size buckets (only ≥1KB strings) ===\n`)
for (const [cat, { count, total }] of bucketList) {
  process.stdout.write(`${(total / 1024 / 1024).toFixed(1).padStart(7)} MB  ${count.toString().padStart(6)}×  ${cat}\n`)
}

// 2.5) array name top (큰 internal/system arrays — V8 backing stores)
process.stdout.write(`\n=== top ${TOP_N} array names (sum self_size) ===\n`)
const arrayList = [...arrayByName.entries()].sort((a, b) => b[1].totalSelf - a[1].totalSelf)
for (let i = 0; i < Math.min(TOP_N, arrayList.length); i++) {
  const [name, { count, totalSelf }] = arrayList[i]
  process.stdout.write(
    `${(totalSelf / 1024 / 1024).toFixed(2).padStart(7)} MB  ${count.toString().padStart(7)}×  ${name}\n`,
  )
}

// 3) object constructor top (self only — retained는 전체 그래프 traversal 필요해 생략)
process.stdout.write(`\n=== top ${TOP_N} object constructors (by sum self_size) ===\n`)
process.stdout.write(`total object self_size: ${(totalObjectSelf / 1024 / 1024).toFixed(1)} MB\n\n`)
const ctorList = [...objectByCtor.entries()].sort((a, b) => b[1].totalSelf - a[1].totalSelf)
for (let i = 0; i < Math.min(TOP_N, ctorList.length); i++) {
  const [ctor, { count, totalSelf }] = ctorList[i]
  process.stdout.write(
    `${(totalSelf / 1024 / 1024).toFixed(2).padStart(7)} MB  ${count.toString().padStart(7)}×  ${ctor}\n`,
  )
}
