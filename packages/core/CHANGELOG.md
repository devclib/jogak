# Changelog

All notable changes to Jogak packages are documented here. The repository follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/).

Version numbers apply to all packages in the workspace (synchronized release).

## [1.0.0-beta.3] — 2026-07-01

### Added

- **A11y addon (axe-core 자동 스캔)** — Storybook `addon-a11y` 대응. iframe scope의 preview entry가 render 완료 후 `axe.run(document.body)` 자동 실행 → `postMessage 'jogak:a11y'`로 부모(chrome scope)에 violations 전송. 300ms 디바운스. 4 iframe scope 지원: `preview-entry/source.ts` (default), `preview-frame.tsx` (fallback), `adapters/vite/scaffold.ts`, `adapters/webpack/scaffold.ts`. Next 어댑터는 followup.
  - `axe-core@^4.10.0`을 `peerDependencies` + `optionalDependency`로 추가. Jogak 자체는 axe-core를 번들 안 함 (install size 최소화). 사용자가 `pnpm add -D axe-core` 설치 시 활성화, 미설치 시 chrome A11y 패널에 install 안내 표시.
  - 공통 `A11Y_SNIPPET` string constant (`preview-entry/a11y-snippet.ts`)를 각 scaffold의 SOURCE template에 삽입 — 코드 중복 회피.
  - 신규 export: `JogakA11yViolation`, `JogakA11yViolationNode` 타입 (`@jogak/core`).
  - `JogakMessageFromFrame` 확장: `'jogak:height'`, `'jogak:a11y'` 추가.

### Changed

- **`peerDependencies.next`** 범위 확장: `^14 || ^15` → `^14 || ^15 || ^16`. beta.1의 scaffold 상대 경로 fix로 Next 16 이미 지원 중이던 실질 범위를 명시.

## [1.0.0-beta.2] — 2026-06-30

### Fixed

- **iframe height auto-sync (ResizeObserver + `jogak:height` postMessage)**: preview iframe 높이가 고정값(min-h-[256px])이라 컴포넌트 자연 높이가 그보다 크면 iframe 내부에 scroll이 발생하던 결함. 5 iframe scope (vite/next pages+RSC/webpack/next IframeBridge)에 동일 ResizeObserver 패턴 inject — `body` 관찰 → `Math.ceil(contentRect.height)`를 부모(chrome SPA IframeMount)에 postMessage. 부모가 iframe element `style.height`를 자연 높이로 갱신. frame-rate throttle은 browser native, `height > 0` 가드 + `disconnect()` cleanup으로 memory leak 회피.

## [1.0.0-beta.1] — 2026-06-30

### Fixed

- **`packages/core/src/adapters/next/scaffold.ts` — 상대 경로 emit**: Next 16 Turbopack은 `import "/abs/path/globals.css"` 절대 경로를 module-not-found로 거부 (webpack은 OK였음). `scaffoldAppRouter`/`scaffoldPagesRouter`가 받는 `cssAbsPaths`를 `targetDir` 기준 `path.relative()`로 상대 경로 변환 후 emit. Next 15 webpack + Next 16 Turbopack 양쪽 호환.

### Validated

- test-case/jogak-{react,next,vue,svelte,nuxt}-shop 5 framework 매트릭스로 실 사용 검증. 5 framework × 14 컴포넌트 × 12 jogak 메타 × 5 페이지 = jogak 본체의 multi-component / wrapper 패턴 / framework dispatch 정상 동작 확인.

## [1.0.0-beta.0] — 2026-06-04

### Milestone — alpha → beta 졸업

본 릴리스는 코드 변경이 아닌 안정도 등급 승격이다. alpha.14.5 시점 코드와 동일,
sync 버전 bump만 수행.

졸업 기준 5항목 모두 충족:
1. **Critical issue zero** — alpha.14.1/14.3/14.4/14.5 사이클로 누적 결함(WC 어댑터,
   codegen strict, Next Client unmount race, Vue SFC shim, VR A-1 회귀, vite/next/
   svelte high severity 9건) 모두 해소.
