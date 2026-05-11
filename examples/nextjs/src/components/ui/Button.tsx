'use client'

import { useState, type ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'outline'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps {
  /** 버튼 라벨 (children) */
  readonly children?: ReactNode
  /** 시각적 변형 */
  readonly variant?: ButtonVariant
  /** 크기 */
  readonly size?: ButtonSize
  /** 비활성화 상태 */
  readonly disabled?: boolean
}

const sizeClass: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-4 text-sm',
  lg: 'h-11 px-6 text-base',
}

const variantClass: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground hover:opacity-90',
  secondary: 'bg-secondary text-secondary-foreground hover:opacity-90',
  destructive: 'bg-destructive text-destructive-foreground hover:opacity-90',
  outline: 'border border-border bg-transparent text-foreground hover:bg-muted',
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
}: ButtonProps) {
  const [count, setCount] = useState(0)
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => setCount((c) => c + 1)}
      className={[
        'inline-flex items-center justify-center rounded-md font-medium transition-opacity',
        'disabled:cursor-not-allowed disabled:opacity-50',
        sizeClass[size],
        variantClass[variant],
      ].join(' ')}
    >
      {children}
      {count > 0 && <span className="ml-2 text-xs opacity-70">×{count}</span>}
    </button>
  )
}
