import { defineJogakConfig } from '@jogak/core'

// Nuxt 4는 src/ 디렉토리 없이 root에 components/ 배치 → patterns 명시.
export default defineJogakConfig({
  framework: 'vue',
  patterns: ['components/**/*.jogak.ts', 'components/**/*.jogak.tsx'],
  globalCss: 'assets/globals.css',
})
