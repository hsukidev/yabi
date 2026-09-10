import type { Region } from './worlds';

export type ExternalTrackerId = 'mapleranks' | 'maplebot' | 'maplehub';

export interface ExternalTracker {
  id: ExternalTrackerId;
  name: string;
  domain: string;
}

export const DEFAULT_TRACKER: ExternalTrackerId = 'mapleranks';

export const EXTERNAL_TRACKERS: readonly ExternalTracker[] = [
  {
    id: 'mapleranks',
    name: 'MapleRanks',
    domain: 'mapleranks.com',
  },
  {
    id: 'maplebot',
    name: 'MapleBot',
    domain: 'maplebot.io',
  },
  {
    id: 'maplehub',
    name: 'MapleHub',
    domain: 'maplehub.app',
  },
];

const profileUrlBuilders: Record<
  ExternalTrackerId,
  (encodedName: string, region: Region) => string
> = {
  mapleranks: (name, region) =>
    region === 'EU' ? `https://mapleranks.com/u/eu/${name}` : `https://mapleranks.com/u/${name}`,
  maplebot: (name, region) => `https://maplebot.io/character/${name}?region=${region}`,
  maplehub: (name, region) => `https://maplehub.app/roster/${region.toLowerCase()}/${name}`,
};

const trackerById = new Map(EXTERNAL_TRACKERS.map((tracker) => [tracker.id, tracker]));

export function isExternalTrackerId(value: unknown): value is ExternalTrackerId {
  return typeof value === 'string' && trackerById.has(value as ExternalTrackerId);
}

export function getExternalTracker(id: ExternalTrackerId): ExternalTracker {
  return trackerById.get(id)!;
}

export function buildTrackerProfileUrl(
  id: ExternalTrackerId,
  savedName: string,
  region: Region,
): string {
  return profileUrlBuilders[id](encodeURIComponent(savedName.trim()), region);
}
