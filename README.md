# Emberline (inferno-emberline)

A quantitative trading research platform: pulls live market data, computes technical indicators, and scans for momentum/breakout setups. Django + DRF backend, Next.js frontend.

## Status

**Phase 1 — Research:** live moving-average trend research for any ticker (SMA 20/50/200, trend classification, price chart).

**Phase 2 — Scanner:** a "Leaders" screen (stocks beating the S&P 500 by 2x YTD across Tech/AI/Semis, Energy, Equipment, and Gas/Oil, trading above their 20/50-day SMA) tracked against a PATH breakout-retest model — previous-all-time-high reclaim (entry 1), 20-day-SMA reclaim (entry 2), with volume confirmation and Fibonacci retracement levels.

Phases 3–5 (strategy engine, backtesting, paper trading, AI assistant) are not yet built.

## Stack

- **Backend:** Django 6 + Django REST Framework, `yfinance` + `pandas` for data/indicators, Postgres (configured, not yet used by any model)
- **Frontend:** Next.js (App Router) + TypeScript + Tailwind v4 + shadcn/ui + Recharts + Framer Motion, in `frontend/`

## Running locally

### Backend

```bash
source venv/bin/activate
cp .env.example .env   # fill in a Postgres connection or your own secret key
python manage.py runserver
```

Runs on `http://localhost:8000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:3000` and expects the backend at `http://localhost:8000/api/v1` (override via `frontend/.env.local`'s `NEXT_PUBLIC_API_URL`).

### Tests

```bash
source venv/bin/activate && python -m pytest   # backend
cd frontend && npx tsc --noEmit && npm run lint && npm run build   # frontend
```

## API

All endpoints are under `/api/v1/`:

| Endpoint | Description |
|---|---|
| `GET health/` | Health check |
| `GET indicators/moving-averages/?ticker=&period=` | SMA 20/50/200 + trend for a ticker |
| `GET scanner/leaders/` | Ranked leaders list vs. S&P 500 YTD |
| `GET scanner/path-setups/?tickers=` | Batch PATH breakout-retest classification |
| `GET scanner/path-setups/<ticker>/?interval=1d\|1h` | Single-ticker detail: classification, Fibonacci levels, chartable series |

Market data via `yfinance`. For research purposes only — not investment advice.
