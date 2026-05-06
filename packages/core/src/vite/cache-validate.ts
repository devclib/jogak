/**
 * Vite optimizeDeps cache 자동 검증 (F1).
 *
 * dev 부팅 시 jogak이 의존하는 워크스페이스 패키지의 dist mtime을
 * `node_modules/.vite/deps/_metadata.json`의 mtime과 비교한다.
 * dist가 더 새것이면 cache 디렉토리를 통째로 삭제하여 다음 prebundle을 강제한다.
 *
 * - 호출 시점: vite plugin의 `configResolved` (dev 모드만).
 * - 비동기 best-effort: 모든 fs 에러는 throw 없이 warn 로그 후 통과.
 *   cache validation 실패가 dev 부팅을 막아서는 안 된다.
 */
import { existsSync } from 'node:fs'
import { readdir, rm, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'

export interface CacheValidateOptions {
  readonly root: string
  readonly logger: {
    info(msg: string): void
    warn(msg: string): void
  }
  /**
   * 검사 대상 패키지 (override). 기본: jogak workspace 패키지 4종.
   * 테스트에서 대체 경로를 주입하기 위해 노출.
   */
  readonly packages?: readonly string[]
}

export interface CacheValidateResult {
  readonly purged: boolean
  readonly reason?: string
}

const DEFAULT_PACKAGES = [
  '@jogak/core',
  '@jogak/react',
  '@jogak/web-components',
  '@jogak/next',
] as const

/**
 * dist 디렉토리 내부 모든 파일의 가장 최근 mtime(ms) 반환.
 * 빈 디렉토리거나 stat 실패 시 0.
 */
async function mtimeOfNewestFile(dir: string): Promise<number> {
  try {
    const dirStat = await stat(dir)
    if (!dirStat.isDirectory()) {
      return dirStat.mtimeMs
    }
  } catch {
    return 0
  }

  let newest = 0
  let entries: string[]
  try {
    entries = await readdir(dir)
  } catch {
    return 0
  }

  for (const name of entries) {
    const full = join(dir, name)
    try {
      const st = await stat(full)
      if (st.isDirectory()) {
        const sub = await mtimeOfNewestFile(full)
        if (sub > newest) newest = sub
      } else if (st.mtimeMs > newest) {
        newest = st.mtimeMs
      }
    } catch {
      // 개별 파일 stat 실패는 무시.
      continue
    }
  }
  return newest
}

export async function validateAndPurgeViteCache(
  opts: CacheValidateOptions,
): Promise<CacheValidateResult> {
  const cacheDir = resolve(opts.root, 'node_modules/.vite/deps')
  if (!existsSync(cacheDir)) {
    // cold 부팅 — Vite가 알아서 prebundle.
    return { purged: false }
  }

  const metadataPath = join(cacheDir, '_metadata.json')
  if (!existsSync(metadataPath)) {
    // 부분 cache — Vite가 자체 재생성. 건드리지 않는다.
    return { purged: false }
  }

  let metadataMtime: number
  try {
    metadataMtime = (await stat(metadataPath)).mtimeMs
  } catch (e) {
    opts.logger.warn(
      `[jogak] cache validation: failed to stat _metadata.json (${(e as Error).message})`,
    )
    return { purged: false }
  }

  const packages = opts.packages ?? DEFAULT_PACKAGES
  for (const pkg of packages) {
    const pkgDist = resolve(opts.root, 'node_modules', pkg, 'dist')
    if (!existsSync(pkgDist)) continue

    let newest: number
    try {
      newest = await mtimeOfNewestFile(pkgDist)
    } catch (e) {
      opts.logger.warn(
        `[jogak] cache validation: failed to walk ${pkg}/dist (${(e as Error).message})`,
      )
      continue
    }

    // 1초 슬랙 — clock skew / 동시 빌드 race 방지.
    if (newest > metadataMtime + 1000) {
      try {
        await rm(cacheDir, { recursive: true, force: true })
        opts.logger.info(
          `[jogak] vite deps cache invalidated (stale): ${pkg} dist newer than cache`,
        )
        return { purged: true, reason: pkg }
      } catch (e) {
        opts.logger.warn(
          `[jogak] cache validation: failed to purge ${cacheDir} (${(e as Error).message})`,
        )
        return { purged: false }
      }
    }
  }

  return { purged: false }
}
