import { useState, useEffect } from 'react'
import type { CSSProperties, ReactElement } from 'react'
import clsx from 'clsx'
import type { CategoryMetaTree, RegistryEntryMeta } from '@jogak/core'
import { useRegistryMeta } from '@jogak/core/renderers/react'

// CSS custom property를 React style prop에 주입하기 위한 헬퍼 타입.
// React 18+는 string-keyed `--` prefix를 인식하나 TS는 명시적 cast 필요.
// spec §6.1 참조.
type CSSVarStyle = CSSProperties & Record<`--${string}`, string | number>

export interface SidebarProps {
  readonly selectedEntryId: string | null
  readonly selectedJogakName: string | null
  readonly onSelect: (entryId: string, jogakName: string) => void
}

/**
 * Sidebar — `useRegistryMeta`로 전환되어 lazy 모드에서도 모든 entry의 메타가 즉시 보인다.
 * 계약 §10: hydrated 여부를 표시하지 않는다 — 사용자에겐 모든 entry가 동일하게 보임.
 */
export function Sidebar({
  selectedEntryId,
  selectedJogakName,
  onSelect,
}: SidebarProps): ReactElement {
  const [query, setQuery] = useState('')
  const { metaTree, searchMeta, metas: allMetas } = useRegistryMeta()

  const filtered = query.trim().length > 0 ? searchMeta(query) : null

  // 1.2.0 post-1.2: Keyboard navigation — ↑/↓로 jogak variant 순회, Enter로 확정.
  // 검색 결과 있을 땐 flat 순회, 없으면 metaTree flatten.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleKeydown = (e: KeyboardEvent): void => {
      // input/textarea 안에서는 무시 (Sidebar search input 포함).
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable === true) return
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
      // Ctrl/Cmd/Alt modifier가 눌린 경우 무시 (다른 shortcut과 충돌 회피).
      if (e.ctrlKey || e.metaKey || e.altKey) return

      // 현재 metas 목록 — 검색 중이면 filtered, 아니면 allMetas.
      const metas: readonly RegistryEntryMeta[] = filtered ?? allMetas
      if (metas.length === 0) return

      // 현재 선택된 entry의 jogak variants를 flatten.
      // 목표: 다음/이전 (entry.id, jogakName) 쌍으로 이동.
      const flat: { entryId: string; jogakName: string }[] = []
      for (const m of metas) {
        for (const name of m.jogakNames) {
          flat.push({ entryId: m.id, jogakName: name })
        }
      }
      if (flat.length === 0) return

      const currentIdx = flat.findIndex(
        (f) => f.entryId === selectedEntryId && f.jogakName === selectedJogakName,
      )
      const nextIdx =
        e.key === 'ArrowDown'
          ? currentIdx < 0
            ? 0
            : Math.min(currentIdx + 1, flat.length - 1)
          : currentIdx <= 0
            ? 0
            : currentIdx - 1
      const target2 = flat[nextIdx]
      if (target2 === undefined) return
      if (target2.entryId === selectedEntryId && target2.jogakName === selectedJogakName) return
      e.preventDefault()
      onSelect(target2.entryId, target2.jogakName)
    }
    window.addEventListener('keydown', handleKeydown)
    return () => { window.removeEventListener('keydown', handleKeydown) }
  }, [filtered, allMetas, selectedEntryId, selectedJogakName, onSelect])

  return (
    <aside
      data-testid="sidebar"
      className="jogak:flex jogak:flex-col jogak:h-full jogak:overflow-auto jogak:border-r jogak:border-[var(--jogak-color-border)]"
    >
      <div className="jogak:p-3 jogak:border-b jogak:border-[var(--jogak-color-border)]">
        <input
          type="search"
          placeholder="Search components..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
          }}
          className="jogak:w-full jogak:px-2 jogak:py-1.5 jogak:border jogak:border-[var(--jogak-color-border-strong)] jogak:rounded-[var(--jogak-radius-md)]"
          aria-label="Search components"
        />
      </div>
      <nav className="jogak:flex-1 jogak:overflow-auto jogak:py-2">
        {filtered !== null ? (
          filtered.length > 0 ? (
            <FlatList
              metas={filtered}
              selectedEntryId={selectedEntryId}
              selectedJogakName={selectedJogakName}
              onSelect={onSelect}
              query={query.trim()}
            />
          ) : (
            <SearchEmptyState query={query} />
          )
        ) : Object.keys(metaTree).length === 0 ? (
          <SidebarEmptyState />
        ) : (
          <TreeView
            node={metaTree}
            selectedEntryId={selectedEntryId}
            selectedJogakName={selectedJogakName}
            onSelect={onSelect}
          />
        )}
      </nav>
    </aside>
  )
}

