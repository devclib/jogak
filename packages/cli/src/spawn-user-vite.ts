import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { JogakConfig, UserViteOptions } from '@jogak/core'

export interface SpawnedUserVite {
  readonly url: string
  readonly port: number
  close(): Promise<void>
}

/**
 * 알파.8: 사용자 vite 인스턴스를 child Vite로 spawn한다.
 *
 * 1. cwd의 `vite.config.{ts,mts,js,mjs,cjs}`를 자동 탐지 (또는 명시 경로 사용)
 * 2. Vite의 `loadConfigFromFile`로 사용자 vite.config.ts evaluate
 * 3. `mergeConfig`로 jogak() (previewFrame=true) + jogakPreviewFramePlugin을 자동 inject
 * 4. `createServer`로 별도 dev server 시작
 *
 * jogak SPA(`runHost`)는 본 인스턴스의 URL을 iframe src로 사용.
 * 사용자 측 plugins(@tailwindcss/vite, custom alias 등)이 정상 client에서 작동.
 *
 * @returns 미발견 / disabled / 평가 실패 시 undefined → fallback 모드 (jogak SPA만 실행)
 */
export async function spawnUserVite(args: {
  cwd: string
  userVite?: UserViteOptions
  globalCss?: JogakConfig['globalCss']
}): Promise<SpawnedUserVite | undefined> {
  if (args.userVite?.disabled === true) {
    process.stdout.write(
      '[jogak] userVite.disabled=true — fallback mode (사용자 utility 미컴파일)\n',
    )
    return undefined
  }

  const configFile = args.userVite?.configFile ?? detectUserViteConfig(args.cwd)
  if (configFile === undefined) {
    process.stdout.write(
      '[jogak] vite.config not found in cwd — fallback mode (사용자 utility 미컴파일)\n',
    )
    return undefined
  }

  let viteMod: typeof import('vite')
  try {
    viteMod = await import('vite')
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    process.stderr.write(`[jogak] vite import failed: ${message}\n`)
    return undefined
  }

  let coreVite: typeof import('@jogak/core/vite')
  try {
    coreVite = await import('@jogak/core/vite')
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    process.stderr.write(`[jogak] @jogak/core/vite import failed: ${message}\n`)
    return undefined
  }

  let loaded
  try {
    loaded = await viteMod.loadConfigFromFile(
      { command: 'serve', mode: 'development' },
      configFile,
      args.cwd,
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    process.stderr.write(
      `[jogak] user vite.config evaluate failed: ${message} — fallback mode\n`,
    )
    return undefined
  }

  const userConfig = loaded?.config ?? {}
  // 알파.8: 사용자 vite default port를 5174로 강제 — jogak SPA가 default 5173을
  // 차지하도록 (사용자 입장 일관성). 사용자가 명시한 경우 그 값 사용. strictPort=false라
  // 5174가 사용중이면 다음 free port로 자동 fallback.
  const port = args.userVite?.port ?? 5174
  const host = args.userVite?.host ?? 'localhost'

  const merged = viteMod.mergeConfig(userConfig, {
    plugins: [
      coreVite.jogak({
        cwd: args.cwd,
        previewFrame: true,
        ...(args.globalCss !== undefined ? { globalCss: args.globalCss } : {}),
      }),
      coreVite.jogakPreviewFramePlugin({
        userRoot: args.cwd,
        ...(args.globalCss !== undefined ? { globalCss: args.globalCss } : {}),
      }),
    ],
    server: {
      port,
      host,
      strictPort: false,
      cors: true,
    },
    appType: 'mpa',
    configFile: false,
  })

  let server
  try {
    server = await viteMod.createServer(merged)
    await server.listen()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    process.stderr.write(`[jogak] user vite createServer failed: ${message}\n`)
    return undefined
  }

  const resolvedPort = server.config.server.port ?? port
  const url = `http://localhost:${String(resolvedPort)}`

  return {
    url,
    port: resolvedPort,
    close: async () => {
      try {
        await server.close()
      } catch {
        // best-effort
      }
    },
  }
}

const VITE_CONFIG_EXTS = ['ts', 'mts', 'js', 'mjs', 'cjs'] as const

function detectUserViteConfig(cwd: string): string | undefined {
  for (const ext of VITE_CONFIG_EXTS) {
    const candidate = resolve(cwd, `vite.config.${ext}`)
    if (existsSync(candidate)) return candidate
  }
  return undefined
}
