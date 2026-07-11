# PROTOTYPE NOTES — KPI progress readout presentation

Wayfinder ticket: [Prototype: KPI progress readout presentation](https://github.com/hsukidev/yabi/issues/297)

**Question:** how do the progress readouts read — "X / expected" in the two
KPI income blocks and "x / total" in the WEEKLY / DAILY / MONTHLY tiles?

**How to view:** `npm run dev` → `/`. Mark mules via the card/row kebab or
the drawer COMPLETION panel — the KPI card updates live. Floating bar,
`?variant=a|b|c`, or ← / → keys. Check the stacked (<640px) and narrow
(<375px) viewports too.

- **A "Inline slash"** — X big accent, `/ expected` muted on the same
  baseline; tiles read `12/34`.
- **B "Progress bar"** — X big over a thin fill bar, `EXPECTED` caption
  right-aligned; tiles get a mini bar.
- **C "Stacked + % chip"** — X big with a % pill, `OF {expected} EXPECTED`
  eyebrow beneath; tiles dim at 0%.

**Caveats (prototype-only):** X math is a pre-Cap-Cut approximation clamped
to the displayed totals (real build uses the aggregator's post-cut
attribution); marks are the in-memory store, wiped on refresh.

**Verdict (2026-07-11):** **Variant A won** — inline slash. Income blocks:
X in the accent bignum, `/ expected` muted mono on the same baseline
(muted X at 0). Tiles: `12 / 34` — accent numerator at the tile's 28px,
`/ total` stepped down (16px muted mono), echoing the income block treatment.
Tile order swapped to MULES · ACTIVE · DAILY · WEEKLY · MONTHLY (cadence
order). B's bars and C's % chip are dead; delete when folding into the real
build.
