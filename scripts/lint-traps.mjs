#!/usr/bin/env node
// scripts/lint-traps.mjs
//
// 알파.5 함정 1~6 grep 자동화. Tailwind v4 + alpha.5 prefix(jogak) 환경에서
// 다음 패턴이 발견되면 즉시 실패한다.
//
//   1. text-[var(--jogak-text-*)]      — line-height 페어링 부수효과 (알파.5 메모 §1)
//   2. font-[var(--jogak-font-mono)]   — family-name hint 누락 (메모 §2)
//   3. (미적용 — background longhand 분해는 사후 검증 곤란, 변경 발생 시 spec 단계에서 차단)
//   4. <button.*jogak:leading-none     — flex padding button height shift (메모 §4)
//   5. jogak:border-none.*jogak:border-[trblxy]- — preflight 없는 환경 border-style none (메모 §5)
//   6. jogak:appearance-none           — UA reset 미적용 (메모 §6)
//
// 검사 대상: packages/ui/src/ 만. core / react / next / web-components / examples 제외.
//
// 추가 검증: --jogak-text-* / --jogak-sidebar-width 변수 사용처 zero (PR 4 §6.1 deprecate 결과).

import { spawnSync } from 'node:child_process'
import { exit } from 'node:process'

const ROOT = 'packages/ui/src'

const checks = [
  {
    name: '1. font-size pixel literal (text-[var(--jogak-text-*)] 금지)',
    pattern: 'jogak:text-\\[var\\(--jogak-text-',
    expectZero: true,
  },
  {
    name: '2. font-family family-name hint 누락 (jogak:font-[var(...)] 금지, family-name: 필수)',
    pattern: 'jogak:font-\\[var\\(',
    expectZero: true,
  },
  {
    name: '4. button leading-none 적용 금지',
    pattern: '<button[^>]*jogak:leading-none',
    expectZero: true,
  },
  {
    name: '5. border-none + border-{direction}-{n} 조합 금지',
    pattern: 'jogak:border-none.*jogak:border-(t|r|b|l|x|y)-',
    expectZero: true,
  },
  {
    name: '6. appearance-none 적용 금지',
    pattern: 'jogak:appearance-none',
    expectZero: true,
  },
  {
    name: '7. --jogak-text-* 변수 사용처 (PR 4 deprecate)',
    pattern: 'var\\(--jogak-text-(xs|sm|base|md|lg)\\)',
    expectZero: true,
  },
  {
    name: '8. --jogak-sidebar-width 변수 사용처 (PR 4 deprecate)',
    pattern: 'var\\(--jogak-sidebar-width\\)',
    expectZero: true,
  },
]

let fails = 0
for (const { name, pattern, expectZero } of checks) {
  const r = spawnSync('grep', ['-rEn', pattern, ROOT], { encoding: 'utf-8' })
  const matches = (r.stdout || '').trim().split('\n').filter(Boolean)
  const ok = expectZero ? matches.length === 0 : matches.length > 0
  if (ok) {
    console.log(`PASS  ${name}`)
  } else {
    console.error(`FAIL  ${name}`)
    matches.forEach((m) => console.error(`  ${m}`))
    fails += 1
  }
}

if (fails > 0) {
  console.error(`\nlint:traps — ${fails} 위반 발견.`)
  exit(1)
}
console.log(`\nlint:traps — 모든 함정 grep 위반 zero.`)
