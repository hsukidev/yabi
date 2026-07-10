# YABI

A weekly-meso-income tracker for MapleStory GMS Reboot players who run multiple boss-clearing characters ("mules"). The domain is the boss-crystal economy: which **Mules** clear which **Bosses** each week, what each **Crystal** sells for, and how the per-**Mule** and per-**World** caps shape the headline number.

## Language

### Bosses & crystals

**Boss**:
A raid encounter that drops a sellable **Crystal** when defeated.
_Avoid_: Raid, dungeon boss

**Boss Family**:
A group of **Boss Difficulties** of the same boss that share a single weekly **Entry Slot**.
_Avoid_: Boss group, boss tier

**Boss Difficulty**:
A specific tier within a **Boss Family** — Easy, Normal, Hard, Chaos, or Extreme.
_Avoid_: Boss level, boss rank

**Crystal**:
The tradeable item dropped by a defeated **Boss**, sold to a vendor for mesos.
_Avoid_: Boss drop

**Crystal Value**:
The meso amount received when selling a **Crystal**, stored as one number per **World Group** — `{ Heroic, Interactive }`.
_Avoid_: Sell price, crystal price, meso value

**Heroic Crystal Value**:
The **Crystal Value** component a **Mule** on a **Heroic** world receives.
_Avoid_: Heroic price

**Interactive Crystal Value**:
The **Crystal Value** component a **Mule** on an **Interactive** world receives — typically ~20% of the **Heroic Crystal Value**, but not asserted (see **Crystal Value Ratio**).
_Avoid_: Interactive price

**Crystal Value Ratio**:
The informal `Interactive ÷ Heroic` relationship across the boss matrix — ~0.2 for 77 of 78 `(boss, tier)` pairs; **Extreme Kaling** is the only outlier (a 250 000-meso deviation, accepted as a real per-boss difference, not a typo).
_Avoid_: 5x rule, Interactive multiplier

**World Pricing**:
The two-value-per-tier **Crystal Value** model — every **Mule's** income resolves to its **World Group's** component, not a unified price.
_Avoid_: Per-world pricing

**Hardest Tier**:
The **Boss Difficulty** of a **Boss Family** with the highest **Crystal Value**.
_Avoid_: Top tier, max difficulty

### Mules

**Mule**:
A player character tracked for its weekly **Crystal**-sale income.
_Avoid_: Alt, character, toon

**Active Flag**:
The boolean intent flag on a **Mule** declaring whether it's in rotation; the sole input that decides whether the **Mule** contributes to **Total Weekly Income**.
_Avoid_: Enabled flag

**Active Mule**:
A **Mule** whose **Active Flag** is `true` — user-declared in rotation, regardless of boss selection.
_Avoid_: Participating mule

**Inactive Mule**:
A **Mule** whose **Active Flag** is `false` — user-declared parked, excluded from **Total Weekly Income**.
_Avoid_: Parked mule, disabled mule

**Contributing Mule**:
An **Active Mule** whose **Weekly Count** + **Daily Count** is at least one — i.e. earns non-zero **Potential Meso** this week. The predicate behind the **Character Card** income-line accent tint. **List View** rows use **Displayed Weekly Meso** tone instead, so a fully dropped **Active Mule** can render muted `0`. Distinct from **Active Mule** (intent flag, may earn zero via **Monthly Income Regression**) and from **Contributed Meso** (post-cut output). A monthly-only **Active Mule** is **not** a **Contributing Mule**.
_Avoid_: Earning mule (overloaded with Active Flag wording)

**Mule Notes**:
Optional freeform text attached to a **Mule** (≤500 characters); trimmed-empty is equivalent to absent.
_Avoid_: Comments, description, memo

### Worlds & regions

**World**:
A MapleStory GMS server — one of six options split across two **World Groups** and two **Regions**.
_Avoid_: Server, realm

**World Group**:
The boss-crystal economy partition — exactly one of **Heroic** or **Interactive**.
_Avoid_: Server type, world type

**Heroic**:
The **World Group** of Kronos, Hyperion, and Solis — higher **Crystal Values**.
_Avoid_: Reboot (an upstream-API artifact; never use as a domain synonym)

**Interactive**:
The **World Group** of Scania, Bera, and Luna — lower **Crystal Values** (~⅕ of **Heroic**).
_Avoid_: Regular servers, standard servers

**Region**:
The Nexon datacenter partition — exactly one of **NA Region** or **EU Region**; orthogonal to **World Group**.
_Avoid_: Datacenter, server region

**NA Region**:
The North American datacenter; hosts Kronos, Hyperion, Scania, Bera.

**EU Region**:
The European datacenter; hosts Solis (**Heroic**) and Luna (**Interactive**).

**World Id**:
The opaque `<group>-<name>` slug uniquely identifying a **World** (e.g. `heroic-kronos`, `interactive-scania`).
_Avoid_: World key, world slug

**Mule World Id**:
The immutable **World Id** assigned to a **Mule** at creation; never editable.
_Avoid_: Mule home world

**Selected World**:
The **World** the user currently has chosen, or `null` before first pick.
_Avoid_: Active world, current world

