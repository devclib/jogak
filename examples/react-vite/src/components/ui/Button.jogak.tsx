import type { JogakMeta, Jogak } from '@jogak/core'
import { Button } from './Button'
// 1.2.0 post-1.1: Play 함수 example (Storybook addon-interactions 대응).
// @testing-library/user-event는 사용자 devDep으로 install — jogak 미번들.
import { userEvent, within } from '@testing-library/react'

const meta = {
  title: 'UI/Button',
  component: Button,
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'destructive', 'outline', 'ghost'],
      description: '시각적 변형',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: '크기',
    },
    disabled: { control: 'boolean', description: '비활성화 상태' },
    children: { control: 'text', description: '버튼 라벨' },
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

export const Outline: Jogak = {
  name: 'Outline',
  args: { children: 'More', variant: 'outline', size: 'md' },
}

export const Ghost: Jogak = {
  name: 'Ghost',
  args: { children: 'Skip', variant: 'ghost', size: 'md' },
}

export const Small: Jogak = {
  name: 'Small',
  args: { children: 'Small', variant: 'primary', size: 'sm' },
}

export const Large: Jogak = {
  name: 'Large',
  args: { children: 'Large', variant: 'primary', size: 'lg' },
}

export const Disabled: Jogak = {
  name: 'Disabled',
  args: { children: 'Locked', variant: 'primary', disabled: true },
}

// 1.2.0 post-1.1: Interactive variant — 툴바 ▶ Play 버튼 클릭 시 자동 실행.
export const Interactive: Jogak = {
  name: 'Interactive',
  args: { children: 'Click me', variant: 'primary', size: 'md' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const button = canvas.getByRole('button', { name: /click me/i })
    await userEvent.click(button)
  },
}