2. **Should-fix zero** — open issue 0건, audit prod high+critical 0건.
3. **Vue / Svelte e2e** — framework-smoke matrix(vue, svelte 각 6/6) CI 자동화.
4. **Quiet period 20일** — 2026-05-15부터 2026-06-04까지 외부 보고/CI failure 0건.
5. **외부 issue 1사이클** — open 0건 상황이라 quiet period 무이슈를 1사이클로 수용
   (사용자 결정, 2026-06-04).

### API 동결

beta부터 1.0.0 stable까지 **public API breaking change 금지**. 변경 시 `2.0.0`
또는 별도 alpha 라인.

### npm dist-tag

`@jogak/core@1.0.0-beta.0`이 npm `latest` dist-tag로 promote된다 (release.yml의
`Promote pre-release to latest` step). 외부 사용자가 `pnpm add @jogak/core` (no
suffix) 명령 한 줄로 beta.0을 받는다.

## [0.1.0-alpha.14.5] — 2026-06-04

### Changed

- **버전 동기화 (no functional change)**: `@jogak/cli@0.1.0-alpha.14.5` (vite 6.4.3 high severity bump) publish에 맞춰 caret semver 일관성 유지. `@jogak/core` 소스 변경 없음.

## [0.1.0-alpha.14.4] — 2026-05-15

### Fixed

- **Next.js Client 어댑터의 nested root unmount race** (`src/renderers/next/client/Preview.tsx`): `JogakClientShell` cleanup에서 `rootRef.current?.unmount()`를 동기 호출 → React 19에서 outer root unmount 도중 inner root sync unmount 시 `"Attempted to synchronously unmount a root while React was already rendering"` 경고가 출력되던 결함. `queueMicrotask`로 defer하여 outer cleanup 완료 후 처리. 테스트 동작은 동일하나 stderr 4건이 사라져 CI 로그가 깨끗해진다.

## [0.1.0-alpha.14.3] — 2026-05-15

### Fixed

- **web-components iframe 어댑터 시그니처 오용** (`src/preview-entry/source.ts`): 알파.14.1의 framework dispatch 도입 시 `m.defineJogakElement(entry.meta.component, entry.id)`로 잘못 호출 + `void` return을 `tagName`으로 받던 결함. `framework: 'web-components'` + iframe isolation(default) 사용자는 iframe scope에서 `document.createElement(undefined)`로 마운트가 실패했다. `entryToTagName(entry.id)` 인라인 헬퍼로 결정적 tagName 생성 + `defineJogakElement(tagName, entry)` 올바른 시그니처로 교체. `WeakMap<container, {el, tagName}>` state로 framework 전환 시 재마운트 안전성 확보 + `serializeAttribute()`로 function/object args에 대해 `removeAttribute` 처리(이전엔 `setAttribute(k, "[object Object]")`로 들어가던 부수 결함도 동시 해소). `preview-entry/source.test.ts` 회귀 가드 6건 신규 — 잘못된 호출 패턴(`defineJogakElement(entry.meta.component`, void return 수신) 차단 + 5개 framework dispatch + postMessage 프로토콜 emit 검증.

- **codegen이 strict tsconfig 환경에서 typecheck fail** (`src/build/generate.ts`): emit된 `_buildEntry(_meta${i}, _named${i}, _sources[${i}], _autoArgTypes[${i}])`에서 `_sources[i]`/`_autoArgTypes[i]`가 `noUncheckedIndexedAccess: true` 환경에서 `string | undefined`로 추론되어 외부 사용자가 strict tsconfig를 쓰면 `jogak generate` 결과물이 typecheck error를 냈다. `?? ''` / `?? {}` fallback emit으로 해소(런타임 동작 동일). `build/generate.test.ts` 회귀 가드 3건 신규 — emit content에 fallback 패턴이 들어가는지 + bare indexed access가 사라졌는지 검증.

## [0.1.0-alpha.14.2] — 2026-05-11

### Changed

- **버전 동기화 (no functional change)**: `@jogak/ui@0.1.0-alpha.14.2` 패치 publish에 맞춰 동기화. `@jogak/core` 소스/dist 변경 없음. 워크스페이스는 동일 prerelease 라인을 일괄 유지하므로 examples 환경에서 caret semver 매칭 혼선이 발생하지 않도록 함께 publish.

## [0.1.0-alpha.14.1] — 2026-05-11

### Added

