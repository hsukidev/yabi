# Ubiquitous Language

## Boss Content

| Term | Definition | Aliases to avoid |
|------|-----------|-----------------|
| **Boss** | A raid encounter that drops a sellable crystal when defeated | Raid, dungeon boss |
| **Boss Family** | A group of boss difficulties that share a weekly entry slot | Boss group, boss tier |
| **Boss Difficulty** | A specific tier within a **Boss Family** (Easy, Normal, Hard, Chaos, Extreme) | Boss level, boss rank |
| **Crystal** | A tradeable item dropped by a defeated **Boss**, sold to a vendor for mesos | Boss drop, crystal drop |
| **Crystal Value** | The fixed meso amount received when selling a **Crystal** from a specific **Boss** at a specific **Boss Difficulty** | Sell price, crystal price, meso value |

## Mule Content

| Term | Definition | Aliases to avoid |
|------|-----------|-----------------|
| **Mule** | A player character tracked for its potential weekly crystal income | Alt, character, toon |
| **Mule Name** | The in-game character name of a **Mule** | Character name |
| **Mule Level** | The current level of a **Mule** (1–300, display-only) | Level |
| **Mule Class** | The job/class of a **Mule** (free text, future: dropdown) | Job, role |
| **Potential Income** | The sum of all **Crystal Values** from bosses a **Mule** can defeat in one week | Weekly income, total income, max income |
| **Active Flag** | The boolean `active` field on a **Mule**; the user-declared source of truth for whether the **Mule** is in rotation | `active`, enabled flag |
| **Active Mule** | A **Mule** whose **Active Flag** is `true` — user-declared active, regardless of boss selection | Participating mule, contributing mule |
| **Inactive Mule** | A **Mule** whose **Active Flag** is `false` — user-declared parked, excluded from **Total Weekly Income** and dimmed in the **Roster** | Parked mule, disabled mule |
| **Dim State** | The 0.55-opacity visual treatment applied to an **Inactive Mule's** **Character Card** | Dimmed card, faded card, inactive styling |
| **Active Toggle** | The single pill control in the **Drawer's** **Identity Section** that flips a **Mule's** **Active Flag** on click; shows `[● Active]` with accent dot when active, `[Inactive]` with no dot when inactive | Active switch, inactive switch, status toggle |
| **Identity Section** | The top region of the **Drawer** containing the **Mule's** avatar, name, class, level, weekly-mesos pill, and **Active Toggle** | Mule header, drawer header |

## UI & Layout

| Term | Definition | Aliases to avoid |
|------|-----------|-----------------|
| **Classic Layout** | The single supported page arrangement: KPI strip + Split panel on top, Roster below | Default layout, main layout |
| **Roster** | The density-driven grid of **Character Cards** plus a trailing **Add Card** | Card grid, mule list |
| **Character Card** | The panel tile in the **Roster** displaying a **Mule's** **Class Silhouette**, name, class label, level badge, and **Potential Income** | Mule card, tile, card (unqualified) |
| **Class Silhouette** | The SVG body-and-hat shape rendered inside a **Character Card** representing the **Mule's** **Mule Class** | Avatar, portrait, icon |
| **Add Card** | The dashed-border placeholder at the end of the **Roster** that creates a new **Mule** on click | Plus card, new mule button |
| **KPI Card** | The panel-glow card showing **Total Weekly Income**, **Mule** count, and **Active Mule** count | Hero card, income card, summary card |
| **Split Card** | The panel containing the donut chart of **Potential Income** distribution across **Active Mules** | Chart card, breakdown card, pie card |
| **Drawer** | The right-side panel that slides in for editing a selected **Mule's** full details | Side drawer, detail panel, modal |
| **Density Toggle** | The COMFY/COMPACT segmented control placed inline after the "Roster N MULES" eyebrow label | Size toggle, spacing toggle |
| **Drag Boundary** | The dashed border visible around the **Roster** during drag, showing that **Character Cards** are confined to the grid | Drag area, drop zone |

## Theming & Density

