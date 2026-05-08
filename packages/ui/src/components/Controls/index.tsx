import type { ReactElement, ChangeEvent } from 'react'
import clsx from 'clsx'
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

/**
 * input/select 공용 className — §6.10 의 inputClass 상수.
 *
 * `<select>` 에 `appearance-none` 을 일부러 적용하지 않는다 (UA dropdown 화살표 보존, §3.5).
 * alpha.4 baseline 이 UA 기본 select 화살표를 캡처한 상태라 픽셀 동등을 위해 유지.
 */
const inputClass =
  'jogak:px-2 jogak:py-1 ' +
  'jogak:border jogak:border-[var(--jogak-color-border-strong)] ' +
  'jogak:rounded-[var(--jogak-radius-md)] ' +
  'jogak:text-[13px] ' +
  'jogak:w-full jogak:max-w-[280px]'

/** th className 상수 — Controls table header cell. */
const thClass =
  'jogak:px-5 jogak:py-1.5 ' +
  'jogak:text-left ' +
  'jogak:text-[var(--jogak-color-fg-muted)] ' +
  'jogak:font-medium ' +
  'jogak:text-[12px] ' +
  'jogak:border-b jogak:border-[var(--jogak-color-border)]'

/** td className 상수 — Controls table body cell. */
const tdClass =
  'jogak:px-5 jogak:py-2 ' +
  'jogak:align-middle ' +
  'jogak:border-b jogak:border-[var(--jogak-color-border-muted)]'

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
          className="jogak:cursor-pointer jogak:w-4 jogak:h-4 jogak:accent-[var(--jogak-color-accent)]"
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
          className={inputClass}
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
          className={inputClass}
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
          className={inputClass}
        />
      )
    case 'action':
      return (
        <span className="jogak:inline-block jogak:px-2 jogak:py-0.5 jogak:text-[11px] jogak:font-semibold jogak:text-[var(--jogak-color-violet)] jogak:bg-[var(--jogak-color-violet-bg)] jogak:border jogak:border-[var(--jogak-color-violet-border)] jogak:rounded-[var(--jogak-radius-md)] jogak:font-[family-name:var(--jogak-font-mono)] jogak:leading-none">
          (action)
        </span>
      )
    case 'json':
      return (
        <code className="jogak:text-[12px] jogak:text-[var(--jogak-color-fg-muted)] jogak:font-[family-name:var(--jogak-font-mono)]">
          {JSON.stringify(value)}
        </code>
      )
  }
}

export function Controls({ args, argTypes, onArgChange }: ControlsProps): ReactElement {
  const keys = Array.from(new Set([...Object.keys(args), ...Object.keys(argTypes)]))
  const entries = keys.map((k) => [k, args[k]] as const)

  return (
    <div className="jogak:border-t-2 jogak:border-[var(--jogak-color-border)]">
      <div className="jogak:px-5 jogak:py-1.5 jogak:text-[11px] jogak:font-bold jogak:text-[var(--jogak-color-fg-subtle)] jogak:uppercase jogak:tracking-[0.08em] jogak:border-b jogak:border-[var(--jogak-color-border)] jogak:bg-[var(--jogak-color-bg-subtle)]">
        Controls
      </div>
      {entries.length === 0 ? (
        <div className="jogak:px-5 jogak:py-3 jogak:text-[var(--jogak-color-fg-subtle)] jogak:text-[13px]">
          No args defined
        </div>
      ) : (
        <table className="jogak:w-full jogak:border-collapse jogak:text-[13px]">
          <thead>
            <tr>
              <th className={thClass}>Name</th>
              <th className={thClass}>Control</th>
              <th className={thClass}>Description</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([key, value]) => {
              const argType = argTypes[key]
              return (
                <tr key={key}>
                  <td
                    className={clsx(
                      tdClass,
                      'jogak:font-[family-name:var(--jogak-font-mono)] jogak:text-[12px] jogak:text-[var(--jogak-color-fg)] jogak:whitespace-nowrap',
                    )}
                  >
                    {key}
                  </td>
                  <td className={tdClass}>
                    <ControlInput
                      argKey={key}
                      value={value}
                      argType={argType}
                      onArgChange={onArgChange}
                    />
                  </td>
                  <td className={clsx(tdClass, 'jogak:text-[var(--jogak-color-fg-subtle)]')}>
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
