import type { ReactNode } from 'react'

export type BadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive'

export interface BadgeProps {
  /** 라벨 (children) */
  readonly children?: ReactNode
  /** 시각적 변형 */
  readonly variant?: BadgeVariant
}

const variantClass: Record<BadgeVariant, string> = {
  default: 'bg-primary text-primary-foreground',
  secondary: 'bg-secondary text-secondary-foreground',
  outline: 'border border-border text-foreground',
  destructive: 'bg-destructive text-destructive-foreground',
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      data-variant={variant}
      className={[
        'inline-flex w-fit items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium',
        variantClass[variant],
      ].join(' ')}
    >
      {children}
    </span>
  )
}
