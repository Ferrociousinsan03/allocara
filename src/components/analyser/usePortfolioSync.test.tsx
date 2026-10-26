import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import type { AnalyserState } from "./state";
import { usePortfolioSync } from "./usePortfolioSync";
import { accountSettings } from "@/lib/account-settings";
import { emptyAnalysis } from "@/engine/investor";

const mocks = vi.hoisted(() => ({ account: { user: { id: "user-a" } as { id: string } | null, loading: false }, read: vi.fn(), upsert: vi.fn() }));
vi.mock("@/components/AccountProvider", () => ({ useAccount: () => mocks.account }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.read }) }), upsert: mocks.upsert }) } }));
const initial: AnalyserState = {
  value: 1000000, goals: [], cashNeed: 400000, monthlySaving: 25000, inflation: 0.05,
  todaysMoney: false, comfortLimit: 0.2, detail: false, active: "A",
  weightsA: { LC: 30, MC: 10, GS: 20, CB: 15, GD: 10, CA: 10, US: 5, LK: 0 },
  weightsB: { LC: 10, MC: 0, GS: 35, CB: 20, GD: 10, CA: 20, US: 0, LK: 5 },
  presetId: "crash-2008", equityMove: -35, rateChangeBps: -75, inrMove: 12, shockAsset: "", shockSize: 0, returnOverrides: {},
};
function useFixture() {
  const [state, setState] = useState(initial);
  const [corr, setCorr] = useState<"fixed" | "measured">("measured");
  return { ...usePortfolioSync(state, setState, corr, setCorr), state, setState };
}
beforeEach(() => { vi.clearAllMocks(); sessionStorage.clear(); window.history.replaceState(null, "", "/"); mocks.account.user = { id: "user-a" }; mocks.upsert.mockResolvedValue({ error: null }); });
describe("per-user portfolio saving", () => {
  it("does not create a portfolio record from empty initial defaults", async () => {
    mocks.read.mockResolvedValue({ data: null, error: null });
    const { result, unmount } = renderHook(() => {
      const [state, setState] = useState<AnalyserState>(emptyAnalysis);
      const [corr, setCorr] = useState<"fixed" | "measured">("measured");
      return usePortfolioSync(state, setState, corr, setCorr);
    });
    await waitFor(() => expect(result.current.accountReady).toBe(true));
    await new Promise(resolve => setTimeout(resolve, 800));
    expect(mocks.upsert).not.toHaveBeenCalled();
    unmount();
  });
  it("restores the user's allocation before allowing account writes", async () => {
    mocks.read.mockResolvedValue({ data: { settings: accountSettings({ ...initial, value: 7654321 }, "fixed") }, error: null });
    const { result, unmount } = renderHook(useFixture);
    await waitFor(() => expect(result.current.accountReady).toBe(true));
    expect(result.current.state.value).toBe(7654321);
    expect(mocks.upsert).not.toHaveBeenCalled();
    unmount();
  });
  it("saves selected assets and settings only under the signed-in user", async () => {
    mocks.read.mockResolvedValue({ data: { settings: accountSettings(initial, "measured") }, error: null });
    const { result, unmount } = renderHook(useFixture);
    await waitFor(() => expect(result.current.accountReady).toBe(true));
    act(() => result.current.setState({ ...initial, weightsA: { ...initial.weightsA, LC: 42 } }));
    await act(async () => { await result.current.saveNow(); });
    const call = mocks.upsert.mock.calls[0]?.[0];
    expect(call.user_id).toBe("user-a");
    expect(call.settings.state.weightsA.LC).toBe(42);
    expect(result.current.saveStatus).toBe("Saved to your account");
    unmount();
  });
  it("does not overwrite a user's settings when the initial load fails", async () => {
    mocks.read.mockResolvedValue({ data: null, error: new Error("Network failure") });
    const { result, unmount } = renderHook(useFixture);
    await waitFor(() => expect(result.current.saveStatus).toContain("Could not load"));
    await act(async () => { await result.current.saveNow(); });
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(result.current.accountReady).toBe(false);
    unmount();
  });
  it("never writes guest settings to an account", async () => {
    mocks.account.user = null;
    const { result, unmount } = renderHook(useFixture);
    await waitFor(() => expect(result.current.accountReady).toBe(true));
    await act(async () => { await result.current.saveNow(); });
    expect(mocks.upsert).not.toHaveBeenCalled();
    unmount();
  });
});