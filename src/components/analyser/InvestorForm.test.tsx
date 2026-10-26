import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  account: { user: { id: "user-a" } as { id: string } | null, loading: false, signOut: vi.fn() },
  read: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("@/components/AccountProvider", () => ({ useAccount: () => mocks.account }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: mocks.read }) }),
      upsert: mocks.upsert,
    }),
  },
}));
vi.mock("@/lib/quotes.functions", () => ({ getQuotes: vi.fn(async () => []) }));
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return { ...actual, Link: ({ children }: { children?: React.ReactNode }) => <a>{children}</a> };
});

import { AnalyserProvider } from "@/components/analyser/state";
import { InvestorForm } from "./InvestorForm";

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  window.history.replaceState(null, "", "/account");
  mocks.account.user = { id: "user-a" };
  mocks.read.mockResolvedValue({ data: null, error: null });
  mocks.upsert.mockResolvedValue({ error: null });
});

describe("My account portfolio form", () => {
  it("keeps the portfolio and investor sections without a financial goals section", async () => {
    render(
      <AnalyserProvider>
        <InvestorForm />
      </AnalyserProvider>,
    );

    await waitFor(() => expect(screen.getByText("My portfolios")).toBeInTheDocument());

    expect(screen.queryByRole("heading", { name: "Financial goals" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Add goal" })).toBeNull();
    expect(screen.queryByLabelText("Goal name")).toBeNull();
  });
});
