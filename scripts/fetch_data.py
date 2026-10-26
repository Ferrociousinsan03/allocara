#!/usr/bin/env python3
"""Fetch 10 years of monthly returns for Allocara's eight assets (spec item 17).

Writes data/monthly_returns.csv (columns: date, LC, MC, GS, CB, GD, CA, US, LK)
with monthly simple returns as decimals. US shares are converted to rupees using
USD/INR. LK (locked-in) has no market proxy and is left empty on purpose, so the
app falls back to the stated assumption and labels it.

Ticker choices and caveats are recorded in data/SOURCES.md.
"""

import sys
from pathlib import Path

import pandas as pd
import yfinance as yf

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "monthly_returns.csv"

TICKERS = {
    "LC": "^NSEI",          # Nifty 50 index
    "MC": "^NSEMDCP50",     # Nifty Midcap 50 index
    "GS": "GILT5YBEES.NS",  # Nippon India ETF Nifty 5 yr G-Sec (gov bond proxy)
    "CB": "ABSLBANETF.NS",  # Bharat Bond ETF (AAA PSU/corporate bond proxy)
    "GD": "GOLDBEES.NS",    # Nippon India Gold ETF (gold in rupees)
    "CA": "LIQUIDBEES.NS",  # Nippon India Liquid ETF (cash proxy)
    "US": "^GSPC",          # S&P 500 index (converted to INR below)
    "FX": "INR=X",          # USD/INR exchange rate
}

MONTHS = 120  # 10 years of monthly returns


def main() -> int:
    frames = {}
    for key, ticker in TICKERS.items():
        df = yf.download(ticker, period="11y", interval="1mo", auto_adjust=True, progress=False)
        if df.empty:
            print(f"WARNING: no data for {key} ({ticker}); column will be empty")
            continue
        close = df["Close"]
        if isinstance(close, pd.DataFrame):
            close = close.iloc[:, 0]
        frames[key] = close.resample("ME").last()
        print(f"{key}: {ticker} -> {len(frames[key].dropna())} monthly prices")

    if "LC" not in frames:
        print("ERROR: benchmark (LC) missing; aborting")
        return 1

    px = pd.DataFrame(frames)
    if "US" in px and "FX" in px:
        px["US"] = px["US"] * px["FX"]  # US shares in rupees
    px = px.drop(columns=["FX"], errors="ignore")

    rets = px.pct_change().dropna(how="all").tail(MONTHS)
    rets["LK"] = pd.NA  # locked-in assets have no market proxy
    rets.index.name = "date"
    rets = rets[["LC", "MC", "GS", "CB", "GD", "CA", "US", "LK"]]

    OUT.parent.mkdir(parents=True, exist_ok=True)
    rets.to_csv(OUT, float_format="%.6f")
    print(f"wrote {OUT} with {len(rets)} monthly rows")
    for col in rets.columns:
        missing = int(rets[col].isna().sum())
        if missing:
            print(f"  {col}: {missing} missing months")
    return 0


if __name__ == "__main__":
    sys.exit(main())