**World Lens**:
The runtime rule that scopes the **Roster** and every aggregation to the **Selected World** — a **Mule's** **Mule World Id** must match.
_Avoid_: World filter, world scope

**Fallback World Group**:
**Heroic** — the default applied when a **Mule** has no **Mule World Id** (legacy persistence pre-**World Select**).

### Weekly cycle

**Weekly Reset**:
The point at which **Entry Slots** refresh — Thursday 00:00 UTC.
_Avoid_: Reset (always qualify)

**Reset Anchor**:
The fixed instant every **Weekly Reset** targets — Thursday 00:00 UTC, GMS Reboot convention.
_Avoid_: Reset time, server reset

**Entry Slot**:
A single boss opportunity per **Weekly Reset** — only one **Boss Difficulty** per **Boss Family** can be used per week.
_Avoid_: Boss entry, boss attempt

### Party

**Party**:
A group of 1–6 players who defeat a **Boss** together.
_Avoid_: Group, team

**Party Size**:
The number of players (1–6) sharing the **Crystal Value** from a defeated **Boss** — divides weekly and monthly income; **ignored for daily**.
_Avoid_: N players

### Boss cadence

**Boss Cadence**:
The refresh frequency of a **Boss Difficulty** — `daily`, `weekly`, or `monthly`.
_Avoid_: Frequency

**Daily Cadence**:
A **Boss Difficulty** that can be cleared once per day; folds into weekly income at `Crystal Value × 7`, **Party Size** ignored.

**Weekly Cadence**:
A **Boss Difficulty** that clears once per **Weekly Reset**; the default for most **Boss Families**.

**Monthly Cadence**:
A **Boss Difficulty** that clears once per month — scoped today to Black Mage Hard and Extreme only, mutually exclusive via the **Monthly Radio Mutex**.

### Caps

**Weekly Crystal Cap**:
`14` — the per-**Mule** weekly **Crystal**-sale limit; a **Hard Cap** enforced on the **Boss Slate** at construction.
_Avoid_: The cap, weekly cap (always qualify)

**Monthly Crystal Cap**:
`1` — the per-**Mule** monthly Black Mage limit; a **Hard Cap** enforced by the **Monthly Radio Mutex**.

**World Weekly Crystal Cap**:
`180` — the per-**World** per-week **Crystal**-sale ceiling; a **Soft Cap** enforced via the **World Cap Cut**.
_Avoid_: World cap

**Hard Cap**:
A cap that blocks input — over-selection is rejected at the toggle. Examples: **Weekly Crystal Cap**, **Monthly Crystal Cap**.

**Soft Cap**:
A cap that allows over-selection at the input but silently drops contribution downstream. Sole example: **World Weekly Crystal Cap** via the **World Cap Cut**.

### Boss selection (per mule)

**Boss Slate**:
The validated, immutable collection of a **Mule's** **Slate Keys** — invalid states are unrepresentable by construction.
_Avoid_: Boss selection, selected bosses

**Slate Key**:
A single selection entry — the triple `<bossId>:<tier>:<cadence>` identifying one **Boss Difficulty** at one **Boss Cadence**.
_Avoid_: Boss key, selection key

**Selection Invariant**:
At most one **Slate Key** per `(bossId, cadence)` on any **Boss Slate** — the "one-per-family-per-cadence" rule.
_Avoid_: Uniqueness rule

**Tier Swap**:
The toggle outcome when a user picks a different **Boss Difficulty** for a `(bossId, cadence)` already present — the existing **Slate Key** is replaced atomically.

**Monthly Radio Mutex**:
The one-monthly-per-family rule — selecting a **Monthly Cadence** key on a family that already holds a different monthly key **Tier Swaps** instead of adding a second.

**Weekly Count**:
Count of **Weekly Cadence** **Slate Keys** on a **Mule** — surfaced as the `X/14` numerator in the **Crystal Tally**.

**Daily Count**:
Weekly-basis count of crystals from **Daily Cadence** **Slate Keys** on a **Mule** — `daily key count × 7`, surfaced as bare `X` (no cap) in the **Crystal Tally** and **List View**.

**Monthly Count**:
Count of **Monthly Cadence** **Slate Keys** on a **Mule** — surfaced as bare `X` (no denominator), always in `{0, 1}` by the **Monthly Radio Mutex**.

### Boss presets

**Boss Preset**:
One of four named entries in the **Drawer's** preset row — three **Canonical Presets** plus the **Custom Preset** indicator.
_Avoid_: Preset (always qualify against **Mule Preset**)

**Canonical Preset**:
A click-actionable **Boss Preset** — exactly **CRA**, **LOMIEN**, or **CTENE**.

**Custom Preset**:
The fourth **Boss Preset** pill — lights when the **Mule** has weekly **Slate Keys** but no **Canonical Preset** matches. Click opens the **User Preset Popover**; the pill itself is reflective (no **Conform** of its own).
_Avoid_: Fallback preset

