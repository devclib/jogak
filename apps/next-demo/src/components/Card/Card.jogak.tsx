import type { JogakMeta, Jogak } from '@jogak/core'
import { Card } from './Card.js'

const meta = {
  title: 'Components/Card',
  component: Card,
  argTypes: {
    title: { description: '카드 제목' },
    description: { description: '카드 설명' },
    tone: { description: '톤 (색상 변형)' },
    elevated: { description: '그림자 적용 여부' },
  },
} satisfies JogakMeta

export default meta

export const Neutral: Jogak = {
  name: 'Neutral',
  args: { title: 'Neutral Card', description: 'Default tone', tone: 'neutral', elevated: false },
}

export const Primary: Jogak = {
  name: 'Primary',
  args: { title: 'Primary Card', description: 'Highlighted action', tone: 'primary', elevated: true },
}

export const Warning: Jogak = {
  name: 'Warning',
  args: { title: 'Warning Card', description: 'Caution required', tone: 'warning', elevated: false },
}
