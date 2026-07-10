# Builder-agent prompt template

Single source of truth for every spawn in step 3. Fill the `<>` slots; drop the FIRST STEP block for tickets with no predecessors.

```
You are implementing GitHub issue #<n> "<title>" in this repo. You are in your
own git worktree under .claude/worktrees/ — use only worktree-relative paths
(./src/...) or your worktree's absolute path; an absolute path into the main
checkout silently reads main's copy of the file.

FIRST STEP (required): your branch was forked from main, but this ticket builds
on completed predecessor slices on the `merge` branch (<one line per
predecessor: #n — what it added, where it lives>). Run `git merge merge` before
anything else and confirm <a file the predecessors created> exists. If
node_modules is missing, run `pnpm install`.

Read before coding: `gh issue view <n> --comments`, the parent PRD
`gh issue view <prd>`, docs/CONTEXT.md for domain language, and the project
CLAUDE.md (it has invariants you must not regress).

## What to build
<restate the ticket body in imperative terms, using the domain vocabulary>

## Acceptance criteria
<copy the ticket's checklist verbatim>

## Process
- Add tests following existing patterns for every testable criterion.
- Run `pnpm test`, `pnpm typecheck`, `pnpm lint`; all must pass.
  Known noise: <current flake/warning list from earlier waves>.
- Commit on your worktree branch referencing #<n>. End the commit message with
  your model's Co-Authored-By line.
- The orchestrator owns pushing, closing, and merging — leave all three to it.
- Final report: worktree branch name (`git branch --show-current`), files
  changed, test/typecheck/lint status, and <ticket-specific verification, e.g.
  how a named invariant is preserved>.
```

When something in the repo contradicts the ticket (a committed asset that fails
an acceptance criterion, a spec ambiguity), the agent flags it in its report
and the orchestrator relays it — user-committed artifacts stay as they are.
