import { useState, type ReactElement } from 'react'
import type { Jogak, JogakMeta } from '@jogak/core'
import { QuantityStepper } from './QuantityStepper'

/**
 * QuantityStepper는 controlled. wrapper로 local state 부여하여 쇼케이스.
 */
function QuantityStepperShowcase(props: {
  initial?: number
  min?: number
  max?: number
  size?: 'sm' | 'md'
}): ReactElement {
  const [value, setValue] = useState(props.initial ?? 1)
  return <QuantityStepper value={value} onChange={setValue} min={props.min} max={props.max} size={props.size} />
}

const meta = {
  title: 'Atoms/QuantityStepper',
  component: QuantityStepperShowcase,
  argTypes: {
    initial: { control: 'number', description: '초기 수량' },
    min: { control: 'number' },
    max: { control: 'number' },
    size: { control: 'select', options: ['sm', 'md'] },
  },
} satisfies JogakMeta

export default meta

export const Default: Jogak = { name: 'Default', args: { initial: 1, min: 1, max: 99, size: 'md' } }
export const Small: Jogak = { name: 'Small', args: { initial: 3, min: 1, max: 10, size: 'sm' } }
export const NearMax: Jogak = { name: 'NearMax', args: { initial: 9, min: 1, max: 10, size: 'md' } }
