import type { ReactNode } from 'react'

export interface CardProps {
  /** 카드 제목 */
  readonly title?: string
  /** 카드 본문 */
  readonly description?: string
  /** 푸터 콘텐츠 (children) */
  readonly children?: ReactNode
}

export function Card({ title, description, children }: CardProps) {
  return (
    <div className="rounded-lg border border-border bg-background p-6 shadow-sm w-80">
      {title !== undefined && <h3 className="text-base font-semibold mb-1">{title}</h3>}
      {description !== undefined && (
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
      )}
      {children !== undefined && <div className="flex gap-2">{children}</div>}
    </div>
  )
}
