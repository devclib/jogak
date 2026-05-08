# Changelog

All notable changes to Jogak packages are documented here. The repository follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/).

Version numbers apply to all packages in the workspace (synchronized release).

## [0.1.0-alpha.9] — 2026-05-09

### Added

- **`@jogak/vite-adapter`**, **`@jogak/next-adapter`**, **`@jogak/webpack-adapter`**, **`@jogak/standalone-adapter`**: 새 builder-agnostic adapter 패키지군. CLI가 사용자 cwd의 빌더(`next.config`, `vite.config`, `webpack.config`)를 감지하여 해당 adapter를 dynamic import한다. 사용자 컴포넌트는 사용자의 정상 빌더 client에서 평가되므로 utility class compiler(Tailwind v4 등)이 자연스럽게 동작한다.
- **`@jogak/core`**: `BuilderAdapter` ABI(`adapter.ts`), 빌더 자동 감지(`detectBuilder`, `@jogak/core/server`), preview entry 공통 source(`renderPreviewEntrySource`), postMessage 프로토콜(`@jogak/core/preview-entry/protocol`).
- **`JogakPluginOptions.userPreviewUrl` / `previewEntryPath`**: adapter dispatch 결과를 host UI iframe src로 주입하는 통로. (`userViteUrl`은 alpha.8 호환을 위해 alias로 유지)
- **`@jogak/next-adapter`**: Next 14+ App Router에 `<userRoot>/app/jogak-preview/page.tsx` scaffold(`.gitignore` 자동, shutdown cleanup). `next dev` child process spawn + HTTP poll ready 감지. CLI가 사전 생성한 `.jogak/registry.ts`의 entries를 import하여 모듈 평가 시점에 등록.
- **`@jogak/webpack-adapter`**: `<userRoot>/.jogak/webpack-preview/preview-entry.tsx` scaffold + `webpack-dev-server` programmatic API + `webpack-merge`로 사용자 webpack.config 통합.

### Changed

- **`@jogak/core`**: `fs`/`path`를 사용하는 server-only utility(`detectBuilder`, `resolveGlobalCssPaths`, `detectUserGlobalCss`)를 `@jogak/core/server` subpath로 분리. client bundle에 Node 모듈이 leak되는 문제를 차단.
- **`@jogak/core`**, **`@jogak/ui`**, all adapters: CJS 산출물 확장자를 `.js` → `.cjs`로 변경. `"type": "module"` 환경에서 `.js`가 ESM으로 해석되어 발생하던 `exports is not defined in ES module scope` 오류를 해소.
- **`previewIsolation`** default: `'shadow'` → `'iframe'`. shadow DOM 모드는 일부 portal 라이브러리(Radix 등)와 호환성 이슈가 있어 iframe 격리를 표준으로.
- **`@jogak/ui`** preview-frame: 기존 `__jogak_setProps__` 직접 호출 프로토콜 → postMessage(`jogak:setProps` / `jogak:rendered` / `jogak:error`)로 통일. 모든 어댑터의 iframe entry가 동일 프로토콜을 따른다.
- **`@jogak/cli`**: `jogak dev`가 registry 생성 완료를 대기한 뒤 어댑터를 spawn (이전: fire-and-forget). non-vite 어댑터의 scaffold가 비어있는 registry를 import하던 race condition 해소.

### Fixed

- **`@jogak/cli`**: 어댑터 dynamic import 시 `import.meta.resolve`/`createRequire`가 cli/dist 기준으로 해석돼 사용자 cwd의 어댑터 패키지를 찾지 못하던 문제. `<cwd>/node_modules/@jogak/${name}-adapter/package.json`을 직접 읽어 `exports['.'].import` 경로로 해석하도록 변경.
- **`@jogak/next-adapter`**: 이전 시도의 `__jogak_preview__` 경로는 Next App Router의 private folder convention(`_`로 시작하는 폴더는 라우팅 제외)과 충돌해 404. `jogak-preview`로 변경.

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
