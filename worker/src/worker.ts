/**
 * Character-lookup Worker. Exposes:
 *
 *   GET /api/character/:name?worldId=<SupportedWorldId>
 *
 * For each supported world it looks up the world's `(region, rebootIndex,
 * worldID)` triple via `worldIdMap.toUpstreamKey`, calls the upstream
 * ranking endpoint via `nexonAdapter.fetchByName` against the matching
 * regional datacenter (NA or EU), filters `ranks[]` by the expected
 * numeric `worldID`, and returns the matching rank reshaped into the
 * documented response contract. Successful responses cache for ~6h;
 * 404s cache for ~1h. Unknown / unsupported worldIds respond 400.
 *
 * The handler is exported with an injectable `HandlerDeps` parameter so
 * the test suite can drive it with a stubbed adapter and an in-memory
 * cache shim — production callers receive `caches.default` and the real
 * adapter via the defaults below.
 */

import { fetchByName as defaultFetchByName, UpstreamError } from './nexonAdapter';
import {
  fromUpstreamKey,
  isSupportedWorldId,
  toUpstreamKey,
  type SupportedWorldId,
} from './worldIdMap';

const SUCCESS_TTL_SECONDS = 21600; // 6 hours
const NOT_FOUND_TTL_SECONDS = 3600; // 1 hour
const INVALID_NAME_TTL_SECONDS = 3600; // 1 hour

// MapleStory NA character names: 2–13 ASCII alphanumeric chars. Validating
// here short-circuits guaranteed-miss requests before they reach Nexon and
// caps log/cache pollution from random-Unicode flooding.
const VALID_NAME = /^[A-Za-z0-9]{2,13}$/;

interface CharacterLookupResponse {
  name: string;
  level: number;
  className: string;
  avatarUrl: string;
  worldId: SupportedWorldId;
  fetchedAt: string;
}

export interface HandlerDeps {
  /** Cloudflare Cache instance; defaults to `caches.default` when present. */
  cache?: Cache;
  /** Adapter swap point for tests. */
  fetchByName?: typeof defaultFetchByName;
  /**
   * Shared secret expected on `x-proxy-auth`. When set, requests without a
   * matching header are rejected with 404 (chosen over 401 to avoid
   * confirming the route exists to a probing attacker). When undefined the
   * gate is disabled — production code paths always set it; tests opt in
   * only when exercising the gate.
   */
  proxySecret?: string;
}

export interface Env {
  PROXY_SECRET: string;
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
  // Shared-secret gate: if the deployment configured a secret, require a
  // matching header. Returning 404 (not 401) hides the existence of the
  // route from anyone hitting *.workers.dev directly.
  if (deps.proxySecret) {
    if (request.headers.get('x-proxy-auth') !== deps.proxySecret) {
      console.log(JSON.stringify({ event: 'proxy-auth-fail' }));
      return jsonResponse(404, { error: 'not-found', message: 'route not found' });
    }
  }

  const url = new URL(request.url);

  const routeMatch = url.pathname.match(/^\/api\/character\/([^/]+)\/?$/);
  if (!routeMatch) {
    return jsonResponse(404, { error: 'not-found', message: 'route not found' });
  }
  const name = decodeURIComponent(routeMatch[1]);
  const worldId = url.searchParams.get('worldId') ?? '';

  if (!isSupportedWorldId(worldId)) {
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

  // Validate name shape after the cache check so repeat invalid requests
  // are served from cache without re-running validation. The 400 itself is
  // cached for an hour so a name-flooder pays one Worker invocation per
  // unique malformed name, never an upstream call.
  if (!VALID_NAME.test(name)) {
    // Truncate name in logs — full attacker-controlled names risk log
    // injection / disk fill if Nexon-side bounds are wider than ours.
    console.log(JSON.stringify({ event: 'invalid-name', name: name.slice(0, 20) }));
    const res = jsonResponse(
      400,
      { error: 'invalid-name', message: 'name must be 2–13 alphanumeric chars' },
      { 'cache-control': `public, max-age=${INVALID_NAME_TTL_SECONDS}` },
    );
    if (cache) await cache.put(request, res.clone());
    return res;
  }

  try {
    const { region, rebootIndex, worldID: expectedWorldID } = toUpstreamKey(worldId);
    const ranks = await adapter(name, region, rebootIndex);
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
    if (fromUpstreamKey(region, rebootIndex, rank.worldID) !== worldId) {
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
    const status = err instanceof UpstreamError ? err.status : undefined;
    console.log(JSON.stringify({ event: 'upstream-failed', status, message }));
    return jsonResponse(502, { error: 'upstream-failed', message });
  }
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    // Fail-loud if the secret was forgotten — better a visible 503 in logs
    // than a silently-open Worker.
    if (!env.PROXY_SECRET) {
      console.error(JSON.stringify({ event: 'proxy-secret-missing' }));
      return Promise.resolve(
        jsonResponse(503, { error: 'misconfigured', message: 'service unavailable' }),
      );
    }
    return handleLookup(request, { proxySecret: env.PROXY_SECRET });
  },
};
