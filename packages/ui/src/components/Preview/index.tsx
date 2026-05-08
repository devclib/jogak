import { useEffect, useRef, useState } from 'react'
import type { ReactElement, CSSProperties } from 'react'
import clsx from 'clsx'
import { Highlight, themes } from 'prism-react-renderer'
import type { PrismTheme } from 'prism-react-renderer'
import { reactAdapter, useEntry } from '@jogak/react'
import type { UseEntryState } from '@jogak/react'
import type { RegistryEntry, RegistryEntryMeta, ArgType } from '@jogak/core'
import { Controls } from '../Controls/index.js'
import { Actions } from '../Actions/index.js'
import { ShadowMount } from './ShadowMount.js'
import { IframeMount } from './IframeMount.js'

export interface PreviewProps {
  readonly entryId: string
  readonly jogakName: string | null
  readonly overrideArgs: Readonly<Record<string, unknown>>
  readonly onArgChange: (key: string, value: unknown) => void
  readonly onReset: () => void
  readonly codeTheme: string
  /**
   * URL deep link `?entry=<id>` (jogak 미지정) 케이스에서 entry hydrate 후
   * 첫 jogak로 자동 보정하기 위한 콜백. 부모가 selectedJogakName / URL을 갱신.
   */
  readonly onResolveJogak?: (entryId: string, jogakName: string) => void
  /**
   * 알파.8: Preview 영역 격리 모드. default `'iframe'`.
   *
   * - `'iframe'` (default) — 사용자 vite scope에 마운트. 사용자 utility 정상 컴파일.
   * - `'shadow'` (deprecated) — ShadowRoot에 마운트. 사용자 utility 미적용.
   * - `'none'` (deprecated) — chrome과 같은 document에 렌더.
   */
  readonly previewIsolation?: 'none' | 'shadow' | 'iframe'
  /**
   * 알파.9: 어댑터 dev URL. iframe `src` base.
   * 빈 문자열 시 fallback (jogak SPA Vite scope의 `/preview-frame.html`).
   */
  readonly userPreviewUrl?: string
  /**
   * 알파.9: iframe entry path.
   */
  readonly previewEntryPath?: string
}

type ViewportKey = 'mobile' | 'tablet' | 'desktop'
type BgMode = 'white' | 'dark' | 'transparent'

/**
 * dynamic style + CSS variable 주입을 위한 React `CSSProperties` 확장 타입
 * (api-contracts 알파.5 PR 2 §6.1).
 */
type CSSVarStyle = CSSProperties & Record<`--${string}`, string | number>

const VIEWPORT_WIDTHS: Record<ViewportKey, number | 'none'> = {
  mobile: 375,
  tablet: 768,
  desktop: 'none',
}

const VIEWPORT_LABELS: Record<ViewportKey, string> = {
  mobile: 'Mobile',
  tablet: 'Tablet',
  desktop: 'Desktop',
}

/**
 * bgMode별 캔버스 background 표현 — 4개 longhand CSS variable로 분해.
 *
 * v4 background shorthand arbitrary value(`bg-[...]`)는 ambiguous 하므로
 * `bg-[image:...]`, `bg-[length:...]`, `bg-[position:...]` longhand hint를 사용해야 한다.
 * 따라서 `BG_STYLES` (CSSProperties spread)를 폐기하고 mode별 변수 묶음만 정의한다
 * (api-contracts 알파.5 PR 2 §3.2 결정 B).
 */
const BG_VARS: Record<BgMode, CSSVarStyle> = {
  white: {
    '--jogak-canvas-bg': '#ffffff',
    '--jogak-canvas-bg-image': 'none',
    '--jogak-canvas-bg-size': 'auto',
    '--jogak-canvas-bg-position': '0 0',
  },
  dark: {
    '--jogak-canvas-bg': '#1f2937',
    '--jogak-canvas-bg-image': 'none',
    '--jogak-canvas-bg-size': 'auto',
    '--jogak-canvas-bg-position': '0 0',
  },
  transparent: {
    '--jogak-canvas-bg': '#ffffff',
    '--jogak-canvas-bg-image':
      'linear-gradient(45deg, #e2e8f0 25%, transparent 25%), ' +
      'linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), ' +
      'linear-gradient(45deg, transparent 75%, #e2e8f0 75%), ' +
      'linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)',
    '--jogak-canvas-bg-size': '16px 16px',
    '--jogak-canvas-bg-position': '0 0, 0 8px, 8px -8px, -8px 0px',
  },
}

