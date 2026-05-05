import * as React from 'react'

export interface CardProps {
  /** 카드 제목 */
  readonly title: string
  /** 카드 설명 */
  readonly description?: string
  /** 푸터 영역 */
  readonly footer?: React.ReactNode
  /** 강조 톤 */
  readonly tone?: 'neutral' | 'primary' | 'warning'
}

const TONE_STYLE: Record<NonNullable<CardProps['tone']>, React.CSSProperties> = {
  neutral: { borderColor: '#e2e8f0', background: '#fff' },
  primary: { borderColor: '#3b82f6', background: '#eff6ff' },
  warning: { borderColor: '#f59e0b', background: '#fffbeb' },
}

export function Card(props: CardProps): React.JSX.Element {
  const { title, description, footer, tone = 'neutral' } = props
  return (
    <div
      style={{
        ...TONE_STYLE[tone],
        border: '1px solid',
        borderRadius: 8,
        padding: 16,
        maxWidth: 360,
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
      }}
    >
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{title}</h3>
      {description !== undefined && (
        <p style={{ margin: '8px 0 0', fontSize: 13, color: '#475569' }}>{description}</p>
      )}
      {footer !== undefined && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>{footer}</div>
      )}
    </div>
  )
}
