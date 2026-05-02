export type Release = {
  date: string;
  version: string;
  headline?: string;
  changes: string[];
};

export const releases: Release[] = [
  {
    date: '2026-04-29',
    version: '1.0.0',
    headline: 'Client-side routing arrives, plus a dedicated changelog page',
    changes: ['Initial release'],
  },
];
