import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { lookupCharacter } from '../lookupCharacter';

/**
 * Boundary tests for the `lookupCharacter` library — the SPA's narrow
 * seam over `fetch('/api/character/...')`. Each test stubs
 * `globalThis.fetch` and asserts the discriminated union narrows
 * correctly so consumer code (the hook + button) is type-safe.
 *
 * The four union variants — `success`, `not-found`, `upstream-failed`,
 * `network-error` — are the exact branches the toast layer renders, so
 * keeping the narrowing tight here keeps the UI honest.
 */

const ORIGINAL_FETCH = globalThis.fetch;

function stubFetch(impl: typeof fetch) {
  globalThis.fetch = impl as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
});

beforeEach(() => {
  globalThis.fetch = vi.fn() as unknown as typeof fetch;
});

describe('lookupCharacter', () => {
  it('returns a `success` variant on HTTP 200', async () => {
    stubFetch(
      async () =>
        new Response(
          JSON.stringify({
            name: 'Alice',
            level: 250,
            className: 'Bishop',
            avatarUrl: 'https://msavatar1.nexon.net/Character/x.png',
            worldId: 'heroic-kronos',
            fetchedAt: '2026-04-25T00:00:00Z',
          }),
          { status: 200 },
        ),
    );

    const result = await lookupCharacter({ name: 'Alice', worldId: 'heroic-kronos' });
    expect(result.kind).toBe('success');
    if (result.kind !== 'success') throw new Error('expected success');
    expect(result.data.name).toBe('Alice');
    expect(result.data.level).toBe(250);
    expect(result.data.className).toBe('Bishop');
    expect(result.data.avatarUrl).toBe('https://msavatar1.nexon.net/Character/x.png');
  });

  it('returns a `not-found` variant on HTTP 404', async () => {
    stubFetch(async () => new Response(null, { status: 404 }));
    const result = await lookupCharacter({ name: 'notfound', worldId: 'heroic-kronos' });
    expect(result.kind).toBe('not-found');
  });

  it('returns an `upstream-failed` variant on HTTP 502', async () => {
    stubFetch(async () => new Response(null, { status: 502 }));
    const result = await lookupCharacter({ name: 'Alice', worldId: 'heroic-kronos' });
    expect(result.kind).toBe('upstream-failed');
  });

  it('returns an `upstream-failed` variant on HTTP 500', async () => {
    stubFetch(async () => new Response(null, { status: 500 }));
    const result = await lookupCharacter({ name: 'Alice', worldId: 'heroic-kronos' });
    expect(result.kind).toBe('upstream-failed');
  });

  it('returns a `network-error` variant when fetch throws', async () => {
    stubFetch(async () => {
      throw new TypeError('network failed');
    });
    const result = await lookupCharacter({ name: 'Alice', worldId: 'heroic-kronos' });
    expect(result.kind).toBe('network-error');
  });

  it('returns a `network-error` variant when the JSON body is malformed on 200', async () => {
    stubFetch(async () => new Response('not json', { status: 200 }));
    const result = await lookupCharacter({ name: 'Alice', worldId: 'heroic-kronos' });
    expect(result.kind).toBe('network-error');
  });

  it('URL-encodes the character name and includes worldId as a query param', async () => {
    const fetchSpy = vi.fn<typeof fetch>(
      async () =>
        new Response(
          JSON.stringify({
            name: 'A B',
            level: 200,
            className: 'Hero',
            avatarUrl: 'x',
            worldId: 'heroic-kronos',
            fetchedAt: 'now',
          }),
          { status: 200 },
        ),
    );
    globalThis.fetch = fetchSpy;

    await lookupCharacter({ name: 'A B', worldId: 'heroic-kronos' });
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toBe('/api/character/A%20B?worldId=heroic-kronos');
  });

  it('threads an AbortSignal through to fetch', async () => {
    const fetchSpy = vi.fn<typeof fetch>(
      async () =>
        new Response(
          JSON.stringify({
            name: 'A',
            level: 1,
            className: 'X',
            avatarUrl: 'y',
            worldId: 'heroic-kronos',
            fetchedAt: 'z',
          }),
          { status: 200 },
        ),
    );
    globalThis.fetch = fetchSpy;
    const controller = new AbortController();
    await lookupCharacter({ name: 'A', worldId: 'heroic-kronos', signal: controller.signal });
    const init = fetchSpy.mock.calls[0][1] as RequestInit | undefined;
    expect(init?.signal).toBe(controller.signal);
  });

  it('surfaces an AbortError when the signal is aborted mid-flight', async () => {
    stubFetch(async () => {
      const err = new Error('aborted');
      err.name = 'AbortError';
      throw err;
    });
    const controller = new AbortController();
    controller.abort();
    const result = await lookupCharacter({
      name: 'A',
      worldId: 'heroic-kronos',
      signal: controller.signal,
    });
    expect(result.kind).toBe('aborted');
  });
});
