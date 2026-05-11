/**
 * 알파.14.1: Svelte 5 컴포넌트(`.svelte`)의 props를 자동으로 PropsMetadata로 추출한다.
 *
 * Svelte 5의 props 선언 패턴:
 *   let { foo = 'bar', onClick }: { foo?: string; onClick: () => void } = $props()
 *
 * 접근 방식:
 * 1. SFC 내부의 `<script>` (또는 `<script lang="ts">`)를 정규식으로 추출.
 *    Svelte compiler의 `parse()`는 의존을 더 크게 만들고 본 작업의 핵심(타입 분석)에
 *    이점이 없어 가벼운 정규식 + ts-morph 조합으로 처리.
 * 2. 추출된 스크립트 본문을 ts-morph in-memory project에 .ts로 주입.
 * 3. `let { ... }: TypeRef = $props()` 패턴에서 type annotation을 찾고,
 *    Vue/React와 동일한 mapType 룰로 ArgType map 구성.
 *
 * 결과 shape: alpha.12 React props 추출과 1:1.
 *
 * 격리:
 * - svelte 자체에 의존하지 않음 (정규식으로 script 추출). compiler 미설치 환경에서도 동작.
 * - 그래도 향후 compiler API 사용이 필요하면 dynamic import로 처리 (현재는 불필요).
 */
import { Node, Project, type Type } from 'ts-morph'
import type { ArgType } from '../types.js'

export interface ExtractSvelteOptions {
  /** SFC source. */
  readonly source: string
  /** 디버깅용 가상 파일 경로. */
  readonly virtualPath?: string
}

/**
 * Svelte SFC 소스 텍스트에서 `<script>` 블록을 추출한다.
 *
 * 우선순위:
 *   `<script context="module" lang="ts">` (있어도 props는 instance script에 있음)
 *   `<script lang="ts">` (instance)
 *   `<script>` (instance)
 *
 * 둘 다 있으면 instance를 우선.
 */
export function extractScriptBlock(source: string): string | null {
  const instanceMatch = source.match(
    /<script(?![^>]*context=["']module["'])[^>]*>([\s\S]*?)<\/script>/u,
  )
  if (instanceMatch !== null) return instanceMatch[1] ?? null
  // fallback: 첫 번째 script
  const anyMatch = source.match(/<script[^>]*>([\s\S]*?)<\/script>/u)
  if (anyMatch !== null) return anyMatch[1] ?? null
  return null
}

/**
 * Svelte SFC 소스를 받아 ArgType map을 반환. script 부재/$props() 미사용 시 빈 객체.
 */
export function extractSveltePropsFromSource(
  options: ExtractSvelteOptions,
): Record<string, ArgType> {
  const { source, virtualPath = 'component.svelte' } = options
  const scriptContent = extractScriptBlock(source)
  if (scriptContent === null || scriptContent.trim() === '') return {}

  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: {
      target: 99,
      module: 99,
      strict: true,
      noEmit: true,
    },
  })
  // svelte runes 환경에서 $props는 magic identifier — ts-morph가 모르므로 declare로 stub.
  // 사용자 script 앞에 declare를 prepend해 컴파일러 진단을 회피한다.
  const tsPath = virtualPath.replace(/\.svelte$/u, '.svelte.ts')
  const stubbed = `declare function $props<T = unknown>(): T;\n${scriptContent}`
  const sourceFile = project.createSourceFile(tsPath, stubbed, { overwrite: true })

  // `let { ... }: TypeRef = $props<...>()` 패턴 탐색.
  // VariableDeclaration의 initializer가 $props() CallExpression이면 type annotation 우선,
  // 없으면 $props<TypeRef>()의 type argument fallback.
  let propsType: Type | undefined = undefined
  let location: Node | undefined = undefined
  sourceFile.forEachDescendant((node) => {
    if (propsType !== undefined) return
    if (!Node.isVariableDeclaration(node)) return
    const init = node.getInitializer()
    if (init === undefined || !Node.isCallExpression(init)) return
    const callee = init.getExpression()
    if (!Node.isIdentifier(callee) || callee.getText() !== '$props') return

    // 1차: variable declaration의 type annotation
    const typeNode = node.getTypeNode()
    if (typeNode !== undefined) {
      propsType = typeNode.getType()
      location = typeNode
      return
    }
    // 2차: $props<TypeRef>() generic 인자
    const typeArgs = init.getTypeArguments()
    const firstTypeArg = typeArgs[0]
    if (firstTypeArg !== undefined) {
      propsType = firstTypeArg.getType()
      location = firstTypeArg
    }
  })

  if (propsType === undefined || location === undefined) return {}
  return mapPropsTypeToArgTypes(propsType, location)
}

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
