# Design System — Mule Income Tracker

A MapleStory Reboot weekly-income tracker. The design language is **Dark Amber** (default) / **Pastel Cozy** (light) — warm accent tones over a quiet, low-contrast canvas. Numbers are monospace; chrome is soft; the accent glows.

## Aesthetic

- **Vibe**: quiet dashboard. Deep ink surface, single warm accent, soft amber glow on the hero card. Data-first; no decoration that doesn't carry meaning.
- **Temperature**: dark mode reads cool-neutral with an amber focal point; light mode reads warm-cream with a terracotta focal point.
- **Motion**: 120–220ms ease transitions. Cards lift 2px on hover. Sheet slides 30px with `cubic-bezier(.2,.9,.3,1)`. Pie sectors inflate 6px on hover with a drop-shadow in their own fill color.

---

## Tokens — [src/index.css](src/index.css)

Tokens come in two layers:
1. **Handoff tokens** (`--bg`, `--surface`, `--text`, `--accent-raw`, `--c1..--c5`) — hex values, the source of truth for color.
2. **shadcn tokens** (`--background`, `--card`, `--primary`, etc.) — semantic names mapped from the handoff layer for shadcn/ui and base-ui components.

Components read whichever matches their context. Inline styles mostly use the handoff layer with a shadcn fallback, e.g. `var(--accent-raw, var(--accent))`.

### Dark (default — `ThemeProvider defaultTheme="dark"`)

| Role | Token | Value |
|---|---|---|
| Page background | `--bg` / `--background` | `#0b0b10` |
| Page background alt | `--bg-2` | `#111118` |
| Card / panel | `--surface` / `--card` | `#15161d` |
| Raised / recessed | `--surface-2` / `--surface-raised` | `#1b1d26` |
| Text | `--text` / `--foreground` | `#eeecda` |
| Muted text | `--muted-raw` / `--muted-foreground` | `#72778a` |
| Dim (empty values) | `--dim` / `--surface-dim` | `#3a3d4d` |
| Border | `--border-raw` / `--border` / `--input` | `#262836` |
| **Accent** | `--accent-raw` / `--accent` / `--primary` / `--ring` | `#f0b44a` (amber) |
| Accent soft (fills) | `--accent-soft` | `rgba(240, 180, 74, 0.15)` |
| Accent glow (shadows) | `--accent-glow` | `rgba(240, 180, 74, 0.25)` |
| Destructive | `--destructive` | `hsl(8 60% 52%)` |

Chart palette (`--c1..--c5`): amber `#f0b44a`, blue `#7fb7ff`, coral `#e88774`, teal `#6fd3b5`, lavender `#b395e0`.

### Light — `Pastel Cozy`

| Role | Value |
|---|---|
| Background | `#f6efe4` cream |
| Surface | `#fffaf0` |
| Surface alt | `#f8ecd6` |
| Text | `#3b2f24` deep coffee |
| Muted | `#8a7a65` |
| Dim | `#c9b896` |
| Border | `#e4d6ba` |
| **Accent** | `#d97757` terracotta |
| Accent soft | `rgba(217, 119, 87, 0.14)` |

Chart palette: `#d97757`, `#5b8ca8`, `#e2a84f`, `#7ea67a`, `#a97bb5`.

### Color space

Hex for the handoff layer (concrete, human-readable). `color-mix(in hsl, …)` is used in a few places (App.tsx drag boundary). `hsl(from …)` relative syntax appears for the pie empty-state glow.

---

## Typography

- `--font-sans` / `--font-display`: **Geist Variable** with `ss01` and `cv11` OpenType features enabled on `<body>`, weight 500, letter-spacing `-0.005em`.
- `--font-mono`: **JetBrains Mono Variable** — used for every number in the app (levels, meso values, party size).
- `.font-mono-nums` utility: monospace + `font-variant-numeric: tabular-nums` + `letter-spacing: -0.02em`. Apply to any stat that might change digit count.

### Type roles

| Role | Style |
|---|---|
| Hero number (`bignum`) | JetBrains Mono, 58px / 500, `--accent-raw`, `text-shadow: 0 0 40px var(--accent-glow)` |
| Section heading | Geist, 2xl bold, tracking-tight (`font-display`) |
| Body | Geist 14–15px, 500 |
| Eyebrow (`eyebrow`, `eyebrow-plain`) | JetBrains Mono, 10px, uppercase, `letter-spacing: 0.14em`, muted — optionally prefixed with a 18×3px accent "dot" |
| Drawer sub-label | Geist 10px, uppercase, `tracking-[0.26em]`, muted |
| Stat number (`KpiStat`) | JetBrains Mono 22px |
| Matrix cell value | JetBrains Mono 11px, tabular-nums |

