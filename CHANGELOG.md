# Changelog

All notable changes to Jogak packages are documented here. The repository follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/).

Version numbers apply to all packages in the workspace (synchronized release).

## [0.1.0-alpha.7] — 2026-05-09

### Added

- **`@jogak/cli` `jogak.config.{ts,mjs,js,json}` 자동 발견** — user root에 config 파일을
  두면 CLI가 자동으로 발견해 `runHost`에 전파. `.ts`/`.mjs`/`.js`는 Vite의
  `loadConfigFromFile` 사용, `.json`은 `JSON.parse`. 발견 우선순위: `.ts` > `.mjs` >
  `.js` > `.json`. CLI 플래그가 항상 config 파일보다 우선(override).
- **`@jogak/core` `defineJogakConfig<T>(config)` identity helper** — `jogak.config.ts`에서
  타입 추론된 config를 작성할 수 있도록 export. `JogakConfig` 타입은 `JogakPluginOptions` +
  host-specific 옵션(`port`/`host`/`open`/`outDir`/`base`/`minify`/`sourcemap`)을 합친 통합 타입.
- **`@jogak/core` `JogakPluginOptions.previewIsolation`** — Preview 영역의 사용자 컴포넌트
  마운트 격리 모드. `'none' | 'shadow' | 'iframe'`. default `'none'`(알파.6까지의 동작).
  - `'shadow'` — Preview 마운트 노드를 Shadow DOM으로. 외부 document의 css에서 격리되지만,
    Radix portal(`document.body`)을 사용하는 컴포넌트는 shadow 안 utility class를 받지 못함
    (호환성 한계 README에 명시).
  - `'iframe'` — `/preview-frame.html`을 통한 완벽 격리. `contentWindow.__jogak_setProps__`
    로 직접 props 주입. "single Vite, no iframe" 차별점과 상충하므로 명시적 opt-in 전용.
- **`@jogak/ui` `JogakHostOptionsBase`에 `globalCss` / `previewIsolation` 추가** —
  programmatic API(`runHost({ globalCss: true })`)로도 옵션 사용 가능.
- **`@jogak/ui` `preview-frame.html` + `src/app/preview-frame.tsx`** — iframe-mode 전용
  최소 entry. `virtual:jogak/global-css`만 import.

### Fixed

- **알파.6 결정적 결함 해결** — 알파.6는 `JogakPluginOptions.globalCss` 타입과 가상 모듈은
  정상 동작했지만, `runHost`가 `configFile: false`로 사용자 `vite.config.ts`를 무시하고
  `JogakHostOptionsBase`도 `globalCss`를 수용하지 않아 사용자가 옵션을 켤 통로가 없었음.
  README 가이드(`jogak({ globalCss: true })` in `vite.config.ts`)는 무효였음.
  알파.7에서 `jogak.config.ts` 통로를 정식 도입해 해결.

### Notes

- `previewIsolation: 'shadow'`에서 Tailwind utility class는 외부 document에 정의되어
  shadow root에 inject(adoptedStyleSheets)됨. Radix처럼 `document.body`로 portal하는
  컴포넌트는 portal target이 shadow 외부이므로 utility를 받지 못함 — 사용자가 명시적으로
  trade-off를 인지하고 선택해야 함 (README "previewIsolation 모드 비교").
- 알파.6 publish 사용자는 `vite.config.ts`의 `jogak({ globalCss })` 호출을 제거하고
  `jogak.config.ts`로 옮겨야 함. 마이그레이션 가이드는 `packages/ui/README.md`의
  "알파.6 → 알파.7 마이그레이션" 섹션 참조.

## [0.1.0-alpha.6] — 2026-05-09

### Added

- **`@jogak/core` `JogakPluginOptions.globalCss`** — 사용자 globalCss(예: shadcn
  `src/index.css`의 디자인 토큰 + Tailwind directives)를 jogak SPA에 import할 수 있는
  opt-in 옵션. 알파.4~5에서 입증된 `prefix=jogak` 격리 위에 사용자 css를 추가.
  타입: `boolean | string | readonly string[]`. default `false`(opt-in 보존,
  기존 사용자 환경 영향 zero).
  - `true` — 자동 감지 (`src/index.css` → `src/main.css` → `src/styles/index.css` →
    `src/styles/main.css` → `src/app/globals.css` (Next App Router) →
    `src/styles/globals.css` (Next Pages) → `src/global.css` → `src/app.css` 우선순위로
    순회, 첫 발견 1개 import).
  - `string` / `string[]` — user root 기준 상대 경로 (배열은 순서대로 import).
