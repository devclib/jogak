/**
 * 알파.11: next-adapter의 build 구현.
 *
 * Next.js App Router의 정적 export(`output: 'export'`)를 활용한다.
 *
 * 흐름:
 * 1. `app/jogak-preview/{page,layout}.tsx` scaffold (`.gitignore` 자동)
 * 2. wrapper next.config 생성 — 사용자 config를 import하고 `basePath`/`assetPrefix`를
 *    `/preview/jogak-preview`로 override. Next.js의 `/_next/...` 절대 경로 자산이
 *    jogak SPA의 정적 server에서 올바르게 해석되도록.
 * 3. 사용자 cwd에서 `next build --config <wrapper>` child process spawn
 * 4. 사용자가 `output: 'export'`를 설정해 두면 next.js가 `<cwd>/out/`에 정적 HTML emit.
 *    `<cwd>/out/jogak-preview/index.html`이 존재하면 `previewOutDir`로 복사.
 * 5. scaffold + wrapper cleanup (성공/실패 무관)
 *
 * 한계:
 * - 사용자 next.config의 `output: 'export'` opt-in 필수. 미설정 시 명확한 에러.
 * - jogak이 사용자 next.config 본체를 변경하지 않는다 (사용자 환경 무침습 원칙).
 *   wrapper만 .jogak/ 안에 한시 생성.
 */

import { spawn } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
  rmSync,
} from 'node:fs'
import { resolve, relative } from 'node:path'
import type { BuildOptions, BuildResult } from '../../index.js'
import { scaffoldPreviewPage } from './scaffold.js'

const PREVIEW_ROUTE_DIR = 'jogak-preview'
const NEXT_DEFAULT_OUT = 'out'
// jogak SPA의 정적 server root에서 preview는 `/preview/`에 위치한다.
// next basePath='/preview'이면 next는 `/preview/_next/...` (자산) +
// `/preview/jogak-preview/index.html` (페이지)로 emit한다 — 라우트가 자동 합산.
const NEXT_BASE_PATH = '/preview'

export async function buildNext(opts: BuildOptions): Promise<BuildResult> {
  // jogak이 wrapper config로 `output: 'export'`/`basePath`/`assetPrefix`를 강제 주입하므로
  // 사용자 next.config 측 설정 검증은 불필요.

  const rsc = (opts.extra as { rsc?: boolean } | undefined)?.rsc === true
  if (rsc) {
    throw new Error(
      `[jogak/next-adapter] RSC 모드는 정적 export(\`output: 'export'\`) 와 호환되지 않습니다.\n` +
        `RSC scaffold는 server-side dynamic rendering(searchParams)을 사용하므로\n` +
        `\`jogak build\`(정적 산출물)에서는 지원하지 않습니다. RSC는 \`jogak dev\` 전용입니다.\n` +
        `정적 산출물을 원하면 \`builderOptions: { rsc: false }\` 또는 builderOptions 제거 후 재시도.`,
    )
  }

  // 1. scaffold
  const scaffold = scaffoldPreviewPage({
    cwd: opts.cwd,
    ...(opts.globalCss !== undefined ? { globalCss: opts.globalCss } : {}),
  })

  // 2. 사용자 next.config를 일시 백업하고 wrapper config로 교체.
  // next CLI가 cwd에서 자동 발견하는 config 파일이라 위치를 바꿀 수 없으므로
  // 일시적인 swap이 가장 안정적인 방법. finally에서 반드시 복구.
  const swap = installWrapperConfig(opts.cwd)

  const start = Date.now()
  try {
    // 3. next build 실행
    await runNextBuild(opts.cwd, opts.logger)

    // 4. next의 정적 export 산출물을 previewOutDir로 복사.
    // Next 15는 `output: 'export'` + 비-trailingSlash 라우트를 `jogak-preview.html`
    // (단일 파일)로 emit한다. trailingSlash 활성화 시 `jogak-preview/index.html`.
    // CLI가 정적 PreviewEntryMeta.buildEntryName(`jogak-preview/index.html`)을 신뢰할 수
    // 있도록 항상 디렉토리 형태로 normalize.
    const nextOutDir = resolve(opts.cwd, NEXT_DEFAULT_OUT)

    // out/ 전체를 previewOutDir로 복사 — _next/ assets 포함.
    cpSync(nextOutDir, opts.previewOutDir, { recursive: true })

    const dstDirEntry = resolve(opts.previewOutDir, PREVIEW_ROUTE_DIR, 'index.html')
    const dstFlatEntry = resolve(opts.previewOutDir, `${PREVIEW_ROUTE_DIR}.html`)

    if (!existsSync(dstDirEntry)) {
      if (existsSync(dstFlatEntry)) {
        // jogak-preview.html → jogak-preview/index.html로 normalize
        mkdirSync(resolve(opts.previewOutDir, PREVIEW_ROUTE_DIR), { recursive: true })
        renameSync(dstFlatEntry, dstDirEntry)
      } else {
        throw new Error(
          `[jogak/next-adapter] next build 산출물에 \`${PREVIEW_ROUTE_DIR}.html\` 또는 ` +
            `\`${PREVIEW_ROUTE_DIR}/index.html\`이 없습니다.\n` +
            `next.config의 \`output: 'export'\` 또는 app router 설정을 확인하세요.`,
        )
      }
    }

    const elapsedMs = Date.now() - start
    const fsStats = walkDir(opts.previewOutDir)

    return {
      outDir: opts.previewOutDir,
      entryHtml: `${PREVIEW_ROUTE_DIR}/index.html`,
      elapsedMs,
      assetCount: fsStats.fileCount,
      totalBytes: fsStats.totalBytes,
    }
  } finally {
    scaffold.cleanup()
    swap.restore()
    // 사용자 cwd의 out/는 jogak이 emit한 것이 아니라 next 자체 산출물이므로 삭제하지 않는다.
  }
}