---

## Surface primitives (utility classes)

From `@layer base` in `index.css`:

- `.panel` — `background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius)`. The default card chrome.
- `.panel-glow` — a `.panel` with a surface→surface-2 vertical gradient, a 1px border ring, a **20px / 60px amber glow shadow** (`0 20px 60px -30px var(--accent-glow)`), and an inset hairline. Used on the hero KPI card only.
- `.bignum` — hero meso total (see typography).
- `.eyebrow` / `.eyebrow-plain` / `.bar-accent` — section labels and separators.

Radius: `--radius: 0.875rem` (14px). Tailwind aliases `--radius-sm`...`--radius-4xl` scale from `0.6×` to `2.6×`.

---

## Atmosphere

Layered behind everything (fixed, `z-index: -2` and `-1`):
- **`body::before`**: two radial gradients — amber soft glow top-left, pale blue wash top-right (dark only). Light mode drops the blue wash and keeps the warm halo.
- **`body::after`**: SVG fractal noise at 3% opacity, `mix-blend-mode: overlay`, blue-tinted. Adds subtle grain without dithering the palette.

The hero KPI card's warm glow sits visually on top of the top-left radial halo — the two work together.

---

## Density — `[data-density]`

Set on `<html>` via `DensityProvider` (`comfy` default, `compact` alt). Controls CSS variables consumed by the roster:

| Var | Comfy | Compact |
|---|---|---|
| `--card-pad` | 16px | 12px |
| `--roster-cols` | 6 | 8 |
| `--mule-name-size` | 14px | 13px |
| `--roster-card-min-height` | 260px | 220px |

The roster grid reads `grid-template-columns: repeat(var(--roster-cols), minmax(0, 1fr))`. `DensityToggle` is a two-option segmented control in the Roster heading.

---

## Theme switch

`ThemeProvider` toggles the `.dark` class on `<html>`. `Header`'s `Sun`/`Moon` icon (lucide-react) in the top-right calls `toggleTheme`. The backdrop uses a 12px blur + `sticky top-0`.

---

## Component reference

### [Header](src/components/Header.tsx)
Sticky, translucent, blurred. 14px-tall row. Logo is a 26×26 amber rounded-square "M" badge with mono weight 800. Wordmark reads `Mule.Income` — muted dot-separator.

### [KpiCard](src/components/KpiCard.tsx) — hero
`panel panel-glow` with 24px padding. Layout: eyebrow with accent dot → `bignum` (click-to-toggle abbreviated format) + italic "mesos" suffix → two `KpiStat`s (MULES / ACTIVE). `ACTIVE` is accent-colored when it's the sibling stat.

### [SplitCard](src/components/SplitCard.tsx) + [IncomePieChart](src/components/IncomePieChart.tsx)
Plain `panel` wrapping a 260px Recharts donut. Inner radius 66, outer 100, 2° padding angle, 2px card-colored stroke. Hovered sector swells +6px and gains a `drop-shadow` of its own fill. Center label: "Total" / meso number, or the hovered slice's name/value. Empty state: dashed-border circle with a radial amber halo and italic "No bosses tallied yet". Slice click → opens drawer for that mule.

### [MuleCharacterCard](src/components/MuleCharacterCard.tsx)
`.panel` + `var(--card-pad)`. Hover: translateY(-2px), `0 8px 32px -8px var(--accent-glow)` shadow. Layout:
- **Top-left** — `Lv.NN` badge: 10px mono, bordered, `--surface-2` background.
- **Top-right** — trash button, hidden until hover or popover open. Uses shadcn `Popover` for delete confirm.
- **Center** — 112px `blank-character.png` placeholder avatar (non-draggable, `aria-hidden`).
- **Name** — 14px / 600 (13px in compact). Falls back to italic muted "Unnamed".
- **Class** — 10px mono, uppercase, muted.
- **Weekly income row** — top-bordered; "WEEKLY" eyebrow + mono value. **Abbreviated on mobile, full on desktop** via `md:hidden` / `hidden md:inline` paired spans. Color: accent if bosses tallied, `--dim` if zero.

Card is also a dnd-kit sortable handle; the full card is the drag surface (pointer sensor with 5px activation distance).

