import { afterEach, describe, expect, it, vi } from "vitest";
import { lookupStockQuotes, stockLookupSchema } from "./stock-lookup.server";

afterEach(() => vi.unstubAllGlobals());
describe("assistant stock quotes", () => {
  it("looks up off-portfolio NSE and US symbols with actual provider prices and quote time", async () => {
    const fetcher = vi.fn().mockImplementation(
      async (url: string) =>
        new Response(
          JSON.stringify({
            chart: {
              result: [
                {
                  meta: {
                    symbol: url.includes("AAPL") ? "AAPL" : "BRITANNIA.NS",
                    regularMarketPrice: url.includes("AAPL") ? 210.25 : 4537.9,
                    regularMarketTime: 1792752001,
                    currency: url.includes("AAPL") ? "USD" : "INR",
                    exchangeName: "TEST",
                  },
                },
              ],
            },
          }),
          { status: 200 },
        ),
    );
    vi.stubGlobal("fetch", fetcher);
    const result = await lookupStockQuotes(["BRITANNIA", "US:AAPL"]);
    expect(result.quotes.map((q) => q.price)).toEqual([4537.9, 210.25]);
    expect(result.quotes.map((q) => q.currency)).toEqual(["INR", "USD"]);
    expect(result.quotes[0]?.quotedAt).toBe(new Date(1792752001000).toISOString());
    expect(String(fetcher.mock.calls[0]?.[0])).toContain("BRITANNIA.NS");
    expect(String(fetcher.mock.calls[1]?.[0])).toContain("/AAPL?");
  });
  it("returns no made-up price when the provider fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Unavailable", { status: 404 })));
    const result = await lookupStockQuotes(["NOEXIST"]);
    expect(result.quotes).toEqual([]);
    expect(result.unavailable).toEqual(["NOEXIST"]);
  });
  it("rejects invalid symbols and limits each quote call to six", () => {
    expect(stockLookupSchema.safeParse({ symbols: ["../../secrets"] }).success).toBe(false);
    expect(stockLookupSchema.safeParse({ symbols: Array(7).fill("BRITANNIA") }).success).toBe(
      false,
    );
    expect(
      stockLookupSchema.safeParse({ symbols: ["US:AAPL", "BRITANNIA", "500112.BO"] }).success,
    ).toBe(true);
  });
  it("does not disguise missing provider timestamps as current", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              chart: {
                result: [
                  { meta: { symbol: "IDEA.NS", regularMarketPrice: 8.25, currency: "INR" } },
                ],
              },
            }),
          ),
        ),
    );
    const result = await lookupStockQuotes(["IDEA"]);
    expect(result.quotes[0]?.quotedAt).toBeNull();
    expect(result.quotes[0]?.price).toBe(8.25);
  });
});
