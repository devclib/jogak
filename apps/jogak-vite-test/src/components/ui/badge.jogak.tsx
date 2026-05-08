import type { JogakMeta, Jogak } from '@jogak/core'
import { Badge } from './badge'

const meta = {
  title: 'UI/Badge',
  component: Badge,
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'outline', 'destructive'],
    },
    children: { control: 'text' },
  },
} satisfies JogakMeta

export default meta

export const Default: Jogak = {
  name: 'Default',
  args: { children: 'New', variant: 'default' },
}
