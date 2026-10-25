/** Explicit user-input calculations; none of these rates are forecasts or tax law. */
export function projectSavings(initial: number, monthly: number, years: number, annualReturn: number, stepUp = 0, fee = 0) {
  let value = initial, contributed = initial;
  const rows = [{ year: 0, value, contributed, growth: 0 }];
  const rate = Math.pow(1 + annualReturn - fee, 1 / 12) - 1;
  for (let year = 1; year <= years; year++) {
    const payment = monthly * Math.pow(1 + stepUp, year - 1);
    for (let month = 0; month < 12; month++) { value = value * (1 + rate) + payment; contributed += payment; }
    rows.push({ year, value, contributed, growth: value - contributed });
  }
  return { value, contributed, growth: value - contributed, rows };
}
export function capitalGains(proceeds: number, cost: number, expenses: number, exemption: number, rate: number) {
  const gain = proceeds - cost - expenses;
  const taxable = Math.max(0, gain - exemption);
  return { gain, taxable, tax: taxable * rate, netProceeds: proceeds - expenses - taxable * rate };
}
export function retirement(expenses: number, years: number, inflation: number, withdrawal: number, initial: number, monthly: number, rate: number) {
  const annualExpenses = expenses * 12 * Math.pow(1 + inflation, years);
  const target = annualExpenses / withdrawal;
  const projected = projectSavings(initial, monthly, years, rate).value;
  return { annualExpenses, target, projected, gap: Math.max(0, target - projected), coverage: target > 0 ? projected / target : null };
}
export function earlyWithdrawal(principal: number, months: number, originalRate: number, reducedRate: number, penalty: number) {
  const original = principal * (1 + originalRate * months / 12);
  const early = principal * (1 + reducedRate * months / 12) - penalty;
  return { original, early, cost: original - early };
}
export interface NavPoint { date: string; nav: number }
export function parseNav(text: string): NavPoint[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.shift()?.trim().toLowerCase() !== 'date,nav') throw new Error('Use date,nav as the header.');
  const rows = lines.filter(l => l.trim()).map(l => {
    const [date, raw] = l.split(','); const nav = Number(raw);
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date || !raw?.trim() || !(nav > 0)) throw new Error('Each row needs a valid YYYY-MM-DD date and positive NAV.');
    return { date, nav };
  }).sort((a, b) => a.date.localeCompare(b.date));
  if (rows.length < 2 || new Set(rows.map(r => r.date)).size !== rows.length) throw new Error('Provide at least two unique dates.');
  return rows;
}
export function rollingReturns(rows: NavPoint[], years: number) {
  return rows.flatMap(start => {
    const anniversary = new Date(start.date); anniversary.setUTCFullYear(anniversary.getUTCFullYear() + years);
    const end = rows.find(r => Date.parse(r.date) >= anniversary.getTime());
    if (!end) return [];
    const elapsed = (Date.parse(end.date) - Date.parse(start.date)) / (365.25 * 86400000);
    return [{ start: start.date, end: end.date, annualReturn: Math.pow(end.nav / start.nav, 1 / elapsed) - 1 }];
  });
}
export function companyMetrics(revenue: number, priorRevenue: number, profit: number, debt: number, equity: number, currentAssets: number, currentLiabilities: number, cashFlow: number) {
  return { revenueGrowth: priorRevenue > 0 ? revenue / priorRevenue - 1 : null, margin: revenue > 0 ? profit / revenue : null, debtEquity: equity > 0 ? debt / equity : null, currentRatio: currentLiabilities > 0 ? currentAssets / currentLiabilities : null, cashConversion: profit > 0 ? cashFlow / profit : null };
}