- **`@jogak/core` Vue 3 renderer reactive props**: 동일 component 재 render 시 unmount/remount 대신 `reactive` props mutate. `createApp(wrapper)` + `h(child, reactiveProps)` 패턴 + `nextTick` await로 호출자가 일관된 DOM을 보도록 보장. Vue adapter 단위 테스트 4→6 (mount / reactive update / component swap / undefined prop / unmount / function prop).
- **`@jogak/core` Svelte 실 컴파일 fixture**: `@sveltejs/vite-plugin-svelte@^4.0.4` devDep + `vite.config.ts`에 svelte plugin + `resolve.conditions=['browser', ...]`. `__fixtures__/Hello.svelte`를 실제 vite-plugin-svelte로 컴파일해서 happy-dom 마운트 검증 (4 cases).
- **`@jogak/core` Vue SFC + Svelte Props 자동 추출**: `@vue/compiler-sfc`(optional dynamic require)로 `<script setup lang="ts">` defineProps generic 분석, svelte는 정규식 + ts-morph로 `$props()` rune destructure + type annotation 추출. 미설치 사용자는 React-only path 영향 zero. 단위 테스트 +15 (vue 6 + svelte 9).
- **`@jogak/core` framework 메타 전파**: `JogakMeta.framework?: 'react'|'next'|'web-components'|'vue'|'svelte'` 추가. parser가 default-export literal에서 framework 추출 → `RegistryEntryMeta.framework`로 lazy 사이드바까지 보존. `JogakPluginOptions.framework` 전역값으로 단일 framework 프로젝트 일괄 지정 가능 (jogak.config의 `framework: 'vue'`).
- **`@jogak/core` jogak default args 전파**: `RegistryEntryMeta.jogakDefaultArgs`. parser가 named export(`Default: Jogak = { args: { ... } }`)의 args literal을 정적으로 추출. iframe isolation 모드에서 chrome scope가 user 메타를 평가하지 않고도 default args를 iframe으로 전달.
- **`@jogak/core` framework-aware iframe preview entry**: `preview-entry/source.ts`의 TEMPLATE이 entry.meta.framework로 어댑터 lazy import — react/next/vue/svelte/web-components. framework 전환 시 이전 어댑터 unmount → 새 컨테이너 → 새 어댑터 mount.
- **`@jogak/ui` adapterFor dispatch 라우터**: `packages/ui/src/lib/adapter-for.ts`. dynamic import + Map 캐시 + in-flight Promise 공유. 11개 `reactAdapter` hardcoded 호출(Preview/index, preview-frame)을 `adapterFor(entry.meta.framework ?? 'react')`로 교체. React-only 사용자는 vue/svelte 모듈을 로딩 받지 않음. 단위 테스트 14건.

### Changed

- **`@jogak/core` chrome scope entry virtual stub (iframe isolation)**: `previewIsolation === 'iframe' && !previewFrame`일 때 chrome 측 entry 가상 모듈은 component 없이 hydrate 호출만 emit. chrome vite의 module graph walk가 user `.vue/.svelte`를 transform 시도해 fail하던 결함 해소.
- **`@jogak/core` `synthJogakMeta` framework 전파**: `RegistryEntryMeta.framework`가 `JogakMeta.framework`로 보존되어 iframe scope의 `entry.meta.framework`로 어댑터 dispatch 가능. 누락 시 모든 framework가 `'react'` fallback으로 들어가 마운트 실패하던 결함 수정.
- **`@jogak/core` `useEntry` skipHydrate 옵션**: `useEntry(id, { skipHydrate: true })`로 chrome scope에서 component 모듈 import를 건너뛰고 synthetic `RegistryEntry`(component=null, jogaks[].args=메타의 default args)로 `status: 'ready'` 노출. chrome은 메타만 알고 component 마운트는 iframe에 위임.
- **`@jogak/ui` Preview iframe-aware**: Preview/index.tsx가 `previewIsolation === 'iframe'`일 때 `useEntry` skipHydrate. format-usage가 `component=null` 도 처리하도록 title 기반 fallback 적용.

### Fixed