**User Preset**:
A persisted, user-authored named loadout snapshot — `{ id, name, slateKeys[], partySizes }` capturing **all** of a **Mule's** **Slate Keys** (weekly, daily, monthly) **and the per-Boss-Family Party Size** for every family present in the snapshot, at save time. Party Sizes for families _not_ in the snapshot's keys are not captured. Created via "Save current as preset" inside the **User Preset Popover**; applied to another **Mule** via **Apply User Preset**. Distinct from the **Custom Preset** pill (which is the popover's host, not a preset itself) and from **Canonical Presets** (which conform weeklies only).
_Avoid_: Saved preset, personal preset, my preset, custom preset (the pill)

**Apply User Preset**:
The **User Preset** click action — atomically replace every **Slate Key** _and_ the entire **Party Sizes** record on the **Mule** with the snapshot's `slateKeys` and `partySizes`. Unlike **Conform**, daily and monthly keys are not preserved; unlike a partial update, **Party Sizes** for families not in the snapshot are wiped. Applying a snapshot that already matches the **Mule's** **Boss Slate** _and_ **Party Sizes** is a no-op.
_Avoid_: Conform (reserved for **Canonical Presets**)

**CRA**:
The **Canonical Preset** covering the eleven Chaos Root Abyss-era families, each pinned to its **Hardest Tier**.

**LOMIEN**:
The **Canonical Preset** covering every **CRA** family plus Akechi, Lotus, and Damien — Lotus and Damien are **Multi-Tier Entries** accepting Normal or Hard.

**CTENE**:
The **Canonical Preset** covering the Chosen Tenebris-era boss list; Lotus is pinned to Hard despite **Hardest Tier** being Extreme.

**Preset Entry**:
One item in a **Canonical Preset** — a **Boss Family** plus an ordered **Accepted Tiers** list.

**Accepted Tiers**:
The ordered list of tiers a **Preset Entry** counts as a match — single-element for most entries, multi-element for **Multi-Tier Entries**.

**Default Tier**:
The first element of a **Preset Entry's** **Accepted Tiers** — the tier **Conform** inserts when no compatible key exists yet.

**Multi-Tier Entry**:
A **Preset Entry** with more than one **Accepted Tier**; only LOMIEN's Lotus and Damien (`['normal', 'hard']`) qualify today.

**Active Preset**:
The **Boss Preset** the **Mule's** current **Boss Slate** matches — at most one at a time, derived per render (never persisted).

**Same-Cadence Equality**:
_[Retired in favour of **Full-Slate Equality** once **User Preset** ships.]_ The original **Active Preset** match rule for **Canonical Presets** — weekly **Slate Keys** must exactly cover every **Preset Entry** with tier in **Accepted Tiers**, zero weekly keys on outside families, daily **Slate Keys** orthogonal.
_Avoid_: Strict match, exact match

**Full-Slate Equality**:
The **Active Preset** match rule for **Canonical Presets** — the **Boss Slate** must satisfy the original weekly equality **and** carry zero **Slate Keys** of any other cadence (no dailies, no monthlies). Toggling a single daily cell demotes a Canonical match to **Custom Preset**. Replaces **Same-Cadence Equality**.

**Matched Canonical Preset**:
The **Canonical Preset** under which a **Boss Slate** satisfies **Full-Slate Equality**, or `null`. Surfaced as `MuleBossSlate.matchedCanonical()` — the slate-side query the **Drawer** reads to derive the **Active Pill**.

**User Preset Match**:
The **User Preset** match rule — the **Boss Slate's** full key set (every cadence) is order-insensitive set-equal to the snapshot's `slateKeys`, **and** for every **Boss Family** present in the snapshot, `(currentMule.partySizes[family] ?? 1) === (snapshot.partySizes[family] ?? 1)`. Extraneous **Party Sizes** entries on the live **Mule** for families not in the snapshot are ignored. Drives both popover row highlighting and **Custom Preset** pill activation.

**Conform**:
The **Canonical Preset** click action — preserve compatible weekly **Slate Keys**, drop non-accepted ones, add the **Default Tier** for missing entries, wipe weeklies outside the preset's families, **and wipe every daily and monthly key**. The post-**Conform** **Boss Slate** is always pure-Canonical (weekly-only, satisfies **Full-Slate Equality** with the clicked **Canonical Preset**). No-op when the clicked pill is already **Active**.
_Avoid_: Apply preset

**Preset Swap**:
The observable outcome of clicking one **Canonical Preset** while another is **Active** — a single atomic **Conform** that wipes the prior preset's keys as a side effect.

### Income & cap cut

**Total Crystal Value**:
The per-**Mule** weekly meso total — daily contributes `crystalValue × 7`, weekly contributes `crystalValue / partySize`, monthly contributes `0`.

**Computed Value**:
The per-**Slate-Key** meso contribution into **Total Crystal Value** — daily `crystalValue` (party size ignored), weekly and monthly `crystalValue / partySize`.

**Potential Income**:
The uncapped weekly meso a single **Mule** would earn in isolation under its **World Group**.
_Avoid_: Weekly income, max income

**Total Weekly Income**:
The post-**World Cap Cut** sum of every **Active Mule's** **Contributed Meso** in the **Selected World** — the **KPI Card** bignum.
_Avoid_: Global income

**Crystal Slot**:
A single value-bearing unit in the **World Slot Pool** — one per **Weekly Cadence** key, seven per **Daily Cadence** key, zero per **Monthly Cadence** key.
_Avoid_: Sale slot, slot

**Slot Value**:
The per-**Crystal Slot** meso amount — the sort key for the **World Cap Cut**.

**World Slot Pool**:
The pool of every **Crystal Slot** across every **Active Mule** in the **Selected World** — the input to the **World Cap Cut**.

**World Cap Cut**:
The trim applied to the **World Slot Pool** when it exceeds **World Weekly Crystal Cap** (180) — drop slots in ascending **Slot Value** order until 180 remain. Dropped slots contribute zero meso.
_Avoid_: Cap drop, top-180 cut

**Cap Tiebreak**:
The deterministic ordering when **Crystal Slots** share **Slot Value** at the **World Cap Cut** boundary — higher **Roster** index drops first; within one **Mule**, later-inserted **Slate Key** drops first.

**Potential Meso**:
The per-**Mule** uncapped weekly meso — synonymous with **Total Crystal Value** at per-mule scale; the **Character Card's** Income number.
_Avoid_: Raw potential, max meso

**Contributed Meso**:
The per-**Mule** post-**World Cap Cut** meso that lands in **Total Weekly Income**.
_Avoid_: Capped meso, net meso

**Displayed Weekly Meso**:
The per-**Mule** weekly number shown by roster readout surfaces. For an **Active Mule**, this is its **Contributed Meso** after the **World Cap Cut**. For an **Inactive Mule**, this is muted **Potential Meso** as a planning hint and still contributes zero to **Total Weekly Income** and share.
_Avoid_: Row income, shown income

**Dropped Meso**:
`Potential Meso − Contributed Meso` — a **Mule's** loss to the **World Cap Cut**; surfaced as the **Cap Drop Badge** when non-zero.
_Avoid_: Lost meso

**Crystal Sale Tally**:
The roster-wide count of **Crystal Slots** that survived the **World Cap Cut** in the **Selected World** — the **Weekly Cap Rail's** numerator, bounded ≤180.

**Monthly Income Regression**:
The accepted-by-design behaviour where selecting a **Monthly Cadence** **Slate Key** leaves **Total Weekly Income** and weekly-mesos readouts unchanged (since monthly weights `× 0` in **Total Crystal Value**) — not a bug; **Expected Black Mage Income** belongs to a dedicated source-specific monthly readout.

**Expected Black Mage Income**:
The standalone monthly meso amount from selected Black Mage **Monthly Cadence** **Slate Keys**, divided by the **Mule's** Black Mage **Party Size**. It is source-specific monthly income, not a monthly rollup of **Total Weekly Income**, and appears per-**Mule** as BM Income on **Character Cards** when space allows.
_Avoid_: Black Mage Monthly

### UI surfaces

**Roster**:
The **Mule** collection surface, rendered in exactly one **Roster Display Mode** — either **Card View** or **List View** — with a trailing **Add Card** in both.
_Avoid_: Card grid, mule list

**Roster Display Mode**:
How the **Roster** is laid out — exactly one of **Card View** or **List View**. Persisted per user.
_Avoid_: View mode, layout mode

**Card View**:
The **Roster Display Mode** that renders each **Mule** as a **Character Card** in a responsive grid. Default mode. The full card is the drag surface for reorder — there is no **Drag Handle**.
_Avoid_: Grid view, card grid

**List View**:
The **Roster Display Mode** that renders each **Mule** as one horizontal row — **Drag Handle**, avatar, identity (name, class, **Lv.X**, **Weekly Count**, **Daily Count** stacked under the name), **Displayed Weekly Meso**, share. Subject to **Density**. Reorder is engaged only from the **Drag Handle**, never from the row body.
_Avoid_: List, table view, row view

**Density**:
The **List View** size mode — exactly one of **Comfy** or **Compact** — driving row padding, avatar size, in-row gap, and inter-row gap. Persisted per user. The **Density Toggle** is hidden below 768px; in that range **Comfy**'s row dimensions tighten via override so the user isn't stranded with a chunkier-than-fits layout.
_Avoid_: Row size, list size

**Comfy**:
The looser **Density** — taller rows, larger avatar, more inter-row gap; the default for new users. Below 768px, **Comfy**'s row dimensions are tightened via override (the **Density Toggle** is hidden in that range).
_Avoid_: Comfortable, spacious, large

**Compact**:
The tighter **Density** — shorter rows, smaller avatar, less inter-row gap; favored when scanning many **Mules** at once.
_Avoid_: Dense, small, tight

**Density Toggle**:
The header control that flips **Density** between **Comfy** and **Compact**. Hidden below 768px because the toggle's value is too small to matter at that scale.
_Avoid_: Density picker, density switcher

**Meso Display**:
The user-facing rendering of meso amounts. Meso values always render abbreviated in-line (`5.31B`), with the full value (`5,310,000,000`) exposed by a hover/focus tooltip only when the value is non-zero. A zero meso value renders as plain `0` with no tooltip.
_Avoid_: Format preference, abbreviated/full toggle, number format toggle

**Drag Handle**:
The leftmost column of a **List View** row — a full-row-height grab strip (24px wide regardless of **Density**) holding a vertical-grip glyph. The sole drag-activator for reorder in **List View**: pointer drag engages from the handle only, the rest of the row is click-to-open. **Card View** has no **Drag Handle** — its full card is the drag surface. Replaced by the **Selection Indicator** in **Bulk Delete Mode** (drag is suspended). Subject to **Mouse Sensor**, **Touch Sensor**, and **Keyboard Sensor** identically to the **Character Card**.
_Avoid_: Grip, row grip, reorder handle

**Character Card**:
The tile in the **Roster** for one **Mule** — avatar, name, class, level, and **Potential Meso**.
_Avoid_: Mule card, tile

**Drawer**:
The right-side panel that slides in for editing a selected **Mule's** full details.
_Avoid_: Side drawer, detail panel, modal

**KPI Card**:
The hero card showing **Total Weekly Income**, **Expected Black Mage Income**, mule and active counts, weekly/daily/monthly crystal-count tiles, the **Weekly Cap Rail**, and the **Reset Countdown**.
_Avoid_: Hero card, summary card

**PieChart Card**:
The donut breakdown of **Contributed Meso** across **Active Mules** in the **Selected World**.
_Avoid_: Split card, breakdown card

**Boss Matrix**:
The grid inside the **Drawer** — rows are **Boss Families**, columns are **Boss Difficulty** tiers. One of the two **Slate Display Modes**.
_Avoid_: Matrix, boss grid

**Slate Display Mode**:
How the **Drawer** renders the open **Mule's** **Boss Slate** — exactly one of **Boss Matrix** or **Boss Card View**. Persisted per user, global across **Mules**; defaults to the **Boss Card View** when no preference is stored. Both modes read and write the same **Boss Slate**.
_Avoid_: Drawer view mode, boss view (unqualified)

**Boss Card View**:
The **Slate Display Mode** that renders one **Boss Card** per **Boss Family** in a responsive grid (one or two per row). Distinct from **Card View**, which is a **Roster Display Mode**.
_Avoid_: Card view (reserved for the **Roster Display Mode**), card mode

**Boss Card**:
The tile in the **Boss Card View** for one **Boss Family** — sprite, family name, **Party Size** stepper, and **Difficulty Rows**, each **Difficulty Row** carrying its per-clear meso value inline next to the cadence. Shows selected styling when the family holds at least one **Slate Key**; the card body itself is never a selection surface.
_Avoid_: Boss tile, family card, the card (unqualified)

**Difficulty Row**:
One (**Boss Difficulty**, **Boss Cadence**) option row on a **Boss Card** — the sole selection surface of the card. Tapping it toggles that **Slate Key**; unselected rows of an already-selected cadence dim but stay tappable (**Tier Swap**).
_Avoid_: Mode toggle option, tier row

**Slate View Toggle**:
The **Drawer** toolbar segmented control, left of the Matrix Reset button, that selects the **Slate Display Mode** — **Boss Card View** segment first, **Boss Matrix** second; clicking a segment selects that mode (clicking the active segment is a no-op).
_Avoid_: View toggle (unqualified), matrix/card switch

**Add Card**:
The dashed-border placeholder at the end of the **Roster** that creates a new **Mule** on click.

**Weekly Cap Rail**:
The progress bar at the bottom of the **KPI Card** showing **Crystal Sale Tally** vs **World Weekly Crystal Cap** — clamps at `180/180 · 100%`.

**Reset Countdown**:
The widget on the **KPI Card** displaying duration to the next **Reset Anchor**, ticking every second.

**World Select**:
The header control for choosing the **Selected World** — grouped by **World Group** with **Heroic** / **Interactive** eyebrow labels.
_Avoid_: World dropdown, world picker

**Active Toggle**:
The pill in the **Drawer's** identity section that flips a **Mule's** **Active Flag**.
_Avoid_: Active switch (that's the **Roster Active Switch**)

**Roster Active Switch**:
The hover-revealed switch (track + thumb) on roster items that flips a **Mule's** **Active Flag** in place, without opening the **Drawer** — top-right corner on a **Character Card**, in the identity cluster after the Lv.X pill on a **List View** row. Revealed on pointer hover or keyboard focus only, in both states; absent on touch devices and in bulk-delete mode. Flips instantly — no confirmation. Distinct from the **Active Toggle** (the **Drawer** pill); both write the same **Active Flag**.
_Avoid_: Card toggle, hover toggle, active toggle (unqualified), park switch

**Crystal Tally**:
The horizontal three-cell readout in the **Drawer** showing **Weekly Count** (`X/14`), **Daily Count** (`X`), and **Monthly Count** (`X`).

**Notes Field**:
The textarea in the **Drawer** body that edits **Mule Notes**.

**Cap Drop Badge**:
The "−`X` to cap" annotation on a **Character Card** when the **Mule's** **Dropped Meso** is non-zero — the only per-**Mule** signal of the **World Cap Cut**.

**Real Avatar**:
The character render PNG fetched from Nexon's CDN by **Character Lookup** — replaces the placeholder avatar on a **Character Card**.

**Character Lookup**:
The one-click **Drawer** action that fetches a real character's name, level, class, and **Real Avatar** from Nexon's Weekly Ranking by name + **Mule World Id**.
_Avoid_: Character fetch, name search

## Relationships

- A **Boss Family** contains one or more **Boss Difficulties**.
- A **Boss Difficulty** has exactly one **Crystal Value**, which carries one number per **World Group** (**Heroic Crystal Value**, **Interactive Crystal Value**).
- **Heroic Crystal Value** ≥ **Interactive Crystal Value** for every **Boss Difficulty** — a structural invariant of the economy. The **Crystal Value Ratio** is ~0.2 across the board, with **Extreme Kaling** as the only real outlier.
- A **World** belongs to exactly one **World Group** and exactly one **Region**; **World Group** and **Region** are orthogonal axes — Solis is `(Heroic, EU)`, Luna is `(Interactive, EU)`, the other four **Worlds** are `(_, NA)`.
- A **Mule** belongs to exactly one **World** via its immutable **Mule World Id**; moving a **Mule** between **Worlds** requires delete + recreate.
- A **Mule** with no **Mule World Id** (legacy persistence) is invisible under every **World Lens** until deleted or rewritten.
- A **Mule** selects at most one **Boss Difficulty** per **Boss Family** per **Boss Cadence** — the **Selection Invariant**.
- The **Weekly Crystal Cap** (`14`) bounds **Weekly Cadence** **Slate Keys** per **Mule**; the **Monthly Crystal Cap** (`1`) bounds **Monthly Cadence** keys; both are **Hard Caps**.
- A **Daily Cadence** **Slate Key** contributes 7 **Crystal Slots** to the **World Slot Pool** but counts as 0 against the per-**Mule** **Weekly Crystal Cap**.
- A **Monthly Cadence** **Slate Key** contributes 0 **Crystal Slots** and 0 meso to **Total Weekly Income** (see **Monthly Income Regression**), while contributing to **Expected Black Mage Income** when it is a Black Mage key.
- A **Mule's** **Potential Income** equals its **Total Crystal Value** under its **World Group** — `Income.of` resolves each **Mule** individually, so a **Roster** mixing **Heroic** and **Interactive** **Mules** prices each one against its own **Crystal Value** component.
- A **Mule** is an **Active Mule** iff its **Active Flag** is `true` — independent of whether it has any bosses selected.
- The **Active Flag** has exactly two writers — the **Active Toggle** (**Drawer**) and the **Roster Active Switch** (**Character Card** and **List View** row) — and they are always in agreement because there is one flag.
- Deleting a **Mule** has exactly two paths: bulk delete from the **Roster** header, or the **Drawer's** delete action. Roster items (**Character Card**, **List View** row) carry no per-item delete.
- **Total Weekly Income** = sum of **Active Mules'** **Contributed Meso** in the **Selected World** — diverges from the sum of **Potential Meso** whenever the **World Cap Cut** drops at least one slot.
- An **Inactive Mule** contributes zero to **Total Weekly Income** regardless of selection; its **Character Card** and **List View** row still show its **Potential Meso** in muted styling.
- **Displayed Weekly Meso** is the roster readout bridge: **Active Mules** show **Contributed Meso**, including muted `0` when fully dropped; **Inactive Mules** show muted **Potential Meso** for planning without affecting **Total Weekly Income** or share.
- **World Weekly Crystal Cap** is per-**World** — every **Selected World** has its own independent **World Slot Pool** and its own 180-slot ceiling. A player with **Mules** across multiple **Worlds** has no cross-world budget.
- **Active Preset** is derived per render in this priority order:
  1. If the **Boss Slate** satisfies **User Preset Match** against any saved **User Preset**, the **Custom Preset** pill is **Active** and that **User Preset** is the highlighted row in the **User Preset Popover**.
  2. Else if the **Boss Slate** satisfies **Full-Slate Equality** with a **Canonical Preset**, that **Canonical Preset** is **Active**.
  3. Else if the **Boss Slate** has ≥1 **Slate Key** of any cadence, the **Custom Preset** pill is **Active** with no highlighted row in the popover.
  4. Else (empty **Boss Slate**), no preset is **Active**.
- At most one **Boss Preset** is **Active** at a time; **Active Preset** is derived per render from the **Boss Slate** — never persisted.
- **User Presets** are global — one library shared across the **Roster**, independent of **Selected World** or which **Mule** is open in the **Drawer**.
- The **Roster**, **KPI Card**, **PieChart Card**, **Total Weekly Income**, and the **Crystal Tally** counts all read **World Lens**-filtered **Mules** only.
- The **Reset Anchor** is always Thursday 00:00 UTC; the **Reset Countdown** is a duration, not a wall-clock target — same remaining time regardless of timezone.
- The **PieChart Card's** slices size on **Contributed Meso**, not **Potential Meso** — a fully-dropped **Mule** renders no slice; its **Character Card** still shows full **Potential Meso** plus a **Cap Drop Badge**, while **List View** shows muted `0` with the dropped-boss info icon.
- A **Character Card's** headline reads **Potential Meso** (uncapped, stable for planning); the **KPI Card's** bignum reads **Total Weekly Income** (post-cut). The two diverge whenever the **World Cap Cut** drops at least one slot.
- The **Drawer** renders the **Boss Slate** in exactly one **Slate Display Mode** at a time; **Boss Matrix** and **Boss Card View** are projections of the same **Boss Slate**, so selections, **Boss Presets**, and Matrix Reset reflect identically in both — there is no per-mode selection state.
- A **Boss Card's** per-clear meso values are shown inline on every **Difficulty Row** (next to the cadence, always — selected or not) and always equal the corresponding **Boss Matrix** cell: **Daily Cadence** at full **Crystal Value**, **Weekly**/**Monthly Cadence** at **Crystal Value** ÷ **Party Size**. The value shares the row's color — accent when the **Difficulty Row** holds its **Slate Key**, muted otherwise.

## Example dialogue

> **Dev:** "When I add a new **Mule** without picking a **World** first, what happens?"
> **Domain expert:** "Nothing — a banner appears, no **Mule** is appended. **Mule World Id** is set at creation and is immutable, so there's no 'pick a world later' flow. Once the user picks a **Selected World**, the banner unmounts and **Add Card** starts working."

> **Dev:** "If I create the same character on Kronos and on Scania, why does Scania's weekly mesos read ~⅕?"
> **Domain expert:** "**World Pricing**. Kronos is **Heroic**, Scania is **Interactive**. Every **Crystal Value** stores both numbers — `{ Heroic, Interactive }` — and income resolves to the **Mule's** **World Group**. The **Crystal Value Ratio** is ~0.2 across the board, so Interactive income is roughly a fifth of Heroic."

> **Dev:** "Always exactly 5×?"
> **Domain expert:** "No — **Extreme Kaling** is the outlier. Its **Heroic Crystal Value** is `6 026 000 000` but the **Interactive Crystal Value** is `1 205 250 000`, not the implied `1 205 200 000`. A 250 000-meso deviation. We treat it as real, not a typo, and don't assert the ratio in tests."

> **Dev:** "If I try to select a 15th **Weekly Cadence** boss, does it just queue up?"
> **Domain expert:** "No — **Weekly Crystal Cap** is a **Hard Cap**. The 15th toggle is rejected at input. The **Boss Slate** keeps the 14 highest-value weeklies by construction; a legacy persisted **Mule** with 16 weeklies on disk reads as 14 on first load."

> **Dev:** "And if my whole **Roster** has 200 weekly+daily **Crystal Slots** in Kronos?"
> **Domain expert:** "That's **Soft Cap** territory. The **World Cap Cut** runs on the **World Slot Pool**, drops the lowest-**Slot Value** **Crystal Slots** until exactly 180 remain, and the dropped slots contribute zero meso. The bignum reads **Total Weekly Income** post-cut, not the sum of **Potential Meso**. The **Mule** that ate the loss gets a **Cap Drop Badge** with its **Dropped Meso**."

> **Dev:** "So the **Weekly Cap Rail** caps at `180/180`?"
> **Domain expert:** "Yes — bar fill, percent, and numerator all clamp. Over-selection is invisible at the rail and surfaces only via **Cap Drop Badges** on individual **Character Cards**. The rail tells the truth about 'how full is the bucket'; the badge tells the truth about 'who got cut'."

> **Dev:** "Click **CRA** while LOMIEN is **Active** — what actually happens?"
> **Domain expert:** "**Preset Swap**. **Conform** wipes every weekly **Slate Key** outside CRA's families, preserves overlap families' compatible tiers (anything in CRA's **Accepted Tiers**), and adds CRA's **Default Tier** for missing entries. Dailies untouched. One atomic update, **Active** flips to CRA."

> **Dev:** "And if I click CRA again while CRA is already **Active**?"
> **Domain expert:** "Short-circuit no-op. **Conform** detects the clicked pill is **Active** and returns before any state write. **Preset Pills** are apply-only — there's no 'click to deselect.' The exits from an **Active Preset** are clicking a different **Canonical Preset**, hitting **Matrix Reset**, or manually deselecting weekly cells until the slate drifts away."

> **Dev:** "If I park a **Mule** with a full **Boss Matrix** via the **Active Toggle**, does **Total Weekly Income** drop right away?"
> **Domain expert:** "Yes — **Active Flag** is the sole gate. Flip it off and the **Mule** falls out of the **World Slot Pool** before the **World Cap Cut**, which can free **Crystal Slots** for previously-dropped slots elsewhere on the **Roster**. The **Character Card** dims but stays clickable, and roster readouts still show **Potential Meso** in muted styling so the user can see what they're parking."

> **Dev:** "Black Mage Hard and Extreme are both **Monthly Cadence** — if both get picked, do I get both?"
> **Domain expert:** "No — **Monthly Radio Mutex** via the **Selection Invariant**. Both share `(black-mage-id, 'monthly')`, so picking Extreme while Hard is on **Tier Swaps** to Extreme. **Monthly Count** stays at `1`. The weekly-mesos pill drops by Hard's **Crystal Value** because **Total Crystal Value** weights monthly `× 0` — that's the **Monthly Income Regression**, accepted-by-design."

> **Dev:** "Switching from Kronos to Hyperion via **World Select** — does that scramble my mule order?"
> **Domain expert:** "No. The **World Lens** filters; ordering is preserved within the **Selected World** because every dragged id shares that world. Cross-**World** ordering survives a lens switch — drag indices are computed against the unfiltered list, so a Kronos **Mule's** position relative to a Hyperion **Mule** holds across both views."

## Flagged ambiguities

- "Income" was used for both per-mule and roster-wide totals. Canonical in prose: **Potential Income** (per **Mule**) vs **Total Weekly Income** (roster-wide, post-cut). The **Character Card** user-facing label `INCOME` means **Potential Meso** only.
- "Boss" was overloaded with the **Crystal** it drops. Canonical separation: **Boss** = the encounter, **Crystal** = the sellable item, **Crystal Value** = the mesos received.
- "Card" is overloaded — **Character Card**, **KPI Card**, **PieChart Card**, **Add Card**, **Boss Card** all coexist. Always use the full compound name; never write "the card" unqualified.
- "Card View" vs "Boss Card View" — **Card View** is the **Roster Display Mode**; **Boss Card View** is the **Slate Display Mode**. Never shorten the latter to "card view".
- "Mule Card" (from the design handoff) is the same concept as **Character Card**. Canonical: **Character Card** in prose; the component file is named `MuleCharacterCard.tsx` for historical reasons only.
- "Active" is now intent-based, not income-derived. Previously: "**Mule** with ≥1 boss selected". Canonical: **Active Flag** is `true`. A new **Active Mule** can have zero bosses.
- "Active world" collapses two distinct axes. Use **Selected World** for the user's choice; reserve **World Lens** for the filtering rule it drives.
- "Cap" spans three distinct concepts: **Weekly Crystal Cap** (`14`, per-**Mule**, **Hard**), **Monthly Crystal Cap** (`1`, per-**Mule**, **Hard**), **World Weekly Crystal Cap** (`180`, per-**World**, **Soft** via **World Cap Cut**). Never write "the cap" or "weekly cap" unqualified.
- "Reset" splits into **Weekly Reset** (the event), **Reset Anchor** (the instant), and **Reset Countdown** (the widget). Always pick the specific term.
- "Preset" is ambiguous between **Boss Preset** (the four pills in the **Drawer**) and **Mule Preset** (a fast-mule-creation template, not yet shipped). Within **Boss Preset**, distinguish **Canonical Preset** (click-actionable) from **Custom Preset** (inert indicator).
- "Active Preset" is now strict **Same-Cadence Equality**, not subset-match. Adding a non-preset weekly to an **Active Preset** collapses it to **Custom Preset**; under the old subset rule the pill stayed lit.
- "Apply preset" / "toggle preset" / "select preset" were used loosely. Canonical verb: **Conform**. Pill click has no deselect gesture — exits are **Preset Swap**, **Matrix Reset**, or manual cell deselection.
- "Hardest" / "top tier" / "max difficulty" canonicalize to **Hardest Tier** = `max(crystalValue)` on a **Boss Family**.
- "Heroic" vs "Reboot" — **Heroic** is the canonical **World Group** name. "Reboot" is an artefact of Nexon's upstream API only and must never be used as a domain synonym.
- "Region" vs "World Group" are orthogonal axes. Solis (Heroic, EU) and Kronos (Heroic, NA) share an economy but live on different upstream URLs; Solis (Heroic, EU) and Luna (Interactive, EU) share a datacenter but have different economies. Don't conflate.
- "World Id" is polysemous across the **Character Lookup** boundary. **Our** **World Id** is the slug like `heroic-kronos`. **Nexon's** **worldID** is a numeric integer in their ranking response. Prefer **World Id** for ours; explicitly say "numeric **worldID**" for theirs.
- "Hash" appears in user-language for the data-export artefact. This is the **wrong word** — a hash is one-way. Canonical: **Transfer Code**. Treat user-side "hash" as a synonym to translate, never a thing to ship.
- "Snapshot" is polysemous. The drag-to-select snapshot (per-mule **Deletion-Marked** state captured at gesture start, the **Original Snapshot** the hook reverts to on `pointercancel` or backtrack) and the data-import snapshot (localStorage reads captured before write) are unrelated. Always qualify.
- "Avatar" alone is now imprecise — a **Character Card's** rendering surface shows either a **Real Avatar** (when the **Mule** has been looked up) or the placeholder fallback. Prefer **Real Avatar** vs placeholder when the distinction matters.
- "Family" is overloaded with **Boss Family** (the domain entity) and **Slate Family** (a UI projection wrapper). The bare term means **Boss Family**.
- "Selected" can mean a **Deletion-Marked Mule** (in bulk-delete mode) or "the open **Mule** in the **Drawer**". Prefer **Deletion-Marked Mule** vs "the open **Mule**".
- "Monthly" always means the **Boss Cadence** value, never a calendar-month qualifier. Until another family flips, it means Black Mage Hard or Extreme specifically.
- "Top-14 Weekly Cut" is **retired**. The cap is now a **Boss Slate** invariant on construction; **Total Crystal Value** is a plain sum, not a sort-and-slice.
- "WEEKLY CAP" as a literal label appears on the **Weekly Cap Rail**; it is no longer a stat-row cell. Old screenshots showing a `WEEKLY CAP` cell in the **KPI Card** stat row are stale.
- "Layout" — only **Classic Layout** ships. Design-handoff references to Bento / Leaderboard / Sidebar layouts are historical and out of scope.
