import type { Jogak, JogakMeta } from '@jogak/core'
import { Button } from './Button'

const meta = {
  title: 'Atoms/Button',
  component: Button,
  argTypes: {
    children: { control: 'text' },
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost', 'danger'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    leadingIcon: { control: 'text' },
    fullWidth: { control: 'boolean' },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
} satisfies JogakMeta

export default meta

export const Primary: Jogak = { name: 'Primary', args: { children: '장바구니 담기', variant: 'primary', size: 'md' } }
export const Secondary: Jogak = { name: 'Secondary', args: { children: '취소', variant: 'secondary', size: 'md' } }
export const Danger: Jogak = { name: 'Danger', args: { children: '주문 취소', variant: 'danger', size: 'md' } }
export const Ghost: Jogak = { name: 'Ghost', args: { children: '나중에', variant: 'ghost', size: 'md' } }
export const WithIcon: Jogak = { name: 'WithIcon', args: { children: '결제', variant: 'primary', size: 'lg', leadingIcon: '💳' } }
export const Loading: Jogak = { name: 'Loading', args: { children: '결제 중', variant: 'primary', loading: true } }
export const FullWidth: Jogak = { name: 'FullWidth', args: { children: '주문 확정', variant: 'primary', size: 'lg', fullWidth: true } }
