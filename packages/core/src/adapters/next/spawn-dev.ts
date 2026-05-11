/**
 * 알파.9: next-adapter의 spawnDev 구현.
 *
 * 1. 사용자 cwd의 app 디렉토리에 `jogak-preview/page.tsx` scaffold (`.gitignore` 자동)
 * 2. `npx next dev -p PORT` child process spawn
 * 3. HTTP poll로 ready 대기
 * 4. shutdown: child kill + scaffold cleanup
 */

import { spawn, type ChildProcess } from 'node:child_process'
import type { DevHandle, SpawnDevOptions } from '../../index.js'
import { scaffoldPreviewPage } from './scaffold.js'

interface NextAdapterExtra {
  readonly cmd?: string
  /**
   * 알파.13: jogak preview를 RSC (Server Component) 모드로 scaffold한다.
   * `true`일 때 App Router에서 'use client' 없이 user component를 SSR 렌더한다.
   */
  readonly rsc?: boolean
}

export async function spawnNextDev(opts: SpawnDevOptions): Promise<DevHandle> {
  const extra = (opts.extra ?? {}) as NextAdapterExtra

  // 1. scaffold
  const scaffold = scaffoldPreviewPage({
    cwd: opts.cwd,
    ...(opts.globalCss !== undefined ? { globalCss: opts.globalCss } : {}),
    ...(extra.rsc === true ? { rsc: true } : {}),
  })

  // 2. next dev spawn
  const port = opts.port ?? 5174
  const cmd = extra.cmd ?? 'next'

  const child: ChildProcess = spawn(
    cmd,
    ['dev', '-p', String(port), '-H', String(opts.host ?? 'localhost')],
    {
      cwd: opts.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, JOGAK_PREVIEW: '1' },
    },
  )

  child.stdout?.on('data', (data: Buffer) => {
    process.stdout.write(`[next] ${data.toString()}`)
  })
  child.stderr?.on('data', (data: Buffer) => {
    process.stderr.write(`[next] ${data.toString()}`)
  })

  // 3. ready 대기 — HTTP poll
  const url = `http://localhost:${String(port)}`
  try {
    await waitForReady(`${url}${scaffold.route}`, 60_000)
  } catch (err) {
    // 시작 실패 → cleanup + rethrow
    if (child.pid !== undefined) {
      try {
        process.kill(child.pid, 'SIGTERM')
      } catch {
        // best-effort
      }
    }
    scaffold.cleanup()
    throw err
  }

  return {
    url,
    port,
    close: async () => {
      // child kill
      if (child.pid !== undefined) {
        try {
          process.kill(child.pid, 'SIGTERM')
          // graceful 5s 대기 후 SIGKILL
          await new Promise<void>((res) => {
            const t = setTimeout(() => {
              try {
                if (child.pid !== undefined) process.kill(child.pid, 'SIGKILL')
              } catch {
                // best-effort
              }
              res()
            }, 5_000)
            child.on('exit', () => {
              clearTimeout(t)
              res()
            })
          })
        } catch {
          // best-effort
        }
      }
      // scaffold cleanup
      scaffold.cleanup()
    },
  }
}

async function waitForReady(url: string, timeoutMs: number): Promise<void> {
  const start = Date.now()
  let lastError: unknown
  while (Date.now() - start < timeoutMs) {
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => { ctrl.abort() }, 2_000)
      const res = await fetch(url, { signal: ctrl.signal })
      clearTimeout(t)
      if (res.ok || res.status === 404) {
        // 404도 OK — Next.js dev server가 응답한다는 의미. preview route는 보통 200.
        if (res.ok) return
      }
    } catch (err) {
      lastError = err
    }
    await new Promise((res) => setTimeout(res, 500))
  }
  const message = lastError instanceof Error ? lastError.message : String(lastError ?? 'timeout')
  throw new Error(`[jogak/next-adapter] next dev ready timeout (${timeoutMs}ms): ${message}`)
}
