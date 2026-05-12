# MacroDash — DIY Investor Macro Dashboard

## Overview
A professional macroeconomic dashboard for DIY investors. Pulls live data from the FRED API (Federal Reserve Bank of St. Louis) and displays it across multiple analytical tabs.

## Architecture

### Monorepo structure (pnpm workspaces)
```
artifacts/
  api-server/       — Express 5 backend (port via $PORT, proxied at /api)
  macro-dashboard/  — React + Vite frontend (proxied at /)
  mockup-sandbox/   — Component preview server (proxied at /__mockup)
lib/
  api-spec/         — OpenAPI 3.1 spec + Orval codegen config
  api-client-react/ — Generated React Query hooks
  api-zod/          — Generated Zod schemas
```

### Routing
All traffic goes through a shared reverse proxy:
- `/api/*`   → api-server
- `/*`       → macro-dashboard

## Data Sources
- **FRED API** (Federal Reserve Bank of St. Louis) — primary data source
  - Requires `FRED_API_KEY` secret
  - Caches responses in-memory (5 min TTL)
  - Max 4 concurrent requests to avoid rate limits
  - 3-attempt retry with backoff on 5xx errors

### Key FRED Series Used
| Indicator | Series ID |
|-----------|-----------|
| Real GDP Growth | A191RL1Q225SBEA |
| CPI | CPIAUCSL |
| Core CPI | CPILFESL |
| PCE | PCEPI |
| Core PCE | PCEPILFE |
| PPI | PPIACO |
| Unemployment Rate | UNRATE |
| Fed Funds Rate | FEDFUNDS |
| 10Y Treasury | DGS10 |
| 2Y Treasury | DGS2 |
| 2s10s Spread | T10Y2Y |
| 3m10y Spread | T10Y3M |
| HY Credit Spread (OAS) | BAMLH0A0HYM2 |
| IG Credit Spread (OAS) | BAMLC0A0CM |
| Total Nonfarm Payrolls | PAYEMS |
| Industrial Production | INDPRO |
| Initial Jobless Claims | ICSA |
| JOLTS Job Openings | JTSJOL |
| Participation Rate | CIVPART |
| Avg Hourly Earnings | CES0500000003 |
| Retail Sales | RSAFS |
| 5Y Breakeven Inflation | T5YIE |
| 10Y Breakeven Inflation | T10YIE |
| Recession Probability | RECPROUSM156N |
| Consumer Sentiment | UMCSENT |

## Tabs
1. **Overview** ✅ — Key Readings at a Glance, Signal Dashboard, Market Cycle Gauge, Yield Curve chart
2. **Growth & Cycle** ✅ — GDP, Industrial Production, Manufacturing PMI, Retail Sales charts
3. **Inflation** ✅ — CPI/PCE YoY comparison, breakeven rates
4. **Labor Market** ✅ — NFP bar chart, unemployment, wage growth, jobless claims
5. **Financial Conditions** ✅ — Credit spreads, rates, yield curve
6. **Global** 🚧 — Coming soon (EU, UK, China, Japan data)
7. **Investor Guide** 🚧 — Coming soon (regime-based asset allocation guide)

## Signal Color Coding
- 🟢 **Green** = Positive / Expansion / Risk-on
- 🔵 **Blue** = Neutral / Balanced
- 🟡 **Amber** = Warning / Elevated / Late-cycle
- 🔴 **Red** = Negative / Contraction / Stress

## Required Secrets
- `FRED_API_KEY` — Free key from https://fred.stlouisfed.org/docs/api/api_key.html

## Running
Workflows handle everything:
- `artifacts/api-server: API Server` — starts Express backend
- `artifacts/macro-dashboard: web` — starts Vite dev server

## Known Limitations / Notes
- ISM Manufacturing PMI is not available on FRED's free API; using Industrial Production (INDPRO) YoY as proxy
- FRED HY/IG spread series (BAMLH0A0HYM2, BAMLC0A0CM) return values in percent — multiply by 100 for basis points display
- PAYEMS (NFP) is in thousands of employees — monthly changes are in thousands (200 = 200K jobs)