/**
 * 1.0.0-beta.4: registry가 완전히 비어있을 때 (사용자가 `.jogak.{ts,tsx}` 파일을 아직
 * 안 만든 상태) 표시하는 empty state. 첫 5분 UX — 사용자에게 다음 액션을 명확히 안내.
 *
 * Sidebar 자체는 빈 nav로 두는 대신 boilerplate + docs 링크로 대체.
 */
function SidebarEmptyState(): ReactElement {
  return (
    <div
      data-testid="sidebar-empty"
      className="jogak:p-4 jogak:text-[12.5px] jogak:leading-relaxed jogak:text-[var(--jogak-color-text-secondary)]"
    >
      <strong className="jogak:block jogak:mb-2 jogak:text-[var(--jogak-color-text)]">
        No components yet
      </strong>
      <p className="jogak:m-0 jogak:mb-2">
        Create your first <code className="jogak:bg-[var(--jogak-color-bg-muted)] jogak:px-1 jogak:rounded">*.jogak.tsx</code> file next to a component:
      </p>
      <pre className="jogak:m-0 jogak:mb-3 jogak:p-2 jogak:bg-[var(--jogak-color-bg-muted)] jogak:rounded jogak:text-[11.5px] jogak:leading-normal jogak:overflow-x-auto jogak:font-[family-name:var(--jogak-font-mono)]">{`import type { JogakMeta, Jogak } from '@jogak/core'
import { Button } from './Button'

const meta = {
  title: 'Components/Button',
  component: Button,
} satisfies JogakMeta

export default meta

export const Primary: Jogak = {
  name: 'Primary',
  args: { label: 'Click me' },
}`}</pre>
      <p className="jogak:m-0 jogak:text-[var(--jogak-color-fg-subtle)]">
        Save the file — this sidebar updates automatically. Full guide at{' '}
        <a
          href="https://jogak.dev/en/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="jogak:text-[var(--jogak-color-link)] jogak:underline"
        >
          jogak.dev/docs
        </a>
        .
      </p>
    </div>
  )
}

/**
 * 1.0.0-beta.4: 검색 필터에 결과가 없을 때 표시. registry에는 entries가 있지만 query와 매치 zero.
 */
function SearchEmptyState({ query }: { query: string }): ReactElement {
  return (
    <div
      data-testid="sidebar-search-empty"
      className="jogak:p-4 jogak:text-[12.5px] jogak:text-[var(--jogak-color-text-secondary)]"
    >
      <p className="jogak:m-0">
        No components match <code className="jogak:bg-[var(--jogak-color-bg-muted)] jogak:px-1 jogak:rounded">{query}</code>.
      </p>
    </div>
  )
}

interface FlatListProps {
  readonly metas: readonly RegistryEntryMeta[]
  readonly selectedEntryId: string | null
  readonly selectedJogakName: string | null
  readonly onSelect: (entryId: string, jogakName: string) => void
  /** 1.2.0 post-1.2: 검색 query — 매치 부분 highlight용. */
  readonly query?: string
}

function FlatList({
  metas,
  selectedEntryId,
  selectedJogakName,
  onSelect,
  query,
}: FlatListProps): ReactElement {
  if (metas.length === 0) {
    return (
      <p className="jogak:px-3 jogak:text-[var(--jogak-color-fg-subtle)] jogak:text-[13px]">
        No results
      </p>
    )
  }
  return (
    <ul className="jogak:list-none jogak:m-0 jogak:p-0">
      {metas.map((meta) => (
        <li key={meta.id}>
          <EntryGroup
            meta={meta}
            selectedEntryId={selectedEntryId}
            selectedJogakName={selectedJogakName}
            onSelect={onSelect}
            indent={0}
            highlightQuery={query}
          />
        </li>
      ))}
    </ul>
  )
}

/**
 * 1.2.0 post-1.2: 검색어 매치 부분을 <mark>로 감싸 반환.
 * 여러 매치 지원, case-insensitive. 없거나 빈 query면 그대로 반환.
 */
