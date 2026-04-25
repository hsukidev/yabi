/**
 * Character-lookup Worker. Slice 2 swaps the slice-1 stub for the real
 * Nexon adapter wired up to the Cloudflare Cache API. The Worker exposes:
 *
 *   GET /api/character/:name?worldId=<HeroicWorldId>
 *
 * For Heroic worlds (Kronos, Hyperion, Solis) it calls the upstream
 * ranking endpoint via `nexonAdapter.fetchByName`, filters `ranks[]` by
 * the expected numeric `worldID`, and returns the matching rank reshaped
 * into the documented response contract. Successful responses cache for
 * ~6h; 404s cache for ~1h. Interactive worlds and Challenger Worlds are
 * out of scope for slice 2 and respond with 400.
 *
 * The handler is exported with an injectable `HandlerDeps` parameter so
 * the test suite can drive it with a stubbed adapter and an in-memory
 * cache shim — production callers receive `caches.default` and the real
 * adapter via the defaults below.
 */

import { fetchByName as defaultFetchByName, UpstreamError } from './nexonAdapter';
import { fromUpstreamKey, isHeroicWorldId, toUpstreamKey, type HeroicWorldId } from './worldIdMap';

const SUCCESS_TTL_SECONDS = 21600; // 6 hours
const NOT_FOUND_TTL_SECONDS = 3600; // 1 hour

interface CharacterLookupResponse {
  name: string;
  level: number;
  className: string;
  avatarUrl: string;
  worldId: HeroicWorldId;
  fetchedAt: string;
}

export interface HandlerDeps {
  /** Cloudflare Cache instance; defaults to `caches.default` when present. */
  cache?: Cache;
  /** Adapter swap point for tests. */
  fetchByName?: typeof defaultFetchByName;
}

function jsonResponse(status: number, body: unknown, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

function defaultCache(): Cache | undefined {
  // `caches.default` is Cloudflare-specific; in Node tests `caches` is
  // undefined, in which case the handler simply skips the cache layer.
  const c = (globalThis as { caches?: CacheStorage }).caches;
  return c && 'default' in c ? (c as unknown as { default: Cache }).default : undefined;
}

export async function handleLookup(request: Request, deps: HandlerDeps = {}): Promise<Response> {
  const url = new URL(request.url);

  const routeMatch = url.pathname.match(/^\/api\/character\/([^/]+)\/?$/);
  if (!routeMatch) {
    return jsonResponse(404, { error: 'not-found', message: 'route not found' });
  }
  const name = decodeURIComponent(routeMatch[1]);
  const worldId = url.searchParams.get('worldId') ?? '';

  if (!isHeroicWorldId(worldId)) {
    return jsonResponse(400, {
      error: 'invalid-world',
      message: 'unknown or out-of-scope worldId',
    });
  }

  const cache = deps.cache ?? defaultCache();
  const adapter = deps.fetchByName ?? defaultFetchByName;

  // Cache check — keyed on the request URL, which already encodes
  // (name, worldId). Hit short-circuits before we touch upstream.
  if (cache) {
    const cached = await cache.match(request);
    if (cached) return cached;
  }

  try {
    const { rebootIndex, worldID: expectedWorldID } = toUpstreamKey(worldId);
    const ranks = await adapter(name, rebootIndex);
    const rank = ranks.find((r) => r.worldID === expectedWorldID);

    if (!rank) {
      const res = jsonResponse(
        404,
        { error: 'not-found', message: 'character not found on this world' },
        { 'cache-control': `public, max-age=${NOT_FOUND_TTL_SECONDS}` },
      );
      if (cache) await cache.put(request, res.clone());
      return res;
    }

    // Sanity-check: confirm the matched rank's worldID maps back to the
    // requested WorldId. Catches an accidental id collision in the World
    // ID map (the round-trip is also pinned in worldIdMap.test.ts).
    if (fromUpstreamKey(rebootIndex, rank.worldID) !== worldId) {
      return jsonResponse(502, {
        error: 'upstream-mismatch',
        message: 'worldID disagreed with map',
      });
    }

    const body: CharacterLookupResponse = {
      name: rank.characterName,
      level: rank.level,
      className: rank.jobName,
      avatarUrl: rank.characterImgURL,
      worldId,
      fetchedAt: new Date().toISOString(),
    };
    const res = jsonResponse(200, body, {
      'cache-control': `public, max-age=${SUCCESS_TTL_SECONDS}`,
    });
    if (cache) await cache.put(request, res.clone());
    return res;
  } catch (err) {
    // Intentionally do NOT cache 502s — transient upstream failures should
    // not poison subsequent requests.
    const message = err instanceof UpstreamError ? err.message : 'upstream error';
    return jsonResponse(502, { error: 'upstream-failed', message });
  }
}

export default {
  fetch(request: Request): Promise<Response> {
    return handleLookup(request);
  },
};
