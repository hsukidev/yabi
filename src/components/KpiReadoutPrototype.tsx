/**
 * PROTOTYPE — throwaway code. Question (wayfinder ticket #297): how do the
 * KPI progress readouts actually read — "X / expected" in the two income
 * blocks, "x / total" in the WEEKLY / DAILY / MONTHLY crystal tiles?
 *
 * Three presentation variants on the existing "/" KPI card, switchable via
 * ?variant= (a|b|c) or the floating bottom bar (← / → keys cycle):
 *
 *  - A "Inline slash":  X big accent, "/ expected" muted on the same
 *    baseline; tiles read "12/34" with a muted denominator.
 *  - B "Progress bar":  X big, thin fill bar underneath with expected
 *    right-aligned; tiles get a mini bar under the number.
 *  - C "Stacked":       X big, "OF {expected}" eyebrow beneath plus a %
 *    chip; tiles show x big with a small "/34" and dim the tile at 0%.
 *
 * X values are LIVE from the in-memory marks store (kebab / drawer panel),
 * per the decided semantics: split by cadence, active mules only. The math
 * here is a pre-Cap-Cut approximation clamped to the displayed totals —
 * good enough to judge presentation, not the real aggregator.
 * Dev builds only; gated off under vitest.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Mule } from '../types';
import { MuleBossSlate } from '../data/muleBossSlate';
import { resolveWorldGroup } from '../data/worlds';
import { formatMeso } from '../utils/meso';
import { useMarksVersion, getMarks } from './RosterItem/CardMenuPrototype';

export const KPI_READOUT_VARIANTS = ['a', 'b', 'c'] as const;
export type KpiReadoutVariant = (typeof KPI_READOUT_VARIANTS)[number];

const VARIANT_NAMES: Record<KpiReadoutVariant, string> = {
  a: 'Inline slash',
  b: 'Progress bar',
  c: 'Stacked + % chip',
};

/* ── Variant context + floating switcher ───────────────────────────────── */

const VariantContext = createContext<KpiReadoutVariant | null>(null);

export function useKpiReadoutVariant(): KpiReadoutVariant | null {
  return useContext(VariantContext);
}

function initialVariant(): KpiReadoutVariant {
  if (typeof window === 'undefined') return 'a';
  const v = new URLSearchParams(window.location.search).get('variant');
  return (KPI_READOUT_VARIANTS as readonly string[]).includes(v ?? '')
    ? (v as KpiReadoutVariant)
    : 'a';
}