- **가상 모듈 `virtual:jogak/global-css`** — `@jogak/core`의 Vite 플러그인이
  옵션 분석 후 emit. `@jogak/ui`의 SPA entry(`main.tsx`)가 항상 import (조건부
  import 회피). default false 시 빈 모듈 emit이라 SPA 번들 영향 zero.
- **`@jogak/ui` chrome 보호 rule** —
  `[data-jogak-shell] :where(button, input, select, textarea):not([data-jogak-content] *)`
  rule이 jogak.css `@layer base`에 추가됨. `:where()` specificity 0 + `revert-layer`로
  사용자 `@layer base { * { border-color: ... } }` 같은 reset이 jogak chrome의 form
  element를 침범하는 것을 차단. preview 안 사용자 컴포넌트(`[data-jogak-content] *`)는
  사용자 css 그대로 적용.

### Notes

- 사용자가 `*` selector나 `body { font-family: ... }` 같은 강한 selector를 쓰면
  jogak chrome에 영향 가능. 권장 패턴: `[data-jogak-content] *` 또는
  `[data-jogak-content]` 안에서 적용. 자세한 가이드는 `packages/ui/README.md`의
  "사용자 globalCss 적용 (alpha.6)" 섹션 참조.
- 자동 감지는 dev 시작 시점에 고정. 사용자가 새 후보 css 파일을 추가하면 dev 재시작
  필요. 명시 경로(`string`/`string[]`)는 Vite 표준 missing file watcher로 정상
  hot reload.
- `*.module.css`는 자동 감지에서 제외 (scoped css 의도). 명시 경로로는 OK.
- preview 영역만 격리하는 `previewIsolation: 'shadow' | 'iframe'` 옵션은
  알파.7+ 검토.

## [0.1.0-alpha.5] — 2026-05-09

### Changed

- **`@jogak/ui` 컴포넌트 4개 + App shell** — Sidebar / Preview / Controls / Actions / JogakApp의
  inline style을 `jogak:` prefix Tailwind class로 마이그레이션 완료. 4 PR 시리즈 (Sidebar /
  Preview+Controls / Actions+App / 마무리)로 점진 적용. 시각 출력은 Playwright VR 9 시나리오
  multi-run으로 픽셀 단위 동등성 입증 — alpha.4 대비 baseline 8/9 unchanged. dist 사이즈는
  오히려 감소(mjs gzip 8.36 → 7.64 KB).
- **`@jogak/core` registry** — `getAll` / `getTree` / `getAllMeta` / `getMetaTree` 결과가
  insertion 순서 비결정성에 영향받지 않도록 결정적 ordering 보장 (`title` alphabetical +
  tie-break `id`, locale-independent natural sort). dev 모드 `import.meta.glob`의 HMR 캐시
  순서가 sidebar 트리 렌더에 영향을 주던 문제 해결. public API signature 무변경.
- **잔존 inline style 11건** — 모두 화이트리스트 (CSS variable 주입 + prism-react-renderer
  external interface). 각 라인에 `eslint-disable-next-line + 사유` 주석으로 1:1 매핑.

### Added

- **`scripts/lint-traps.mjs`** — Tailwind v4 함정 6종 + deprecated 변수 사용처 zero를
  grep으로 자동 검증. 발견된 함정: ① `text-[var(--jogak-text-*)]` line-height 페어링 회피,
  ② `font-[var(...)]` family-name hint 누락 시 font-weight 오인, ④ flex 부모 안 padding
  보유 button의 `leading-none` 회피, ⑤ `border-none + border-{n}` 조합 금지, ⑥ form
  element `appearance-none` 미적용 (UA 보존).
- **ESLint v9 flat config + typescript-eslint v8** (devDependencies) — `no-restricted-syntax`
  + JSXAttribute selector로 inline style forbid rule 도입.
- **CI Visual Regression workflow** (`.github/workflows/visual-regression.yml`) — Playwright
  9 시나리오 + Docker `mcr.microsoft.com/playwright:v1.59.1-jammy` 환경 + 14일 diff artifact
  + `pnpm lint` step 통합.
- **`@jogak/ui` 신규 dependency**: `clsx@^2.1.1` (boolean variant 결합용, ~1.2KB minified).

### Fixed

- **`@jogak/ui`** Preview source toggle / prism `<pre>` / Controls action span 등 5곳에서
  `font-[var(--jogak-font-mono)]`가 v4에서 `font-weight: var(...)`로 잘못 컴파일되던 문제.
  `font-[family-name:var(--jogak-font-mono)]` hint 적용으로 차단.
