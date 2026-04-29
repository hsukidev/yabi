# Design System — YABI

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

| Role                  | Token                                                | Value                                                 |
| --------------------- | ---------------------------------------------------- | ----------------------------------------------------- |
| Page background       | `--bg` / `--background`                              | `#0b0b10`                                             |
| Page background alt   | `--bg-2`                                             | `#111118`                                             |
| Card / panel          | `--surface` / `--card`                               | `#15161d`                                             |
| Raised / recessed     | `--surface-2` / `--surface-raised`                   | `#1b1d26`                                             |
| Text                  | `--text` / `--foreground`                            | `#eeecda`                                             |
| Muted text            | `--muted-raw` / `--muted-foreground`                 | `#72778a`                                             |
| Dim (empty values)    | `--dim` / `--surface-dim`                            | `#3a3d4d`                                             |
| Border                | `--border-raw` / `--border` / `--input`              | `#262836`                                             |
| **Accent**            | `--accent-raw` / `--accent` / `--primary` / `--ring` | `#f0b44a` (amber)                                     |
| Accent soft (fills)   | `--accent-soft`                                      | `rgba(240, 180, 74, 0.15)`                            |
| Accent glow (shadows) | `--accent-glow`                                      | `rgba(240, 180, 74, 0.25)`                            |
| Destructive           | `--destructive`                                      | `hsl(8 60% 52%)`                                      |
| **Success**           | `--success`                                          | `var(--chart-4)` → `#6fd3b5` (mint)                   |
| Success soft          | `--success-soft`                                     | `color-mix(in srgb, var(--success) 18%, transparent)` |
| Success glow          | `--success-glow`                                     | `color-mix(in srgb, var(--success) 30%, transparent)` |

Chart palette (`--c1..--c5`): amber `#f0b44a`, blue `#7fb7ff`, coral `#e88774`, teal `#6fd3b5`, lavender `#b395e0`.

### Light — `Pastel Cozy`

| Role         | Value                                                 |
| ------------ | ----------------------------------------------------- |
| Background   | `#f6efe4` cream                                       |
| Surface      | `#fffaf0`                                             |
| Surface alt  | `#f8ecd6`                                             |
| Text         | `#3b2f24` deep coffee                                 |
| Muted        | `#8a7a65`                                             |
| Dim          | `#c9b896`                                             |
| Border       | `#e4d6ba`                                             |
| **Accent**   | `#d97757` terracotta                                  |
| Accent soft  | `rgba(217, 119, 87, 0.14)`                            |
| **Success**  | `var(--chart-4)` → `#7ea67a` sage                     |
| Success soft | `color-mix(in srgb, var(--success) 14%, transparent)` |
| Success glow | `color-mix(in srgb, var(--success) 25%, transparent)` |

Chart palette: `#d97757`, `#5b8ca8`, `#e2a84f`, `#7ea67a`, `#a97bb5`.

### Color space

Hex for the handoff layer (concrete, human-readable). `color-mix(in hsl, …)` is used in a few places (App.tsx drag boundary). `hsl(from …)` relative syntax appears for the pie empty-state glow.

---

## Typography

- `--font-sans` / `--font-display`: **Geist Variable** with `ss01` and `cv11` OpenType features enabled on `<body>`, weight 500, letter-spacing `-0.005em`.
- `--font-mono`: **JetBrains Mono Variable** — used for every number in the app (levels, meso values, party size).
- `.font-mono-nums` utility: monospace + `font-variant-numeric: tabular-nums` + `letter-spacing: -0.02em`. Apply to any stat that might change digit count.

### Type roles

| Role                                 | Style                                                                                                             |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Hero number (`bignum`)               | JetBrains Mono, 58px / 500, `--accent-raw`, `text-shadow: 0 0 40px var(--accent-glow)`                            |
| Section heading                      | Geist, 2xl bold, tracking-tight (`font-display`)                                                                  |
| Body                                 | Geist 14–15px, 500                                                                                                |
| Eyebrow (`eyebrow`, `eyebrow-plain`) | JetBrains Mono, 10px, uppercase, `letter-spacing: 0.14em`, muted — optionally prefixed with a 18×3px accent "dot" |
| Drawer sub-label                     | Geist 10px, uppercase, `tracking-[0.26em]`, muted                                                                 |
| Stat number (`KpiStat`)              | JetBrains Mono 22px                                                                                               |
| Matrix cell value                    | JetBrains Mono 11px, tabular-nums                                                                                 |

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

**Named keyframes** (in `index.css`):

