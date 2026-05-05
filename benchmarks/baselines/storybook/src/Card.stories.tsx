import type { Meta, StoryObj } from '@storybook/react'
import { Card } from '../../shared/components/Card.js'

const meta: Meta<typeof Card> = {
  title: 'Baseline/Card',
  component: Card,
  argTypes: {
    title: { description: '카드 제목' },
    description: { description: '카드 설명' },
    tone: { description: '강조 톤' },
  },
}

export default meta
type Story = StoryObj<typeof Card>

export const Neutral: Story = {
  args: { title: 'Neutral Card', description: 'Default tone', tone: 'neutral' },
}

export const Primary: Story = {
  args: { title: 'Primary Card', description: 'Highlighted action', tone: 'primary' },
}

export const Warning: Story = {
  args: { title: 'Warning Card', description: 'Caution required', tone: 'warning' },
}
