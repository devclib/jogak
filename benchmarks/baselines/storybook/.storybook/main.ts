import type { StorybookConfig } from '@storybook/react-vite'

// scale benchmark에서는 stories 글롭을 환경변수로 한정해 generated/ 만 포함시킨다.
// 비어있으면(default) 기존 5개 baseline + generated/ 모두 포함.
const storiesEnv = process.env.JOGAK_BENCH_SB_STORIES
const stories = storiesEnv !== undefined && storiesEnv !== ''
  ? storiesEnv.split(',').map((p) => p.trim()).filter((p) => p.length > 0)
  : ['../src/**/*.stories.@(ts|tsx)']

const config: StorybookConfig = {
  stories,
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  addons: [],
  core: {
    disableTelemetry: true,
  },
  typescript: {
    check: false,
  },
}

export default config
