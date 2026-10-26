# Data sources and caveats

Fetched by `scripts/fetch_data.py` (yfinance), 10 years of monthly returns, as decimals.
Re-run with `python3 scripts/fetch_data.py` to refresh.

| Column | Ticker | What it is | Caveats |
| --- | --- | --- | --- |
| LC | ^NSEI | Nifty 50 index | Price index; dividends not included, so returns are slightly understated. |
| MC | ^NSEMDCP50 | Nifty Midcap 50 index | Midcap 50, not the full mid/small-cap universe; dividends not included. |
| GS | GILT5YBEES.NS | Nippon India ETF Nifty 5 yr Benchmark G-Sec | Only ~5.5 years of history; earlier months are empty and the app falls back to assumptions there. ETF, so fees and tracking error are included. |
| CB | ABSLBANETF.NS | Bharat Bond ETF | AAA public-sector bonds, not the broad corporate-bond market; ~7 years of history; empty earlier months use assumptions. |
| GD | GOLDBEES.NS | Nippon India Gold ETF | Gold in rupees; ETF fees included. |
| CA | LIQUIDBEES.NS | Nippon India Liquid ETF | Liquid-fund proxy for cash; slightly higher return and volatility than a plain FD. |
| US | ^GSPC × INR=X | S&P 500 converted to rupees at USD/INR | Price index (no dividends); an Indian US-shares fund would also carry fees and tax effects. |
| LK | — | none | Locked-in assets (PPF, property funds) have no market proxy; the column is empty on purpose and the app uses the stated assumption, labelled as such. |

General caveats: monthly month-end prices, adjusted for splits; 120 rows; ETF proxies embed
fees; index series exclude dividends. Missing months are left empty so the app can label
them instead of silently inventing numbers.