function highlightMatch(text: string, query: string | undefined): ReactElement | string {
  if (query === undefined || query.length === 0) return text
  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  if (!lowerText.includes(lowerQuery)) return text
  const parts: ReactElement[] = []
  let cursor = 0
  let idx = lowerText.indexOf(lowerQuery, cursor)
  let key = 0
  while (idx !== -1) {
    if (idx > cursor) parts.push(<span key={`p${key++}`}>{text.slice(cursor, idx)}</span>)
    parts.push(
      <mark
        key={`m${key++}`}
        className="jogak:bg-[color:rgb(254_240_138)] jogak:text-inherit jogak:font-semibold jogak:rounded jogak:px-0.5"
      >
        {text.slice(idx, idx + lowerQuery.length)}
      </mark>,
    )
    cursor = idx + lowerQuery.length
    idx = lowerText.indexOf(lowerQuery, cursor)
  }
  if (cursor < text.length) parts.push(<span key={`p${key++}`}>{text.slice(cursor)}</span>)
  return <>{parts}</>
}

interface TreeViewProps {
  readonly node: CategoryMetaTree
  readonly selectedEntryId: string | null
  readonly selectedJogakName: string | null
  readonly onSelect: (entryId: string, jogakName: string) => void
  readonly depth?: number
}

function TreeView({
  node,
  selectedEntryId,
  selectedJogakName,
  onSelect,
  depth = 0,
}: TreeViewProps): ReactElement {
  return (
    <ul
      className="jogak:list-none jogak:m-0 jogak:pr-0 jogak:py-0 jogak:pl-[var(--jogak-tree-pl)]"
      // eslint-disable-next-line no-restricted-syntax -- jogak: CSS var inject (--jogak-tree-pl)
      style={{ '--jogak-tree-pl': `${depth * 12}px` } as CSSVarStyle}
    >
      {Object.entries(node).map(([key, child]) => (
        <li key={key}>
          {'id' in child ? (
            <EntryGroup
              meta={child as RegistryEntryMeta}
              selectedEntryId={selectedEntryId}
              selectedJogakName={selectedJogakName}
              onSelect={onSelect}
              indent={0}
            />
          ) : (
            <CategoryGroup
              label={key}
              node={child as CategoryMetaTree}
              selectedEntryId={selectedEntryId}
              selectedJogakName={selectedJogakName}
              onSelect={onSelect}
              depth={depth + 1}
            />
          )}
        </li>
      ))}
    </ul>
  )
}

interface CategoryGroupProps {
  readonly label: string
  readonly node: CategoryMetaTree
  readonly selectedEntryId: string | null
  readonly selectedJogakName: string | null
  readonly onSelect: (entryId: string, jogakName: string) => void
  readonly depth: number
}

function CategoryGroup({
  label,
  node,
  selectedEntryId,
  selectedJogakName,
  onSelect,
  depth,
}: CategoryGroupProps): ReactElement {
  const [open, setOpen] = useState(true)
  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v)
        }}
        className="jogak:flex jogak:items-center jogak:gap-1 jogak:w-full jogak:px-3 jogak:py-1 jogak:bg-transparent jogak:border-none jogak:cursor-pointer jogak:text-[12px] jogak:font-semibold jogak:text-[var(--jogak-color-fg-muted)] jogak:uppercase jogak:tracking-wider"
        aria-expanded={open}
      >
        <span>{open ? '▾' : '▸'}</span>
        {label}
      </button>
      {open && (
        <TreeView
          node={node}
          selectedEntryId={selectedEntryId}
          selectedJogakName={selectedJogakName}
          onSelect={onSelect}
          depth={depth}
        />
      )}
    </div>
  )
}

interface EntryGroupProps {
  readonly meta: RegistryEntryMeta
  readonly selectedEntryId: string | null
  readonly selectedJogakName: string | null
  readonly onSelect: (entryId: string, jogakName: string) => void
  readonly indent: number
  /** 1.2.0 post-1.2: 검색 매치 highlight query. */
  readonly highlightQuery?: string | undefined
}

