import type { Jogak, JogakMeta } from '@jogak/core'
import Badge from './Badge.svelte'

const meta = {
  title: 'Atoms/Badge',
  component: Badge,
  framework: 'svelte',
  argTypes: {
    label: { control: 'text' },
    tone: { control: 'select', options: ['neutral', 'brand', 'accent', 'success', 'danger'] },
    size: { control: 'select', options: ['sm', 'md'] },
    outline: { control: 'boolean' },
  },
} satisfies JogakMeta

export default meta

export const Neutral: Jogak = { name: 'Neutral', args: { label: 'NEW', tone: 'neutral' } }
export const Brand: Jogak = { name: 'Brand', args: { label: 'BEST', tone: 'brand' } }
export const Sale: Jogak = { name: 'Sale', args: { label: 'SALE -15%', tone: 'danger', size: 'md' } }
export const Outline: Jogak = { name: 'Outline', args: { label: 'cotton', tone: 'neutral', outline: true } }
