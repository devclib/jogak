import type { ReactNode } from 'react'

export interface BadgeProps {
  children?: ReactNode
  variant?: 'default' | 'secondary' | 'outline' | 'destructive'
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  const base = 'inline-flex w-fit items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium'
  const variantClass =
    variant === 'default'
      ? 'bg-primary text-primary-foreground'
      : variant === 'secondary'
        ? 'bg-foreground text-background'
        : variant === 'outline'
          ? 'border border-border text-foreground'
          : 'bg-foreground text-background'
  return (
    <span data-slot="badge" data-variant={variant} className={`${base} ${variantClass}`}>
      {children}
    </span>
  )
}
