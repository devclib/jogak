import { useState, useEffect } from 'react'
import type { CSSProperties, ReactElement } from 'react'
import clsx from 'clsx'
import type { CategoryMetaTree, RegistryEntryMeta } from '@jogak/core'
import { useRegistryMeta } from '@jogak/react'

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
  const { metaTree, searchMeta } = useRegistryMeta()

  const filtered = query.trim().length > 0 ? searchMeta(query) : null

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
          <FlatList
            metas={filtered}
            selectedEntryId={selectedEntryId}
            selectedJogakName={selectedJogakName}
            onSelect={onSelect}
          />
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

interface FlatListProps {
  readonly metas: readonly RegistryEntryMeta[]
  readonly selectedEntryId: string | null
  readonly selectedJogakName: string | null
  readonly onSelect: (entryId: string, jogakName: string) => void
}

function FlatList({
  metas,
  selectedEntryId,
  selectedJogakName,
  onSelect,
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
          />
        </li>
      ))}
    </ul>
  )
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
}

function EntryGroup({
  meta,
  selectedEntryId,
  selectedJogakName,
  onSelect,
  indent,
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
        style={{ '--jogak-entry-pl': `${paddingLeft}px` } as CSSVarStyle}
        aria-expanded={open}
      >
        <span className="jogak:text-[10px] jogak:shrink-0 jogak:leading-none">
          {open ? '▾' : '▸'}
        </span>
        {label}
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
                  style={{ '--jogak-jogak-pl': `${paddingLeft + 18}px` } as CSSVarStyle}
                  aria-current={isSelected ? 'true' : undefined}
                >
                  {jogakName}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
