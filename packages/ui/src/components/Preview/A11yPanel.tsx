import type { ReactElement } from 'react'
import type { JogakA11yViolation } from '@jogak/core'
import type { A11yResult } from './IframeMount.js'

const IMPACT_COLOR: Record<string, string> = {
  critical: 'jogak:text-[var(--jogak-color-error-fg)] jogak:bg-[var(--jogak-color-bg-error)] jogak:border-[var(--jogak-color-error-border)]',
  serious: 'jogak:text-[var(--jogak-color-error-fg)] jogak:bg-[var(--jogak-color-bg-error)] jogak:border-[var(--jogak-color-error-border)]',
  moderate: 'jogak:text-[var(--jogak-color-warn-fg)] jogak:bg-[var(--jogak-color-bg-warn)] jogak:border-[var(--jogak-color-warn-border)]',
  minor: 'jogak:text-[var(--jogak-color-fg-subtle)] jogak:bg-[var(--jogak-color-bg-muted)] jogak:border-[var(--jogak-color-border)]',
}

export interface A11yPanelProps {
  readonly result: A11yResult | null
}

/**
 * 1.0.0-beta.3: A11y (axe-core) 결과 패널. bottom tab Controls / Actions 옆.
 *
 * result가 null이면 loading 상태(첫 render 전). notInstalled=true면 axe-core install 안내.
 * violations 배열이 비면 "no violations detected" (성공 케이스).
 */
export function A11yPanel({ result }: A11yPanelProps): ReactElement {
  if (result === null) {
    return (
      <div className="jogak:p-6 jogak:text-[13px] jogak:text-[var(--jogak-color-fg-subtle)]">
        Running accessibility check…
      </div>
    )
  }

  if (result.notInstalled) {
    return (
      <div className="jogak:p-6 jogak:text-[13px] jogak:leading-relaxed jogak:text-[var(--jogak-color-text-secondary)]">
        <strong className="jogak:block jogak:mb-2 jogak:text-[var(--jogak-color-text)]">
          axe-core is not installed
        </strong>
        <p className="jogak:m-0 jogak:mb-2">
          Install <code className="jogak:bg-[var(--jogak-color-bg-muted)] jogak:px-1.5 jogak:py-0.5 jogak:rounded">axe-core</code> to enable accessibility checks:
        </p>
        <pre className="jogak:m-0 jogak:mb-2 jogak:p-2 jogak:bg-[var(--jogak-color-bg-muted)] jogak:rounded jogak:text-[12px]">
          pnpm add -D axe-core
        </pre>
        <p className="jogak:m-0 jogak:text-[var(--jogak-color-fg-subtle)]">
          axe-core is an <code>optionalDependency</code> — Jogak does not bundle it to keep install size small.
        </p>
      </div>
    )
  }

  if (result.violations.length === 0) {
    return (
      <div className="jogak:p-6 jogak:text-[13px] jogak:text-[var(--jogak-color-success-fg)]">
        <strong className="jogak:block jogak:mb-1">No accessibility violations detected</strong>
        <p className="jogak:m-0 jogak:text-[var(--jogak-color-fg-subtle)]">
          Scanned by <code>axe-core</code>. Impact levels: critical / serious / moderate / minor.
        </p>
      </div>
    )
  }

  return (
    <div className="jogak:p-4 jogak:flex jogak:flex-col jogak:gap-3">
      <div className="jogak:text-[13px] jogak:text-[var(--jogak-color-fg-subtle)]">
        {result.violations.length} violation{result.violations.length === 1 ? '' : 's'} detected by axe-core
      </div>
      {result.violations.map((v) => (
        <ViolationCard key={v.id} violation={v} />
      ))}
    </div>
  )
}

function ViolationCard({ violation }: { violation: JogakA11yViolation }): ReactElement {
  const impactClass = IMPACT_COLOR[violation.impact ?? 'minor'] ?? IMPACT_COLOR['minor']
  return (
    <div className={`jogak:border jogak:rounded-[var(--jogak-radius-md)] jogak:p-3 jogak:text-[12.5px] jogak:leading-snug ${impactClass}`}>
      <div className="jogak:flex jogak:items-baseline jogak:gap-2 jogak:mb-1">
        <span className="jogak:font-semibold jogak:uppercase jogak:text-[11px]">
          {violation.impact ?? 'unknown'}
        </span>
        <span className="jogak:font-semibold">{violation.help}</span>
      </div>
      <p className="jogak:m-0 jogak:mb-2">{violation.description}</p>
      <a
        href={violation.helpUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="jogak:text-[var(--jogak-color-link)] jogak:underline jogak:text-[12px]"
      >
        Rule: {violation.id} →
      </a>
      {violation.nodes.length > 0 && (
        <ul className="jogak:mt-2 jogak:m-0 jogak:pl-4 jogak:text-[11.5px] jogak:font-[family-name:var(--jogak-font-mono)]">
          {violation.nodes.slice(0, 3).map((n, i) => (
            <li key={i} className="jogak:mb-1">
              <code>{n.target.join(', ')}</code>
            </li>
          ))}
          {violation.nodes.length > 3 && (
            <li className="jogak:text-[var(--jogak-color-fg-subtle)]">
              …and {violation.nodes.length - 3} more node{violation.nodes.length - 3 === 1 ? '' : 's'}
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
