import type { JogakMeta, Jogak } from '@jogak/core'
import { Pill } from './Pill'

const meta = {
  title: 'WC/Pill',
  component: Pill,
  framework: 'web-components',
  argTypes: {
    label: { control: 'text', description: '표시 텍스트' },
    tone: {
      control: 'select',
      options: ['info', 'success', 'danger', 'neutral'],
      description: '톤',
    },
    rounded: { control: 'boolean', description: '완전 라운드' },
  },
} satisfies JogakMeta

export default meta

export const Info: Jogak = {
  name: 'Info',
  args: { label: 'New', tone: 'info', rounded: true },
}

export const Success: Jogak = {
  name: 'Success',
  args: { label: 'OK', tone: 'success', rounded: true },
}

export const Danger: Jogak = {
  name: 'Danger',
  args: { label: 'Error', tone: 'danger', rounded: false },
}

export const Neutral: Jogak = {
  name: 'Neutral',
  args: { label: 'Draft', tone: 'neutral', rounded: false },
}