export function KpiReadoutPrototypeProvider({ children }: { children: React.ReactNode }) {
  const [variant, setVariant] = useState<KpiReadoutVariant>(initialVariant);

  const cycle = useCallback((dir: 1 | -1) => {
    setVariant((cur) => {
      const idx = KPI_READOUT_VARIANTS.indexOf(cur);
      const next =
        KPI_READOUT_VARIANTS[
          (idx + dir + KPI_READOUT_VARIANTS.length) % KPI_READOUT_VARIANTS.length
        ];
      const url = new URL(window.location.href);
      url.searchParams.set('variant', next);
      window.history.replaceState(null, '', url);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV || import.meta.env.MODE === 'test') return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      cycle(e.key === 'ArrowRight' ? 1 : -1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cycle]);

  if (!import.meta.env.DEV || import.meta.env.MODE === 'test') return <>{children}</>;

  return (
    <VariantContext.Provider value={variant}>
      {children}
      <div
        style={{
          position: 'fixed',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 14px',
          borderRadius: 999,
          background: '#111',
          color: '#fff',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
          fontFamily: 'Geist Mono, monospace',
          fontSize: 12,
        }}
      >
        <button
          onClick={() => cycle(-1)}
          aria-label="Previous variant"
          style={{ cursor: 'pointer', background: 'none', border: 0, color: '#fff', fontSize: 14 }}
        >
          ←
        </button>
        <span style={{ whiteSpace: 'nowrap' }}>
          {variant.toUpperCase()} — {VARIANT_NAMES[variant]}
        </span>
        <button
          onClick={() => cycle(1)}
          aria-label="Next variant"
          style={{ cursor: 'pointer', background: 'none', border: 0, color: '#fff', fontSize: 14 }}
        >
          →
        </button>
      </div>
    </VariantContext.Provider>
  );
}

/* ── Live marked aggregates (pre-Cap-Cut approximation) ─────────────────── */

export interface MarkedAggregates {
  weeklyX: number; // meso: weekly-marked weekly portion + daily-marked ×7 portion
  bmX: number; // meso: bm-marked monthlyCrystalValue
  weeklyTileX: number; // slots: weekly slots of weekly-marked mules
  dailyTileX: number; // slots: daily slots of daily-marked mules
  monthlyTileX: number; // keys: monthly keys of bm-marked mules
}

export function useMarkedAggregates(mules: Mule[]): MarkedAggregates {
  const version = useMarksVersion();
  return useMemo(() => {
    const agg: MarkedAggregates = {
      weeklyX: 0,
      bmX: 0,
      weeklyTileX: 0,
      dailyTileX: 0,
      monthlyTileX: 0,
    };
    for (const mule of mules) {
      if (mule.active === false) continue;
      const marks = getMarks(mule.id);
      if (!marks.weekly && !marks.daily && !marks.bm) continue;
      const slate = MuleBossSlate.from(mule.selectedBosses, resolveWorldGroup(mule.worldId));
      if (marks.weekly || marks.daily) {
        for (const slot of slate.slots(mule.partySizes)) {
          if (slot.cadence === 'weekly' && marks.weekly) {
            agg.weeklyX += slot.value;
            agg.weeklyTileX += 1;
          } else if (slot.cadence === 'daily' && marks.daily) {
            agg.weeklyX += slot.value;
            agg.dailyTileX += 1;
          }
        }
      }
      if (marks.bm) {
        agg.bmX += slate.monthlyCrystalValue(mule.partySizes);
        agg.monthlyTileX += slate.monthlyCount;
      }
    }
    return agg;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- version is the store snapshot key
  }, [mules, version]);
}

/* ── Income block readout ───────────────────────────────────────────────── */

const MUTED = 'var(--muted-raw, var(--muted-foreground))';
const ACCENT = 'var(--accent-raw, var(--accent))';
// Zero-state numerator: softened foreground — between the tile numbers'
// full text tone and the muted denominator. Exported so the drawer's income
// pills can render their 0 in the same tone.
export const ZERO_X =
  'color-mix(in srgb, var(--text, var(--foreground)) 65%, var(--muted-raw, var(--muted-foreground)))';

export function ProtoIncomeReadout({
  x,
  expected,
  narrow,
  label,
}: {
  x: number;
  expected: number;
  narrow: boolean;
  label: string;
}) {
  const variant = useKpiReadoutVariant();
  const clampedX = Math.min(x, expected);
  const pct = expected > 0 ? clampedX / expected : 0;
  const xStr = formatMeso(clampedX, true, narrow);
  const expStr = formatMeso(expected, true, narrow);
  const aria = `${label}: ${xStr} of ${expStr}`;

  if (variant === 'b') {
    return (
      <div aria-label={aria} style={{ width: '100%', minWidth: 0 }}>
        <span className="bignum" style={{ color: pct > 0 ? ACCENT : ZERO_X }}>
          {xStr}
        </span>
        <div
          style={{
            marginTop: 8,
            height: 4,
            borderRadius: 2,
            background: 'color-mix(in srgb, var(--border) 70%, transparent)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${Math.round(pct * 100)}%`,
              height: '100%',
              borderRadius: 2,
              background: ACCENT,
              transition: 'width 300ms ease-out',
            }}
          />
        </div>
        <div
          style={{
            marginTop: 5,
            display: 'flex',
            justifyContent: 'flex-end',
            fontFamily: 'Geist Mono, monospace',
            fontSize: 11,
            letterSpacing: '0.08em',
            color: MUTED,
          }}
        >
          {expStr} EXPECTED
        </div>
      </div>
    );
  }

  if (variant === 'c') {
    return (
      <div aria-label={aria} style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0 }}>
          <span className="bignum" style={{ color: pct > 0 ? ACCENT : ZERO_X }}>
            {xStr}
          </span>
          <span
            style={{
              fontFamily: 'Geist Mono, monospace',
              fontSize: 12,
              padding: '2px 7px',
              borderRadius: 999,
              border: '1px solid var(--border)',
              background: 'var(--surface-2, var(--surface-raised))',
              color: pct >= 1 ? ACCENT : MUTED,
              whiteSpace: 'nowrap',
            }}
          >
            {Math.round(pct * 100)}%
          </span>
        </div>
        <div
          className="eyebrow-plain"
          style={{ marginTop: 6, opacity: 0.75, letterSpacing: '0.14em' }}
        >
          OF {expStr} EXPECTED
        </div>
      </div>
    );
  }

  // Variant A — inline slash (default)
  return (
    <span
      aria-label={aria}
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 6,
        minWidth: 0,
        whiteSpace: 'nowrap',
      }}
    >
      <span className="bignum" style={{ color: pct > 0 ? ACCENT : ZERO_X }}>
        {xStr}
      </span>
      <span
        style={{
          fontFamily: 'Geist Mono, monospace',
          fontSize: 18,
          color: MUTED,
        }}
      >
        / {expStr}
      </span>
    </span>
  );
}

/* ── Crystal tile readout ───────────────────────────────────────────────── */

export function ProtoTileValue({ x, total }: { x: number; total: number }) {
  const variant = useKpiReadoutVariant();
  const clampedX = Math.min(x, total);
  const pct = total > 0 ? clampedX / total : 0;

  if (variant === 'b') {
    return (
      <div>
        <span style={{ color: pct > 0 ? ACCENT : ZERO_X }}>
          {clampedX}
        </span>
        <span style={{ color: MUTED }}>/{total}</span>
        <div
          style={{
            marginTop: 6,
            height: 3,
            borderRadius: 2,
            background: 'color-mix(in srgb, var(--border) 70%, transparent)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${Math.round(pct * 100)}%`,
              height: '100%',
              background: ACCENT,
              transition: 'width 300ms ease-out',
            }}
          />
        </div>
      </div>
    );
  }

  if (variant === 'c') {
    return (
      <span style={{ opacity: total > 0 && clampedX === 0 ? 0.55 : 1 }}>
        <span style={{ color: pct > 0 ? ACCENT : ZERO_X }}>
          {clampedX}
        </span>
        <span style={{ color: MUTED, fontSize: 16, marginLeft: 2 }}>/{total}</span>
      </span>
    );
  }

  // Variant A — "x/total" with the denominator stepped down, echoing the
  // income block's smaller "/ expected"
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 3 }}>
      <span style={{ color: pct > 0 ? ACCENT : ZERO_X }}>{clampedX}</span>
      <span style={{ color: MUTED, fontSize: 16 }}>/ {total}</span>
    </span>
  );
}
