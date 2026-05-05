import type { Meta, StoryObj } from '@storybook/react'
import { Pill } from '../../shared/components/Pill.js'

const meta: Meta<typeof Pill> = {
  title: 'Baseline/Pill',
  component: Pill,
  argTypes: {
    label: { description: '라벨' },
    color: { description: '색상 톤' },
    size: { description: '사이즈' },
  },
}

export default meta
type Story = StoryObj<typeof Pill>

export const Info: Story = {
  args: { label: 'Info', color: 'info', size: 'md' },
}

export const Success: Story = {
  args: { label: 'OK', color: 'success', size: 'md' },
}

export const Danger: Story = {
  args: { label: 'Error', color: 'danger', size: 'sm' },
}
