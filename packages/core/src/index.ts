export type {
  ArgType,
  JogakMeta,
  Jogak,
  RegistryEntry,
  RegistryEntryMeta,
  CategoryTree,
  CategoryMetaTree,
  JogakAdapter,
  JogakPluginOptions,
  UserViteOptions,
} from './types.js'

export { ComponentRegistry, defaultRegistry, UnknownEntryError } from './registry.js'
export {
  ActionChannel,
  defaultActionChannel,
  action,
  injectActions,
  type ActionLog,
  type ActionListener,
} from './actions.js'
export { defineJogakConfig, type JogakConfig } from './config.js'

// 알파.9: 빌더-agnostic 어댑터 ABI
export type {
  BuilderAdapter,
  BuilderName,
  GlobalCssSpec,
  SpawnDevOptions,
  DevHandle,
  BuildOptions,
  BuildResult,
  PreviewEntryMeta,
  HostLogger,
} from './adapter.js'

export type {
  JogakMessageToFrame,
  JogakMessageFromFrame,
  JogakA11yViolation,
  JogakA11yViolationNode,
} from './preview-entry/protocol.js'

export {
  renderPreviewEntrySource,
  type RenderPreviewEntryOptions,
} from './preview-entry/source.js'

// 알파.9: server-only 함수(detectBuilder, resolveGlobalCssPaths, detectUserGlobalCss)는
// `@jogak/core/server` subpath로 분리. node:fs/path 의존이 브라우저 번들에 누출되지 않게.
//
// import { detectBuilder } from '@jogak/core/server'
