---
name: jogak-dev-orchestrator
description: "Jogak 라이브러리(스토리북 대체 쇼케이스 도구) 개발 전체를 조율하는 오케스트레이터. 새 기능 추가, 버그 수정, 어댑터 개발, Props 추출, 쇼케이스 UI 개선, 프레임워크 지원 추가, 테스트/벤치마크 실행 등 Jogak 관련 모든 개발 작업에 반드시 이 스킬을 사용. 후속 작업(Jogak 수정, 보완, 다시 실행, 업데이트, 특정 패키지만, 이전 결과 기반으로 개선)도 이 스킬로 처리."
---

# Jogak Dev Orchestrator

Jogak 라이브러리 개발의 전체 흐름을 조율한다.
- **목적**: TypeScript + React 기반, React SPA / Next.js SSR+SC / Vanilla JS(Web Components) 지원 쇼케이스 도구 개발
- **빌드 도구**: Vite / pnpm workspaces 모노레포

## 실행 모드: 하이브리드

| Phase | 모드 | 이유 |
|-------|------|------|
| Phase 1 (API 설계) | 서브 에이전트 | architect 단독 작업, 팀 통신 불필요 |
| Phase 2 (구현) | 에이전트 팀 | core ↔ ui ↔ adapter 간 실시간 API 협의 필요 |
| Phase 3 (테스트/QA) | 서브 에이전트 | test-qa 독립 검증, 팀 통신 불필요 |

## 에이전트 구성

| 에이전트 | 타입 | 역할 | 출력 위치 |
|---------|------|------|----------|
| architect | architect | API 계약, 패키지 경계 | `_workspace/01_arch/api-contracts.md` |
| core-dev | core-dev | 레지스트리, Vite 플러그인, Props 추출 | `packages/core/src/` |
| ui-dev | ui-dev | 쇼케이스 뷰어 UI | `packages/ui/src/` |
| adapter-dev | adapter-dev | React/Next.js/WC 어댑터 | `packages/{react,next,web-components}/src/` |
| test-qa | test-qa | 단위/시각적/성능/크로스 프레임워크 테스트 | `_workspace/03_test-report/` |

## 워크플로우

### Phase 0: 컨텍스트 확인

1. `_workspace/` 존재 여부 확인
2. 실행 모드 결정:
   - `_workspace/` 없음 → **초기 실행**, Phase 1로 진행
   - `_workspace/` 있음 + 부분 수정 요청 → **부분 재실행**, 해당 에이전트만 재호출
   - `_workspace/` 있음 + 새 입력/기능 → **새 실행**, 기존 `_workspace/`를 `_workspace_{YYYYMMDD_HHMMSS}/`로 이동 후 Phase 1
3. **영향 범위(impact zone) 파악:**
   | 키워드 패턴 | Impact Zone |
   |-----------|------------|
   | 레지스트리, 파서, Vite 플러그인, Props 추출, HMR | `core` |
   | 사이드바, 프리뷰, Props 컨트롤러, 문서 뷰어, UI | `ui` |
   | React 어댑터, Next.js, SSR, Server Component, Web Component, Vanilla | `adapter` |
   | 테스트, 벤치마크, 성능, 회귀, QA | `test-only` |
   | 불명확 또는 전체 기능 | 전체 (`core` + `ui` + `adapter`) |

### Phase 1: API 설계
**실행 모드:** 서브 에이전트

`test-only` 모드일 때는 Phase 1을 건너뛴다.

```
Agent(
  subagent_type: "architect",
  model: "opus",
  prompt: "
    Jogak 라이브러리의 다음 기능을 위한 API 계약을 설계하라: {요청 내용}
    영향 범위: {impact zones}

    반드시 먼저 확인:
    - _workspace/01_arch/api-contracts.md (기존 계약, 있으면 읽고 일관성 유지)
    - packages/ 디렉토리 (기존 구현이 있으면 실제 코드 확인)

    출력: _workspace/01_arch/api-contracts.md
    - TypeScript 인터페이스 코드 블록
    - 패키지 경계 다이어그램
    - 각 결정의 설계 이유
  "
)
```

### Phase 2: 구현 팀
**실행 모드:** 에이전트 팀

impact zone에 따라 필요한 팀원만 선택한다.

```
TeamCreate(
  team_name: "jogak-impl-team",
  members: [
    // core zone 포함 시
    {
      name: "core-dev",
      agent_type: "core-dev",
      model: "opus",
      prompt: "
        API 계약을 읽고 core 패키지를 구현하라.
        계약: _workspace/01_arch/api-contracts.md
        기존 코드가 있으면 Read로 먼저 확인 후 수정.
        구현 가이드: .claude/skills/implement-showcase/SKILL.md
      "
    },
    // ui zone 포함 시
    {
      name: "ui-dev",
      agent_type: "ui-dev",
      model: "opus",
      prompt: "
        API 계약과 core-dev의 레지스트리 API를 바탕으로 쇼케이스 뷰어 UI를 구현하라.
        계약: _workspace/01_arch/api-contracts.md
        core-dev의 API 확정 알림을 기다리되, 그 전에 Mock 데이터로 UI 구조를 먼저 완성하라.
        구현 가이드: .claude/skills/implement-showcase/SKILL.md
      "
    },
    // adapter zone 포함 시
    {
      name: "adapter-dev",
      agent_type: "adapter-dev",
      model: "opus",
      prompt: "
        core API를 기반으로 {해당 프레임워크} 어댑터를 구현하라.
        계약: _workspace/01_arch/api-contracts.md
        구현 가이드: .claude/skills/implement-adapter/SKILL.md
      "
    }
  ]
)
```

