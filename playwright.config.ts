import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  /**
   * VR 임계치 — 알파.5 마이그레이션 기준.
   * threshold 0.2(default) + maxDiffPixelRatio 0.001(0.1%) = 거의 동등 + 안티 어설리잉 노이즈만 허용.
   * Docker(jammy) 환경에서 stable. 로컬 macOS에서는 통과 보장 안 됨 (Docker로 실행 권장).
   */
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
      maxDiffPixelRatio: 0.001,
      // threshold는 default(0.2) 사용 — YIQ 색차 기준. anti-aliasing 노이즈 허용.
    },
  },
  projects: [
    {
      name: 'functional',
      testMatch: /^(?!.*visual\/).*\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'visual',
      testMatch: /visual\/.*\.spec\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
      },
    },
  ],
  webServer: {
    command: 'pnpm --filter @jogak/ui exec vite --port 5173',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
})
