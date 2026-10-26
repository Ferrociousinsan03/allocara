import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ASSETS, emptyWeights } from "@/engine/assets";
import { normaliseWeights } from "@/engine/core";
import { emptyAnalysis } from "@/engine/investor";

const fixture = vi.hoisted(() => ({
  state: {} as Record<string, unknown>,
  update: vi.fn(),
  scenario: null as unknown,
  weights: null as unknown,
  assets: null as unknown,
}));
vi.mock("@/components/analyser/state", () => ({ useAnalyser: () => fixture }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (config: unknown) => ({ options: config }),
  Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));
import { Route } from "./analyze.scenario-lab";

const Component = Route.options.component;
function open() {
  if (!Component) throw new Error("Missing scenario lab screen");
  return render(<Component />);
}

// One user-entered holding: 40 shares bought at ₹1,500, now worth ₹2,500 each.
const holding = { id: "h1", symbol: "RELIANCE", name: "Reliance Industries", asset: "LC" as const, currentValue: 100000, units: 40, investedAmount: 60000 };

beforeEach(() => {
  fixture.update.mockClear();
  fixture.assets = ASSETS;
  fixture.scenario = { equityMove: -0.1, rateChangeBps: 0, inrMove: 0, extraShock: null };
  fixture.weights = normaliseWeights({ ...emptyWeights(), LC: 1 });
  fixture.state = {
    ...emptyAnalysis(),
    value: 100000,
    cashNeed: 20000,
    comfortLimit: 0.25,
    portfolios: [{ id: "p1", name: "My portfolio", holdings: [holding] }],
    activeId: "p1",
  };
});

describe("scenario lab screen", () => {
  it("names the share fall that breaks the user's comfort limit", () => {
    open();
    const line = screen.getByText(/Your comfort limit/).textContent ?? "";
    const pct = Number(line.match(/fall about (\d+)%/)?.[1]);
    expect(pct).toBeGreaterThan(0);
    expect(pct).toBeLessThan(95);
  });

  it("prices a sale of the user's holding from its own price and buy price", () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(screen.getByText("Cash you receive").parentElement?.textContent).toContain("₹1 lakh");
    expect(screen.getByText("Profit on sale").parentElement?.textContent).toContain("+₹40,000");
  });

  it("shows the user's own holding in the what-if and no crash path chart", () => {
    open();
    expect(screen.getByText("What each holding does in this what-if")).toBeInTheDocument();
    expect(screen.getAllByText("RELIANCE").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Crash path/i)).toBeNull();
    expect(screen.queryByText(/month by month/i)).toBeNull();
  });
});
