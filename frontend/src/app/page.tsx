"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Flame, AlertTriangle, LineChart as LineChartIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { TickerSearch } from "@/components/ticker-search";
import { StatCard } from "@/components/stat-card";
import { TrendBadge } from "@/components/trend-badge";
import { PriceChart } from "@/components/price-chart";
import { useRecentTickers } from "@/hooks/use-recent-tickers";
import {
  fetchMovingAverages,
  ApiRequestError,
  type MovingAveragesResponse,
} from "@/lib/api";

type Status = "idle" | "loading" | "success" | "error";

export default function Home() {
  const [ticker, setTicker] = useState("");
  const [period, setPeriod] = useState("1y");
  const [status, setStatus] = useState<Status>("idle");
  const [data, setData] = useState<MovingAveragesResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const { recent, addRecent } = useRecentTickers();
  const activeRequest = useRef<AbortController | null>(null);

  function runSearch(symbol: string, span: string) {
    // Cancel any in-flight request so a slow, superseded response can't
    // land after a newer one and clobber the UI with stale data.
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;

    setStatus("loading");
    setErrorMessage("");

    fetchMovingAverages(symbol, span, controller.signal)
      .then((result) => {
        setData(result);
        setStatus("success");
        addRecent(symbol);
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setStatus("error");
        setErrorMessage(
          err instanceof ApiRequestError
            ? err.message
            : "Something went wrong fetching that ticker.",
        );
      });
  }

  function handleSubmit() {
    if (!ticker.trim()) return;
    runSearch(ticker.trim(), period);
  }

  function handleQuickSelect(symbol: string) {
    setTicker(symbol);
    runSearch(symbol, period);
  }

  // Re-run automatically when the period changes on an already-loaded ticker.
  useEffect(() => {
    if (data) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- refetching from the API, an external system
      runSearch(data.ticker, period);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-primary" />
            <span className="text-base font-semibold tracking-tight">
              Emberline
            </span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Trend &amp; moving average research
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Pull live OHLCV data for any ticker and see SMA 20 / 50 / 200
            trend classification at a glance.
          </p>
        </motion.div>

        <div className="mt-8">
          <TickerSearch
            ticker={ticker}
            onTickerChange={setTicker}
            period={period}
            onPeriodChange={setPeriod}
            onSubmit={handleSubmit}
            onQuickSelect={handleQuickSelect}
            loading={status === "loading"}
            recentTickers={recent}
          />
        </div>

        <Separator className="my-10" />

        <AnimatePresence mode="wait">
          {status === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-1 flex-col items-center justify-center py-16 text-center"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent">
                <LineChartIcon className="h-6 w-6 text-accent-foreground" />
              </div>
              <h2 className="mt-5 text-lg font-medium">
                Search a ticker to get started
              </h2>
              <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
                Try one of the suggestions above, or type any symbol traded on
                a major exchange.
              </p>
            </motion.div>
          )}

          {status === "loading" && !data && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </div>
              <Skeleton className="h-[360px] rounded-xl" />
            </motion.div>
          )}

          {status === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Couldn&apos;t load that ticker</AlertTitle>
                <AlertDescription>
                  {errorMessage} Double-check the symbol and try again.
                </AlertDescription>
              </Alert>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => ticker.trim() && runSearch(ticker.trim(), period)}
              >
                Retry
              </Button>
            </motion.div>
          )}

          {data && status !== "error" && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-semibold tracking-tight">
                      {data.ticker}
                    </h2>
                    <TrendBadge trend={data.trend} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {data.date_range.from} &rarr; {data.date_range.to} &middot;{" "}
                    {data.data_points} sessions
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard
                  label="Latest Close"
                  value={data.latest_close}
                  helpText="Most recent session"
                  accent
                  delay={0}
                />
                <StatCard
                  label="SMA 20"
                  value={data.moving_averages.sma_20}
                  helpText="20-session average"
                  delay={0.05}
                />
                <StatCard
                  label="SMA 50"
                  value={data.moving_averages.sma_50}
                  helpText="50-session average"
                  delay={0.1}
                />
                <StatCard
                  label="SMA 200"
                  value={data.moving_averages.sma_200}
                  helpText="200-session average"
                  delay={0.15}
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-medium">
                    Price &amp; moving averages
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PriceChart series={data.series} />
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t border-border/60 py-6">
        <div className="mx-auto max-w-5xl px-6 text-xs text-muted-foreground">
          Market data via yfinance. For research purposes only — not
          investment advice.
        </div>
      </footer>
    </div>
  );
}
