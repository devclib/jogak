// `.vue` SFC를 TypeScript에 인식시키는 ambient shim — Vue 표준 패턴.
// tsc 단독 typecheck 환경(vue-tsc 미사용)에서도 import resolve 가능.
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}
