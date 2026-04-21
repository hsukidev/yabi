# MS Mule Income Tracker

A personal tool for MapleStory GMS Reboot players to track potential weekly meso income from boss crystal sales across multiple mule characters.

## Features

- **Mule character cards** — Portrait cards (2:3 ratio) with avatar, name, level, class, and potential weekly income displayed in a responsive grid
- **Boss crystal reference data** — 75+ hardcoded boss crystal values for GMS Reboot, grouped into families with mutual exclusivity (one difficulty per family per week)
- **Side drawer editor** — Click a card to open a right-side drawer with inline editing for name, level, class, boss selection, and delete with confirmation
- **Searchable boss checklist** — Checkboxes enforce one-per-family selection with auto-replace; uncheck to deselect
- **Drag-and-drop reorder** — Free grid reordering (left, right, up, down) with click vs drag distinction via distance threshold
- **Income pie chart** — Donut chart showing per-mule income breakdown; click a slice to open that mule's drawer
- **Meso formatting** — Toggle between abbreviated (18B, 529M) and full (18,000,000,000) display
- **Dark/light mode** — Toggle in header, persists via localStorage and Tailwind class strategy
- **Auto-save** — All changes persist to localStorage immediately

## Tech Stack

- **React 19** + **TypeScript** + **Vite**
- **shadcn/ui** — Components and theming (Tailwind CSS + Radix primitives)
- **Tailwind CSS v4** — Utility-first styling
- **Recharts** — Pie chart
- **dnd-kit** — Sortable grid with `PointerSensor`
- **Vitest** — Testing

## Getting Started

```bash
pnpm install
pnpm dev
```

## Build & Test

```bash
pnpm build    # TypeScript check + production build
pnpm test     # Vitest
pnpm lint     # ESLint
```

## Architecture

| Path | Purpose |
|------|---------|
| `src/data/bosses.ts` | Boss reference data, families, `calculatePotentialIncome` |
| `src/types/index.ts` | `Mule`, `Boss`, `BossFamily` type definitions |
| `src/utils/meso.ts` | `formatMeso` — abbreviated/full meso formatting |
| `src/data/bossSelection.ts` | `toggleBoss`, `getFamilies` — one-per-family selection logic |
| `src/hooks/useMules.ts` | Mule CRUD + reorder + localStorage persistence |
| `src/components/MuleCharacterCard.tsx` | Portrait card with inline dnd-kit sortable (200×300px, 2:3 ratio) |
| `src/components/MuleDetailDrawer.tsx` | Right-side drawer for editing |
| `src/components/BossCheckboxList.tsx` | Searchable boss checklist |
| `src/components/Header.tsx` | App header with income display + dark mode toggle |
| `src/components/IncomePieChart.tsx` | Recharts pie chart |

## Domain Language

See [UBIQUITOUS_LANGUAGE.md](./UBIQUITOUS_LANGUAGE.md) for the canonical domain terms used throughout the codebase (Mule, Boss Family, Crystal Value, Potential Income, Entry Slot, etc.).

## Future Enhancements

- Party size division (Crystal Value / Party Size, 1–6 players)
- Mule Preset templates for fast-creating multiple mules
- Mule Class dropdown (currently free text)
- Daily boss reset tracking
- Sort/filter by name, level, class, or income
- Persistent manual reorder order
- Custom or class-based avatar images