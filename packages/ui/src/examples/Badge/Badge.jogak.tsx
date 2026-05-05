import type { JogakMeta, Jogak } from '@jogak/core'
import { Badge } from './Badge.js'

const meta = {
  title: 'Components/Badge',
  component: Badge,
  argTypes: {
    label: { control: 'text', description: 'Badge text content' },
    color: {
      control: 'select',
      options: ['blue', 'green', 'red', 'yellow', 'gray'],
      description: 'Color variant',
    },
  },
} satisfies JogakMeta

export default meta

export const Blue: Jogak = {
  name: 'Blue',
  args: { label: 'New', color: 'blue' },
}

export const Green: Jogak = {
  name: 'Green',
  args: { label: 'Active', color: 'green' },
}

export const Red: Jogak = {
  name: 'Red',
  args: { label: 'Error', color: 'red' },
}

export const Yellow: Jogak = {
  name: 'Yellow',
  args: { label: 'Warning', color: 'yellow' },
}

export const Gray: Jogak = {
  name: 'Gray',
  args: { label: 'Default', color: 'gray' },
}
