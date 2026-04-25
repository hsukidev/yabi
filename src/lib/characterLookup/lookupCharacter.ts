import type { WorldId } from '../../data/worlds';

/**
 * Frontend lookup library — the SPA's narrow seam over the Worker's
 * `GET /api/character/:name?worldId=<WorldId>` endpoint. Callers never
 * touch raw HTTP status codes; they pattern-match on the discriminated
 * union returned here.
 *
 * The four "real" variants (`success`, `not-found`, `upstream-failed`,
 * `network-error`) are the branches the toast layer renders. `aborted`
 * is a fifth variant the hook layer uses to skip toast/state updates
 * after the user closed the drawer mid-flight.
 */

export interface CharacterLookupSuccess {
  name: string;
  level: number;
  className: string;
  avatarUrl: string;
  worldId: WorldId;
  fetchedAt: string;
}

export type CharacterLookupResult =
  | { kind: 'success'; data: CharacterLookupSuccess }
  | { kind: 'not-found' }
  | { kind: 'upstream-failed' }
  | { kind: 'network-error' }
  | { kind: 'aborted' };

interface LookupArgs {
  name: string;
  worldId: WorldId;
  signal?: AbortSignal;
}

export async function lookupCharacter(args: LookupArgs): Promise<CharacterLookupResult> {
  const url = `/api/character/${encodeURIComponent(args.name)}?worldId=${args.worldId}`;
  let response: Response;
  try {
    response = await fetch(url, { signal: args.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return { kind: 'aborted' };
    return { kind: 'network-error' };
  }

  if (response.status === 404) return { kind: 'not-found' };
  if (!response.ok) return { kind: 'upstream-failed' };

  try {
    const data = (await response.json()) as CharacterLookupSuccess;
    return { kind: 'success', data };
  } catch {
    return { kind: 'network-error' };
  }
}
