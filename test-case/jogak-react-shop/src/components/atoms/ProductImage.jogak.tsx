import type { Jogak, JogakMeta } from '@jogak/core'
import { ProductImage } from './ProductImage'

const meta = {
  title: 'Atoms/ProductImage',
  component: ProductImage,
  argTypes: {
    color: { control: 'text', description: 'HEX 색상' },
    label: { control: 'text', description: '두문자 추출 라벨' },
    aspect: { control: 'select', options: ['square', 'portrait', 'landscape'] },
    rounded: { control: 'select', options: ['none', 'sm', 'md', 'lg'] },
  },
} satisfies JogakMeta

export default meta

export const Square: Jogak = { name: 'Square', args: { color: '#2563eb', label: 'Oversize Tee', aspect: 'square', rounded: 'md' } }
export const Portrait: Jogak = { name: 'Portrait', args: { color: '#dc2626', label: 'Wool Coat', aspect: 'portrait', rounded: 'lg' } }
export const Landscape: Jogak = { name: 'Landscape', args: { color: '#16a34a', label: 'Yoga Mat', aspect: 'landscape', rounded: 'lg' } }
export const Sharp: Jogak = { name: 'Sharp', args: { color: '#1c1917', label: 'Headphone', rounded: 'none' } }
