/**
 * Props extractor parent-side client.
 *
 * `child_process.fork`로 격리된 자식 프로세스에서 ts-morph 추출 로직을 실행하고,
 * idle 상태에서는 자식을 종료해 OS에 메모리를 즉시 반환한다.
 *
 * 설계 결정:
 * - **child_process vs worker_threads**: worker_threads는 같은 V8 isolate를
 *   공유해 dispose해도 페이지가 OS로 반환되지 않는다. child_process는
 *   완전히 별도 프로세스 — kill 시 즉시 OS에 반환되어 idle RSS 측정의 핵심.
 * - **idle dispose**: 추출 종료 후 IDLE_DISPOSE_MS 동안 추가 요청이 없으면
 *   자식을 SIGTERM. HMR burst는 5초 안에 모두 일어나므로 자식이 살아있다.
 * - **lazy spawn**: 첫 요청에서만 fork. dev server boot 시 자식을 띄우지 않아
 *   cold start latency를 보호한다.
 * - **resilience**: 자식 비정상 종료 시 pending Promise를 reject하고 다음
 *   요청에서 재spawn한다.
 */
import { fork, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'
import type { ArgType } from '../types.js'
import type {
  ExtractedMetaPayload,
  PropsExtractor,
  PropsExtractorOptions,
} from './extract-props.js'

const IDLE_DISPOSE_MS = 5000
const REQUEST_TIMEOUT_MS = 30_000

interface ResultMessage {
  readonly type: 'result'
  readonly id: number
  readonly argTypes: Record<string, ArgType>
}

interface MetaResultMessage {
  readonly type: 'metaResult'
  readonly id: number
  readonly meta: ExtractedMetaPayload | null
}

interface ErrorMessage {
  readonly type: 'error'
  readonly id: number
  readonly message: string
}

type ChildMessage = ResultMessage | MetaResultMessage | ErrorMessage

type PendingRequest =
  | {
      readonly kind: 'argTypes'
      readonly resolve: (value: Record<string, ArgType>) => void
      readonly reject: (error: Error) => void
      readonly timer: NodeJS.Timeout
    }
  | {
      readonly kind: 'meta'
      readonly resolve: (value: ExtractedMetaPayload | null) => void
      readonly reject: (error: Error) => void
      readonly timer: NodeJS.Timeout
    }

/**
 * 자식 entry 파일 경로를 dist 레이아웃에서 찾는다.
 *
 * Vite lib build 결과: `dist/meta/extractor-child.mjs`.
 * 이 모듈(`extractor-client.ts`)이 dist에서 어디에 위치하든
 * (예: `dist/extract-props-XXX.js` shared chunk, `dist/index.mjs` entry,
 * `dist/vite/index.mjs` entry, `dist/build/index.mjs` entry) 위로 디렉토리를
 * 거슬러 올라가며 후보를 검사한다.
 *
 * 빌드 타임에 결정해도 되지만 런타임 resolve가 더 견고하다 (Vite chunk 경로
 * 변경, 사용자 환경 packaging 등에 영향 안 받음).
 */
function resolveChildEntry(): string {
  // import.meta.url 기준으로 후보 경로들을 시도
  const here = fileURLToPath(import.meta.url)
  const dir = dirname(here)
  const candidates = [
    resolve(dir, 'meta/extractor-child.mjs'),
    resolve(dir, '../meta/extractor-child.mjs'),
    resolve(dir, '../../meta/extractor-child.mjs'),
    resolve(dir, 'extractor-child.mjs'),
    // dev (tsc emit) fallback — 거의 안 쓰지만 안전망
    resolve(dir, 'meta/extractor-child.js'),
    resolve(dir, '../meta/extractor-child.js'),
  ]
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }
  throw new Error(
    `[jogak] extractor-child entry를 찾을 수 없습니다. 시도한 경로:\n  ${candidates.join('\n  ')}`,
  )
}

