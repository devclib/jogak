import type { JogakMeta, Jogak } from '@jogak/core'
import { Pill } from '../../shared/components/Pill.js'

const meta = {
  title: 'Baseline/Pill',
  component: Pill,
  argTypes: {
    label: { description: '라벨' },
    color: { description: '색상 톤' },
    size: { description: '사이즈' },
  },
} satisfies JogakMeta

export default meta

export const Info: Jogak = { name: 'Info', args: { label: 'Info', color: 'info', size: 'md' } }
export const Success: Jogak = { name: 'Success', args: { label: 'OK', color: 'success', size: 'md' } }
export const Danger: Jogak = { name: 'Danger', args: { label: 'Error', color: 'danger', size: 'sm' } }
