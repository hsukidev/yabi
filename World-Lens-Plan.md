# World Lens

## Context

Mules are currently world-agnostic. The header already exposes a **World Select** (`src/components/WorldSelect.tsx`) that persists a single `WorldId` to `localStorage['world']` via `WorldProvider`, but nothing else in the app reads it — the roster, `KpiCard`, and `PieChartCard` all aggregate across _every_ mule, which is incoherent because crystal cadence, weekly crystal cap (180), and income in MapleStory are scoped per world.

This change introduces the **World Lens**: selecting a world filters the roster and KPIs to mules belonging to that world. Each mule gains a `worldId` field at creation time (immutable) and only appears in its own world's view. On first-run — no world selected, click **Add Mule** — an in-flow blue **info banner** slides in at the top of the roster with "Please select a world first." and auto-dismisses once the user picks a world.

## Decisions (locked during grilling)

1. **Strict filter.** Selected world swaps which mules are visible; KPIs reflect only that world's mules.
2. **No migration.** Personal/dev-stage app, so pre-existing mules with no `worldId` simply won't match any lens and will be invisible (acceptable trade).
3. **Banner pattern** mirrors the bulk action bar (`RosterHeader.tsx` lines 31–94 / `@keyframes bulk-slide` in `src/index.css` line 714). Blue info-variant, not red.
4. **Position:** in-flow at the top of the roster section, above `RosterHeader`. Renders only while condition holds.
5. **Dismiss:** unmount when world becomes non-null. No timer, no close button, no fade-out.
6. **Mule↔world association is immutable.** Set at creation, never editable via drawer.

## Approach

### 1. Data model — add `worldId` to `Mule`

**File:** `src/types/index.ts` (`Mule` interface, lines 36–62)

Add `worldId?: WorldId` as an **optional** field. Importing `WorldId` from `@/data/worlds` (existing). Optional (not required) because:

- The muleStore persists a Mule array to localStorage. A required field would reject every pre-existing payload through whatever schema validation `createMuleStore` runs.
- The filter logic `m.worldId === world.id` naturally excludes `undefined`, which is exactly the "invisible in every lens" behavior we want for legacy mules.
- New mules created through the gated `addMule(worldId)` path (below) will always carry a value, so the optionality is a migration ramp, not a runtime hole.

### 2. `useMules.addMule` takes a worldId

**File:** `src/hooks/useMules.ts` lines 40–52

Change signature from `addMule()` to `addMule(worldId: WorldId)` and include it on the new mule object. Return value (new id) unchanged. This is a breaking change for the one call site (`App.tsx` line 115); update that site in the same edit.

### 3. Gate `handleAddMule` + track banner state in `App.tsx`

**File:** `src/App.tsx`

Inside `AppContent`:

- Import `useWorld` from `@/context/WorldProvider`. Call `const { world } = useWorld();` near the top of the component (after `useMules()`).
- Add `const [showWorldNeededBanner, setShowWorldNeededBanner] = useState(false);`
- Replace `handleAddMule` (lines 114–117):

  ```ts
  const handleAddMule = useCallback(() => {
    if (!world) {
      setShowWorldNeededBanner(true);
      return;
    }
    const id = addMule(world.id);
    setSelectedMuleId(id);
  }, [addMule, world]);
  ```

No `useEffect` for dismissal — the banner's render condition (`showWorldNeededBanner && !world`) naturally evaluates false the moment `world` transitions to non-null, causing React to unmount the component. That's the dismiss.

### 4. Filter mules by current world

**File:** `src/App.tsx`

Add, right after `useDeferredValue(mules)`:

```ts
const mulesInWorld = useMemo(
  () => (world ? mules.filter((m) => m.worldId === world.id) : []),
  [mules, world],
);
const deferredMulesInWorld = useDeferredValue(mulesInWorld);
```

Then swap every consumer that represents "the current view's mules" to the filtered list:

- `KpiCard mules={deferredMulesInWorld}` (line 194)
- `PieChartCard mules={deferredMulesInWorld}` (line 197)
- `RosterHeader muleCount={mulesInWorld.length}` (line 206)
- `muleIds = useMemo(() => mulesInWorld.map(...), [...])` (lines 78–82) — important for `SortableContext` to only see the current world
- The roster `.map` at line 238 → `mulesInWorld.map((mule) => ...)`

**Keep `mules` (unfiltered)** for:

- `selectedMule` lookup (line 70) — defensive; drawer id always belongs to the current world in practice but unfiltered lookup is safer
- `handleDragEnd` indices (lines 102–104) — `arrayMove` must operate on full-array indices to preserve cross-world ordering; the relative order of current-world mules is preserved because all dragged ids live in the same world

