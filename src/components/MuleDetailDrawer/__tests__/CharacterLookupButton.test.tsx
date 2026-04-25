import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/test-utils';
import { CharacterLookupButton } from '../CharacterLookupButton';
import type { Mule } from '../../../types';

const ORIGINAL_FETCH = globalThis.fetch;

const baseMule: Mule = {
  id: 'm1',
  name: 'Alice',
  level: 200,
  muleClass: 'Hero',
  selectedBosses: [],
  active: true,
  worldId: 'heroic-kronos',
};

beforeEach(() => {
  globalThis.fetch = vi.fn() as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
});

describe('CharacterLookupButton — disabled rules', () => {
  it('disables when the draft name is empty', () => {
    render(<CharacterLookupButton mule={baseMule} draftName="" onUpdate={vi.fn()} />);
    const btn = screen.getByTestId('character-lookup-button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('disables when the draft name is whitespace-only', () => {
    render(<CharacterLookupButton mule={baseMule} draftName="   " onUpdate={vi.fn()} />);
    const btn = screen.getByTestId('character-lookup-button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('disables when the mule has no worldId', () => {
    const mule = { ...baseMule, worldId: undefined };
    render(<CharacterLookupButton mule={mule} draftName="Alice" onUpdate={vi.fn()} />);
    const btn = screen.getByTestId('character-lookup-button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('disables when the mule is on a Heroic Challenger World', () => {
    const mule = { ...baseMule, worldId: 'heroic-challenger' as const };
    render(<CharacterLookupButton mule={mule} draftName="Alice" onUpdate={vi.fn()} />);
    const btn = screen.getByTestId('character-lookup-button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('disables when the mule is on an Interactive Challenger World', () => {
    const mule = { ...baseMule, worldId: 'interactive-challenger' as const };
    render(<CharacterLookupButton mule={mule} draftName="Alice" onUpdate={vi.fn()} />);
    const btn = screen.getByTestId('character-lookup-button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('enables when draft name is non-empty and worldId is a non-CW world', () => {
    render(<CharacterLookupButton mule={baseMule} draftName="Alice" onUpdate={vi.fn()} />);
    const btn = screen.getByTestId('character-lookup-button') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });
});

describe('CharacterLookupButton — click behavior', () => {
  it('calls onUpdate with name/class/level/avatarUrl on success', async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            name: 'Alice',
            level: 250,
            className: 'Bishop',
            avatarUrl: 'https://msavatar1.nexon.net/Character/x.png',
            worldId: 'heroic-kronos',
            fetchedAt: 'now',
          }),
          { status: 200 },
        ),
    ) as unknown as typeof fetch;

    const onUpdate = vi.fn();
    render(<CharacterLookupButton mule={baseMule} draftName="Alice" onUpdate={onUpdate} />);
    fireEvent.click(screen.getByTestId('character-lookup-button'));

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith('m1', {
        name: 'Alice',
        level: 250,
        muleClass: 'Bishop',
        avatarUrl: 'https://msavatar1.nexon.net/Character/x.png',
      });
    });
  });

  it('does NOT call onUpdate when the lookup returns 404 (not-found)', async () => {
    globalThis.fetch = vi.fn(
      async () => new Response(null, { status: 404 }),
    ) as unknown as typeof fetch;
    const onUpdate = vi.fn();
    render(<CharacterLookupButton mule={baseMule} draftName="notfound" onUpdate={onUpdate} />);
    fireEvent.click(screen.getByTestId('character-lookup-button'));
    await waitFor(() => {
      expect(globalThis.fetch as unknown as ReturnType<typeof vi.fn>).toHaveBeenCalled();
    });
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('does NOT call onUpdate when the lookup returns 502 (upstream-failed)', async () => {
    globalThis.fetch = vi.fn(
      async () => new Response(null, { status: 502 }),
    ) as unknown as typeof fetch;
    const onUpdate = vi.fn();
    render(<CharacterLookupButton mule={baseMule} draftName="Alice" onUpdate={onUpdate} />);
    fireEvent.click(screen.getByTestId('character-lookup-button'));
    await waitFor(() => {
      expect(globalThis.fetch as unknown as ReturnType<typeof vi.fn>).toHaveBeenCalled();
    });
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('does NOT call onUpdate on a network failure', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError('network failed');
    }) as unknown as typeof fetch;
    const onUpdate = vi.fn();
    render(<CharacterLookupButton mule={baseMule} draftName="Alice" onUpdate={onUpdate} />);
    fireEvent.click(screen.getByTestId('character-lookup-button'));
    await waitFor(() => {
      expect(globalThis.fetch as unknown as ReturnType<typeof vi.fn>).toHaveBeenCalled();
    });
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('does NOT call onUpdate when the component unmounts mid-flight', async () => {
    let resolveFetch: (response: Response) => void = () => {};
    globalThis.fetch = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    ) as unknown as typeof fetch;
    const onUpdate = vi.fn();
    const { unmount } = render(
      <CharacterLookupButton mule={baseMule} draftName="Alice" onUpdate={onUpdate} />,
    );
    fireEvent.click(screen.getByTestId('character-lookup-button'));
    unmount();
    resolveFetch(
      new Response(
        JSON.stringify({
          name: 'Alice',
          level: 250,
          className: 'Bishop',
          avatarUrl: 'x',
          worldId: 'heroic-kronos',
          fetchedAt: 'now',
        }),
        { status: 200 },
      ),
    );
    await new Promise((r) => setTimeout(r, 0));
    expect(onUpdate).not.toHaveBeenCalled();
  });
});
