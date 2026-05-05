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
