/**
 * 사용자 tsconfig의 `compilerOptions.paths`를 vite `resolve.alias`로 변환한다.
 *
 * 동기:
 * - `runHost`는 vite root를 `@jogak/ui` 패키지로 두고 사용자 `vite.config.ts`를
 *   무시하므로(`configFile: false`), 사용자가 정의한 alias가 적용되지 않는다.
 * - shadcn/ui 같은 라이브러리는 `@/lib/utils` 같은 alias를 컴포넌트 안에서
 *   사용하고, 사용자가 작성한 `*.jogak.tsx`도 같은 alias로 컴포넌트를 import.
 * - 따라서 jogak이 사용자의 path alias를 자동으로 인식하지 못하면 dev/build에서
 *   "Failed to resolve import" 에러가 난다.
 *
 * 처리 범위:
 * - 단순 prefix 매핑: `"@/*": ["./src/*"]` → `{ "@": "<baseDir>/src" }`
 * - references로 분할된 tsconfig (Vite 기본 스캐폴드 = `tsconfig.json` +
 *   `tsconfig.app.json`): 후보 경로 두 개 모두 시도하고 먼저 발견된 매핑을 채택.
 *
 * 미처리 (의도적):
 * - `extends` 체인: TypeScript Compiler API를 부모 V8에 로드하기 부담이 커서
 *   단순 정규식 + JSON 파싱으로 처리. 대부분의 사용자 케이스(scaffold default,
 *   shadcn/ui)는 references 패턴이라 본 범위에서 충분.
 * - 복합 glob 패턴: 두 개 이상의 와일드카드를 포함하는 매핑은 처리하지 않는다.
 *
 * 자동 추출이 실패하면 `JogakPluginOptions.resolveAlias`로 명시적 alias를
 * 전달할 수 있다 (사용자 fallback).
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

interface MinimalTsConfig {
  readonly compilerOptions?: {
    readonly baseUrl?: string
    readonly paths?: Readonly<Record<string, readonly string[]>>
  }
}

/**
 * JSONC(주석 허용 JSON) 텍스트를 단순화한 JSON 문자열로 변환한다.
 *
 * 단순 정규식 기반:
 * - `/* ... *\/` 블록 주석 제거
 * - `// ...` 라인 주석 제거 (라인 시작 또는 공백 뒤만 — 문자열 안의 // 보호 의도)
 *
 * trailing comma는 그대로 둔다 — JSON.parse가 실패하면 호출자에서 무시한다.
 */
function stripJsonComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
}

function tryReadTsConfig(configPath: string): MinimalTsConfig | undefined {
  if (!existsSync(configPath)) return undefined
  try {
    const raw = readFileSync(configPath, 'utf8')
    return JSON.parse(stripJsonComments(raw)) as MinimalTsConfig
  } catch {
    return undefined
  }
}

/**
 * `paths` 항목 하나를 vite alias 한 쌍으로 변환.
 * 단순 prefix 매핑(`"<key>/*"` → `["<target>/*"]`)만 처리.
 */
function pathEntryToAlias(
  key: string,
  target: string,
  baseDir: string,
): readonly [string, string] | undefined {
  if (!key.endsWith('/*') || !target.endsWith('/*')) return undefined
  const aliasKey = key.slice(0, -2)
  const targetPath = resolve(baseDir, target.slice(0, -2))
  return [aliasKey, targetPath]
}

/**
 * 사용자 tsconfig 후보 경로들에서 paths를 추출해 alias 맵으로 합친다.
 *
 * @param primaryTsConfig 사용자가 명시했거나 자동 감지된 1차 tsconfig 절대 경로
 * @param userRoot        사용자 프로젝트 루트 — references 분할 시 fallback 후보 위치 계산용
 */
export function readTsConfigAlias(
  primaryTsConfig: string,
  userRoot: string,
): Readonly<Record<string, string>> {
  const result: Record<string, string> = {}

  // 1차 후보 + Vite 기본 스캐폴드 fallback (tsconfig.app.json).
  const candidates = new Set<string>([
    primaryTsConfig,
    resolve(userRoot, 'tsconfig.app.json'),
  ])

  for (const candidate of candidates) {
    const cfg = tryReadTsConfig(candidate)
    if (cfg === undefined) continue
    const paths = cfg.compilerOptions?.paths
    if (paths === undefined) continue

    const baseUrlOpt = cfg.compilerOptions?.baseUrl ?? '.'
    const baseDir = resolve(dirname(candidate), baseUrlOpt)

    for (const [key, targets] of Object.entries(paths)) {
      const target = targets[0]
      if (target === undefined) continue
      const pair = pathEntryToAlias(key, target, baseDir)
      if (pair === undefined) continue
      const [aliasKey, aliasValue] = pair
      // 1차 후보가 우선 — 이미 기록된 키는 덮어쓰지 않는다.
      if (result[aliasKey] === undefined) {
        result[aliasKey] = aliasValue
      }
    }
  }

  return result
}
