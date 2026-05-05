# benchmarks

성능 벤치마크 placeholder. README의 "Storybook 대비 성능 우위" 주장을 수치로 검증하기 위한 측정 코드가 들어갈 자리이다.

## 측정 후보

- **cold start**: 호스트 dev server가 `/jogak` 페이지를 처음 응답할 때까지의 시간 (Next/Vite)
- **메모리**: dev server idle 상태에서의 RSS
- **HMR latency**: jogak 파일 한 글자 수정 → 프리뷰 반영까지의 시간
- **번들 크기**: 프로덕션 빌드 시 `JogakApp` + 어댑터의 gzip 크기
- **props 추출 시간**: `*.jogak.tsx` 파일 N개에 대한 ts-morph 추출 누적 시간 (codegen)

## 비교 대상

- Storybook 8.x (Vite preset)
- Ladle
- Histoire

각 항목은 동일한 카탈로그(현재 ui/examples 또는 next-demo의 컴포넌트)를 기준으로 측정해야 한다.
