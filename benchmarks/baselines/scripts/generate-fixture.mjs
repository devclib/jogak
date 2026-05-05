#!/usr/bin/env node
/**
 * Jogak vs Storybook scale benchmark fixture generator
 *
 * 사용법:
 *   node generate-fixture.mjs <count>
 *
 * 출력:
 *   benchmarks/baselines/shared/components/generated/CompNNN.tsx
 *   benchmarks/baselines/jogak/src/generated/CompNNN.jogak.tsx
 *   benchmarks/baselines/storybook/src/generated/CompNNN.stories.tsx
 *
 * 설계 원칙:
 *   - 시드 고정(LCG) → 매번 동일 출력 (재현 가능)
 *   - 컴포넌트마다 props가 *살짝* 달라짐 (extractor 캐싱이 부풀려진 결과를 만들지 않게)
 *   - 양쪽 도구가 동일 shared 컴포넌트 import (공정성)
 *   - exactOptionalPropertyTypes 호환 (any/ts-ignore 없음)
 */

import { mkdir, rm, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BASELINES = resolve(__dirname, '..')
const SHARED_DIR = resolve(BASELINES, 'shared/components/generated')
const JOGAK_DIR = resolve(BASELINES, 'jogak/src/generated')
const SB_DIR = resolve(BASELINES, 'storybook/src/generated')

// --------- 시드 고정 LCG ---------
function makeRng(seed) {
  let s = seed >>> 0
  return () => {
    // Numerical Recipes LCG
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

// --------- 컴포넌트 배리언트 ---------
// 컴포넌트마다 살짝 다른 props 패턴을 사용 (8가지 패턴 순환)
// 각 패턴은 props 이름·타입을 미세하게 변형해 docgen / ts-morph 캐싱이 무효화되도록 함
const PATTERNS = [
  // 0: 기본 — variant + size + disabled + label
  {
    propsBody: `  /** 라벨 텍스트 */
  readonly label: string
  /** 시각적 톤 */
  readonly variant?: 'primary' | 'secondary' | 'ghost'
  /** 사이즈 */
  readonly size?: 'sm' | 'md' | 'lg'
  /** 비활성화 여부 */
  readonly disabled?: boolean
  /** 카운트 */
  readonly count?: number
  /** 클릭 핸들러 */
  readonly onClick?: () => void`,
    destructure: `label, variant = 'primary', size = 'md', disabled = false, count`,
    render: `<div role="group" data-variant={variant} data-size={size} aria-disabled={disabled}>{label}{count !== undefined ? \` (\${count.toString()})\` : ''}</div>`,
    args: (i) => ({
      label: `Label ${i}`,
      variant: pick(i, ['primary', 'secondary', 'ghost']),
      size: pick(i, ['sm', 'md', 'lg']),
      disabled: i % 4 === 0,
      count: i % 3 === 0 ? i : undefined,
    }),
    argTypes: ['label', 'variant', 'size', 'disabled', 'count'],
  },
  // 1: tone + density + readonly
  {
    propsBody: `  /** 제목 */
  readonly title: string
  /** 강조 톤 */
  readonly tone?: 'neutral' | 'info' | 'warning' | 'danger'
  /** 밀도 */
  readonly density?: 'compact' | 'cozy' | 'comfortable'
  /** 읽기 전용 */
  readonly readOnly?: boolean
  /** 인덱스 */
  readonly index?: number`,
    destructure: `title, tone = 'neutral', density = 'cozy', readOnly = false, index`,
    render: `<section data-tone={tone} data-density={density} aria-readonly={readOnly}>{title}{index !== undefined ? \` #\${index.toString()}\` : ''}</section>`,
    args: (i) => ({
      title: `Title ${i}`,
      tone: pick(i, ['neutral', 'info', 'warning', 'danger']),
      density: pick(i, ['compact', 'cozy', 'comfortable']),
      readOnly: i % 5 === 0,
      index: i % 2 === 0 ? i : undefined,
    }),
    argTypes: ['title', 'tone', 'density', 'readOnly', 'index'],
  },
  // 2: kind + level + visible
  {
    propsBody: `  /** 메시지 본문 */
  readonly message: string
  /** 종류 */
  readonly kind?: 'note' | 'tip' | 'caution' | 'important'
  /** 레벨 */
  readonly level?: 1 | 2 | 3
  /** 표시 여부 */
  readonly visible?: boolean
  /** 트리거 */
  readonly onTrigger?: () => void`,
    destructure: `message, kind = 'note', level = 1, visible = true`,
    render: `<aside data-kind={kind} data-level={level.toString()} hidden={!visible}>{message}</aside>`,
    args: (i) => ({
      message: `Message ${i}`,
      kind: pick(i, ['note', 'tip', 'caution', 'important']),
      level: pick(i, [1, 2, 3]),
      visible: i % 7 !== 0,
    }),
    argTypes: ['message', 'kind', 'level', 'visible'],
  },
  // 3: shape + outline + glow
  {
    propsBody: `  /** 표시 텍스트 */
  readonly text: string
  /** 모양 */
  readonly shape?: 'pill' | 'rounded' | 'square'
  /** 외곽선 */
  readonly outline?: boolean
  /** 글로우 */
  readonly glow?: boolean
  /** 가중치 */
  readonly weight?: number`,
    destructure: `text, shape = 'pill', outline = false, glow = false, weight`,
    render: `<span data-shape={shape} data-outline={outline} data-glow={glow}>{text}{weight !== undefined ? \` ×\${weight.toString()}\` : ''}</span>`,
    args: (i) => ({
      text: `Text ${i}`,
      shape: pick(i, ['pill', 'rounded', 'square']),
      outline: i % 3 === 0,
      glow: i % 6 === 0,
      weight: i % 4 === 0 ? i : undefined,
    }),
    argTypes: ['text', 'shape', 'outline', 'glow', 'weight'],
  },
  // 4: orientation + spacing + dense
  {
    propsBody: `  /** 항목 라벨 */
  readonly itemLabel: string
  /** 정렬 방향 */
  readonly orientation?: 'horizontal' | 'vertical'
  /** 간격 */
  readonly spacing?: 'none' | 'xs' | 'sm' | 'md' | 'lg'
  /** 압축 모드 */
  readonly dense?: boolean
  /** 우선순위 */
  readonly priority?: number`,
    destructure: `itemLabel, orientation = 'horizontal', spacing = 'md', dense = false, priority`,
    render: `<div data-orientation={orientation} data-spacing={spacing} data-dense={dense}>{itemLabel}{priority !== undefined ? \` p\${priority.toString()}\` : ''}</div>`,
    args: (i) => ({
      itemLabel: `Item ${i}`,
      orientation: pick(i, ['horizontal', 'vertical']),
      spacing: pick(i, ['none', 'xs', 'sm', 'md', 'lg']),
      dense: i % 3 === 0,
      priority: i,
    }),
    argTypes: ['itemLabel', 'orientation', 'spacing', 'dense', 'priority'],
  },
  // 5: state + animated + delay
  {
    propsBody: `  /** 식별자 */
  readonly id: string
  /** 상태 */
  readonly state?: 'idle' | 'loading' | 'success' | 'error'
  /** 애니메이션 사용 */
  readonly animated?: boolean
  /** 딜레이(ms) */
  readonly delay?: number
  /** 라벨 */
  readonly caption?: string`,
    destructure: `id, state = 'idle', animated = true, delay = 0, caption`,
    render: `<output data-id={id} data-state={state} data-animated={animated} data-delay={delay.toString()}>{caption ?? id}</output>`,
    args: (i) => ({
      id: `id-${i}`,
      state: pick(i, ['idle', 'loading', 'success', 'error']),
      animated: i % 2 === 0,
      delay: (i % 5) * 100,
      caption: i % 3 === 0 ? `Caption ${i}` : undefined,
    }),
    argTypes: ['id', 'state', 'animated', 'delay', 'caption'],
  },
  // 6: align + truncate + lines
  {
    propsBody: `  /** 본문 */
  readonly content: string
  /** 정렬 */
  readonly align?: 'start' | 'center' | 'end' | 'justify'
  /** 줄임 */
  readonly truncate?: boolean
  /** 최대 라인 수 */
  readonly lines?: number
  /** 두께 */
  readonly weight?: 'normal' | 'medium' | 'bold'`,
    destructure: `content, align = 'start', truncate = false, lines, weight = 'normal'`,
    render: `<p data-align={align} data-truncate={truncate} data-weight={weight} data-lines={lines !== undefined ? lines.toString() : ''}>{content}</p>`,
    args: (i) => ({
      content: `Content ${i}`,
      align: pick(i, ['start', 'center', 'end', 'justify']),
      truncate: i % 4 === 0,
      lines: i % 5 === 0 ? (i % 4) + 1 : undefined,
      weight: pick(i, ['normal', 'medium', 'bold']),
    }),
    argTypes: ['content', 'align', 'truncate', 'lines', 'weight'],
  },
  // 7: appearance + iconPosition + loading
  {
    propsBody: `  /** 캡션 */
  readonly caption: string
  /** 외형 */
  readonly appearance?: 'filled' | 'outlined' | 'tonal' | 'plain'
  /** 아이콘 위치 */
  readonly iconPosition?: 'leading' | 'trailing' | 'none'
  /** 로딩 표시 */
  readonly loading?: boolean
  /** 진행률(0-100) */
  readonly progress?: number`,
    destructure: `caption, appearance = 'filled', iconPosition = 'none', loading = false, progress`,
    render: `<button type="button" data-appearance={appearance} data-icon-position={iconPosition} data-loading={loading} data-progress={progress !== undefined ? progress.toString() : ''}>{caption}</button>`,
    args: (i) => ({
      caption: `Caption ${i}`,
      appearance: pick(i, ['filled', 'outlined', 'tonal', 'plain']),
      iconPosition: pick(i, ['leading', 'trailing', 'none']),
      loading: i % 6 === 0,
      progress: i % 4 === 0 ? (i * 7) % 101 : undefined,
    }),
    argTypes: ['caption', 'appearance', 'iconPosition', 'loading', 'progress'],
  },
]

function pick(seed, arr) {
  return arr[seed % arr.length]
}

function pad(n, width = 3) {
  return n.toString().padStart(width, '0')
}

function patternFor(i) {
  return PATTERNS[i % PATTERNS.length]
}

// --------- 컴포넌트 코드 생성 ---------
function makeSharedComponent(i) {
  const id = pad(i)
  const name = `Comp${id}`
  const p = patternFor(i)
  return `import * as React from 'react'

export interface ${name}Props {
${p.propsBody}
}

export function ${name}(props: ${name}Props): React.JSX.Element {
  const { ${p.destructure} } = props
  return (
    ${p.render}
  )
}
`
}

function makeJogakEntry(i) {
  const id = pad(i)
  const name = `Comp${id}`
  const p = patternFor(i)
  // 3개 entries (variant 분포가 다양해야 트리에서도 의미 있음)
  const entryArgs = [p.args(i), p.args(i + 1), p.args(i + 2)]
  const argTypes = p.argTypes.map((k) => `    ${k}: { description: '${k}' },`).join('\n')

  // entry args의 경우 'undefined' 값은 직렬화 시 생략
  function formatArgs(obj) {
    const entries = Object.entries(obj).filter(([, v]) => v !== undefined)
    return entries
      .map(([k, v]) => `${k}: ${typeof v === 'string' ? `'${v.replace(/'/g, "\\'")}'` : String(v)}`)
      .join(', ')
  }

  return `import type { JogakMeta, Jogak } from '@jogak/core'
import { ${name} } from '../../../shared/components/generated/${name}.js'

const meta = {
  title: 'Generated/${name}',
  component: ${name},
  argTypes: {
${argTypes}
  },
} satisfies JogakMeta

export default meta

export const First: Jogak = {
  name: 'First',
  args: { ${formatArgs(entryArgs[0])} },
}

export const Second: Jogak = {
  name: 'Second',
  args: { ${formatArgs(entryArgs[1])} },
}

export const Third: Jogak = {
  name: 'Third',
  args: { ${formatArgs(entryArgs[2])} },
}
`
}

function makeStorybookEntry(i) {
  const id = pad(i)
  const name = `Comp${id}`
  const p = patternFor(i)
  const entryArgs = [p.args(i), p.args(i + 1), p.args(i + 2)]
  const argTypes = p.argTypes.map((k) => `    ${k}: { description: '${k}' },`).join('\n')

  function formatArgs(obj) {
    const entries = Object.entries(obj).filter(([, v]) => v !== undefined)
    return entries
      .map(([k, v]) => `${k}: ${typeof v === 'string' ? `'${v.replace(/'/g, "\\'")}'` : String(v)}`)
      .join(', ')
  }

  return `import type { Meta, StoryObj } from '@storybook/react'
import { ${name} } from '../../../shared/components/generated/${name}.js'

const meta: Meta<typeof ${name}> = {
  title: 'Generated/${name}',
  component: ${name},
  argTypes: {
${argTypes}
  },
}

export default meta
type Story = StoryObj<typeof ${name}>

export const First: Story = {
  args: { ${formatArgs(entryArgs[0])} },
}

export const Second: Story = {
  args: { ${formatArgs(entryArgs[1])} },
}

export const Third: Story = {
  args: { ${formatArgs(entryArgs[2])} },
}
`
}

// --------- 메인 ---------
async function main() {
  const arg = process.argv[2]
  const count = Number(arg)
  if (!Number.isFinite(count) || count < 1) {
    process.stderr.write(`Usage: node generate-fixture.mjs <count>\n예: node generate-fixture.mjs 100\n`)
    process.exit(1)
  }

  // 시드 고정 (count 영향받지 않게 fixed)
  const _rng = makeRng(0xc0ffee)
  // 현재는 LCG가 필요하지 않지만, 이후 무작위 분포가 필요해지면 사용
  // (현재 분포는 i % N 패턴으로 결정적)
  void _rng

  // 1. clean
  for (const dir of [SHARED_DIR, JOGAK_DIR, SB_DIR]) {
    await rm(dir, { recursive: true, force: true })
    await mkdir(dir, { recursive: true })
  }

  // 2. generate
  const tasks = []
  for (let i = 1; i <= count; i++) {
    const id = pad(i)
    tasks.push(writeFile(resolve(SHARED_DIR, `Comp${id}.tsx`), makeSharedComponent(i), 'utf8'))
    tasks.push(writeFile(resolve(JOGAK_DIR, `Comp${id}.jogak.tsx`), makeJogakEntry(i), 'utf8'))
    tasks.push(writeFile(resolve(SB_DIR, `Comp${id}.stories.tsx`), makeStorybookEntry(i), 'utf8'))
  }
  await Promise.all(tasks)

  process.stdout.write(`generated ${count.toString()} components → shared/, jogak/, storybook/\n`)
}

await main()
