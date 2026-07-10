# Per-surface `MuleBossSlate` reconstruction stays; no threaded `MuleContribution`

`MuleBossSlate.from(selectedBosses, worldGroup)` is called independently at seven sites for a single roster render — `modules/income.ts`, `modules/worldIncome.ts`, `modules/monthlyIncome.ts`, `components/rosterRowMetrics.ts` (twice), `components/MuleCharacterCard.tsx`, `components/MuleDetailDrawer.tsx`, `hooks/useSlateActions.ts`. A refactor that builds the slate once per **Mule** and threads a fattened per-mule value (slate + counts + **Potential Meso** + **Contributed Meso** + tone) through the roster, **KPI Card**, and **Drawer** has been considered. We are not doing it.

The reconstruction is cheap — `MuleBossSlate.from` is a small validated-value-object constructor over ≤14 weekly keys, and every call site memoizes on the same inputs. The locality the refactor chases is already largely captured: `rosterRowMetrics` single-sources the per-row counts, **Displayed Weekly Meso**, share, and dropped keys, and ADR-0006's shared leaf atoms concentrated the tone rules whose drift originally motivated the idea. What remains is consistency-by-convention (each surface constructs the same value object from the same source), which is the pattern ADR-0002 already blessed for validation.

Threading one rich object would also cut against two standing constraints:

- **ADR-0005** — **Potential Income** and **Contributed Meso** stay split at call sites; a `MuleContribution` that carries both invites conflating them exactly where the split was defended.
- **CLAUDE.md drawer keystroke-perf invariants** — new object identities threaded through `MuleCharacterCard` / `MuleListRow` / `MuleDetailDrawer` memo barriers are precisely the mechanism that has busted those barriers before.

## Considered Options

- **Build the slate once per mule in `Dashboard` (or `useWorldIncome`) and thread a `MuleContribution` extended with counts/tone everywhere.** Rejected: perf win is negligible, the consistency win is mostly already delivered by `rosterRowMetrics` + ADR-0006 atoms, and the threaded object risks memo-barrier regressions and ADR-0005 conflation.
- **Keep per-surface reconstruction (chosen).** Each surface constructs the slate it needs from `selectedBosses`; `rosterRowMetrics` remains the single source for roster-row derivations.

Revisit if (a) a surface genuinely needs **Potential Meso** and **Contributed Meso** at the same call site — ADR-0005 already prescribes a thin presenter composing the two for that case — or (b) a second cross-surface tone/predicate drift bug lands despite ADR-0006's atoms, which would show the convention is not holding.
