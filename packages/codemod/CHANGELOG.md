# @jogak/codemod

## [1.2.0] — 2026-07-02

### Added

- **Initial release**: `.stories.tsx` → `.jogak.tsx` AST-based codemod.
  - Import path rewrite (Storybook framework subpaths → `@jogak/core`)
  - `Meta<typeof X>` → `JogakMeta`
  - `StoryObj<typeof X>` → `Jogak`
  - `satisfies Meta<...>` → `satisfies JogakMeta`
  - Story exports auto-augmented with `name: '<ExportName>'` field
- CLI (`jogak-codemod`) with `--dry` (default) / `--write` / `--verbose` flags + glob patterns.
- Programmatic API (`transformSource`).
- Vitest test suite (4 cases: full CSF3, vue3 subpath, name idempotency, non-storybook import).
