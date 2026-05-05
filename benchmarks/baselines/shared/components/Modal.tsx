import * as React from 'react'

export interface ModalProps {
  /** 열림 여부 */
  readonly open: boolean
  /** 모달 제목 */
  readonly title: string
  /** 본문 */
  readonly children?: React.ReactNode
  /** 닫기 핸들러 */
  readonly onClose?: () => void
}

export function Modal(props: ModalProps): React.JSX.Element | null {
  const { open, title, children, onClose } = props
  if (!open) return null
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 8,
          minWidth: 320,
          padding: 20,
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.2)',
        }}
        onClick={(e) => {
          e.stopPropagation()
        }}
      >
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 0, fontSize: 16, cursor: 'pointer' }}
          >
            ×
          </button>
        </header>
        <div style={{ marginTop: 12, fontSize: 13, color: '#475569' }}>{children}</div>
      </div>
    </div>
  )
}
