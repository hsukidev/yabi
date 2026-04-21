export function describeArc(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
): string {
  const RAD = Math.PI / 180;
  const pt = (r: number, a: number) =>
    [cx + r * Math.cos(-a * RAD), cy + r * Math.sin(-a * RAD)] as const;
  const span = Math.abs(endAngle - startAngle);

  // SVG can't draw an arc to the same point, so a full circle collapses to
  // nothing. Split at the midpoint so each sub-arc has distinct endpoints.
  if (span >= 360) {
    const mid = startAngle + (endAngle - startAngle) / 2;
    const [osx, osy] = pt(outerRadius, startAngle);
    const [omx, omy] = pt(outerRadius, mid);
    if (innerRadius > 0) {
      const [isx, isy] = pt(innerRadius, startAngle);
      const [imx, imy] = pt(innerRadius, mid);
      return [
        `M ${osx} ${osy}`,
        `A ${outerRadius} ${outerRadius} 0 0 0 ${omx} ${omy}`,
        `A ${outerRadius} ${outerRadius} 0 0 0 ${osx} ${osy}`,
        `L ${isx} ${isy}`,
        `A ${innerRadius} ${innerRadius} 0 0 1 ${imx} ${imy}`,
        `A ${innerRadius} ${innerRadius} 0 0 1 ${isx} ${isy}`,
        'Z',
      ].join(' ');
    }
    return [
      `M ${cx} ${cy}`,
      `L ${osx} ${osy}`,
      `A ${outerRadius} ${outerRadius} 0 0 0 ${omx} ${omy}`,
      `A ${outerRadius} ${outerRadius} 0 0 0 ${osx} ${osy}`,
      'Z',
    ].join(' ');
  }

  const largeArc = span > 180 ? 1 : 0;
  const [osx, osy] = pt(outerRadius, startAngle);
  const [oex, oey] = pt(outerRadius, endAngle);

  if (innerRadius > 0) {
    const [isx, isy] = pt(innerRadius, endAngle);
    const [iex, iey] = pt(innerRadius, startAngle);
    return [
      `M ${osx} ${osy}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArc} 0 ${oex} ${oey}`,
      `L ${isx} ${isy}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 1 ${iex} ${iey}`,
      'Z',
    ].join(' ');
  }
  return [
    `M ${cx} ${cy}`,
    `L ${osx} ${osy}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 0 ${oex} ${oey}`,
    'Z',
  ].join(' ');
}

/**
 * Center-of-pie percentage label. Hovered slice → its share of the total;
 * no hover → "100.0%" (the donut as a whole).
 */
export function formatCenterPercent(activeIndex: number | undefined, values: number[]): string {
  const total = values.reduce((sum, v) => sum + v, 0);
  if (activeIndex === undefined || activeIndex < 0 || activeIndex >= values.length || total <= 0) {
    return '100.0%';
  }
  return `${((values[activeIndex] / total) * 100).toFixed(1)}%`;
}

export function formatCompact(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return String(n);
}
