/**
 * 알파.10: jogak host vite plugin entry.
 *
 * 알파.9까지 `@jogak/core/vite`로 노출됐던 플러그인. alpha.10에서는
 * `@jogak/core/vite-plugin`으로 정식 노출되며 `@jogak/core/vite`도 별칭으로 유지된다.
 *
 * 이 플러그인은 jogak host SPA의 vite scope에서 동작 — `*.jogak.tsx` 글롭 디스커버리,
 * 가상 모듈(`virtual:jogak`, `virtual:jogak/entry/*`) emit, HMR self-accept 등을
 * 담당한다. 사용자 vite scope의 preview-frame plugin은 별개로
 * `@jogak/core/adapters/vite`가 보유한다.
 */

export * from './plugin.js'
