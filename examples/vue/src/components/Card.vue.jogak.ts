import type { JogakMeta, Jogak } from '@jogak/core'
import Card from './Card.vue'

const meta = {
  title: 'Vue/Card',
  component: Card,
  framework: 'vue',
  argTypes: {
    title: { control: 'text' },
    description: { control: 'text' },
  },
} satisfies JogakMeta

export default meta

export const Default: Jogak = {
  name: 'Default',
  args: { title: 'Account', description: '계정 정보를 관리합니다.' },
}

export const TitleOnly: Jogak = {
  name: 'TitleOnly',
  args: { title: 'Quick Action' },
}
