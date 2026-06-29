import type { Jogak, JogakMeta } from '@jogak/core'
import AddressFormShowcase from './AddressForm.showcase.svelte'

const meta = {
  title: 'Molecules/AddressForm',
  component: AddressFormShowcase,
  framework: 'svelte',
  argTypes: {
    filled: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
} satisfies JogakMeta

export default meta

export const Empty: Jogak = { name: 'Empty', args: { filled: false, disabled: false } }
export const Filled: Jogak = { name: 'Filled', args: { filled: true, disabled: false } }
export const Disabled: Jogak = { name: 'Disabled', args: { filled: true, disabled: true } }