### 5. Create `WorldMissingBanner`

**New file:** `src/components/WorldMissingBanner.tsx`

Mirrors `RosterHeader`'s bulk-bar branch (lines 31–94) but with blue tokens and no dismiss affordance. Uses existing `--accent-secondary` for the blue (dark: `#5b8ca8`, light: `#7fb7ff` — already themed). No new CSS token required; reuse the existing `bulk-slide` keyframe.

Concretely:

```tsx
import { Info } from 'lucide-react';

const info = 'var(--accent-secondary)';
const infoAlpha = (pct: number) =>
  `color-mix(in oklab, var(--accent-secondary) ${pct}%, transparent)`;

export function WorldMissingBanner() {
  return (
    <div
      data-world-missing-banner
      role="status"
      className="mb-4 flex items-center gap-3"
      style={{
        padding: '10px 14px',
        borderRadius: 10,
        border: `1px solid ${infoAlpha(35)}`,
        background: infoAlpha(10),
        animation: 'bulk-slide 0.22s ease-out',
      }}
    >
      <Info size={16} style={{ color: info, flexShrink: 0 }} aria-hidden />
      <span style={{ color: info, fontWeight: 500, fontSize: 14, letterSpacing: '-0.01em' }}>
        Please select a world first.
      </span>
    </div>
  );
}
```

Render it in `App.tsx` immediately inside the roster `<section>`, above `<RosterHeader>`:

```tsx
{
  showWorldNeededBanner && !world && <WorldMissingBanner />;
}
```

### 6. Tests

- **Add** `src/components/__tests__/WorldMissingBanner.test.tsx` — renders with expected text and blue color token.
- **Add** to the App integration / roster test suite:
  - Clicking Add Mule with `world === null` shows the banner and does **not** append a mule.
  - Selecting a world via `WorldSelect` unmounts the banner.
  - With `world === 'heroic-kronos'`, Add Mule creates a mule with `worldId === 'heroic-kronos'`.
  - Two mules in Kronos + three in Hyperion: switching the lens swaps which cards render and the KpiCard totals change to reflect only the current world's mules.
- **Update** `src/hooks/__tests__/useMules.test.ts(x)` (if present) for the new `addMule(worldId)` signature.
- **Update** any fixture that constructs a `Mule` literal consumed by the filtered path to include `worldId`; fixtures that intentionally test "legacy" mules can omit it.

## Critical files

| File                                                       | Change                                                                                                |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `src/types/index.ts`                                       | Add `worldId?: WorldId` to `Mule`                                                                     |
| `src/hooks/useMules.ts`                                    | `addMule(worldId: WorldId)`                                                                           |
| `src/App.tsx`                                              | `useWorld`, gate `handleAddMule`, `mulesInWorld` memo, banner render, swap consumers to filtered list |
| `src/components/WorldMissingBanner.tsx`                    | **New** — banner component                                                                            |
| `src/hooks/__tests__/*`, roster integration test, fixtures | Signature + worldId updates                                                                           |

## What is explicitly **not** in scope

- Editing a mule's world via the drawer (decision 6 — immutable).
- A one-time migration prompt for legacy mules (decision 2 — they stay invisible).
- A new `--info` CSS token (reuse `--accent-secondary`).
- Changing `WorldSelect` to allow an explicit "no world" / "All worlds" selection (out of scope).
- Showing a different layout for the "world selected but 0 mules" state — the AddCard alone is sufficient and the empty KPI row is natural.

## Verification

1. **Dev server:** `pnpm dev`. Load app in an incognito window (clean localStorage).
2. **Banner trigger:** confirm no world is selected (italic "Select world" placeholder in header). Click the Add Mule card. Banner slides in above the roster header; no mule is created; `mules.length` in React DevTools stays 0.
3. **Banner dismiss:** open the World Select and pick Kronos. Banner unmounts immediately.
4. **Mule creation carries worldId:** click Add Mule. Drawer opens for the new mule. Inspect localStorage → `mules` array → newest entry has `worldId: "heroic-kronos"`.
5. **Filter:** create two mules under Kronos. Switch the lens to Hyperion via WorldSelect — roster shows only the AddCard; KpiCard income/crystal totals drop to 0; WEEKLY CAP counter reads `0/180`. Create a mule in Hyperion; return to Kronos; the two Kronos mules reappear with their prior totals.
6. **Reload persistence:** reload the tab with Kronos selected — Kronos mules and totals restore exactly; no banner.
7. **Drag-reorder across worlds:** reorder two Kronos mules; switch to Hyperion and back; order persists. Switching worlds must not perturb another world's order.
8. **Type check + tests:** `pnpm typecheck && pnpm test` all green.
