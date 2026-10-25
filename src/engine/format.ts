// Indian rupee formatting (lakh/crore) and percent vs percentage points.
export function formatINR(x: number, opts: { compact?: boolean } = {}): string {
  const sign = x < 0 ? "-" : "";
  const a = Math.abs(x);
  if (opts.compact !== false && a >= 1e7) return `${sign}₹${trim(a / 1e7)} crore`;
  if (opts.compact !== false && a >= 1e5) return `${sign}₹${trim(a / 1e5)} lakh`;
  return `${sign}₹${Math.round(a).toLocaleString("en-IN")}`;
}
const trim = (n: number) => (Math.round(n * 100) / 100).toString();

export const formatPct = (x: number, dp = 1) => `${(x * 100).toFixed(dp)}%`;
export const formatPP = (x: number, dp = 1) => `${x >= 0 ? "+" : ""}${(x * 100).toFixed(dp)} pts`;
