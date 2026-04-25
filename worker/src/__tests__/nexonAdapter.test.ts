import { describe, expect, it, vi, afterEach } from 'vitest';
import { fetchByName, NEXON_RANKING_BASE_URL } from '../nexonAdapter';
import foundFixture from './fixtures/found.json';
import notFoundFixture from './fixtures/not-found.json';
import multiWorldFixture from './fixtures/multi-world.json';

/**
 * Adapter tests for the Nexon ranking endpoint. Each test stubs
 * `globalThis.fetch` and feeds the adapter a captured upstream payload —
 * the adapter has no other dependencies, so a plain fetch stub fully
 * exercises its contract.
 */

const ORIGINAL_FETCH = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
});

function stubFetchOnce(payload: unknown, status = 200): ReturnType<typeof vi.fn> {
  const fetchSpy = vi.fn(async () => new Response(JSON.stringify(payload), { status }));
  globalThis.fetch = fetchSpy as unknown as typeof fetch;
  return fetchSpy;
}

describe('nexonAdapter.fetchByName', () => {
  it('builds the verified upstream URL with the right query params', async () => {
    const fetchSpy = stubFetchOnce(foundFixture);
    await fetchByName('AliceK', 1);
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url.startsWith(NEXON_RANKING_BASE_URL)).toBe(true);
    const parsed = new URL(url);
    expect(parsed.searchParams.get('type')).toBe('overall');
    expect(parsed.searchParams.get('id')).toBe('weekly');
    expect(parsed.searchParams.get('reboot_index')).toBe('1');
    expect(parsed.searchParams.get('page_index')).toBe('1');
    expect(parsed.searchParams.get('character_name')).toBe('AliceK');
  });

  it('URL-encodes the character name', async () => {
    const fetchSpy = stubFetchOnce(foundFixture);
    await fetchByName('A B', 1);
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain('character_name=A+B');
  });

  it('returns the raw rank list from a found-character response', async () => {
    stubFetchOnce(foundFixture);
    const ranks = await fetchByName('AliceK', 1);
    expect(ranks).toHaveLength(1);
    expect(ranks[0].characterName).toBe('AliceK');
    expect(ranks[0].worldID).toBe(45);
    expect(ranks[0].level).toBe(286);
    expect(ranks[0].jobName).toBe('Bishop');
    expect(ranks[0].characterImgURL).toMatch(/^https:\/\/msavatar1\.nexon\.net\//);
  });

  it('returns an empty list for a not-found response', async () => {
    stubFetchOnce(notFoundFixture);
    const ranks = await fetchByName('Nobody', 1);
    expect(ranks).toEqual([]);
  });

  it('returns every entry in a multi-rank response so the caller can disambiguate by worldID', async () => {
    stubFetchOnce(multiWorldFixture);
    const ranks = await fetchByName('Echo', 1);
    expect(ranks).toHaveLength(3);
    expect(ranks.map((r) => r.worldID).sort()).toEqual([45, 46, 47]);
  });

  it('throws an UpstreamError when the API returns a non-2xx status', async () => {
    stubFetchOnce({}, 500);
    await expect(fetchByName('Alice', 1)).rejects.toMatchObject({
      name: 'UpstreamError',
      status: 500,
    });
  });

  it('throws an UpstreamError when the JSON body is malformed', async () => {
    globalThis.fetch = vi.fn(
      async () => new Response('not json', { status: 200 }),
    ) as unknown as typeof fetch;
    await expect(fetchByName('Alice', 1)).rejects.toMatchObject({ name: 'UpstreamError' });
  });

  it('throws an UpstreamError when fetch itself rejects (network failure)', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError('network down');
    }) as unknown as typeof fetch;
    await expect(fetchByName('Alice', 1)).rejects.toMatchObject({ name: 'UpstreamError' });
  });
});