function EntryGroup({
  meta,
  selectedEntryId,
  selectedJogakName,
  onSelect,
  indent,
  highlightQuery,
}: EntryGroupProps): ReactElement {
  const isCurrentEntry = meta.id === selectedEntryId
  const [open, setOpen] = useState(isCurrentEntry)

  useEffect(() => {
    if (isCurrentEntry) setOpen(true)
  }, [isCurrentEntry])

  const label = meta.title.split('/').pop() ?? meta.title
  const paddingLeft = 16 + indent * 12

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          if (!isCurrentEntry) {
            setOpen(true)
            const first = meta.jogakNames[0]
            if (first !== undefined) onSelect(meta.id, first)
          } else {
            setOpen((v) => !v)
          }
        }}
        className={clsx(
          'jogak:flex jogak:items-center jogak:gap-1.5 jogak:w-full jogak:pr-3 jogak:py-[5px]',
          'jogak:pl-[var(--jogak-entry-pl)]',
          'jogak:border-none jogak:cursor-pointer jogak:text-left jogak:text-[13px]',
          isCurrentEntry
            ? 'jogak:bg-[var(--jogak-color-accent-bg)] jogak:text-[var(--jogak-color-accent)] jogak:font-medium'
            : 'jogak:bg-transparent jogak:text-[var(--jogak-color-fg)] jogak:font-normal',
        )}
        // eslint-disable-next-line no-restricted-syntax -- jogak: CSS var inject (--jogak-entry-pl)
        style={{ '--jogak-entry-pl': `${paddingLeft}px` } as CSSVarStyle}
        aria-expanded={open}
      >
        <span className="jogak:text-[10px] jogak:shrink-0 jogak:leading-none">
          {open ? '▾' : '▸'}
        </span>
        {highlightMatch(label, highlightQuery)}
      </button>
      {open && (
        <ul className="jogak:list-none jogak:m-0 jogak:p-0">
          {meta.jogakNames.map((jogakName) => {
            const isSelected = isCurrentEntry && jogakName === selectedJogakName
            return (
              <li key={jogakName}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(meta.id, jogakName)
                  }}
                  className={clsx(
                    'jogak:block jogak:w-full jogak:text-left jogak:pr-3 jogak:py-1',
                    'jogak:pl-[var(--jogak-jogak-pl)]',
                    'jogak:border-none jogak:cursor-pointer jogak:text-[12px]',
                    isSelected
                      ? 'jogak:bg-[var(--jogak-color-accent-bg-soft)] jogak:text-[var(--jogak-color-accent-fg)] jogak:font-medium'
                      : 'jogak:bg-transparent jogak:text-[var(--jogak-color-fg-muted)] jogak:font-normal',
                  )}
                  // eslint-disable-next-line no-restricted-syntax -- jogak: CSS var inject (--jogak-jogak-pl)
                  style={{ '--jogak-jogak-pl': `${paddingLeft + 18}px` } as CSSVarStyle}
                  aria-current={isSelected ? 'true' : undefined}
                >
                  {jogakName}
                </button>
              </li>
            )
          })}
          {/* 1.1.0 post-1.0: MDX docs sub-entry — meta.docs 있을 때만. 클릭 시 mode=docs로 이동. */}
          {typeof meta.docs === 'string' && meta.docs.length > 0 && (
            <li>
              <button
                type="button"
                data-testid="sidebar-docs-entry"
                onClick={() => {
                  // meta.jogakNames[0]와 mode=docs를 함께 전달 — Preview의 useEffect가 URL에서 mode 읽음.
                  const first = meta.jogakNames[0]
                  if (typeof first === 'string') onSelect(meta.id, first)
                  if (typeof window !== 'undefined') {
                    const params = new URLSearchParams(window.location.search)
                    params.set('mode', 'docs')
                    window.history.replaceState({}, '', `?${params.toString()}`)
                    // Preview가 popstate/mount 시 URL 재파싱하도록 이벤트 발생.
                    window.dispatchEvent(new PopStateEvent('popstate'))
                  }
                }}
                className={clsx(
                  'jogak:block jogak:w-full jogak:text-left jogak:pr-3 jogak:py-1',
                  'jogak:pl-[var(--jogak-jogak-pl)]',
                  'jogak:border-none jogak:cursor-pointer jogak:text-[12px] jogak:italic',
                  'jogak:bg-transparent jogak:text-[var(--jogak-color-fg-subtle)] jogak:font-normal',
                )}
                // eslint-disable-next-line no-restricted-syntax -- jogak: CSS var inject
                style={{ '--jogak-jogak-pl': `${paddingLeft + 18}px` } as CSSVarStyle}
              >
                Docs
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
