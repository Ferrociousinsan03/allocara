import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("@/lib/quotes.functions", () => ({ getQuotes: vi.fn(async () => [{ symbol: "RELIANCE", price: 1190, time: 0 }]) }));
import { HoldingWizard } from "./HoldingWizard";

afterEach(cleanup);
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
Element.prototype.scrollIntoView = vi.fn();
it("uses the live price for current value and the user buy price for invested amount", async () => {
  const save = vi.fn();
  render(<HoldingWizard onSave={save} onClose={() => {}} />);
  fireEvent.change(screen.getByLabelText("Investment type"), { target: { value: "stock" } });
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  fireEvent.click(screen.getByRole("combobox", { name: "Choose stock" }));
  fireEvent.click(screen.getByRole("option", { name: /Reliance Industries Ltd/ }));
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "10" } });
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  await screen.findByText(/11,900/);
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "1000" } });
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm holding" }));
  expect(save).toHaveBeenCalledWith(expect.objectContaining({ name: "Reliance Industries Ltd.", symbol: "RELIANCE", asset: "LC", units: 10, currentValue: 11900, investedAmount: 10000 }));
});