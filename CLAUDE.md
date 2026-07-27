# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

`inferno-emberline` (branded "Emberline") is a quantitative trading/research platform with two halves:

- **Backend** (repo root) — Django + Django REST Framework. Fetches market data via `yfinance`, computes technical indicators and breakout setups, and exposes it all as a JSON API. A Postgres database is configured but no models/migrations exist yet — nothing in this app currently touches the database.
- **Frontend** (`frontend/`) — a separate Next.js App Router project (its own `package.json`, not a workspace of the root). Talks to the Django API over HTTP; see `frontend/CLAUDE.md` / `frontend/AGENTS.md` for frontend-specific notes (notably: this Next.js version has breaking changes from training-data assumptions, and shadcn/ui here is built on **Base UI primitives, not Radix** — `asChild` doesn't exist, use the `render` prop instead).

## Setup

Backend virtualenv already exists at `venv/`:

```bash
source venv/bin/activate
```

Env vars load via `python-dotenv` from a `.env` file at the repo root (see `.env.example`: `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`). Postgres must be reachable for any Django command to work (`DATABASES` in `core/settings.py` has no SQLite fallback) — but note the API views don't currently read/write the DB at all.

Frontend env: `frontend/.env.local` sets `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8000/api/v1` in code if unset).

## Common commands

Backend (from repo root, venv activated):

```bash
python manage.py runserver          # dev server on :8000
python manage.py check
python -m pytest                    # runs backend/tests (see pytest.ini)
python -m pytest backend/tests/test_path_levels.py
python -m pytest backend/tests/test_path_levels.py::test_compute_fibonacci_levels
```

`pytest.ini` sets `testpaths = backend/tests` and `DJANGO_SETTINGS_MODULE=core.settings`. Tests are plain pytest-style functions, not Django `TestCase` classes. The `api` app's `tests.py` is a separate, empty Django `TestCase` stub not covered by `testpaths`.

Frontend (from `frontend/`):

```bash
npm run dev          # dev server on :3000 (Turbopack)
npm run build         # also runs the TypeScript check
npx tsc --noEmit      # type check only
npm run lint          # eslint
```

Both servers need to be running for the frontend to show live data (`npm run dev` in `frontend/`, `python manage.py runserver` at root).

## Architecture

### Backend

- **`core/`** — Django project: settings, root URL conf, WSGI/ASGI. `core/urls.py` mounts the `api` app under `api/v1/`.
- **`api/`** — DRF layer. `api/views.py` has thin `@api_view` functions that parse query params, call into `backend/`, and shape the JSON response; `api/urls.py` wires them up. No auth (`AllowAny` everywhere), JSON-only rendering, CORS allowed for `http://localhost:3000`.
- **`backend/`** — framework-agnostic domain logic (no `django.*` imports), independently testable:
  - `backend/data/fetcher.py` — `fetch_ohlcv(ticker, period, interval)` (single ticker) and `fetch_ohlcv_batch(tickers, period)` (multi-ticker via `yf.download`) wrap yfinance. `VALID_PERIODS` gates the `period` argument; both raise `ValueError` on bad input/empty results.
  - `backend/indicators/moving_averages.py` — SMA 20/50/200 + trend classification (`strong_bullish`…`strong_bearish`) for the Research page.
  - `backend/indicators/path_levels.py` — the PATH breakout-retest model: a forward zigzag scan (`_confirmed_pivots`) finds swing highs/lows that clear a minimum-pullback threshold (default 10%), from which `find_ath_and_path` derives the all-time-high and PATH (the prior swing high a breakout must reclaim as support), `find_swing_low_before_ath` finds the rally's launch point, and `compute_fibonacci_levels` derives Fib retracement levels (23.6/38.2/50/61.8/78.6%) between that swing low and the ATH — 61.8% is flagged as `golden_ratio`. `classify_path_setup` combines these into a `stage` (`at_new_highs`, `pulled_back_above_path`, `entry_1_path_reclaim`, `below_path_above_sma20`, `entry_2_sma20_reclaim`, `below_sma20_invalidated`, `insufficient_history`) plus a volume-confirmation flag.
  - `backend/scanner/universe.py` — `LEADERS_CANDIDATES`: a hand-picked ~40-ticker universe across Tech/AI/Semis, Energy, Equipment, and Gas/Oil, plus the `^GSPC` benchmark ticker.
  - `backend/scanner/leaders.py` — `scan_leaders()` ranks the universe by YTD return, keeping only names beating the S&P 500's YTD return by 2x *and* trading above their 20- and 50-day SMA.
  - `backend/scanner/path_scanner.py` — `scan_path_setups(tickers)` (lightweight, table-view batch scan) and `get_path_detail(ticker, interval)` (single-ticker deep dive: classification + Fibonacci + a chartable series). ATH/PATH/Fibonacci are **always** computed from a 5-year daily lookback (`PATH_LOOKBACK_PERIOD`) regardless of `interval` — only the returned `series` (and its own SMA) switches between daily (5y) and hourly (`INTRADAY_LOOKBACK_PERIOD = "1mo"`, capped by Yahoo's intraday history limits). Don't let a chart-granularity toggle change what the "key levels" are.
  - `backend/backtester/`, `backend/config/`, `backend/models/`, `backend/services/`, `backend/strategy/` — still-empty stub packages for future phases (backtesting, paper trading, etc.).
  - `backend/tests/` — what `pytest.ini` actually runs.

### API endpoints (`/api/v1/...`)

- `GET health/`
- `GET indicators/moving-averages/?ticker=&period=` — used by the Research page.
- `GET scanner/leaders/` — ranked leaders list + benchmark YTD.
- `GET scanner/path-setups/?tickers=A,B,C` — batch PATH classification (defaults to the full `LEADERS_CANDIDATES` universe if `tickers` omitted).
- `GET scanner/path-setups/<ticker>/?interval=1d|1h` — single-ticker detail with chartable series + Fibonacci levels.

### Frontend (`frontend/src/`)

Next.js App Router, Tailwind v4, shadcn/ui (`new-york` style, **Base UI** primitives), Framer Motion, Recharts. Brand accent derived from `#5BB658`, dark-mode-first with a full light theme, both defined as OKLCH tokens in `app/globals.css` (`--bullish`, `--bearish`, `--watching`, `--chart-1..5`).

- `app/page.tsx` ("Research") — ticker search + period tabs, hits `indicators/moving-averages/`, renders `PriceChart`.
- `app/scanner/page.tsx` — ranked leaders table with live `StageBadge`s, hits `scanner/leaders/` then `scanner/path-setups/`.
- `app/scanner/[ticker]/page.tsx` — per-ticker detail: stat cards, `PathChart` (ATH/PATH/Fibonacci reference lines, Daily/Hourly toggle, client-side 3M–5Y zoom that just slices the already-fetched daily series with no extra request). This page owns the daily/hourly fetch — switching intervals re-fetches `scanner/path-setups/<ticker>/?interval=`, trusting that ATH/PATH/Fibonacci come back identical (per the backend contract above) and only the chart series changes.
- `components/site-header.tsx` — shared nav between Research and Scanner.
- `lib/api.ts` — typed fetch wrappers (`apiGet` helper) for every endpoint above; `ApiRequestError` for user-facing error messages.

Every data-fetching page follows the same pattern: `idle/loading/success/error` status state, an `AbortController` ref so a superseded in-flight request can't clobber a newer one, Framer Motion `AnimatePresence` transitions between states, and a Retry button on error.