- **Vue 3 renderer rootProps reactivity**: `createApp(component, rootProps)`의 rootProps가 정적이라 mutate해도 child의 props에 반영되지 않던 문제. wrapper + `h(child, reactiveProps)`로 우회.
- **vitest의 svelte 모듈 server-side resolve**: vitest happy-dom 환경에서 `svelte`가 server entry로 resolve되어 `mount(...)`가 `lifecycle_function_unavailable`로 fail하던 문제. `resolve.conditions=['browser', 'module', 'import', 'default']` 추가.

### Fixtures

- **`apps/jogak-vue-test` 신규**: Vue 3 전용 e2e fixture (`plugin-vue`만 등록, `jogak.config.framework: 'vue'`).
- **`apps/jogak-svelte-test` 신규**: Svelte 5 전용 e2e fixture (`plugin-svelte`만 등록, `jogak.config.framework: 'svelte'`).

  Vue와 Svelte는 mutually exclusive — 한 프로젝트에 동시 사용 가정 zero. React/Next/Web Components와 동일 패턴(각자 별 fixture).

## [0.1.0-alpha.10.3] — 2026-05-11

### Fixed

- **`@jogak/ui` 코드 패널**: 알파.10.2까지 syntax-highlight 영역에 `.jogak.tsx` 파일 전체(meta/argTypes/exports 포함)를 노출했다. 의도된 동작은 **현재 args 기반 컴포넌트 사용 코드** 표시 — 사용자가 Controls 패널에서 args를 변경하면 코드도 즉시 갱신. `formatUsageCode(entry, args)` 추가, JogakRenderer에서 `entry.source`(파일 전체) 대신 사용 스니펫을 SourceViewer에 전달.

  변경 전:
  ```tsx
  import type { JogakMeta, Jogak } from '@jogak/core'
  import { Badge } from './badge'

  const meta = { title: 'UI/Badge', component: Badge, ... } satisfies JogakMeta
  export default meta
  export const Default: Jogak = { ... }
  ```

  변경 후:
  ```tsx
  <Badge variant="default">New</Badge>
  ```

- **포매터 규칙**: children은 태그 본문에, props는 attribute로. `boolean true → key`, `false → key={false}`, `string → key="value"`(escape), `number → key={n}`, `function → key={fn}`, 객체/배열 `→ key={JSON}`. 한 줄이 60자 초과 시 multi-line 자동 wrapping. 단위 테스트 11개 추가.

### Added

- `e2e/code-panel-check.mjs` — 코드 패널이 사용 코드를 보여주는지 visual 검증 (jogak meta keyword 부재 + 컴포넌트 태그 존재).

기타: source 변경 외 패키지는 synchronized release 유지를 위해 버전만 bump.

## [0.1.0-alpha.10.2] — 2026-05-09

### Fixed

- **vitest.workspace.ts**: 알파.10에서 7개 패키지 디렉토리를 삭제했지만 `vitest.workspace.ts`가 여전히 `packages/react`, `packages/next`, `packages/web-components`를 참조해 `pnpm test` 시 startup error. core/ui/cli 3개로 정리.

기타 패키지: source 변경 없음, synchronized release 유지를 위해 버전만 bump.

## [0.1.0-alpha.10.1] — 2026-05-09

### Fixed

- **CI typecheck**: 알파.10에서 root `tsconfig.json` references에 `packages/cli`를 추가했으나, `tsc -b`가 cli typecheck 시점에 ui의 `dist/host/index.d.ts` (실제 파일은 없음 — ui는 `noEmit: true`)를 찾으려 해 `Cannot find module '@jogak/ui/host'` 에러 발생. 알파.9 이전처럼 cli는 root references에서 제외 — cli는 자기 `pnpm build` 단계의 `tsc -p tsconfig.json`에서 typecheck됨 (그 시점엔 ui dist가 이미 빌드돼 있음).

기타 패키지: source 변경 없음, synchronized release 유지를 위해 버전만 bump.

## [0.1.0-alpha.10] — 2026-05-09

### Architectural unification — 10 packages → 3 packages

알파.9.x에서 분리됐던 4개 빌더 어댑터(`@jogak/vite-adapter`, `@jogak/next-adapter`, `@jogak/webpack-adapter`, `@jogak/standalone-adapter`)와 3개 프레임워크 렌더러(`@jogak/react`, `@jogak/next`, `@jogak/web-components`)를 모두 `@jogak/core`로 통합. 이들의 본질은 build-tool / runtime 통합 코드이며 별도 패키지로 격리할 만한 런타임 substance가 없다는 판단.

