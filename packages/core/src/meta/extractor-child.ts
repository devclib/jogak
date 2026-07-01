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
      // 1.0.0 후 minor: skip reason 세분화. beta.7의 minimal warning은 원인 상관없이
      // 동일 hint였음. checkMetaSkipReason으로 구체적 이유 → 사용자에게 실 fix 방법.
      // .vue/.svelte은 정상 undefined (동반 .jogak.ts에서 처리) — 파일명으로 skip.
      if (meta === undefined && !filePath.endsWith('.vue') && !filePath.endsWith('.svelte')) {
        const reason = extractor.checkMetaSkipReason(filePath)
        const hint =
          reason === 'no-default-export'
            ? "add 'export default meta satisfies JogakMeta' with { title, component }."
            : reason === 'no-title'
              ? "the default export is missing a 'title' string property."
              : "no jogak meta detected. Check 'export default meta' with a 'title' string."
        process.stderr.write(`[jogak] skipped ${filePath}: ${hint}\n`)
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
