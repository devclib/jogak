import type { JogakMeta, Jogak } from '@jogak/core'
import Hello from './Hello.vue'

const meta = {
  title: 'Vue/Hello',
  component: Hello,
  framework: 'vue',
  argTypes: {
    name: { control: 'text' },
  },
} satisfies JogakMeta

export default meta

export const Default: Jogak = {
  name: 'Default',
  args: { name: 'jogak-vue' },
}
