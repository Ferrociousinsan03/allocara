import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { ASSETS } from "@/engine/assets";
import { emptyAnalysis } from "@/engine/investor";
import { ZERO_SCENARIO } from "@/engine/core";
const fixture = vi.hoisted(() => ({ state: {} as Record<string, unknown>, stockReturnOverrides: {}, request: vi.fn() }));
vi.mock("@/components/analyser/state", () => ({ useAnalyser: () => ({ ...fixture, assets: ASSETS, scenario: ZERO_SCENARIO }) }));
vi.mock("@/components/AccountProvider", () => ({ useAccount: () => ({ user: { id: "owner" } }) }));
vi.mock("@/lib/overview-insights.functions", () => ({ overviewInsights: {} }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: () => fixture.request }));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => ({ options }), Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }));
import { Route } from "./analyze.overview";
const holding = { id: "h1", symbol: "RELIANCE", name: "Reliance Industries", asset: "LC" as const, currentValue: 100000, units: 40, investedAmount: 60000 };
function open() { const Component = Route.options.component; if (!Component) throw new Error("Missing Overview"); return render(<Component />); }
beforeEach(() => {
  fixture.request.mockReset();
  fixture.state = { ...emptyAnalysis(), value: 999999, cashNeed: 20000, portfolios: [{ id: "p1", name: "Entered portfolio", holdings: [holding] }], activeId: "p1" };
});
it("uses the selected holdings instead of stale aggregated account values", () => {
  open();
  expect(screen.getByText("Value after this what-if").parentElement?.textContent).toContain("₹1 lakh");
  expect(screen.getByText("Portfolio remaining").parentElement?.textContent).toContain("₹80,000");
});
it("passes only recorded stock facts and calculated cash shortfall to AI", async () => {
  fixture.request.mockResolvedValue({ insights: [{ id: "h1", risk: "Position exposure matters.", tradeoff: "Cash is different from a gain.", adding: "Check filings before increasing exposure." }], reason: null });
  open(); fireEvent.click(screen.getByRole("button", { name: "Review with AI" }));
  await waitFor(() => expect(fixture.request).toHaveBeenCalledWith({ data: { holdings: [{ id: "h1", symbol: "RELIANCE", value: 100000, cost: 60000, gain: 40000, sharePercent: 100, scenarioChange: 0 }], cashNeed: 20000, shortfall: 0, comfortPercent: 0 } }));
  expect(await screen.findByText("Position exposure matters.")).toBeInTheDocument();
});
it("discards displayed AI results when holding values change", async () => {
  fixture.request.mockResolvedValue({ insights: [{ id: "h1", risk: "Previous exposure.", tradeoff: "Trade-off.", adding: "Research." }], reason: null });
  const view = open(); fireEvent.click(screen.getByRole("button", { name: "Review with AI" }));
  await screen.findByText("Previous exposure.");
  fixture.state = { ...fixture.state, portfolios: [{ id: "p1", name: "Entered portfolio", holdings: [{ ...holding, currentValue: 120000 }] }] };
  const Component = Route.options.component; if (!Component) throw new Error("Missing Overview"); view.rerender(<Component />);
  expect(screen.queryByText("Previous exposure.")).toBeNull();
  expect(screen.getByText("Value after this what-if").parentElement?.textContent).toContain("₹1.2 lakh");
});