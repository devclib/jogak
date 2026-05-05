'use client'

import dynamic from 'next/dynamic'
import type { ReactElement } from 'react'
import { entries } from '../../../.jogak/registry.js'

const JogakApp = dynamic(() => import('@jogak/ui').then((m) => ({ default: m.JogakApp })), {
  ssr: false,
  loading: () => <div style={{ padding: 24, color: '#9ca3af' }}>Loading…</div>,
})

export default function JogakPage(): ReactElement {
  return <JogakApp entries={entries} codeTheme="vsDark" />
}
