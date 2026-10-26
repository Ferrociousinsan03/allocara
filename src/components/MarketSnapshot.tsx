import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChartNoAxesCombined } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MarketSnapshot() {
  const container = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = container.current;
    if (!host) return;
    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    host.appendChild(widget);
    const theme = getComputedStyle(document.documentElement);
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js";
    script.async = true;
    script.onerror = () => setFailed(true);
    script.textContent = JSON.stringify({
      colorTheme: "dark",
      dateRange: "1M",
      showChart: true,
      locale: "en",
      width: "100%",
      height: 430,
      isTransparent: true,
      showSymbolLogo: true,
      showFloatingTooltip: true,
      plotLineColorGrowing: theme.getPropertyValue("--emerald-bright").trim(),
      plotLineColorFalling: theme.getPropertyValue("--status-problem").trim(),
      gridLineColor: theme.getPropertyValue("--line").trim(),
      fontColor: theme.getPropertyValue("--ivory-dim").trim(),
      tabs: [
        { title: "Indices", symbols: [
          { s: "BSE:SENSEX", d: "Sensex" },
          { s: "BSE:BANK", d: "BSE Bankex" },
          { s: "BSE:BSE100", d: "BSE 100" },
        ] },
        { title: "Stocks", symbols: [
          { s: "BSE:RELIANCE", d: "Reliance Industries" },
          { s: "BSE:TCS", d: "Tata Consultancy Services" },
          { s: "BSE:HDFCBANK", d: "HDFC Bank" },
          { s: "BSE:INFY", d: "Infosys" },
        ] },
      ],
    });
    host.appendChild(script);
    const timeout = window.setTimeout(() => {
      if (!host.querySelector("iframe")) setFailed(true);
    }, 15000);
    return () => { window.clearTimeout(timeout); host.replaceChildren(); };
  }, []);

  return (
    <aside aria-label="Recent Indian market prices and charts" className="min-w-0 border-t border-line pt-5 lg:border-t-0 lg:border-l lg:pl-8 lg:pt-0">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-sans text-sm font-semibold text-ivory">
          <ChartNoAxesCombined className="h-4 w-4 text-emerald-bright" aria-hidden /> Indian markets
        </h2>
        <span className="text-[11px] text-ivory-dim">Prices &amp; performance</span>
      </div>
      {failed ? (
        <div className="flex h-[430px] flex-col items-center justify-center gap-5 text-center">
          <p className="text-sm text-ivory-dim">Market prices are unavailable right now.</p>
          <Button asChild variant="outline"><a href="https://www.tradingview.com/markets/stocks-india/" target="_blank" rel="noopener noreferrer">View Indian markets <ArrowUpRight className="h-4 w-4" /></a></Button>
        </div>
      ) : <div ref={container} className="tradingview-widget-container h-[430px] w-full" />}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-ivory-faint">
        <span>Exchange data may be delayed.</span>
        <a className="inline-flex items-center gap-1 hover:text-emerald-bright" href="https://www.tradingview.com/markets/stocks-india/" target="_blank" rel="noopener noreferrer">Market data by TradingView <ArrowUpRight className="h-3 w-3" aria-hidden /></a>
      </div>
    </aside>
  );
}