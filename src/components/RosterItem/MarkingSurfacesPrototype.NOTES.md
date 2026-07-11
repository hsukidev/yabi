# PROTOTYPE NOTES — marking affordances on List View and touch

Wayfinder ticket: [Prototype: marking affordances on List View and touch](https://github.com/hsukidev/yabi/issues/296)

**Question:** how does completion marking (daily / weekly / BM) work outside
Card View + mouse — on List View rows and on the touch path (the Drawer)?

**How to view:** `npm run dev` → `/` — switch to List View for the row
variants; open any mule for the drawer variants. Floating bar, `?variant=a|b|c`,
or ← / → keys. Card View also shows the settled 4-row kebab (incl. the new
cyan Daily row) for context.

- **A "Kebab everywhere"** — row: hover kebab replacing the Active Switch
  (4-row menu incl. Set Active), inline colored checks beside it; drawer:
  kebab next to the delete button (marks-only menu — Active Toggle already
  lives in the drawer).
- **B "Inline chips"** — row: keeps the Active Switch, three always-visible
  circular check chips after the Lv pill (one tap each); drawer: labeled
  DAILY/WEEKLY/BM chip row under the income chips.
- **C "Row kebab · drawer completion panel"** — row: same as A; drawer:
  full-width COMPLETION section with three Active-Toggle-styled buttons
  between the header and the fields.

Decided rules already applied everywhere: zero daily keys → no Daily control;
zero monthly keys → no BM control; action-worded labels; always-lit color-key
dots; marks shared in-memory with the card prototype (all surfaces stay in
sync). Dev builds only; gated off under vitest.

**Verdict (2026-07-11):** **Variant C won** for the row — List View rows get
the hover kebab (replacing the Roster Active Switch, inline checks beside it).
**Amended same day (×2):** the drawer's COMPLETION panel, Active pill, and
info icon were all removed; instead the drawer gets a **kebab in place of
the trash icon** — same menu as the roster card plus a destructive Delete
row that hands off to the existing Delete?/Yes/Cancel confirmation. That
kebab is the touch marking path. Also: the drawer header shows the roster's
colored completion checks next to the mule name, and the CrystalTally is
permanently horizontal under the header (the old ≥605px side-column handoff
is gone). The old drawer mark components and A/B row variants are dead code;
delete when folding in.
