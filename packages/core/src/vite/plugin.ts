import { resolve } from 'node:path'
import { existsSync } from 'node:fs'
import type { Plugin, ViteDevServer } from 'vite'
import type { ArgType, JogakPluginOptions } from '../types.js'
import { createPropsExtractor, type PropsExtractor } from '../meta/extract-props.js'

const VIRTUAL_MODULE_ID = 'virtual:jogak'
const RESOLVED_VIRTUAL_MODULE_ID = '\0' + VIRTUAL_MODULE_ID

export function jogak(options: JogakPluginOptions = {}): Plugin {
  const {
    patterns = ['src/**/*.jogak.ts', 'src/**/*.jogak.tsx'],
    codeTheme = 'vsDark',
  } = options
  let devServer: ViteDevServer | undefined
  let extractor: PropsExtractor | undefined

  return {
    name: 'vite-plugin-jogak',

    configResolved(config) {
      const tsConfigCandidate = resolve(config.root, 'tsconfig.json')
      extractor = existsSync(tsConfigCandidate)
        ? createPropsExtractor({ tsConfigFilePath: tsConfigCandidate })
        : createPropsExtractor()
    },

    configureServer(server) {
      devServer = server
    },

    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) {
        return RESOLVED_VIRTUAL_MODULE_ID
      }
      return undefined
    },

    async load(id) {
      if (id !== RESOLVED_VIRTUAL_MODULE_ID) return undefined

      const { glob } = await import('glob')
      const files = await glob(patterns as string[], { absolute: true })

      const autoArgTypesByFile: Record<string, Record<string, ArgType>> = {}
      if (extractor !== undefined) {
        for (const file of files) {
          try {
            autoArgTypesByFile[file] = extractor.extract(file)
          } catch {
            autoArgTypesByFile[file] = {}
          }
        }
      }

      const imports = files
        .map((file, i) => `import * as _j${i.toString()} from ${JSON.stringify(file)}`)
        .join('\n')

      const rawImports = files
        .map((file, i) => `import _src${i.toString()} from ${JSON.stringify(`${file}?raw`)}`)
        .join('\n')

      const moduleArray = files
        .map(
          (file, i) =>
            `  [_j${i.toString()}, _src${i.toString()}, ${JSON.stringify(file)}, ${JSON.stringify(autoArgTypesByFile[file] ?? {})}]`,
        )
        .join(',\n')

      return `
export const _jogakCodeTheme = ${JSON.stringify(codeTheme)}

import { defaultRegistry } from '@jogak/core'
${imports}
${rawImports}

const _modules = [
${moduleArray}
]

for (const [mod, source, filePath, autoArgTypes] of _modules) {
  const { default: meta, ...named } = mod
  if (meta == null || typeof meta.title !== 'string') continue
  const jogaks = Object.values(named).filter(
    (v) => v !== null && typeof v === 'object' && typeof v.name === 'string'
  )
  const userArgTypes = meta.argTypes ?? {}
  const mergedArgTypes = { ...autoArgTypes }
  for (const key of Object.keys(userArgTypes)) {
    mergedArgTypes[key] = { ...mergedArgTypes[key], ...userArgTypes[key] }
  }
  defaultRegistry.register({
    id: meta.title,
    title: meta.title,
    jogaks: jogaks,
    meta: { ...meta, argTypes: mergedArgTypes },
    filePath: filePath,
    source: source,
  })
}
`.trimStart()
    },

    handleHotUpdate({ file }) {
      const isJogakFile = /\.jogak\.(tsx?|jsx?)$/.test(file)
      const isComponentFile = /\.(tsx?|jsx?)$/.test(file) && !isJogakFile

      if (!isJogakFile && !isComponentFile) return

      if (devServer !== undefined) {
        const mod = devServer.moduleGraph.getModuleById(RESOLVED_VIRTUAL_MODULE_ID)
        if (mod != null) {
          devServer.moduleGraph.invalidateModule(mod)
        }
        if (isJogakFile) {
          devServer.ws.send({ type: 'full-reload' })
        }
      }
    },
  }
}
