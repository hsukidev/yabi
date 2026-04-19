export function sanitizeMuleName(raw: string): string {
  return raw.replace(/[^A-Za-z]/g, '').slice(0, 12)
}
