# AGENTS.md

## Project Overview
MS Mule Income Tracker - a React + TypeScript app using shadcn/ui + Tailwind CSS, dnd-kit for drag-and-drop, and Recharts for pie charts.

## Build & Test Commands
- `npm run build` - TypeScript check + Vite production build
- `npm run test` - Vitest (jsdom environment, globals enabled)
- `npm run lint` - ESLint
- `npx tsc -b` - TypeScript type check only

## Architecture
- `src/utils/meso.ts` - formatMeso utility (abbreviated/full number formatting)
- `src/data/bosses.ts` - Boss data, bossFamilies, and calculatePotentialIncome
- `src/types/index.ts` - Mule, Boss, BossFamily type definitions
- `src/hooks/useMules.ts` - Mule CRUD + reorder + localStorage persistence
- `src/components/MuleCharacterCard.tsx` - Portrait card with inline useSortable (200x300px, 2:3 ratio)
- `src/components/MuleDetailDrawer.tsx` - Right-side drawer for editing mule details
- `src/components/BossCheckboxList.tsx` - Searchable boss checklist with one-per-family enforcement
- `src/components/Header.tsx` - App header with formatMeso-based income display
- `src/components/IncomePieChart.tsx` - Recharts pie chart for income breakdown

## Key Patterns
- Boss selection uses `toggleBoss()` from `src/data/bossSelection.ts` - preserves array order on family replacement (uses map, not filter+concat)
- MuleCharacterCard takes `onClick` prop (no drag handle; full card is drag surface via inline useSortable)
- DndContext uses PointerSensor with distance:5 activation, rectSortingStrategy, no axis restriction
- Tailwind CSS Grid with responsive cols: xl:4, lg:3, md:2, sm:2
- selectedMuleId state drives drawer open/close (not expanded)
- Header receives `abbreviated` prop to stay in sync with income display toggle
- Test files live in `__tests__` directories next to the source they test