# List View row stacks Weekly/Daily under identity, not in a right-side cluster

**List View** rows now place **Weekly Count** and **Daily Count** as a second line under the name/class/**Lv.X** row, both inside the identity column. The right side of the row collapses to **Displayed Weekly Meso** + share-of-roster only. Previously the row carried a right-side metrics cluster — three flush-right blocks (`WEEKLY X/14`, `DAILY X`, income+share) sized by per-metric width tokens — that competed for horizontal space with the income column on narrow viewports and required a JS-measured shared-width to keep WEEKLY/DAILY aligned across rows when income text width varied.

The motivation is responsive layout. A **List View** row holds four discrete data clusters (handle, avatar, identity, income), and the prior layout treated each metric as its own grid track. On narrow viewports the right cluster's three tracks plus a wide unabbreviated income value pushed the identity column to collapse, occasionally truncating the name. Stacking metrics inside identity reclaims the right side for income only, lets the identity column use `minmax(0, 1fr)` and wrap gracefully, and removes the cross-row alignment problem entirely — since metrics now sit at a fixed offset (handle width + avatar width + gap), every row's WEEKLY position is the same regardless of income text width.

## Considered options

- **A · Faithful recreation (chosen).** Two stacked rows in the identity column: `name + class + Lv.X` on top, `WEEKLY X/14` + `DAILY X` inline below. Right column = income + share. Matches the user's reference screenshot and the design bundle's RefA variant. Smallest change to the row's mental model — every cluster keeps its semantic owner.
- **B · Progress rings for Weekly/Daily.** Same stack, but the metrics render as small circular rings with the count inside. Rejected: ring rendering adds an SVG per metric per row (40+ DOM nodes for a 20-mule roster); buys glanceability we already get from `X/14` text, and the **Daily** ring becomes ambiguous since there's no daily cap.
- **C · Dot tracker grids.** Weekly = 14 dots, Daily = N dots, filled-vs-unfilled. Rejected for the same reason — implies a fixed Daily cap (we'd have to pick 6, 7, or "auto-size to count") and adds one DOM node per dot per row.
- **D · Bigger income + bottom share bar.** Same identity stack, but income jumps to 24px and a thin accent bar runs along the row's bottom edge encoding share-of-roster. Rejected: the bottom bar is decorative; share is already in the income block; income at 24px conflicts with row-height invariants and adds visual weight that drowns out the headline (`Total Weekly Income` on **KPI Card**).

## Consequences

- **Drag Handle** column tightens to 24px regardless of **Density** (was 40px **Comfy**, 32px **Compact**) — the previous wider handle was a hold-over from when the row's right cluster ate horizontal space; with the right side now narrower, the handle can be slimmer and give the identity column more room.
- The **Weekly Cap Rail** / **Cap Drop Badge** semantics are unchanged. The cap-drop **Info** trigger still sits inline next to the income bignum.
- The **Notes** trigger still sits inline next to the name in the first identity row.
- **Daily Count** renders as a bare `X` (no fraction). Per CONTEXT.md, it is a weekly-basis crystal count (`daily key count × 7`), and there is no **Daily Crystal Cap**; the prior right-cluster stacked layout already showed it bare, the new inline layout matches.
- The shared-income-width measurement that used to live in `RosterListView` is removed. WEEKLY/DAILY positions no longer depend on income column width, so per-roster measurement is unnecessary. Income column right-floors at `--row-income-w` (a per-density var) so a row with `0M` doesn't sit dramatically narrower than a row with `5.31B`.
- Removed CSS vars: `--row-weekly-w`, `--row-daily-w`, `--row-metric-gap` (and the corresponding contract-test pins). Added: `--row-identity-gap` (between the two identity rows), `--row-metric-row-gap` (between WEEKLY and DAILY blocks).
- The `Eyebrow` helper component (the stacked label-over-value renderer used by the old WEEKLY/DAILY blocks) is deleted. SHARE renders inline next to its value in the income block — the existing pattern.
- ADR-0003 (the **Drag Handle** itself, as a separate gesture surface in **List View** vs **Card View**'s full-card drag) is unaffected. Only the handle's column width changes, not its role.

If the row ever needs a fourth functional cluster (e.g. a per-mule action menu) or the identity column shrinks below the point where two rows fit comfortably, revisit by promoting income to its own stacked sub-row or by collapsing class/level into a single line.