- **`@jogak/ui`** Preview viewport toggle / bottom-panel tab button의 `leading-none` 적용
  시 flex 부모 높이가 1~2px 단축되던 문제. 단일 문자 span에만 leading 적용, padding 보유
  button에는 미적용으로 baseline 정합.

### Removed

- **`@jogak/ui` jogak.css** — `--jogak-text-{xs,sm,base,md,lg}` 5개 CSS variable + `--jogak-sidebar-width`
  1개 삭제. font-size 픽셀 literal 채택 + App grid 픽셀 literal 채택 후 사용처 zero 입증.
  알파.6 사용자 globalCss 도입 시 충돌 가능성 사전 차단.

### Notes

- 사용자 프로젝트의 globalCss는 **현재도 jogak SPA에 적용되지 않습니다** (의도된 한계).
  알파.6에서 `JogakPluginOptions.globalCss` opt-in으로 지원 예정. jogak UI 자체가 prefix=jogak으로
  격리됐으므로 사용자 Tailwind/shadcn과 utility 충돌 zero가 본 릴리즈에서 입증됨.
- `@jogak/ui` jogak SPA에 inline `<style>` 태그(skeleton 애니메이션) 잔존 zero — `jogak.css`
  `@layer components`로 이동.

## [0.1.0-alpha.4] — 2026-05-08

### Internal

- `@jogak/ui` SPA 빌드 파이프라인에 Tailwind v4 + `prefix(jogak)` 도입 (인프라 단계).
  사용자 번들 / publish 산출물에는 영향 없음.
- jogak 디자인 토큰을 `--jogak-*` CSS variable로 정의 (알파.5 컴포넌트 마이그레이션 대비).
- jogak SPA에 `data-jogak-shell` / `data-jogak-content` wrapper 추가 (알파.6 사용자 globalCss
  scope 정책 hook).

### Notes

- jogak UI 컴포넌트(Sidebar/Preview/Controls/Actions)는 여전히 inline style 사용. Tailwind class
  마이그레이션은 알파.5에서 진행.
- 사용자 프로젝트의 globalCss(예: `src/index.css`)는 **현재 jogak SPA에 적용되지 않습니다**. 알파.6에서
  `JogakPluginOptions.globalCss` opt-in으로 지원 예정.
- 사용자 프로젝트가 Tailwind를 사용해도 jogak prefix(`jogak:`)와 충돌하지 않음.

Other packages: no source changes; version bumped to keep workspace synchronized.

## [0.1.0-alpha.3] — 2026-05-07

### Added