export function createPropsExtractor(options: PropsExtractorOptions = {}): PropsExtractor {
  let child: ChildProcess | undefined
  let idleTimer: NodeJS.Timeout | undefined
  let nextId = 0
  const pending = new Map<number, PendingRequest>()
  let cachedChildEntry: string | undefined

  function getChildEntry(): string {
    if (cachedChildEntry === undefined) cachedChildEntry = resolveChildEntry()
    return cachedChildEntry
  }

  function clearIdleTimer(): void {
    if (idleTimer !== undefined) {
      clearTimeout(idleTimer)
      idleTimer = undefined
    }
  }

  function rejectAllPending(error: Error): void {
    for (const [, req] of pending) {
      clearTimeout(req.timer)
      req.reject(error)
    }
    pending.clear()
  }

  function disposeChild(): void {
    clearIdleTimer()
    if (child === undefined) return
    const c = child
    child = undefined
    rejectAllPending(new Error('[jogak] extractor child process disposed'))
    try {
      c.disconnect()
    } catch {
      // 이미 disconnect된 경우 무시
    }
    if (!c.killed) {
      c.kill('SIGTERM')
    }
  }

  function scheduleIdleDispose(): void {
    clearIdleTimer()
    idleTimer = setTimeout(() => {
      disposeChild()
    }, IDLE_DISPOSE_MS)
    if (typeof idleTimer.unref === 'function') idleTimer.unref()
  }

  function ensureChild(): ChildProcess {
    if (child !== undefined && child.connected) return child

    // 이전 자식이 죽어있으면 cleanup
    if (child !== undefined) {
      rejectAllPending(new Error('[jogak] extractor child process exited'))
      child = undefined
    }

    const entry = getChildEntry()
    const tsConfigArg = options.tsConfigFilePath ?? ''
    const newChild = fork(entry, [tsConfigArg], {
      // detached:false → 부모 종료 시 자식도 종료
      // serialization:'json' (기본) — ArgType은 plain JSON 호환
      stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
    })

    newChild.on('message', (raw: ChildMessage) => {
      if (raw.type !== 'result' && raw.type !== 'metaResult' && raw.type !== 'error') return
      const req = pending.get(raw.id)
      if (req === undefined) return
      pending.delete(raw.id)
      clearTimeout(req.timer)
      if (raw.type === 'result') {
        if (req.kind === 'argTypes') {
          req.resolve(raw.argTypes)
        } else {
          req.reject(new Error('[jogak] extractor child mismatched response: expected metaResult'))
        }
      } else if (raw.type === 'metaResult') {
        if (req.kind === 'meta') {
          req.resolve(raw.meta)
        } else {
          req.reject(new Error('[jogak] extractor child mismatched response: expected result'))
        }
      } else {
        req.reject(new Error(`[jogak] extractor child error: ${raw.message}`))
      }
    })

    newChild.on('exit', (code, signal) => {
      // 자식이 비정상 종료한 경우 (정상 dispose는 child를 미리 undefined로 만들어둠)
      if (child === newChild) {
        child = undefined
        const detail =
          signal !== null ? `signal=${signal}` : `code=${(code ?? 'null').toString()}`
        rejectAllPending(new Error(`[jogak] extractor child exited (${detail})`))
      }
    })

    newChild.on('error', (e) => {
      if (child === newChild) {
        child = undefined
        rejectAllPending(new Error(`[jogak] extractor child fork error: ${e.message}`))
      }
    })

    child = newChild
    return newChild
  }

  return {
    extract(filePath) {
      clearIdleTimer()
      const c = ensureChild()
      const id = ++nextId
      return new Promise<Record<string, ArgType>>((resolveFn, rejectFn) => {
        const timer = setTimeout(() => {
          if (pending.delete(id)) {
            rejectFn(
              new Error(
                `[jogak] extractor child timeout (${REQUEST_TIMEOUT_MS}ms): ${filePath}`,
              ),
            )
          }
        }, REQUEST_TIMEOUT_MS)
        if (typeof timer.unref === 'function') timer.unref()

        pending.set(id, { kind: 'argTypes', resolve: resolveFn, reject: rejectFn, timer })
        try {
          c.send({ type: 'extract', id, filePath })
        } catch (e) {
          pending.delete(id)
          clearTimeout(timer)
          rejectFn(
            new Error(
              `[jogak] extractor child IPC send 실패: ${e instanceof Error ? e.message : String(e)}`,
            ),
          )
        }
      }).finally(() => {
        // 매 요청 끝에 idle 타이머 갱신 — burst 동안 자식 보존, idle 시 OS에 반환
        if (pending.size === 0) scheduleIdleDispose()
      })
    },
    extractMeta(filePath) {
      clearIdleTimer()
      const c = ensureChild()
      const id = ++nextId
      return new Promise<ExtractedMetaPayload | null>((resolveFn, rejectFn) => {
        const timer = setTimeout(() => {
          if (pending.delete(id)) {
            rejectFn(
              new Error(
                `[jogak] extractor child timeout (${REQUEST_TIMEOUT_MS}ms): ${filePath}`,
              ),
            )
          }
        }, REQUEST_TIMEOUT_MS)
        if (typeof timer.unref === 'function') timer.unref()

        pending.set(id, { kind: 'meta', resolve: resolveFn, reject: rejectFn, timer })
        try {
          c.send({ type: 'extractMeta', id, filePath })
        } catch (e) {
          pending.delete(id)
          clearTimeout(timer)
          rejectFn(
            new Error(
              `[jogak] extractor child IPC send 실패: ${e instanceof Error ? e.message : String(e)}`,
            ),
          )
        }
      }).finally(() => {
        if (pending.size === 0) scheduleIdleDispose()
      })
    },
    releaseCache() {
      disposeChild()
    },
  }
}