/** 캔버스/미니버튼 공통 — 모드 무관. BG_VARS 가 변수 값을 mode별로 swap. */
const CANVAS_BG_CLASS =
  'jogak:bg-[var(--jogak-canvas-bg)] ' +
  'jogak:bg-[image:var(--jogak-canvas-bg-image)] ' +
  'jogak:bg-[length:var(--jogak-canvas-bg-size)] ' +
  'jogak:bg-[position:var(--jogak-canvas-bg-position)]'

/** 캔버스 영역 minHeight — loading/ready 사이 layout shift 방지 (계약 §10). */
const CANVAS_MIN_HEIGHT = 320

function resolvePrismTheme(name: string): PrismTheme {
  const map = themes as Record<string, PrismTheme | undefined>
  return map[name] ?? themes.vsDark
}

/**
 * Preview — `useEntry(entryId)`의 status에 따라 분기 (계약 §5.4).
 *
 *  - `loading` → 메타로 헤더(title, jogak 이름)만 표시, 캔버스에 skeleton
 *  - `ready`   → 현행 렌더 (entry.jogaks/component 사용)
 *  - `error`   → 에러 패널
 *  - `unknown` → "Entry not found" placeholder
 *
 * Layout shift 방지를 위해 캔버스 영역 minHeight 유지.
 */
export function Preview({
  entryId,
  jogakName,
  overrideArgs,
  onArgChange,
  onReset,
  codeTheme,
  onResolveJogak,
  previewIsolation = 'iframe',
  userPreviewUrl = '',
  previewEntryPath = '/__jogak_preview__/index.html',
}: PreviewProps): ReactElement {
  const state = useEntry(entryId)
  const [viewport, setViewport] = useState<ViewportKey>('desktop')
  const [bgMode, setBgMode] = useState<BgMode>('white')
  const [bottomTab, setBottomTab] = useState<'controls' | 'actions'>('controls')

  const prismTheme = resolvePrismTheme(codeTheme)

  // ── unknown ───────────────────────────────────────────────
  if (state.status === 'unknown') {
    return (
      <div
        data-testid="preview-not-found"
        className="jogak:p-6 jogak:text-[var(--jogak-color-error)]"
      >
        Entry not found: {entryId}
      </div>
    )
  }

  // ── error ─────────────────────────────────────────────────
  if (state.status === 'error') {
    return (
      <div
        data-testid="preview-error"
        className="jogak:p-6 jogak:text-[var(--jogak-color-error-fg)] jogak:bg-[var(--jogak-color-bg-error)] jogak:h-full jogak:flex jogak:flex-col jogak:gap-3 jogak:items-start"
      >
        <div className="jogak:font-semibold">Failed to load entry: {entryId}</div>
        <pre className="jogak:m-0 jogak:p-3 jogak:bg-[var(--jogak-color-bg)] jogak:border jogak:border-[var(--jogak-color-error-border)] jogak:rounded-[var(--jogak-radius-lg)] jogak:text-[12px] jogak:whitespace-pre-wrap jogak:max-w-full">
          {state.error.message}
        </pre>
      </div>
    )
  }

  // ── loading ───────────────────────────────────────────────
  if (state.status === 'loading') {
    return (
      <LoadingFrame
        meta={state.meta}
        jogakName={jogakName}
        viewport={viewport}
        bgMode={bgMode}
        onViewportChange={setViewport}
        onBgModeChange={setBgMode}
      />
    )
  }

  // ── ready ─────────────────────────────────────────────────
  return (
    <ReadyFrame
      entry={state.entry}
      jogakName={jogakName}
      overrideArgs={overrideArgs}
      onArgChange={onArgChange}
      onReset={onReset}
      onResolveJogak={onResolveJogak}
      viewport={viewport}
      bgMode={bgMode}
      bottomTab={bottomTab}
      onViewportChange={setViewport}
      onBgModeChange={setBgMode}
      onBottomTabChange={setBottomTab}
      prismTheme={prismTheme}
      previewIsolation={previewIsolation}
      userPreviewUrl={userPreviewUrl}
      previewEntryPath={previewEntryPath}
    />
  )
}

