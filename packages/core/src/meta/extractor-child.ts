/**
 * Props extractor child process entry.
 *
 * 부모 프로세스(vite-plugin-jogak / build CLI)와는 별도의 V8 isolate에서
 * ts-morph Project를 보유한다. 부모가 자식을 SIGTERM/SIGKILL할 때 OS는
 * 즉시 메모리 페이지를 회수한다 — V8의 internal heap fragmentation에
 * 의존하지 않는다.
 *
 * IPC 프로토콜 (stringified JSON, node child_process IPC):
 *   parent → child:
 *     { type: 'extract', id: number, filePath: string }
 *     { type: 'extractMeta', id: number, filePath: string }
 *   child → parent:
 *     { type: 'result', id: number, argTypes: Record<string, ArgType> }
 *     { type: 'metaResult', id: number, meta: ExtractedMeta | null }
 *     { type: 'error', id: number, message: string }
 *
 * 부모가 fork 시 첫 인자로 tsConfigFilePath(있으면)를 전달한다.
 *   process.argv[2] === tsConfigFilePath | ''
 */
import { createInProcessExtractor } from './extract-core.js'

interface ExtractMessage {
  readonly type: 'extract'
  readonly id: number
  readonly filePath: string
}

interface ExtractMetaMessage {
  readonly type: 'extractMeta'
  readonly id: number
  readonly filePath: string
}

type IncomingMessage = ExtractMessage | ExtractMetaMessage

const tsConfigArg = process.argv[2] ?? ''
const tsConfigFilePath = tsConfigArg.length > 0 ? tsConfigArg : undefined

const extractor =
  tsConfigFilePath !== undefined
    ? createInProcessExtractor({ tsConfigFilePath })
    : createInProcessExtractor()

function send(payload: unknown): void {
  if (typeof process.send === 'function') {
    process.send(payload)
  }
}

process.on('message', (message: IncomingMessage) => {
  if (message.type === 'extract') {
    const { id, filePath } = message
    try {
      const argTypes = extractor.extract(filePath)
      send({ type: 'result', id, argTypes })
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e)
      send({ type: 'error', id, message: reason })
    }
    return
  }
  if (message.type === 'extractMeta') {
    const { id, filePath } = message
    try {
      const meta = extractor.extractMeta(filePath)
      // 1.0.0-beta.7: parser silent skip warning (P2-1 full).
      // meta === undefined면 사용자 typo 가능성 (export default 누락, title 누락 등).
      // 이전엔 silent skip이라 사용자가 sidebar에 entry 안 뜨는 이유 알 수 없었음.
      // stderr write → subprocess가 부모 CLI로 pipe → 사용자 터미널에 즉시 표시.
      // .vue/.svelte은 정상 undefined (동반 .jogak.ts에서 처리) — 파일명으로 판단.
      if (meta === undefined && !filePath.endsWith('.vue') && !filePath.endsWith('.svelte')) {
        process.stderr.write(
          `[jogak] skipped ${filePath}: no jogak meta detected. Check that the file has ` +
            `'export default meta' with a 'title' string.\n`,
        )
      }
      send({ type: 'metaResult', id, meta: meta ?? null })
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e)
      send({ type: 'error', id, message: reason })
    }
    return
  }
})

// 부모 채널이 끊기면 즉시 종료 — orphan 프로세스 방지.
process.on('disconnect', () => {
  process.exit(0)
})
