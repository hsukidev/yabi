import type { Region } from './worlds';

export type ExternalTrackerId = 'mapleranks' | 'maplebot' | 'maplehub';

export interface ExternalTracker {
  id: ExternalTrackerId;
  name: string;
  domain: string;
  profileUrl: (encodedName: string, region: Region) => string;
}

export const DEFAULT_TRACKER: ExternalTrackerId = 'mapleranks';

export const EXTERNAL_TRACKERS: readonly ExternalTracker[] = [
  {
    id: 'mapleranks',
    name: 'MapleRanks',
    domain: 'mapleranks.com',
    profileUrl: (name, region) =>
      region === 'EU' ? `https://mapleranks.com/u/eu/${name}` : `https://mapleranks.com/u/${name}`,
  },
  {
    id: 'maplebot',
    name: 'MapleBot',
    domain: 'maplebot.io',
    profileUrl: (name, region) => `https://maplebot.io/character/${name}?region=${region}`,
  },
  {
    id: 'maplehub',
    name: 'MapleHub',
    domain: 'maplehub.app',
    profileUrl: (name, region) => `https://maplehub.app/roster/${region.toLowerCase()}/${name}`,
  },
];

const trackerById = new Map(EXTERNAL_TRACKERS.map((tracker) => [tracker.id, tracker]));

export function isExternalTrackerId(value: unknown): value is ExternalTrackerId {
  return typeof value === 'string' && trackerById.has(value as ExternalTrackerId);
}

export function getExternalTracker(id: ExternalTrackerId): ExternalTracker {
  return trackerById.get(id)!;
}