interface WrapperSwap {
  restore(): void
}

function installWrapperConfig(cwd: string): WrapperSwap {
  // 사용자 next.config 파일을 발견하고 .jogak-backup 확장자로 임시 rename.
  // 그 자리에 jogak wrapper를 동일 이름으로 작성.
  const userConfigPath = findUserConfig(cwd)
  const backupPath = userConfigPath !== undefined
    ? `${userConfigPath}.jogak-backup`
    : undefined

  if (userConfigPath !== undefined && backupPath !== undefined) {
    renameSync(userConfigPath, backupPath)
  }

  // wrapper는 ESM (.mjs)으로 작성 — next가 cwd에서 next.config.* 자동 발견.
  const wrapperPath = resolve(cwd, 'next.config.mjs')
  const userConfigImportRel =
    backupPath !== undefined
      ? `./${toPosix(relative(cwd, backupPath))}`
      : undefined

  // .ts 백업은 ESM에서 직접 import 불가. .ts/.cjs는 dynamic import + tsx에 의존이 있는데,
  // next의 자체 ts loader는 next.config.ts에만 적용되고 backup된 .jogak-backup 파일에는
  // 적용 안 됨. 안전하게 사용자 config의 핵심 옵션을 직접 emit하지 않고 비워두고
  // jogak이 필요한 옵션만 강제. 사용자 옵션 보존이 우선이라면 .ts → 일시 .mjs로 transpile하거나
  // 사용자에게 next.config.{js,mjs} 권장.
  // 알파.11 v1: 사용자 next.config의 핵심 동작은 보존하지 못할 수 있음 (config가 .ts일 때).
  // 사용자 config가 .js/.mjs면 dynamic import로 보존.
  const isImportableBackup =
    backupPath !== undefined && /\.(mjs|js|cjs)\.jogak-backup$/u.test(backupPath)

  const importLine = isImportableBackup && userConfigImportRel !== undefined
    ? `import userConfigOrFn from ${JSON.stringify(userConfigImportRel)}`
    : 'const userConfigOrFn = {}'

  const content = `${importLine}

export default async function jogakWrapperConfig(phase, options) {
  const userConfig =
    typeof userConfigOrFn === 'function'
      ? await userConfigOrFn(phase, options)
      : userConfigOrFn
  const resolved = userConfig && userConfig.default ? userConfig.default : userConfig
  return {
    ...resolved,
    output: 'export',
    basePath: ${JSON.stringify(NEXT_BASE_PATH)},
    assetPrefix: ${JSON.stringify(NEXT_BASE_PATH)},
    trailingSlash: false,
  }
}
`
  writeFileSync(wrapperPath, content, 'utf-8')

  return {
    restore: () => {
      try {
        rmSync(wrapperPath, { force: true })
      } catch {
        // best-effort
      }
      if (userConfigPath !== undefined && backupPath !== undefined) {
        try {
          if (existsSync(backupPath)) {
            renameSync(backupPath, userConfigPath)
          }
        } catch {
          // best-effort — 사용자에게 backup 파일이 남아 있다고 알림 필요할 수 있으나
          // 정상 흐름에선 도달하지 않음.
        }
      }
    },
  }
}

function findUserConfig(cwd: string): string | undefined {
  for (const ext of ['ts', 'mjs', 'js', 'cjs'] as const) {
    const candidate = resolve(cwd, `next.config.${ext}`)
    if (existsSync(candidate)) return candidate
  }
  return undefined
}

function toPosix(p: string): string {
  return p.split(/[\\/]/u).join('/')
}

async function runNextBuild(
  cwd: string,
  logger: BuildOptions['logger'],
): Promise<void> {
  await new Promise<void>((res, rej) => {
    const child = spawn('npx', ['next', 'build'], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        FORCE_COLOR: '0',
      },
    })
    let stderrBuf = ''
    child.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf-8')
      logger?.info?.(`[next] ${text.trimEnd()}`)
    })
    child.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf-8')
      stderrBuf += text
      logger?.warn?.(`[next] ${text.trimEnd()}`)
    })
    child.on('error', rej)
    child.on('close', (code) => {
      if (code === 0) res()
      else rej(new Error(`[jogak/next-adapter] next build exited with code ${String(code)}\n${stderrBuf}`))
    })
  })
}

function walkDir(dir: string): { fileCount: number; totalBytes: number } {
  let fileCount = 0
  let totalBytes = 0
  if (!existsSync(dir)) return { fileCount, totalBytes }
  for (const entry of readdirSync(dir)) {
    const p = resolve(dir, entry)
    const st = statSync(p)
    if (st.isDirectory()) {
      const sub = walkDir(p)
      fileCount += sub.fileCount
      totalBytes += sub.totalBytes
    } else {
      fileCount += 1
      totalBytes += st.size
    }
  }
  return { fileCount, totalBytes }
}

