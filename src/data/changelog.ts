export type Release = {
  date: string;
  version: string;
  headline?: string;
  changes: string[];
};

export const releases: Release[] = [
  {
    date: '2026-05-03',
    version: '1.1.0',
    changes: [
      'Enforce weekly crystal cap to calculate top 180 crystal prices',
      'Mule info icon displays dropped bosses (lowest value bosses dropped to retain 180 cap)',
      'Restore sticky boss-difficulty header on the matrix at normal drawer widths',
    ],
  },
  {
    date: '2026-04-29',
    version: '1.0.0',
    headline: 'Client-side routing arrives, plus a dedicated changelog page',
    changes: ['Initial release'],
  },
];
