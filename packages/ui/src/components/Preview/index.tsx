import { useEffect, useRef, useState } from 'react'
import type { ReactElement, CSSProperties } from 'react'
import { Highlight, themes } from 'prism-react-renderer'
import type { PrismTheme } from 'prism-react-renderer'
import { reactAdapter, useEntry } from '@jogak/react'
import type { UseEntryState } from '@jogak/react'
import type { RegistryEntry, RegistryEntryMeta, ArgType } from '@jogak/core'
import { Controls } from '../Controls/index.js'
import { Actions } from '../Actions/index.js'

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
}

type ViewportKey = 'mobile' | 'tablet' | 'desktop'
type BgMode = 'white' | 'dark' | 'transparent'

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

const BG_STYLES: Record<BgMode, CSSProperties> = {
  white: { background: '#ffffff' },
  dark: { background: '#1f2937' },
  transparent: {
    backgroundImage: [
      'linear-gradient(45deg, #e2e8f0 25%, transparent 25%)',
      'linear-gradient(-45deg, #e2e8f0 25%, transparent 25%)',
      'linear-gradient(45deg, transparent 75%, #e2e8f0 75%)',
      'linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)',
    ].join(', '),
    backgroundSize: '16px 16px',
    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
    backgroundColor: '#ffffff',
  },
}

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
}: PreviewProps): ReactElement {
  const state = useEntry(entryId)
  const [viewport, setViewport] = useState<ViewportKey>('desktop')
  const [bgMode, setBgMode] = useState<BgMode>('white')
  const [bottomTab, setBottomTab] = useState<'controls' | 'actions'>('controls')

  const prismTheme = resolvePrismTheme(codeTheme)

  // ── unknown ───────────────────────────────────────────────
  if (state.status === 'unknown') {
    return (
      <div data-testid="preview-not-found" style={{ padding: 24, color: '#ef4444' }}>
        Entry not found: {entryId}
      </div>
    )
  }

  // ── error ─────────────────────────────────────────────────
  if (state.status === 'error') {
    return (
      <div
        data-testid="preview-error"
        style={{
          padding: 24,
          color: '#b91c1c',
          background: '#fef2f2',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          alignItems: 'flex-start',
        }}
      >
        <div style={{ fontWeight: 600 }}>Failed to load entry: {entryId}</div>
        <pre
          style={{
            margin: 0,
            padding: 12,
            background: '#fff',
            border: '1px solid #fecaca',
            borderRadius: 6,
            fontSize: 12,
            whiteSpace: 'pre-wrap',
            maxWidth: '100%',
          }}
        >
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
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
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
        style={{
          flex: 1,
          minHeight: CANVAS_MIN_HEIGHT,
          overflow: 'auto',
          ...BG_STYLES[bgMode],
        }}
      >
        <div
          style={{
            maxWidth: maxWidth === 'none' ? '100%' : maxWidth,
            margin: '0 auto',
            padding: 24,
          }}
        >
          <div
            style={{
              border: '1px dashed #e5e7eb',
              borderRadius: 8,
              padding: 16,
              minHeight: CANVAS_MIN_HEIGHT - 64,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9ca3af',
              fontSize: 13,
              background:
                'linear-gradient(90deg, rgba(229,231,235,0) 0%, rgba(229,231,235,0.45) 50%, rgba(229,231,235,0) 100%)',
              backgroundSize: '200% 100%',
              animation: 'jogakSkeleton 1.4s ease-in-out infinite',
            }}
          >
            Loading {meta.title}…
          </div>
        </div>
      </div>
      <style>
        {`@keyframes jogakSkeleton { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}
      </style>
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
      <div style={{ padding: 24, color: '#ef4444' }}>
        Entry has no jogaks: {entry.id}
      </div>
    )
  }

  const jogak = entry.jogaks.find((j) => j.name === resolvedJogakName)
  if (jogak === undefined) {
    return (
      <div style={{ padding: 24, color: '#ef4444' }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
        style={{
          flex: 1,
          minHeight: CANVAS_MIN_HEIGHT,
          overflow: 'auto',
          ...BG_STYLES[bgMode],
        }}
      >
        <div
          data-jogak-content
          style={{
            maxWidth: maxWidth === 'none' ? '100%' : maxWidth,
            margin: '0 auto',
            padding: 24,
          }}
        >
          <JogakRenderer
            key={`${entry.id}/${jogak.name}`}
            entry={entry}
            args={mergedArgs}
            source={entry.source}
            theme={prismTheme}
          />
        </div>
      </div>

      {/* ── 컨트롤/액션 패널 ──────────────────────────────── */}
      <div
        data-testid="bottom-panel"
        style={{
          height: 260,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          borderTop: '2px solid #e5e7eb',
        }}
      >
        <div
          role="tablist"
          style={{
            display: 'flex',
            gap: 4,
            padding: '4px 12px 0',
            background: '#fff',
            borderBottom: '1px solid #e5e7eb',
            flexShrink: 0,
          }}
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
                style={{
                  padding: '6px 14px',
                  fontSize: 12,
                  fontWeight: active ? 600 : 500,
                  color: active ? '#111827' : '#6b7280',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: active ? '2px solid #2563eb' : '2px solid transparent',
                  marginBottom: -1,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {tab}
              </button>
            )
          })}
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
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
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '7px 14px',
        borderBottom: '1px solid #e5e7eb',
        background: '#fff',
        flexShrink: 0,
      }}
    >
      <div style={{ flex: 1, fontSize: 13 }}>
        <span style={{ color: '#9ca3af' }}>{title}</span>
        <span style={{ color: '#d1d5db', margin: '0 6px' }}>/</span>
        <span style={{ color: '#111827', fontWeight: 600 }}>{jogakName}</span>
      </div>

      {/* 뷰포트 토글 */}
      <div
        style={{
          display: 'flex',
          gap: 2,
          background: '#f3f4f6',
          borderRadius: 6,
          padding: 2,
        }}
      >
        {(['mobile', 'tablet', 'desktop'] as const).map((vp) => (
          <button
            key={vp}
            type="button"
            onClick={() => { onViewportChange(vp) }}
            aria-pressed={viewport === vp}
            style={{
              padding: '3px 9px',
              fontSize: 12,
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              background: viewport === vp ? '#fff' : 'transparent',
              color: viewport === vp ? '#111827' : '#6b7280',
              fontWeight: viewport === vp ? 600 : 400,
              boxShadow: viewport === vp ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.1s',
            }}
          >
            {VIEWPORT_LABELS[vp]}
          </button>
        ))}
      </div>

      {/* 배경 토글 */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {(['white', 'dark', 'transparent'] as const).map((bg) => (
          <button
            key={bg}
            type="button"
            onClick={() => { onBgModeChange(bg) }}
            aria-pressed={bgMode === bg}
            aria-label={`${bg} background`}
            style={{
              width: 20,
              height: 20,
              borderRadius: 4,
              border: bgMode === bg ? '2px solid #2563eb' : '2px solid #d1d5db',
              cursor: 'pointer',
              padding: 0,
              flexShrink: 0,
              ...BG_STYLES[bg],
            }}
          />
        ))}
      </div>

      {/* 리셋 */}
      {showReset && (
        <button
          type="button"
          onClick={onReset}
          style={{
            padding: '3px 10px',
            fontSize: 12,
            border: '1px solid #d1d5db',
            borderRadius: 4,
            background: '#fff',
            cursor: 'pointer',
            color: '#374151',
          }}
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
}

function JogakRenderer({ entry, args, source, theme }: JogakRendererProps): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)
  const [showCode, setShowCode] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (container === null) return
    reactAdapter.render(entry, args, container)
    return () => { reactAdapter.unmount(container) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry])

  useEffect(() => {
    const container = containerRef.current
    if (container === null) return
    reactAdapter.render(entry, args, container)
  }, [entry, args])

  return (
    <div>
      {/* preview-content 영역 + 토글 버튼 */}
      <div style={{ position: 'relative' }}>
        <div
          ref={containerRef}
          data-testid="preview-content"
          style={{
            border: '1px dashed #e5e7eb',
            borderRadius: 8,
            padding: 16,
            paddingBottom: 36,
          }}
        />
        <button
          type="button"
          onClick={() => { setShowCode((v) => !v) }}
          aria-pressed={showCode}
          aria-label={showCode ? 'Hide source code' : 'Show source code'}
          style={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            padding: '4px 9px',
            fontSize: 11,
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontWeight: 600,
            letterSpacing: '0.02em',
            background: showCode ? '#2563eb' : '#1e293b',
            color: '#fff',
            border: 'none',
            borderRadius: 5,
            cursor: 'pointer',
            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
            transition: 'background 0.15s',
          }}
        >
          {'</>'}
        </button>
      </div>

      {/* 코드 패널 — preview-content 하단으로 펼쳐짐 */}
      {showCode && (
        <div
          style={{
            marginTop: 8,
            borderRadius: 8,
            overflow: 'hidden',
            height: 320,
            boxShadow: '0 0 0 1px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.12)',
          }}
        >
          <SourceViewer source={source} theme={theme} />
        </div>
      )}
    </div>
  )
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
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: bgColor,
          color: '#94a3b8',
          fontSize: 13,
        }}
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
    <div style={{ position: 'relative', height: '100%' }}>
      <button
        type="button"
        onClick={handleCopy}
        style={{
          position: 'absolute',
          top: 10,
          right: 12,
          zIndex: 1,
          padding: '3px 9px',
          fontSize: 11,
          background: 'rgba(255,255,255,0.1)',
          color: '#e2e8f0',
          border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: 4,
          cursor: 'pointer',
        }}
      >
        {copied ? '✓ Copied' : 'Copy'}
      </button>

      <Highlight code={source.trim()} language="tsx" theme={theme}>
        {({ style, tokens, getLineProps, getTokenProps }) => (
          <pre
            style={{
              ...style,
              margin: 0,
              padding: '12px 0',
              fontSize: 12.5,
              lineHeight: 1.7,
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              height: '100%',
              boxSizing: 'border-box',
              overflow: 'auto',
            }}
          >
            {tokens.map((line, i) => (
              <div
                key={i}
                {...getLineProps({ line })}
                style={{
                  ...getLineProps({ line }).style,
                  display: 'flex',
                  paddingRight: 24,
                }}
              >
                <span
                  style={{
                    userSelect: 'none',
                    minWidth: 40,
                    paddingLeft: 14,
                    paddingRight: 14,
                    textAlign: 'right',
                    color: 'rgba(148,163,184,0.45)',
                    flexShrink: 0,
                  }}
                >
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
