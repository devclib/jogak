# @jogak/codemod

AST-based codemod to migrate Storybook CSF3 stories (`*.stories.tsx`) to Jogak entries (`*.jogak.tsx`).

## Usage

```bash
# dry-run (default) — preview changes without writing
npx @jogak/codemod 'src/**/*.stories.tsx'

# apply — rewrite sources and rename files
npx @jogak/codemod --write 'src/**/*.stories.tsx'

# per-file detail
npx @jogak/codemod --write --verbose 'src/components/*.stories.tsx'
```

## What it rewrites

- `import type { Meta, StoryObj } from '@storybook/react'` → `import type { JogakMeta, Jogak } from '@jogak/core'`
  (also handles `@storybook/vue3`, `@storybook/svelte`, `@storybook/nextjs`, `@storybook/web-components`, etc.)
- `Meta<typeof X>` → `JogakMeta`
- `StoryObj<typeof X>` → `Jogak`
- `satisfies Meta<...>` → `satisfies JogakMeta`
- `export const Primary: Story = { args }` → `export const Primary: Jogak = { name: 'Primary', args }` (adds `name` field automatically)

## What it does NOT touch (manual)

- **Play function context signature** — Storybook's `{ canvasElement, args, step }` differs slightly from Jogak's `{ canvasElement, args }`. Review any `play:` implementations.
- **Decorators** — Jogak has no decorator concept. Wrap in component composition instead.
- **`render` / `loaders`** — out of scope for CSF3 → Jogak.
- **`parameters`** referencing specific Storybook addons.

See the [Migration guide](https://jogak.dev/en/docs/migration-from-storybook) for the full checklist.

## Programmatic API

```ts
import { transformSource } from '@jogak/codemod'
import { readFile } from 'node:fs/promises'

const original = await readFile('Button.stories.tsx', 'utf8')
const { source, changes } = transformSource(original)
console.log(changes) // { importsRewritten, metaTypeReplaced, storyObjReplaced, satisfiesRewritten, nameFieldsAdded }
```

## License

MIT
