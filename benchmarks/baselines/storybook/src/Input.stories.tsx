import type { Meta, StoryObj } from '@storybook/react'
import { Input } from '../../shared/components/Input.js'

const meta: Meta<typeof Input> = {
  title: 'Baseline/Input',
  component: Input,
  argTypes: {
    label: { description: '라벨 텍스트' },
    type: { description: 'input type' },
    placeholder: { description: '플레이스홀더' },
    error: { description: '에러 메시지' },
    disabled: { description: '비활성화 여부' },
  },
}

export default meta
type Story = StoryObj<typeof Input>

export const Default: Story = {
  args: { label: 'Email', type: 'email', placeholder: 'you@example.com' },
}

export const WithError: Story = {
  args: { label: 'Password', type: 'password', error: '비밀번호가 너무 짧습니다.' },
}

export const Disabled: Story = {
  args: { label: 'Disabled', type: 'text', placeholder: 'cannot edit', disabled: true },
}
