import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  build: {
    lib: {
      entry: { index: resolve(__dirname, 'src/index.ts') },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) =>
        `${entryName}.${format === 'es' ? 'mjs' : 'cjs'}`,
    },
    rollupOptions: {
      external: [
        '@jogak/core',
        '@jogak/core/server',
        'webpack',
        'webpack-dev-server',
        'webpack-merge',
        'html-webpack-plugin',
        /^node:/u,
      ],
    },
    emptyOutDir: true,
  },
  plugins: [dts({ include: ['src/**/*.ts'], entryRoot: 'src' })],
})
