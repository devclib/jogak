# benchmarks

Jogak의 자체 측정 코드. README의 "성능 우위" 주장을 수치로 뒷받침한다.

## 실행

```bash
pnpm bench               # 전체 (bundle + extract + cold-start + baseline 비교) → benchmarks/last-run.md 저장
pnpm bench:bundle        # 패키지 빌드 시간 + dist 합계 + js gzip 크기
pnpm bench:extract       # ts-morph Project init + 파일별 props 추출 시간
pnpm bench:cold-start    # dev server 시작 → 첫 200 응답까지 시간
pnpm bench:baseline      # Jogak vs Storybook 동일 카탈로그 비교만 실행 (빠름)
```

### 환경 변수

| 변수 | 효과 | 기본 |
|------|------|------|
| `JOGAK_BENCH_RUNS` | cold-start 반복 횟수 (median 계산) | `3` |
| `JOGAK_BENCH_CLEAN` | cold-start 전 vite/.next 캐시 삭제 (`1`이면 진짜 cold) | off |
| `JOGAK_BENCH_SKIP_BUNDLE` | `pnpm bench`에서 패키지 bundle 단계 스킵 | off |
| `JOGAK_BENCH_SKIP_EXTRACT` | `pnpm bench`에서 props 추출 단계 스킵 | off |
| `JOGAK_BENCH_SKIP_COLD` | `pnpm bench`에서 cold-start 단계 스킵 | off |
| `JOGAK_BENCH_ONLY_BASELINE` | 패키지 빌드/extract 스킵 + cold-start은 baseline만 측정 | off |

## 측정 항목

| 항목 | 의미 |
|------|------|
| **bundle build_ms** | 각 패키지의 build 명령 실행 시간 |
| **bundle dist_kb** | 빌드 산출물 디렉토리 합계 크기 (모든 파일) |
| **bundle js_gzip_kb** | `.mjs/.cjs/.js` 파일들의 gzip 합계 (배포 전송 크기 근사) |
| **extract init_ms** | ts-morph `Project` 1회 초기화 시간 (tsconfig + 파일 인덱싱) |
| **extract per file_ms** | 한 jogak 파일의 props 추출 시간 |
| **cold start ms** | `dev` 명령 spawn → `GET <url>` 첫 200 응답까지의 wallclock |

## Jogak vs Storybook 비교 (동일 카탈로그)

`benchmarks/baselines/`에 동일한 React 컴포넌트 5종(Button/Card/Input/Modal/Pill)을 양쪽 도구로 셋업.

```
benchmarks/baselines/
├── shared/components/      # 공통 컴포넌트 (양쪽 도구가 import)
├── jogak/                  # @jogak/cli로 셋업 (jogak dev / jogak build)
└── storybook/              # @storybook/react-vite (Vite builder)로 셋업
```

공정성 보장:

- 같은 컴포넌트 코드 (workspace symlink로 `shared/components/`를 양쪽이 import)
- 같은 entry 수: 5 컴포넌트 × 2~3 variant
- 같은 builder: 양쪽 모두 Vite 6.x
- 같은 노드 버전 / 같은 OS / 동일 측정 코드(`bundle-size.mjs`, `cold-start.mjs`)

비교 대상 명령:

| 측정 항목 | Jogak | Storybook |
|---|---|---|
| dev server | `pnpm --filter baseline-jogak exec jogak dev --port 5182` | `pnpm --filter baseline-storybook exec storybook dev -p 6006 --no-open` |
| build | `pnpm --filter baseline-jogak exec jogak build --out-dir jogak-static` | `pnpm --filter baseline-storybook exec storybook build -o storybook-static` |

빠르게 비교 수치만 보고 싶다면:

```bash
JOGAK_BENCH_ONLY_BASELINE=1 JOGAK_BENCH_RUNS=1 pnpm bench
```

## 카탈로그 규모별 비교 (scale)

작은 카탈로그(5개)에서 두 도구의 차이가 작게 나오는 것이 도구의 한계인지 카탈로그 크기의 문제인지 분리해 측정한다.
fixture generator가 size N개 컴포넌트 + 3 entries/stories를 양쪽에 동일하게 생성, size별로 cold start / build / bundle / ts-morph extract를 측정한다.

```bash
pnpm bench:scale         # 기본: sizes=5,50,100, cold-runs=2
pnpm bench:scale:full    # sizes=5,50,100,500 (시간 오래 걸림)

# 환경변수로 직접 지정
JOGAK_BENCH_SIZES=50,100 JOGAK_BENCH_RUNS=2 node benchmarks/run-scale.mjs
JOGAK_BENCH_SIZES=5,50,100,500 JOGAK_BENCH_INCLUDE_500=1 node benchmarks/run-scale.mjs
```

| 변수 | 효과 | 기본 |
|------|------|------|
| `JOGAK_BENCH_SIZES` | 측정할 컴포넌트 수 (콤마 구분) | `'5,50,100'` |
| `JOGAK_BENCH_INCLUDE_500` | `1`이면 500도 측정 (sizes에 500 포함시 자동 활성) | off |
| `JOGAK_BENCH_RUNS` | size별 cold-start 반복 횟수 | `2` |

생성되는 fixture는 `.gitignore` 처리 (size별로 매번 재생성):
- `benchmarks/baselines/shared/components/generated/`
- `benchmarks/baselines/jogak/src/generated/`
- `benchmarks/baselines/storybook/src/generated/`

결과: `benchmarks/last-run-scale.md` (markdown), `benchmarks/last-run-scale.json` (raw).
참고용 스냅샷은 `_workspace/03_test-report/step-d-scale.md`.

## 결과

`pnpm bench` 실행 결과는 `benchmarks/last-run.md`에 markdown으로 저장된다 (`.gitignore` 처리).
`pnpm bench:scale` 결과는 `benchmarks/last-run-scale.md`/`.json`에 저장.
참고용 결과 스냅샷은 `_workspace/03_test-report/step-b-baseline.md` (작은 카탈로그) 와 `_workspace/03_test-report/step-d-scale.md` (스케일링).
