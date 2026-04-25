import { describe, expect, it } from 'vitest';
import { handleLookup } from '../worker';

/**
 * Boundary tests for the slice-1 stub. The Worker has no external
 * dependencies (no Nexon adapter yet, no cache), so a plain `Request` /
 * `Response` round-trip is enough.
 */

function get(path: string): Request {
  return new Request(`http://example.com${path}`);
}

describe('stub Worker — GET /api/character/:name', () => {
  it('returns 200 with a hardcoded payload for a regular name', async () => {
    const res = await handleLookup(get('/api/character/Alice?worldId=heroic-kronos'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.name).toBe('Alice');
    expect(body.worldId).toBe('heroic-kronos');
    expect(typeof body.level).toBe('number');
    expect(typeof body.className).toBe('string');
    expect(typeof body.avatarUrl).toBe('string');
    expect(typeof body.fetchedAt).toBe('string');
  });

  it('returns 404 for the `notfound` sentinel name', async () => {
    const res = await handleLookup(get('/api/character/notfound?worldId=heroic-kronos'));
    expect(res.status).toBe(404);
  });

  it('treats the sentinel case-insensitively', async () => {
    const res = await handleLookup(get('/api/character/NotFound?worldId=heroic-kronos'));
    expect(res.status).toBe(404);
  });

  it('returns 400 for a missing worldId', async () => {
    const res = await handleLookup(get('/api/character/Alice'));
    expect(res.status).toBe(400);
  });

  it('returns 400 for an unrecognized worldId', async () => {
    const res = await handleLookup(get('/api/character/Alice?worldId=not-a-world'));
    expect(res.status).toBe(400);
  });

  it('returns 404 for a non-character route', async () => {
    const res = await handleLookup(get('/api/something-else'));
    expect(res.status).toBe(404);
  });

  it('accepts every canonical WorldId', async () => {
    const ids = [
      'heroic-kronos',
      'heroic-hyperion',
      'heroic-solis',
      'heroic-challenger',
      'interactive-scania',
      'interactive-bera',
      'interactive-luna',
      'interactive-challenger',
    ];
    for (const worldId of ids) {
      const res = await handleLookup(get(`/api/character/Alice?worldId=${worldId}`));
      expect(res.status).toBe(200);
    }
  });
});