| Term | Definition | Aliases to avoid |
|------|-----------|-----------------|
| **Theme** | The active color scheme — one of exactly two: **Dark-Amber** or **Cozy-Pastel** | Color scheme, palette, skin |
| **Dark-Amber** | The dark **Theme**: near-black backgrounds with a golden-amber **Accent** | Dark mode (ambiguous), amber theme |
| **Cozy-Pastel** | The light **Theme**: warm cream backgrounds with a terracotta **Accent** | Light mode (ambiguous), pastel theme |
| **Density** | The **Roster** sizing preference — one of exactly two: **Comfy** or **Compact** | Spacing, size mode |
| **Comfy** | Spacious **Density**: 6-column **Roster**, 72px **Class Silhouette**, larger padding | Roomy, default density |
| **Compact** | Dense **Density**: 8-column **Roster**, 56px **Class Silhouette**, smaller padding | Tight, dense, condensed |
| **Accent** | The active **Theme's** primary highlight color — gold (#f0b44a) in **Dark-Amber**, terracotta (#d97757) in **Cozy-Pastel** | Primary color, highlight color |
| **Accent Soft** | A low-opacity derivation of the **Accent** (~15%) used for hover tints and selected-state backgrounds | Accent wash, accent tint |
| **Accent Glow** | A low-opacity derivation of the **Accent** (~25%) used for drop shadows and bignum text glow | Accent halo, accent shadow |
| **Chart Palette** | The five colors (`--c1`–`--c5`) assigned to slices of the **Split Card** donut, unique per **Theme** | Chart colors, series colors |
| **Handoff** | The reference design package (`MS Mule Income Tracker-handoff.zip`) that defines the intended visual system | Design reference, mockup, spec |

## Weekly Cycle

| Term | Definition | Aliases to avoid |
|------|-----------|-----------------|
| **Weekly Reset** | The point at which boss entry slots refresh, allowing bosses to be defeated again | Reset, weekly reset time |
| **Reset Anchor** | The fixed absolute instant targeted by every **Weekly Reset** — Thursday 00:00 UTC (GMS Reboot convention) | Reset time, server reset |
| **Reset Countdown** | The header widget that displays the duration remaining until the next **Reset Anchor**, ticking every second | Reset timer, countdown clock |
| **Live Countdown Format** | The `{D}D HH:MM:SS` desktop render of **Reset Countdown** with zero-padded hours (e.g. `0D 14:32:07`) | Digital clock format |
| **Smart Countdown Format** | The threshold-based mobile render of **Reset Countdown** (≥24h → `2D 14H`, ≥1h → `4H 12M`, <1h → `37M`, <1m → `<1M`) | Adaptive format, responsive format |
| **Entry Slot** | A single boss opportunity per **Weekly Reset** — only one **Boss Difficulty** per **Boss Family** can be used per week | Boss entry, boss attempt |

## Party Content

| Term | Definition | Aliases to avoid |
|------|-----------|-----------------|
| **Party** | A group of 1–6 players who defeat a **Boss** together | Group, team |
| **Party Size** | The number of players (1–6) sharing the **Crystal Value** from a defeated **Boss** | N players |

## Boss Matrix UI

