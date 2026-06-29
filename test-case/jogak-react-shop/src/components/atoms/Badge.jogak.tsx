import type { Jogak, JogakMeta } from '@jogak/core'
import { Badge } from './Badge'

const meta = {
  title: 'Atoms/Badge',
  component: Badge,
  argTypes: {
    children: { control: 'text', description: '표시할 텍스트' },
    tone: { control: 'select', options: ['neutral', 'brand', 'accent', 'success', 'danger'] },
    size: { control: 'select', options: ['sm', 'md'] },
    outline: { control: 'boolean' },
  },
} satisfies JogakMeta

export default meta

export const Neutral: Jogak = { name: 'Neutral', args: { children: 'NEW', tone: 'neutral' } }
export const Brand: Jogak = { name: 'Brand', args: { children: 'BEST', tone: 'brand' } }
export const Sale: Jogak = { name: 'Sale', args: { children: 'SALE -15%', tone: 'danger', size: 'md' } }
export const Outline: Jogak = { name: 'Outline', args: { children: 'cotton', tone: 'neutral', outline: true } }
