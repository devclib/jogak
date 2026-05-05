import * as React from 'react'

export interface InputProps {
  /** 라벨 텍스트 */
  readonly label: string
  /** input type */
  readonly type?: 'text' | 'email' | 'password' | 'number'
  /** placeholder */
  readonly placeholder?: string
  /** 에러 메시지 */
  readonly error?: string
  /** 비활성화 */
  readonly disabled?: boolean
  /** 현재 값 */
  readonly value?: string
}

export function Input(props: InputProps): React.JSX.Element {
  const { label, type = 'text', placeholder, error, disabled = false, value } = props
  const hasError = error !== undefined && error.length > 0
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
      <span style={{ color: '#0f172a', fontWeight: 500 }}>{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        defaultValue={value}
        disabled={disabled}
        style={{
          padding: '8px 10px',
          border: `1px solid ${hasError ? '#ef4444' : '#cbd5e1'}`,
          borderRadius: 6,
          fontSize: 14,
          background: disabled ? '#f1f5f9' : '#fff',
        }}
      />
      {hasError && <span style={{ color: '#ef4444', fontSize: 12 }}>{error}</span>}
    </label>
  )
}