| Term | Definition | Aliases to avoid |
|------|-----------|-----------------|
| **Boss Matrix** | The grid inside the **Drawer** whose rows are **Boss Families** and columns are **Boss Difficulty** tiers (Extreme→Easy) | Matrix, boss grid, boss table |
| **Matrix Toolbar** | The control row above the **Boss Matrix** containing the **Cadence Filter**, **Boss Presets**, **Weekly Count**, and **Matrix Reset** | Toolbar, filter bar |
| **Boss Search** | The search input fused on top of the **Boss Matrix** that filters **Boss Matrix** rows by case-insensitive substring match | Search bar, search box |
| **Cadence Filter** | The All · Weekly · Daily segmented control in the **Matrix Toolbar** that hides **Boss Matrix** rows lacking any **Boss Difficulty** of the chosen **Boss Cadence** | Cadence tabs, boss filter |
| **Boss Cadence** | The refresh frequency of a **Boss Difficulty** — one of `daily` or `weekly` | Frequency, cadence |
| **Boss Preset** | A fixed, named batch-select shortcut in the **Matrix Toolbar** (currently **CRA** and **CTENE**) that toggles a predefined set of **Boss Families** at their **Hardest Tier** | Preset button, preset pill |
| **CRA** | The **Boss Preset** covering Cygnus, Pink Bean, Vellum, Crimson Queen, Von Bon, Pierre, Papulatus, Hilla, Magnus, Zakum at their **Hardest Tier** | Chaos Root Abyss (ambiguous — preset is broader than just CRA bosses) |
| **CTENE** | The **Boss Preset** covering Akechi Mitsuhide, Princess No, Darknell, Verus Hilla, Gloom, Will, Lucid, Guardian Angel Slime, Damien, Lotus, Vellum, Crimson Queen, Papulatus, Magnus at their **Hardest Tier** | Chosen Tenebris (ambiguous) |
| **Active Preset** | A **Boss Preset** whose every member **Boss Family** currently has its **Hardest Tier** key selected on the **Mule** | Applied preset, engaged preset |
| **Hardest Tier** | The **Boss Difficulty** of a **Boss** with the highest **Crystal Value** | Top tier, max difficulty |
| **Weekly Count** | The numerator of the **Matrix Toolbar** tally — count of **Boss Cadence** `weekly` selections on the current **Mule** | Selection count, boss count |
| **Weekly Crystal Cap** | The constant `14` — the MapleStory weekly crystal sale limit, shown as the denominator of the **Matrix Toolbar** tally; a reference only, not enforced | Crystal cap, 14 cap |
| **Matrix Reset** | The flat text button on the right side of the **Matrix Toolbar** that clears the **Mule's** `selectedBosses`, leaving **Cadence Filter**, **Boss Search**, and **Boss Preset** state untouched | Reset button, clear button |
| **Fused** | The visual treatment where **Boss Search** shares a border-radius with **Boss Matrix** and overlaps by 1px so the seam between them disappears | Joined, flush |

## Aggregations

| Term | Definition | Aliases to avoid |
|------|-----------|-----------------|
| **Total Weekly Income** | The sum of all **Mules'** **Potential Income** across the entire **Roster** | Global income, overall income |
| **Mule Preset** | A saved template of pre-selected bosses used to fast-create multiple **Mules** (distinct from **Boss Preset**) | Template, mule template |

## Bulk Delete

| Term | Definition | Aliases to avoid |
|------|-----------|-----------------|
| **Bulk Delete Mode** | The **Roster** UI state in which **Character Cards** become selectable for batch removal; entered via **Bulk Trash Icon**, exited via **Bulk Cancel** or after **Bulk Delete** completes | Bulk mode, delete mode, multi-select mode |
| **Single Delete** | Per-mule deletion from the hover trash popover on a **Character Card** or the delete button in the **Drawer** footer; the default, non-**Bulk Delete Mode** path | Individual delete, quick delete |
| **Bulk Delete** | The action that removes all **Deletion-Marked Mules** from the **Roster** in one operation (via `deleteMules(ids)`) when **Bulk Confirm** is clicked | Batch delete, mass delete |
| **Deletion-Marked Mule** | A **Mule** the user has toggled on for removal while in **Bulk Delete Mode**; visually rendered with the **Selection Indicator** and red selected styling on its **Character Card** | Selected mule (ambiguous), marked mule, toDelete |
| **Bulk Trash Icon** | The small trash-icon button in the default **Roster Header** right-group that enters **Bulk Delete Mode**; always visible at every breakpoint | Delete button, bulk button |
| **Roster Header** | The header row above the **Roster** grid, containing the "Roster" title, **Mule Count Label**, **Density Toggle**, "drag to reorder" hint (`sm+` only), and **Bulk Trash Icon**; swaps to the **Bulk Action Bar** while in **Bulk Delete Mode** | Roster title, roster top |
| **Bulk Action Bar** | The red-bordered inline control strip that replaces the **Roster Header** during **Bulk Delete Mode**; contains the **Bulk Pulse Dot**, "Select mules to delete" title, **Bulk Selection Pill**, **Bulk Cancel**, and **Bulk Confirm** | Bulk bar, action strip, delete bar |
| **Bulk Pulse Dot** | The 8×8 pulsing red dot on the left of the **Bulk Action Bar** signaling that a destructive mode is active; driven by the `bulk-pulse` keyframe | Status dot, active indicator |
| **Bulk Selection Pill** | The "N SELECTED" rounded badge in the **Bulk Action Bar** showing the count of **Deletion-Marked Mules** | Selection count, selected badge |
| **Bulk Cancel** | The ghost-styled button in the **Bulk Action Bar** that exits **Bulk Delete Mode** and clears all **Deletion-Marked Mules** with no removal | Cancel button |
| **Bulk Confirm** | The destructive-styled button in the **Bulk Action Bar** that triggers **Bulk Delete**; disabled while zero **Deletion-Marked Mules** exist | Delete button (in bulk context), confirm button, apply button |
| **Selection Indicator** | The 22×22 rounded-square overlay at top-left of a **Character Card** in **Bulk Delete Mode**; empty outline when unmarked, filled with a check icon when the **Character Card** represents a **Deletion-Marked Mule**; purely visual, `aria-hidden` | Bulk checkbox, bulk check, card checkbox |
| **Mule Count Label** | The "N MULES" eyebrow-styled badge to the right of the "Roster" title in the default **Roster Header** | Roster count |

