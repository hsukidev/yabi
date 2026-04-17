# Redesign: Mule Income Tracker — Soft Tech Dark

## Context
The app is a MapleStory Reboot weekly-income tracker: cards for each mule, a donut chart of the income split, and a drawer for picking bosses per character. The redesign moves from the cozy autumnal maple-amber guildhall aesthetic to a **soft tech dark** look — cool neutral surfaces, subtle violet/teal/lavender accents, clean geometric type. The goal is a modern, calm, technical dashboard feel without being sterile.

## Aesthetic Manifesto
- **Vision**: soft tech dark — cool neutral backgrounds with violet primary accent, teal secondary, and lavender numerics. Stats read with crisp clarity. Clean geometric forms throughout.
- **Type pair**: **Outfit Variable** (display, clean geometric sans) + **Manrope Variable** (body sans) + **JetBrains Mono Variable** (numerics/levels). No serif storybook feel — everything geometric and precise.
- **Palette**: violet `oklch(0.72 0.16 280)` primary, teal `oklch(0.72 0.12 195)` secondary, lavender `oklch(0.82 0.08 280)` numerics, rose `oklch(0.65 0.14 350)` chart-4, sky `oklch(0.68 0.13 230)` chart-5.
- **Surface philosophy**: cool-tinted darks (violet undertone, not warm brown), cards as layered cool surfaces with subtle borders and glow effects; hover = violet accent glow.

---

## Design Token System — [src/index.css](src/index.css)

### Semantic Color Names (renamed from old maple/leaf/gold/parchment)
- `--accent-primary` (was `--maple`): primary interactive violet accent
- `--accent-secondary` (was `--leaf`): teal secondary accent
- `--accent-numeric` (was `--gold`): lavender for numerics/values
- `--surface-dim` (was `--parchment`): cool off-white for light mode

### Dark Mode (primary — `defaultTheme="dark"`):
- `--background: oklch(0.14 0.015 280)` · `--foreground: oklch(0.95 0.01 270)`
- `--card: oklch(0.18 0.018 280)` · `--surface-raised: oklch(0.22 0.02 280)` · `--popover: oklch(0.17 0.018 280)`
- `--primary: oklch(0.72 0.16 280)` (violet) · `--primary-foreground: oklch(0.14 0.02 280)`
- `--secondary: oklch(0.24 0.02 280)` · `--muted: oklch(0.22 0.015 280)` · `--muted-foreground: oklch(0.65 0.02 270)`
- `--accent: oklch(0.72 0.12 195)` (teal) · `--accent-foreground: oklch(0.12 0.02 280)`
- `--destructive: oklch(0.62 0.20 25)`
- `--border: oklch(0.30 0.02 280 / 55%)` · `--input: oklch(0.22 0.02 280)` · `--ring: oklch(0.72 0.16 280 / 60%)`
- `--accent-primary: oklch(0.72 0.16 280)` · `--accent-secondary: oklch(0.72 0.12 195)` · `--accent-numeric: oklch(0.82 0.08 280)`
- `--glow: 0 0 28px -4px oklch(0.72 0.16 280 / 0.45)`
- Charts: `--chart-1` violet, `--chart-2` teal, `--chart-3` lavender, `--chart-4` rose, `--chart-5` sky

### Light Mode:
- `--background: oklch(0.97 0.008 270)` cool white · `--foreground: oklch(0.20 0.025 280)` cool ink
- `--primary: oklch(0.56 0.18 278)` deeper violet for contrast · `--accent: oklch(0.52 0.14 195)` teal
- Same chart hues with adjusted lightness for cream backgrounds

### Typography:
- `--font-display: 'Outfit Variable'` — clean geometric sans, replaces Fraunces
- `--font-sans: 'Manrope Variable'` — retained
- `--font-mono: 'JetBrains Mono Variable'` — retained
- `.font-display` no longer uses WONK/SOFT variation settings (Outfit doesn't have those axes)

### Atmosphere:
- `body::before`: cool violet/teal/lavender radial gradient mesh
- `body::after`: noise texture with cool purple-blue tinting instead of warm brown
- Light mode overrides: lighter, subtler versions of the same cool gradients

---

## Per-Component Notes

### [src/App.tsx](src/App.tsx) — layout
All color references updated from `--maple`/`--leaf`/`--gold` to `--accent-primary`/`--accent-secondary`/`--accent-numeric`. Hero card shadow, gradient accents, and stat accent props all updated.

### [src/components/Header.tsx](src/components/Header.tsx)
`LeafMark` → `CrystalMark` — a geometric hexagonal prism SVG in `--accent-secondary` with glow. Title dot `--accent-primary`. Theme toggle hover glow `--accent-primary`.

### [src/components/MuleCharacterCard.tsx](src/components/MuleCharacterCard.tsx)
Hover glow `--accent-primary`. Level badge `--accent-numeric`. Class label `--accent-secondary`. Separator line `--accent-primary`. Income value `--accent-numeric`.

### [src/components/IncomePieChart.tsx](src/components/IncomePieChart.tsx)
Empty state gradient `--accent-primary`. Center label `--accent-numeric`. Chart colors driven by `--chart-1..5`.

### [src/components/AddCard.tsx](src/components/AddCard.tsx)
Hover state `--accent-primary` border, background, and glow.

### [src/components/MuleDetailDrawer.tsx](src/components/MuleDetailDrawer.tsx)
Section heading rule `--accent-secondary`. Gradient accents `--accent-primary`. Level badge `--accent-numeric`. Class label `--accent-secondary`. Income badge `--accent-numeric`. Input focus borders `--accent-primary`.

### [src/components/BossCheckboxList.tsx](src/components/BossCheckboxList.tsx)
Search icon `--accent-secondary`. Input focus `--accent-primary`. Family left accent bar `--accent-primary`/`--accent-secondary`. Claimed label `--accent-primary`. Selected row bg `--accent-primary`. Crystal values `--accent-numeric`.

---

## Package Changes
- Added: `@fontsource-variable/outfit`
- Removed: `@fontsource-variable/fraunces`