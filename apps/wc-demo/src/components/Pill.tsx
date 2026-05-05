import { h } from 'preact'

export type PillTone = 'info' | 'success' | 'danger'

export interface PillProps {
  readonly label: string
  readonly tone?: PillTone
  readonly rounded?: boolean
}

const toneMap: Record<PillTone, { background: string; color: string }> = {
  info: { background: '#dbeafe', color: '#1d4ed8' },
  success: { background: '#dcfce7', color: '#15803d' },
  danger: { background: '#fee2e2', color: '#b91c1c' },
}

export function Pill({ label, tone = 'info', rounded = true }: PillProps): h.JSX.Element {
  const { background, color } = toneMap[tone]
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 12px',
        borderRadius: rounded === true ? 9999 : 4,
        fontSize: 12,
        fontWeight: 600,
        background,
        color,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {label}
    </span>
  )
}
