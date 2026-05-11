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
        // 알파.10: vite plugin은 vite-plugin/ 디렉토리. /vite는 backward-compat alias로 유지.
        'vite-plugin/index': resolve(__dirname, 'src/vite-plugin/index.ts'),
        'vite/index': resolve(__dirname, 'src/vite-plugin/index.ts'),
        'build/index': resolve(__dirname, 'src/build/index.ts'),
        // 알파.9: server-only utilities (Node.js — fs/path 의존)
        server: resolve(__dirname, 'src/server.ts'),
        // Props extractor child process entry — child_process.fork 대상.
        'meta/extractor-child': resolve(__dirname, 'src/meta/extractor-child.ts'),
        // 알파.10: 4개 builder adapter (Node 전용)
        'adapters/vite/index': resolve(__dirname, 'src/adapters/vite/index.ts'),
        'adapters/next/index': resolve(__dirname, 'src/adapters/next/index.ts'),
        'adapters/webpack/index': resolve(__dirname, 'src/adapters/webpack/index.ts'),
        'adapters/standalone/index': resolve(__dirname, 'src/adapters/standalone/index.ts'),
        // 알파.10: 3개 framework renderer (브라우저, react/next는 SSR/RSC 포함)
        'renderers/react/index': resolve(__dirname, 'src/renderers/react/index.ts'),
        'renderers/next/index': resolve(__dirname, 'src/renderers/next/index.ts'),
        // 알파.13: next renderer의 client/server subpath entries — RSC scaffold에서 import.
        'renderers/next/client/index': resolve(__dirname, 'src/renderers/next/client/index.ts'),
        'renderers/next/server/index': resolve(__dirname, 'src/renderers/next/server/index.ts'),
        'renderers/web-components/index': resolve(__dirname, 'src/renderers/web-components/index.ts'),
        // 알파.14: Vue / Svelte renderer (둘 다 optional peer)
        'renderers/vue/index': resolve(__dirname, 'src/renderers/vue/index.ts'),
        'renderers/svelte/index': resolve(__dirname, 'src/renderers/svelte/index.ts'),
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) =>
        `${entryName}.${format === 'es' ? 'mjs' : 'cjs'}`,
    },
    rollupOptions: {
      external: [
        'vite',
        'ts-morph',
        'glob',
        'preact',
        // 알파.10: 어댑터/렌더러 peer deps — 사용자가 쓰는 것만 install. 모두 optional.
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'next',
        'next/navigation',
        'next/router',
        'next/link',
        'next/head',
        // 알파.14: vue / svelte optional peer
        'vue',
        'svelte',
        'webpack',
        'webpack-dev-server',
        'webpack-merge',
        'html-webpack-plugin',
        /^node:/u,
      ],
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
    // 알파.10: renderers/* 테스트는 React/Preact 컴포넌트를 마운트하므로 happy-dom 필요.
    environmentMatchGlobs: [
      ['src/renderers/**', 'happy-dom'],
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
      thresholds: { lines: 80, functions: 80 },
    },
  },
})