### [AddCard](src/components/AddCard.tsx)
Dashed 2px border tile in the roster grid. On hover: border and `+` icon flip to accent; background fills with `--accent-soft`. Reads the shared `--roster-card-min-height` token (also consumed by `MuleCharacterCard`), and the roster grid pins every implicit row to that same floor via `grid-auto-rows: minmax(var(--roster-card-min-height), auto)` — so the AddCard stays flush with mule cards whether it shares a row, wraps alone onto a new row at the density boundary, or renders on an empty roster. The token is density-scoped (260px comfy, 220px compact) to track the tighter padding in compact.

### [MuleDetailDrawer](src/components/MuleDetailDrawer.tsx)
Right-side shadcn `Sheet`. Full viewport below `md`, 640px at `md+`. Surface: `var(--surface)` with a 1px `--border` left rail. A 1px horizontal accent gradient lines the top edge, and a `-24px` blurred accent radial sits in the top-right corner.

Header: 132×132 avatar (placeholder PNG), bottom-fades into card color. Beside it: display-serif name, `Lv.NN` accent-numeric + mono-spaced class label + weekly-income badge (`--surface-2` background, tiny eyebrow + mono number + italic "mesos"). Top-right: ghost-icon **Trash** (morphs into inline "Delete? Yes / Cancel" confirm bar, destructive-tinted) and, on mobile, a **Close** icon.

Form: name input (full row), then class + level (two-column). All inputs use `bg-[var(--surface-2)]`, `border-border/60`, a soft `focus-visible:border-[var(--accent-raw)]/60` and a 1px `focus-visible:ring-[var(--ring)]/20` (thin, low-tone ring — the shadcn default 3px/50% ring is explicitly overridden here).

Below the form sits the boss section in three stacked parts — **MatrixToolbar**, **BossSearch** (fused), **BossMatrix** — with no visible "Bosses" heading; the toolbar carries the section's controls. Party-size clamping (1..6) happens in the drawer wrapper; `BossMatrix` stays a dumb view.

### [MatrixToolbar](src/components/MatrixToolbar.tsx)
Row above the matrix. Flex-between layout, left group = filter + preset toggles, right group = weekly count + reset.

- **Segmented pill** (`.d-c-toggle`) — `--surface` background, 1px border, rounded-8, overflow-hidden; inner buttons are 10px mono with `0.06em` tracking and 5×10 padding. Active pill uses `--accent-soft` fill + `--accent` text; hover (non-active) promotes to `--surface-2` + `--foreground`. Used twice: `All / Weekly / Daily` cadence filter and `CRA / CTENE` preset pills.
- **Cadence icons** (Weekly/Daily only) — inline 10×10 line-drawn SVG calendar / clock; the `All` pill is text-only.
- **Divider** (`.d-toolbar-sep`) — 1px × 18px `--border` bar with `margin: 0 8px` applied inline, flex-shrink-0. Used between filter and presets, and between weekly count and reset.
- **Weekly count** — mono 11px, reads `{weeklyCount}/14` (Weekly Crystal Cap reference, not enforced). Color swings to `--accent` when `weeklyCount > 0`, else stays muted.
- **Reset** (`.d-toolbar-reset`) — transparent button, muted mono text at 60% opacity (matches the "drag to reorder" mute tone). Asymmetric padding `4px 8px 4px 0` pulls it flush to the divider. Hover rotates the color to `#e05040`.

### [BossSearch](src/components/BossSearch.tsx)
Single-line filter input above the matrix. 13px, `--surface-2` background, 1px `color-mix(border, 60%, transparent)` border, 8×11 padding, 13px Lucide `Search` icon prefix, placeholder `"Search bosses…"` in muted tone.

In the drawer this is rendered with `fused=true` — `.d-search-fused` squares the bottom corners, re-enables a solid `--border` bottom edge, and promotes `z-index: 1` so the seam sits on top of the matrix's top border, giving the search bar and matrix header a single shared hairline.

### Boss Presets — [src/data/bossPresets.ts](src/data/bossPresets.ts)
One-click bulk-selection behind the toolbar's `CRA` / `CTENE` pills. A preset entry is a union — either a family slug (resolves to the Hardest-Tier key via `hardestDifficulty`) or `{ family, tier }` to pin a specific tier.

