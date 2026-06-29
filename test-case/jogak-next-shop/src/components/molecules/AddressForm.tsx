'use client'

import type { ChangeEvent, ReactElement } from 'react'
import type { Address } from '@jogak-shop/shared'

export interface AddressFormProps {
  readonly value: Address
  readonly onChange: (next: Address) => void
  readonly disabled?: boolean
}

interface FieldDef {
  readonly key: keyof Address
  readonly label: string
  readonly placeholder: string
  readonly span?: 'full' | 'half'
}

const fields: readonly FieldDef[] = [
  { key: 'recipient', label: '수령인', placeholder: '홍길동', span: 'half' },
  { key: 'phone', label: '연락처', placeholder: '010-0000-0000', span: 'half' },
  { key: 'line1', label: '주소 1', placeholder: '서울특별시 ...', span: 'full' },
  { key: 'line2', label: '상세 주소', placeholder: '101동 1001호', span: 'full' },
  { key: 'city', label: '도시', placeholder: 'Seoul', span: 'half' },
  { key: 'postalCode', label: '우편번호', placeholder: '06000', span: 'half' },
  { key: 'country', label: '국가', placeholder: 'KR', span: 'full' },
]

/**
 * 배송지 입력. controlled. 폼 라이브러리 의존 없음.
 */
export function AddressForm({ value, onChange, disabled = false }: AddressFormProps): ReactElement {
  const make = (key: keyof Address) => (e: ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [key]: e.target.value })
  return (
    <div className="grid grid-cols-2 gap-3">
      {fields.map((f) => (
        <label
          key={f.key}
          className={`flex flex-col gap-1 ${f.span === 'full' ? 'col-span-2' : ''}`}
        >
          <span className="text-xs font-medium text-ink-600">{f.label}</span>
          <input
            type="text"
            value={value[f.key]}
            placeholder={f.placeholder}
            disabled={disabled}
            onChange={make(f.key)}
            className="h-10 px-3 rounded-md border border-ink-200 bg-white text-sm focus:outline-none focus:border-brand-500 disabled:bg-ink-100"
          />
        </label>
      ))}
    </div>
  )
}