# Changesets

When your PR introduces a user-facing change, drop a markdown file in this directory:

```
.changes/<short-slug>.md
```

```markdown
---
bump: minor
---

Add dark mode toggle to the settings page.
```

- **`bump`** — one of `patch`, `minor`, `major`. See `docs/RELEASING.md` for when to use which.
- **Body** — one line. Becomes a bullet on the changelog page.

Internal-only changes (refactors, dep bumps, build tooling, tests) don't need a changeset.

To cut a release, run `pnpm release` and follow the prompts. Full workflow: `docs/RELEASING.md`.
