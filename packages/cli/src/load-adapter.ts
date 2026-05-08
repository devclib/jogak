import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { BuilderAdapter, BuilderName } from '@jogak/core'

/**
 * 알파.9: 빌더 이름으로 어댑터 dynamic import.
 *
 * `@jogak/${name}-adapter` 패키지를 사용자 cwd의 node_modules에서 찾아 dynamic import.
 * core가 어떤 adapter도 hard dep로 가지지 않게 하는 패턴. 사용자는 본인 빌더에 맞는
 * adapter만 install.
 *
 * resolution 전략 (수동):
 * 1. `<cwd>/node_modules/@jogak/${name}-adapter/package.json` 읽음
 * 2. `exports['.'].import` 또는 `exports['.'].default`로 ESM entry 찾음
 * 3. 그 path를 file URL로 변환해 dynamic import
 *
 * import.meta.resolve의 parentURL 인자가 Node 22 이전에서 unstable이라 수동 lookup.
 */
export async function loadAdapter(
  name: Exclude<BuilderName, 'custom'>,
  cwd: string,
): Promise<BuilderAdapter> {
  const pkg = `@jogak/${name}-adapter`
  const pkgRoot = resolve(cwd, 'node_modules', pkg)
  const pkgJsonPath = resolve(pkgRoot, 'package.json')

  if (!existsSync(pkgJsonPath)) {
    throw new Error(
      `[jogak] adapter '${pkg}' not found in '${cwd}'.\n` +
        `install it: pnpm add -D ${pkg}`,
    )
  }

  let manifest: AdapterPackageManifest
  try {
    manifest = JSON.parse(readFileSync(pkgJsonPath, 'utf-8')) as AdapterPackageManifest
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(
      `[jogak] adapter '${pkg}' package.json read failed.\n` + `original: ${message}`,
    )
  }

  const entryRel = resolveEsmEntry(manifest)
  if (entryRel === undefined) {
    throw new Error(
      `[jogak] adapter '${pkg}' has no ESM entry (exports['.'].import or module field).`,
    )
  }
  const entryAbs = resolve(pkgRoot, entryRel)
  const entryUrl = pathToFileURL(entryAbs).toString()

  try {
    const mod = (await import(entryUrl)) as { default: BuilderAdapter }
    return mod.default
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(
      `[jogak] adapter '${pkg}' import failed.\n` + `original: ${message}`,
    )
  }
}

interface AdapterPackageManifest {
  readonly module?: string
  readonly main?: string
  readonly exports?: Readonly<
    Record<
      string,
      string | { readonly import?: string; readonly default?: string; readonly require?: string }
    >
  >
}

function resolveEsmEntry(manifest: AdapterPackageManifest): string | undefined {
  const exportsField = manifest.exports
  if (exportsField !== undefined) {
    const dot = exportsField['.']
    if (typeof dot === 'string') return dot
    if (dot !== undefined) {
      if (dot.import !== undefined) return dot.import
      if (dot.default !== undefined) return dot.default
    }
  }
  if (manifest.module !== undefined) return manifest.module
  if (manifest.main !== undefined) return manifest.main
  return undefined
}
