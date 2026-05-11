import type { JogakMeta, Jogak } from '@jogak/core'
import { Button } from './Button'

const meta = {
  title: 'UI/Button',
  component: Button,
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'destructive', 'outline'],
    },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    children: { control: 'text' },
  },
} satisfies JogakMeta

export default meta

export const Primary: Jogak = {
  name: 'Primary',
  args: { children: 'Save', variant: 'primary', size: 'md' },
}

export const Secondary: Jogak = {
  name: 'Secondary',
  args: { children: 'Cancel', variant: 'secondary', size: 'md' },
}

export const Destructive: Jogak = {
  name: 'Destructive',
  args: { children: 'Delete', variant: 'destructive', size: 'md' },
}

export const Large: Jogak = {
  name: 'Large',
  args: { children: 'Continue', variant: 'primary', size: 'lg' },
}

export const Disabled: Jogak = {
  name: 'Disabled',
  args: { children: 'Locked', variant: 'primary', disabled: true },
}