이제 publish되는 패키지는 `@jogak/core`, `@jogak/ui`, `@jogak/cli` 3개로 축소. 기능은 모두 유지되며 사용자 install도 단순화 (vite/next/webpack peer deps는 모두 `peerDependenciesMeta.optional` 처리 — 사용자가 실제로 쓰는 빌더만 install).

### Added

- **`@jogak/core/adapters/{vite,next,webpack,standalone}`**: 4개 builder adapter subpath. `@jogak/${name}-adapter` 패키지를 흡수.
- **`@jogak/core/renderers/{react,next,web-components}`**: 3개 framework renderer subpath. 동명 별도 패키지를 흡수.
- **`@jogak/core/vite-plugin`**: 알파.9.x의 `@jogak/core/vite`를 정식 명명. 기존 `@jogak/core/vite`는 backward-compat alias로 유지.
- **CLI `loadAdapter`**: 사용자 cwd의 `@jogak/core` exports를 직접 lookup해서 adapter dynamic import. 별도 어댑터 패키지 install 불필요.

### Changed

- **import 경로 마이그레이션** (사용자 영향):
  - `import ... from '@jogak/react'` → `import ... from '@jogak/core/renderers/react'`
  - `import ... from '@jogak/next'` → `import ... from '@jogak/core/renderers/next'`
  - `import ... from '@jogak/web-components'` → `import ... from '@jogak/core/renderers/web-components'`
  - `import { jogak } from '@jogak/core/vite'` → `import { jogak } from '@jogak/core/vite-plugin'` (구 경로도 동작하지만 deprecated)
- **`@jogak/core` peer deps 확장**: react/react-dom/next/webpack/webpack-dev-server/webpack-merge/html-webpack-plugin 추가 (모두 optional). 사용자가 쓰는 빌더만 설치.
- **iframe scaffold 코드** (next-adapter, webpack-adapter): 생성되는 page.tsx/preview-entry.tsx가 `@jogak/core/renderers/react`를 import (이전 `@jogak/react`).

### Removed

- 7개 패키지 디렉토리 + npm registry deprecate notice:
  - `@jogak/react`, `@jogak/next`, `@jogak/web-components`
  - `@jogak/vite-adapter`, `@jogak/next-adapter`, `@jogak/webpack-adapter`, `@jogak/standalone-adapter`
- 알파.9.x 사용자는 `npm view @jogak/<pkg> deprecated` 메시지로 마이그레이션 안내 받음.

### CI

- `release.yml`: pack/publish 목록을 `core/ui/cli` 3개로 축소. Trusted Publisher 신규 등록 zero (3개 모두 알파.9 시점 등록 완료).

## [0.1.0-alpha.9.2] — 2026-05-09

### Fixed

- **CI**: `release.yml`의 publish 단계가 `jogak-next-*.tgz` 글로브 패턴을 사용해 `next` 패키지 publish 시 `next-adapter` tarball까지 매치되어 npm publish가 EUSAGE(다중 tarball)으로 실패. 이로 인해 알파.9.1에서 `core/react/ui/web-components`만 publish되고 `next/cli` 및 4개 어댑터는 publish 안 됨. 정확한 파일명(`jogak-${pkg}-${VERSION}.tgz`)으로 변경.

기타 패키지: source 변경 없음, synchronized release 유지를 위해 버전만 bump.

## [0.1.0-alpha.9.1] — 2026-05-09

### Fixed

- **CI**: `release.yml`의 pack 단계가 `core/react/ui/web-components/next/cli`만 포함했고 알파.9에서 신규 추가된 4개 어댑터(`vite-adapter` / `next-adapter` / `webpack-adapter` / `standalone-adapter`)를 누락. v0.1.0-alpha.9 태그로 부분 publish됐으나 어댑터들이 npm에 올라가지 않아 사용자가 import 불가. 4개 어댑터를 pack 목록에 추가 후 alpha.9.1로 재발행.

기타 패키지: source 변경 없음, synchronized release 유지를 위해 버전만 bump.

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
