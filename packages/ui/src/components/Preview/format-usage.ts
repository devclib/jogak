/**
 * 알파.10.3: 컴포넌트 사용 코드 포매터.
 *
 * 코드 패널에는 `.jogak.tsx` 파일 전체가 아니라, 현재 args 기반의 사용 스니펫을 노출한다.
 * 사용자가 Controls 패널에서 args를 바꾸면 즉시 갱신된다.
 *
 * 출력 예:
 *   <Badge variant="default">New</Badge>
 *
 *   <Card
 *     title="Hello"
 *     disabled
 *     onClick={fn}
 *   />
 */

import type { RegistryEntry } from '@jogak/core'

const SINGLE_LINE_THRESHOLD = 60

/**
 * `entry` + 현재 `args`로부터 JSX 사용 코드를 생성한다.
 * children은 태그 본문에, 나머지 props는 attribute로.
 */
export function formatUsageCode(
  entry: RegistryEntry,
  args: Readonly<Record<string, unknown>>,
): string {
  const componentName = resolveComponentName(entry)
  const { children, restProps } = splitChildren(args)

  const propTokens = Object.entries(restProps)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => formatProp(k, v))

  const childrenStr = formatChildren(children)
  const hasChildren = childrenStr !== null

  // single-line 시도
  const inlineProps = propTokens.length === 0 ? '' : ' ' + propTokens.join(' ')
  const singleLine = hasChildren
    ? `<${componentName}${inlineProps}>${childrenStr ?? ''}</${componentName}>`
    : `<${componentName}${inlineProps} />`

  if (singleLine.length <= SINGLE_LINE_THRESHOLD && !singleLine.includes('\n')) {
    return singleLine
  }

  // multi-line — 각 prop을 별도 줄에
  const indentedProps =
    propTokens.length === 0 ? '' : '\n  ' + propTokens.join('\n  ') + '\n'
  if (hasChildren) {
    const indentedChildren = (childrenStr ?? '')
      .split('\n')
      .map((line) => `  ${line}`)
      .join('\n')
    return `<${componentName}${indentedProps}>\n${indentedChildren}\n</${componentName}>`
  }
  return `<${componentName}${indentedProps}/>`
}

function resolveComponentName(entry: RegistryEntry): string {
  // 알파.14.1: iframe isolation 모드는 chrome scope에 component를 import하지 않으므로
  // entry.meta.component가 `null`. fallback (title 마지막 segment)으로 직행한다.
  const component = entry.meta.component as
    | { displayName?: unknown; name?: unknown }
    | null
    | undefined
  if (component !== null && component !== undefined) {
    if (typeof component.displayName === 'string' && component.displayName.length > 0) {
      return component.displayName
    }
    if (typeof component.name === 'string' && component.name.length > 0) {
      return component.name
    }
  }
  // fallback: title의 마지막 segment ("UI/Badge" → "Badge")
  const lastSeg = entry.title.split('/').pop()
  return lastSeg !== undefined && lastSeg.length > 0 ? lastSeg : 'Component'
}

interface SplitChildrenResult {
  readonly children: unknown
  readonly restProps: Readonly<Record<string, unknown>>
}

function splitChildren(args: Readonly<Record<string, unknown>>): SplitChildrenResult {
  const { children, ...rest } = args as { children?: unknown } & Record<string, unknown>
  return { children, restProps: rest }
}

function formatChildren(children: unknown): string | null {
  if (children === undefined || children === null) return null
  if (typeof children === 'string') {
    if (children.length === 0) return null
    return children
  }
  if (typeof children === 'number' || typeof children === 'bigint') {
    return `{${children.toString()}}`
  }
  if (typeof children === 'boolean') {
    return null
  }
  // 복합 타입(object/array/function): JSON 표현
  return `{${stringifyValue(children)}}`
}

function formatProp(key: string, value: unknown): string {
  if (value === true) return key
  if (value === false) return `${key}={false}`
  if (value === null) return `${key}={null}`
  if (typeof value === 'string') {
    // 따옴표 escape
    const escaped = value.replace(/"/gu, '&quot;')
    return `${key}="${escaped}"`
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    return `${key}={${value.toString()}}`
  }
  if (typeof value === 'function') {
    return `${key}={fn}`
  }
  return `${key}={${stringifyValue(value)}}`
}

function stringifyValue(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}
