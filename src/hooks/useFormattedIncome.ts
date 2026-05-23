import { formatMeso } from '../utils/meso';

interface FormattedIncome {
  /** The meso amount in the app's standard abbreviated display format. */
  abbreviated: string;
  /** Full-precision meso, used only in non-zero tooltip text. */
  full: string;
}

export function useFormattedIncome(postCapMeso: number): FormattedIncome {
  return {
    abbreviated: formatMeso(postCapMeso, true),
    full: formatMeso(postCapMeso, false),
  };
}
