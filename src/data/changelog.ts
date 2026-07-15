export type ChangeCategory = 'feature' | 'ui' | 'fix';

export type Change = {
  category: ChangeCategory;
  text: string;
  boldText?: string;
};

export type Release = {
  date: string;
  version: string;
  headline?: string;
  changes: Change[];
};

export const CATEGORY_META: Record<ChangeCategory, { label: string; order: number }> = {
  feature: { label: 'Features', order: 0 },
  ui: { label: 'UI Enhancements', order: 1 },
  fix: { label: 'Bug Fixes', order: 2 },
};

export const ORDERED_CATEGORIES: ChangeCategory[] = (
  Object.keys(CATEGORY_META) as ChangeCategory[]
).sort((a, b) => CATEGORY_META[a].order - CATEGORY_META[b].order);

export const releases: Release[] = [
  {
    date: '2026-07-15',
    version: '1.6.0',
    changes: [
      {
        category: 'feature',
        text: "Bulk Select Mode: the Roster's bulk-delete trash icon becomes a Select button, and the action bar gains neutral/accent chrome with an `N SELECTED` pill and a Select all / Clear selection link. Delete now confirms in place (`Delete N? Yes/Cancel`), prunes the deleted mules, and keeps the mode — Cancel is the only exit. On touch, the floating Delete pill morphs into its own inline confirm.",
      },
      { category: 'feature', text: 'Add cadence completion marks to characters.' },
      {
        category: 'feature',
        text: "Add Combat Power: record a mule's CP in the drawer next to Level (with a live full-precision header readout) and see it abbreviated on Character Cards and List View rows, with full-value tooltips.",
      },
      {
        category: 'ui',
        text: 'Roster CP abbreviations now keep one decimal (4,523,213,145 shows as 4.5B instead of 5B), trimming a trailing .0.',
      },
      { category: 'feature', text: 'Update UI to show earned income vs expected income.' },
      {
        category: 'ui',
        text: "Consolidate the mule detail drawer's per-mule controls into the Mule Actions Menu kebab: it now flips the Active Flag, sets or clears the three Clear Marks, and deletes the mule (instant, with an undo toast, closing the drawer). The Active Toggle is now a read-only status chip, the Crystal Tally is a read-only counts display (weekly shows a bare count), and read-only Completion Checks return beside the mule's name.",
      },
      {
        category: 'ui',
        text: 'Reintroduce the Mule Actions Menu kebab on roster surfaces: always visible top-right on every Character Card and as the trailing column on every List View row (hidden in Bulk Select Mode). It flips the Active Flag, sets or clears the daily/weekly/BM Clear Marks (rows shown per cadence eligibility), and deletes the mule instantly with an undo toast — without opening the drawer or starting a drag.',
      },
    ],
  },
  {
    date: '2026-07-10',
    version: '1.5.0',
    changes: [
      { category: 'feature', text: 'Added Boss Card View.' },
      { category: 'ui', text: 'Allow active/inactive quick switch on character cards.' },
      { category: 'feature', text: 'Added Jupiter (Normal and Hard).' },
    ],
  },
  {
    date: '2026-06-29',
    version: '1.4.2',
    changes: [{ category: 'feature', text: 'Added Malefic Star (Normal and Hard).' }],
  },
  {
    date: '2026-05-28',
    version: '1.4.1',
    changes: [
      {
        category: 'fix',
        text: 'Show accurate post-cap weekly income across roster cards, list rows, and drawer.',
      },
    ],
  },
  {
    date: '2026-05-21',
    version: '1.4.0',
    changes: [
      { category: 'feature', text: 'Added Black Mage support' },
      {
        category: 'fix',
        text: 'Fix List View daily crystal counts to match the character drawer.',
      },
    ],
  },
  {
    date: '2026-05-08',
    version: '1.3.0',
    changes: [
      {
        category: 'feature',
        text: 'Users can now toggle between "card view" and "list view" display modes',
      },
      {
        category: 'fix',
        text: 'Display mule income as post-cap income instead of full potential income',
      },
      {
        category: 'feature',
        text: 'Users can now save and load custom boss presets. Transfer codes prior to this update will no longer work. Please generate a new transfer code',
        boldText:
          'Transfer codes prior to this update will no longer work. Please generate a new transfer code',
      },
    ],
  },
  {
    date: '2026-05-05',
    version: '1.2.0',
    changes: [
      {
        category: 'ui',
        text: 'Hide opposite cadence cells when a filter is selected (e.g. hide weekly cells when daily filter selected)',
      },
      { category: 'ui', text: 'Hide Extreme difficulty when daily filter is selected' },
      {
        category: 'fix',
        text: 'Restore the browser tab title when navigating away from the changelog page',
      },
      { category: 'ui', text: 'Add "Home" navitem for narrow screen nav drawer' },
      {
        category: 'feature',
        text: 'Users can now import/export their data via Settings > Data Management',
      },
      { category: 'feature', text: 'Users can now add notes for each mule in the details drawer' },
      { category: 'ui', text: 'Re-position density toggle' },
      { category: 'ui', text: 'Re-position world select dropdown' },
    ],
  },
  {
    date: '2026-05-03',
    version: '1.1.0',
    changes: [
      {
        category: 'feature',
        text: 'Enforce weekly crystal cap to calculate top 180 crystal prices only',
      },
      {
        category: 'feature',
        text: 'Drop lowest value bosses to retain 180 cap. Shows info tooltip next to mule income if dropped',
      },
      {
        category: 'fix',
        text: 'Restore sticky boss-difficulty header on the matrix at normal drawer widths',
      },
    ],
  },
  {
    date: '2026-04-29',
    version: '1.0.0',
    headline: 'Client-side routing arrives, plus a dedicated changelog page',
    changes: [{ category: 'feature', text: 'Initial release' }],
  },
];
