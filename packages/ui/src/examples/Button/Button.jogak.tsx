import type { JogakMeta, Jogak } from '@jogak/core'
import { Button } from './Button.js'

const meta = {
  title: 'Components/Button',
  component: Button,
  argTypes: {
    label: { description: 'Button label text' },
    variant: { description: 'Visual style variant' },
    disabled: { description: 'Disabled state' },
  },
} satisfies JogakMeta

export default meta

export const Primary: Jogak = {
  name: 'Primary',
  args: { label: 'Click me', variant: 'primary', disabled: false },
}

export const Secondary: Jogak = {
  name: 'Secondary',
  args: { label: 'Cancel', variant: 'secondary', disabled: false },
}

export const Danger: Jogak = {
  name: 'Danger',
  args: { label: 'Delete', variant: 'danger', disabled: false },
}

export const Disabled: Jogak = {
  name: 'Disabled',
  args: { label: 'Unavailable', variant: 'primary', disabled: true },
}
