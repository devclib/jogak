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
import { validateAndPurgeViteCache } from './cache-validate.js'
import { resolveGlobalCssPaths } from './detect-global-css.js'
import { readTsConfigAlias } from './resolve-paths.js'
import {
  RESOLVED_VIRTUAL_ENTRY_PREFIX,
  RESOLVED_VIRTUAL_GLOBAL_CSS_ID,
  RESOLVED_VIRTUAL_INDEX_ID,
  VIRTUAL_ENTRY_PREFIX,
  VIRTUAL_GLOBAL_CSS_ID,
  VIRTUAL_INDEX_ID,
  idToSlug,
  slugToId,
} from './virtual-ids.js'

interface FileEntry {
  readonly id: string
  readonly filePath: string
  readonly meta: RegistryEntryMeta
}

/**
 * F4: 직전 추출 시그니처 — 파일 변경 시 meta-only vs 구조변경 분기 판단용.
 */
interface MetaSig {
  readonly title: string
  readonly jogakNamesKey: string
}

function sigOf(meta: {
  readonly title: string
  readonly jogakNames: readonly string[]
}): MetaSig {
  return {
    title: meta.title,
    jogakNamesKey: [...meta.jogakNames].sort().join('|'),
  }
}

function sigEq(a: MetaSig | undefined, b: MetaSig): boolean {
  return (
    a !== undefined &&
    a.title === b.title &&
    a.jogakNamesKey === b.jogakNamesKey
  )
}

