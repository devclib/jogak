import type { ReactElement, MouseEvent } from 'react'

export type CardTone = 'neutral' | 'primary' | 'warning'

export interface CardProps {
  readonly title: string
  readonly description?: string
  readonly tone?: CardTone
  readonly elevated?: boolean
  readonly onAction?: (e: MouseEvent<HTMLButtonElement>) => void
}

const toneMap: Record<CardTone, { background: string; border: string; accent: string }> = {
  neutral: { background: '#ffffff', border: '#e5e7eb', accent: '#374151' },
  primary: { background: '#eff6ff', border: '#bfdbfe', accent: '#1d4ed8' },
  warning: { background: '#fef3c7', border: '#fde68a', accent: '#b45309' },
}

export function Card({
  title,
  description,
  tone = 'neutral',
  elevated = false,
  onAction,
}: CardProps): ReactElement {
  const { background, border, accent } = toneMap[tone]
  return (
    <div
      style={{
        background,
        border: `1px solid ${border}`,
        borderRadius: 12,
        padding: 16,
        boxShadow: elevated ? '0 4px 12px rgba(0,0,0,0.08)' : 'none',
        maxWidth: 360,
      }}
    >
      <h3 style={{ margin: 0, color: accent, fontSize: 16 }}>{title}</h3>
      {description !== undefined && (
        <p style={{ margin: '6px 0 12px', color: '#4b5563', fontSize: 13 }}>{description}</p>
      )}
      <button
        type="button"
        onClick={onAction}
        style={{
          padding: '4px 10px',
          fontSize: 12,
          fontWeight: 600,
          color: accent,
          background: 'transparent',
          border: `1px solid ${accent}`,
          borderRadius: 6,
          cursor: 'pointer',
        }}
      >
        Action
      </button>
    </div>
  )
}
