/**
 * 알파.14.1: Vue SFC(`.vue`) 파일의 props를 자동으로 PropsMetadata로 추출한다.
 *
 * 접근 방식:
 * 1. `@vue/compiler-sfc`의 `parse(source)`로 SFC descriptor 획득
 * 2. `descriptor.scriptSetup` (`<script setup lang="ts">`)의 본문을 추출
 * 3. 추출된 TS 본문을 ts-morph의 in-memory project에 가상 파일로 주입
 * 4. `defineProps<TypeRef>()` 또는 `defineProps<{ inline: ... }>()` 호출의
 *    type argument를 찾아 React 추출과 동일한 매핑 룰을 적용
 *
 * 결과 shape: alpha.12 React props 추출(`extract-core.ts`)과 1:1 — `ArgType` map.
 *
 * 격리:
 * - `@vue/compiler-sfc`는 dynamic import. 사용자가 vue를 설치하지 않은 환경에서는
 *   import가 실패해 `extractFromVueFile`가 빈 결과를 돌려준다 (회귀 zero).
 * - React-only 사용자는 그대로 동작 — vite plugin에서 `.vue` 파일이 jogak 패턴에
 *   포함되지 않으면 본 모듈은 로드되지 않는다.
 */
import { createRequire } from 'node:module'
import {
  Node,
  Project,
  type CallExpression,
  type Type,
  type TypeNode,
} from 'ts-morph'
import type { ArgType } from '../types.js'

/**
 * Vue SFC compiler 인터페이스. 우리는 `parse`만 사용한다.
 *
 * `@vue/compiler-sfc`는 vue 패키지의 의존이라 vue가 설치되어 있으면 같이 들어온다.
 * dynamic import로 처리해 미설치 환경에서도 안전하게 fallback.
 */
interface VueSfcDescriptor {
  readonly scriptSetup: { readonly content: string; readonly lang?: string } | null
  readonly script: { readonly content: string; readonly lang?: string } | null
}

interface VueSfcCompiler {
  parse(source: string): { descriptor: VueSfcDescriptor }
}

let cachedCompiler: VueSfcCompiler | undefined | null = undefined
const localRequire = createRequire(import.meta.url)

/**
 * Vue SFC compiler를 동기 require로 로드한다. 사용자가 vue를 install했다면
 * sfc compiler도 같이 들어온다 (vue 자체가 `vue/compiler-sfc` subpath로 re-export).
 *
 * 후보 specifier:
 * 1. `@vue/compiler-sfc` (peer로 직접 install한 경우 — Vue 메인 프로젝트 추천)
 * 2. `vue/compiler-sfc` (vue 패키지의 subpath export — 사용자가 vue만 install해도 동작)
 *
 * Node CJS의 require는 sync이므로 `extract`를 동기 함수로 유지할 수 있다 — child
 * 프로세스 IPC가 async라 sync 로딩이 IPC 응답 latency에 영향 없음.
 *
 * 미설치 환경: 둘 다 실패 → null cache. 이후 호출 시 즉시 빈 결과 반환 (회귀 zero).
 */
function loadCompilerSync(): VueSfcCompiler | null {
  if (cachedCompiler !== undefined) return cachedCompiler
  for (const specifier of ['@vue/compiler-sfc', 'vue/compiler-sfc']) {
    try {
      const mod = localRequire(specifier) as VueSfcCompiler
      cachedCompiler = mod
      return mod
    } catch {
      // try next
    }
  }
  cachedCompiler = null
  return null
}

export interface ExtractVueOptions {
  /** SFC source. 호출자가 fs.read하거나 in-memory source를 주입. */
  readonly source: string
  /** 디버깅용 가상 파일 경로 — ts-morph 진단 메시지에 표시. */
  readonly virtualPath?: string
}

/**
 * SFC 소스를 받아 ArgType map을 반환. compiler 미설치/script setup 부재/
 * defineProps 미사용 시 빈 객체 반환.
 */
