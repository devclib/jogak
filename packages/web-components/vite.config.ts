import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import dts from 'vite-plugin-dts'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es', 'cjs', 'iife'],
      name: 'JogakWC',
      fileName: (format) => {
        if (format === 'iife') return 'iife.js'
        return `index.${format === 'es' ? 'mjs' : 'js'}`
      },
    },
    rollupOptions: {
      // es/cjs 포맷: preact와 core를 external로 분리 (소비자 번들러가 처리)
      // iife 포맷: preact를 globals로 선언 (CDN에서 preact를 별도 로드하는 시나리오)
      external: ['preact', 'preact/hooks', '@jogak/core'],
      output: {
        globals: {
          preact: 'preact',
          'preact/hooks': 'preactHooks',
          '@jogak/core': 'JogakCore',
        },
      },
    },
  },
  plugins: [
    preact(),
    dts({ include: ['src/**/*.ts', 'src/**/*.tsx'], entryRoot: 'src' }),
  ],
  test: {
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
    },
  },
})
