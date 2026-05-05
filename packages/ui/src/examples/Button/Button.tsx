import type { ReactElement, MouseEvent } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'danger'

export interface ButtonProps {
  readonly label: string
  readonly variant?: ButtonVariant
  readonly disabled?: boolean
  readonly onClick?: (e: MouseEvent<HTMLButtonElement>) => void
}

const styles: Record<ButtonVariant, React.CSSProperties> = {
  primary: { background: '#2563eb', color: '#fff', border: 'none' },
  secondary: { background: '#fff', color: '#374151', border: '1px solid #d1d5db' },
  danger: { background: '#dc2626', color: '#fff', border: 'none' },
}

export function Button({ label, variant = 'primary', disabled = false, onClick }: ButtonProps): ReactElement {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        ...styles[variant],
        padding: '8px 16px',
        borderRadius: 6,
        fontSize: 14,
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  )
}
