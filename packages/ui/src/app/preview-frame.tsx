/**
 * 알파.9: standalone-adapter 또는 fallback 시 사용되는 same-origin iframe entry.
 * 알파.14.1: entry.meta.framework 기반 adapter dispatch (react/vue/svelte/wc 지원).
 * 1.0.0-beta: chrome scope stub(component=null) 안전 처리 — placeholder UI 표시.
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

/**
 * chrome scope stub entry(component=null)에 대해 mount 시도 대신 안내 UI를 표시.
 *
 * alpha.14.1에서 도입된 chrome scope stub은 `previewIsolation: 'iframe'` 환경에서
 * 사용자 vite scope가 component를 hydrate하는 전제로 동작한다. 사용자 vite/dev server
 * 가 없는 환경(Next/Nuxt/standalone fallback)에서는 stub이 그대로 chrome SPA의 iframe
 * (preview-frame.html)에 도달해 React.createElement(null) 에러가 발생했었다.
 *
 * 이제 명시적 placeholder + 사용자 안내로 fallback해서 디버깅 가능한 상태로 만든다.
 */
function renderStubPlaceholder(container: HTMLElement, entryId: string): void {
  container.innerHTML = ''
  const wrapper = document.createElement('div')
  wrapper.setAttribute('data-jogak-preview-placeholder', '')
  wrapper.style.cssText =
    'padding: 24px; border: 1px dashed #e5e7eb; border-radius: 12px; ' +
    'background: #fafaf9; color: #57534e; font-family: system-ui, sans-serif; ' +
    'font-size: 13px; line-height: 1.6; max-width: 720px; margin: 12px auto;'
  wrapper.innerHTML = `
    <strong style="display:block; color:#1c1917; margin-bottom:8px;">
      Preview unavailable — entry has no resolvable component
    </strong>
    <p style="margin:0 0 8px;">
      <code style="background:#f5f5f4; padding:2px 6px; border-radius:4px;">${escapeHtml(entryId)}</code>
      의 component가 null로 등록되어 있습니다.
    </p>
    <p style="margin:0 0 8px;">
      <code>previewIsolation: 'iframe'</code> 모드는 사용자 vite/dev server scope에서
      component를 hydrate해야 정상 동작합니다.
    </p>
    <ul style="margin:0; padding-left:18px;">
      <li>Vite 환경: 사용자 vite 자동 spawn이 활성화됐는지 확인</li>
      <li>Next/Nuxt 환경: 사용자 dev server URL을 <code>jogak.config.ts</code>의
        <code>userViteUrl</code>로 지정하거나 <code>previewIsolation: 'none'</code>으로
        chrome scope mount로 전환</li>
      <li>standalone 환경: jogak adapter가 사용자 framework dev server를 spawn하지 못한 상태</li>
    </ul>
  `
  container.appendChild(wrapper)
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function renderEntry(
  entryId: string,
  args: Readonly<Record<string, unknown>>,
): Promise<void> {
  const entry = await defaultRegistry.requestEntry(entryId)

  // 1.0.0-beta: chrome scope stub(component=null) guard.
  // adapter.render에 null component를 넘기면 React.createElement(null) 등 framework별로
  // 불명확한 에러가 발생한다 — 명확한 placeholder + 부모에게 jogak:error 알림.
  if (entry.meta.component === null || entry.meta.component === undefined) {
    if (currentContainer !== null && currentAdapter !== null) {
      currentAdapter.unmount(currentContainer)
      currentAdapter = null
    }
    if (currentContainer === null) {
      currentContainer = document.createElement('div')
      rootEl?.replaceChildren(currentContainer)
    }
    renderStubPlaceholder(currentContainer, entryId)
    throw new Error(
      `[jogak/preview] entry "${entryId}" has no component (chrome scope stub). ` +
        `사용자 vite scope가 component를 hydrate해야 합니다. ` +
        `Next/Nuxt 환경이면 jogak.config의 userViteUrl 또는 previewIsolation:'none'을 확인하세요.`,
    )
  }

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

// 1.0.0-beta.3: A11y (axe-core dynamic import) — chrome SPA fallback scope.
let a11yRunning = false
let a11yTimer = 0
async function runA11y(): Promise<void> {
  if (a11yRunning) return
  a11yRunning = true
  try {
    // axe-core는 optionalDependency — 사용자가 install한 경우만 dynamic import 성공.
    // 변수 obfuscation으로 vite import-analysis 정적 스캔 회피.
    const axeModuleId = 'axe-core'
    const axe = await import(axeModuleId).catch(() => null)
    if (axe === null) {
      window.parent.postMessage({ type: 'jogak:a11y', violations: [], notInstalled: true }, '*')
      return
    }
    const result = await axe.default.run(document.body, { resultTypes: ['violations'] })
    const violations = result.violations.map((v: { id: string; impact: string | null; description: string; help: string; helpUrl: string; nodes: { target: (string | string[])[]; html: string; failureSummary: string | null }[] }) => ({
      id: v.id,
      impact: v.impact ?? null,
      description: v.description,
      help: v.help,
      helpUrl: v.helpUrl,
      nodes: v.nodes.map((n) => ({
        target: n.target.map((t: string | string[]) => Array.isArray(t) ? t.join(' ') : String(t)),
        html: n.html,
        failureSummary: n.failureSummary ?? '',
      })),
    }))
    window.parent.postMessage({ type: 'jogak:a11y', violations }, '*')
  } catch {
    // axe 내부 오류 — 사용자 컴포넌트 문제가 아님. silent.
  } finally {
    a11yRunning = false
  }
}
function scheduleA11y(): void {
  if (a11yTimer !== 0) window.clearTimeout(a11yTimer)
  a11yTimer = window.setTimeout(() => { a11yTimer = 0; void runA11y() }, 300)
}

window.addEventListener('message', (event: MessageEvent) => {
  const data = event.data as { type?: unknown; entryId?: unknown; args?: unknown; theme?: unknown; docsPath?: unknown } | null
  if (data === null || typeof data !== 'object') return
  if (data.type === 'jogak:setProps' && typeof data.entryId === 'string') {
    const args = (data.args ?? {}) as Readonly<Record<string, unknown>>
    void renderEntry(data.entryId, args)
      .then(() => {
        window.parent.postMessage(
          { type: 'jogak:rendered', entryId: data.entryId },
          '*',
        )
        scheduleA11y()
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        window.parent.postMessage({ type: 'jogak:error', message }, '*')
      })
  } else if (data.type === 'jogak:unmount') {
    unmount()
  } else if (data.type === 'jogak:runA11y') {
    scheduleA11y()
  } else if (data.type === 'jogak:setTheme' && typeof data.theme === 'string') {
    // 1.0.0 post-1.0: Themes addon — CSS attribute selector 기반.
    document.documentElement.setAttribute('data-theme', data.theme)
  } else if (data.type === 'jogak:renderDocs' && typeof data.docsPath === 'string') {
    // 1.0.0 post-1.0: MDX docs — chrome SPA fallback scope는 사용자 vite 없어 .mdx 컴파일 불가.
    const rootEl = document.getElementById('jogak-preview-root')
    if (rootEl !== null) {
      rootEl.innerHTML =
        '<div style="padding:24px;font:13px system-ui;color:#57534e;">'
        + '<strong>MDX docs mode</strong><br><br>'
        + 'This preview runs in chrome SPA fallback scope which does not compile .mdx. '
        + 'Configure your project with a vite MDX plugin (@mdx-js/rollup) and jogak will render docs in the user vite scope.'
        + '</div>'
    }
    window.parent.postMessage({ type: 'jogak:rendered', entryId: '__docs__' }, '*')
  }
})

// 1.0.0-beta.2: iframe content 높이를 부모에 동기화 — 부모 IframeMount가 받아
// iframe element의 height를 갱신해서 내부 scroll 대신 자연 높이로 표시.
//
// ResizeObserver는 element 크기 변경 시점에 동기 콜백. body 자체를 관찰해
// 컴포넌트 mount/unmount/args 변경 시 자동 갱신.
//
// 첫 ready 직후엔 컴포넌트 미마운트 상태(height=0)일 수 있어 ResizeObserver의
// 첫 콜백은 일반적으로 mount 직후. throttle 없음 — ResizeObserver는 자체로
// browser frame rate에 맞춰 throttle.
const heightObserver = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const height = Math.ceil(entry.contentRect.height)
    if (height > 0) {
      window.parent.postMessage({ type: 'jogak:height', height }, '*')
    }
  }
})
heightObserver.observe(document.body)

window.parent.postMessage({ type: 'jogak:ready' }, '*')