- **CRA (10 families)** — `cygnus · pink-bean · vellum · crimson-queen · von-bon · pierre · papulatus · hilla · magnus · zakum`. All resolve to their hardest tier.
- **CTENE (14 families)** — `akechi-mitsuhide · princess-no · darknell · verus-hilla · gloom · will · lucid · guardian-angel-slime · damien · {lotus, hard} · vellum · crimson-queen · papulatus · magnus`. Lotus is pinned to **Hard** (the weekly that most mules can realistically clear) instead of the Extreme default.
- **Single-select swap** — at most one preset pill is active at any time. Clicking an inactive preset while another is active swaps: the drawer handler first calls `removePreset` for every currently-active preset, then `applyPreset` for the clicked one. Clicking the currently active pill deselects it. The CRA ∩ CTENE overlap (Vellum / Crimson Queen / Papulatus / Magnus) is a trivial consequence of apply-after-remove — the clicked preset re-selects its overlap families at its own resolved tiers, so no special persistence logic is needed in the helpers. Hand-picked selections outside both preset family lists survive every swap or deselect because `removePreset` is family-scoped.

`applyPreset` uses `toggleBoss` semantics (same-cadence siblings get swapped, opposite-cadence selections are preserved); `removePreset` drops every key whose bossId matches a family in the list regardless of tier.

### [BossMatrix](src/components/BossMatrix.tsx)
A `role="table"` grid, `grid-template-columns: 140px repeat(5, 1fr)`, rounded-[10px] with `--surface` body and `--surface-2` headers/row-headers. When passed `fusedTop`, the wrapper squares its top corners and drops its top border so the fused `BossSearch` above shares the seam; the default prop leaves the `rounded-[10px]` treatment intact.

- **Header row** (sticky, z-10): "Bosses" label + five tier headers. Each tier header is a centered stack: 18×3px colored pip + uppercase mono label.
- **Tier pip colors** (hardcoded — these encode tier semantics, not theme): easy `#6fb878` green · normal `#8fb3d9` blue · hard `#d98a3a` orange · chaos `#c94f8f` magenta · extreme `#e8533a` red.
- **Row header** (per boss family): `--surface-2` background, display-font name + `PartyStepper` (`− / N / +`, 20px tall, bordered, mono). Solo-only families (no weekly tier) render the literal text "Solo" in place of the stepper. Stepper is disabled at bounds so out-of-range callbacks never fire.
- **Cells**: mono 11px tabular. Unsupported tier → dashed `—` at 0.3 opacity, non-interactive. Selected → `bg-[var(--accent-soft)] text-[var(--accent)] font-semibold`. Populated-but-dimmed (another tier of the **same cadence** on this family is selected) → 0.35 opacity. Default hover lifts to `--surface-2` + `--foreground`. Daily cells append a `x 7` superscript at 60% opacity; weekly cells divide by party size.
- Optional `bosses` prop swaps the default Hardest-Crystal-first ordering for a pre-filtered list (used by the drawer for search + cadence filter).

### [DensityToggle](src/components/DensityToggle.tsx)
Inline two-button segmented control — `--surface-2` background, 1px border, 4px inner padding, 6px rounded pills. Active pill uses `--accent-soft` fill + `--accent-raw` text. Labels "COMFY" / "COMPACT" in 10px mono with `0.14em` tracking.

### UI primitives — [src/components/ui/](src/components/ui/)
shadcn/ui over `@base-ui/react`. Notable: `Button` has `default / outline / secondary / ghost / destructive / link` variants and `default / xs / sm / lg / icon / icon-xs / icon-sm / icon-lg` sizes; active press translates 1px; focus ring is a 3px `ring/50`. `Input` is 32px tall, rounded-lg, transparent background (or `input/30` in dark). `Sheet` uses a 10% black backdrop with `backdrop-blur-xs` and a 220ms custom-cubic ease.

---

## Layout shell — [App.tsx](src/App.tsx)

`max-w-[88rem]` (1408px) container, 8-col × 12-col hero/split split, 6- or 8-col roster grid below. Roster drag boundary is a dashed `1.5px` inset that fades to a 45%-accent color while dragging (`color-mix(in hsl, var(--accent-primary) 45%, transparent)`). Each section fades + slides in from bottom on mount (`animate-in fade-in slide-in-from-bottom-4 duration-500`).

---

## Iconography

Lucide-react only: `Sun`, `Moon`, `Trash2`, `X`, `XIcon`. Sized 14–16px inline. Color inherits from text so icons always match muted/accent/destructive states.

---

## Writing style

- Every stat is monospace. Every label is either Geist weight 500 (in-card) or mono-uppercase tracked (eyebrow / sub-label).
- Empty values stay monospace but drop to `--dim` so the layout doesn't shift.
- Copy is terse and lowercase outside labels: "drag to reorder", "No bosses tallied yet", "Tap a cell to pick difficulty · adjust party size per family."