// ── LoadingFrame ──────────────────────────────────────────

interface LoadingFrameProps {
  readonly meta: RegistryEntryMeta
  readonly jogakName: string | null
  readonly viewport: ViewportKey
  readonly bgMode: BgMode
  readonly onViewportChange: (vp: ViewportKey) => void
  readonly onBgModeChange: (bg: BgMode) => void
}

function LoadingFrame({
  meta,
  jogakName,
  viewport,
  bgMode,
  onViewportChange,
  onBgModeChange,
}: LoadingFrameProps): ReactElement {
  const displayJogak = jogakName ?? meta.jogakNames[0] ?? '...'
  const maxWidth = VIEWPORT_WIDTHS[viewport]

  return (
    <div
      data-testid="preview-loading"
      className="jogak:flex jogak:flex-col jogak:h-full"
    >
      <Toolbar
        title={meta.title}
        jogakName={displayJogak}
        viewport={viewport}
        bgMode={bgMode}
        onViewportChange={onViewportChange}
        onBgModeChange={onBgModeChange}
        showReset={false}
        onReset={() => {}}
      />
      <div
        className={`jogak:flex-1 jogak:overflow-auto jogak:min-h-[320px] ${CANVAS_BG_CLASS}`}
        // eslint-disable-next-line no-restricted-syntax -- jogak: BG_VARS object inject
        style={BG_VARS[bgMode]}
      >
        <div
          className="jogak:mx-auto jogak:p-6 jogak:max-w-[var(--jogak-canvas-mw)]"
          // eslint-disable-next-line no-restricted-syntax -- jogak: canvas-mw CSS var
          style={
            {
              '--jogak-canvas-mw': maxWidth === 'none' ? '100%' : `${maxWidth}px`,
            } as CSSVarStyle
          }
        >
          {/*
           * skeleton box — 알파.5 PR 4 마이그레이션: gradient + keyframe animation 을
           * jogak.css `@layer components` 의 `.jogak-skeleton-shimmer` class 로 이동
           * (api-contracts §6). inline `style={{...}}` 객체 + inline `<style>` 태그
           * 동시 제거. 정적 부분(border / radius / padding / flex / color / fontSize /
           * minHeight)은 jogak: utility 그대로 유지.
           */}
          <div className="jogak-skeleton-shimmer jogak:border jogak:border-dashed jogak:border-[var(--jogak-color-border)] jogak:rounded-[var(--jogak-radius-xl)] jogak:p-4 jogak:flex jogak:items-center jogak:justify-center jogak:text-[var(--jogak-color-fg-subtle)] jogak:text-[13px] jogak:min-h-[256px]">
            Loading {meta.title}…
          </div>
        </div>
      </div>
    </div>
  )
}

// ── ReadyFrame ────────────────────────────────────────────

interface ReadyFrameProps {
  readonly entry: RegistryEntry
  readonly jogakName: string | null
  readonly overrideArgs: Readonly<Record<string, unknown>>
  readonly onArgChange: (key: string, value: unknown) => void
  readonly onReset: () => void
  readonly onResolveJogak: ((entryId: string, jogakName: string) => void) | undefined
  readonly viewport: ViewportKey
  readonly bgMode: BgMode
  readonly bottomTab: 'controls' | 'actions'
  readonly onViewportChange: (vp: ViewportKey) => void
  readonly onBgModeChange: (bg: BgMode) => void
  readonly onBottomTabChange: (tab: 'controls' | 'actions') => void
  readonly prismTheme: PrismTheme
  readonly previewIsolation: 'none' | 'shadow' | 'iframe'
  readonly userPreviewUrl: string
  readonly previewEntryPath: string
}

