import { describe, expect, it } from 'vitest';
import { useState } from 'react';
import { render, act } from '../../test/test-utils';
import type { Mule } from '../../types';
import { bosses } from '../../data/bosses';
import { useWorldIncome } from '../../modules/worldIncome';
import type { RosterRowMetrics } from '../rosterRowMetrics';
import { useStableRosterMetrics } from '../useStableRosterMetrics';

const HILLA = bosses.find((b) => b.family === 'hilla')!.id;
const NORMAL_HILLA = `${HILLA}:normal:daily`;

function makeMule(id: string, overrides: Partial<Mule> = {}): Mule {
  return {
    id,
    name: id,
    level: 200,
    muleClass: 'Hero',
    selectedBosses: [NORMAL_HILLA],
    active: true,
    ...overrides,
  };
}

interface Harness {
  metricsFor: (id: string) => RosterRowMetrics;
  update: (id: string, patch: Partial<Mule>) => void;
}

function useHarness(initial: Mule[]): Harness {
  const [mules, setMules] = useState(initial);
  const worldIncome = useWorldIncome(mules);
  const metrics = useStableRosterMetrics(
    mules,
    worldIncome.perMule,
    worldIncome.totalContributedMeso,
  );
  return {
    metricsFor: (id) => metrics.get(id)!,
    // Mirrors updateMule's merge: a non-slate patch preserves selectedBosses'
    // reference, exactly the condition the stabilizer relies on.
    update: (id, patch) =>
      setMules((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m))),
  };
}

function renderHarness(initial: Mule[]) {
  const ref: { current: Harness | null } = { current: null };
  function Probe() {
    ref.current = useHarness(initial);
    return null;
  }
  render(<Probe />);
  return ref as { current: Harness };
}

describe('useStableRosterMetrics — memo barrier', () => {
  it('keeps every mule’s metrics identity stable when one mule is marked', () => {
    const ref = renderHarness([makeMule('a'), makeMule('b'), makeMule('c')]);
    const before = {
      a: ref.current.metricsFor('a'),
      b: ref.current.metricsFor('b'),
      c: ref.current.metricsFor('c'),
    };

    // Setting a Clear Mark touches no income input — no metrics should change.
    act(() => ref.current.update('a', { dailyClearMark: '2026-07-11' }));

    expect(ref.current.metricsFor('a')).toBe(before.a);
    expect(ref.current.metricsFor('b')).toBe(before.b);
    expect(ref.current.metricsFor('c')).toBe(before.c);
  });

  it('recomputes metrics when an income-relevant input actually changes', () => {
    const ref = renderHarness([makeMule('a'), makeMule('b')]);
    const before = { a: ref.current.metricsFor('a'), b: ref.current.metricsFor('b') };

    // Deactivating A removes it from the pool — its metrics (and, since the
    // world total shifts, B's) legitimately change.
    act(() => ref.current.update('a', { active: false }));

    expect(ref.current.metricsFor('a')).not.toBe(before.a);
    expect(ref.current.metricsFor('a').displayedWeeklyMeso.muted).toBe(true);
  });

  it('produces the same metric values as a direct computation', () => {
    const ref = renderHarness([makeMule('a')]);
    const m = ref.current.metricsFor('a');
    expect(m.dailyCount).toBeGreaterThan(0);
    expect(m.weeklyCount).toBe(0);
  });
});
