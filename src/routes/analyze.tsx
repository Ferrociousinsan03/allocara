import { pageMeta } from "@/lib/metadata";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { AnalyserProvider, useAnalyser } from "@/components/analyser/state";
import { usePageAssistant } from "@/components/PageAssistant";
import { SaveMenu } from "@/components/analyser/SaveMenu";
import { BrandLogo } from "@/components/BrandLogo";
import { AccountLinks } from "@/components/AccountLinks";
import { useAccount } from "@/components/AccountProvider";
import { runEngineSelfTests } from "@/engine/selftest";
import { Button } from "@/components/ui/button";
import { hasPortfolio } from "@/engine/investor";
import { accountSettings, PENDING_PORTFOLIO } from "@/lib/account-settings";

export const Route = createFileRoute("/analyze")({
  head: () => ({
    meta: pageMeta("Allocara Analyser — stress-test your portfolio", "Stress-test a portfolio against combined shocks, check cash needs and goal chances, and see the trade-offs."),
  }),
  component: AnalyzeLayout,
});

const TABS = [
  { to: "/analyze/overview", label: "Overview", enabled: true },
  { to: "/analyze/scenario-lab", label: "Scenario Lab", enabled: true },
  { to: "/analyze/risk-map", label: "Risk Map", enabled: true },
  { to: "/analyze/compare", label: "Compare holdings", enabled: true },
  { to: "/analyze/past-performance", label: "Past performance", enabled: true },
  { to: "/analyze/assumptions", label: "Assumptions and Limits", enabled: true },
] as const;

function TopBar({ onPlainWords }: { onPlainWords: () => void }) {
  const { state, update, corrMethod, saveStatus } = useAnalyser();
  const { user } = useAccount();
  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-line bg-bg-1 px-4 py-2.5 no-print">
      <Link to="/" className="flex items-center gap-2 font-serif text-lg text-ivory">
        <BrandLogo size={28} /> Allocara
      </Link>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" size="sm"><Link to="/tools">Investment tools</Link></Button>
        <Button variant="outline" size="sm" onClick={onPlainWords}>
          Plain-words summary
        </Button>
        <Link to="/analyze/report" className="rounded-md border border-line px-3 py-1.5 text-xs text-ivory-dim hover:text-ivory">
          Export report
        </Link>
        <SaveMenu />
        {user && <span role="status" className="text-xs text-muted-foreground">{saveStatus}</span>}
        <AccountLinks onBeforeAuth={() => { try { sessionStorage.setItem(PENDING_PORTFOLIO, JSON.stringify(accountSettings(state, corrMethod))); } catch { /* blocked storage */ } }} />
        <button
          type="button"
          onClick={() => update({ detail: !state.detail })}
          className="rounded-md border border-line px-3 py-1.5 text-xs text-ivory-dim hover:text-ivory"
          aria-pressed={state.detail}
        >
          {state.detail ? "More detail: on" : "Simple view"}
        </button>
      </div>
    </header>
  );
}

function TabNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav aria-label="Analysis tabs" className="flex gap-1 overflow-x-auto border-b border-line bg-bg-1 px-4 py-1.5 no-print">
      {TABS.map((t) =>
        t.enabled ? (
          <Link
            key={t.to}
            to={t.to}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium ${
              pathname === t.to ? "bg-bg-2 text-ivory" : "text-ivory-faint hover:text-ivory"
            }`}
          >
            {t.label}
          </Link>
        ) : (
          <span key={t.to} title="Coming in Phase 3" className="cursor-not-allowed whitespace-nowrap rounded-md px-3 py-1.5 text-xs text-ivory-faint/50">
            {t.label}
          </span>
        ),
      )}
    </nav>
  );
}

function AnalyzeShell() {
  const { accountReady, saveStatus, retryLoad, state } = useAnalyser();
  const openPlainWords = usePageAssistant();
  // Development-only sanity checks; silent in production.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const failures = runEngineSelfTests();
    if (failures.length) console.warn("Engine self-tests failed:", failures);
  }, []);
  if (!accountReady) return <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6"><p role="status">{saveStatus}</p><Button variant="outline" onClick={retryLoad}>Retry</Button><Button asChild variant="ghost"><Link to="/">Back to Allocara</Link></Button></main>;

  return (
    <div className="flex min-h-screen flex-col text-foreground">
      <a
        href="#main-results"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded-md focus:bg-emerald focus:px-3 focus:py-2 focus:text-sm focus:text-bg-0"
      >
        Skip to results
      </a>
      <TopBar onPlainWords={openPlainWords} />
      <TabNav />
      <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-6 p-4 lg:flex-row">
        <main id="main-results" className="min-w-0 flex-1">
          {hasPortfolio(state) ? <Outlet /> : <section className="py-12"><h1 className="font-serif text-3xl">Your portfolio starts with you</h1><p className="mt-4 text-muted-foreground">No holdings entered for portfolio {state.active}.</p><Button asChild className="mt-6"><Link to="/account">Enter my portfolio</Link></Button></section>}
        </main>
      </div>
      <footer className="border-t border-line px-4 py-3 text-center text-xs text-ivory-faint no-print">
        Educational tool, not financial advice.
      </footer>
    </div>
  );
}

function AnalyzeLayout() {
  const { user, loading } = useAccount();
  return (
    <AnalyserProvider key={loading ? "checking" : user?.id ?? "guest"}>
      <AnalyzeShell />
    </AnalyserProvider>
  );
}
