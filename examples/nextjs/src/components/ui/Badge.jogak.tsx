import type { JogakMeta, Jogak } from '@jogak/core'
import { Badge } from './Badge'

const meta = {
  title: 'UI/Badge',
  component: Badge,
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'outline', 'destructive'],
      description: '시각적 변형',
    },
    children: { control: 'text', description: '라벨' },
  },
} satisfies JogakMeta

export default meta

export const Default: Jogak = {
  name: 'Default',
  args: { children: 'New', variant: 'default' },
}

export const Secondary: Jogak = {
  name: 'Secondary',
  args: { children: 'Beta', variant: 'secondary' },
}

export const Outline: Jogak = {
  name: 'Outline',
  args: { children: 'Draft', variant: 'outline' },
}

export const Destructive: Jogak = {
  name: 'Destructive',
  args: { children: 'Error', variant: 'destructive' },
}
