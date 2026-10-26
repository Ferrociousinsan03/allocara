import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { emptyAnalysis } from "@/engine/investor";
const fixture = vi.hoisted(() => ({ state: {} as Record<string, unknown>, prices: [] as { symbol: string; dates: string[]; closes: number[] }[], request: vi.fn() }));
vi.mock("@/components/analyser/state", () => ({ useAnalyser: () => ({ state: fixture.state, uploadedPrices: fixture.prices, uploadedPricesName: "Entered prices" }) }));
vi.mock("@/components/AccountProvider", () => ({ useAccount: () => ({ user: { id: "owner" } }) }));
vi.mock("@/lib/quotes.functions", () => ({ getMonthlyHistory: vi.fn() }));
vi.mock("@/lib/risk-insights.functions", () => ({ riskInsights: {} }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: () => fixture.request }));
vi.mock("@tanstack/react-query", () => ({ useQuery: () => ({ data: [], isLoading: false, isFetching: false, refetch: vi.fn() }) }));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => ({ options }), Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }));
import { Route } from "./analyze.risk-map";
function open() { const Component = Route.options.component; if (!Component) throw new Error("Missing risk screen"); return render(<Component />); }
beforeEach(() => {
  fixture.request.mockReset();
  fixture.state = { ...emptyAnalysis(), portfolios: [{ id: "p", name: "Entered portfolio", holdings: [{ id: "h", symbol: "RELIANCE", name: "Reliance", asset: "LC", currentValue: 60000, investedAmount: 50000, units: 20 }] }], activeId: "p" };
  let price = 100;
  fixture.prices = [{ symbol: "RELIANCE", dates: Array.from({ length: 121 }, (_, i) => `${2015 + Math.floor(i / 12)}-${String(i % 12 + 1).padStart(2, "0")}`), closes: Array.from({ length: 121 }, (_, i) => { price *= i % 2 ? 1.04 : 0.95; return price; }) }];
});
it("sends measured user stock data to separate normal and crisis AI reviews", async () => {
  fixture.request.mockResolvedValue({ text: "Measured volatility is concentrated in this stock.", reason: null });
  open();
  const buttons = screen.getAllByRole("button", { name: "Refresh AI insights" });
  fireEvent.click(buttons[0] as HTMLElement);
  await waitFor(() => expect(fixture.request).toHaveBeenCalledWith({ data: expect.objectContaining({ period: "normal", months: 120, rows: [{ symbol: "RELIANCE", moneyPercent: 100, riskPercent: 100 }] }) }));
  fireEvent.click(buttons[1] as HTMLElement);
  await waitFor(() => expect(fixture.request).toHaveBeenCalledWith({ data: expect.objectContaining({ period: "crisis", months: 12 }) }));
});
it("does not offer an AI estimate without actual history", () => {
  fixture.prices = [];
  open();
  screen.getAllByRole("button", { name: "Refresh AI insights" }).forEach(button => expect(button).toBeDisabled());
  expect(fixture.request).not.toHaveBeenCalled();
});