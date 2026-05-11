/**
 * 알파.9: standalone-adapter 또는 fallback 시 사용되는 same-origin iframe entry.
 * 알파.14.1: entry.meta.framework 기반 adapter dispatch (react/vue/svelte/wc 지원).
 *
 * `IframeMount`는 알파.9에서 postMessage 프로토콜로 통일됐다 (cross-origin 어댑터와 동일).
 * preview-frame.tsx도 같은 프로토콜을 따라야 한다 — 부모는 `jogak:setProps` 메시지를,
 * iframe은 `jogak:ready` / `jogak:rendered` / `jogak:error`를 emit한다.
 *
 * jogak host vite scope에서 동작하므로 `virtual:jogak` (registry metas + entry loader)와
 * `virtual:jogak/global-css` (사용자 globalCss) 가상 모듈을 그대로 사용한다.
 */
import type { JogakAdapter } from '@jogak/core'
import { defaultRegistry } from '@jogak/core'
import { adapterFor } from '../lib/adapter-for.js'
import 'virtual:jogak'
import 'virtual:jogak/global-css'

const rootEl = document.getElementById('jogak-preview-root')
if (rootEl === null) throw new Error('#jogak-preview-root not found')

let currentContainer: HTMLDivElement | null = null
let currentAdapter: JogakAdapter | null = null

async function renderEntry(
  entryId: string,
  args: Readonly<Record<string, unknown>>,
): Promise<void> {
  const entry = await defaultRegistry.requestEntry(entryId)
  const framework = entry.meta.framework ?? 'react'
  const nextAdapter = await adapterFor(framework)

  if (currentContainer === null) {
    currentContainer = document.createElement('div')
    rootEl?.replaceChildren(currentContainer)
  }
  // entry framework가 바뀐 경우 이전 어댑터로 unmount 후 새 어댑터로 mount.
  if (currentAdapter !== null && currentAdapter !== nextAdapter) {
    currentAdapter.unmount(currentContainer)
    // container 자체는 재사용 가능하지만 이전 어댑터가 남긴 root/component 상태가
    // 섞이지 않도록 새 div로 교체.
    const fresh = document.createElement('div')
    rootEl?.replaceChildren(fresh)
    currentContainer = fresh
  }
  currentAdapter = nextAdapter
  await nextAdapter.render(entry, args, currentContainer)
}

function unmount(): void {
  if (currentContainer !== null && currentAdapter !== null) {
    currentAdapter.unmount(currentContainer)
    currentContainer = null
    currentAdapter = null
  }
}

window.addEventListener('message', (event: MessageEvent) => {
  const data = event.data as { type?: unknown; entryId?: unknown; args?: unknown } | null
  if (data === null || typeof data !== 'object') return
  if (data.type === 'jogak:setProps' && typeof data.entryId === 'string') {
    const args = (data.args ?? {}) as Readonly<Record<string, unknown>>
    void renderEntry(data.entryId, args)
      .then(() => {
        window.parent.postMessage(
          { type: 'jogak:rendered', entryId: data.entryId },
          '*',
        )
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        window.parent.postMessage({ type: 'jogak:error', message }, '*')
      })
  } else if (data.type === 'jogak:unmount') {
    unmount()
  }
})

window.parent.postMessage({ type: 'jogak:ready' }, '*')