export function jogak(options: JogakPluginOptions = {}): Plugin {
  const {
    patterns = ['src/**/*.jogak.ts', 'src/**/*.jogak.tsx'],
    codeTheme = 'vsDark',
  } = options
  const optionCwd = options.cwd
  const optionTsConfigFilePath = options.tsConfigFilePath
  const disableCacheValidation = options.disableCacheValidation === true
  const userResolveAlias = options.resolveAlias
  // 알파.6: globalCss opt-in. default false → 빈 모듈 emit (사용자 환경 영향 zero).
  const globalCssOption = options.globalCss

  let devServer: ViteDevServer | undefined
  let extractor: PropsExtractor | undefined
  let resolvedCwd: string | undefined

  // id → filePath, filePath → id. 인덱스 load 시 채워지고 entry load 시 조회된다.
  const idToFile = new Map<string, string>()
  const fileToId = new Map<string, string>()

  // F4: filePath → 직전 추출 시그니처. handleHotUpdate에서 비교.
  const lastSig = new Map<string, MetaSig>()

  /**
   * glob → 각 파일의 source/autoArgTypes/meta 추출 → RegistryEntryMeta[] 합성.
   *
   * 호출자: 인덱스 load (정상 경로), entry load (deep-link fallback).
   * 부수 효과: idToFile / fileToId / lastSig 갱신.
   */
  async function collectMetas(): Promise<readonly FileEntry[]> {
    const { glob } = await import('glob')
    const cwd = resolvedCwd ?? process.cwd()
    // build 의 generate.ts 와 대칭. registry 가 결정성을 보장하므로 본 sort 는
    // defensive layer (인덱스 가상모듈 emit 순서까지 결정적으로 만들어 디버깅 용이).
    const files = (
      await glob(patterns as string[], { cwd, absolute: true })
    ).sort()

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
      // F4: lastSig 채움 (HMR 시 비교 기준)
      lastSig.set(file, sigOf(meta))
      result.push({ id, filePath: file, meta })
    }
    return result
  }

  return {
    name: 'vite-plugin-jogak',

    /**
     * 사용자 path alias 주입.
     *
     * `runHost`는 vite root를 `@jogak/ui` 패키지로 두고 사용자 `vite.config.ts`를
     * 무시하므로(`configFile: false`), 사용자가 컴포넌트 안에서 쓰는 `@/lib/utils`
     * 같은 alias가 그냥은 적용되지 않는다. 본 hook이 사용자 tsconfig의
     * `compilerOptions.paths`를 vite `resolve.alias`로 자동 변환해 주입한다.
     *
     * 우선순위: `options.resolveAlias` (명시) > tsconfig 자동 추출.
     */
    config() {
      const root = optionCwd ?? process.cwd()
      const tsConfigCandidate =
        optionTsConfigFilePath ?? resolve(root, 'tsconfig.json')

      // 자동 추출 (단순 prefix 매핑만 처리)
      const autoAlias = readTsConfigAlias(tsConfigCandidate, root)

      // 명시 옵션 — 자동 추출보다 우선. 상대 경로면 root 기준 절대화.
      const resolvedUserAlias: Record<string, string> = {}
      if (userResolveAlias !== undefined) {
        for (const [key, value] of Object.entries(userResolveAlias)) {
          resolvedUserAlias[key] = resolve(root, value)
        }
      }

      const merged = { ...autoAlias, ...resolvedUserAlias }
      if (Object.keys(merged).length === 0) return undefined

      return {
        resolve: { alias: merged },
      }
    },

    async configResolved(config) {
      // glob의 cwd: 옵션 우선, 미지정 시 Vite config.root (기존 동작 유지).
      resolvedCwd = optionCwd ?? config.root

      // F1: dev 모드에서만 jogak 의존 패키지 cache 검증.
      // build / ssr build 시에는 deps cache가 부팅 경로에 끼지 않으므로 skip.
      // 옵션으로 비활성화 가능.
      if (config.command === 'serve' && !disableCacheValidation) {
        await validateAndPurgeViteCache({
          root: config.root,
          logger: {
            info: (m) => config.logger.info(m),
            warn: (m) => config.logger.warn(m),
          },
        })
      }

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
      if (id === VIRTUAL_GLOBAL_CSS_ID) {
        return RESOLVED_VIRTUAL_GLOBAL_CSS_ID
      }
      if (id.startsWith(VIRTUAL_ENTRY_PREFIX)) {
        return '\0' + id
      }
      return undefined
    },

    async load(id) {
      // ── Global css 모듈 ─────────────────────────────────────────
      // 알파.6 opt-in. 사용자 main.tsx가 항상 import하도록 빈 모듈도 emit한다
      // (조건부 import 회피 → ui-dev의 main.tsx는 단일 import 1줄로 끝).
      //
      // Vite css 처리 파이프라인이 본 모듈에서 emit된 import 문을 보고 사용자
      // css 파일을 module graph에 등록 → dev에서는 css HMR이 자연스럽게 작동
      // (Vite 표준 경로). 별도 watcher hook 불필요.
      if (id === RESOLVED_VIRTUAL_GLOBAL_CSS_ID) {
        const userRoot = resolvedCwd ?? process.cwd()
        const paths = resolveGlobalCssPaths(globalCssOption, userRoot)

        if (paths.length === 0) {
          // 미발견 또는 opt-out — 빈 모듈. 다음 케이스 모두 동일:
          // - globalCss undefined / false (default)
          // - globalCss true 인데 자동 감지 실패
          // - globalCss '' (빈 문자열) 또는 [] (빈 배열)
          return `// [jogak] globalCss not configured or no candidates found.\nexport {}\n`
        }

        // 각 path를 side-effect import. 절대 경로를 specifier로 그대로 넘겨도
        // Vite가 처리 가능 (Windows 경로는 JSON.stringify가 escape).
        // 배열 순서 보존 — 사용자 명시 ['tokens.css', 'reset.css'] 시 cascade order.
        const importLines = paths
          .map((p) => `import ${JSON.stringify(p)}`)
          .join('\n')
        return `${importLines}\nexport {}\n`
      }

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

        // self-accept: 이 entry 모듈 또는 의존(user .jogak.tsx) 변경 시 Vite가
        // 본 모듈을 자동 re-fetch + 재평가 → hydrateEntry 다시 호출 → registry
        // notify로 useEntry가 in-place 갱신. 만일 이게 없으면 ESM dynamic import
        // 캐시 때문에 같은 specifier가 invalidate되어도 새 평가가 일어나지 않는다.
        return `import * as _user from ${JSON.stringify(filePath)}
import { defaultRegistry } from '@jogak/core'

const _meta = _user.default
const _named = { ..._user }
delete _named.default
const _jogaks = Object.values(_named).filter(
  (v) => v !== null && typeof v === 'object' && typeof v.name === 'string'
)
defaultRegistry.hydrateEntry(${JSON.stringify(entryId)}, _jogaks, _meta?.component)

if (import.meta.hot) {
  import.meta.hot.accept()
}

export {}
`
      }

      return undefined
    },

    async handleHotUpdate({ file, modules }) {
      const isJogakFile = /\.jogak\.(tsx?|jsx?)$/.test(file)
      const isComponentFile = /\.(tsx?|jsx?)$/.test(file) && !isJogakFile

      if (!isJogakFile && !isComponentFile) return

      if (devServer === undefined) return

      // 컴포넌트 파일: React Fast Refresh 경로 그대로.
      if (!isJogakFile) return

      // ── jogak 파일 ────────────────────────────────────────────
      // 모듈 핸들 조회만 — invalidate는 분기 결정 후. (이전 동작은 무조건
      // 인덱스/entry 둘 다 invalidate했는데, meta-only 경로에서도 인덱스가
      // invalidate되면 다음 fetch 시 collectMetas가 N개 파일을 모두 재처리해
      // size에 비례한 HMR latency 폭증을 야기했다. meta-only일 땐 인덱스를
      // invalidate하지 않고 ws custom event로만 클라이언트 registry를 갱신한다.)
      const indexMod = devServer.moduleGraph.getModuleById(
        RESOLVED_VIRTUAL_INDEX_ID,
      )
      const entryId = fileToId.get(file)
      const entryModId =
        entryId !== undefined
          ? RESOLVED_VIRTUAL_ENTRY_PREFIX + idToSlug(entryId)
          : undefined
      const entryMod =
        entryModId !== undefined
          ? devServer.moduleGraph.getModuleById(entryModId)
          : undefined

      // F4: 새 메타 추출 → 시그니처 비교
      let newMeta: ExtractedMetaPayload | null = null
      let newAutoArgTypes: Record<string, ArgType> = {}
      let newSource = ''
      if (extractor !== undefined) {
        try {
          newMeta = await extractor.extractMeta(file)
        } catch {
          newMeta = null
        }
        try {
          newAutoArgTypes = await extractor.extract(file)
        } catch {
          newAutoArgTypes = {}
        }
        try {
          newSource = await readFile(file, 'utf8')
        } catch {
          newSource = ''
        }
      }

      if (newMeta === null) {
        // extractor 없음 / 추출 실패 → 안전 fallback (full-reload).
        // lastSig는 갱신하지 않음 (다음 정상 추출에서 재설정).
        if (indexMod !== undefined) devServer.moduleGraph.invalidateModule(indexMod)
        if (entryMod !== undefined) devServer.moduleGraph.invalidateModule(entryMod)
        devServer.ws.send({ type: 'full-reload' })
        return
      }

      const newSig = sigOf(newMeta)
      const oldSig = lastSig.get(file)
      const isMetaOnly = sigEq(oldSig, newSig)
      lastSig.set(file, newSig)

      if (!isMetaOnly || entryId === undefined) {
        // 구조변경 또는 entry 매핑 없음 (첫 변경 등) → full-reload.
        if (indexMod !== undefined) devServer.moduleGraph.invalidateModule(indexMod)
        if (entryMod !== undefined) devServer.moduleGraph.invalidateModule(entryMod)
        devServer.ws.send({ type: 'full-reload' })
        return
      }

      // ── meta-only 경로 ────────────────────────────────────────
      // 새 RegistryEntryMeta 합성 후 클라이언트에 push.
      // entry id는 title 동일이 보장되므로 metaPayload.title을 그대로 써도 되지만,
      // fileToId 매핑을 신뢰원으로 사용한다.
      const newRegMeta: RegistryEntryMeta = {
        id: entryId,
        title: newMeta.title,
        jogakNames: newMeta.jogakNames,
        autoArgTypes: newAutoArgTypes,
        userArgTypes: newMeta.userArgTypes,
        source: newSource,
        filePath: file,
        metaExtras: newMeta.metaExtras,
      }

      // entry 모듈만 invalidate (다음 requestEntry에서 새 args/component 받도록).
      // 인덱스는 invalidate하지 않음 — collectMetas N개 재처리 비용 회피.
      // 클라이언트 registry는 ws custom event로 변경 entry 1개만 patch.
      // 새 페이지 로드/full reload 시 인덱스가 재 fetch되며 lastSig 기반의
      // 최신 메타로 emit된다 (lastSig는 위 줄에서 이미 갱신).
      if (entryMod !== undefined) devServer.moduleGraph.invalidateModule(entryMod)

      devServer.ws.send({
        type: 'custom',
        event: 'jogak:meta-update',
        data: { id: entryId, meta: newRegMeta },
      })

      // entry 모듈 + 변경된 user 모듈(ctx.modules)을 함께 affected로 반환.
      // entry는 self-accept(import.meta.hot.accept())이므로 boundary,
      // user 모듈 변경은 entry까지 propagate되어 entry가 자동 재평가됨.
      // 재평가 시 user 모듈이 새로 fetch되어 새 args/component가 hydrateEntry로
      // 들어가고 registry notify로 useEntry가 in-place 갱신된다.
      const affected = [...modules]
      if (entryMod !== undefined && !affected.includes(entryMod)) {
        affected.push(entryMod)
      }
      return affected
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