작업 등록 (팀원 수에 맞게 조정):
```
TaskCreate(tasks: [
  { title: "레지스트리 구현", assignee: "core-dev", description: "ComponentRegistry + 스토리 파서" },
  { title: "Vite 플러그인 구현", assignee: "core-dev", depends_on: ["레지스트리 구현"] },
  { title: "Props 추출기 구현", assignee: "core-dev", depends_on: ["레지스트리 구현"] },
  { title: "사이드바 구현", assignee: "ui-dev", depends_on: ["레지스트리 구현"] },
  { title: "프리뷰 패널 구현", assignee: "ui-dev" },
  { title: "Props 컨트롤러 구현", assignee: "ui-dev", depends_on: ["Props 추출기 구현"] },
  { title: "React SPA 어댑터", assignee: "adapter-dev" },
  { title: "Next.js 어댑터", assignee: "adapter-dev" },
  { title: "Web Components 어댑터", assignee: "adapter-dev" }
])
```

**팀원 간 통신 규칙:**
- core-dev는 레지스트리 API 확정 즉시 → ui-dev, adapter-dev에게 SendMessage + 사용 예시 제공
- ui-dev는 필요한 추가 데이터 구조 발견 시 → core-dev에게 SendMessage
- adapter-dev는 core API 적합성 문제 발견 시 → core-dev에게 즉시 SendMessage
- 리더(오케스트레이터)는 TaskGet으로 진행 상황 모니터링, 팀원이 유휴 상태가 되면 SendMessage로 상태 확인

### Phase 3: 테스트 & QA
**실행 모드:** 서브 에이전트

Phase 2에서 팀이 있었다면 먼저 TeamDelete로 팀을 정리한다.

```
Agent(
  subagent_type: "test-qa",
  model: "opus",
  prompt: "
    Jogak 라이브러리의 전체 테스트 수트를 실행하라.
    영향 범위: {impact zones}
    API 계약: _workspace/01_arch/api-contracts.md
    테스트 가이드: .claude/skills/test-and-qa/SKILL.md

    출력:
    - 단위 테스트: packages/*/src/__tests__/
    - E2E/시각적 회귀: e2e/
    - 성능 기준선: benchmarks/baseline.json (없으면 새로 생성)
    - 결과 요약: _workspace/03_test-report/summary.md
  "
)
```

### Phase 4: 정리 및 보고

1. `_workspace/03_test-report/summary.md` 읽기
2. 사용자에게 요약 보고:
   - 구현된 기능/변경사항 목록
   - 테스트 통과/실패 수 (실패 시 원인 요약)
   - 성능 수치 (기준선 대비 변화율)
   - 번들 크기 변화
   - 다음 단계 제안

## 데이터 흐름

```
사용자 요청
    ↓
Phase 0: impact zone 파악
    ↓
Phase 1: [architect 서브] → _workspace/01_arch/api-contracts.md
    ↓
Phase 2: [구현 팀]
  core-dev ←SendMessage→ ui-dev
  core-dev ←SendMessage→ adapter-dev
    ↓ (파일 기반 산출물)
  packages/*/src/
    ↓ (TeamDelete)
Phase 3: [test-qa 서브] → _workspace/03_test-report/
    ↓
Phase 4: 사용자 보고
```

## 에러 핸들링

| 상황 | 전략 |
|------|------|
| architect 서브 실패 | 1회 재시도. 재실패 시 사용자에게 요구사항 명확화 요청 |
| 팀원 1명 실패 | SendMessage로 상태 확인 → 재시작 or 기존 작업 다른 팀원에게 재할당 |
| 팀원 과반 실패 | 사용자에게 알리고 진행 여부 확인 |
| 테스트 실패 | 실패 내용을 해당 개발 에이전트에게 전달 → 부분 재실행 |
| API 계약 충돌 | architect 재호출하여 충돌 해소 후 구현 재개 |
| 타임아웃 | 현재까지 완성된 부분 결과 사용, 미완료 항목을 보고서에 명시 |

## 테스트 시나리오

### 정상 흐름
1. "컴포넌트 Props 자동 추출 기능 추가" 요청
2. Phase 0: `_workspace/` 없음 → 초기 실행, impact zone: `core` + `ui`
3. Phase 1: architect가 `PropsMetadata` 인터페이스 설계
4. Phase 2: core-dev가 ts-morph 기반 추출기 구현 → ui-dev에게 API 알림 → ui-dev가 Props 테이블 구현
5. Phase 3: test-qa가 12개 단위 테스트 + 시각적 회귀 실행, 전부 통과
6. Phase 4: "Props 추출 + Props 테이블 구현 완료, 테스트 12/12, 번들 +2.3KB"

### 에러 흐름
1. "Next.js Server Component 지원 추가" 요청
2. Phase 2: adapter-dev가 Server Component에서 `useContext` 사용 불가 문제 발견
3. adapter-dev → core-dev에게 SendMessage: "컨텍스트 전달 방식 변경 필요"
4. core-dev가 props-based 방식으로 설계 변경, architect에게도 알림
5. Phase 3: test-qa가 Next.js SSR 테스트 중 hydration 불일치 감지 → 보고서에 명시
6. Phase 4: "Next.js 어댑터 구현 완료, hydration 이슈 1건 발견 — 상세: _workspace/03_test-report/"
