import { resolve } from 'node:path'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import type { Plugin, ViteDevServer } from 'vite'
import type {
  ArgType,
  JogakPluginOptions,
  RegistryEntryMeta,
} from '../types.js'
import {
  createPropsExtractor,
  type ExtractedMetaPayload,
  type PropsExtractor,
} from '../meta/extract-props.js'
import {
  RESOLVED_VIRTUAL_ENTRY_PREFIX,
  RESOLVED_VIRTUAL_INDEX_ID,
  VIRTUAL_ENTRY_PREFIX,
  VIRTUAL_INDEX_ID,
  idToSlug,
  slugToId,
} from './virtual-ids.js'

interface FileEntry {
  readonly id: string
  readonly filePath: string
  readonly meta: RegistryEntryMeta
}

export function jogak(options: JogakPluginOptions = {}): Plugin {
  const {
    patterns = ['src/**/*.jogak.ts', 'src/**/*.jogak.tsx'],
    codeTheme = 'vsDark',
  } = options
  const optionCwd = options.cwd
  const optionTsConfigFilePath = options.tsConfigFilePath

  let devServer: ViteDevServer | undefined
  let extractor: PropsExtractor | undefined
  let resolvedCwd: string | undefined

  // id → filePath, filePath → id. 인덱스 load 시 채워지고 entry load 시 조회된다.
  const idToFile = new Map<string, string>()
  const fileToId = new Map<string, string>()

  /**
   * glob → 각 파일의 source/autoArgTypes/meta 추출 → RegistryEntryMeta[] 합성.
   *
   * 호출자: 인덱스 load (정상 경로), entry load (deep-link fallback).
   * 부수 효과: idToFile / fileToId 갱신.
   */
  async function collectMetas(): Promise<readonly FileEntry[]> {
    const { glob } = await import('glob')
    const cwd = resolvedCwd ?? process.cwd()
    const files = await glob(patterns as string[], { cwd, absolute: true })

    const result: FileEntry[] = []
    // file path 중복 register 방지를 위해 사전 정리.
    idToFile.clear()
    fileToId.clear()

    for (const file of files) {
      let source = ''
      try {
        source = await readFile(file, 'utf8')
      } catch {
        // file이 사라진 경우 skip.
        continue
      }

      let autoArgTypes: Record<string, ArgType> = {}
      let metaPayload: ExtractedMetaPayload | null = null
      if (extractor !== undefined) {
        try {
          autoArgTypes = await extractor.extract(file)
        } catch {
          autoArgTypes = {}
        }
        try {
          metaPayload = await extractor.extractMeta(file)
        } catch {
          metaPayload = null
        }
      }

      // meta가 없으면(= default export object literal을 못 찾음) 인덱스에 안 넣는다.
      if (metaPayload === null) continue

      const id = metaPayload.title
      // file 경로 중복 방지 (동일 title 두 파일 → 마지막 파일이 이김 — 기존 register 의미 유지)
      idToFile.set(id, file)
      fileToId.set(file, id)

      const meta: RegistryEntryMeta = {
        id,
        title: metaPayload.title,
        jogakNames: metaPayload.jogakNames,
        autoArgTypes,
        userArgTypes: metaPayload.userArgTypes,
        source,
        filePath: file,
        metaExtras: metaPayload.metaExtras,
      }
      result.push({ id, filePath: file, meta })
    }
    return result
  }

  return {
    name: 'vite-plugin-jogak',

    configResolved(config) {
      // glob의 cwd: 옵션 우선, 미지정 시 Vite config.root (기존 동작 유지).
      resolvedCwd = optionCwd ?? config.root

      // ts-morph tsconfig: 옵션 우선, 미지정 시 resolvedCwd/tsconfig.json 자동 감지.
      const tsConfigCandidate =
        optionTsConfigFilePath ?? resolve(resolvedCwd, 'tsconfig.json')
      // extractor는 child_process로 격리되어 idle RSS를 OS에 반환한다.
      // 자식은 첫 extract() 호출 시 lazy spawn — 여기서는 metadata만 보유.
      extractor = existsSync(tsConfigCandidate)
        ? createPropsExtractor({ tsConfigFilePath: tsConfigCandidate })
        : createPropsExtractor()
    },

    configureServer(server) {
      devServer = server
    },

    buildEnd() {
      // dev server 종료 또는 build 종료 시 자식 프로세스를 명시적으로 정리.
      // (process exit 시 IPC disconnect가 자식을 죽이지만 명시 호출이 안전.)
      extractor?.releaseCache()
    },

    resolveId(id) {
      if (id === VIRTUAL_INDEX_ID) {
        return RESOLVED_VIRTUAL_INDEX_ID
      }
      if (id.startsWith(VIRTUAL_ENTRY_PREFIX)) {
        return '\0' + id
      }
      return undefined
    },

    async load(id) {
      // ── 인덱스 모듈 ─────────────────────────────────────────────
      if (id === RESOLVED_VIRTUAL_INDEX_ID) {
        const fileEntries = await collectMetas()
        const metas = fileEntries.map((fe) => fe.meta)

        // user 모듈 import 0개 — module graph는 인덱스 + 코어만.
        // entry loader는 dynamic import로 entry 가상모듈만 로드한다.
        //
        // 브라우저 ESM에서 'virtual:...' specifier는 base URL과 결합되어
        // `http://host/virtual:jogak/entry/<slug>`로 fetch되는데, Vite가
        // 이 URL을 매칭 못 해 SPA fallback(index.html)이 돌아오고 모듈 평가가
        // 실패한다. 절대 경로 `/@id/__x00__virtual:jogak/entry/<slug>`로 emit하면
        // Vite의 가상모듈 resolver가 정확히 매칭한다 (__x00__는 null byte의
        // URL-safe 표현 — `\0` resolved id의 prefix와 동일).
        return `import { defaultRegistry } from '@jogak/core'

const _entryLoader = (slug) =>
  import(/* @vite-ignore */ '/@id/__x00__virtual:jogak/entry/' + slug)
defaultRegistry.setEntryLoader((id) => {
  const slug = ${idToSlugCode()}
  return _entryLoader(slug(id))
})

const _metas = ${JSON.stringify(metas)}

for (const m of _metas) defaultRegistry.registerMeta(m)

export const _jogakCodeTheme = ${JSON.stringify(codeTheme)}
export const _jogakMetas = _metas
`
      }

      // ── Entry 모듈 ────────────────────────────────────────────
      if (id.startsWith(RESOLVED_VIRTUAL_ENTRY_PREFIX)) {
        const slug = id.slice(RESOLVED_VIRTUAL_ENTRY_PREFIX.length)
        const entryId = slugToId(slug)

        let filePath = idToFile.get(entryId)
        if (filePath === undefined) {
          // deep-link fallback: 인덱스가 평가 전에 entry 모듈만 요청된 경우 1회 glob 재실행.
          await collectMetas()
          filePath = idToFile.get(entryId)
        }
        if (filePath === undefined) {
          // 미등록 id로 entry 요청 — 빈 모듈을 반환하고 hydrateEntry는 호출하지 않는다.
          // requestEntry에서 'loaded but did not hydrate' 에러로 catch된다.
          return `// [jogak] unknown entry id: ${JSON.stringify(entryId)}\nexport {}\n`
        }

        return `import * as _user from ${JSON.stringify(filePath)}
import { defaultRegistry } from '@jogak/core'

const _meta = _user.default
const _named = { ..._user }
delete _named.default
const _jogaks = Object.values(_named).filter(
  (v) => v !== null && typeof v === 'object' && typeof v.name === 'string'
)
defaultRegistry.hydrateEntry(${JSON.stringify(entryId)}, _jogaks, _meta?.component)

export {}
`
      }

      return undefined
    },

    handleHotUpdate({ file }) {
      const isJogakFile = /\.jogak\.(tsx?|jsx?)$/.test(file)
      const isComponentFile = /\.(tsx?|jsx?)$/.test(file) && !isJogakFile

      if (!isJogakFile && !isComponentFile) return

      if (devServer === undefined) return

      if (isJogakFile) {
        // 인덱스 모듈 invalidate (source / autoArgTypes / meta 갱신 필요)
        const indexMod = devServer.moduleGraph.getModuleById(RESOLVED_VIRTUAL_INDEX_ID)
        if (indexMod !== undefined) {
          devServer.moduleGraph.invalidateModule(indexMod)
        }

        // 해당 entry 가상모듈 invalidate.
        const entryId = fileToId.get(file)
        if (entryId !== undefined) {
          const entryModId =
            RESOLVED_VIRTUAL_ENTRY_PREFIX + idToSlug(entryId)
          const entryMod = devServer.moduleGraph.getModuleById(entryModId)
          if (entryMod !== undefined) {
            devServer.moduleGraph.invalidateModule(entryMod)
          }
        }

        // Phase 1 보수적 동작: jogak 파일 변경 시 full-reload.
        // hydrated entry의 정확한 hot-swap은 Phase 2.
        devServer.ws.send({ type: 'full-reload' })
        return
      }

      // 일반 컴포넌트 파일: React Fast Refresh 경로 그대로.
      // 인덱스/entry 가상모듈은 source 텍스트만 영향받는데, jogak 파일이 아니면 메타가
      // 변하지 않으므로 invalidate 불필요.
      return
    },
  }
}

/**
 * 인덱스 모듈에 emit되는 idToSlug 인라인 정의.
 *
 * 이유: emit된 코드가 `@jogak/core`에서 idToSlug를 import하면 core public API에
 * 노출이 강제된다 — 가상모듈 path 형식은 plugin 내부 결정 사항이므로 인라인 유지.
 */
function idToSlugCode(): string {
  return `(rawId) => {
    if (typeof Buffer !== 'undefined') return Buffer.from(rawId, 'utf8').toString('base64url')
    // 브라우저 폴백: btoa는 binary string 기준이라 UTF-8을 한번 인코딩해야 한다.
    const enc = new TextEncoder().encode(rawId)
    let bin = ''
    for (let i = 0; i < enc.length; i++) bin += String.fromCharCode(enc[i])
    return btoa(bin).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '')
  }`
}
