/**
 * Public PropsExtractor 인터페이스 + factory.
 *
 * 실제 ts-morph 추출 로직은 자식 프로세스 entry(`extractor-child.ts`)에 격리되며,
 * 부모는 `extractor-client.ts`의 IPC 클라이언트만 사용한다. 이 모듈은
 * ts-morph를 import하지 않는다 — 그래야 vite plugin / build / index 진입점이
 * ts-morph를 부모 V8 isolate에 로드하지 않는다.
 */
import type { ArgType, JogakFramework } from '../types.js'

export interface PropsExtractorOptions {
  readonly tsConfigFilePath?: string
}

/**
 * 자식 프로세스 RPC가 돌려보내는 메타 페이로드 — 직렬화 가능한 부분만.
 * `RegistryEntryMeta`의 일부와 1:1 (id/source/filePath/autoArgTypes는 부모가 채운다).
 */
export interface ExtractedMetaPayload {
  readonly title: string
  readonly jogakNames: readonly string[]
  /**
   * 알파.14.1: 각 jogak variant의 default args (정적 추출, 직렬화 가능 literal만).
   * 키는 jogak.name. iframe isolation 모드에서 chrome scope가 user 메타를 평가하지
   * 않고도 default args를 iframe으로 전달할 수 있게 한다.
   */
  readonly jogakDefaultArgs: Readonly<Record<string, Readonly<Record<string, unknown>>>>
  readonly userArgTypes: Readonly<Record<string, ArgType>>
  readonly metaExtras: {
    readonly tags?: readonly string[]
    readonly parameters?: Readonly<Record<string, unknown>>
  }
  /**
   * 알파.14.1: 파일 단위 framework 명시값 (`'react'|'next'|'web-components'|'vue'|'svelte'`).
   * 추출 단계에서는 사용자가 명시한 raw 값만 전달 — 전역 fallback은 plugin 측에서 결정.
   */
  readonly framework?: JogakFramework
  /**
   * 1.0.0 post-1.0: MDX docs 상대 경로 (JogakMeta.docs).
   */
  readonly docs?: string
}

export interface PropsExtractor {
  /**
   * 단일 jogak 파일을 받아 props 메타데이터를 추출한다.
   *
   * 반환 타입이 Promise인 이유: 추출은 별도 child_process에서 IPC로 수행된다.
   * V8 GC가 ts-morph가 만든 대형 페이지를 OS에 반환하지 않는 문제를
   * "프로세스 자체를 kill"로 해결하기 위해서.
   */
  extract(jogakFilePath: string): Promise<Record<string, ArgType>>
  /**
   * 사용자 jogak 파일의 default-export 메타(`title`, `argTypes`, `tags`, `parameters`)와
   * named-export 중 jogak 객체들의 `name` 목록을 추출한다.
   * 추출 불가능(ts-morph가 default export object literal을 못 찾음)하면 `null`.
   *
   * **부모 프로세스에는 ts-morph가 절대 로드되지 않는다.**
   * 모든 ts-morph 작업은 자식 프로세스에서 수행된다.
   */
  extractMeta(jogakFilePath: string): Promise<ExtractedMetaPayload | null>
  /**
   * 자식 프로세스를 즉시 종료하고 모든 메모리를 OS에 반환한다.
   * 다음 extract 호출 시 자식이 다시 spawn된다 (~수백ms warmup).
   */
  releaseCache(): void
}

export { createPropsExtractor } from './extractor-client.js'
