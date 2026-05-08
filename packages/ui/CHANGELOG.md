# Changelog

All notable changes to Jogak packages are documented here. The repository follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/).

Version numbers apply to all packages in the workspace (synchronized release).

## [0.1.0-alpha.8] — 2026-05-09

### Added

- **`JogakHostOptions.userViteUrl`** — 사용자 vite spawn URL을 jogak SPA host에 전달.
  CLI의 `spawnUserVite` 결과가 `runHost`에 자동 전달되며 jogak() plugin의
  `_jogakUserViteUrl`로 emit됨 → `IframeMount`가 iframe `src` base로 사용.
- **`IframeMount` postMessage 통신 재작성** — cross-origin 환경(사용자 vite ≠ jogak
  SPA)에서 `entry.id`를 메시지로 전달, iframe 안에서 `defaultRegistry.requestEntry(id)`로
  dynamic import.

### Changed (의도된 default 변경)

- **`previewIsolation` default `'shadow'` → `'iframe'`** — 사용자 vite scope에서
  사용자 컴포넌트가 사용자 디자인 그대로 보이는 것이 default 동작.
- **`main.tsx` 단순화** — 사용자 globalCss는 사용자 vite scope에서만 처리되므로 jogak
  SPA outer document inject는 `'none'` 모드(deprecated)에서만.

### Notes

- jogak-test-app(React + Vite + Tailwind v4 + shadcn) 검증: Badge가 사용자 디자인 그대로
  표시 + chrome 침범 zero 입증.

## [0.1.0-alpha.7.1] — 2026-05-09

### Fixed

- **`previewIsolation` 격리 통로 정정** — 알파.7은 `main.tsx`가 isolation 모드와
  무관하게 사용자 globalCss를 outer document에 무조건 inject해서 jogak chrome
  utility를 사용자 reset/preflight가 무력화하던 결함이 있었음. 알파.7.1:
  - `main.tsx`: `_jogakPreviewIsolation === 'none'`일 때만 사용자 globalCss를
    dynamic import. 다른 모드에서는 outer document inject 차단 → chrome 침범 zero.
  - `ShadowMount`: `adoptedStyleSheets` 흡수 + MutationObserver HMR sync 로직 제거.
    ShadowMount는 양방향 격리만 책임 (사용자 globalCss는 shadow scope에 inject 안 됨).
  - 사용자 컴포넌트 styling 통로(사용자 디자인 토큰/Tailwind utility 적용)는 알파.8
    사이클에서 사용자 vite 통합으로 별도 도입 예정.
- **`Preview` cleanup race condition** — `NoneAdapterContent` / `ShadowAdapterContent`
  / `IframeMount`의 unmount race(`Attempted to synchronously unmount...`)를
  `queueMicrotask`로 defer해 회피.

### Changed (의도된 default 변경)

- **`JogakHostOptionsBase.previewIsolation` default `'none'` → `'shadow'`** —
  양방향 격리가 default. back-compat은 `previewIsolation: 'none'` 명시.
- **`JogakApp` / `Preview` `previewIsolation` prop default `'none'` → `'shadow'`**.

### README 업데이트

- "previewIsolation 사용 가이드" 섹션 재작성 — 3 모드 비교표 + `'shadow'` default
  동작/한계 + `'iframe'` 주의 + `'none'` back-compat 사용법.
- "격리 보장" 섹션 — default 표시 갱신 (`'none'` → `'shadow'`).
- 로드맵 표 — alpha.7.1 entry 추가.

## [0.1.0-alpha.7] — 2026-05-09

### Added

- **`JogakHostOptionsBase`에 `globalCss` / `previewIsolation` 필드** — `runHost({ globalCss: true,
  previewIsolation: 'shadow' })` 형태로 programmatic API에서도 옵션 사용 가능.
- **`Preview` Shadow / iframe 마운트 분기**
  - `previewIsolation: 'none'` (default, 알파.6과 동일) — 같은 document에 마운트
  - `'shadow'` — `attachShadow` + `createPortal` + `adoptedStyleSheets`로 외부 css/font 흡수,
    `MutationObserver`로 외부 `<style>` HMR 동기화
  - `'iframe'` — `/preview-frame.html` + `contentWindow.__jogak_setProps__` 직접 호출,
    완벽 격리 (props 직렬화 불필요)
