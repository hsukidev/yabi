# YABI — Maplestory's Yet Another Boss Income Tool

A personal tool for MapleStory GMS Reboot players to track potential weekly meso income from boss crystal sales across a roster of mule characters.

**Live app:** [yabi.henesys.io](https://yabi.henesys.io/)

## Features

### Roster & character cards

- **Mule grid** with avatar, name, level, class, and weekly income — density-toggle between **Comfy** (6 cols) and **Compact** (8 cols).
- **Drag-and-drop reorder** with mouse, touch (250 ms long-press), and keyboard sensors; live drag boundary highlight.
- **Bulk delete mode** with click-to-mark and click-and-drag paint selection across the roster.
- **Undo toast** restores deleted mules (single or bulk) at their original index.
- **Active / Inactive toggle** parks a mule out of totals without removing it; inactive cards dim and stop contributing to weekly income.

### World support

- **World Select** for all six GMS Reboot worlds split into **Heroic** (Kronos, Hyperion, Solis) and **Interactive** (Scania, Bera, Luna).
- **World Pricing** — every boss-crystal value is stored per world group; income resolves against each mule's home world.
- **World Lens** filters the roster and aggregates to the currently selected world.
- **Character Lookup** — fetches name/class/level/avatar from Nexon's ranking API via a Cloudflare Worker proxy with regional routing (NA/EU) and edge caching.

### Boss matrix (drawer)

- **Full boss reference data** for ~75 difficulties grouped into families with one-per-family weekly entry slots.
- **Cadence filter** (All / Weekly / Daily) and **search**.
- **Presets** — one-click **CRA**, **LOMIEN**, **CTENE** with multi-tier acceptance and a **Custom** indicator when the slate diverges.
- **Party-size stepper** (1–6) per family divides the weekly crystal value live.
- **Crystal Tally** in the drawer — Weekly / Daily / Monthly counts, with red over-cap warning past 14 weekly.

### Income & summary

- **KPI Card** — total weekly income with click-to-toggle abbreviated (`504M`) ↔ full (`504,320,000`) format, mule and active counts, weekly/daily crystal totals.
- **Top-14 Weekly Cut** — only the 14 highest-value crystals per mule per week count toward income (matches GMS's per-character cap).
- **Weekly Cap Rail** — animated progress bar against MapleStory's 180-crystals-per-world weekly ceiling.
- **Reset Countdown** to the next Thursday 00:00 UTC reset, with live and smart formats for narrow viewports.
- **Income pie chart** — donut breakdown by mule; click a slice to open that mule's drawer.

### Look & feel

- **Dark Amber** and **Cozy Pastel** themes with prefers-color-scheme detection; persisted to localStorage.
- **Responsive** to viewport and to the drawer's own width via `@container` queries.
- **Tabular monospace numerics** so digit-count changes never shift layout.
- **Auto-save** — every change persists to localStorage immediately.

## Tech Stack

- **React 19** + **TypeScript** + **Vite**
- **shadcn/ui** + **@base-ui/react** on **Tailwind CSS v4**
- **@dnd-kit** (mouse/touch/keyboard sensors, sortable grid)
- **Recharts** (donut chart)
- **sonner** (toasts with undo)
- **Cloudflare Worker** (Nexon ranking API proxy)
- **Vitest** + **Playwright** + **Testing Library**

## Getting Started

```bash
pnpm install
pnpm dev
```

## Build & Test

```bash
pnpm build         # tsc + vite build
pnpm test          # Vitest
pnpm e2e           # Playwright
pnpm lint          # ESLint
pnpm typecheck     # tsc --build
pnpm worker:dev    # Cloudflare Worker (character lookup)
pnpm worker:test
```

## Releasing

User-facing releases are tracked on the [`/changelog`](https://yabi.henesys.io/changelog) page and rolled out via a lightweight per-PR changeset workflow:

```bash
# Per PR with a user-visible change — drop a markdown file:
#   .changes/<slug>.md
#   ---
#   bump: patch | minor | major
#   ---
#   One-line summary.

# When ready to cut a release:
pnpm release            # rolls up .changes/* → changelog.ts, bumps package.json, commits, tags
git push --follow-tags
pnpm deploy:prod
```

See [docs/RELEASING.md](./docs/RELEASING.md) for the full workflow and the `patch` / `minor` / `major` rubric.

## Architecture

| Path                                   | Purpose                                          |
| -------------------------------------- | ------------------------------------------------ |
| `src/routes/__root.tsx`                | Provider stack + sticky header (router root)     |
| `src/components/Dashboard.tsx`         | Layout shell, dnd-kit setup, bulk-mode wiring    |
| `src/data/bosses.ts`                   | Boss reference data + `calculatePotentialIncome` |
| `src/data/worlds.ts`                   | World list, `findWorld`, `resolveWorldGroup`     |
| `src/data/bossPresets.ts`              | CRA / LOMIEN / CTENE preset definitions          |
| `src/data/muleBossSlate.ts`            | Per-mule slate model (cadence, tier, party size) |
| `src/modules/income.tsx`               | `IncomeProvider` + Top-14 Weekly Cut aggregation |
| `src/persistence/`                     | localStorage schema, migrations, store           |
| `src/hooks/useMules.ts`                | Mule CRUD, reorder, restore (undo)               |
| `src/hooks/useMuleActions.ts`          | Action callbacks + undo-toast wiring             |
| `src/hooks/useCharacterLookup.ts`      | Nexon lookup client                              |
| `src/hooks/useBulkDragPaint.ts`        | Click-and-drag selection paint                   |
| `src/components/MuleCharacterCard.tsx` | Roster card + sortable handle                    |
| `src/components/MuleDetailDrawer.tsx`  | Right-side editor sheet                          |
| `src/components/BossMatrix.tsx`        | Tier × family selection grid                     |
| `src/components/KpiCard.tsx`           | Hero income card + cap rail + countdown          |
| `src/components/IncomePieChart.tsx`    | Donut chart                                      |
| `src/components/WorldSelect.tsx`       | Header world picker                              |
| `worker/src/worker.ts`                 | Cloudflare Worker character-lookup endpoint      |

See [Design.md](./Design.md) for the visual system and [UBIQUITOUS_LANGUAGE.md](./UBIQUITOUS_LANGUAGE.md) for canonical domain terms.
