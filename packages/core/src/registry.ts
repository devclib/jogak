import type { CategoryTree, RegistryEntry } from './types.js'

type CategoryNode = RegistryEntry | CategoryTree

export class ComponentRegistry {
  readonly #entries = new Map<string, RegistryEntry>()

  register(entry: RegistryEntry): void {
    this.#entries.set(entry.id, entry)
  }

  unregister(id: string): void {
    this.#entries.delete(id)
  }

  get(id: string): RegistryEntry | undefined {
    return this.#entries.get(id)
  }

  getAll(): readonly RegistryEntry[] {
    return Array.from(this.#entries.values())
  }

  search(query: string): readonly RegistryEntry[] {
    const q = query.toLowerCase()
    return this.getAll().filter((e) => e.title.toLowerCase().includes(q))
  }

  /**
   * title의 '/' 구분자로 계층 트리를 구성한다.
   * 예: "Form/Button" → { Form: { Button: RegistryEntry } }
   */
  getTree(): CategoryTree {
    const tree: CategoryTree = {}
    for (const entry of this.#entries.values()) {
      const parts = entry.title.split('/')
      let node: CategoryTree = tree
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i]
        if (part === undefined) continue
        const existing: CategoryNode | undefined = node[part]
        if (existing === undefined || 'id' in existing) {
          node[part] = {}
        }
        node = node[part] as CategoryTree
      }
      const leaf = parts[parts.length - 1]
      if (leaf !== undefined) {
        node[leaf] = entry
      }
    }
    return tree
  }

  clear(): void {
    this.#entries.clear()
  }

  get size(): number {
    return this.#entries.size
  }
}

export const defaultRegistry = new ComponentRegistry()
