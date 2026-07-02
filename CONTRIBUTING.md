# Contributing to Jogak

Jogak은 Storybook을 대체하는 경량 컴포넌트 쇼케이스 라이브러리입니다. 기여를 환영합니다.

## 개발 환경

```bash
git clone https://github.com/devclib/jogak.git
cd jogak
pnpm install
pnpm build
pnpm test
pnpm typecheck
```

**요구사항**: Node 20+, pnpm 10+.

## 프로젝트 구조

- `packages/core/` — 타입, 레지스트리, Vite plugin, 어댑터 (react/next/vue/svelte/web-components 5종)
- `packages/ui/` — Chrome UI (Sidebar/Preview/Controls/Actions/A11yPanel)
- `packages/cli/` — `jogak` CLI (`init`, `dev`, `build`, `generate`)
- `examples/` — framework별 실 프로젝트 예시
- `test-case/` — 실 사용 검증 프로젝트 (jogak-react-shop 등)
- `website/` — 문서 사이트 (Next + fumadocs)
- `benchmarks/` — bundle-size, cold-start, RSS 측정

## Branch 규칙

**항상 feature branch에서 작업합니다. `main` 직접 편집 금지.**

Branch 명명 규칙:
- `feat/<slug>` — 신규 기능
- `fix/<slug>` — 버그 수정
- `docs/<slug>` — 문서 변경
- `chore/<slug>` — 인프라/의존성

## PR 작성

1. 새 branch 생성 → 변경 → CI 통과 확인
2. PR 제목은 conventional commit 스타일:
   - `feat(themes): plugin이 themes를 chrome scope에 emit`
   - `fix(mdx-prose): join('\n') 이스케이프 회귀 수정`
3. 본문에 **why + how**를 명확히
4. Breaking change는 반드시 명시 (semver major bump 필요)

## Commit 원칙 (Karpathy 4원칙)

이 프로젝트는 다음 4원칙을 상시 적용합니다 (`CLAUDE.md` 참조):

1. **Think Before Coding** — 트레이드오프를 드러내고 정공법 우선
2. **Simplicity First** — 요청되지 않은 기능/추상화 지양
3. **Surgical Changes** — 변경 라인이 요청과 1:1 추적 가능
4. **Goal-Driven Execution** — 검증 가능한 성공 기준 후 반복

## 테스트

- Unit: `pnpm test` (Vitest, 133+ tests)
- E2E: `pnpm test:e2e` (Playwright)
- Visual regression: `pnpm test:visual`
- Framework smoke: `e2e/framework-smoke.mjs` (Vue/Svelte/React/Next/WC)

새 기능 추가 시 회귀 가드 test를 함께 작성해주세요 (예: `PlayResultBanner.test.tsx`).

## Publish 프로세스

Publish는 maintainer 권한으로 자동화되어 있습니다:

1. `main`에 release commit + `v<version>` tag push
2. `.github/workflows/release.yml`이 3 패키지 (core/ui/cli) 순차 npm publish
3. 태그의 preid (alpha/beta/rc/stable)에 따라 dist-tag 자동 promote

Contributor는 PR만 열면 됩니다. Publish 관련 문의는 이슈로 남겨주세요.

## 문의/토론

- **버그 리포트 / 기능 제안**: [GitHub Issues](https://github.com/devclib/jogak/issues)
- **질문 / 아이디어 논의**: [GitHub Discussions](https://github.com/devclib/jogak/discussions) (활성화 예정)
- **Storybook 마이그레이션 관련**: `/docs/migration-from-storybook`

## License

MIT. `LICENSE` 파일 참조.
