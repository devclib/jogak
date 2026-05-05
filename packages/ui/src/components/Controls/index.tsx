import type { ReactElement, ChangeEvent, CSSProperties } from 'react'
import type { ArgType } from '@jogak/core'

export interface ControlsProps {
  readonly args: Readonly<Record<string, unknown>>
  readonly argTypes: Readonly<Record<string, ArgType>>
  readonly onArgChange: (key: string, value: unknown) => void
}

type ControlKind = 'boolean' | 'number' | 'text' | 'select' | 'action' | 'json'

function resolveControlKind(value: unknown, argType: ArgType | undefined): ControlKind {
  const ctrl = argType?.control
  const isAction = argType?.action !== undefined && argType.action !== false
  const isFunctionType = argType?.type === 'function' || typeof value === 'function'

  if (isAction || isFunctionType) return 'action'
  if (ctrl === 'boolean' || typeof value === 'boolean') return 'boolean'
  if (ctrl === 'number' || ctrl === 'range' || typeof value === 'number') return 'number'
  if (
    ctrl === 'select' ||
    ctrl === 'radio' ||
    (argType?.options !== undefined && argType.options.length > 0)
  )
    return 'select'
  if (ctrl === 'text' || ctrl === 'color' || typeof value === 'string') return 'text'
  return 'json'
}

interface ControlInputProps {
  readonly argKey: string
  readonly value: unknown
  readonly argType: ArgType | undefined
  readonly onArgChange: (key: string, value: unknown) => void
}

function ControlInput({ argKey, value, argType, onArgChange }: ControlInputProps): ReactElement {
  const kind = resolveControlKind(value, argType)

  switch (kind) {
    case 'boolean':
      return (
        <input
          type="checkbox"
          checked={value === true}
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            onArgChange(argKey, e.target.checked)
          }}
          style={{ cursor: 'pointer', width: 16, height: 16, accentColor: '#2563eb' }}
        />
      )
    case 'number':
      return (
        <input
          type="number"
          value={typeof value === 'number' ? value : ''}
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            onArgChange(argKey, e.target.valueAsNumber)
          }}
          style={inputStyle}
        />
      )
    case 'select': {
      const options = argType?.options ?? []
      return (
        <select
          value={String(value ?? '')}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => {
            onArgChange(argKey, e.target.value)
          }}
          style={inputStyle}
        >
          {options.map((opt) => (
            <option key={String(opt)} value={String(opt)}>
              {String(opt)}
            </option>
          ))}
        </select>
      )
    }
    case 'text':
      return (
        <input
          type="text"
          value={typeof value === 'string' ? value : String(value ?? '')}
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            onArgChange(argKey, e.target.value)
          }}
          style={inputStyle}
        />
      )
    case 'action':
      return (
        <span
          style={{
            display: 'inline-block',
            padding: '2px 8px',
            fontSize: 11,
            fontWeight: 600,
            color: '#7c3aed',
            background: '#f5f3ff',
            border: '1px solid #ddd6fe',
            borderRadius: 4,
            fontFamily: 'monospace',
          }}
        >
          (action)
        </span>
      )
    case 'json':
      return (
        <code style={{ fontSize: 12, color: '#6b7280', fontFamily: 'monospace' }}>
          {JSON.stringify(value)}
        </code>
      )
  }
}

const inputStyle: CSSProperties = {
  padding: '4px 8px',
  border: '1px solid #d1d5db',
  borderRadius: 4,
  fontSize: 13,
  width: '100%',
  maxWidth: 280,
}

const thStyle: CSSProperties = {
  padding: '6px 20px',
  textAlign: 'left',
  color: '#6b7280',
  fontWeight: 500,
  fontSize: 12,
  borderBottom: '1px solid #e5e7eb',
}

const tdStyle: CSSProperties = {
  padding: '8px 20px',
  verticalAlign: 'middle',
  borderBottom: '1px solid #f3f4f6',
}

export function Controls({ args, argTypes, onArgChange }: ControlsProps): ReactElement {
  const keys = Array.from(new Set([...Object.keys(args), ...Object.keys(argTypes)]))
  const entries = keys.map((k) => [k, args[k]] as const)

  return (
    <div style={{ borderTop: '2px solid #e5e7eb' }}>
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
        }}
      >
        Controls
      </div>
      {entries.length === 0 ? (
        <div style={{ padding: '12px 20px', color: '#9ca3af', fontSize: 13 }}>
          No args defined
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Control</th>
              <th style={thStyle}>Description</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([key, value]) => {
              const argType = argTypes[key]
              return (
                <tr key={key}>
                  <td
                    style={{
                      ...tdStyle,
                      fontFamily: 'monospace',
                      fontSize: 12,
                      color: '#374151',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {key}
                  </td>
                  <td style={tdStyle}>
                    <ControlInput
                      argKey={key}
                      value={value}
                      argType={argType}
                      onArgChange={onArgChange}
                    />
                  </td>
                  <td style={{ ...tdStyle, color: '#9ca3af' }}>
                    {argType?.description ?? ''}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