- **`bulk-slide`** — used by the **WorldMissingBanner** and the **Bulk Action Bar** (in `RosterHeader`) to slide in from above with a soft fade.
- **`bulk-pulse`** — the small red dot in the **Bulk Action Bar** when **Bulk Delete Mode** is active. Pulsing destructive-tinted opacity loop, visual cue that you're in a destructive mode.
- **`useCountUp`** drives the **WeeklyCapRail**'s mount entrance — `requestAnimationFrame` + ease-out cubic, ~600ms from `0` to the target percent. Re-fires whenever the user toggles a boss and the cap fill changes.

**Floating-pill rules** (in `index.css`, plain CSS so they outweigh sonner's stamped specificity without `!important`):

- `body:has([data-mule-detail-drawer]) [data-sonner-toaster][data-y-position='bottom']` and `body:has([data-bulk-delete-pill]) ...` raise the mobile bottom offset to `calc(env(safe-area-inset-bottom) + 4rem)` (≤600px viewport) so toasts clear the **Drawer Close Pill** or the **Bulk Delete Pill**.
- `body:has([data-bulk-delete-pill])` adds `padding-bottom: calc(env(safe-area-inset-bottom) + 6rem)` so the last **Character Card** doesn't sit under the pill at maximum scroll. Inherits the `selectedCount > 0` gate by design — runway only appears once at least one card is marked.

---

## Density — `[data-density]`

Set on `<html>` via `DensityProvider` (`comfy` default, `compact` alt). Controls CSS variables consumed by the roster:

| Var                        | Comfy | Compact |
| -------------------------- | ----- | ------- |
| `--card-pad`               | 16px  | 12px    |
| `--roster-cols`            | 6     | 8       |
| `--mule-name-size`         | 14px  | 13px    |
| `--roster-card-min-height` | 260px | 220px   |

The roster grid reads `grid-template-columns: repeat(var(--roster-cols), minmax(0, 1fr))`. `DensityToggle` is a two-option segmented control in the Roster heading.

---

## Theme switch

`ThemeProvider` toggles the `.dark` class on `<html>`. `Header`'s `Sun`/`Moon` icon (lucide-react) in the top-right calls `toggleTheme`. The backdrop uses a 12px blur + `sticky top-0`. Initial theme defaults to `dark` but reads `(prefers-color-scheme: dark)` / `(prefers-color-scheme: light)` via `window.matchMedia` in `ThemeProvider.tsx:15–16`.

---

## Responsive system

The app uses three responsive mechanisms, each suited to a different concern:

1. **Tailwind viewport breakpoints** — `sm` (640px), `md` (768px), `lg` (1024px). Used for chrome (Header, Drawer width, mobile-only icons).
2. **`useMatchMedia` hook** ([src/hooks/useMatchMedia.ts](src/hooks/useMatchMedia.ts)) — for layout reflows in components that change _structure_ (not just visibility) at a given width. The hook returns `false` when matchMedia is unavailable so the desktop layout is the safe default in tests/SSR.
3. **`@container` queries** — `MuleDetailDrawer` declares `@container/drawer` on its root; descendants (Identity Section, CrystalTally, MatrixToolbar, BossMatrix) reflow against the _drawer width_, not the viewport. This keeps the drawer's layout coherent at any viewport / sheet-width combination.

### Breakpoint catalog

| Component               | Breakpoint                               | What changes                                                                                              |
| ----------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `Header`                | `max-[479.99px]:gap-2`                   | Right-cluster gap tightens from 5 to 2                                                                    |
| `Header`                | `sm` (640px)                             | Container padding `px-4 → sm:px-6`                                                                        |
| `WorldSelect`           | `sm`                                     | Trigger swaps: globe-only icon (`<sm`) ↔ labeled chip + chevron (`sm+`)                                   |
| `ResetCountdown`        | `sm`                                     | `Live` format (`0D 14:32:07`) at `sm+`, `Smart` format (`14H 32M`) below                                  |
| `ResetCountdown`        | `useMatchMedia(max-width: 319.99px)`     | Label drops; countdown becomes a tooltip-trigger button                                                   |
| `KpiCard`               | `useMatchMedia(max-width: 374.99px)`     | `bignum` drops decimals (`504.32M → 504M`) so "mesos" caption fits                                        |
| `KpiCard`               | `useMatchMedia(max-width: 479.99px)`     | Eyebrow row stacks (countdown drops below title); stat row reflows from 4-across flex to a 2×2 grid       |
| `MuleCharacterCard`     | `md`                                     | Weekly income value: abbreviated (`<md`) ↔ full (`md+`) via paired `md:hidden` / `hidden md:inline` spans |
| `MuleDetailDrawer`      | `sm`                                     | Sheet width: full viewport (`<sm`) ↔ 640px (`sm+`); **Drawer Close Pill** rendered only `<sm`             |
| Drawer Identity Section | `@container/drawer` `600px`              | Layout: column stack (`<600px`) ↔ avatar + meta two-column (`≥600px`)                                     |
| `CrystalTally`          | `@container drawer max-width: 599.99px`  | Layout: vertical stack (desktop) ↔ horizontal three-column strip (narrow drawer)                          |
| Drawer trash button     | `@container drawer max-width: 599.99px`  | Bumps from `size-7` (28px) to `size-9` (36px), `[&_svg]:size-5`, paired with the **CrystalTally** flip    |
| `RosterHeader`          | `useMatchMedia('(pointer: coarse)')`     | Touch only: **Bulk Confirm** removed from the bar and re-rendered as the floating **Bulk Delete Pill**    |
| `MatrixToolbar`         | `@container/drawer` `545px`              | **Cadence Filter** wraps full-width; divider hides                                                        |
| `MatrixToolbar`         | `max-[339.99px]`                         | **Matrix Reset** becomes a bordered full-width button                                                     |
| `MatrixToolbar`         | `max-[292.99px]`                         | Info tooltip icon hides                                                                                   |
| `BossMatrix`            | `@container/drawer` `600px`              | Tier label text hidden in tier-pip header (`<600px`); pip stays visible                                   |
| `BossMatrix`            | `@container/drawer` `500px`              | Matrix sets `min-width: 500px` so very narrow drawers get horizontal scroll instead of column collapse    |
| `RosterHeader`          | `sm`                                     | "drag to reorder" hint hidden below `sm`                                                                  |
| `RosterHeader`          | `max-[524.99px]`                         | Bulk-action-bar copy "Select or drag to delete" hidden                                                    |
| Roster grid             | CSS media queries (`index.css:246–288`)  | `--roster-cols` steps `1 → 2 → 3 → 4 → 5 → 6` at 480, 768, 1024, 1100, 1280px                             |
| `DensityToggle`         | CSS media query (3-col threshold, 768px) | Hidden below 3-col grid (no point in choosing density on a 1-column phone layout)                         |

### Why `useMatchMedia` and not Tailwind for the KpiCard reflows?

Both KpiCard breakpoints (`374.99px` and `479.99px`) change _structural_ JS — the eyebrow row's `flexDirection`, the stat row's `display: flex` vs `display: grid`, the bignum's `formatMeso(_, _, isNarrowViewport)` argument. Tailwind utility flips can hide/show elements but can't choose between two distinct style objects or pass a runtime boolean to a formatter, so JS-side matchMedia is the right tool here.

---

## Component reference

### [Header](src/components/Header.tsx)

Sticky, translucent, blurred (`backdrop-blur 12px`, `sticky top-0 z-50`). 56px-tall row inside a `max-w-352` container. Left: 26×26 amber rounded-square "M" badge (mono weight 800) + wordmark "**Mules**" (Geist 15/600). Right cluster (`gap-5`, tightening to `gap-2` below 480px): **WorldSelect** + theme toggle (`Sun`/`Moon` lucide). The **Reset Countdown** used to live here — it now lives on the KpiCard top-right.

### [KpiCard](src/components/KpiCard.tsx) — hero

`panel panel-glow` with 24px padding. **V9 Hybrid layout** (current):

1. **Eyebrow row** — `EXPECTED WEEKLY INCOME` (with accent dot) on the left, **ResetCountdown** (`align="right"`) on the right.
2. **Bignum row** — click-to-toggle `bignum` + italic "mesos" suffix. Below 375px the abbreviated value drops decimals (`504.32M` → `504M`) so "mesos" still fits. An off-screen probe at `width: max-content` measures whether the unabbreviated value would overflow; if it would, the local display falls back to abbreviated even when the user's **Format Preference** is full.
3. **Stat row** — 4 cells side by side: `MULES` / `ACTIVE` (accent) / `WEEKLY` (purple crystal png) / `DAILY` (blue crystal png). Each uses `eyebrow-plain` label + JetBrains Mono 22px value.
4. **WeeklyCapRail** — bottom block, see below.

Below 480px the eyebrow row stacks (countdown drops under the title) and the stat row reflows to a 2×2 grid. Both breakpoints driven by `useMatchMedia`.

### [SplitCard](src/components/SplitCard.tsx) + [IncomePieChart](src/components/IncomePieChart.tsx)

Plain `panel` wrapping a 260px Recharts donut. Inner radius 66, outer 100, 2° padding angle, 2px card-colored stroke. Hovered sector swells +6px and gains a `drop-shadow` of its own fill. Center label: "Total" / meso number, or the hovered slice's name/value. Empty state: dashed-border circle with a radial amber halo and italic "No bosses tallied yet". Slice click → opens drawer for that mule.

### [MuleCharacterCard](src/components/MuleCharacterCard.tsx)

`.panel` + `var(--card-pad)`. Hover: translateY(-2px), `0 8px 32px -8px var(--accent-glow)` shadow. Layout:

- **Top-left** — `Lv.NN` badge: 10px mono, bordered, `--surface-2` background. Hidden in **Bulk Delete Mode**.
- **Top-right** — trash button (shadcn `Popover` for delete confirm), hidden until hover or popover open. Hidden in **Bulk Delete Mode**.
- **Center** — 112px `blank-character.png` placeholder avatar (non-draggable, `aria-hidden`).
- **Name** — 14px / 600 (13px in compact). Falls back to italic muted "Unnamed".
- **Class** — 10px mono, uppercase, muted.
- **Inactive Mule dim state** — when `mule.active === false` the card body opacity drops and the weekly value renders in `--dim` instead of `--accent`. The card stays visible and editable; it just stops contributing to **Total Weekly Income**.
- **Weekly income row** — top-bordered; "WEEKLY" eyebrow + mono value. **Abbreviated below `md`, full at `md+`** via `md:hidden` / `hidden md:inline` paired spans. Color: accent if bosses tallied, `--dim` if zero.

**Bulk Delete Mode states** — when the **Roster** is in **Bulk Delete Mode**:

- Hover-lift suppressed (the card is now a tap target, not a drawer trigger).
- Top-left **Selection Indicator** appears (small accent-bordered checkbox).
- A **Deletion-Marked Mule** gets a destructive-tinted border and a `--destructive` alpha background fill.

Card is also a dnd-kit sortable handle; the full card is the drag surface. Activation distance is `0` on the **Mouse Sensor** (instant) and gated by the **Long-Press Gate** (250ms / 5px tolerance) on the **Touch Sensor**.

### [AddCard](src/components/AddCard.tsx)

Dashed 2px border tile in the roster grid. On hover: border and `+` icon flip to accent; background fills with `--accent-soft`. Reads the shared `--roster-card-min-height` token (also consumed by `MuleCharacterCard`), and the roster grid pins every implicit row to that same floor via `grid-auto-rows: minmax(var(--roster-card-min-height), auto)` — so the AddCard stays flush with mule cards whether it shares a row, wraps alone onto a new row at the density boundary, or renders on an empty roster. The token is density-scoped (260px comfy, 220px compact) to track the tighter padding in compact.

### [MuleDetailDrawer](src/components/MuleDetailDrawer.tsx)

Right-side shadcn `Sheet`. Full viewport below `sm`, 640px at `sm+`. Surface: `var(--surface)` with a 1px `--border` left rail. A 1px horizontal accent gradient lines the top edge, and a `-24px` blurred accent radial sits in the top-right corner. The whole panel is a `@container/drawer` so children layout against the drawer's own width — not the viewport.

**Identity Section** — switches layout via container query at 600px:

- **`@max-[599.99px]/drawer`**: column stack (avatar above name+meta).
- **`@min-[600px]/drawer`**: avatar (132×132 placeholder PNG, bottom-fades into card color) on the left, name/meta block on the right.

Inside the meta block: display-serif name, `Lv.NN` accent-numeric + mono-spaced class label + weekly-income badge (`--surface-2` background, tiny eyebrow + mono number + italic "mesos"), an **Active Toggle** (pill button — green dot + label "ACTIVE" / muted "INACTIVE", `minHeight: 38` so its 38px height matches the weekly-income badge above it), and the **CrystalTally** (see below). Top-right: ghost-icon **Trash** that bumps from `size-7` to `size-9` (svg `size-5`) at the same `@max-[599.99px]/drawer` breakpoint where the **CrystalTally** flips horizontal, so it doesn't read tiny against the wider tally row; morphs into an inline "Delete? Yes / Cancel" confirm bar, destructive-tinted.

**Drawer Close Pill** — at the bottom of the drawer body, rendered only `<sm` (`sm:hidden`), `position: sticky bottom-[calc(env(safe-area-inset-bottom)+0.75rem)]`, `w-full h-10 rounded-full bg-(--surface) shadow-lg`. Replaces the pre-pill in-flow Close button so the dismiss target stays viewport-anchored while scrolling a long Boss Matrix. The inner content container carries `max-sm:pb-24` to keep last-row form fields above the pill at max scroll. Identified by the `data-mule-detail-drawer` attribute on `SheetContent` (used by the toast `:has()` rule).

Form: name input (full row), then class + level (two-column). All inputs use `bg-[var(--surface-2)]`, `border-border/60`, a soft `focus-visible:border-[var(--accent-raw)]/60` and a 1px `focus-visible:ring-[var(--ring)]/20` (thin, low-tone ring — the shadcn default 3px/50% ring is explicitly overridden here). Drafts use **Commit On Exit** semantics — typing into the name field doesn't move the parent `mules` array; the value commits on blur, **Mule Switch**, or **Drawer Close**.

Below the form sits the boss section in three stacked parts — **MatrixToolbar**, **BossSearch** (fused), **BossMatrix** — with no visible "Bosses" heading; the toolbar carries the section's controls. Party-size clamping (1..6) happens in the drawer wrapper; `BossMatrix` stays a dumb view.

### [CrystalTally](src/components/MuleDetailDrawer/CrystalTally.tsx)

Three-cell readout inside the **Identity Section**: Weekly · Daily · Monthly, each tile = crystal icon halo on top, mono numeric count in the middle (e.g. `7/14`, `3`, `0/1`), micro-tracked uppercase caption at the bottom. Vertical hairline gradients separate the three cells. Color treatment: filled cells use `--accent`, empty cells fade to `--muted`. The Weekly cell renders the count in red when it exceeds the **Weekly Crystal Cap** of 14 (display-only — the **Top-14 Weekly Cut** handles the income side).

Layout: stacks vertically when the drawer is wide; below the drawer-container 600px breakpoint switches to a horizontal three-column strip (`@container drawer (max-width: 599.99px)` in `index.css`).

### [WeeklyCapRail](src/components/WeeklyCapRail.tsx)

The progress bar at the bottom of the **KpiCard**. Header row: `WEEKLY CAP` label on the left, mono `${tally} / ${cap} · ${pct}%` on the right (tally in `--accent`, cap & pct muted). Track is 8px tall with `--surface-2` background and 4px radius; fill is `--accent` with a `200ms ease` width transition.

**Clamp behavior**: bar width _and_ percent label both clamp at `100%`. Only the raw count reveals overflow — e.g. `185 / 180 · 100%` shows a full bar with the truth in the count. The bar answers "how full is the bucket"; the count answers "how much have I selected." Both are driven from the same `useCountUp(clampedPct, 600)` source so they animate in lockstep, including a one-time mount entrance from `0%`.

The progressbar has `role="progressbar"` + `aria-valuenow={Math.round(clampedPct)}` for accessibility.

### [ResetCountdown](src/components/ResetCountdown.tsx)

Widget on the **KpiCard's** top-right (moved from the page **Header** on 2026-04-23). Ticks once per second from a single `setInterval`. Targets the next **Reset Anchor** — Thursday 00:00 UTC (GMS Reboot convention). Three responsive tiers:

- **`≥sm`**: `RESET IN 0D 14:32:07` — full-precision **Live Countdown Format**.
- **`<sm` / `≥320px`**: `RESET IN 14H 32M` — threshold-based **Smart Countdown Format** (`≥24h → 2D 14H`, `≥1h → 4H 12M`, `<1h → 37M`, `<1m → <1M`).
- **`<320px`**: label drops; the countdown becomes a tooltip-trigger labelled "Weekly reset timer" — tap to see "WEEKLY RESET" caption.

Accepts an `align?: 'left' | 'right'` prop so the same component renders correctly in either parent.

### [WorldSelect](src/components/WorldSelect.tsx)

World Lens picker in the **Header**'s right cluster. Dual-trigger pattern via Tailwind responsive utilities — both render simultaneously, CSS hides one:

- **`≥sm`**: chip with the current **World** label + chevron, `--surface-2` background.
- **`<sm`**: icon-only globe button with `aria-label="Select world"`.

Dropdown panel is a base-ui `Select` grouped into two `World Group` sections — `HEROIC` and `INTERACTIVE` — with eyebrow-styled headers. Each row = world name + (when selected) a `Check` indicator (`data-testid="world-select-check"`). State persists to `localStorage.world`; invalid stored values fall back to `null`.

### [WorldMissingBanner](src/components/WorldMissingBanner.tsx)

Info-tinted blue banner that slides in above the **Roster Header** when the user clicks **Add Card** with no **Selected World**. Reuses the `bulk-slide` keyframe but uses `--accent-secondary` instead of `--destructive`. Copy: "Please select a world first" Auto-dismisses (unmounts) the moment the user picks any **World** from the **WorldSelect** — no close button, no timer.

### [RosterHeader](src/components/RosterHeader.tsx)

Row above the **Roster** with two visual states:

- **Default**: `Roster` title + `N MULES` eyebrow → `DensityToggle` (3-col+ only) → "drag to reorder" muted hint (`hidden sm:block`) → **Bulk Trash Icon** on the right.
- **Bulk Action Bar** (when **Bulk Delete Mode** is active): destructive-tinted bar, pulsing red dot (`bulk-pulse` keyframe), "Select or drag to delete" copy, `N SELECTED` pill, **Bulk Cancel** + **Bulk Confirm** (red, disabled when N=0).

Both states share a single slot; the swap is instant, no transition. Animates in via `bulk-slide` keyframe.

**Touch-device variant** — `useMatchMedia('(pointer: coarse)')` flips two pieces of behaviour:

- **Bulk Confirm** is removed from the bar and re-rendered as the **Bulk Delete Pill** — a floating, viewport-anchored pill `position: fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-10 px-6`, full-width (`w-full h-10 rounded-full shadow-lg`), opaque `background: var(--destructive)` with white text, label `Delete {N}`. It is **portaled to `document.body` via `createPortal`** because an ancestor `<section>` uses `animate-in slide-in-from-bottom-4` (App.tsx) whose residual `transform` creates a containing block that re-anchors `position: fixed` away from the viewport. Rendered only when `selectedCount > 0` (no disabled state — absence is the affordance). Identified by the `data-bulk-delete-pill` attribute (used by the toast `:has()` rule and the body padding rule).
- The narrow-width swap polarity flips: on non-touch the "Select or drag to delete" text hides via `max-[524.99px]:hidden` and the `N SELECTED` chip stays; on touch it's the inverse — the chip hides at narrow widths because the count is already shown on the floating pill, and the instructional text remains as the visual anchor of the bar.

### [MatrixToolbar](src/components/MatrixToolbar.tsx)

Row above the matrix. Flex-between layout, left group = **Cadence Filter** + **Preset Pills**, right group = **Matrix Reset**. (The weekly count moved to the **CrystalTally** in the drawer header — the toolbar no longer renders it.)

- **Segmented pill** (`.d-c-toggle`) — `--surface` background, 1px border, rounded-8, overflow-hidden; inner buttons are 10px mono with `0.06em` tracking and 5×10 padding. Active pill uses `--accent-soft` fill + `--accent` text; hover (non-active) promotes to `--surface-2` + `--foreground`. Used twice: **Cadence Filter** (`All / Weekly / Daily`) and **Preset Pills** (`CRA / LOMIEN / CTENE / Custom`).
- **Cadence icons** (Weekly/Daily only) — inline 10×10 line-drawn SVG calendar / clock; the `All` pill is text-only.
- **Divider** (`.d-toolbar-sep`) — 1px × 18px `--border` bar with `margin: 0 8px` applied inline, flex-shrink-0. Used between filter and presets.
- **Info tooltip** — small `Info` lucide icon next to the **Preset Pills**, opens a tooltip explaining **Conform** semantics. Hidden below 293px (`max-[292.99px]:hidden`).
- **Matrix Reset** (`.d-toolbar-reset`) — transparent button, muted mono text at 60% opacity (matches the "drag to reorder" mute tone). Asymmetric padding `4px 8px 4px 0`. Hover rotates the color to `#e05040`. Below 340px the button takes a bordered full-width treatment (`max-[339.99px]:basis-full`).
- **Drawer container query reflows** — `@max-[544.99px]/drawer:basis-full` makes the **Cadence Filter** wrap to its own row when the drawer narrows; the divider hides at the same breakpoint.

### [BossSearch](src/components/BossSearch.tsx)

Single-line filter input above the matrix. 13px, `--surface-2` background, 1px `color-mix(border, 60%, transparent)` border, 8×11 padding, 13px Lucide `Search` icon prefix, placeholder `"Search bosses…"` in muted tone.

In the drawer this is rendered with `fused=true` — `.d-search-fused` squares the bottom corners, re-enables a solid `--border` bottom edge, and promotes `z-index: 1` so the seam sits on top of the matrix's top border, giving the search bar and matrix header a single shared hairline.

### Boss Presets — [src/data/bossPresets.ts](src/data/bossPresets.ts)

One-click bulk-selection behind the toolbar's preset pills. A **Preset Entry** is a union — either a family slug (resolves to the **Default Tier** via `hardestDifficulty`) or `{ family, tier, acceptedTiers? }` to pin a specific tier and optionally widen the **Accepted Tiers** for **Same-Cadence Equality** matching.

- **CRA (10 families)** — `cygnus · pink-bean · vellum · crimson-queen · von-bon · pierre · papulatus · hilla · magnus · zakum`. All resolve to their hardest tier.
- **LOMIEN** — Lotus + Damien preset, both as **Multi-Tier Entries** (default Normal, accept Normal or Hard). Lets the user pick LOMIEN by default and later swap either to Hard in the matrix without losing the **Active Preset** status.
- **CTENE (14 families)** — `akechi-mitsuhide · princess-no · darknell · verus-hilla · gloom · will · lucid · guardian-angel-slime · damien · {lotus, hard} · vellum · crimson-queen · papulatus · magnus`. Lotus is pinned to **Hard** (the weekly that most mules can realistically clear) instead of the Extreme default.
- **Custom** — inert status indicator. Lights up when the user's **Boss Slate** doesn't match any **Canonical Preset** under **Same-Cadence Equality**. Clicking it does nothing; the only way out is to **Conform** to a canonical pill, **Matrix Reset**, or hand-edit the matrix.
- **Conform / Preset Swap** — at most one **Canonical Preset** is **Active** at any time. Clicking an inactive **Canonical Preset** runs **Conform**: wipe every weekly **Slate Key** outside the new preset's families, then apply each entry at its **Default Tier** (preserving overlap families' existing tiers if those tiers are in the entry's **Accepted Tiers**). One atomic `onUpdate`. Re-clicking the **Active Preset** is a short-circuit no-op (apply-only — no deselect gesture).
- **Same-Cadence Equality** decides whether the **Active Preset** stays lit: every weekly **Slate Key** must match a **Preset Entry**'s **Accepted Tiers**, and there must be no extra weekly key outside the preset's families. Daily selections are orthogonal — adding/removing dailies never affects the **Active Preset**.

### [BossMatrix](src/components/BossMatrix.tsx)

A `role="table"` grid, `grid-template-columns: 140px repeat(5, 1fr)`, rounded-[10px] with `--surface` body and `--surface-2` headers/row-headers. When passed `fusedTop`, the wrapper squares its top corners and drops its top border so the fused `BossSearch` above shares the seam; the default prop leaves the `rounded-[10px]` treatment intact.

- **Header row** (sticky, z-10): "Bosses" label + five tier headers. Each tier header is a centered stack: 18×3px colored pip + uppercase mono label.
- **Tier pip colors** (hardcoded — these encode tier semantics, not theme): easy `#6fb878` green · normal `#8fb3d9` blue · hard `#d98a3a` orange · chaos `#c94f8f` magenta · extreme `#e8533a` red.
- **Row header** (per boss family): `--surface-2` background, display-font name + `PartyStepper` (`− / N / +`, 20px tall, bordered, mono). Solo-only families (no weekly tier) render the literal text "Solo" in place of the stepper. Stepper is disabled at bounds so out-of-range callbacks never fire.
- **Cells**: mono 11px tabular. Unsupported tier → dashed `—` at 0.3 opacity, non-interactive. Selected → `bg-[var(--accent-soft)] text-[var(--accent)] font-semibold`. Populated-but-dimmed (another tier of the **same cadence** on this family is selected) → 0.35 opacity. Default hover lifts to `--surface-2` + `--foreground`. Daily cells append a `x 7` superscript at 60% opacity; weekly cells divide by party size.
- Optional `bosses` prop swaps the default Hardest-Crystal-first ordering for a pre-filtered list (used by the drawer for search + cadence filter).

### [DensityToggle](src/components/DensityToggle.tsx)

Inline two-button segmented control — `--surface-2` background, 1px border, 4px inner padding, 6px rounded pills. Active pill uses `--accent-soft` fill + `--accent-raw` text. Labels "COMFY" / "COMPACT" in 10px mono with `0.14em` tracking.

### Toast (sonner) — [src/components/ui/sonner.tsx](src/components/ui/sonner.tsx) · [src/lib/toast.ts](src/lib/toast.ts)

Bottom-right notification stack using [sonner](https://sonner.emilkowal.ski/) `2.0.7`, fired through the thin `toast.success(title, opts)` wrapper in `src/lib/toast.ts`. Success is the only variant wired today — add `error` / `warning` / `info` through the same wrapper and semantic tokens as needed.

**Shape (matches design handoff #3 layout with design #1's left accent)**

- **Container** — `var(--surface)` background, `1px solid var(--border)` frame with **`border-left: 3px solid var(--success)`** overriding the left edge. The 1px frame on the other three sides is what gives the 3px accent a neighbour at the rounded corners so it doesn't taper into nothing — matching the design's `borderLeft + borderRadius` trick. `border-radius: var(--radius)`. Asymmetric padding `11px 13px 11px 11px` compensates for the border-width mismatch so the visible content gap is a symmetric 14px L/R and 12px T/B.
- **Drop shadow** — stacks a 16/36 `--success-glow` tint with a subtle 2/8 black shadow. No outer ring (the 1px border carries that role).
- **Icon chip** — 26×26, `border-radius: 6px`, `--success-soft` background, `--success` foreground. Contains a **custom 14×14 check SVG** (`polyline 20 6 9 17 4 12`, stroke 2.5, rounded caps) — not the default Lucide icon sonner ships.
- **Title** — 13px / weight 500, `tracking-tight`, leading 5.
- **Description** — 12px, `text-muted-foreground`, leading 4. Single-delete: `"{Name} removed from roster"` (falls back to `"Mule removed from roster"` when the name is empty). Bulk: `"{N} mule(s) removed"` with correct pluralization.
- **Action button (Undo)** — JetBrains Mono, 11px, weight 600, `letter-spacing: 0.12em`, uppercase, `color: var(--accent)`, transparent fill, `border-radius: 4px`, `padding: 4px 8px`. Hover: `background: var(--accent-soft)`. Mirrors the design's `.t-link`.
- **No close (X) button** — the 5-second auto-dismiss + Undo action is the entire UX.
- **Dimensions & position** — Desktop (≥600px viewport): `--width: 380px` (set on `<Toaster>`, overrides sonner's 356px default). Below 600px: sonner's built-in responsive rule kicks in and sizes each toast to `calc(100% - mobile-offset * 2)` — we deliberately don't set a `min-width` on the shell so narrow phones don't force the toast past the right edge. Anchored `bottom-right`, `offset: 20`, `gap: 10` between stacked toasts. Auto-dismiss `duration: 5000ms` (long enough to reach for Undo).

**Why the styling lives in `index.css`, not Tailwind classNames**

sonner's own stylesheet targets `[data-sonner-toast][data-styled='true']` (2-attribute selector) which beats Tailwind's single-class specificity silently — any `gap`, `padding`, `border-radius`, icon size, or button color applied via `classNames` loses. The shell, accent border, icon chip, and action button are therefore styled in `index.css` under `[data-sonner-toast].mule-toast[data-styled='true']` so our rules meet or exceed sonner's specificity naturally. Sonner's internal margin variables (`--toast-icon-margin-start/end`, `--toast-svg-margin-start/end`, `--toast-button-margin-start/end`) are all zeroed via the `<Toaster>` `style` prop so the container's `gap: 14px` is the single source of spacing between icon chip, content, and action button.

**Undo wiring** — `useMuleActions.deleteMule` / `deleteMules` snapshot the mule(s) _before_ deletion and attach an `action: { label: 'Undo', onClick: () => restoreMule(snapshot, index) }` to the toast. `useMules.restoreMule` and `restoreMules` splice mules back at their original indexes (bulk sorts snapshots ascending-by-index so later splices land correctly after earlier ones shift). `mules` flows through a ref inside `useMuleActions` so the delete callbacks keep a stable identity and don't bust `MuleCharacterCard`'s `memo()`.

### UI primitives — [src/components/ui/](src/components/ui/)

shadcn/ui over `@base-ui/react`. Notable: `Button` has `default / outline / secondary / ghost / destructive / link` variants and `default / xs / sm / lg / icon / icon-xs / icon-sm / icon-lg` sizes; active press translates 1px; focus ring is a 3px `ring/50`. `Input` is 32px tall, rounded-lg, transparent background (or `input/30` in dark). `Sheet` uses a 10% black backdrop with `backdrop-blur-xs` and a 220ms custom-cubic ease.

---

## Layout shell — [App.tsx](src/App.tsx)

`max-w-[88rem]` (1408px) container, 8-col × 12-col hero/split split, 6- or 8-col roster grid below. Roster drag boundary is a dashed `1.5px` inset that fades to a 45%-accent color while dragging (`color-mix(in hsl, var(--accent-primary) 45%, transparent)`). Each section fades + slides in from bottom on mount (`animate-in fade-in slide-in-from-bottom-4 duration-500`).

---

## Iconography

Lucide-react only: `Sun`, `Moon`, `Trash2`, `XIcon`, `Check`, `CheckIcon`, `ChevronDown`, `Globe`, `Info`, `Search`. Sized 14–16px inline. Color inherits from text so icons always match muted/accent/destructive states.

---

## Writing style

- Every stat is monospace. Every label is either Geist weight 500 (in-card) or mono-uppercase tracked (eyebrow / sub-label).
- Empty values stay monospace but drop to `--dim` so the layout doesn't shift.
- Copy is terse and lowercase outside labels: "drag to reorder", "No bosses tallied yet", "Tap a cell to pick difficulty · adjust party size per family."
