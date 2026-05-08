import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        'vite/index': resolve(__dirname, 'src/vite/plugin.ts'),
        'build/index': resolve(__dirname, 'src/build/index.ts'),
        // Props extractor child process entry — child_process.fork 대상.
        // 부모 프로세스(plugin/build)에 ts-morph가 같은 V8 isolate에 로드되지 않게
        // 별도 entry로 emit → dist/meta/extractor-child.mjs.
        'meta/extractor-child': resolve(__dirname, 'src/meta/extractor-child.ts'),
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) =>
        `${entryName}.${format === 'es' ? 'mjs' : 'js'}`,
    },
    rollupOptions: {
      external: ['vite', 'ts-morph', 'glob', /^node:/u],
    },
  },
  plugins: [
    dts({
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/__tests__/**'],
      entryRoot: 'src',
    }),
  ],
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
      thresholds: { lines: 80, functions: 80 },
    },
  },
})
