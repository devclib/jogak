/**
 * Pure ts-morph 기반 추출 로직 — 자식 프로세스 entry에서 사용한다.
 * 부모(client) / 부모가 import하는 plugin 측에는 ts-morph가 로드되지 않게 하는 게 핵심.
 */
import {
  Node,
  Project,
  type BindingElement,
  type ObjectLiteralExpression,
  type PropertyAssignment,
  type SourceFile,
  type Symbol as MorphSymbol,
  type Type,
} from 'ts-morph'
import type { ArgType } from '../types.js'

export interface ExtractCoreOptions {
  readonly tsConfigFilePath?: string
}

/**
 * 인덱스 가상모듈에 들어갈 메타 정보 (직렬화 가능 부분만).
 * `RegistryEntryMeta`의 일부와 1:1 — registry import를 피하기 위해 분리 정의.
 */
export interface ExtractedMeta {
  readonly title: string
  readonly jogakNames: readonly string[]
  readonly userArgTypes: Readonly<Record<string, ArgType>>
  readonly metaExtras: {
    readonly tags?: readonly string[]
    readonly parameters?: Readonly<Record<string, unknown>>
  }
}

export interface InProcessExtractor {
  extract(filePath: string): Record<string, ArgType>
  extractMeta(filePath: string): ExtractedMeta | undefined
  dispose(): void
}

/**
 * ts-morph Project를 단일 V8 isolate 안에서 보유하는 동기 추출기.
 *
 * 메모리 노트: skipAddingFilesFromTsConfig:true 는 RSS를 오히려 악화시킴
 * (size=500에서 1035MB → 1674MB). typeChecker가 lazy 로딩으로 의존 파일을
 * 매번 재해석하면서 Program이 커지기 때문. tsconfig include 일괄 로딩이
 * 안정적이며, 자식 프로세스 단위 dispose가 RSS 회수에 가장 효과적.
 */
export function createInProcessExtractor(options: ExtractCoreOptions = {}): InProcessExtractor {
  function createProject(): Project {
    return options.tsConfigFilePath !== undefined
      ? new Project({ tsConfigFilePath: options.tsConfigFilePath })
      : new Project({ skipAddingFilesFromTsConfig: true })
  }

  let project: Project | undefined

  function ensureProject(): Project {
    if (project === undefined) project = createProject()
    return project
  }

  function loadOrRefresh(filePath: string): SourceFile | undefined {
    const proj = ensureProject()
    let sourceFile = proj.getSourceFile(filePath)
    if (sourceFile === undefined) {
      sourceFile = proj.addSourceFileAtPathIfExists(filePath)
    } else {
      sourceFile.refreshFromFileSystemSync()
    }
    return sourceFile
  }

  return {
    extract(filePath) {
      const sourceFile = loadOrRefresh(filePath)
      if (sourceFile === undefined) return {}
      return extractFromSourceFile(sourceFile)
    },
    extractMeta(filePath) {
      const sourceFile = loadOrRefresh(filePath)
      if (sourceFile === undefined) return undefined
      return extractMetaFromSourceFile(sourceFile)
    },
    dispose() {
      project = undefined
    },
  }
}

