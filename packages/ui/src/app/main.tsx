import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'virtual:jogak'
import { _jogakCodeTheme } from 'virtual:jogak'
import { defaultRegistry } from '@jogak/core'
import { JogakApp } from './App.js'

const rootEl = document.getElementById('root')
if (rootEl === null) throw new Error('#root element not found')

createRoot(rootEl).render(
  <StrictMode>
    <JogakApp entries={defaultRegistry.getAll()} codeTheme={_jogakCodeTheme} />
  </StrictMode>,
)