function ReadyFrame({
  entry,
  jogakName,
  overrideArgs,
  onArgChange,
  onReset,
  onResolveJogak,
  viewport,
  bgMode,
  bottomTab,
  onViewportChange,
  onBgModeChange,
  onBottomTabChange,
  prismTheme,
  previewIsolation,
  userPreviewUrl,
  previewEntryPath,
}: ReadyFrameProps): ReactElement {
  // jogakName이 비어있으면 (deep link `?entry=...&jogak` 누락) 첫 jogak로 보정.
  const resolvedJogakName = jogakName ?? entry.jogaks[0]?.name ?? null

  useEffect(() => {
    if (jogakName === null && resolvedJogakName !== null && onResolveJogak !== undefined) {
      onResolveJogak(entry.id, resolvedJogakName)
    }
  }, [jogakName, resolvedJogakName, entry.id, onResolveJogak])

  if (resolvedJogakName === null) {
    return (
      <div className="jogak:p-6 jogak:text-[var(--jogak-color-error)]">
        Entry has no jogaks: {entry.id}
      </div>
    )
  }

  const jogak = entry.jogaks.find((j) => j.name === resolvedJogakName)
  if (jogak === undefined) {
    return (
      <div className="jogak:p-6 jogak:text-[var(--jogak-color-error)]">
        Jogak not found: {resolvedJogakName}
      </div>
    )
  }

  const baseArgs = jogak.args ?? {}
  const mergedArgs = { ...baseArgs, ...overrideArgs }
  const mergedArgTypes: Readonly<Record<string, ArgType>> = {
    ...(entry.meta.argTypes ?? {}),
    ...(jogak.argTypes ?? {}),
  }
  const hasOverrides = Object.keys(overrideArgs).length > 0
  const maxWidth = VIEWPORT_WIDTHS[viewport]

  return (
    <div className="jogak:flex jogak:flex-col jogak:h-full">
      <Toolbar
        title={entry.title}
        jogakName={jogak.name}
        viewport={viewport}
        bgMode={bgMode}
        onViewportChange={onViewportChange}
        onBgModeChange={onBgModeChange}
        showReset={hasOverrides}
        onReset={onReset}
      />

      {/* ── 캔버스 ───────────────────────────────────────── */}
      <div
        className={`jogak:flex-1 jogak:overflow-auto jogak:min-h-[320px] ${CANVAS_BG_CLASS}`}
        // eslint-disable-next-line no-restricted-syntax -- jogak: BG_VARS object inject
        style={BG_VARS[bgMode]}
      >
        <div
          data-jogak-content
          className="jogak:mx-auto jogak:p-6 jogak:max-w-[var(--jogak-canvas-mw)]"
          // eslint-disable-next-line no-restricted-syntax -- jogak: canvas-mw CSS var
          style={
            {
              '--jogak-canvas-mw': maxWidth === 'none' ? '100%' : `${maxWidth}px`,
            } as CSSVarStyle
          }
        >
          <JogakRenderer
            key={`${entry.id}/${jogak.name}`}
            entry={entry}
            args={mergedArgs}
            source={entry.source}
            theme={prismTheme}
            previewIsolation={previewIsolation}
            userPreviewUrl={userPreviewUrl}
            previewEntryPath={previewEntryPath}
          />
        </div>
      </div>

      {/* ── 컨트롤/액션 패널 ──────────────────────────────── */}
      <div
        data-testid="bottom-panel"
        className="jogak:h-[260px] jogak:shrink-0 jogak:flex jogak:flex-col jogak:border-t-2 jogak:border-[var(--jogak-color-border)]"
      >
        <div
          role="tablist"
          className="jogak:flex jogak:gap-1 jogak:pt-1 jogak:px-3 jogak:pb-0 jogak:bg-[var(--jogak-color-bg)] jogak:border-b jogak:border-[var(--jogak-color-border)] jogak:shrink-0"
        >
          {(['controls', 'actions'] as const).map((tab) => {
            const active = bottomTab === tab
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => { onBottomTabChange(tab) }}
                className={clsx(
                  'jogak:px-[14px] jogak:py-[6px] jogak:text-[12px] jogak:bg-transparent jogak:border-x-0 jogak:border-t-0 jogak:border-b-2 jogak:border-solid jogak:-mb-px jogak:cursor-pointer jogak:capitalize',
                  active
                    ? 'jogak:font-semibold jogak:text-[var(--jogak-color-fg-strong)] jogak:border-[var(--jogak-color-accent)]'
                    : 'jogak:font-medium jogak:text-[var(--jogak-color-fg-muted)] jogak:border-transparent',
                )}
              >
                {tab}
              </button>
            )
          })}
        </div>

        <div className="jogak:flex-1 jogak:min-h-0 jogak:overflow-auto">
          {bottomTab === 'controls' ? (
            <Controls
              args={mergedArgs}
              argTypes={mergedArgTypes}
              onArgChange={onArgChange}
            />
          ) : (
            <Actions />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Toolbar (loading / ready 공용) ─────────────────────────

interface ToolbarProps {
  readonly title: string
  readonly jogakName: string
  readonly viewport: ViewportKey
  readonly bgMode: BgMode
  readonly onViewportChange: (vp: ViewportKey) => void
  readonly onBgModeChange: (bg: BgMode) => void
  readonly showReset: boolean
  readonly onReset: () => void
}

function Toolbar({
  title,
  jogakName,
  viewport,
  bgMode,
  onViewportChange,
  onBgModeChange,
  showReset,
  onReset,
}: ToolbarProps): ReactElement {
  return (
    <div className="jogak:flex jogak:items-center jogak:gap-[10px] jogak:px-[14px] jogak:py-[7px] jogak:border-b jogak:border-[var(--jogak-color-border)] jogak:bg-[var(--jogak-color-bg)] jogak:shrink-0">
      <div className="jogak:flex-1 jogak:text-[13px]">
        <span className="jogak:text-[var(--jogak-color-fg-subtle)]">{title}</span>
        <span className="jogak:text-[var(--jogak-color-border-strong)] jogak:mx-1.5 jogak:leading-none">
          /
        </span>
        <span className="jogak:text-[var(--jogak-color-fg-strong)] jogak:font-semibold">
          {jogakName}
        </span>
      </div>

      {/* 뷰포트 토글 */}
      <div className="jogak:flex jogak:gap-0.5 jogak:bg-[var(--jogak-color-bg-subtle)] jogak:rounded-[var(--jogak-radius-lg)] jogak:p-0.5">
        {(['mobile', 'tablet', 'desktop'] as const).map((vp) => (
          <button
            key={vp}
            type="button"
            onClick={() => { onViewportChange(vp) }}
            aria-pressed={viewport === vp}
            className={clsx(
              'jogak:px-[9px] jogak:py-[3px] jogak:text-[12px] jogak:border-none jogak:rounded-[var(--jogak-radius-md)] jogak:cursor-pointer jogak:transition-all jogak:duration-100',
              viewport === vp
                ? 'jogak:bg-[var(--jogak-color-bg-elevated)] jogak:text-[var(--jogak-color-fg-strong)] jogak:font-semibold jogak:shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
                : 'jogak:bg-transparent jogak:text-[var(--jogak-color-fg-muted)] jogak:font-normal jogak:shadow-none',
            )}
          >
            {VIEWPORT_LABELS[vp]}
          </button>
        ))}
      </div>

      {/* 배경 토글 */}
      <div className="jogak:flex jogak:gap-1 jogak:items-center">
        {(['white', 'dark', 'transparent'] as const).map((bg) => (
          <button
            key={bg}
            type="button"
            onClick={() => { onBgModeChange(bg) }}
            aria-pressed={bgMode === bg}
            aria-label={`${bg} background`}
            className={clsx(
              'jogak:w-5 jogak:h-5 jogak:rounded-[var(--jogak-radius-md)] jogak:border-2 jogak:cursor-pointer jogak:p-0 jogak:shrink-0',
              CANVAS_BG_CLASS,
              bgMode === bg
                ? 'jogak:border-[var(--jogak-color-accent)]'
                : 'jogak:border-[var(--jogak-color-border-strong)]',
            )}
            // eslint-disable-next-line no-restricted-syntax -- jogak: BG_VARS object inject (3 mini buttons)
            style={BG_VARS[bg]}
          />
        ))}
      </div>

      {/* 리셋 */}
      {showReset && (
        <button
          type="button"
          onClick={onReset}
          className="jogak:px-[10px] jogak:py-[3px] jogak:text-[12px] jogak:border jogak:border-[var(--jogak-color-border-strong)] jogak:rounded-[var(--jogak-radius-md)] jogak:bg-[var(--jogak-color-bg)] jogak:cursor-pointer jogak:text-[var(--jogak-color-fg)] jogak:leading-none"
        >
          Reset
        </button>
      )}
    </div>
  )
}

// ── JogakRenderer ─────────────────────────────────────────

interface JogakRendererProps {
  readonly entry: RegistryEntry
  readonly args: Readonly<Record<string, unknown>>
  readonly source: string | undefined
  readonly theme: PrismTheme
  readonly previewIsolation: 'none' | 'shadow' | 'iframe'
  readonly userPreviewUrl: string
  readonly previewEntryPath: string
}

/**
 * 알파.9: previewIsolation 모드별로 사용자 콘텐츠 마운트 방식을 분기한다.
 *
 * - `'iframe'` (default) — 어댑터 dev URL의 `<IframeMount>`로 별도 document.
 * - `'shadow'` (deprecated) — `<ShadowMount>` 안에 마운트.
 * - `'none'` (deprecated) — 같은 document에 직접 마운트.
 */
function JogakRenderer({ entry, args, source, theme, previewIsolation, userPreviewUrl, previewEntryPath }: JogakRendererProps): ReactElement {
  const [showCode, setShowCode] = useState(false)

  const previewBody = (
    <div className="jogak:relative">
      <PreviewMount
        entry={entry}
        args={args}
        previewIsolation={previewIsolation}
        userPreviewUrl={userPreviewUrl}
        previewEntryPath={previewEntryPath}
      />
      <button
        type="button"
        onClick={() => { setShowCode((v) => !v) }}
        aria-pressed={showCode}
        aria-label={showCode ? 'Hide source code' : 'Show source code'}
        className={clsx(
          'jogak:absolute jogak:bottom-2 jogak:right-2 jogak:px-[9px] jogak:py-1',
          'jogak:text-[11px] jogak:font-[family-name:var(--jogak-font-mono)] jogak:font-semibold jogak:tracking-[0.02em]',
          'jogak:text-[var(--jogak-color-bg)] jogak:border-none jogak:rounded-[5px] jogak:cursor-pointer',
          'jogak:shadow-[0_1px_4px_rgba(0,0,0,0.2)] jogak:transition-[background-color] jogak:duration-150 jogak:leading-none',
          showCode ? 'jogak:bg-[var(--jogak-color-accent)]' : 'jogak:bg-[#1e293b]',
        )}
      >
        {'</>'}
      </button>
    </div>
  )

  return (
    <div>
      {previewBody}
      {/* 코드 패널 — preview-content 하단으로 펼쳐짐 */}
      {showCode && (
        <div className="jogak:mt-2 jogak:rounded-[var(--jogak-radius-xl)] jogak:overflow-hidden jogak:h-[320px] jogak:shadow-[0_0_0_1px_rgba(0,0,0,0.08),_0_4px_16px_rgba(0,0,0,0.12)]">
          <SourceViewer source={source} theme={theme} />
        </div>
      )}
    </div>
  )
}

// ── PreviewMount ──────────────────────────────────────────
//
// previewIsolation 모드별 콘텐츠 마운트. chrome 외곽 (border/radius/padding)은 모드
// 별 호스트 element에 동일하게 적용해 VR baseline 변경을 zero로 유지한다.

interface PreviewMountProps {
  readonly entry: RegistryEntry
  readonly args: Readonly<Record<string, unknown>>
  readonly previewIsolation: 'none' | 'shadow' | 'iframe'
  readonly userPreviewUrl: string
  readonly previewEntryPath: string
}

const PREVIEW_HOST_CLASS =
  'jogak:border jogak:border-dashed jogak:border-[var(--jogak-color-border)] ' +
  'jogak:rounded-[var(--jogak-radius-xl)] jogak:p-4 jogak:pb-9'

function PreviewMount({ entry, args, previewIsolation, userPreviewUrl, previewEntryPath }: PreviewMountProps): ReactElement {
  if (previewIsolation === 'shadow') {
    return (
      <ShadowMount
        data-testid="preview-content"
        className={PREVIEW_HOST_CLASS}
      >
        <ShadowAdapterContent entry={entry} args={args} />
      </ShadowMount>
    )
  }

  if (previewIsolation === 'iframe') {
    return (
      <IframeMount
        entry={entry}
        args={args}
        userPreviewUrl={userPreviewUrl}
        previewEntryPath={previewEntryPath}
        data-testid="preview-content"
        className={`${PREVIEW_HOST_CLASS} jogak:block jogak:w-full jogak:bg-transparent jogak:min-h-[256px]`}
      />
    )
  }

  // 'none' — deprecated 경로 (알파.7.1 동등 동작 보존, back-compat)
  return <NoneAdapterContent entry={entry} args={args} />
}

function NoneAdapterContent({ entry, args }: { entry: RegistryEntry; args: Readonly<Record<string, unknown>> }): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (container === null) return
    reactAdapter.render(entry, args, container)
    return () => {
      // 알파.7.1: React 18 concurrent unmount race(`Attempted to synchronously unmount...`)
      // 회피 — fiber commit 끝난 직후로 defer.
      queueMicrotask(() => { reactAdapter.unmount(container) })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry])

  useEffect(() => {
    const container = containerRef.current
    if (container === null) return
    reactAdapter.render(entry, args, container)
  }, [entry, args])

  return (
    <div
      ref={containerRef}
      data-testid="preview-content"
      className={PREVIEW_HOST_CLASS}
    />
  )
}