## Relationships

- A **Boss Family** contains one or more **Boss Difficulties**
- A **Mule** selects at most one **Boss Difficulty** per **Boss Family** per **Weekly Reset** (mutual exclusivity)
- A **Boss Difficulty** has exactly one **Crystal Value**
- A **Mule** has one **Potential Income** = sum of selected **Crystal Values**
- A **Mule** is an **Active Mule** iff its **Active Flag** is `true` (previously: iff **Potential Income** > 0; see "Flagged ambiguities")
- **Total Weekly Income** = sum of all **Active Mules'** **Potential Incomes** — an **Inactive Mule** contributes zero regardless of its boss selection
- An **Inactive Mule's** **Character Card** is rendered in the **Dim State** (0.55 opacity); its income line still shows the **Mule's** **Potential Income** but in the muted color
- **Crystal Value** is divided by **Party Size** (future: 1–6, default solo)
- A **Character Card** represents exactly one **Mule** in the **Roster**
- Clicking a **Character Card** or a **Split Card** slice opens the **Drawer** for that **Mule**
- The **Drawer** contains exactly one **Boss Matrix**, sitting under one **Matrix Toolbar** and one **Boss Search**
- The **Matrix Toolbar** renders above the **Boss Search**, which is **Fused** to the top of the **Boss Matrix**
- A **Boss Preset** is **Active Preset** iff every one of its member **Boss Families** has its **Hardest Tier** key in `Mule.selectedBosses`
- **CRA** ∩ **CTENE** share Vellum, Crimson Queen, Papulatus, and Magnus — toggling one **Boss Preset** off while the other is active leaves the overlap selected
- The **Cadence Filter**, **Boss Search** query, and **Boss Preset** highlight state all reset to defaults each time the **Drawer** opens for a **Mule**
- **Matrix Reset** clears `Mule.selectedBosses` only; **Cadence Filter** and **Boss Search** persist across the reset
- **Weekly Count** can exceed **Weekly Crystal Cap** — the cap is a reference display, not a selection limit
- The **Drag Boundary** is visible only while dragging within the **Roster**
- A **Character Card** cannot be dragged outside the **Roster** (confined)
- Exactly one of the default **Roster Header** or the **Bulk Action Bar** is visible at a time — they occupy the same slot
- Entering **Bulk Delete Mode** disables drag-to-reorder (dnd-kit sensors suspended) and hides the **Add Card**
- In **Bulk Delete Mode** a **Character Card's** click toggles it as a **Deletion-Marked Mule** instead of opening the **Drawer**; the hover trash popover and the level badge on the **Character Card** are hidden so the **Selection Indicator** has room
- **Bulk Confirm** calls `deleteMules(ids)` on the set of **Deletion-Marked Mules** and then exits **Bulk Delete Mode**; there is no confirmation modal — selection itself is the confirmation
- **Bulk Cancel** exits **Bulk Delete Mode** without removing any **Mule**
- The **Single Delete** path and **Bulk Delete** path both ultimately mutate the same `mules` state; **Single Delete** uses `deleteMule(id)`, **Bulk Delete** uses `deleteMules(ids)`
- The **Split Card** includes only **Active Mules** — an **Inactive Mule** renders no donut slice
- An **Inactive Mule's** **Character Card** remains fully interactive: hover-lift, click-to-open **Drawer**, and drag-to-reorder all work identically to an **Active Mule**; only the **Dim State** differs
- The **Active Toggle** sits on its own row directly below the weekly-mesos pill in the **Identity Section**; clicking it mutates the **Mule's** **Active Flag**
- Exactly one **Theme** and one **Density** are active at any time; both persist to localStorage
- The **Chart Palette** is a property of the active **Theme** — slice colors recolor when the **Theme** changes
- The **Density Toggle** mutates the active **Density**, which drives CSS variables that resize the **Roster**, **Character Card** padding, and **Class Silhouette**
- The **Reset Countdown** targets the next **Reset Anchor** after `Date.now()`; the countdown value updates once per second from a single `setInterval`
- The **Reset Countdown** uses the **Live Countdown Format** at the `sm` breakpoint and above, and the **Smart Countdown Format** below it
- At **Reset Anchor** crossover the **Reset Countdown** silently rolls over to the next week — no flash, no announcement

