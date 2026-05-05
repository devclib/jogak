import { createContext, useContext, type ReactNode } from 'react'
import type { ComponentRegistry } from '@jogak/core'
import { defaultRegistry } from '@jogak/core'

const RegistryContext = createContext<ComponentRegistry>(defaultRegistry)

export interface JogakProviderProps {
  readonly registry?: ComponentRegistry
  readonly children: ReactNode
}

export function JogakProvider({ registry = defaultRegistry, children }: JogakProviderProps): React.ReactElement {
  return (
    <RegistryContext.Provider value={registry}>
      {children}
    </RegistryContext.Provider>
  )
}

export function useRegistry(): ComponentRegistry {
  return useContext(RegistryContext)
}