export function extractFromSourceFile(sourceFile: SourceFile): Record<string, ArgType> {
  const defaultExportSymbol = sourceFile.getDefaultExportSymbol()
  if (defaultExportSymbol === undefined) return {}

  const aliased = defaultExportSymbol.getAliasedSymbol() ?? defaultExportSymbol
  const declaration = aliased.getDeclarations()[0] ?? defaultExportSymbol.getDeclarations()[0]
  if (declaration === undefined) return {}

  const metaType = aliased.getTypeAtLocation(declaration)
  const componentSymbol = metaType.getProperty('component')
  if (componentSymbol === undefined) return {}

  const componentType = componentSymbol.getTypeAtLocation(declaration)
  const propsType = resolvePropsType(componentType, declaration)
  if (propsType === undefined) return {}

  // 알파.12: 컴포넌트 함수 매개변수의 destructure default 수집 (@default 태그가 없을 때 fallback).
  const destructureDefaults = collectDestructureDefaults(componentType, declaration)

  const result: Record<string, ArgType> = {}
  for (const propSymbol of propsType.getProperties()) {
    const propName = propSymbol.getName()
    const propType = propSymbol.getTypeAtLocation(declaration)
    const mapped = mapType(propType)
    if (mapped === null) continue

    const required = !isOptionalSymbol(propSymbol)
    // 알파.12: JSDoc description + defaultValue 추출.
    const description = readDescription(propSymbol)
    const jsDocDefault = readJsDocDefault(propSymbol)
    const defaultValue = jsDocDefault ?? destructureDefaults[propName]

    const argType: ArgType = {
      type: mapped.type,
      required,
      ...(mapped.control !== undefined ? { control: mapped.control } : {}),
      ...(mapped.options !== undefined ? { options: mapped.options } : {}),
      ...(mapped.action === true ? { action: true } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(defaultValue !== undefined ? { defaultValue } : {}),
    }
    result[propName] = argType
  }
  return result
}

/**
 * 알파.12: ts-morph Symbol의 JSDoc 본문을 합산해 description 문자열을 반환.
 * 본문이 비어있으면 undefined.
 */
function readDescription(symbol: MorphSymbol): string | undefined {
  const parts = symbol.compilerSymbol.getDocumentationComment(undefined)
  if (parts.length === 0) return undefined
  const joined = parts
    .map((p) => p.text)
    .join('')
    .trim()
  return joined === '' ? undefined : joined
}

/**
 * 알파.12: JSDoc `@default` 태그 값을 파싱해 가능하면 JSON literal로,
 * 그렇지 않으면 트림된 문자열로 반환. 태그가 없으면 undefined.
 *
 * Storybook 컨벤션과 호환: `@default 'primary'` 또는 `@default 42` 등.
 */
function readJsDocDefault(symbol: MorphSymbol): unknown {
  const tags = symbol.compilerSymbol.getJsDocTags(undefined)
  for (const tag of tags) {
    if (tag.name !== 'default') continue
    const raw = (tag.text ?? []).map((p) => p.text).join('').trim()
    if (raw === '') return undefined
    return parseLiteralOrString(raw)
  }
  return undefined
}

/**
 * 컴포넌트 함수의 첫 매개변수가 object destructuring일 때, 각 BindingElement의
 * default initializer를 prop name → value 맵으로 수집.
 *
 * 예: `function Badge({ variant = 'default', size = 'md' }: Props) { ... }`
 *   → { variant: 'default', size: 'md' }
 *
 * literal이 아니면 string 텍스트로 보존 (예: `variant = getDefaultVariant()`
 *   → `'getDefaultVariant()'`은 의미 없는 노이즈라 string 보존 대신 무시).
 */
function collectDestructureDefaults(
  componentType: Type,
  location: Node,
): Record<string, unknown> {
  const callSignatures = componentType.getCallSignatures()
  const result: Record<string, unknown> = {}
  for (const sig of callSignatures) {
    const param = sig.getParameters()[0]
    if (param === undefined) continue
    const valueDecl = param.getValueDeclaration() ?? location
    if (!Node.isParameterDeclaration(valueDecl)) continue
    const binding = valueDecl.getNameNode()
    if (!Node.isObjectBindingPattern(binding)) continue
    for (const el of binding.getElements()) {
      const propName = readBindingElementPropName(el)
      if (propName === undefined) continue
      const init = el.getInitializer()
      if (init === undefined) continue
      const parsed = readJsonValue(init)
      if (parsed !== undefined) result[propName] = parsed
    }
  }
  return result
}

function readBindingElementPropName(el: BindingElement): string | undefined {
  // `propertyName as alias = default` 형식이면 propertyName이 별도로 지정됨.
  const propertyNameNode = el.getPropertyNameNode()
  if (propertyNameNode !== undefined) {
    if (Node.isIdentifier(propertyNameNode)) return propertyNameNode.getText()
    if (
      Node.isStringLiteral(propertyNameNode) ||
      Node.isNoSubstitutionTemplateLiteral(propertyNameNode)
    ) {
      return propertyNameNode.getLiteralText()
    }
    return undefined
  }
  const nameNode = el.getNameNode()
  if (Node.isIdentifier(nameNode)) return nameNode.getText()
  return undefined
}

/**
 * JSDoc `@default` 태그 값을 파싱. JSON literal로 해석 가능하면 그 값,
 * 아니면 원본 트림 문자열을 그대로 반환.
 *
 * 처리 형식:
 * - `'foo'` / `"foo"` → 문자열 `foo`
 * - `42` / `-1` / `3.14` → number
 * - `true` / `false` → boolean
 * - `null` → null
 * - `{ ... }` / `[ ... ]` → JSON.parse 시도
 * - 그 외 → 원본 문자열 (예: `() => void` 같은 표현)
 */
function parseLiteralOrString(raw: string): unknown {
  // 따옴표 문자열
  const m = /^'([^']*)'$|^"([^"]*)"$/u.exec(raw)
  if (m !== null) return m[1] ?? m[2] ?? ''
  if (raw === 'true') return true
  if (raw === 'false') return false
  if (raw === 'null') return null
  if (/^-?\d+(?:\.\d+)?$/u.test(raw)) return Number(raw)
  if (raw.startsWith('{') || raw.startsWith('[')) {
    try {
      return JSON.parse(raw)
    } catch {
      return raw
    }
  }
  return raw
}

