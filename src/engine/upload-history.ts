import Papa from "papaparse";
import { ASSET_IDS } from "./assets";
import type { MonthlyHistory } from "./history";
import type { MonthlyRow } from "./risk";

/** User histories follow the same decimal-return format as bundled history. */
export function validateHistoryCsv(text: string): MonthlyHistory {
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, ""), { header: true, skipEmptyLines: "greedy", transformHeader: (h) => h.trim() });
  if (parsed.errors.length) throw new Error("The CSV has malformed rows or duplicate columns.");
  const fields = parsed.meta.fields ?? [];
  if (!fields.includes("date") || !ASSET_IDS.some((id) => fields.includes(id))) throw new Error("Include a date column and at least one asset column: LC, MC, GS, CB, GD, CA, US, LK.");
  if (fields.some((f) => f !== "date" && !ASSET_IDS.some((id) => id === f))) throw new Error("Unrecognised column. Use the sample CSV column names.");
  if (parsed.data.length < 12) throw new Error("Include at least 12 monthly rows.");
  const dates: string[] = [];
  const rows: MonthlyRow[] = [];
  for (const record of parsed.data) {
    const date = (record['date'] ?? '').trim();
    if (!/^\d{4}-(0[1-9]|1[0-2])(?:-01)?$/.test(date)) throw new Error("Dates must be YYYY-MM or YYYY-MM-01.");
    const month = date.slice(0, 7);
    const previous = dates.at(-1);
    if (previous && month <= previous.slice(0, 7)) throw new Error("Use unique months in oldest-to-newest order.");
    const row: MonthlyRow = {};
    for (const id of ASSET_IDS) {
      const raw = (record[id] ?? '').trim();
      if (!raw) { row[id] = null; continue; }
      const value = Number(raw);
      if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw) || !Number.isFinite(value) || value < -1) throw new Error("Returns must be decimals (0.02 means 2%), not percentages; losses cannot exceed 100%.");
      row[id] = value;
    }
    if (!ASSET_IDS.some((id) => typeof row[id] === 'number')) throw new Error("Every month needs at least one return.");
    dates.push(`${month}-01`); rows.push(row);
  }
  return { dates, rows };
}