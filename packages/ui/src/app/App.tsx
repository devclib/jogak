import { useState, useCallback, useEffect, useMemo } from 'react'
import { ComponentRegistry, defaultRegistry } from '@jogak/core'
import type { RegistryEntry, RegistryEntryMeta } from '@jogak/core'
import { JogakProvider } from '@jogak/react'
import { Sidebar } from '../components/Sidebar/index.js'
import { Preview } from '../components/Preview/index.js'
import type { ReactElement } from 'react'

/**
 * `JogakApp` props.
 *
 *  - `entries`: 기존 — eager 모드. 정적 빌드 / 테스트용. 새 `ComponentRegistry`에 즉시 register.
 *  - `metas`  : NEW — lazy 모드. `defaultRegistry`를 그대로 사용하면서 metas를 `registerMeta`로 등록.
 *  - 둘 다 미지정 → `defaultRegistry` 그대로 사용 (인덱스 가상모듈 `import 'virtual:jogak'`이 채웠다고 가정).
 *  - 둘 다 지정 → console.warn 후 `entries` 우선 (eager 우선, breaking 회피).
 *
 * 외부 호환을 위해 `entries`는 optional로만 변경되며 나머지 시그니처는 그대로 유지된다.
 */
export interface JogakAppProps {
  readonly entries?: readonly RegistryEntry[]
  readonly metas?: readonly RegistryEntryMeta[]
  readonly codeTheme?: string
  /**
   * 알파.7: Preview 영역 격리 모드. default `'none'`.
   *
   * - `'none'` — Preview 콘텐츠를 chrome 같은 document에 렌더 (알파.6까지의 동작).
   * - `'shadow'` — ShadowRoot 안에 마운트. 사용자 globalCss/reset이 chrome 침범 차단.
   * - `'iframe'` — 별도 document(iframe)에 마운트. 가장 강한 격리.
   *
   * 자세한 트레이드오프는 `@jogak/ui` README의 "previewIsolation 사용 가이드" 참조.
   */
  readonly previewIsolation?: 'none' | 'shadow' | 'iframe'
}

function readUrlParams(): { entryId: string; jogakName: string | null } | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const entryId = params.get('entry')
  if (entryId === null) return null
  const jogakName = params.get('jogak')
  return { entryId, jogakName }
}

function pushUrl(entryId: string, jogakName: string): void {
  const params = new URLSearchParams()
  params.set('entry', entryId)
  params.set('jogak', jogakName)
  window.history.pushState({}, '', `?${params.toString()}`)
}

export function JogakApp({
  entries,
  metas,
  codeTheme = 'vsDark',
  previewIsolation = 'shadow',
}: JogakAppProps = {}): ReactElement {
  // ── 4가지 모드 결정 (계약 §5.2) ─────────────────────────────────────
  // 1) entries가 주어지면: 새 ComponentRegistry에 register (eager, 기존 동작)
  // 2) metas만 주어지면: defaultRegistry 사용 + metas를 registerMeta로 등록
  // 3) 둘 다 미지정: defaultRegistry 그대로 (인덱스 가상모듈이 채웠다고 가정)
  // 4) 둘 다 지정: warn 후 entries 우선 (breaking 회피)
  const registry = useMemo(() => {
    if (entries !== undefined) {
      if (metas !== undefined) {
        // eslint-disable-next-line no-console
        console.warn(
          '[jogak] JogakApp received both `entries` and `metas` — `entries` (eager) takes precedence.',
        )
      }
      const r = new ComponentRegistry()
      for (const entry of entries) r.register(entry)
      return r
    }
    if (metas !== undefined) {
      for (const meta of metas) defaultRegistry.registerMeta(meta)
    }
    return defaultRegistry
  }, [entries, metas])

  // ── URL deep link 초기 상태 (계약 §5.5) ──────────────────────────────
  // ?entry=<id>&jogak=<name>로 진입 시 그 entry로 마운트. jogak 미지정이면
  // 사이드바가 첫 jogak을 자동 선택하지 않으므로 entry hydrate 후 보정한다.
  const initial = useMemo(() => readUrlParams(), [])
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(
    initial?.entryId ?? null,
  )
  const [selectedJogakName, setSelectedJogakName] = useState<string | null>(
    initial?.jogakName ?? null,
  )
  const [overrideArgs, setOverrideArgs] = useState<Readonly<Record<string, unknown>>>({})

  useEffect(() => {
    const handlePopState = (): void => {
      const parsed = readUrlParams()
      if (parsed !== null) {
        setSelectedEntryId(parsed.entryId)
        setSelectedJogakName(parsed.jogakName)
        setOverrideArgs({})
      } else {
        setSelectedEntryId(null)
        setSelectedJogakName(null)
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => { window.removeEventListener('popstate', handlePopState) }
  }, [])

  const handleSelect = useCallback((entryId: string, jogakName: string) => {
    setSelectedEntryId(entryId)
    setSelectedJogakName(jogakName)
    setOverrideArgs({})
    pushUrl(entryId, jogakName)
  }, [])

  const handleResolveJogak = useCallback((entryId: string, jogakName: string) => {
    // Preview가 entry를 hydrate한 뒤 jogakName이 비어있을 때 첫 jogak로 보정.
    setSelectedEntryId((prevId) => (prevId === entryId ? entryId : prevId))
    setSelectedJogakName((prev) => prev ?? jogakName)
    if (typeof window !== 'undefined') {
      // URL에 jogak이 누락된 경우만 보정 (사용자 history는 건드리지 않음 — replaceState).
      const params = new URLSearchParams(window.location.search)
      if (params.get('entry') === entryId && params.get('jogak') === null) {
        params.set('jogak', jogakName)
        window.history.replaceState({}, '', `?${params.toString()}`)
      }
    }
  }, [])

  const handleArgChange = useCallback((key: string, value: unknown) => {
    setOverrideArgs((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleReset = useCallback(() => {
    setOverrideArgs({})
  }, [])

  return (
    <JogakProvider registry={registry}>
      <div
        data-jogak-shell
        className="jogak:grid jogak:grid-cols-[260px_1fr] jogak:h-dvh jogak:overflow-hidden"
      >
        <Sidebar
          selectedEntryId={selectedEntryId}
          selectedJogakName={selectedJogakName}
          onSelect={handleSelect}
        />
        <main className="jogak:overflow-hidden jogak:min-h-0">
          {selectedEntryId !== null ? (
            <Preview
              entryId={selectedEntryId}
              jogakName={selectedJogakName}
              overrideArgs={overrideArgs}
              onArgChange={handleArgChange}
              onReset={handleReset}
              codeTheme={codeTheme}
              onResolveJogak={handleResolveJogak}
              previewIsolation={previewIsolation}
            />
          ) : (
            <div className="jogak:flex jogak:items-center jogak:justify-center jogak:h-full jogak:text-[var(--jogak-color-fg-subtle)]">
              Select a component from the sidebar
            </div>
          )}
        </main>
      </div>
    </JogakProvider>
  )
}
