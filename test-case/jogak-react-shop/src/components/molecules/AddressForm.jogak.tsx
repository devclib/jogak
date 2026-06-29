import { useState, type ReactElement } from 'react'
import type { Jogak, JogakMeta } from '@jogak/core'
import type { Address } from '@jogak-shop/shared'
import { AddressForm } from './AddressForm'

const blank: Address = {
  recipient: '', line1: '', line2: '', city: '', postalCode: '', country: 'KR', phone: '',
}

function AddressFormShowcase(props: { initial?: Address; disabled?: boolean }): ReactElement {
  const [v, setV] = useState<Address>(props.initial ?? blank)
  return <AddressForm value={v} onChange={setV} disabled={props.disabled} />
}

const meta = {
  title: 'Molecules/AddressForm',
  component: AddressFormShowcase,
  argTypes: {
    disabled: { control: 'boolean' },
  },
} satisfies JogakMeta

export default meta

const filled: Address = {
  recipient: '홍길동',
  line1: '서울특별시 강남구 테헤란로 123',
  line2: '101동 1001호',
  city: 'Seoul',
  postalCode: '06234',
  country: 'KR',
  phone: '010-1234-5678',
}

export const Empty: Jogak = { name: 'Empty', args: { initial: blank, disabled: false } }
export const Filled: Jogak = { name: 'Filled', args: { initial: filled, disabled: false } }
export const Disabled: Jogak = { name: 'Disabled', args: { initial: filled, disabled: true } }
