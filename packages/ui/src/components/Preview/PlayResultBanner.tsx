/**
 * 1.2.0 post-1.2: Play 함수 실행 결과 배너.
 *
 * Preview Toolbar 아래에 표시되며 Play 함수의 실행 결과(assertion trace 등)를 노출.
 * - `ok` — 초록 배지 "Play passed"
 * - `error` — 빨강 배경 + 에러 message 원문
 * - `no-play` — 렌더하지 않음 (dismiss 상태로 사용)
 *
 * Storybook `addon-interactions`의 결과 패널에 대응하는 최소 UI.
 */
import type { ReactElement } from 'react'
import clsx from 'clsx'

export interface PlayResult {
  readonly status: 'ok' | 'error' | 'no-play'
  readonly message?: string
}

export interface PlayResultBannerProps {
  readonly result: PlayResult
  readonly onDismiss: () => void
}

export function PlayResultBanner({ result, onDismiss }: PlayResultBannerProps): ReactElement | null {
  if (result.status === 'no-play') return null
  const isOk = result.status === 'ok'
  return (
    <div
      data-testid="play-result-banner"
      data-status={result.status}
      className={clsx(
        'jogak:flex jogak:items-start jogak:gap-3 jogak:px-4 jogak:py-2 jogak:border-b jogak:border-[var(--jogak-color-border)] jogak:text-[12.5px]',
        isOk
          ? 'jogak:bg-[color:rgb(240_253_244)] jogak:text-[color:rgb(21_128_61)]'
          : 'jogak:bg-[color:rgb(254_242_242)] jogak:text-[color:rgb(153_27_27)]',
      )}
    >
      <span className="jogak:font-semibold jogak:shrink-0">
        {isOk ? '✓ Play passed' : '✗ Play failed'}
      </span>
      {!isOk && result.message !== undefined && result.message.length > 0 && (
        <code
          data-testid="play-result-message"
          className="jogak:flex-1 jogak:whitespace-pre-wrap jogak:break-words jogak:font-[family-name:var(--jogak-font-mono)] jogak:text-[12px] jogak:leading-tight jogak:min-w-0"
        >
          {result.message}
        </code>
      )}
      <button
        type="button"
        onClick={onDismiss}
        className="jogak:shrink-0 jogak:px-2 jogak:py-0.5 jogak:text-[11.5px] jogak:border-none jogak:rounded jogak:cursor-pointer jogak:bg-transparent jogak:opacity-70 hover:jogak:opacity-100"
        aria-label="Dismiss play result"
      >
        ✕
      </button>
    </div>
  )
}
