import { describe, expect, it } from "vitest";
import { seriesFreshness, mergeSeries, parsePriceCsv, seriesReturn } from "./price-upload";

describe("price upload", () => {
  it("parses symbol columns and sorts months", () => {
    const s = parsePriceCsv("date,RELIANCE\n2024-02,110\n2024-01,100\n");
    expect(s[0]).toEqual({ symbol: "RELIANCE", dates: ["2024-01", "2024-02"], closes: [100, 110] });
  });
  it("rejects non-positive prices", () => {
    expect(() => parsePriceCsv("date,TCS\n2024-01,100\n2024-02,-5\n")).toThrow();
  });
  it("uploaded prices override fetched ones for the same month", () => {
    const m = mergeSeries([{ symbol: "TCS", dates: ["2024-01-01", "2024-02-01"], closes: [100, 120] }], [{ symbol: "TCS", dates: ["2024-02", "2024-03"], closes: [130, 140] }]);
    expect(m[0]!.closes).toEqual([100, 130, 140]);
  });
  it("computes yearly growth over 12 months", () => {
    const closes = Array.from({ length: 13 }, (_, i) => (i === 12 ? 110 : 100));
    const r = seriesReturn({ symbol: "X", dates: closes.map((_, i) => String(i)), closes });
    expect(r!.cagr).toBeCloseTo(0.1, 6);
  });
  it("lists missing months between first and last", () => {
    const f = seriesFreshness({ symbol: "X", dates: ["2024-11", "2025-02"], closes: [1, 2] });
    expect(f).toEqual({ first: "2024-11", last: "2025-02", missing: ["2024-12", "2025-01"] });
  });
});