## Example dialogue

> **Dev:** "When I switch from **Comfy** to **Compact**, why does a **Character Card** shrink but the **KPI Card** barely changes?"
> **Domain expert:** "The **Density** CSS variables only resize **Roster** elements — card padding, grid columns, silhouette size. The **KPI Card** uses its own `--kpi-pad` variable that changes a little, but the **Bignum** inside stays fixed — we don't want the headline number dancing around."
> **Dev:** "Got it. And if a **Mule** has no selected **Boss Difficulties**, does it still appear in the **Split Card** donut?"
> **Domain expert:** "No. The **Split Card** only plots **Active Mules**. The **Character Card** still renders in the **Roster**, but it displays as inactive with a dim **Potential Income**."
> **Dev:** "What about the **Chart Palette** — is it shared between **Themes**?"
> **Domain expert:** "No, each **Theme** has its own palette. **Dark-Amber** uses warm amber + cool blues; **Cozy-Pastel** uses softer terracotta + sage. When the **Theme** changes, the donut slices recolor instantly because **Split Card** reads `--c1` through `--c5` at render time."
> **Dev:** "And when I drag a **Character Card**, is the **Add Card** also draggable?"
> **Domain expert:** "No — the **Add Card** is explicitly excluded from the sortable items. Only **Character Cards** participate in reorder, and they're confined by the **Drag Boundary**."
> **Dev:** "The **Reset Countdown** in the header — is that tracking the user's local Thursday or UTC Thursday?"
> **Domain expert:** "The **Reset Anchor** is always Thursday 00:00 UTC. The **Reset Countdown** just shows `target − Date.now()` as a duration, so the user sees the same remaining time regardless of timezone. It's a duration, not a wall-clock target."
> **Dev:** "So at the `sm` breakpoint and above it's `0D 14:32:07` ticking every second?"
> **Domain expert:** "Right — that's the **Live Countdown Format**. Below `sm` we switch to the **Smart Countdown Format** so a narrow header doesn't have a seven-character number dancing around next to a tight logo."
> **Dev:** "When I click **CRA** in the **Matrix Toolbar**, what actually gets selected?"
> **Domain expert:** "The **Hardest Tier** of every **Boss Family** in the **CRA** set. So Vellum gets its Chaos key, Zakum gets Chaos, Cygnus gets Easy — whichever **Boss Difficulty** has the highest **Crystal Value** for that family."
> **Dev:** "If I then click **CTENE**, the shared families (Vellum, Crimson Queen, Papulatus, Magnus) are already at their **Hardest Tier**. Does anything change for them?"
> **Domain expert:** "No — applying a **Boss Preset** is idempotent. Both **CRA** and **CTENE** become **Active Preset**. Now if you click **CRA** again to toggle it off, those four families stay selected because they're also **CTENE** members."
> **Dev:** "And **Matrix Reset** clears everything?"
> **Domain expert:** "**Matrix Reset** only clears the **Mule's** `selectedBosses`. The **Cadence Filter**, **Boss Search** query, and **Boss Preset** highlight all stay put. The filter/search reset on the next **Drawer** open, not on **Matrix Reset**."
> **Dev:** "The **Weekly Count** shows `16/14` — is that a bug?"
> **Domain expert:** "No. **Weekly Crystal Cap** is a reference, not a limit. The player can select more than 14 **Boss Cadence** `weekly` bosses; the display just shows they've overshot the real-game crystal cap."
> **Dev:** "If I flip a **Mule** with a full **Boss Matrix** to **Inactive Mule** via the **Active Toggle**, does the **Total Weekly Income** drop immediately?"
> **Domain expert:** "Yes — the **Active Flag** is the sole input to whether a **Mule's** **Potential Income** rolls up into **Total Weekly Income**. Flip it off and the KPI re-renders with that **Mule** excluded. The **Character Card** snaps into the **Dim State** at the same moment, and the card's income line stays visible but in the muted color so the user can still see what they're parking."
> **Dev:** "And the **KPI Card's** ACTIVE stat — does that count **Active Mules** or mules with at least one boss?"
> **Domain expert:** "**Active Mules**. It's **Active Flag**-driven now, intent-based. A user-declared active **Mule** with zero bosses selected still counts as 1 active; the income contribution is just 0 until they configure its bosses."
> **Dev:** "What about **Bulk Delete Mode** — if a user clicks the **Bulk Trash Icon** and then clicks a **Character Card**, it doesn't open the **Drawer**?"
> **Domain expert:** "Right. In **Bulk Delete Mode** every click on a **Character Card** toggles it as a **Deletion-Marked Mule** — the **Drawer** is off-limits for the duration. The card gets the **Selection Indicator** in the top-left and a red border. The hover trash and level badge vanish while the mode is active."
> **Dev:** "And no confirmation modal before **Bulk Delete**?"
> **Domain expert:** "No modal. The act of selecting cards one-by-one *is* the confirmation. Clicking **Bulk Confirm** in the **Bulk Action Bar** removes every **Deletion-Marked Mule** immediately via `deleteMules(ids)` and exits the mode. If the user changes their mind mid-flow they click **Bulk Cancel** — no **Mule** is removed."

