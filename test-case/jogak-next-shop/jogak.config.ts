import { defineJogakConfig } from '@jogak/core'

// Next 16 환경 jogak.config:
// - globalCss 옵션 제외 — jogak scaffold가 emit하는 import 경로는 이전 PR로 상대화됐지만
//   본 test-case는 사용자 layout.tsx에서 globals.css 직접 import 패턴 유지.
// - previewIsolation 명시 안 함 — default 'iframe'. 'none' 명시 시 chrome scope에서
//   사용자 코드(top-level await 포함 가능)를 직접 import해 esbuild es2020 target에서 fail.
//   사용자 vite 없는 Next 환경의 chrome scope component=null은 jogak 본체 후속 결함으로
//   분리 (memory: project_jogak_next_chrome_null).
export default defineJogakConfig({})
