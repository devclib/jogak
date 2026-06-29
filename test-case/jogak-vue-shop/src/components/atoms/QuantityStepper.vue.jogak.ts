import type { Jogak, JogakMeta } from '@jogak/core'
import QuantityStepper from './QuantityStepper.vue'

const meta = {
  title: 'Atoms/QuantityStepper',
  component: QuantityStepper,
  framework: 'vue',
  argTypes: {
    value: { control: 'number' },
    min: { control: 'number' },
    max: { control: 'number' },
    size: { control: 'select', options: ['sm', 'md'] },
  },
} satisfies JogakMeta

export default meta

export const Default: Jogak = { name: 'Default', args: { value: 1, min: 1, max: 99, size: 'md' } }
export const Small: Jogak = { name: 'Small', args: { value: 3, min: 1, max: 10, size: 'sm' } }
export const NearMax: Jogak = { name: 'NearMax', args: { value: 9, min: 1, max: 10, size: 'md' } }