/**
 * Shadow 모드 — ShadowMount의 ShadowRoot 안에서 react-adapter.render를 호출하는
 * 작은 wrapper. ShadowMount 안 portal 내부에 위치하므로 useRef는 ShadowRoot scope.
 */
function ShadowAdapterContent({ entry, args }: { entry: RegistryEntry; args: Readonly<Record<string, unknown>> }): ReactElement {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const c = ref.current
    if (c === null) return
    reactAdapter.render(entry, args, c)
    return () => {
      // 알파.7.1: unmount race 회피
      queueMicrotask(() => { reactAdapter.unmount(c) })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry])

  useEffect(() => {
    const c = ref.current
    if (c === null) return
    reactAdapter.render(entry, args, c)
  }, [entry, args])

  return <div ref={ref} data-testid="preview-content-shadow" />
}

// ── SourceViewer ──────────────────────────────────────────

interface SourceViewerProps {
  readonly source: string | undefined
  readonly theme: PrismTheme
}

function SourceViewer({ source, theme }: SourceViewerProps): ReactElement {
  const [copied, setCopied] = useState(false)
  const bgColor = (theme.plain.backgroundColor as string | undefined) ?? '#1e293b'

  if (source === undefined) {
    return (
      <div
        className="jogak:h-full jogak:flex jogak:items-center jogak:justify-center jogak:bg-[var(--jogak-source-bg)] jogak:text-[#94a3b8] jogak:text-[13px]"
        // eslint-disable-next-line no-restricted-syntax -- jogak: source-bg CSS var (prism theme)
        style={{ '--jogak-source-bg': bgColor } as CSSVarStyle}
      >
        Source not available
      </div>
    )
  }

  const handleCopy = (): void => {
    void navigator.clipboard.writeText(source).then(() => {
      setCopied(true)
      setTimeout(() => { setCopied(false) }, 2000)
    })
  }

  return (
    <div className="jogak:relative jogak:h-full">
      <button
        type="button"
        onClick={handleCopy}
        className="jogak:absolute jogak:top-[10px] jogak:right-3 jogak:z-[1] jogak:px-[9px] jogak:py-[3px] jogak:text-[11px] jogak:bg-[rgba(255,255,255,0.1)] jogak:text-[#e2e8f0] jogak:border jogak:border-[rgba(255,255,255,0.18)] jogak:rounded-[var(--jogak-radius-md)] jogak:cursor-pointer jogak:leading-none"
      >
        {copied ? '✓ Copied' : 'Copy'}
      </button>

      <Highlight code={source.trim()} language="tsx" theme={theme}>
        {({ style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className="jogak:m-0 jogak:py-3 jogak:px-0 jogak:text-[12.5px] jogak:leading-[1.7] jogak:font-[family-name:var(--jogak-font-mono)] jogak:h-full jogak:box-border jogak:overflow-auto"
            // eslint-disable-next-line no-restricted-syntax -- jogak: prism-react-renderer external interface (pre)
            style={style}
          >
            {tokens.map((line, i) => (
              <div
                key={i}
                {...getLineProps({ line })}
                className="jogak:flex jogak:pr-6"
                // eslint-disable-next-line no-restricted-syntax -- jogak: prism-react-renderer external interface (line)
                style={getLineProps({ line }).style}
              >
                <span className="jogak:select-none jogak:min-w-10 jogak:pl-[14px] jogak:pr-[14px] jogak:text-right jogak:text-[rgba(148,163,184,0.45)] jogak:shrink-0 jogak:leading-[1.7]">
                  {i + 1}
                </span>
                <span>
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </span>
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  )
}

// Re-export type for ui consumers that may want to type their own wrappers.
export type { UseEntryState }