- **`@jogak/core`**: Vite plugin now auto-detects user `tsconfig.json` (and `tsconfig.app.json` for the Vite scaffold-default split-references layout) and converts `compilerOptions.paths` into `vite resolve.alias`. This makes `runHost`-driven dev/build work zero-config for projects that use path aliases (shadcn/ui's `@/lib/utils` etc.). Without this, `runHost` ignored the user's `vite.config.ts` (`configFile: false`) and any `@/...` import inside a user component failed to resolve.
- **`JogakPluginOptions.resolveAlias`**: explicit user-provided alias map for cases the auto-extraction can't handle (extends chains, complex glob patterns). Explicit entries override auto-extracted ones. Relative paths are resolved against the user root.

### Fixed

- Path aliases declared in user `tsconfig` are now respected during `jogak dev` and `jogak build`. Previously, every `*.jogak.tsx` that imported a component using `@/`-style imports would fail with `Failed to resolve import "@/..."` in the browser dev overlay.

Other packages: no source changes; version bumped to keep the workspace synchronized.

## [0.1.0-alpha.2] — 2026-05-07

### Fixed

- **`@jogak/ui`**: Published package was missing `src/app/main.tsx` (referenced by `index.html` as the SPA entry), causing `jogak dev` to 404 on the entry script and `jogak build` to fail with `Failed to resolve /src/app/main.tsx`. The `files` field in `package.json` only included `dist/`, but `runHost` uses the package's `index.html` as the Vite root and resolves `/src/app/main.tsx` from source. Added `src/app`, `src/components`, `src/hooks`, `src/index.ts`, `src/vite-env.d.ts` to `files`. Internal `src/host` and `src/examples` remain excluded (host is consumed via the published `dist/host` build; examples are repository-only demos).

Other packages: no source changes; version bumped to keep the workspace synchronized.

## [0.1.0-alpha.1] — 2026-05-07

### Changed

- **CI**: Switched npm publish authentication from `NPM_TOKEN` secret to npm Trusted Publisher (GitHub Actions OIDC). The release workflow no longer reads `NODE_AUTH_TOKEN`; identity is verified via the OIDC token issued for `id-token: write`. No functional changes to package source code.

## [0.1.0-alpha.0] — 2026-05-07

First public preview release. API is not yet stable.

### Added

- **Lazy virtual modules** (`@jogak/core`)
  - `virtual:jogak` index module exposes only entry metadata; no user component imports.
  - `virtual:jogak/entry/<slug>` per-entry virtual module dynamically imported on demand.
  - `defaultRegistry` hydration state machine: `unknown → meta → pending → hydrated`.
  - New API: `registerMeta`, `hydrateEntry`, `requestEntry`, `invalidateEntry`,
    `getAllMeta`, `getMetaTree`, `getEntryState`, `setEntryLoader`, `subscribe`.
  - `RegistryEntryMeta` type for sidebar metadata without component identity.

- **In-place HMR** (`@jogak/core` + `@jogak/react`)
  - `*.jogak.tsx` edits trigger entry virtual module self-accept → automatic
    rehydration. Sidebar metadata patched via `jogak:meta-update` ws custom event.
  - `useEntry(id)` subscribes to registry mutations and re-renders on hydrate.
  - meta-only vs structural change classification by `(title, jogakNamesKey)` signature.

- **child_process-isolated ts-morph extractor** (`@jogak/core`)
  - Props extraction runs in a separate child process via IPC.
  - Idle 5 s SIGTERM → OS reclaims memory immediately; no V8 isolate growth.
  - Lazy spawn on first `extract()` call; pending requests rejected on child exit.

- **Vite cache auto-invalidation** (`@jogak/core/vite`)
  - On dev boot, plugin compares jogak dist mtime vs `.vite/deps/_metadata.json`.
  - Stale cache is purged automatically with an info log.
  - Opt-out: `JogakPluginOptions.disableCacheValidation`.

- **`@jogak/react` hooks**
  - `useEntry(id): UseEntryState` — `loading | ready | error | unknown` discriminated union.
  - `useRegistryMeta(): UseRegistryMetaReturn` — backed by `useSyncExternalStore`,
    referential identity guaranteed.
  - `useRegistry()`, `JogakProvider`, `reactAdapter` (preserved signatures).

- **`@jogak/ui` library mode**
  - `JogakApp`, `Sidebar`, `Preview`, `Controls`, `Actions` published as
    pre-built ESM/CJS — no `transpilePackages` needed for Next.js.
  - `JogakAppProps`: `entries` (eager) | `metas` (lazy) | both unset (defaultRegistry).

- **CLI** (`@jogak/cli`)
  - `jogak dev` / `jogak build` / `jogak generate` commands.
  - Auto-detects `<cwd>/tsconfig.json` for ts-morph; falls back to manual
    `meta.argTypes` if absent.

- **Storybook benchmark suite** (`benchmarks/`)
  - `bench:scale:full` — cold-start / build / bundle vs Storybook 8 (Vite builder).
  - `bench:rss` — idle dev tree RSS vs Storybook.
  - `bench:hmr` — Playwright-driven HMR latency.

### Numbers vs. Storybook 8 (Vite builder)

| Metric | size 100 | size 500 |
|---|---|---|
| dev cold start | **1.7 s** vs 3.3 s | **2.9 s** vs 3.6 s |
| build time | **2.0 s** vs 2.9 s | **4.1 s** vs 7.6 s |
| bundle (gzip) | **108 KB** vs 716 KB | **156 KB** vs 1.09 MB |
| idle RSS (dev) | **321 MB** vs 403 MB | **345 MB** vs 489 MB |
| HMR (warm median) | **153 ms** | **199 ms** |

### Known Limitations

- HMR `jogak:meta-update` event only patches `defaultRegistry`. Custom registry
  injections via `<JogakProvider registry={custom}>` fall back to full reload.
- Boot-time RSS spike (~700 MB) before settling at idle RSS — esbuild prebundle
  + ts-morph child spawn. Settles within 5 s.
- `@jogak/core` install pulls ts-morph (~17 MB); only `core/build` and the Vite
  plugin actually use it. Splitting into `@jogak/extractor` is planned for 0.2.0.

### Compatibility

- Node ≥ 20.18 (`fetch` / `AbortSignal.timeout` stable)
- React ≥ 18 (peer)
- Vite ≥ 6 (peer, optional in `@jogak/core`)
- Next.js ≥ 14 (peer in `@jogak/next`)
- TypeScript ≥ 5.5 (build-time props extraction)

[0.1.0-alpha.0]: https://github.com/devclib/jogak/releases/tag/v0.1.0-alpha.0
