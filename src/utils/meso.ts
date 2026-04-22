export function formatMeso(value: number, abbreviated: boolean = true): string {
  if (!abbreviated) {
    return value.toLocaleString('en-US');
  }

  if (value >= 1_000_000_000) {
    const billions = value / 1_000_000_000;
    const formatted =
      billions % 1 === 0 ? billions.toFixed(0) : billions.toFixed(2).replace(/\.?0+$/, '');
    return `${formatted}B`;
  }

  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    const formatted =
      millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(2).replace(/\.?0+$/, '');
    return `${formatted}M`;
  }

  if (value >= 1_000) {
    const thousands = value / 1_000;
    const formatted =
      thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(2).replace(/\.?0+$/, '');
    return `${formatted}K`;
  }

  return value.toLocaleString('en-US');
}

/**
 * Compact, no-decimal variant for contexts where horizontal space is tight —
 * e.g. narrow Matrix cells where "1.2M x 7" would wrap. Always abbreviates to
 * K/M/B and rounds to the nearest whole unit.
 */
export function formatMesoCompact(value: number): string {
  if (value >= 1_000_000_000) return `${Math.round(value / 1_000_000_000)}B`;
  if (value >= 1_000_000) return `${Math.round(value / 1_000_000)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return value.toLocaleString('en-US');
}
