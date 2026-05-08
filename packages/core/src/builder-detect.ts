/**
 * 알파.9: 사용자 cwd의 시그널을 보고 빌더 종류 자동 감지.
 *
 * 우선순위 (top-down 매칭, 첫 매치에서 종료):
 * 1. `jogak.config.ts`의 `builder:` 명시 (CLI에서 처리, 본 함수 호출 전)
 * 2. `next.config.{ts,js,mjs,cjs}` 또는 package.json의 `next` dep → 'next'
 * 3. `react-scripts` dep (CRA) → 'webpack' (CRA mode warning)
 * 4. `webpack.config.{ts,js,mjs,cjs}` (next 미존재) → 'webpack'
 * 5. `vite.config.{ts,mts,js,mjs,cjs}` → 'vite'
 * 6. (없음) → 'standalone'
 *
 * 모호 환경 (next + vite 동시 존재 등) 검출 시 stdout warning 1회.
 */

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { BuilderName } from './adapter.js'

export interface DetectBuilderResult {
  readonly name: Exclude<BuilderName, 'custom'>
  /** 감지에 사용된 시그널 — 디버깅용. */
  readonly signal: string
  /** 모호 환경 검출 시 추가 매칭 시그널 (warning 출력용). */
  readonly ambiguous?: readonly string[]
}

const NEXT_CONFIG_EXTS = ['ts', 'js', 'mjs', 'cjs'] as const
const WEBPACK_CONFIG_EXTS = ['ts', 'js', 'mjs', 'cjs'] as const
const VITE_CONFIG_EXTS = ['ts', 'mts', 'js', 'mjs', 'cjs'] as const

export function detectBuilder(cwd: string): DetectBuilderResult {
  const pkg = readPackageJson(cwd)
  const allDeps: Readonly<Record<string, string>> = {
    ...(pkg?.dependencies ?? {}),
    ...(pkg?.devDependencies ?? {}),
  }

  const signals: string[] = []

  const hasNextConfig = existsAny(cwd, NEXT_CONFIG_EXTS, 'next.config')
  const hasNextDep = 'next' in allDeps
  const hasReactScripts = 'react-scripts' in allDeps
  const hasWebpackConfig = existsAny(cwd, WEBPACK_CONFIG_EXTS, 'webpack.config')
  const hasWebpackDep = 'webpack' in allDeps
  const hasViteConfig = existsAny(cwd, VITE_CONFIG_EXTS, 'vite.config')
  const hasViteDep = 'vite' in allDeps

  if (hasNextConfig) signals.push('next.config.*')
  if (hasNextDep) signals.push('package.json: next dep')
  if (hasReactScripts) signals.push('package.json: react-scripts dep')
  if (hasWebpackConfig) signals.push('webpack.config.*')
  if (hasWebpackDep && !hasNextDep) signals.push('package.json: webpack dep')
  if (hasViteConfig) signals.push('vite.config.*')
  if (hasViteDep) signals.push('package.json: vite dep')

  // 우선순위 2: Next.js
  if (hasNextConfig || hasNextDep) {
    const ambiguous: string[] = []
    if (hasViteConfig) ambiguous.push('vite.config.* (마이그레이션 중?)')
    return {
      name: 'next',
      signal: hasNextConfig ? 'next.config.*' : 'package.json: next dep',
      ...(ambiguous.length > 0 ? { ambiguous } : {}),
    }
  }

  // 우선순위 3: CRA (react-scripts)
  if (hasReactScripts) {
    return {
      name: 'webpack',
      signal: 'package.json: react-scripts dep (CRA)',
    }
  }

  // 우선순위 4: webpack
  if (hasWebpackConfig || hasWebpackDep) {
    return {
      name: 'webpack',
      signal: hasWebpackConfig ? 'webpack.config.*' : 'package.json: webpack dep',
    }
  }

  // 우선순위 5: vite
  if (hasViteConfig) {
    return { name: 'vite', signal: 'vite.config.*' }
  }

  // 우선순위 6: standalone fallback
  return { name: 'standalone', signal: '(no builder signals)' }
}

function existsAny(cwd: string, exts: readonly string[], base: string): boolean {
  for (const ext of exts) {
    if (existsSync(resolve(cwd, `${base}.${ext}`))) return true
  }
  return false
}

interface PackageJsonShape {
  readonly dependencies?: Readonly<Record<string, string>>
  readonly devDependencies?: Readonly<Record<string, string>>
}

function readPackageJson(cwd: string): PackageJsonShape | undefined {
  const pkgPath = resolve(cwd, 'package.json')
  if (!existsSync(pkgPath)) return undefined
  try {
    const raw = readFileSync(pkgPath, 'utf-8')
    return JSON.parse(raw) as PackageJsonShape
  } catch {
    return undefined
  }
}
