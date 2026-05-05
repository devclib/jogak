# benchmarks

Jogak의 자체 측정 코드. README의 "성능 우위" 주장을 수치로 뒷받침한다.

> 비교 대상(Storybook/Ladle/Histoire) 셋업은 별도 작업으로 분리. 현재는 Jogak 자체 수치만 측정한다.

## 실행

```bash
pnpm bench               # 전체 (bundle + extract + cold-start) → benchmarks/last-run.md 저장
pnpm bench:bundle        # 패키지 빌드 시간 + dist 합계 + js gzip 크기
pnpm bench:extract       # ts-morph Project init + 파일별 props 추출 시간
pnpm bench:cold-start    # dev server 시작 → 첫 200 응답까지 시간
```

### 환경 변수

| 변수 | 효과 | 기본 |
|------|------|------|
| `JOGAK_BENCH_RUNS` | cold-start 반복 횟수 (median 계산) | `3` |
| `JOGAK_BENCH_CLEAN` | cold-start 전 vite/.next 캐시 삭제 (`1`이면 진짜 cold) | off |
| `JOGAK_BENCH_SKIP_BUNDLE` | `pnpm bench`에서 bundle 단계 스킵 | off |
| `JOGAK_BENCH_SKIP_COLD` | `pnpm bench`에서 cold-start 단계 스킵 | off |

## 측정 항목

| 항목 | 의미 |
|------|------|
| **bundle build_ms** | 각 패키지의 build 명령 실행 시간 |
| **bundle dist_kb** | 빌드 산출물 디렉토리 합계 크기 (모든 파일) |
| **bundle js_gzip_kb** | `.mjs/.cjs/.js` 파일들의 gzip 합계 (배포 전송 크기 근사) |
| **extract init_ms** | ts-morph `Project` 1회 초기화 시간 (tsconfig + 파일 인덱싱) |
| **extract per file_ms** | 한 jogak 파일의 props 추출 시간 |
| **cold start ms** | `dev` 명령 spawn → `GET <url>` 첫 200 응답까지의 wallclock |

## 측정 후보 (추후)

- **메모리**: dev server idle 상태에서의 RSS
- **HMR latency**: jogak 파일 한 글자 수정 → 프리뷰 반영까지의 시간 (Playwright + watcher)
- **Storybook/Ladle/Histoire 비교**: 동일 카탈로그를 각 도구로 셋업해 위 항목 동일 측정

## 결과

`pnpm bench` 실행 결과는 `benchmarks/last-run.md`에 markdown으로 저장된다 (`.gitignore` 처리).
참고용 결과 스냅샷은 별도 `benchmarks/results/<date>.md` 형태로 commit 가능하다.
