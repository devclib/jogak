'use client'

import type { ReactElement } from 'react'

export type BadgeTone = 'neutral' | 'brand' | 'accent' | 'success' | 'danger'
export type BadgeSize = 'sm' | 'md'

export interface BadgeProps {
  readonly children: string
  readonly tone?: BadgeTone
  readonly size?: BadgeSize
  readonly outline?: boolean
}

const toneClass: Record<BadgeTone, string> = {
  neutral: 'bg-ink-100 text-ink-600',
  brand: 'bg-brand-50 text-brand-700',
  accent: 'bg-orange-50 text-accent-500',
  success: 'bg-green-50 text-success-500',
  danger: 'bg-red-50 text-danger-500',
}

const outlineClass: Record<BadgeTone, string> = {
  neutral: 'border-ink-200 text-ink-600',
  brand: 'border-brand-500 text-brand-700',
  accent: 'border-accent-500 text-accent-500',
  success: 'border-success-500 text-success-500',
  danger: 'border-danger-500 text-danger-500',
}

/**
 * 카테고리, 할인, "NEW" 등의 짧은 라벨.
 * tone + size + outline 조합.
 */
export function Badge({
  children,
  tone = 'neutral',
  size = 'sm',
  outline = false,
}: BadgeProps): ReactElement {
  const sizeCls = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1'
  const skin = outline ? `border ${outlineClass[tone]} bg-white` : toneClass[tone]
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium tracking-wide uppercase ${sizeCls} ${skin}`}
    >
      {children}
    </span>
  )
}