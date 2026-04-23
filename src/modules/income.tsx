import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { MuleBossSlate } from '../data/muleBossSlate';
import { formatMeso } from '../utils/meso';

/**
 * An **Income Source** — anything whose **Raw Income** is the cadence-weighted
 * sum of its **Slate Keys**. Today that's a **Mule** (`active` is the
 * **Active Flag**), but the interface is deliberately narrower than `Mule` so
 * non-mule sources (e.g. a hypothetical linked character) can slot in without
 * churn.
 */
export interface IncomeSource {
  selectedBosses: string[];
  active?: boolean;
  partySizes?: Record<string, number>;
}

/**
 * Immutable **Potential Income** value — per-mule or across a roster, carrying
 * the current **Format Preference** for lazy rendering. Construct only via
 * `Income.of`; the constructor is private on purpose.
 */
// eslint-disable-next-line react-refresh/only-export-components
export class Income {
  readonly raw: number;
  private readonly abbr: boolean;

  private constructor(raw: number, abbr: boolean) {
    this.raw = raw;
    this.abbr = abbr;
  }

  /**
   * Aggregate one or more **Income Sources** into an `Income`.
   *
   * - Per-mule arithmetic is delegated to
   *   `MuleBossSlate.from(source.selectedBosses).totalCrystalValue`; this
   *   module owns aggregation, not crystal summation.
   * - For a roster, the **Active-Flag Filter** excludes sources with
   *   `active === false` and includes `active === true` / `active === undefined`.
   */
  static of(source: IncomeSource | IncomeSource[], abbreviated: boolean): Income {
    const sources = Array.isArray(source) ? source : [source];
    let raw = 0;
    for (const s of sources) {
      if (s.active === false) continue;
      raw += MuleBossSlate.from(s.selectedBosses).totalCrystalValue(s.partySizes);
    }
    return new Income(raw, abbreviated);
  }

  /** Rendered `raw` in the active **Format Preference**. Lazy — not precomputed. */
  get formatted(): string {
    return formatMeso(this.raw, this.abbr);
  }

  toString(): string {
    return this.formatted;
  }
}

interface IncomeContextValue {
  abbreviated: boolean;
  toggle: () => void;
}

// Private to this module on purpose: slice 1 keeps the new module standalone
// so slice 2 can migrate call sites in a single atomic pass.
const IncomeContext = createContext<IncomeContextValue | undefined>(undefined);

/**
 * Holds the global **Format Preference** state and exposes a toggle to every
 * `useIncome` consumer inside the tree. Defaults to abbreviated.
 */
export function IncomeProvider({
  children,
  defaultAbbreviated = true,
}: {
  children: ReactNode;
  defaultAbbreviated?: boolean;
}) {
  const [abbreviated, setAbbreviated] = useState(defaultAbbreviated);
  const toggle = useCallback(() => setAbbreviated((a) => !a), []);
  const value = useMemo(() => ({ abbreviated, toggle }), [abbreviated, toggle]);
  return <IncomeContext.Provider value={value}>{children}</IncomeContext.Provider>;
}

function useIncomeContext(): IncomeContextValue {
  const ctx = useContext(IncomeContext);
  if (!ctx) {
    throw new Error('useIncome must be used within an IncomeProvider');
  }
  return ctx;
}

type UseIncomeResult = Income & { abbreviated: boolean; toggle: () => void };

/**
 * Read **Potential Income** for a single **Mule**, a roster, or nothing (for
 * toggle-only consumers). The returned object carries the current
 * **Format Preference** and the `toggle` callback, so the typical
 * KPI/toggle-button pattern needs only one hook call.
 *
 * The underlying `Income` is memoized by `selectedBosses` identity + active
 * flags + **Format Preference** so callers get a stable reference across
 * re-renders with unchanged inputs.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useIncome(source?: IncomeSource | IncomeSource[]): UseIncomeResult {
  const { abbreviated, toggle } = useIncomeContext();
  return useMemo(
    () => Object.assign(Income.of(source ?? [], abbreviated), { abbreviated, toggle }),
    [source, abbreviated, toggle],
  );
}

/**
 * **Auto-Fullformat-On-Zero Rule** — if `raw === 0` while abbreviated, flip
 * the global **Format Preference** to full once so a dead roster renders as
 * `0` instead of `0B`. No-op otherwise. Idempotent across re-renders of the
 * same zero+abbreviated state.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useAutoFullFormatOnZero(raw: number): void {
  const { abbreviated, toggle } = useIncomeContext();
  const firedRef = useRef(false);
  useEffect(() => {
    if (raw === 0 && abbreviated) {
      if (!firedRef.current) {
        firedRef.current = true;
        toggle();
      }
    } else {
      firedRef.current = false;
    }
  }, [raw, abbreviated, toggle]);
}
