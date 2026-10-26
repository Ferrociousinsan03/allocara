import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRightLeft,
  Banknote,
  FlaskConical,
  ListChecks,
  Map,
  MessageSquareText,
  Printer,
  Route as RouteIcon,
  Target,
} from "lucide-react";
import { AccountLinks } from "@/components/AccountLinks";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { MarketSnapshot } from "@/components/MarketSnapshot";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Allocara — Know if your portfolio holds up, before the market tests it" },
      { name: "description", content: "Allocara stress-tests your money against combined shocks, checks your cash needs, and shows ranges, never promises." },
      { property: "og:title", content: "Allocara — Know if your portfolio holds up, before the market tests it" },
      { property: "og:description", content: "Stress-test your money against combined shocks, check your cash needs, and see ranges, never promises." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const TOOLS = [
  { icon: Banknote, name: "Cash and goal check", text: "Can you raise the cash you need in 12 months, and still reach your goals?", to: "/analyze/overview" },
  { icon: FlaskConical, name: "Scenario lab", text: "Combine a share fall, rate change, rupee move and one extra shock.", to: "/analyze/scenario-lab" },
  { icon: Target, name: "Reverse stress test", text: "How big a fall breaks your comfort limit or your cash cover?", to: "/analyze/scenario-lab" },
  { icon: Map, name: "Risk map", text: "See when one holding quietly carries most of the risk.", to: "/analyze/risk-map" },
  { icon: ArrowRightLeft, name: "Compare holdings", text: "Holding values, purchase costs and returns within your chosen portfolio.", to: "/analyze/compare" },
  { icon: ListChecks, name: "Past performance", text: "Growth of 100, worst fall and more from real history.", to: "/analyze/past-performance" },
  { icon: RouteIcon, name: "Assumptions and limits", text: "Every assumption editable, every formula visible, every limit stated.", to: "/analyze/assumptions" },
  { icon: MessageSquareText, name: "Plain-words explainer", text: "The results in a few plain sentences, from the button in the top bar.", to: "/analyze/overview" },
  { icon: Printer, name: "One-page report", text: "A printable summary of the headline results, conflicts and assumptions.", to: "/analyze/report" },
] as const;

const STEPS = [
  { n: 1, title: "Tell us about you", text: "Portfolio value, goals, cash needs and the biggest loss you can accept." },
  { n: 2, title: "Build a portfolio", text: "Enter your own stocks, funds and other investments in your account." },
  { n: 3, title: "Pick a what-if", text: "A preset inspired by past crises, or your own combination of shocks." },
  { n: 4, title: "Read the trade-offs", text: "Conflicts in plain words, with options to explore — never advice." },
];

function Landing() {
  return (
    <main className="relative min-h-screen text-foreground">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-8 py-6">
        <span className="flex items-center gap-2.5 font-serif text-xl">
          <BrandLogo /> Allocara
        </span>
        <div className="flex flex-wrap items-center justify-end gap-3 text-sm text-ivory-dim">
          <AccountLinks />
          <Button asChild variant="ghost"><Link to="/tools">Investment tools</Link></Button>
          <a href="#how" className="hidden hover:text-ivory sm:inline">How it works</a>
          <Link to="/analyze/overview" className="rounded-md bg-emerald px-4 py-2 text-sm font-medium text-bg-0 transition-colors hover:bg-emerald-deep">
            Open analyser
          </Link>
        </div>
      </nav>

      <section className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-10 sm:px-8 lg:grid-cols-[1.15fr_1fr] lg:gap-12 lg:py-12">
        <div className="min-w-0">
          <h1 className="font-serif text-[42px] leading-[1.08] tracking-normal sm:text-[52px] xl:text-[60px]">See if your portfolio holds up, and still reaches your goal.</h1>
          <p className="mt-6 max-w-xl text-lg text-ivory-dim">
            Allocara stress-tests your money against combined shocks, checks your cash needs, and shows ranges, never promises.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/analyze/overview" className="inline-flex items-center justify-center rounded-md bg-emerald px-5 py-2.5 text-sm font-medium text-bg-0 transition-colors hover:bg-emerald-deep">
              Analyse a portfolio
            </Link>
            <Button asChild variant="outline"><Link to="/account">Enter my portfolio</Link></Button>
            <Button asChild variant="outline"><Link to="/tools">Explore investment tools</Link></Button>
          </div>
          <ul className="mt-10 flex flex-wrap gap-6 text-sm text-ivory-dim">
            <li>Works offline</li>
            <li>Every assumption editable</li>
            <li>Past vs what-if clearly labelled</li>
          </ul>
        </div>
        <MarketSnapshot />
      </section>

      <section id="tools" className="mx-auto max-w-7xl scroll-mt-8 px-8 py-16">
        <h2 className="font-serif text-3xl text-ivory">Analysis tools</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((t) => (
            <Link key={t.name} to={t.to} className="group rounded-xl border border-line bg-bg-1 p-5 transition-colors hover:border-emerald/50">
              <t.icon className="h-5 w-5 text-emerald" aria-hidden />
              <h3 className="mt-3 font-serif text-lg text-ivory group-hover:text-emerald-bright">{t.name}</h3>
              <p className="mt-1 text-sm text-ivory-dim">{t.text}</p>
            </Link>
          ))}
        </div>
      </section>

      <section id="how" className="mx-auto max-w-7xl scroll-mt-8 px-8 py-16">
        <h2 className="font-serif text-3xl text-ivory">How it works</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-xl border border-line bg-bg-1 p-5">
              <p className="num font-serif text-2xl text-emerald">{s.n}</p>
              <h3 className="mt-2 font-medium text-ivory">{s.title}</h3>
              <p className="mt-1 text-sm text-ivory-dim">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-8 py-16">
        <div className="rounded-xl border border-line bg-bg-1 p-8">
          <h2 className="font-serif text-2xl text-ivory">Our honesty promise</h2>
          <div className="mt-4 grid gap-6 text-sm text-ivory-dim sm:grid-cols-3">
            <p><span className="text-ivory">Historical</span> — measured from real past data, always labelled, never a forecast.</p>
            <p><span className="text-careful">Hypothetical</span> — a what-if under stated assumptions, shown as ranges.</p>
            <p><span className="text-emerald-bright">Assumption</span> — a number we chose and you can edit, in plain sight.</p>
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-7xl border-t border-line px-8 py-6 text-sm text-ivory-faint">
        Educational tool, not financial advice. Historical data sources and caveats are listed on the Assumptions and Limits tab.
      </footer>
    </main>
  );
}
