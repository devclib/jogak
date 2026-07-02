/**
 * 알파.9: 모든 빌더 어댑터가 공통으로 사용하는 preview entry source.
 *
 * 빌더에 무관하게 다음 책임:
 * 1. `defaultRegistry.requestEntry(entryId)`로 사용자 컴포넌트 dynamic import
 * 2. `entry.meta.framework`에 따라 framework adapter dispatch (lazy import)
 * 3. postMessage 프로토콜 (`@jogak/core/preview-entry/protocol`)로 부모와 통신
 *
 * 알파.14.1: framework dispatch — iframe scope에 react/vue/svelte/web-components/next
 * 어댑터를 lazy import. 사용자가 안 쓰는 framework 모듈은 로드 받지 않는다.
 * 사용자측 컴포넌트는 사용자 vite scope에서 컴파일되므로 plugin-vue/svelte 등이
 * 정상 작동 (`jogak ui` chrome 5173과 분리된 iframe scope 5174).
 *
 * 어댑터별 차이는 `extraImports` 배열뿐:
 * - vite-adapter: `['virtual:jogak/preview-global-css']`
 * - next-adapter: 사용자 globalCss 절대 경로 직접 inject
 * - webpack-adapter: 사용자 globalCss 절대 경로
 * - standalone-adapter: 사용자 사전 빌드 css 절대 경로
 */

