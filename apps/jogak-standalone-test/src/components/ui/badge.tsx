import type { ReactNode } from 'react'

export interface BadgeProps {
  children?: ReactNode
  variant?: 'default' | 'secondary' | 'outline' | 'destructive'
}

// standalone 모드: utility class 컴파일러(예: Tailwind) 없으므로 클래스 의존 회피.
// 사용자 사전 빌드 CSS에서 [data-slot="badge"]에 스타일 적용.
export function Badge({ children, variant = 'default' }: BadgeProps) {
  return (
    <span data-slot="badge" data-variant={variant}>
      {children}
    </span>
  )
}
