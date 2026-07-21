# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

`inferno-emberline` is a Django + Django REST Framework backend for a quantitative trading/analysis platform. It fetches market data (via `yfinance`), computes technical indicators, and exposes the results over a JSON API. A Postgres database is configured but no models/migrations exist yet.

## Setup

A virtualenv already exists at `venv/`. Activate it before running any Python/Django command:

```bash
source venv/bin/activate
```

Environment variables are loaded via `python-dotenv` from a `.env` file at the repo root (see `.env.example` for the required keys: `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`). Postgres must be running and reachable with those credentials for any Django command to work (`DATABASES` in `core/settings.py` has no fallback to SQLite).

## Common commands

```bash
# Run the Django dev server
python manage.py runserver

# Run the backend indicator/unit tests (pytest, configured via pytest.ini)
python -m pytest

# Run a single test file / test function
python -m pytest backend/tests/test_indicators.py
python -m pytest backend/tests/test_indicators.py::test_trend_strong_bullish

# Django system check / migrations
python manage.py check
python manage.py makemigrations
python manage.py migrate
```

`pytest.ini` points `testpaths` at `backend/tests` and pins `DJANGO_SETTINGS_MODULE=core.settings`, so `pytest` runs under Django settings even though the tests currently under `backend/` are plain pytest-style functions, not `TestCase` classes. The `api` app's `tests.py` is a separate, currently-empty Django `TestCase` stub not covered by `pytest.ini`'s `testpaths`.

## Architecture

Two parallel trees make up the project:

- **`core/`** — the Django project (settings, root URL conf, WSGI/ASGI entrypoints). `core/urls.py` mounts the `api` app under `api/v1/`.
- **`api/`** — the Django app / DRF layer. `api/views.py` holds thin view functions decorated with `@api_view` that parse request params, call into `backend/`, and shape the JSON response. This app currently has **no `urls.py`** even though `core/urls.py` does `include('api.urls')` — adding that file is necessary before the server will boot with routes attached.
- **`backend/`** — plain-Python domain logic, deliberately decoupled from Django (no imports of `django.*`). Subpackages, most currently stubs (empty `__init__.py`) reserved for future work:
  - `backend/data/fetcher.py` — wraps `yfinance` to fetch OHLCV history for a ticker (`fetch_ohlcv`); validates the `period` against a fixed `VALID_PERIODS` set and raises `ValueError` for bad tickers/periods.
  - `backend/indicators/moving_averages.py` — pure functions computing SMAs and classifying trend (`strong_bullish` / `bullish` / `neutral` / `bearish` / `strong_bearish`) from a `Close` price series.
  - `backend/backtester/`, `backend/config/`, `backend/models/`, `backend/scanner/`, `backend/services/`, `backend/strategy/` — empty placeholders for future modules (backtesting engine, strategy definitions, scanning logic, etc.).
  - `backend/tests/` — pytest-style tests for the `backend/` logic (this is what `pytest.ini` actually runs).

The intended flow is: DRF view (`api/views.py`) → data layer (`backend/data`) → indicator/strategy computation (`backend/indicators`, and eventually `backend/strategy`, `backend/backtester`, `backend/scanner`) → JSON response. Keep new quant/analysis logic in `backend/` as framework-agnostic, testable functions, and keep `api/` as a thin HTTP adapter over it.

DRF is configured to always return JSON (`DEFAULT_RENDERER_CLASSES` is JSON-only, no browsable API) and permissions default to `AllowAny` — there is no auth wired up yet. CORS is restricted to `http://localhost:3000` (`CORS_ALLOWED_ORIGINS` in `core/settings.py`), implying a separate frontend is expected to run there.