export function extractVuePropsFromSource(
  options: ExtractVueOptions,
): Record<string, ArgType> {
  const compiler = loadCompilerSync()
  if (compiler === null) return {}
  const { source, virtualPath = 'component.vue' } = options

  let descriptor: VueSfcDescriptor
  try {
    descriptor = compiler.parse(source).descriptor
  } catch {
    return {}
  }

  // <script setup> 우선. 없으면 <script>의 본문에서 defineProps 호출을 찾는다.
  const scriptContent =
    descriptor.scriptSetup?.content ?? descriptor.script?.content ?? null
  if (scriptContent === null || scriptContent.trim() === '') return {}

  // ts-morph in-memory project에 가상 TS 파일로 주입.
  // jsx 옵션은 .vue 파일과 무관 — react jsx 끔.
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: {
      target: 99, // ESNext
      module: 99, // ESNext
      strict: true,
      noEmit: true,
    },
  })
  // .ts 확장자로 주입 (lang="ts"가 아니어도 type-only 표현이 무시되므로 안전).
  const tsPath = virtualPath.replace(/\.vue$/u, '.vue.ts')
  const sourceFile = project.createSourceFile(tsPath, scriptContent, { overwrite: true })

  // defineProps<...>() 호출을 찾는다. setup macro는 사용자 코드에서 직접 호출 형태로 등장.
  const definePropsCall = findDefinePropsCall(sourceFile)
  if (definePropsCall === undefined) return {}

  // generic type argument가 있으면 그 타입을 사용 (예: defineProps<Props>()).
  // 없으면 runtime arg(객체 형태)는 본 함수에서 미지원 — Vue runtime decl 추출은 후속 작업.
  const typeArgs = definePropsCall.getTypeArguments()
  const firstTypeArg = typeArgs[0]
  if (firstTypeArg === undefined) return {}

  const propsType = firstTypeArg.getType()
  return mapPropsTypeToArgTypes(propsType, firstTypeArg)
}

function findDefinePropsCall(sourceFile: ReturnType<Project['createSourceFile']>):
  | CallExpression
  | undefined {
  let found: CallExpression | undefined = undefined
  sourceFile.forEachDescendant((node) => {
    if (found !== undefined) return
    if (!Node.isCallExpression(node)) return
    const expression = node.getExpression()
    if (!Node.isIdentifier(expression)) return
    if (expression.getText() !== 'defineProps') return
    found = node
  })
  return found
}

/**
 * Props 타입을 받아 ArgType map을 구성한다.
 *
 * React 추출(`extract-core.ts`)의 mapType 룰과 동일:
 * - string/number/boolean → 해당 primitive control
 * - string-literal union → enum + select control
 * - boolean-literal pair → boolean
 * - function → action
 */
function mapPropsTypeToArgTypes(
  propsType: Type,
  location: Node,
): Record<string, ArgType> {
  const result: Record<string, ArgType> = {}
  for (const propSymbol of propsType.getProperties()) {
    const propName = propSymbol.getName()
    const propType = propSymbol.getTypeAtLocation(location)
    const mapped = mapType(propType)
    if (mapped === null) continue
    const required = !isOptionalSymbol(propSymbol)
    const argType: ArgType = {
      type: mapped.type,
      required,
      ...(mapped.control !== undefined ? { control: mapped.control } : {}),
      ...(mapped.options !== undefined ? { options: mapped.options } : {}),
      ...(mapped.action === true ? { action: true } : {}),
    }
    result[propName] = argType
  }
  return result
}

interface MappedType {
  readonly type: string
  readonly control?: NonNullable<ArgType['control']>
  readonly options?: readonly unknown[]
  readonly action?: boolean
}

function mapType(type: Type): MappedType | null {
  if (type.isUnion()) {
    const parts = type.getUnionTypes().filter((t) => !t.isUndefined() && !t.isNull())
    if (parts.length === 0) return null
    if (parts.length === 1) {
      const only = parts[0]
      return only !== undefined ? mapType(only) : null
    }
    if (parts.every((t) => t.isStringLiteral())) {
      return {
        type: 'enum',
        control: 'select',
        options: parts.map((t) => readLiteralValue(t)),
      }
    }
    if (parts.length === 2 && parts.every((t) => t.isBooleanLiteral())) {
      return { type: 'boolean', control: 'boolean' }
    }
    return null
  }

  if (type.isString() || type.isStringLiteral()) {
    return { type: 'string', control: 'text' }
  }
  if (type.isNumber() || type.isNumberLiteral()) {
    return { type: 'number', control: 'number' }
  }
  if (type.isBoolean()) {
    return { type: 'boolean', control: 'boolean' }
  }
  if (type.getCallSignatures().length > 0) {
    return { type: 'function', action: true }
  }
  return null
}

function readLiteralValue(type: Type): string {
  const value = type.getLiteralValue()
  if (typeof value === 'string') return value
  return type.getText().replace(/^["']|["']$/g, '')
}

function isOptionalSymbol(symbol: { getDeclarations(): Node[] }): boolean {
  for (const decl of symbol.getDeclarations()) {
    if (
      Node.isPropertySignature(decl) ||
      Node.isPropertyDeclaration(decl) ||
      Node.isParameterDeclaration(decl)
    ) {
      if (decl.hasQuestionToken()) return true
    }
  }
  return false
}

// TypeNode는 사용처 없지만 향후 inline type literal 분석 확장 시 참조.
export type { TypeNode }
