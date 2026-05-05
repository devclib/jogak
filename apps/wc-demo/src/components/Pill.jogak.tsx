import type { JogakMeta, Jogak } from '@jogak/core'
import { Pill } from './Pill.js'

const meta = {
  title: 'WC/Pill',
  component: Pill,
  argTypes: {
    label: { description: '표시 텍스트' },
    tone: { description: '톤' },
    rounded: { description: '완전 라운드 여부' },
  },
} satisfies JogakMeta

export default meta

export const Info: Jogak = { name: 'Info', args: { label: 'New', tone: 'info', rounded: true } }
export const Success: Jogak = { name: 'Success', args: { label: 'OK', tone: 'success', rounded: true } }
export const Danger: Jogak = { name: 'Danger', args: { label: 'Error', tone: 'danger', rounded: false } }
