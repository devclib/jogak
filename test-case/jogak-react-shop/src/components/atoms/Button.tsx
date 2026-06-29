import type { ButtonHTMLAttributes, ReactElement, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly children: ReactNode
  readonly variant?: ButtonVariant
  readonly size?: ButtonSize
  readonly leadingIcon?: string
  readonly fullWidth?: boolean
  readonly loading?: boolean
}

const variantClass: Record<ButtonVariant, string> = {
  primary: 'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 disabled:bg-brand-500/50',
  secondary: 'bg-ink-100 text-ink-900 hover:bg-ink-200 disabled:bg-ink-100/60',
  ghost: 'bg-transparent text-ink-900 hover:bg-ink-100 disabled:text-ink-400',
  danger: 'bg-danger-500 text-white hover:bg-red-700 disabled:bg-danger-500/50',
}

const sizeClass: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
}

/**
 * variant/size/loading/leadingIcon 조합 button.
 * 도메인 데이터(가격, 수량 등) 의존 없이 순수 UI.
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  leadingIcon,
  fullWidth = false,
  loading = false,
  disabled,
  className,
  ...rest
}: ButtonProps): ReactElement {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors ${variantClass[variant]} ${sizeClass[size]} ${fullWidth ? 'w-full' : ''} ${loading ? 'opacity-70 cursor-progress' : ''} ${className ?? ''}`}
    >
      {loading ? <span className="animate-pulse">…</span> : leadingIcon ? <span>{leadingIcon}</span> : null}
      <span>{children}</span>
    </button>
  )
}
