import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { BuilderAdapter, BuilderName } from '@jogak/core'

/**
 * 알파.10: 빌더 이름으로 어댑터 dynamic import.
 *
 * 어댑터는 모두 `@jogak/core/adapters/${name}` subpath로 통합됐다 (알파.9의 별도
 * `@jogak/${name}-adapter` 패키지는 deprecate). 사용자 cwd의 `@jogak/core` 패키지를
 * 찾아 `exports['./adapters/${name}'].import` 경로를 직접 import.
 *
 * `import.meta.resolve`의 parentURL 인자가 Node 22 이전에서 unstable이고, 또한 cli/dist
 * 기준으로 해석되어 사용자 cwd가 아닌 곳을 가리키므로 수동 lookup.
 */
export async function loadAdapter(
  name: Exclude<BuilderName, 'custom'>,
  cwd: string,
): Promise<BuilderAdapter> {
  const corePkgRoot = resolve(cwd, 'node_modules', '@jogak', 'core')
  const corePkgJsonPath = resolve(corePkgRoot, 'package.json')

  if (!existsSync(corePkgJsonPath)) {
    throw new Error(
      `[jogak] @jogak/core not found in '${cwd}'. install it first.`,
    )
  }

  let manifest: CorePackageManifest
  try {
    manifest = JSON.parse(readFileSync(corePkgJsonPath, 'utf-8')) as CorePackageManifest
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`[jogak] @jogak/core package.json read failed: ${message}`)
  }

  const subpath = `./adapters/${name}`
  const entryRel = resolveEsmEntry(manifest, subpath)
  if (entryRel === undefined) {
    throw new Error(
      `[jogak] @jogak/core has no ESM entry for '${subpath}'. ` +
        `expected exports['${subpath}'].import in @jogak/core@>=0.1.0-alpha.10.`,
    )
  }
  const entryAbs = resolve(corePkgRoot, entryRel)
  const entryUrl = pathToFileURL(entryAbs).toString()

  try {
    const mod = (await import(entryUrl)) as { default: BuilderAdapter }
    return mod.default
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(
      `[jogak] adapter '${subpath}' import failed.\n` + `original: ${message}`,
    )
  }
}

interface CorePackageManifest {
  readonly module?: string
  readonly main?: string
  readonly exports?: Readonly<
    Record<
      string,
      string | { readonly import?: string; readonly default?: string; readonly require?: string }
    >
  >
}

function resolveEsmEntry(
  manifest: CorePackageManifest,
  subpath: string,
): string | undefined {
  const exportsField = manifest.exports
  if (exportsField !== undefined) {
    const entry = exportsField[subpath]
    if (typeof entry === 'string') return entry
    if (entry !== undefined) {
      if (entry.import !== undefined) return entry.import
      if (entry.default !== undefined) return entry.default
    }
  }
  return undefined
}
