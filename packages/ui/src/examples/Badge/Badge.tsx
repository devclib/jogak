import type { ReactElement } from 'react'

export type BadgeColor = 'blue' | 'green' | 'red' | 'yellow' | 'gray'

export interface BadgeProps {
  readonly label: string
  readonly color?: BadgeColor
}

const colorMap: Record<BadgeColor, { background: string; color: string }> = {
  blue:   { background: '#dbeafe', color: '#1d4ed8' },
  green:  { background: '#dcfce7', color: '#15803d' },
  red:    { background: '#fee2e2', color: '#b91c1c' },
  yellow: { background: '#fef9c3', color: '#a16207' },
  gray:   { background: '#f3f4f6', color: '#374151' },
}

export function Badge({ label, color = 'gray' }: BadgeProps): ReactElement {
  const { background, color: textColor } = colorMap[color]
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: 9999,
        fontSize: 12,
        fontWeight: 600,
        background,
        color: textColor,
      }}
    >
      {label}
    </span>
  )
}
