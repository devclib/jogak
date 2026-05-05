import type { JogakMeta, Jogak } from '@jogak/core'
import { Card } from '../../shared/components/Card.js'

const meta = {
  title: 'Baseline/Card',
  component: Card,
  argTypes: {
    title: { description: '카드 제목' },
    description: { description: '카드 설명' },
    tone: { description: '강조 톤' },
  },
} satisfies JogakMeta

export default meta

export const Neutral: Jogak = {
  name: 'Neutral',
  args: { title: 'Neutral Card', description: 'Default tone', tone: 'neutral' },
}

export const Primary: Jogak = {
  name: 'Primary',
  args: { title: 'Primary Card', description: 'Highlighted action', tone: 'primary' },
}

export const Warning: Jogak = {
  name: 'Warning',
  args: { title: 'Warning Card', description: 'Caution required', tone: 'warning' },
}
