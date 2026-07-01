import type { JogakMeta, Jogak } from '@jogak/core'
import { Hello } from './Hello.js'

const meta = {
  title: 'WC/Hello',
  component: Hello,
  framework: 'web-components',
  argTypes: {
    name: { control: 'text' },
  },
} satisfies JogakMeta

export default meta

export const Default: Jogak = {
  name: 'Default',
  args: { name: 'wc-demo' },
}
