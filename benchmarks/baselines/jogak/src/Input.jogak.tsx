import type { JogakMeta, Jogak } from '@jogak/core'
import { Input } from '../../shared/components/Input.js'

const meta = {
  title: 'Baseline/Input',
  component: Input,
  argTypes: {
    label: { description: '라벨 텍스트' },
    type: { description: 'input type' },
    placeholder: { description: '플레이스홀더' },
    error: { description: '에러 메시지' },
    disabled: { description: '비활성화 여부' },
  },
} satisfies JogakMeta

export default meta

export const Default: Jogak = {
  name: 'Default',
  args: { label: 'Email', type: 'email', placeholder: 'you@example.com' },
}

export const WithError: Jogak = {
  name: 'WithError',
  args: { label: 'Password', type: 'password', error: '비밀번호가 너무 짧습니다.' },
}

export const Disabled: Jogak = {
  name: 'Disabled',
  args: { label: 'Disabled', type: 'text', placeholder: 'cannot edit', disabled: true },
}
