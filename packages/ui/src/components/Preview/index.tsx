import { useEffect, useRef, useState } from 'react'
import type { ReactElement, CSSProperties } from 'react'
import { Highlight, themes } from 'prism-react-renderer'
import type { PrismTheme } from 'prism-react-renderer'
import { useRegistry as useRegistryFromAdapter } from '@jogak/react'
import { reactAdapter } from '@jogak/react'
import type { RegistryEntry, ArgType } from '@jogak/core'
import { Controls } from '../Controls/index.js'
import { Actions } from '../Actions/index.js'

export interface PreviewProps {
  readonly entryId: string
  readonly jogakName: string
  readonly overrideArgs: Readonly<Record<string, unknown>>
  readonly onArgChange: (key: string, value: unknown) => void
  readonly onReset: () => void
  readonly codeTheme: string
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

function resolvePrismTheme(name: string): PrismTheme {
  const map = themes as Record<string, PrismTheme | undefined>
  return map[name] ?? themes.vsDark
}

export function Preview({
  entryId,
  jogakName,
  overrideArgs,
  onArgChange,
  onReset,
  codeTheme,
}: PreviewProps): ReactElement {
  const registry = useRegistryFromAdapter()
  const entry = registry.get(entryId)
  const [viewport, setViewport] = useState<ViewportKey>('desktop')
  const [bgMode, setBgMode] = useState<BgMode>('white')
  const [bottomTab, setBottomTab] = useState<'controls' | 'actions'>('controls')

  if (entry === undefined) {
    return (
      <div data-testid="preview-not-found" style={{ padding: 24, color: '#ef4444' }}>
        Entry not found: {entryId}
      </div>
    )
  }

  const jogak = entry.jogaks.find((j) => j.name === jogakName)

  if (jogak === undefined) {
    return (
      <div style={{ padding: 24, color: '#ef4444' }}>
        Jogak not found: {jogakName}
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
  const prismTheme = resolvePrismTheme(codeTheme)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ── 툴바 ─────────────────────────────────────────── */}
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
          <span style={{ color: '#9ca3af' }}>{entry.title}</span>
          <span style={{ color: '#d1d5db', margin: '0 6px' }}>/</span>
          <span style={{ color: '#111827', fontWeight: 600 }}>{jogak.name}</span>
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
              onClick={() => { setViewport(vp) }}
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
              onClick={() => { setBgMode(bg) }}
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
        {hasOverrides && (
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

      {/* ── 캔버스 ───────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
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
          <JogakRenderer
            key={`${entryId}/${jogakName}`}
            entry={entry}
            args={mergedArgs}
            source={entry.source}
            theme={prismTheme}
          />
        </div>
      </div>

      {/* ── 컨트롤/액션 패널 ──────────────────────────────── */}
      <div
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
                onClick={() => { setBottomTab(tab) }}
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
