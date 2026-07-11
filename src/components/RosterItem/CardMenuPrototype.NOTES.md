# PROTOTYPE NOTES — card kebab menu + completion checks

**Question:** replace the Roster Active Switch on roster cards with a hover
kebab (⋮) menu (set active/inactive · mark weekly complete · mark BM complete),
with completion shown as check marks next to the level badge — purple = weekly
crystal, gold = monthly (BM) crystal.

**How to view:** `npm run dev` → open `/` in Card View, hover a card.
Switch variants with the floating bar, `?variant=a|b|c`, or ← / → keys.

- **A** — kebab → dropdown menu; completion as circular tinted check chips
  right of the Lv badge.
- **B** — no menu: hover reveals a 3-button icon strip (power / purple check /
  gold check), one click each; completion as bare colored check glyphs right
  of the Lv badge.
- **C** — kebab always faintly visible; menu rows show current status (dots +
  on/off); completion checks render *inside* the Lv pill (`Lv.250 ✓✓`).

**Caveats (prototype-only):** completion marks are in-memory (refresh wipes
them, not on the Mule model yet); dev builds only — prod keeps the real
switch; List View untouched.

**Verdict:** **C wins**, with tweaks (2026-07-10): kebab hover-only (no faint
idle); labels name the action (inverse of state) — "Set Active/Set Inactive",
"Weekly Complete/Weekly Incomplete", "BM Complete/BM Incomplete"; no on/off
modifier; no check glyphs inside the menu; all three dots always lit
(green / purple / gold) — they're color keys, not state. Awaiting
final confirmation before real implementation. When confirmed, delete
`CardMenuPrototype.tsx`, this file, and the PROTOTYPE-marked hooks in
`MuleCharacterCard.tsx` / `Dashboard.tsx`, folding the winner in properly
(real Mule fields + persistence + reset-cycle semantics)._
