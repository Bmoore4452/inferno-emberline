export type Trend =
  | "strong_bullish"
  | "bullish"
  | "neutral"
  | "bearish"
  | "strong_bearish";

export type SeriesPoint = {
  date: string;
  close: number | null;
  sma_20: number | null;
  sma_50: number | null;
  sma_200: number | null;
};

export type MovingAveragesResponse = {
  ticker: string;
  period: string;
  data_points: number;
  date_range: { from: string; to: string };
  latest_close: number;
  moving_averages: {
    sma_20: number | null;
    sma_50: number | null;
    sma_200: number | null;
  };
  trend: Trend;
  series: SeriesPoint[];
};

export type Leader = {
  ticker: string;
  sector: string;
  price: number;
  ytd_return_pct: number;
  outperformance_pct: number;
  meets_criteria: boolean;
};

export type LeadersResponse = {
  benchmark_ytd_return_pct: number;
  outperformance_threshold_pct: number;
  leaders: Leader[];
  generated_at: string | null;
};

export type PathStage =
  | "at_new_highs"
  | "pulled_back_above_path"
  | "entry_1_path_reclaim"
  | "below_path_above_sma20"
  | "entry_2_sma20_reclaim"
  | "below_sma20_invalidated"
  | "insufficient_history";

export type PathSetup = {
  ticker: string;
  ath: number | null;
  path: number | null;
  last_close: number;
  sma20: number | null;
  stage: PathStage;
  high_volume: boolean;
  volume_vs_avg: number | null;
  error?: string;
};

export type PathSetupsResponse = {
  tickers: string[];
  results: PathSetup[];
};

export type PathSeriesPoint = {
  date: string;
  close: number | null;
  sma_20: number | null;
};

export type ChartInterval = "1d" | "1h";

export const FIB_RATIOS = ["0.236", "0.382", "0.5", "0.618", "0.786"] as const;
export type FibRatio = (typeof FIB_RATIOS)[number];
export const GOLDEN_RATIO: FibRatio = "0.618";

export type FibonacciLevels = {
  swing_low: number;
  swing_high: number;
  levels: Record<FibRatio, number>;
  golden_ratio: number;
};

export type PathDetailResponse = PathSetup & {
  series: PathSeriesPoint[];
  fibonacci: FibonacciLevels | null;
  interval: ChartInterval;
};

export type ApiError = { error: string; detail?: string };

// Local dev sets NEXT_PUBLIC_API_URL in .env.local (localhost:8000). The
// fallback below is the deployed demo backend, used when no env var is
// configured for a given deployment (e.g. this POC's Vercel project).
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://emberline-backend.vercel.app/api/v1";

export class ApiRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiRequestError";
  }
}

async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, init);
  } catch {
    throw new ApiRequestError(
      "Couldn't reach the Emberline API. Is the backend running?",
    );
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiError | null;
    throw new ApiRequestError(body?.error ?? `Request failed (${res.status}).`);
  }

  return res.json();
}

function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  return apiRequest(path, { signal });
}

export function fetchMovingAverages(
  ticker: string,
  period: string,
  signal?: AbortSignal,
): Promise<MovingAveragesResponse> {
  return apiGet(
    `/indicators/moving-averages/?ticker=${encodeURIComponent(ticker)}&period=${encodeURIComponent(period)}`,
    signal,
  );
}

export function fetchLeaders(signal?: AbortSignal): Promise<LeadersResponse> {
  return apiGet(`/scanner/leaders/`, signal);
}

// Regenerates the persisted 20-ticker watchlist from a fresh scan. The
// leaders returned by fetchLeaders() otherwise stay fixed between refreshes.
export function refreshLeaders(signal?: AbortSignal): Promise<LeadersResponse> {
  return apiRequest(`/scanner/leaders/refresh/`, { method: "POST", signal });
}

export function fetchPathSetups(
  tickers: string[],
  signal?: AbortSignal,
): Promise<PathSetupsResponse> {
  const query = tickers.length
    ? `?tickers=${encodeURIComponent(tickers.join(","))}`
    : "";
  return apiGet(`/scanner/path-setups/${query}`, signal);
}

export function fetchPathDetail(
  ticker: string,
  interval: ChartInterval = "1d",
  signal?: AbortSignal,
): Promise<PathDetailResponse> {
  return apiGet(
    `/scanner/path-setups/${encodeURIComponent(ticker)}/?interval=${interval}`,
    signal,
  );
}
