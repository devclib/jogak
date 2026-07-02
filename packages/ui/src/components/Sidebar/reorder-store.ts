/**
 * 1.2.0 post-1.2: Sidebar 순서 커스터마이즈 — localStorage 지속.
 *
 * 저장 형식: `parentKey → orderedIds[]`
 * - parentKey는 category 경로 ('' = root, 'Components' = top-level category, 'Components/Buttons' = nested)
 * - orderedIds는 그 parentKey 안 자식 노드의 표시 순서 (entry.id 또는 nested category 이름)
 *
 * 미저장 노드는 원 순서 유지. 저장된 노드가 순서 앞으로 이동.
 */

const STORAGE_KEY = 'jogak:sidebar:order'

export type ReorderMap = Readonly<Record<string, readonly string[]>>

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function loadReorderMap(): ReorderMap {
  if (!isBrowser()) return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === null) return {}
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out: Record<string, readonly string[]> = {}
    for (const [k, v] of Object.entries(parsed)) {
      if (Array.isArray(v) && v.every((x) => typeof x === 'string')) {
        out[k] = v
      }
    }
    return out
  } catch {
    return {}
  }
}

export function saveReorderMap(map: ReorderMap): void {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // storage quota / disabled — best-effort.
  }
}

/**
 * items를 parentKey의 저장 순서에 따라 재정렬. 저장 순서에 없는 items는 원 순서로 뒤에.
 */
export function applyOrder<T extends string>(items: readonly T[], parentKey: string, map: ReorderMap): T[] {
  const stored = map[parentKey]
  if (stored === undefined || stored.length === 0) return items.slice()
  const set = new Set<string>(items)
  const preserved: T[] = []
  for (const s of stored) if (set.has(s)) preserved.push(s as T)
  const preservedSet = new Set<string>(preserved)
  for (const it of items) if (!preservedSet.has(it)) preserved.push(it)
  return preserved
}

/**
 * dragged를 dropTarget 자리로 이동 — 순서 재계산.
 */
export function reorderInPlace<T extends string>(
  items: readonly T[],
  dragged: T,
  dropTarget: T,
): T[] {
  if (dragged === dropTarget) return items.slice()
  const filtered = items.filter((x) => x !== dragged)
  const dropIdx = filtered.indexOf(dropTarget)
  if (dropIdx === -1) return items.slice()
  return [...filtered.slice(0, dropIdx), dragged, ...filtered.slice(dropIdx)]
}

/**
 * parentKey의 저장 순서 갱신.
 */
export function updateOrder(map: ReorderMap, parentKey: string, order: readonly string[]): ReorderMap {
  return { ...map, [parentKey]: order.slice() }
}
