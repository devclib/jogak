# Changesets

This directory holds pending [changesets](https://github.com/changesets/changesets) — human-readable summaries of changes waiting to be released.

## Workflow

**When you make a user-visible change**, add a changeset:

```bash
pnpm changeset
```

The interactive prompt asks:
1. Which packages changed
2. Bump type (major/minor/patch)
3. Summary

A markdown file lands in `.changeset/`. Commit it with your PR.

**Fixed group.** All four publishable packages release together with the same version bump:
- `@jogak/core`
- `@jogak/ui`
- `@jogak/cli`
- `@jogak/codemod`

Selecting any one of them in `pnpm changeset` bumps all four.

## Releasing

When ready to release (maintainer action):

```bash
# 1. Apply pending changesets — bumps versions, generates CHANGELOG entries
pnpm changeset version

# 2. Commit the version bump + CHANGELOG changes
git add -A && git commit -m "release: <version>"

# 3. Tag + push → release.yml (tag-triggered) publishes to npm
git tag v<version>
git push origin main v<version>
```

The existing tag-triggered `release.yml` handles publishing. Changesets manages the version + CHANGELOG generation locally.

## Ignored packages

Examples, benchmarks, test-cases, and demo apps are marked `ignore` in `config.json` — no changesets required for those.
