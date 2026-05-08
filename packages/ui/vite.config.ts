import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import dts from 'vite-plugin-dts'
import { jogak } from '@jogak/core/vite'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// 단일 config — `vite` dev/serve는 plugins + server만 사용,
// `vite build`는 build.lib + rollupOptions만 사용한다 (서로 분리 동작).
//
// build:
//   - 라이브러리 ESM/CJS 산출물(dist/index.{mjs,js}, dist/host/index.{mjs,js}) + .d.ts.
//   - SPA 산출물(dist/index.html + assets)이 아니라 lib 모드 — publish 대상.
//   - Jogak CLI가 호스팅하는 dev/build SPA는 packages/ui 디렉토리를 vite root로
//     사용해 별도 createServer/build를 호출한다. 본 vite.config는 그 호출에서
//     `configFile: false`로 무시되므로 build.lib이 충돌하지 않는다.
//
// dev:
//   - `pnpm --filter @jogak/ui dev`로 ui 자체 SPA 데모를 띄울 때 server.port 사용.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    jogak({ patterns: ['src/**/*.jogak.ts', 'src/**/*.jogak.tsx'], codeTheme: 'vsDark' }),
    dts({
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/**/*.test.*',
        'src/**/*.spec.*',
        'src/test/**',
        'src/app/main.tsx',
        'src/app/preview-frame.tsx',
        'src/examples/**',
        'src/styles/**',
        'src/vite-env.d.ts',
      ],
      entryRoot: 'src',
    }),
  ],
  server: {
    port: 5173,
    open: true,
  },
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        'host/index': resolve(__dirname, 'src/host/index.ts'),
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) =>
        `${entryName}.${format === 'es' ? 'mjs' : 'cjs'}`,
    },
    rollupOptions: {
      // 사용자 호스트의 react / react-dom / vite 등은 external — 중복 번들 방지.
      external: [
        'react',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'react-dom',
        'react-dom/client',
        '@jogak/core',
        '@jogak/core/vite',
        '@jogak/core/build',
        '@jogak/react',
        'prism-react-renderer',
        'vite',
        '@vitejs/plugin-react',
        '@tailwindcss/vite',
        'tailwindcss',
        /^node:/u,
      ],
    },
    emptyOutDir: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
    },
  },
})
