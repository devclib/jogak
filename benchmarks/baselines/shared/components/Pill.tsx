import * as React from 'react'

export interface PillProps {
  /** 라벨 */
  readonly label: string
  /** 색상 톤 */
  readonly color?: 'info' | 'success' | 'danger' | 'neutral'
  /** 사이즈 */
  readonly size?: 'sm' | 'md'
}

const COLOR_STYLE: Record<NonNullable<PillProps['color']>, React.CSSProperties> = {
  info: { background: '#dbeafe', color: '#1e40af' },
  success: { background: '#dcfce7', color: '#166534' },
  danger: { background: '#fee2e2', color: '#991b1b' },
  neutral: { background: '#e2e8f0', color: '#334155' },
}

const SIZE_STYLE: Record<NonNullable<PillProps['size']>, React.CSSProperties> = {
  sm: { padding: '2px 8px', fontSize: 11 },
  md: { padding: '4px 10px', fontSize: 13 },
}

export function Pill(props: PillProps): React.JSX.Element {
  const { label, color = 'neutral', size = 'md' } = props
  return (
    <span
      style={{
        ...COLOR_STYLE[color],
        ...SIZE_STYLE[size],
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 9999,
        fontWeight: 500,
      }}
    >
      {label}
    </span>
  )
}
