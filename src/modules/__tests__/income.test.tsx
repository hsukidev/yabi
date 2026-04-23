import { describe, expect, it, vi } from 'vitest';
import { act, render, renderHook, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Income, IncomeProvider, useAutoFullFormatOnZero, useIncome } from '../income';
import { MuleBossSlate } from '../../data/muleBossSlate';
import { bosses } from '../../data/bosses';

const LUCID = bosses.find((b) => b.family === 'lucid')!.id;
const WILL = bosses.find((b) => b.family === 'will')!.id;
const HARD_LUCID = `${LUCID}:hard:weekly`;
const HARD_WILL = `${WILL}:hard:weekly`;

const AbbrevOff = ({ children }: { children: ReactNode }) => (
  <IncomeProvider defaultAbbreviated={false}>{children}</IncomeProvider>
);

describe('Income.of', () => {
  it('delegates per-mule arithmetic to MuleBossSlate.totalCrystalValue', () => {
    const mule = { selectedBosses: [HARD_LUCID, HARD_WILL] };
    const expected = MuleBossSlate.from(mule.selectedBosses).totalCrystalValue();
    expect(Income.of(mule, true).raw).toBe(expected);
    expect(Income.of(mule, false).raw).toBe(expected);
  });

  it('threads partySizes through to the slate (weekly Computed Value halves at party 2)', () => {
    // Hard Lucid weekly @ 504M, Hard Will weekly @ 621.81M at party 1.
    // At party 2 on both families, each Computed Value halves.
    const mule = {
      selectedBosses: [HARD_LUCID, HARD_WILL],
      partySizes: { lucid: 2, will: 2 },
    };
    const full = MuleBossSlate.from(mule.selectedBosses).totalCrystalValue();
    expect(Income.of(mule, false).raw).toBe(full / 2);
  });

  it('formatted calls formatMeso with the abbreviation flag', () => {
    const mule = { selectedBosses: [HARD_LUCID, HARD_WILL] };
    expect(Income.of(mule, true).formatted).toBe('1.13B');
    expect(Income.of(mule, false).formatted).toBe('1,125,810,000');
  });

  it('applies the Active-Flag Filter to a roster (excludes active===false only)', () => {
    const mules = [
      { selectedBosses: [HARD_LUCID], active: true },
      { selectedBosses: [HARD_WILL], active: false },
      { selectedBosses: [HARD_WILL], active: undefined },
      { selectedBosses: [HARD_LUCID] },
    ];
    // active===false (HARD_WILL) excluded; the rest sum normally
    const expected =
      MuleBossSlate.from([HARD_LUCID]).totalCrystalValue() +
      MuleBossSlate.from([HARD_WILL]).totalCrystalValue() +
      MuleBossSlate.from([HARD_LUCID]).totalCrystalValue();
    expect(Income.of(mules, false).raw).toBe(expected);
  });

  it('returns raw 0 and formatted "0" for an empty roster in both modes', () => {
    expect(Income.of([], true).raw).toBe(0);
    expect(Income.of([], true).formatted).toBe('0');
    expect(Income.of([], false).raw).toBe(0);
    expect(Income.of([], false).formatted).toBe('0');
  });

  it('toString() equals formatted', () => {
    const mule = { selectedBosses: [HARD_LUCID] };
    const income = Income.of(mule, true);
    expect(income.toString()).toBe(income.formatted);
    expect(String(income)).toBe('504M');
  });

  it('formatted is lazy — consecutive reads both succeed and match formatMeso', () => {
    const income = Income.of({ selectedBosses: [HARD_LUCID] }, true);
    // Two consecutive reads should be equal; the getter pattern means we can
    // flip abbr internally only via a new instance, not via mutation.
    expect(income.formatted).toBe('504M');
    expect(income.formatted).toBe('504M');
  });

  it('rejects calling the constructor directly (compile-time only)', () => {
    // The private constructor is enforced by TS, not at runtime.
    // @ts-expect-error — private constructor should not be callable.
    const illegal = new Income(1, true);
    expect(illegal).toBeInstanceOf(Income);
  });
});

describe('IncomeProvider', () => {
  it('defaults Format Preference to true (abbreviated)', () => {
    function Consumer() {
      const { abbreviated } = useIncome();
      return <span data-testid="abbrev">{String(abbreviated)}</span>;
    }
    render(
      <IncomeProvider>
        <Consumer />
      </IncomeProvider>,
    );
    expect(screen.getByTestId('abbrev').textContent).toBe('true');
  });

  it('respects defaultAbbreviated={false}', () => {
    function Consumer() {
      const { abbreviated } = useIncome();
      return <span data-testid="abbrev">{String(abbreviated)}</span>;
    }
    render(
      <IncomeProvider defaultAbbreviated={false}>
        <Consumer />
      </IncomeProvider>,
    );
    expect(screen.getByTestId('abbrev').textContent).toBe('false');
  });
});