function resolvePropsType(componentType: Type, location: Node): Type | undefined {
  const callSignatures = componentType.getCallSignatures()
  const firstSignature = callSignatures[0]
  if (firstSignature === undefined) return undefined
  const params = firstSignature.getParameters()
  const firstParam = params[0]
  if (firstParam === undefined) return undefined
  const valueDecl = firstParam.getValueDeclaration() ?? location
  return firstParam.getTypeAtLocation(valueDecl)
}

function isOptionalSymbol(symbol: MorphSymbol): boolean {
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

/**
 * 인덱스 가상모듈용 메타 추출.
 *
 * - default export(`Meta`)에서 `title`, `argTypes`(직렬화 가능 부분), `tags`, `parameters` 추출
 * - named export 중 `name`이 string-literal인 객체들의 `name` 목록 추출
 *
 * 직렬화 불가능한 값(함수 reference 등)은 안전하게 빈 객체/생략으로 처리한다.
 */
export function extractMetaFromSourceFile(sourceFile: SourceFile): ExtractedMeta | undefined {
  const defaultObj = findDefaultExportObjectLiteral(sourceFile)
  if (defaultObj === undefined) return undefined
  const title = readStringPropertyLiteral(defaultObj, 'title')
  if (title === undefined) return undefined

  const userArgTypes = readArgTypesProperty(defaultObj)
  const tags = readStringArrayProperty(defaultObj, 'tags')
  const parameters = readJsonObjectProperty(defaultObj, 'parameters')

  const jogakNames = collectNamedExportJogakNames(sourceFile)

  const metaExtras: ExtractedMeta['metaExtras'] = {
    ...(tags !== undefined ? { tags } : {}),
    ...(parameters !== undefined ? { parameters } : {}),
  }

  return {
    title,
    jogakNames,
    userArgTypes,
    metaExtras,
  }
}

function findDefaultExportObjectLiteral(
  sourceFile: SourceFile,
): ObjectLiteralExpression | undefined {
  // 1) `export default { ... }` (ExportAssignment with object literal)
  for (const ea of sourceFile.getExportAssignments()) {
    if (ea.isExportEquals()) continue
    const expr = ea.getExpression()
    if (Node.isObjectLiteralExpression(expr)) return expr
    if (Node.isAsExpression(expr)) {
      const inner = expr.getExpression()
      if (Node.isObjectLiteralExpression(inner)) return inner
    }
    if (Node.isSatisfiesExpression(expr)) {
      const inner = expr.getExpression()
      if (Node.isObjectLiteralExpression(inner)) return inner
    }
    // identifier로 default export하는 경우: variable 추적
    if (Node.isIdentifier(expr)) {
      const sym = expr.getSymbol()
      if (sym !== undefined) {
        for (const decl of sym.getDeclarations()) {
          if (Node.isVariableDeclaration(decl)) {
            const init = decl.getInitializer()
            if (init !== undefined) {
              const objLit = unwrapToObjectLiteral(init)
              if (objLit !== undefined) return objLit
            }
          }
        }
      }
    }
  }

  // 2) ts-morph가 default export symbol을 잡아주는 다른 케이스 fallback
  const defaultSymbol = sourceFile.getDefaultExportSymbol()
  if (defaultSymbol !== undefined) {
    const aliased = defaultSymbol.getAliasedSymbol() ?? defaultSymbol
    for (const decl of aliased.getDeclarations()) {
      if (Node.isVariableDeclaration(decl)) {
        const init = decl.getInitializer()
        if (init !== undefined) {
          const objLit = unwrapToObjectLiteral(init)
          if (objLit !== undefined) return objLit
        }
      }
    }
  }

  return undefined
}

function unwrapToObjectLiteral(node: Node): ObjectLiteralExpression | undefined {
  if (Node.isObjectLiteralExpression(node)) return node
  if (Node.isAsExpression(node)) return unwrapToObjectLiteral(node.getExpression())
  if (Node.isSatisfiesExpression(node)) return unwrapToObjectLiteral(node.getExpression())
  if (Node.isParenthesizedExpression(node)) {
    return unwrapToObjectLiteral(node.getExpression())
  }
  return undefined
}

function readStringPropertyLiteral(
  obj: ObjectLiteralExpression,
  name: string,
): string | undefined {
  const prop = obj.getProperty(name)
  if (prop === undefined || !Node.isPropertyAssignment(prop)) return undefined
  const init = prop.getInitializer()
  if (init === undefined) return undefined
  if (Node.isStringLiteral(init) || Node.isNoSubstitutionTemplateLiteral(init)) {
    return init.getLiteralText()
  }
  return undefined
}

function readStringArrayProperty(
  obj: ObjectLiteralExpression,
  name: string,
): readonly string[] | undefined {
  const prop = obj.getProperty(name)
  if (prop === undefined || !Node.isPropertyAssignment(prop)) return undefined
  const init = prop.getInitializer()
  if (init === undefined || !Node.isArrayLiteralExpression(init)) return undefined
  const out: string[] = []
  for (const el of init.getElements()) {
    if (Node.isStringLiteral(el) || Node.isNoSubstitutionTemplateLiteral(el)) {
      out.push(el.getLiteralText())
    }
  }
  return out
}

function readArgTypesProperty(
  obj: ObjectLiteralExpression,
): Readonly<Record<string, ArgType>> {
  const prop = obj.getProperty('argTypes')
  if (prop === undefined || !Node.isPropertyAssignment(prop)) return {}
  const init = prop.getInitializer()
  if (init === undefined || !Node.isObjectLiteralExpression(init)) return {}
  const result: Record<string, ArgType> = {}
  for (const child of init.getProperties()) {
    if (!Node.isPropertyAssignment(child)) continue
    const key = readPropertyAssignmentKey(child)
    if (key === undefined) continue
    const value = child.getInitializer()
    if (value === undefined || !Node.isObjectLiteralExpression(value)) continue
    const argType = parseArgTypeLiteral(value)
    if (argType !== undefined) result[key] = argType
  }
  return result
}

function readPropertyAssignmentKey(prop: PropertyAssignment): string | undefined {
  const nameNode = prop.getNameNode()
  if (Node.isIdentifier(nameNode)) return nameNode.getText()
  if (Node.isStringLiteral(nameNode) || Node.isNoSubstitutionTemplateLiteral(nameNode)) {
    return nameNode.getLiteralText()
  }
  return undefined
}

function parseArgTypeLiteral(obj: ObjectLiteralExpression): ArgType | undefined {
  const result: Record<string, unknown> = {}
  for (const child of obj.getProperties()) {
    if (!Node.isPropertyAssignment(child)) continue
    const key = readPropertyAssignmentKey(child)
    if (key === undefined) continue
    const init = child.getInitializer()
    if (init === undefined) continue
    const value = readJsonValue(init)
    if (value !== undefined) result[key] = value
  }
  return result as ArgType
}

function readJsonObjectProperty(
  obj: ObjectLiteralExpression,
  name: string,
): Readonly<Record<string, unknown>> | undefined {
  const prop = obj.getProperty(name)
  if (prop === undefined || !Node.isPropertyAssignment(prop)) return undefined
  const init = prop.getInitializer()
  if (init === undefined || !Node.isObjectLiteralExpression(init)) return undefined
  const result: Record<string, unknown> = {}
  for (const child of init.getProperties()) {
    if (!Node.isPropertyAssignment(child)) continue
    const key = readPropertyAssignmentKey(child)
    if (key === undefined) continue
    const value = child.getInitializer()
    if (value === undefined) continue
    const v = readJsonValue(value)
    if (v !== undefined) result[key] = v
  }
  return result
}

/** 직렬화 가능한 plain JSON literal만 추출. 함수/식별자 등은 undefined. */
function readJsonValue(node: Node): unknown {
  if (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)) {
    return node.getLiteralText()
  }
  if (Node.isNumericLiteral(node)) {
    return Number(node.getText())
  }
  if (Node.isTrueLiteral(node)) return true
  if (Node.isFalseLiteral(node)) return false
  if (Node.isNullLiteral(node)) return null
  if (Node.isPrefixUnaryExpression(node)) {
    const operand = node.getOperand()
    if (Node.isNumericLiteral(operand)) {
      const sign = node.getOperatorToken()
      const value = Number(operand.getText())
      // SyntaxKind.MinusToken === 41
      return sign === 41 ? -value : value
    }
    return undefined
  }
  if (Node.isArrayLiteralExpression(node)) {
    const arr: unknown[] = []
    for (const el of node.getElements()) {
      const v = readJsonValue(el)
      if (v === undefined) return undefined
      arr.push(v)
    }
    return arr
  }
  if (Node.isObjectLiteralExpression(node)) {
    const obj: Record<string, unknown> = {}
    for (const child of node.getProperties()) {
      if (!Node.isPropertyAssignment(child)) return undefined
      const key = readPropertyAssignmentKey(child)
      if (key === undefined) return undefined
      const init = child.getInitializer()
      if (init === undefined) return undefined
      const v = readJsonValue(init)
      if (v === undefined) return undefined
      obj[key] = v
    }
    return obj
  }
  if (Node.isAsExpression(node) || Node.isSatisfiesExpression(node)) {
    return readJsonValue(node.getExpression())
  }
  if (Node.isParenthesizedExpression(node)) {
    return readJsonValue(node.getExpression())
  }
  return undefined
}

/**
 * `export const X = { name: '...' , ... }` 형태의 named export에서
 * `name` 프로퍼티가 문자열 literal인 jogak 객체의 `name` 값들을 모은다.
 */
function collectNamedExportJogakNames(sourceFile: SourceFile): readonly string[] {
  const out: string[] = []
  for (const stmt of sourceFile.getVariableStatements()) {
    if (!stmt.isExported()) continue
    if (stmt.hasDefaultKeyword()) continue
    for (const decl of stmt.getDeclarations()) {
      const init = decl.getInitializer()
      if (init === undefined) continue
      const objLit = unwrapToObjectLiteral(init)
      if (objLit === undefined) continue
      const name = readStringPropertyLiteral(objLit, 'name')
      if (name !== undefined) out.push(name)
    }
  }
  return out
}
