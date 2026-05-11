import type { JogakMeta, Jogak } from '@jogak/core'
import Hello from './Hello.svelte'

const meta = {
  title: 'Svelte/Hello',
  component: Hello,
  framework: 'svelte',
  argTypes: {
    name: { control: 'text' },
  },
} satisfies JogakMeta

export default meta

export const Default: Jogak = {
  name: 'Default',
  args: { name: 'jogak-svelte' },
}
