import { useRegistry as useRegistryFromAdapter } from '@jogak/core/renderers/react'
import { useMemo } from 'react'
import type { CategoryTree, RegistryEntry } from '@jogak/core'

export interface UseRegistryReturn {
  readonly entries: readonly RegistryEntry[]
  readonly tree: CategoryTree
  readonly search: (query: string) => readonly RegistryEntry[]
}

export function useRegistry(): UseRegistryReturn {
  const registry = useRegistryFromAdapter()

  const entries = useMemo(() => registry.getAll(), [registry])
  const tree = useMemo(() => registry.getTree(), [registry])
  const search = useMemo(
    () => (query: string) => registry.search(query),
    [registry],
  )

  return { entries, tree, search }
}
