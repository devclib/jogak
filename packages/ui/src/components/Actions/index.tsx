import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'
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

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          padding: '6px 20px',
          fontSize: 11,
          fontWeight: 700,
          color: '#9ca3af',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          borderBottom: '1px solid #e5e7eb',
          background: '#f9fafb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <span>Actions {logs.length > 0 && `(${logs.length.toString()})`}</span>
        <button
          type="button"
          onClick={() => { defaultActionChannel.clear() }}
          disabled={logs.length === 0}
          style={{
            fontSize: 10,
            fontWeight: 600,
            padding: '2px 8px',
            border: '1px solid #d1d5db',
            borderRadius: 3,
            background: '#fff',
            color: logs.length === 0 ? '#9ca3af' : '#374151',
            cursor: logs.length === 0 ? 'default' : 'pointer',
            textTransform: 'none',
            letterSpacing: 0,
          }}
        >
          Clear
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {logs.length === 0 ? (
          <div
            style={{
              padding: '12px 20px',
              color: '#9ca3af',
              fontSize: 13,
            }}
          >
            함수 prop이 호출되면 여기에 기록됩니다
          </div>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, fontFamily: 'monospace', fontSize: 12 }}>
            {logs.map((log) => (
              <li
                key={log.id}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 10,
                  padding: '6px 20px',
                  borderBottom: '1px solid #f3f4f6',
                }}
              >
                <span style={{ color: '#9ca3af', fontSize: 11, minWidth: 92 }}>
                  {formatTime(log.timestamp)}
                </span>
                <span style={{ color: '#7c3aed', fontWeight: 600 }}>{log.name}</span>
                <span style={{ color: '#374151', wordBreak: 'break-all', flex: 1 }}>
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
