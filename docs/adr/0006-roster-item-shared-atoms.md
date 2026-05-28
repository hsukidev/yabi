# Roster Item shares leaf atoms; layout shells stay divergent

`MuleCharacterCard` (Card View tile) and `MuleListRow` (List View row) carry much of the same domain payload — name, class, level, weekly meso readout, **Cap Drop Badge** / dropped-boss info, **Notes Tooltip Trigger**, **Selection Indicator** in **Bulk Delete Mode** — but the surrounding layout is intentionally divergent (full-card drag vs **Drag Handle** per ADR-0003; column-flex tile vs four-column grid per ADR-0004). The weekly meso readout is also intentionally surface-specific: **Character Card** shows **Potential Meso**, while **List View** shows **Displayed Weekly Meso**. A "shared **Roster Item Presenter**" that owned both the payload and a shape-agnostic frame has been considered. We are not building it: the two layouts diverge at the structural level (positioning, nesting, drag-activator surface), so any shared presenter ends up either branching on a `mode` prop (re-introducing the asymmetry inside the abstraction) or shrinking to the leaf atoms it was supposed to hide. The deletion test points at the leaves, not the frame.

## What gets extracted

- **`<NotesTooltipTrigger />`** — the FileText-icon trigger + tooltip body. Content and interaction are identical across modes.
- **`<CapDropTooltipTrigger />`** — the Info-icon trigger + `formatDroppedSlots` lines. Identical across modes.
- **`<SelectionIndicator />`** — the destructive-tinted box + Check render in **Bulk Delete Mode**. Identical visual; positioning controlled by the parent layout.
- **`useFormattedIncome(displayedWeeklyMeso.meso, { force?: boolean })`** — single hook that reads **Format Preference** and the optional `forceAbbreviated` override. Replaces the parallel `useIncome().abbreviated` / `formatMeso` calls in both files.

## What stays divergent

- `useSortable` integration — Card spreads `attributes` + `listeners` on the root (full-card drag); Row spreads them on the **Drag Handle** activator only (per ADR-0003).
- Layout structure — Card is a column-flex tile with the level badge inside the avatar area; Row is a four-column grid with level inline. Per ADR-0004.
- Press-engagement visuals — Card uses `scale(1.04)`; Row uses a destructive tint on the row body. Geometry-driven (scaling warps a wide-short row).
- Memoization shape — Card has an inner `MuleCardInner` memo because the avatar render is the heaviest subtree; Row's body is light enough not to need a second barrier.

## Cross-mode predicate drift (fixed inline)

The two files independently computed an income-color rule and disagreed:

- `MuleCharacterCard`: `mule.active && mule.selectedBosses.length > 0`
- `MuleListRow`: `mule.active && (metrics.weeklyCount + metrics.dailyCount) > 0`

For a **Mule** carrying **only Monthly Cadence Slate Keys** (e.g. Black Mage Hard alone), the Card painted the `0M` income line in accent while the Row dimmed it. The Row's predicate was correct: per **Monthly Income Regression**, monthly weights `× 0`, so a monthly-only mule contributes zero. The Card retained the pre-**Active Flag** predicate (intent ↔ income coupling, since retired in CONTEXT.md). The shared atom captures the card-side rule under the term **Contributing Mule** — `active && (weeklyCount + dailyCount) > 0`. **List View** now derives tone from **Displayed Weekly Meso**, so it can also dim a fully dropped **Active Mule** whose **Contributed Meso** is `0`.

## Considered Options

- **Build a `<RosterItemPresenter mode="card" | "row" />` that owns layout + payload.** Rejected: shared frame branches on `mode`, recreating the asymmetry inside the abstraction. Deletion test favours the leaves over the frame.
- **Extract leaf atoms only; keep `MuleCharacterCard` and `MuleListRow` as full layout shells (chosen).** Locality of the rules (income tint, dropped-slots tooltip, notes tooltip) concentrates; the Card-vs-Row layout difference stays explicit at the file level — matching what ADR-0003 and ADR-0004 already chose.
- **Do nothing; let the two implementations carry the rules independently.** Rejected: the predicate drift on income color was silent and only surfaced under inspection. A shared atom fails loudly when the rule changes.

If a future mode (e.g. a hypothetical compact-tile-like row hybrid) shows up, revisit by asking whether the leaf atoms still suffice or whether a presenter pays its way then.
