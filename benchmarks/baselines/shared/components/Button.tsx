import * as React from 'react'

export interface ButtonProps {
  /** 버튼 라벨 텍스트 */
  readonly label: string
  /** 시각적 톤 */
  readonly variant?: 'primary' | 'secondary'
  /** 사이즈 */
  readonly size?: 'sm' | 'md' | 'lg'
  /** 비활성화 여부 */
  readonly disabled?: boolean
  /** 클릭 핸들러 */
  readonly onClick?: () => void
}

const VARIANT_STYLE: Record<NonNullable<ButtonProps['variant']>, React.CSSProperties> = {
  primary: { background: '#2563eb', color: '#fff', border: '1px solid #1d4ed8' },
  secondary: { background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1' },
}

const SIZE_STYLE: Record<NonNullable<ButtonProps['size']>, React.CSSProperties> = {
  sm: { padding: '4px 8px', fontSize: 12 },
  md: { padding: '8px 14px', fontSize: 14 },
  lg: { padding: '12px 20px', fontSize: 16 },
}

export function Button(props: ButtonProps): React.JSX.Element {
  const { label, variant = 'primary', size = 'md', disabled = false, onClick } = props
  const style: React.CSSProperties = {
    ...VARIANT_STYLE[variant],
    ...SIZE_STYLE[size],
    borderRadius: 6,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    fontWeight: 500,
  }
  return (
    <button type="button" style={style} disabled={disabled} onClick={onClick}>
      {label}
    </button>
  )
}