- **`preview-frame.html` + `src/app/preview-frame.tsx`** — iframe-mode 전용 최소 entry.
  `virtual:jogak/global-css`만 import (jogak chrome css는 미포함, 격리 보장).
- **README "previewIsolation 모드 비교" + "알파.6 → 알파.7 마이그레이션" 섹션** — 3 모드의
  trade-off / Radix portal 한계 / `jogak.config.ts` 패턴으로의 마이그레이션 안내.

### Fixed

- **알파.6 README의 `vite.config.ts` 가이드 정정** — 알파.6는 `vite.config.ts`에서
  `jogak({ globalCss: true })`를 호출하라고 안내했으나 `runHost`가 `configFile: false`로
  사용자 vite config를 무시해 옵션이 적용되지 않았음. 알파.7부터는 `jogak.config.ts`에
  `defineJogakConfig({ globalCss: true })`로 작성.

## [0.1.0-alpha.6] — 2026-05-09

### Added

- **`main.tsx` 에 `import 'virtual:jogak/global-css'` 추가** — `@jogak/core`의
  `JogakPluginOptions.globalCss` opt-in 옵션이 켜진 환경에서 사용자 globalCss가
  jogak SPA에 적용됨. opt-in이 꺼진 default 환경에서는 빈 모듈이라 SPA 번들 영향 zero.
- **`jogak.css` chrome 보호 rule** — `[data-jogak-shell] :where(button, input, select, textarea):not([data-jogak-content] *)`
  rule이 form element의 사용자 reset 침범을 차단. `:where()` specificity 0 +
  `revert-layer`로 알파.5 baseline 영향 zero.
- **README "사용자 globalCss 적용 (alpha.6)" 섹션** — 사용법 / 자동 감지 후보
  8종 우선순위 / 격리 보장 3항목 / scope 가이드 / `[data-jogak-shell]` /
  `[data-jogak-content]` selector hint / 알려진 한계 4항목.

### Notes

- 알파.4부터 hook으로 도입됐던 `data-jogak-shell` / `data-jogak-content` 속성이
  본 릴리즈에서 처음으로 의미를 갖게 됨 (chrome 보호 rule + scope 가이드 hook).

## [0.1.0-alpha.5] — 2026-05-09

### Changed

- **컴포넌트 4개 + App shell 전면 마이그레이션** — Sidebar / Preview / Controls / Actions /
  JogakApp의 inline style을 `jogak:` prefix Tailwind class로 변경 완료. Playwright VR 9
  시나리오 multi-run 결정성으로 픽셀 동등 입증. alpha.4 baseline 대비 8/9 unchanged.
- **잔존 inline style 11건** — 모두 화이트리스트 (CSS variable 주입 + prism external interface).
  각 라인 `eslint-disable-next-line no-restricted-syntax -- jogak: <카테고리>` 주석.
- **dist 사이즈 감소** — mjs raw 35.3 → 33.9 KB / gzip 8.36 → 7.64 KB (skeleton inline
  객체 + `<style>` 태그 제거 효과).

### Added

- 신규 dependency: `clsx@^2.1.1` (boolean variant 결합용).
- `--jogak-radius-sm` CSS variable 첫 사용 (Clear 버튼).
- `.jogak-skeleton-shimmer` class + `@keyframes jogakSkeleton` (jogak.css `@layer components`).

### Removed

- `--jogak-text-{xs,sm,base,md,lg}` 5개 CSS variable — 사용처 zero. font-size 픽셀 literal
  채택 후 의미 상실. v4 `text-[var(--my-text-var)]` arbitrary value의 line-height 페어링
  부수효과 회피 위해 픽셀 literal 정책 채택 (PR 1에서 발견).
- `--jogak-sidebar-width` CSS variable — App grid 픽셀 literal 채택 후 사용처 zero.

### Fixed

- Preview source toggle / prism `<pre>` / Controls action span / json code / td name cell
  등 5곳에서 `font-[var(--jogak-font-mono)]`가 v4에서 `font-weight: var(...)`로 잘못 컴파일되던
  문제. `font-[family-name:var(--jogak-font-mono)]` hint로 차단.
- Preview viewport toggle / bottom-panel tab button에 `leading-none` 적용 시 flex 부모
  높이가 1~2px 단축되던 문제. padding 보유 button에는 leading 미적용으로 baseline 정합.

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
