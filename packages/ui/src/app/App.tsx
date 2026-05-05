import { useState, useCallback, useEffect, useMemo } from 'react'
import { ComponentRegistry } from '@jogak/core'
import type { RegistryEntry } from '@jogak/core'
import { JogakProvider } from '@jogak/react'
import { Sidebar } from '../components/Sidebar/index.js'
import { Preview } from '../components/Preview/index.js'
import type { ReactElement } from 'react'

export interface JogakAppProps {
  readonly entries: readonly RegistryEntry[]
  readonly codeTheme?: string
}

function readUrlParams(): { entryId: string; jogakName: string } | null {
  const params = new URLSearchParams(window.location.search)
  const entryId = params.get('entry')
  const jogakName = params.get('jogak')
  if (entryId !== null && jogakName !== null) return { entryId, jogakName }
  return null
}

function pushUrl(entryId: string, jogakName: string): void {
  const params = new URLSearchParams()
  params.set('entry', entryId)
  params.set('jogak', jogakName)
  window.history.pushState({}, '', `?${params.toString()}`)
}

export function JogakApp({ entries, codeTheme = 'vsDark' }: JogakAppProps): ReactElement {
  const registry = useMemo(() => {
    const r = new ComponentRegistry()
    for (const entry of entries) r.register(entry)
    return r
  }, [entries])

  const initial = readUrlParams()
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

  const handleArgChange = useCallback((key: string, value: unknown) => {
    setOverrideArgs((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleReset = useCallback(() => {
    setOverrideArgs({})
  }, [])

  return (
    <JogakProvider registry={registry}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '260px 1fr',
          height: '100dvh',
          overflow: 'hidden',
        }}
      >
        <Sidebar
          selectedEntryId={selectedEntryId}
          selectedJogakName={selectedJogakName}
          onSelect={handleSelect}
        />
        <main style={{ overflow: 'hidden', minHeight: 0 }}>
          {selectedEntryId !== null && selectedJogakName !== null ? (
            <Preview
              entryId={selectedEntryId}
              jogakName={selectedJogakName}
              overrideArgs={overrideArgs}
              onArgChange={handleArgChange}
              onReset={handleReset}
              codeTheme={codeTheme}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#9ca3af',
              }}
            >
              Select a component from the sidebar
            </div>
          )}
        </main>
      </div>
    </JogakProvider>
  )
}