describe('useIncome', () => {
  it('throws when rendered outside an IncomeProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useIncome({ selectedBosses: [HARD_LUCID] }))).toThrow(
      /IncomeProvider/,
    );
    spy.mockRestore();
  });

  it('throws from the no-arg form too when outside IncomeProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useIncome())).toThrow(/IncomeProvider/);
    spy.mockRestore();
  });

  it('returns raw+formatted matching Income.of for a single mule', () => {
    const mule = { selectedBosses: [HARD_LUCID] };
    const { result } = renderHook(() => useIncome(mule), { wrapper: IncomeProvider });
    expect(result.current.raw).toBe(Income.of(mule, true).raw);
    expect(result.current.formatted).toBe('504M');
  });

  it('returns raw+formatted matching Income.of for a roster', () => {
    const mules = [{ selectedBosses: [HARD_LUCID] }, { selectedBosses: [HARD_WILL] }];
    const { result } = renderHook(() => useIncome(mules), { wrapper: IncomeProvider });
    expect(result.current.raw).toBe(Income.of(mules, true).raw);
    expect(result.current.formatted).toBe('1.13B');
  });

  it('respects the current Format Preference (full mode)', () => {
    const mule = { selectedBosses: [HARD_LUCID] };
    const { result } = renderHook(() => useIncome(mule), { wrapper: AbbrevOff });
    expect(result.current.formatted).toBe('504,000,000');
  });

  it('returns raw 0 + toggle when called with no argument', () => {
    const { result } = renderHook(() => useIncome(), { wrapper: IncomeProvider });
    expect(result.current.raw).toBe(0);
    expect(result.current.formatted).toBe('0');
    expect(result.current.abbreviated).toBe(true);
    expect(typeof result.current.toggle).toBe('function');
  });

  it('returns a stable Income reference across re-renders with unchanged input', () => {
    const mule = { selectedBosses: [HARD_LUCID] };
    const { result, rerender } = renderHook(({ m }) => useIncome(m), {
      wrapper: IncomeProvider,
      initialProps: { m: mule },
    });
    const first = result.current;
    rerender({ m: mule });
    expect(result.current).toBe(first);
  });

  it('re-derives when selectedBosses identity changes', () => {
    const first = { selectedBosses: [HARD_LUCID] };
    const second = { selectedBosses: [HARD_LUCID, HARD_WILL] };
    const { result, rerender } = renderHook(({ m }) => useIncome(m), {
      wrapper: IncomeProvider,
      initialProps: { m: first },
    });
    const before = result.current;
    rerender({ m: second });
    expect(result.current).not.toBe(before);
    expect(result.current.raw).toBe(Income.of(second, true).raw);
  });

  it('re-derives when Format Preference toggles', () => {
    const mule = { selectedBosses: [HARD_LUCID] };
    const { result } = renderHook(() => useIncome(mule), { wrapper: IncomeProvider });
    expect(result.current.formatted).toBe('504M');
    const before = result.current;
    act(() => {
      result.current.toggle();
    });
    expect(result.current).not.toBe(before);
    expect(result.current.abbreviated).toBe(false);
    expect(result.current.formatted).toBe('504,000,000');
  });
});

describe('useAutoFullFormatOnZero', () => {
  it('fires toggle exactly once when raw === 0 and abbreviated === true', () => {
    const { result } = renderHook(
      () => {
        const income = useIncome();
        useAutoFullFormatOnZero(0);
        return income;
      },
      { wrapper: IncomeProvider },
    );
    expect(result.current.abbreviated).toBe(false);
  });

  it('does not re-fire across re-renders with the same zero+abbreviated state', () => {
    // The effect must toggle only on the *first* render where raw===0 and
    // abbreviated===true. After that the state is abbreviated===false, and a
    // rerender at raw===0 must not flip us back to abbreviated and repeat.
    const { rerender, result } = renderHook(
      () => {
        const income = useIncome();
        useAutoFullFormatOnZero(0);
        return income;
      },
      { wrapper: IncomeProvider },
    );
    // First effect fired: we're now in full mode.
    expect(result.current.abbreviated).toBe(false);
    // Re-render with the same inputs — the effect must not flip us back.
    rerender();
    expect(result.current.abbreviated).toBe(false);
    rerender();
    expect(result.current.abbreviated).toBe(false);
  });

  it('no-ops when raw > 0', () => {
    const { result } = renderHook(
      () => {
        const income = useIncome();
        useAutoFullFormatOnZero(100);
        return income;
      },
      { wrapper: IncomeProvider },
    );
    expect(result.current.abbreviated).toBe(true);
  });

  it('no-ops when abbreviated === false', () => {
    const { result } = renderHook(
      () => {
        const income = useIncome();
        useAutoFullFormatOnZero(0);
        return income;
      },
      { wrapper: AbbrevOff },
    );
    expect(result.current.abbreviated).toBe(false);
  });

  it('re-arms after a non-trigger state, then fires once more on next zero', () => {
    // raw goes 0 -> 100 -> 0. First zero flips to full (no re-fire). We then
    // manually toggle back to abbreviated; the effect should fire again on
    // the next zero render to preserve the UX invariant "dead roster renders 0".
    const { result, rerender } = renderHook(
      ({ raw }: { raw: number }) => {
        const income = useIncome();
        useAutoFullFormatOnZero(raw);
        return income;
      },
      {
        wrapper: IncomeProvider,
        initialProps: { raw: 0 },
      },
    );
    expect(result.current.abbreviated).toBe(false);
    rerender({ raw: 100 });
    // Flip back to abbreviated manually to simulate the user re-engaging it.
    act(() => {
      result.current.toggle();
    });
    expect(result.current.abbreviated).toBe(true);
    rerender({ raw: 0 });
    expect(result.current.abbreviated).toBe(false);
  });
});