const TEMPLATE = `
import { defaultRegistry } from '@jogak/core'
__EXTRA_IMPORTS__

const adapterPromiseCache = new Map()

function loadAdapter(framework) {
  const key = framework ?? 'react'
  const cached = adapterPromiseCache.get(key)
  if (cached !== undefined) return cached
  let promise
  switch (key) {
    case 'vue':
      promise = import('@jogak/core/renderers/vue').then((m) => m.vueAdapter)
      break
    case 'svelte':
      promise = import('@jogak/core/renderers/svelte').then((m) => m.svelteAdapter)
      break
    case 'web-components': {
      promise = import('@jogak/core/renderers/web-components').then((m) => {
        const entryToTagName = (entryId) => {
          const safe = entryId
            .toLowerCase()
            .replace(/[^a-z0-9]+/gu, '-')
            .replace(/^-+|-+$/gu, '')
          return 'jogak-' + (safe || 'entry')
        }
        const serializeAttribute = (value) => {
          if (value === undefined || value === null) return null
          if (typeof value === 'string') return value
          if (typeof value === 'number' || typeof value === 'boolean') return String(value)
          if (typeof value === 'function' || typeof value === 'object') return null
          return String(value)
        }
        const state = new WeakMap()
        return {
          framework: 'web-components',
          render(entry, args, container) {
            const tagName = entryToTagName(entry.id)
            m.defineJogakElement(tagName, entry)
            let s = state.get(container)
            if (s === undefined || s.tagName !== tagName) {
              if (s !== undefined) s.el.remove()
              const el = document.createElement(tagName)
              container.replaceChildren(el)
              s = { el, tagName }
              state.set(container, s)
            }
            for (const [k, v] of Object.entries(args ?? {})) {
              const serialized = serializeAttribute(v)
              if (serialized === null) {
                s.el.removeAttribute(k)
              } else {
                s.el.setAttribute(k, serialized)
              }
            }
          },
          unmount(container) {
            const s = state.get(container)
            if (s !== undefined) {
              s.el.remove()
              state.delete(container)
            }
          },
        }
      })
      break
    }
    case 'next':
    case 'react':
    default:
      promise = import('@jogak/core/renderers/react').then((m) => m.reactAdapter)
  }
  adapterPromiseCache.set(key, promise)
  return promise
}

const rootEl = document.getElementById('jogak-preview-root')
if (rootEl === null) throw new Error('[jogak] #jogak-preview-root not found')

let currentContainer = null
let currentAdapter = null

async function renderEntry(entryId, args) {
  const entry = await defaultRegistry.requestEntry(entryId)
  const framework = entry?.meta?.framework ?? 'react'
  const adapter = await loadAdapter(framework)
  if (currentContainer === null) {
    currentContainer = document.createElement('div')
    rootEl.replaceChildren(currentContainer)
  } else if (currentAdapter !== null && currentAdapter !== adapter) {
    // framework 전환 — 이전 adapter로 unmount 후 새 컨테이너로 교체.
    try { currentAdapter.unmount(currentContainer) } catch {}
    currentContainer = document.createElement('div')
    rootEl.replaceChildren(currentContainer)
  }
  await adapter.render(entry, args, currentContainer)
  currentAdapter = adapter
}

function unmount() {
  if (currentContainer !== null && currentAdapter !== null) {
    try { currentAdapter.unmount(currentContainer) } catch {}
    currentContainer = null
    currentAdapter = null
  }
}

// 1.0.0-beta.3: A11y (axe-core) 실행. axe-core는 optionalDependency — 미설치 시
// notInstalled=true. 300ms 디바운스로 args 연속 변경 시 마지막 상태만 검사.
let a11yRunning = false
let a11yTimer = 0
async function runA11y() {
  if (a11yRunning) return
  a11yRunning = true
  try {
    // vite import-analysis 정적 스캔 회피 — 변수 obfuscation으로 optional 의도 보존.
    const axeModuleId = 'axe-core'
    const axe = await import(axeModuleId).catch(() => null)
    if (axe === null) {
      window.parent.postMessage({ type: 'jogak:a11y', violations: [], notInstalled: true }, '*')
      return
    }
    const result = await axe.default.run(document.body, { resultTypes: ['violations'] })
    const violations = result.violations.map((v) => ({
      id: v.id,
      impact: v.impact ?? null,
      description: v.description,
      help: v.help,
      helpUrl: v.helpUrl,
      nodes: v.nodes.map((n) => ({
        target: n.target.map((t) => Array.isArray(t) ? t.join(' ') : String(t)),
        html: n.html,
        failureSummary: n.failureSummary ?? '',
      })),
    }))
    window.parent.postMessage({ type: 'jogak:a11y', violations }, '*')
  } catch {
    // axe 실행 실패 — silent (사용자 컴포넌트가 던진 에러가 아님)
  } finally {
    a11yRunning = false
  }
}
function scheduleA11y() {
  if (a11yTimer !== 0) window.clearTimeout(a11yTimer)
  a11yTimer = window.setTimeout(() => { a11yTimer = 0; runA11y() }, 300)
}

window.addEventListener('message', (event) => {
  const data = event.data
  if (data == null || typeof data !== 'object') return
  if (data.type === 'jogak:setProps') {
    renderEntry(data.entryId, data.args ?? {}).then(() => {
      window.parent.postMessage({ type: 'jogak:rendered', entryId: data.entryId }, '*')
      scheduleA11y()
    }).catch((err) => {
      window.parent.postMessage({ type: 'jogak:error', message: String(err?.message ?? err) }, '*')
    })
  } else if (data.type === 'jogak:unmount') {
    unmount()
  } else if (data.type === 'jogak:runA11y') {
    scheduleA11y()
  } else if (data.type === 'jogak:setTheme' && typeof data.theme === 'string') {
    document.documentElement.setAttribute('data-theme', data.theme)
  } else if (data.type === 'jogak:renderDocs' && typeof data.docsPath === 'string') {
    renderDocs(data.docsPath)
  } else if (data.type === 'jogak:renderComponent') {
    unmount()
  }
})

// 1.0.0 post-1.0: MDX docs 렌더. rollup-plugin-mdx가 사용자 vite에 있어야 .mdx 컴파일.
async function renderDocs(docsPath) {
  try {
    const modId = docsPath
    const mod = await import(modId).catch((err) => ({ __error: err }))
    if (mod && mod.__error) {
      renderDocsError(String(mod.__error && mod.__error.message ? mod.__error.message : mod.__error))
      return
    }
    const DocsComponent = mod.default
    if (typeof DocsComponent !== 'function') {
      renderDocsError('MDX module has no default export (expected React component).')
      return
    }
    const reactAdapter = await import('@jogak/core/renderers/react').then((m) => m.reactAdapter)
    if (currentContainer !== null && currentAdapter !== null) {
      try { currentAdapter.unmount(currentContainer) } catch {}
    }
    currentContainer = document.createElement('div')
    currentContainer.setAttribute('data-jogak-docs', '')
    rootEl.replaceChildren(currentContainer)
    const entryLike = {
      id: '__docs__',
      title: '__docs__',
      jogaks: [{ name: 'default', args: {} }],
      meta: { title: '__docs__', component: DocsComponent, framework: 'react' },
    }
    await reactAdapter.render(entryLike, {}, currentContainer)
    currentAdapter = reactAdapter
    window.parent.postMessage({ type: 'jogak:rendered', entryId: '__docs__' }, '*')
  } catch (err) {
    renderDocsError(String(err && err.message ? err.message : err))
  }
}

function renderDocsError(message) {
  if (currentContainer === null) {
    currentContainer = document.createElement('div')
    rootEl.replaceChildren(currentContainer)
  }
  currentContainer.innerHTML = '<div style="padding:24px;color:#b91c1c;font:13px system-ui;">'
    + '<strong>Docs render failed.</strong><br>' + message.replace(/</g, '&lt;')
    + '<br><br>Install a MDX plugin in your vite.config (e.g. <code>@mdx-js/rollup</code>) so <code>.mdx</code> files compile.'
    + '</div>'
  window.parent.postMessage({ type: 'jogak:error', message }, '*')
}

// 1.0.0-beta.2: body 높이를 부모(chrome SPA의 IframeMount)에 동기화 — iframe element height
// 갱신으로 내부 scroll 회피. ResizeObserver는 frame 단위 throttle.
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
`

export interface RenderPreviewEntryOptions {
  /**
   * 어댑터별 추가 import 라인. 라인 순서대로 emit되어 cascade order 결정.
   *
   * @example vite-adapter
   * ['virtual:jogak/preview-global-css']
   *
   * @example next-adapter
   * ['/abs/path/src/index.css']
   */
  readonly extraImports?: readonly string[]
}

/**
 * 어댑터가 호출 — 자기 scope에 맞는 추가 import 라인 주입.
 */
export function renderPreviewEntrySource(
  opts: RenderPreviewEntryOptions = {},
): string {
  const imports = opts.extraImports ?? []
  const importLines = imports
    .map((p) => `import ${JSON.stringify(p)}`)
    .join('\n')
  return TEMPLATE.replace('__EXTRA_IMPORTS__', importLines)
}
