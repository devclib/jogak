import type { JogakMeta, Jogak } from '@jogak/core'
import Button from './Button.svelte'

const meta = {
  title: 'Svelte/Button',
  component: Button,
  framework: 'svelte',
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'destructive'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    label: { control: 'text' },
  },
} satisfies JogakMeta

export default meta

export const Primary: Jogak = {
  name: 'Primary',
  args: { label: 'Save', variant: 'primary', size: 'md' },
}

export const Secondary: Jogak = {
  name: 'Secondary',
  args: { label: 'Cancel', variant: 'secondary', size: 'md' },
}

export const Destructive: Jogak = {
  name: 'Destructive',
  args: { label: 'Delete', variant: 'destructive', size: 'md' },
}

export const Large: Jogak = {
  name: 'Large',
  args: { label: 'Continue', variant: 'primary', size: 'lg' },
}

export const Disabled: Jogak = {
  name: 'Disabled',
  args: { label: 'Locked', variant: 'primary', disabled: true },
}