## Flagged ambiguities

- "Income" was used inconsistently — sometimes meaning a mule's individual total, sometimes the global sum. Canonical terms: **Potential Income** (per mule) and **Total Weekly Income** (all mules). **Resolved in code:** `calculateMuleIncome` → `calculatePotentialIncome`, `totalIncome` → `totalWeeklyIncome`, local `income` → `potentialIncome`.
- "Boss" was overloaded to mean both the encounter and the crystal it drops. Canonical separation: **Boss** = the encounter, **Crystal** = the sellable item, **Crystal Value** = the mesos received. **Resolved in code:** `mesoValue` → `crystalValue` on the `Boss` type and all boss data entries.
- "Card" is repeatedly overloaded — **Character Card**, **KPI Card**, **Split Card**, **Add Card** all coexist. Always use the full compound name; never write "the card" unqualified when more than one is in context.
- "Mule Card" (from the **Handoff** files) refers to the same concept as **Character Card**. Canonical term: **Character Card**. The component file is named `MuleCharacterCard.tsx` for historical reasons; the class name and type stay but prose and PR descriptions should say **Character Card**.
- "Dark mode" / "light mode" were used interchangeably with the **Theme** names. Canonical terms: **Dark-Amber** and **Cozy-Pastel**. "Dark mode" is acceptable shorthand when contrast with "light mode" is the point, but never imply a third option — only these two themes exist.
- "Accent" in CSS has multiple variables (`--accent`, `--accent-raw`, `--accent-soft`, `--accent-glow`, `--accent-primary`, `--accent-secondary`, `--accent-numeric`). Prose canonical: **Accent** (the raw source color), **Accent Soft** (hover tint), **Accent Glow** (shadow halo). The shadcn-compatible `--accent` / `--accent-primary` / `--accent-numeric` are all aliases of the raw accent; prefer `--accent-raw` in new code.
- "Layout" was briefly polysemous — the **Handoff** ships four layouts (Classic, Bento, Leaderboard, Sidebar) but this app supports only **Classic Layout**. Do not refer to the others except as historical reference.
- "Entry" and "slot" were used interchangeably. Canonical term: **Entry Slot**. Not yet in code (future enhancement for daily/weekly distinction).
- "Preset" is now ambiguous — distinguish **Mule Preset** (template for fast-creating mules, not yet in code) from **Boss Preset** (CRA/CTENE toolbar shortcut inside the **Matrix Toolbar**). Never write "preset" unqualified.
- "Reset" was already flagged — now **Matrix Reset** joins **Weekly Reset**, **Reset Anchor**, and **Reset Countdown** in the set of distinct concepts. Always qualify: **Matrix Reset** clears selections, **Weekly Reset** is the game event, **Reset Countdown** is the header widget.
- "Filter" in prose could mean the **Cadence Filter** control or the `filterByCadence` / `filterBySearch` pipeline functions. Prefer **Cadence Filter** when referring to the UI; use function names when referring to code.
- "Hardest" / "top tier" / "max difficulty" — canonical term **Hardest Tier**, defined by `max(crystalValue)` on a boss's difficulty entries.
- "Drawer", "side drawer", "detail panel", and "modal" were all used to describe the right-side editing panel. Canonical term: **Drawer**.
- "Current day" and "today" were considered for a day-of-week label in the header but dropped from scope; avoid reintroducing either term in **Reset Countdown** copy. The **Reset Anchor** is always expressed as a duration, never as a day name.
- "Reset" alone is ambiguous — could mean **Weekly Reset** (the event), **Reset Anchor** (the instant), or **Reset Countdown** (the widget). In code and prose, pick the specific term.
- "Active" has been redefined. **Previous definition:** "a **Mule** with at least one **Boss Difficulty** selected" (income-derived). **New definition:** "a **Mule** whose **Active Flag** is `true`" (user-declared). The **Active Flag** is the explicit, persisted source of truth; code that previously tested `selectedBosses.length > 0` to infer activeness should be updated to test `mule.active`. Keep in mind **Active Mule** and **Inactive Mule** no longer correlate with having bosses — a brand-new **Active Mule** may have zero bosses and still count as active.
- New mules default to **Inactive Mule** (**Active Flag** `false`) on creation, matching the design's empty-slot **Dim State**. Existing persisted mules migrate to **Active Mule** (**Active Flag** `true`) on schema upgrade to preserve their contribution to **Total Weekly Income**.
- "Delete" is now polysemous — distinguish **Single Delete** (per-card hover popover or **Drawer** footer; operates on one **Mule**) from **Bulk Delete** (the **Bulk Confirm** action that removes every **Deletion-Marked Mule** in one pass). Never write "delete" unqualified when both paths are in scope.
- "Selected" is now polysemous — **Deletion-Marked Mule** is a **Mule** toggled on inside **Bulk Delete Mode** for removal; the "currently selected mule" in the **Drawer** is instead referred to as the "open **Mule**" or the "**Mule** being edited". Prefer **Deletion-Marked Mule** over "selected mule" in any **Bulk Delete Mode** context.
- "Roster Header" is the canonical name for the row above the **Roster** that contains title + density + bulk controls. It has two visual states — the default header and the **Bulk Action Bar** — but it is conceptually one slot.
