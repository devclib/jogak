import type { Meta, StoryObj } from '@storybook/react'
import { Button } from '../../shared/components/Button.js'

const meta: Meta<typeof Button> = {
  title: 'Baseline/Button',
  component: Button,
  argTypes: {
    label: { description: '버튼 라벨 텍스트' },
    variant: { description: '시각적 톤' },
    size: { description: '사이즈' },
    disabled: { description: '비활성화 여부' },
  },
}

export default meta
type Story = StoryObj<typeof Button>

export const Primary: Story = {
  args: { label: 'Primary', variant: 'primary', size: 'md' },
}

export const Secondary: Story = {
  args: { label: 'Secondary', variant: 'secondary', size: 'md' },
}

export const Disabled: Story = {
  args: { label: 'Disabled', variant: 'primary', size: 'md', disabled: true },
}
