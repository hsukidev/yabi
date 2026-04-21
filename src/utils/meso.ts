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
