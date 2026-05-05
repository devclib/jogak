import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { jogak } from '@jogak/core/vite'

export default defineConfig({
  plugins: [
    react(),
    jogak({ patterns: ['src/**/*.jogak.ts', 'src/**/*.jogak.tsx'], codeTheme: 'vsDark' }),
  ],
  server: {
    port: 5173,
    open: true,
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
