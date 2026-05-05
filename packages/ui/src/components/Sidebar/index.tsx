import { useState, useEffect } from 'react'
import type { ReactElement } from 'react'
import type { CategoryTree, RegistryEntry } from '@jogak/core'
import { useRegistry } from '../../hooks/useRegistry.js'

export interface SidebarProps {
  readonly selectedEntryId: string | null
  readonly selectedJogakName: string | null
  readonly onSelect: (entryId: string, jogakName: string) => void
}

export function Sidebar({
  selectedEntryId,
  selectedJogakName,
  onSelect,
}: SidebarProps): ReactElement {
  const [query, setQuery] = useState('')
  const { tree, search } = useRegistry()

  const filtered = query.trim().length > 0 ? search(query) : null

  return (
    <aside
      data-testid="sidebar"
      style={{
        borderRight: '1px solid #e5e7eb',
        height: '100%',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>
        <input
          type="search"
          placeholder="Search components..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
          }}
          style={{
            width: '100%',
            padding: '6px 8px',
            border: '1px solid #d1d5db',
            borderRadius: 4,
          }}
          aria-label="Search components"
        />
      </div>
      <nav style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
        {filtered !== null ? (
          <FlatList
            entries={filtered}
            selectedEntryId={selectedEntryId}
            selectedJogakName={selectedJogakName}
            onSelect={onSelect}
          />
        ) : (
          <TreeView
            node={tree}
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
  readonly entries: readonly RegistryEntry[]
  readonly selectedEntryId: string | null
  readonly selectedJogakName: string | null
  readonly onSelect: (entryId: string, jogakName: string) => void
}

function FlatList({
  entries,
  selectedEntryId,
  selectedJogakName,
  onSelect,
}: FlatListProps): ReactElement {
  if (entries.length === 0) {
    return (
      <p style={{ padding: '0 12px', color: '#9ca3af', fontSize: 13 }}>
        No results
      </p>
    )
  }
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {entries.map((entry) => (
        <li key={entry.id}>
          <EntryGroup
            entry={entry}
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
  readonly node: CategoryTree
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
      style={{
        listStyle: 'none',
        margin: 0,
        padding: `0 0 0 ${depth * 12}px`,
      }}
    >
      {Object.entries(node).map(([key, child]) => (
        <li key={key}>
          {'id' in child ? (
            <EntryGroup
              entry={child as RegistryEntry}
              selectedEntryId={selectedEntryId}
              selectedJogakName={selectedJogakName}
              onSelect={onSelect}
              indent={0}
            />
          ) : (
            <CategoryGroup
              label={key}
              node={child as CategoryTree}
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
  readonly node: CategoryTree
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
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          width: '100%',
          padding: '4px 12px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 600,
          color: '#6b7280',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
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
  readonly entry: RegistryEntry
  readonly selectedEntryId: string | null
  readonly selectedJogakName: string | null
  readonly onSelect: (entryId: string, jogakName: string) => void
  readonly indent: number
}

function EntryGroup({
  entry,
  selectedEntryId,
  selectedJogakName,
  onSelect,
  indent,
}: EntryGroupProps): ReactElement {
  const isCurrentEntry = entry.id === selectedEntryId
  const [open, setOpen] = useState(isCurrentEntry)

  useEffect(() => {
    if (isCurrentEntry) setOpen(true)
  }, [isCurrentEntry])

  const label = entry.title.split('/').pop() ?? entry.title
  const paddingLeft = 16 + indent * 12

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          if (!isCurrentEntry) {
            setOpen(true)
            const first = entry.jogaks[0]
            if (first !== undefined) onSelect(entry.id, first.name)
          } else {
            setOpen((v) => !v)
          }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          width: '100%',
          padding: `5px 12px 5px ${paddingLeft}px`,
          background: isCurrentEntry ? '#eff6ff' : 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 13,
          color: isCurrentEntry ? '#2563eb' : '#374151',
          fontWeight: isCurrentEntry ? 500 : 400,
          textAlign: 'left',
        }}
        aria-expanded={open}
      >
        <span style={{ fontSize: 10, flexShrink: 0, lineHeight: 1 }}>
          {open ? '▾' : '▸'}
        </span>
        {label}
      </button>
      {open && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {entry.jogaks.map((jogak) => {
            const isSelected = isCurrentEntry && jogak.name === selectedJogakName
            return (
              <li key={jogak.name}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(entry.id, jogak.name)
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: `4px 12px 4px ${paddingLeft + 18}px`,
                    background: isSelected ? '#dbeafe' : 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 12,
                    color: isSelected ? '#1d4ed8' : '#6b7280',
                    fontWeight: isSelected ? 500 : 400,
                  }}
                  aria-current={isSelected ? 'true' : undefined}
                >
                  {jogak.name}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
