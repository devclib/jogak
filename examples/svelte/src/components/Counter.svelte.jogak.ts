import type { JogakMeta, Jogak } from '@jogak/core'
import Counter from './Counter.svelte'

const meta = {
  title: 'Svelte/Counter',
  component: Counter,
  framework: 'svelte',
  argTypes: {
    initial: { control: 'number' },
    step: { control: 'number' },
    label: { control: 'text' },
  },
} satisfies JogakMeta

export default meta

export const Default: Jogak = {
  name: 'Default',
  args: { initial: 0, step: 1, label: 'count' },
}

export const StartFromTen: Jogak = {
  name: 'StartFromTen',
  args: { initial: 10, step: 1, label: 'items' },
}

export const StepFive: Jogak = {
  name: 'StepFive',
  args: { initial: 0, step: 5, label: 'pages' },
}
