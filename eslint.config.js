// eslint.config.js
//
// 알파.5 PR 4 — flat config 도입 (ESLint v9 + typescript-eslint v8).
// 본 PR의 유일한 목적: jogak:className 사용을 강제하기 위해 inline style forbid rule 도입.
// react / jsx-a11y / import-x preset 도입은 알파.6 이후 별도 PR.
//
// 화이트리스트 처리: // eslint-disable-next-line no-restricted-syntax -- jogak: <카테고리>
// (PR 3 보고서 §10.1 12건 표 → 본 PR 후 11건)

import tseslint from 'typescript-eslint'

export default [
  // 글로벌 ignore. dist / node_modules / playwright artifact / next 빌드 산출물 제외.
  //
  // spec §3 외 추가 결정 (보고서 § "spec과 다른 결정"):
  //   - packages/ui/src/examples/**       — 쇼케이스 fixture(사용자 컴포넌트 시뮬레이션). jogak inline style forbid 검사 대상 밖.
  //   - apps/**                           — 사용자 데모 앱. jogak 라이브러리 코드가 아님.
  //   - examples/**                       — 외부 공개용 starter (npm install 패턴). 사용자 환경 모방이므로 inline style 자유.
  //   - benchmarks/baselines/**           — 외부 도구(storybook 등) 빌드 산출물 비교용 baseline.
  //   - benchmarks/**/dist/**             — 벤치마크 빌드 산출물.
  //   - **/storybook-static/**            — storybook 빌드 산출물 (위 baselines 안에 위치).
  //   - **/.eslint-bin-cache.js 등 모두 **/dist/** 패턴으로 처리.
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.next/**',
      '**/playwright-report/**',
      '**/test-results/**',
      'benchmarks/.cache/**',
      'benchmarks/baselines/**',
      'packages/ui/src/examples/**',
      'apps/**',
      'examples/**',
      'test-case/**',
      'website/**',
    ],
  },

  // ESLint v9: 미설치 plugin 의 rule 을 disable directive 로 참조하는 경우 default 로 error.
  // 본 PR 은 react-hooks plugin 미도입(spec §2.1 옵션 A)이지만 PR 1~3 에서 작성한 코드가
  // 기존에 `// eslint-disable-next-line react-hooks/exhaustive-deps` 주석을 포함하고 있음.
  // dummy `react-hooks` plugin 을 빈 rules 로 등록 → unknown rule 에러 차단.
  // unused directive 도 off → "unused eslint-disable" 잡음 무시.
  // 알파.6 에서 실제 eslint-plugin-react-hooks 도입 시 본 dummy 제거.
  {
    plugins: {
      // dummy `react-hooks` plugin: rule 자체를 noop 으로 등록하여 disable directive 의
      // unknown rule 에러를 차단. 실제 검증 로직은 zero (algorithm 미구현).
      'react-hooks': {
        rules: {
          'exhaustive-deps': {
            meta: { type: 'problem', schema: [] },
            create() {
              return {}
            },
          },
        },
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
  },

  // TypeScript / TSX 파일에만 본 rule 적용.
  // parser 만 typescript-eslint, plugin/preset 미적용 (PR 4 §2.1 옵션 A — 최소).
  // typescript-eslint v8: configs.base 는 단일 ConfigArray 객체이므로 그대로 포함.
  tseslint.configs.base,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='style']",
          message:
            'jogak: inline style 금지. jogak:className 사용. CSS var 주입 등 화이트리스트는 // eslint-disable-next-line no-restricted-syntax -- jogak: <카테고리> 형태로 명시.',
        },
      ],
    },
  },
]
