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

export type ApiError = { error: string; detail?: string };

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export class ApiRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export async function fetchMovingAverages(
  ticker: string,
  period: string,
  signal?: AbortSignal,
): Promise<MovingAveragesResponse> {
  const url = `${API_BASE_URL}/indicators/moving-averages/?ticker=${encodeURIComponent(
    ticker,
  )}&period=${encodeURIComponent(period)}`;

  let res: Response;
  try {
    res = await fetch(url, { signal });
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
