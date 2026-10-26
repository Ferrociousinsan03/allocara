import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptyAnalysis } from "@/engine/investor";

const fixture = vi.hoisted(() => ({ state: {}, graphs: [] as { measure: string; first: number | null; second: number | null }[][] }));
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ data }: { data: { measure: string; first: number | null; second: number | null }[] }) => { fixture.graphs.push(data); return null; },
  Bar: () => null, CartesianGrid: () => null, Tooltip: () => null, XAxis: () => null, YAxis: () => null, ReferenceLine: () => null,
}));
vi.mock("@/components/analyser/state", () => ({ useAnalyser: () => fixture }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (config: unknown) => ({ options: config }),
  Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));
import { Route } from "./analyze.compare";

const Component = Route.options.component;
function openComparison() {
  if (!Component) throw new Error("Missing comparison screen");
  return render(<Component />);
}
beforeEach(() => {
  fixture.graphs = [];
  fixture.state = { ...emptyAnalysis(), activeId: "one", portfolios: [
    { id: "one", name: "Stocks", holdings: [
      { id: "a", name: "Reliance", asset: "LC", currentValue: 1500, investedAmount: 1000, units: 2 },
      { id: "b", name: "TCS", asset: "LC", currentValue: 4500, investedAmount: 5000, units: 3 },
      { id: "c", name: "Infosys", asset: "LC", currentValue: 3000, investedAmount: 2000, units: 2 },
    ] },
    { id: "two", name: "Savings", holdings: [
      { id: "d", name: "Deposit", asset: "CA", currentValue: 10000, investedAmount: 10000, units: 0 },
    ] },
  ] };
});
describe("comparison selection flow", () => {
  it("graphs recorded values and signed returns for the selected holdings", () => {
    openComparison();
    expect(fixture.graphs.slice(-3)).toEqual([
      [{ measure: "Invested", first: 1000, second: 5000 }, { measure: "Current value", first: 1500, second: 4500 }],
      [{ measure: "Gain / loss", first: 500, second: -500 }],
      [{ measure: "Return", first: 50, second: -10 }],
    ]);
    fireEvent.change(screen.getByLabelText("Compare holding"), { target: { value: "c" } });
    expect(fixture.graphs.slice(-3)).toEqual([
      [{ measure: "Invested", first: 2000, second: 5000 }, { measure: "Current value", first: 3000, second: 4500 }],
      [{ measure: "Gain / loss", first: 1000, second: -500 }],
      [{ measure: "Return", first: 50, second: -10 }],
    ]);
  });
  it("changes the chosen holding and reads back its recorded amount", () => {
    openComparison();
    fireEvent.change(screen.getByLabelText("Compare holding"), { target: { value: "c" } });
    const row = screen.getByText("Current holding value").closest("tr");
    expect(row?.textContent).toContain("3,000");
    expect(row?.textContent).toContain("4,500");
  });
  it("requires another holding, not another portfolio, after switching to a single-holding portfolio", () => {
    openComparison();
    fireEvent.change(screen.getByLabelText("Portfolio", { exact: true }), { target: { value: "two" } });
    expect(screen.queryByLabelText("Compare holding")).toBeNull();
    expect(screen.queryByText("Current holding value")).toBeNull();
    expect(screen.getByText(/This portfolio has 1 holding/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Portfolio", { exact: true }), { target: { value: "one" } });
    expect(screen.getByLabelText("Compare holding")).toHaveValue("a");
    expect(screen.getByLabelText("Against holding")).toHaveValue("b");
  });
});