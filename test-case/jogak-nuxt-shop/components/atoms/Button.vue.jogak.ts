import type { Jogak, JogakMeta } from '@jogak/core'
import Button from './Button.vue'

const meta = {
  title: 'Atoms/Button',
  component: Button,
  framework: 'vue',
  argTypes: {
    label: { control: 'text' },
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost', 'danger'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    leadingIcon: { control: 'text' },
    fullWidth: { control: 'boolean' },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
} satisfies JogakMeta

export default meta

export const Primary: Jogak = { name: 'Primary', args: { label: '장바구니 담기', variant: 'primary' } }
export const Secondary: Jogak = { name: 'Secondary', args: { label: '취소', variant: 'secondary' } }
export const Danger: Jogak = { name: 'Danger', args: { label: '주문 취소', variant: 'danger' } }
export const Ghost: Jogak = { name: 'Ghost', args: { label: '나중에', variant: 'ghost' } }
export const WithIcon: Jogak = { name: 'WithIcon', args: { label: '결제', variant: 'primary', size: 'lg', leadingIcon: '💳' } }
export const Loading: Jogak = { name: 'Loading', args: { label: '결제 중', loading: true } }
export const FullWidth: Jogak = { name: 'FullWidth', args: { label: '주문 확정', variant: 'primary', size: 'lg', fullWidth: true } }
