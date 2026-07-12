The role of this file is to describe common mistakes and confusion points that agents might encounter as they work in this project. If you ever encounter something in the project that surprises you, please alert the developer working with you and indicate that this is the case in this CLAUDE.md file to help prevent future agents from having the same issue.

## Agent skills

### Issue tracker

Issues and PRDs live in GitHub Issues for `hsukidev/yabi`. See `docs/agents/issue-tracker.md`.

### Triage labels

Skills should map canonical triage roles onto this repo's existing GitHub labels. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repo with domain language in `docs/CONTEXT.md` and ADRs in `docs/adr/`. See `docs/agents/domain.md`.

## Worktrees live under `.claude/worktrees/agent-*`

When an agent is launched with its own worktree, the cwd is
`/home/.../yabi/.claude/worktrees/agent-<hash>` — **not** the
main checkout at `/home/.../yabi`. Both paths contain a
`src/` tree, but only the worktree path is on the agent's branch.

Always use the worktree-relative path (either `./src/...` relative paths or the
absolute worktree path) when reading and editing files. An absolute path
starting with `/home/.../yabi/src/...` will silently read the
**main branch's** copy of the file, which is confusing when the worktree has
predecessor-slice changes that aren't yet in main.

`git worktree list` will show the full path for the current agent's worktree.

## Guarding controls inside a click-to-activate roster surface

Roster Character Cards and List View rows are themselves click-to-activate
(open the Drawer) **and** dnd-kit drag surfaces, so any interactive child must
swallow its own activation paths or a tap on it will also open the Drawer /
start a drag. The live pattern is a guard element that calls `stopPropagation`
for click/pointerdown/keydown/touchstart — see
`RosterItem/NotesTooltipTrigger.tsx` and `RosterItem/CapDropTooltipTrigger.tsx`
(the row's drag handle guards the same way via `onClick={stopBubble}`).

Extra caveat if the guarded child is a `@base-ui/react` **Switch** (see
`ui/switch.tsx`): the Switch toggles through a hidden `<input>`, so a click on
the visible switch button dispatches a **second** click event from that input.
`stopPropagation` on the Switch element itself does not stop it — the guard
**wrapper** is what stops both. (No roster item currently mounts a Switch —
the per-item Roster Active Switch was retired; roster-side Active flips live in
the Bulk Action Bar and single-mule flips in the Drawer's Active Toggle — but
keep this in mind before dropping one into a click-to-activate surface.)

## MuleDetailDrawer — keystroke perf invariants

The drawer renders `BossMatrix` (potentially hundreds of cells).
Every keystroke in any drawer input re-renders `MuleDetailDrawer`, so the
heavy children **must** stay behind their `memo` barriers. Two ways those
barriers get busted; both have bitten us before.

### 1. Lift drawer-level draft state only when something upstream actually reads it

Inputs in the drawer use a "lifted draft" pattern (see `useMuleIdentityDraft`,
`useMuleNotesDraft`) — local React state that commits to `onUpdate` on blur /
mule-switch / unmount. Calling that hook at the **drawer level** is only
correct when something rendered by the drawer itself (e.g. the header `<h2>`
showing the live name, or the live `Lv.X` chip) needs to read the draft.

If nothing upstream reads the draft, call the hook **inside the field
component** instead. Otherwise every keystroke re-renders the entire drawer
including BossMatrix's parent JSX. This is why `useMuleNotesDraft` lives
inside `MuleNotesField` — the drawer never reads `notes.draft`, so there's
no reason to pay the per-keystroke drawer re-render.

`useMuleIdentityDraft` **must** stay lifted: the header reads
`identity.name.draft` and `identity.level.draft` live.

### 2. `useCallback` deps must be the values you actually read, not the surrounding hook objects

The drawer's hooks (`useMatrixFilter`, `useSlateActions`, `usePartySizes`,
`usePresetPill`) return **fresh object literals every render**. Individual
fields inside those returns (memoized arrays, `useCallback`-wrapped
functions, `useState` setters) are referentially stable, but the wrapping
object is not.

So this is wrong — `handleApplyPreset` gets a new identity on every drawer
render, busting `MatrixToolbar`'s memo on every keystroke:

```ts
// WRONG — matrixFilter and slateActions are fresh objects every render
const handleApplyPreset = useCallback(
  (preset) => {
    /* uses matrixFilter.filter, matrixFilter.setFilter, slateActions.applyPreset */
  },
  [matrixFilter, slateActions],
);
```

Destructure first and depend on the individual values:

```ts
// RIGHT — these are individually stable
const { filter: cadenceFilter, setFilter: setCadenceFilter } = matrixFilter;
const { applyPreset } = slateActions;
const handleApplyPreset = useCallback(
  (preset) => { … },
  [cadenceFilter, setCadenceFilter, applyPreset],
);
```

When adding a new callback that closes over drawer hooks, always destructure
the specific values you read and put **those** in the dep list.

### Verifying

In React DevTools Profiler with "Record why each component rendered" on,
type into a drawer input. `MuleDetailDrawer` is expected to re-render
(state hook changed). `BossMatrix` and `MatrixToolbar` must **not** show up
in the commit. If they do, one of the two patterns above has regressed.
