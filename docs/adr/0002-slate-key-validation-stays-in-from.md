# Slate-key validation stays inside `MuleBossSlate.from`, not lifted to a shared validator

`MuleBossSlate.from` is called from three sites — `muleMigrate.ts`, `modules/income.tsx`, `useBossMatrixView.ts` — and each call validates / prunes invalid **Slate Keys** independently. A refactor to extract a shared `validateSlateKeys(keys, catalog)` and have callers invoke it once at the **Mule Migration** boundary has been considered. We are not doing this: `MuleBossSlate.from` already _is_ the central validation entry point, every site goes through it, and the constructor encodes the **Selection Invariant** by construction. The "scattered validation" framing reads three correct calls as duplication; in fact each site needs a slate instance for an unrelated reason (extracting `keys` for migration write-back, calling `totalCrystalValue` for income, calling `view` for the matrix). Pruning is silent but harmless because every slate operation re-emits `slate.keys`, so any in-memory drop propagates back to persistence on the next round-trip.

## Considered Options

- **Lift validation into `MuleBossSlate.validate(keys) → { kept, dropped }` and call it once at the migration boundary; let downstream sites trust the slate.** Would make pruning observable but requires every consumer to either trust upstream cleanup or run validation themselves anyway — re-introducing the "scattered" pattern under a different name.
- **Keep the current design (chosen).** The validation seam is already the constructor; the three call sites are not duplicating logic, they are constructing the same value object from the same source for three different downstream uses.

If the silent-drop behaviour ever needs to be observable (e.g. a toast on load when keys were pruned because a boss left the catalog), revisit by adding a `MuleBossSlate.fromWithDrops` variant rather than lifting validation out.
