import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import clsx from 'clsx'
import { defaultActionChannel } from '@jogak/core'
import type { ActionLog } from '@jogak/core'

function formatArgs(args: readonly unknown[]): string {
  if (args.length === 0) return '()'
  try {
    return args
      .map((arg) => {
        if (arg === null) return 'null'
        if (arg === undefined) return 'undefined'
        if (typeof arg === 'function') return '[Function]'
        if (typeof arg === 'object') {
          const ctorName =
            (arg as { constructor?: { name?: string } }).constructor?.name ?? 'Object'
          if (ctorName !== 'Object' && ctorName !== 'Array') return `[${ctorName}]`
          return JSON.stringify(arg)
        }
        return JSON.stringify(arg)
      })
      .join(', ')
  } catch {
    return '[unserializable]'
  }
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  const hh = d.getHours().toString().padStart(2, '0')
  const mm = d.getMinutes().toString().padStart(2, '0')
  const ss = d.getSeconds().toString().padStart(2, '0')
  const ms = d.getMilliseconds().toString().padStart(3, '0')
  return `${hh}:${mm}:${ss}.${ms}`
}

export function Actions(): ReactElement {
  const [logs, setLogs] = useState<readonly ActionLog[]>(() => defaultActionChannel.getLogs())

  useEffect(() => {
    return defaultActionChannel.subscribe(setLogs)
  }, [])

  const isEmpty = logs.length === 0

  return (
    <div className="jogak:h-full jogak:flex jogak:flex-col">
      <div className="jogak:px-5 jogak:py-1.5 jogak:text-[11px] jogak:font-bold jogak:text-[var(--jogak-color-fg-subtle)] jogak:uppercase jogak:tracking-[0.08em] jogak:border-b jogak:border-[var(--jogak-color-border)] jogak:bg-[var(--jogak-color-bg-subtle)] jogak:flex jogak:items-center jogak:justify-between jogak:shrink-0">
        <span>Actions {logs.length > 0 && `(${logs.length.toString()})`}</span>
        <button
          type="button"
          onClick={() => { defaultActionChannel.clear() }}
          disabled={isEmpty}
          className={clsx(
            'jogak:text-[10px] jogak:font-semibold jogak:px-2 jogak:py-0.5 jogak:border jogak:border-[var(--jogak-color-border-strong)] jogak:rounded-[var(--jogak-radius-sm)] jogak:bg-[var(--jogak-color-bg)] jogak:normal-case jogak:tracking-normal',
            isEmpty
              ? 'jogak:text-[var(--jogak-color-fg-subtle)] jogak:cursor-default'
              : 'jogak:text-[var(--jogak-color-fg)] jogak:cursor-pointer',
          )}
        >
          Clear
        </button>
      </div>

      <div className="jogak:flex-1 jogak:overflow-auto">
        {isEmpty ? (
          <div className="jogak:px-5 jogak:py-3 jogak:text-[var(--jogak-color-fg-subtle)] jogak:text-[13px] jogak:leading-none">
            함수 prop이 호출되면 여기에 기록됩니다
          </div>
        ) : (
          <ul className="jogak:list-none jogak:m-0 jogak:p-0 jogak:font-[family-name:var(--jogak-font-mono)] jogak:text-[12px]">
            {logs.map((log) => (
              <li
                key={log.id}
                className="jogak:flex jogak:items-baseline jogak:gap-[10px] jogak:px-5 jogak:py-1.5 jogak:border-b jogak:border-[var(--jogak-color-border-muted)]"
              >
                <span className="jogak:text-[var(--jogak-color-fg-subtle)] jogak:text-[11px] jogak:min-w-[92px]">
                  {formatTime(log.timestamp)}
                </span>
                <span className="jogak:text-[var(--jogak-color-violet)] jogak:font-semibold">{log.name}</span>
                <span className="jogak:text-[var(--jogak-color-fg)] jogak:break-all jogak:flex-1">
                  ({formatArgs(log.args)})
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
