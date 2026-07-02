/**
 * `jogak init` — 새 프로젝트에 jogak.config.ts + 첫 예시 컴포넌트/스토리 파일 자동 생성.
 *
 * 목적: 첫 5분 UX 완결 — 사용자가 `pnpm add -D @jogak/cli @jogak/core` 직후 `jogak init` 실행 →
 * 즉시 `jogak dev`로 확인 가능한 상태.
 *
 * 감지 & 생성:
 * - `jogak.config.ts` 없으면 새로 작성 (있으면 skip + 알림)
 * - `src/components/Button/{Button.tsx, Button.jogak.tsx}` 없으면 생성 (있으면 skip)
 * - 이미 있는 파일은 절대 덮어쓰지 않음 — 안전 first
 *
 * Flags:
 * - `--force` — 기존 파일도 덮어쓰기 (destructive, 명시 opt-in)
 * - `--path <dir>` — 컴포넌트 생성 위치 (기본: `src/components/Button`)
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'

export interface InitCliArgs {
  readonly cwd: string
  readonly force: boolean
  readonly componentPath: string
}

export function runInitCommand(args: InitCliArgs): void {
  const { cwd, force, componentPath } = args
  const outputs: { readonly file: string; readonly action: 'created' | 'skipped' | 'overwritten' }[] = []

  // 1. jogak.config.ts
  const configPath = resolve(cwd, 'jogak.config.ts')
  const configExisted = existsSync(configPath)
  if (!configExisted || force) {
    ensureDir(dirname(configPath))
    writeFileSync(configPath, JOGAK_CONFIG_TEMPLATE, 'utf8')
    outputs.push({ file: 'jogak.config.ts', action: configExisted ? 'overwritten' : 'created' })
  } else {
    outputs.push({ file: 'jogak.config.ts', action: 'skipped' })
  }

  // 2. Button.tsx
  const buttonDir = resolve(cwd, componentPath)
  const buttonPath = resolve(buttonDir, 'Button.tsx')
  ensureDir(buttonDir)
  const buttonExisted = existsSync(buttonPath)
  if (!buttonExisted || force) {
    writeFileSync(buttonPath, BUTTON_COMPONENT_TEMPLATE, 'utf8')
    outputs.push({ file: `${componentPath}/Button.tsx`, action: buttonExisted ? 'overwritten' : 'created' })
  } else {
    outputs.push({ file: `${componentPath}/Button.tsx`, action: 'skipped' })
  }

  // 3. Button.jogak.tsx
  const jogakPath = resolve(buttonDir, 'Button.jogak.tsx')
  const jogakExisted = existsSync(jogakPath)
  if (!jogakExisted || force) {
    writeFileSync(jogakPath, BUTTON_JOGAK_TEMPLATE, 'utf8')
    outputs.push({ file: `${componentPath}/Button.jogak.tsx`, action: jogakExisted ? 'overwritten' : 'created' })
  } else {
    outputs.push({ file: `${componentPath}/Button.jogak.tsx`, action: 'skipped' })
  }

  // 보고
  process.stdout.write('[jogak init]\n')
  for (const o of outputs) {
    const marker = o.action === 'created' ? '✓' : o.action === 'overwritten' ? '↻' : '·'
    process.stdout.write(`  ${marker} ${o.file} (${o.action})\n`)
  }
  const anyCreated = outputs.some((o) => o.action === 'created' || o.action === 'overwritten')
  if (anyCreated) {
    process.stdout.write('\nNext:\n  pnpm jogak dev\n\nDocs: https://jogak.dev/en/docs\n')
  } else {
    process.stdout.write('\nNothing to do — all files already exist. Use --force to overwrite.\n')
  }
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

const JOGAK_CONFIG_TEMPLATE = `import { defineJogakConfig } from '@jogak/core'

export default defineJogakConfig({
  // 자동 감지: framework, .jogak.{ts,tsx} 파일, tsconfig alias.
  // 아래 옵션들은 모두 optional — 필요할 때만 활성화.
  //
  // framework: 'react',  // 'react' | 'next' | 'vue' | 'svelte' | 'web-components'
  // globalCss: 'src/styles/globals.css',
  // themes: ['light', 'dark'],  // toolbar theme selector
  // patterns: ['src/**/*.jogak.{ts,tsx}', 'src/**/*.stories.{ts,tsx}'],
})
`

const BUTTON_COMPONENT_TEMPLATE = `import type { ReactNode } from 'react'

export interface ButtonProps {
  /** 버튼 라벨 */
  readonly children: ReactNode
  /** 시각적 변형 */
  readonly variant?: 'primary' | 'secondary'
  /** 비활성화 상태 */
  readonly disabled?: boolean
  /** 클릭 이벤트 */
  readonly onClick?: () => void
}

export function Button({ children, variant = 'primary', disabled, onClick }: ButtonProps) {
  const style = {
    padding: '8px 16px',
    fontSize: 14,
    fontWeight: 500,
    border: 'none',
    borderRadius: 6,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    background: variant === 'primary' ? '#3b82f6' : '#e5e7eb',
    color: variant === 'primary' ? '#ffffff' : '#111827',
  }
  return (
    <button type="button" style={style} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  )
}
`

const BUTTON_JOGAK_TEMPLATE = `import type { JogakMeta, Jogak } from '@jogak/core'
import { Button } from './Button'

const meta = {
  title: 'Components/Button',
  component: Button,
} satisfies JogakMeta

export default meta

export const Primary: Jogak = {
  name: 'Primary',
  args: { children: 'Save', variant: 'primary' },
}

export const Secondary: Jogak = {
  name: 'Secondary',
  args: { children: 'Cancel', variant: 'secondary' },
}

export const Disabled: Jogak = {
  name: 'Disabled',
  args: { children: 'Locked', variant: 'primary', disabled: true },
}
`
