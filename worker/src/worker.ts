/**
 * Stubbed character-lookup Worker — slice 1's tracer-bullet stand-in for the
 * real Nexon adapter that lands in slice 2. The contract here is the same
 * one the real Worker will expose:
 *
 *   GET /api/character/:name?worldId=<WorldId>
 *
 * with 200 = found, 404 = not found, 400 = invalid worldId. The stub
 * returns a deterministic hardcoded payload for any name except the
 * sentinel `notfound`, which 404s. This lets the SPA exercise the entire
 * lookup → toast → onUpdate path end-to-end before the upstream contract
 * is wired up.
 *
 * The handler is exported separately from the default `fetch` export so
 * the test suite can drive it with a plain `Request` without spinning up
 * Miniflare.
 */

const VALID_WORLD_IDS = new Set<string>([
  'heroic-kronos',
  'heroic-hyperion',
  'heroic-solis',
  'heroic-challenger',
  'interactive-scania',
  'interactive-bera',
  'interactive-luna',
  'interactive-challenger',
]);

/** Sentinel name that always 404s; tests and manual demos use this. */
const NOT_FOUND_SENTINEL = 'notfound';

interface CharacterLookupResponse {
  name: string;
  level: number;
  className: string;
  avatarUrl: string;
  worldId: string;
  fetchedAt: string;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export async function handleLookup(request: Request): Promise<Response> {
  const url = new URL(request.url);

  // Match `/api/character/:name`. Anything else is a 404 (the Worker only
  // exposes this single endpoint).
  const match = url.pathname.match(/^\/api\/character\/([^/]+)\/?$/);
  if (!match) {
    return jsonResponse(404, { error: 'not-found', message: 'route not found' });
  }
  const name = decodeURIComponent(match[1]);
  const worldId = url.searchParams.get('worldId') ?? '';

  if (!VALID_WORLD_IDS.has(worldId)) {
    return jsonResponse(400, { error: 'invalid-world', message: 'unknown worldId' });
  }

  if (name.toLowerCase() === NOT_FOUND_SENTINEL) {
    return jsonResponse(404, { error: 'not-found', message: 'character not found' });
  }

  const body: CharacterLookupResponse = {
    name,
    level: 250,
    className: 'Bishop',
    avatarUrl: `https://msavatar1.nexon.net/Character/stub/${encodeURIComponent(name)}.png`,
    worldId,
    fetchedAt: new Date().toISOString(),
  };
  return jsonResponse(200, body);
}

export default {
  fetch(request: Request): Promise<Response> {
    return handleLookup(request);
  },
};
