/**
 * `jogak.config.{ts,mts,mjs,js,json}` loader.
 *
 * spec: `_workspace/01_arch/api-contracts.md` §4 — Vite의 `loadConfigFromFile`
 * (esbuild 기반 transpile + dynamic import)을 그대로 활용해 zero-dep로 ts/mjs/js/
 * json 모두 처리한다.
 *
 * 발견 우선순위 (cwd 기준):
 *   1. `explicitPath` (CLI `--config <path>`) — 절대 또는 cwd 상대
 *   2. cwd/jogak.config.ts
 *   3. cwd/jogak.config.mts
 *   4. cwd/jogak.config.mjs
 *   5. cwd/jogak.config.js
 *   6. cwd/jogak.config.json
 *
 * 미발견 시 `{ path: undefined, config: {} }`를 반환 — CLI 플래그만으로 동작.
 */

import { existsSync, readFileSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import type { JogakConfig } from '@jogak/core'

const CANDIDATE_FILES: readonly string[] = [
  'jogak.config.ts',
  'jogak.config.mts',
  'jogak.config.mjs',
  'jogak.config.js',
  'jogak.config.json',
]

export interface LoadedJogakConfig {
  /** 로드된 config 절대 경로. 미발견 시 undefined. */
  readonly path: string | undefined
  /** 사용자 config 객체. 미발견 시 빈 객체 `{}`. */
  readonly config: JogakConfig
}

/**
 * `jogak.config.{ts,mts,mjs,js,json}`을 자동 발견 + 로드.
 *
 * Vite의 `loadConfigFromFile`을 사용해 esbuild 기반 transpile + dynamic import로
 * ts/mjs를 native 처리. user `defineJogakConfig({ ... })`의 default export를 반환.
 *
 * Loader 실패 시(예: 사용자 config 파일에 syntax error) 예외를 throw — main에서
 * exit code 1로 전파.
 */
export async function loadJogakConfig(
  cwd: string,
  explicitPath: string | undefined,
): Promise<LoadedJogakConfig> {
  // 1. 명시 path 우선
  let resolvedPath: string | undefined
  if (explicitPath !== undefined) {
    resolvedPath = resolve(cwd, explicitPath)
    if (!existsSync(resolvedPath)) {
      throw new Error(`[jogak] --config path not found: ${resolvedPath}`)
    }
  } else {
    // 2. 자동 발견 — 첫 hit만 사용
    for (const candidate of CANDIDATE_FILES) {
      const abs = resolve(cwd, candidate)
      if (existsSync(abs)) {
        resolvedPath = abs
        break
      }
    }
  }

  // 3. 미발견 → 빈 config (CLI 플래그만으로 동작)
  if (resolvedPath === undefined) {
    return { path: undefined, config: {} }
  }

  // 3a. JSON은 vite의 loadConfigFromFile이 처리하지 않으므로 직접 파싱.
  if (extname(resolvedPath) === '.json') {
    const raw = readFileSync(resolvedPath, 'utf8')
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch (err: unknown) {
      const m = err instanceof Error ? err.message : String(err)
      throw new Error(`[jogak] failed to parse JSON config ${resolvedPath}: ${m}`)
    }
    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error(
        `[jogak] config file ${resolvedPath} default export is not an object`,
      )
    }
    return { path: resolvedPath, config: parsed as JogakConfig }
  }

  // 3b. ts/mts/mjs/js — Vite의 loadConfigFromFile (esbuild + dynamic import).
  // ConfigEnv는 jogak 명령에 따라 다르게 줘도 되지만, 본 함수는 vite UserConfig가
  // 아닌 JogakConfig 형태로 export하므로 ConfigEnv를 사용자가 분기에 사용할 가능성
  // 거의 없음 — vite signature 충족용으로 'build' 고정.
  const vite = await import('vite')
  let result: Awaited<ReturnType<typeof vite.loadConfigFromFile>>
  try {
    result = await vite.loadConfigFromFile(
      { command: 'build', mode: 'production' },
      resolvedPath,
      cwd,
    )
  } catch (err: unknown) {
    // vite는 non-object default export 등을 자체 메시지로 throw — 메시지를 jogak
    // prefix로 감싸 상위에서 일관 처리하게 한다.
    const m = err instanceof Error ? err.message : String(err)
    throw new Error(
      `[jogak] failed to load config ${resolvedPath}: ${m}`,
    )
  }

  if (result === null) {
    // existsSync로 위에서 검증했는데 vite가 null을 반환 — vite 측 로직 변경 시
    // safe fallback. 빈 config 반환.
    return { path: resolvedPath, config: {} }
  }

  // vite는 result.config를 UserConfig로 cast하지만, 실제로는 사용자 default
  // export 객체가 그대로 전달됨. JogakConfig로 cast.
  const rawConfig = result.config as unknown

  if (typeof rawConfig !== 'object' || rawConfig === null) {
    throw new Error(
      `[jogak] config file ${resolvedPath} default export is not an object`,
    )
  }

  return { path: resolvedPath, config: rawConfig as JogakConfig }
}
