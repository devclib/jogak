/**
 * 1.0.0-beta.3: A11y (axe-core) 실행 코드 — 각 adapter scaffold가 iframe scope의
 * source template에 삽입.
 *
 * axe-core는 optionalDependency — 미설치 시 notInstalled=true로 부모에 알려 install
 * 안내 표시. 300ms 디바운스로 args 연속 변경 시 마지막 상태만 검사.
 *
 * 사용 패턴:
 * ```ts
 * // adapter scaffold의 SOURCE template 안:
 * `
 *   ...
 *   ${A11Y_SNIPPET}
 *   window.addEventListener('message', (event) => {
 *     if (data.type === 'jogak:setProps') {
 *       renderEntry(...).then(() => {
 *         window.parent.postMessage({ type: 'jogak:rendered', ... }, '*')
 *         scheduleA11y()   // <-- axe 실행 트리거
 *       })
 *     }
 *   })
 * `
 * ```
 */
export const A11Y_SNIPPET = `
// A11y (axe-core dynamic import) — 1.0.0-beta.3
let a11yRunning = false
let a11yTimer = 0
async function runA11y() {
  if (a11yRunning) return
  a11yRunning = true
  try {
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
  } catch {}
  finally { a11yRunning = false }
}
function scheduleA11y() {
  if (a11yTimer !== 0) window.clearTimeout(a11yTimer)
  a11yTimer = window.setTimeout(() => { a11yTimer = 0; runA11y() }, 300)
}
`
