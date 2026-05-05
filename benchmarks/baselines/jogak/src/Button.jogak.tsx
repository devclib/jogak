import type { JogakMeta, Jogak } from '@jogak/core'
import { Button } from '../../shared/components/Button.js'

const meta = {
  title: 'Baseline/Button',
  component: Button,
  argTypes: {
    label: { description: '버튼 라벨 텍스트' },
    variant: { description: '시각적 톤' },
    size: { description: '사이즈' },
    disabled: { description: '비활성화 여부' },
  },
} satisfies JogakMeta

export default meta

export const Primary: Jogak = {
  name: 'Primary',
  args: { label: 'Primary', variant: 'primary', size: 'md' },
}

export const Secondary: Jogak = {
  name: 'Secondary',
  args: { label: 'Secondary', variant: 'secondary', size: 'md' },
}

export const Disabled: Jogak = {
  name: 'Disabled',
  args: { label: 'Disabled', variant: 'primary', size: 'md', disabled: true },
}
