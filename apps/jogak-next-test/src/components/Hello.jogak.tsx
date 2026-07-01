import type { JogakMeta, Jogak } from '@jogak/core'
import { Hello } from './Hello'

const meta = {
  title: 'Next/Hello',
  component: Hello,
  framework: 'next',
  argTypes: {
    name: { control: 'text' },
  },
} satisfies JogakMeta

export default meta

export const Default: Jogak = {
  name: 'Default',
  args: { name: 'jogak-next' },
}
