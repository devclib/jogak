import type { JogakMeta, Jogak } from '@jogak/core'
import { Modal } from '../../shared/components/Modal.js'

const meta = {
  title: 'Baseline/Modal',
  component: Modal,
  argTypes: {
    open: { description: '열림 여부' },
    title: { description: '모달 제목' },
  },
} satisfies JogakMeta

export default meta

export const Open: Jogak = {
  name: 'Open',
  args: { open: true, title: 'Confirm action', children: 'Are you sure you want to proceed?' },
}

export const Closed: Jogak = {
  name: 'Closed',
  args: { open: false, title: 'Hidden modal' },
}
