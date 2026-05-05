import { Node, Project, type SourceFile, type Symbol as MorphSymbol, type Type } from 'ts-morph'
import type { ArgType } from '../types.js'

export interface PropsExtractorOptions {
  readonly tsConfigFilePath?: string
}

export interface PropsExtractor {
  extract(jogakFilePath: string): Record<string, ArgType>
}

export function createPropsExtractor(options: PropsExtractorOptions = {}): PropsExtractor {
  const project =
    options.tsConfigFilePath !== undefined
      ? new Project({ tsConfigFilePath: options.tsConfigFilePath })
      : new Project({ skipAddingFilesFromTsConfig: true })

  function loadOrRefresh(filePath: string): SourceFile | undefined {
    let sourceFile = project.getSourceFile(filePath)
    if (sourceFile === undefined) {
      sourceFile = project.addSourceFileAtPathIfExists(filePath)
    } else {
      sourceFile.refreshFromFileSystemSync()
    }
    return sourceFile
  }

  return {
    extract(jogakFilePath) {
      const sourceFile = loadOrRefresh(jogakFilePath)
      if (sourceFile === undefined) return {}

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

      const result: Record<string, ArgType> = {}
      for (const propSymbol of propsType.getProperties()) {
        const propName = propSymbol.getName()
        const propType = propSymbol.getTypeAtLocation(declaration)
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
    },
  }
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
