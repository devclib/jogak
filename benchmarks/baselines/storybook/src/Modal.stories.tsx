import type { Meta, StoryObj } from '@storybook/react'
import { Modal } from '../../shared/components/Modal.js'

const meta: Meta<typeof Modal> = {
  title: 'Baseline/Modal',
  component: Modal,
  argTypes: {
    open: { description: '열림 여부' },
    title: { description: '모달 제목' },
  },
}

export default meta
type Story = StoryObj<typeof Modal>

export const Open: Story = {
  args: { open: true, title: 'Confirm action', children: 'Are you sure you want to proceed?' },
}

export const Closed: Story = {
  args: { open: false, title: 'Hidden modal' },
}
