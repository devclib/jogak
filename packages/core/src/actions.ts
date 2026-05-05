import type { ArgType } from './types.js'

export interface ActionLog {
  readonly id: number
  readonly name: string
  readonly args: readonly unknown[]
  readonly timestamp: number
}

export type ActionListener = (logs: readonly ActionLog[]) => void

export class ActionChannel {
  #logs: ActionLog[] = []
  #listeners = new Set<ActionListener>()
  #nextId = 1

  emit(name: string, args: readonly unknown[]): void {
    const log: ActionLog = {
      id: this.#nextId++,
      name,
      args,
      timestamp: Date.now(),
    }
    this.#logs = [...this.#logs, log]
    this.#notify()
  }

  subscribe(listener: ActionListener): () => void {
    this.#listeners.add(listener)
    listener(this.#logs)
    return () => {
      this.#listeners.delete(listener)
    }
  }

  clear(): void {
    if (this.#logs.length === 0) return
    this.#logs = []
    this.#notify()
  }

  getLogs(): readonly ActionLog[] {
    return this.#logs
  }

  #notify(): void {
    for (const listener of this.#listeners) listener(this.#logs)
  }
}

export const defaultActionChannel = new ActionChannel()

export function action(
  name: string,
  channel: ActionChannel = defaultActionChannel,
): (...args: unknown[]) => void {
  return (...args: unknown[]) => {
    channel.emit(name, args)
  }
}

/**
 * argTypes를 보고 함수/action prop 자리에 args에 정의된 값이 없으면 자동으로 spy를 주입한다.
 * 어댑터(react, web-components 등)가 render 직전에 호출한다.
 */
export function injectActions(
  args: Readonly<Record<string, unknown>>,
  argTypes: Readonly<Record<string, ArgType>>,
  channel: ActionChannel = defaultActionChannel,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...args }
  for (const key of Object.keys(argTypes)) {
    const argType = argTypes[key]
    if (argType === undefined) continue
    const isAction = argType.action !== undefined && argType.action !== false
    const isFunctionType = argType.type === 'function'
    if (!isAction && !isFunctionType) continue
    if (typeof merged[key] === 'function') continue
    const name = typeof argType.action === 'string' ? argType.action : key
    merged[key] = action(name, channel)
  }
  return merged
}
