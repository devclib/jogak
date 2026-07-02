/**
 * Storybook CSF3 → jogak entry AST 변환.
 *
 * 대응 규칙:
 * - `import type { Meta, StoryObj } from '@storybook/react'` → `import type { JogakMeta, Jogak } from '@jogak/core'`
 * - `import type { Meta, StoryObj } from '@storybook/vue3'` 등 프레임워크별 subpath도 동일 처리
 * - `Meta<typeof X>` → `JogakMeta`
 * - `StoryObj<typeof X>` → `Jogak`
 * - `type Story = StoryObj<typeof X>` → 유지하되 rhs를 `Jogak`으로
 * - `export const Primary: Story = { args }` → `export const Primary: Jogak = { name: 'Primary', args }`
 * - `satisfies Meta<...>` → `satisfies JogakMeta`
 *
 * 미대응 (사용자 수동 처리):
 * - Play 함수 args 시그니처 차이 (Storybook은 `{ canvasElement, args, step }` 세 번째 인자)
 * - Decorators / render / loaders (설계상 out-of-scope)
 * - `parameters` 특정 addon 필드
 */

import { Project, SyntaxKind, Node, type SourceFile } from 'ts-morph'

export interface TransformOptions {
  /** 파일 경로 (in-memory 소스와 함께 사용 시 참고용) */
  readonly filePath?: string
}

export interface TransformResult {
  /** 변환된 소스 텍스트 */
  readonly source: string
  /** 변환 로그 — 각 rule이 몇 번 적용됐는지 */
  readonly changes: {
    readonly importsRewritten: number
    readonly metaTypeReplaced: number
    readonly storyObjReplaced: number
    readonly satisfiesRewritten: number
    readonly nameFieldsAdded: number
  }
}

const STORYBOOK_IMPORT_RE = /^@storybook\/(react|vue3|svelte|angular|nextjs|web-components|preact|html|ember|solid|qwik|preact-vite)(\/.+)?$/u

export function transformSource(source: string, options: TransformOptions = {}): TransformResult {
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: { allowJs: false, jsx: 4 /* Preserve */ },
  })
  const sourceFile = project.createSourceFile(options.filePath ?? 'input.tsx', source, { overwrite: true })

  const changes: MutableChanges = {
    importsRewritten: 0,
    metaTypeReplaced: 0,
    storyObjReplaced: 0,
    satisfiesRewritten: 0,
    nameFieldsAdded: 0,
  }

  rewriteImports(sourceFile, changes)
  rewriteTypeReferences(sourceFile, changes)
  rewriteSatisfies(sourceFile, changes)
  addNameFieldsToStoryExports(sourceFile, changes)

  return { source: sourceFile.getFullText(), changes }
}

interface MutableChanges {
  importsRewritten: number
  metaTypeReplaced: number
  storyObjReplaced: number
  satisfiesRewritten: number
  nameFieldsAdded: number
}

function rewriteImports(sourceFile: SourceFile, changes: MutableChanges): void {
  for (const imp of sourceFile.getImportDeclarations()) {
    const spec = imp.getModuleSpecifierValue()
    if (!STORYBOOK_IMPORT_RE.test(spec)) continue

    let touched = false
    for (const named of imp.getNamedImports()) {
      const name = named.getName()
      if (name === 'Meta') {
        named.setName('JogakMeta')
        touched = true
      } else if (name === 'StoryObj') {
        named.setName('Jogak')
        touched = true
      }
    }
    if (touched) {
      imp.setModuleSpecifier('@jogak/core')
      changes.importsRewritten += 1
    }
  }
}

function rewriteTypeReferences(sourceFile: SourceFile, changes: MutableChanges): void {
  // `Meta<typeof X>` → `JogakMeta`
  // `StoryObj<typeof X>` → `Jogak`
  const typeRefs = sourceFile.getDescendantsOfKind(SyntaxKind.TypeReference)
  for (const ref of typeRefs) {
    const nameNode = ref.getTypeName()
    if (!Node.isIdentifier(nameNode)) continue
    const name = nameNode.getText()
    if (name === 'Meta') {
      ref.replaceWithText('JogakMeta')
      changes.metaTypeReplaced += 1
    } else if (name === 'StoryObj') {
      ref.replaceWithText('Jogak')
      changes.storyObjReplaced += 1
    }
  }
}

function rewriteSatisfies(sourceFile: SourceFile, changes: MutableChanges): void {
  // Node text에 `satisfies Meta<` 패턴이 남아있을 수 있음 (SatisfiesExpression 등 rare case).
  // AST replacement 후 `JogakMeta`로 이미 바뀌었으므로 후처리는 대개 불필요.
  // 방어적으로 다시 스캔.
  const satisfies = sourceFile.getDescendantsOfKind(SyntaxKind.SatisfiesExpression)
  for (const expr of satisfies) {
    const typeNode = expr.getTypeNode()
    if (typeNode === undefined) continue
    const text = typeNode.getText()
    if (/^Meta(\s*<.*)?$/.test(text)) {
      typeNode.replaceWithText('JogakMeta')
      changes.satisfiesRewritten += 1
    }
  }
}

function addNameFieldsToStoryExports(sourceFile: SourceFile, changes: MutableChanges): void {
  // `export const <Name>: <Story|Jogak> = { args: {...} }` → `{ name: '<Name>', args: {...} }`
  for (const varStmt of sourceFile.getVariableStatements()) {
    if (!varStmt.isExported()) continue
    if (varStmt.hasDefaultKeyword()) continue
    for (const decl of varStmt.getDeclarations()) {
      const declType = decl.getTypeNode()?.getText()
      // Jogak 또는 Story (기존 alias) — 이미 rewriteTypeReferences가 Story alias는 그대로 뒀을 수 있음
      if (declType !== 'Jogak' && declType !== 'Story') continue
      const init = decl.getInitializer()
      if (init === undefined || !Node.isObjectLiteralExpression(init)) continue
      // 이미 name 있으면 skip.
      const hasName = init.getProperty('name') !== undefined
      if (hasName) continue
      const identifierName = decl.getName()
      // 첫 property로 name 삽입.
      init.insertPropertyAssignment(0, {
        name: 'name',
        initializer: JSON.stringify(identifierName),
      })
      changes.nameFieldsAdded += 1
    }
  }
}
