"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, Volume2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SiteHeader } from "@/components/site-header";
import { StageBadge } from "@/components/stage-badge";
import { StatCard } from "@/components/stat-card";
import { PathChart } from "@/components/path-chart";
import {
  fetchPathDetail,
  ApiRequestError,
  type PathDetailResponse,
} from "@/lib/api";

type Status = "loading" | "success" | "error";

export default function PathDetailPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = use(params);
  const symbol = ticker.toUpperCase();

  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<PathDetailResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const activeRequest = useRef<AbortController | null>(null);

  function runFetch() {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;

    setStatus("loading");
    setErrorMessage("");

    fetchPathDetail(symbol, controller.signal)
      .then((result) => {
        setData(result);
        setStatus("success");
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setStatus("error");
        setErrorMessage(
          err instanceof ApiRequestError
            ? err.message
            : "Something went wrong loading this ticker.",
        );
      });
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetching from the API, an external system
    runFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-12">
        <Link
          href="/scanner"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to scanner
        </Link>

        <AnimatePresence mode="wait">
          {status === "loading" && !data && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-6 space-y-6"
            >
              <Skeleton className="h-9 w-48 rounded-lg" />
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </div>
              <Skeleton className="h-96 rounded-xl" />
            </motion.div>
          )}

          {status === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-6"
            >
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Couldn&apos;t load {symbol}</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
              <Button variant="outline" className="mt-4" onClick={runFetch}>
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
              className="mt-6 space-y-6"
            >
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold tracking-tight">
                  {data.ticker}
                </h1>
                <StageBadge stage={data.stage} />
                {data.high_volume && (
                  <span className="inline-flex items-center gap-1 text-sm text-bullish">
                    <Volume2 className="h-4 w-4" />
                    {data.volume_vs_avg}x avg volume
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard
                  label="Last Close"
                  value={data.last_close}
                  helpText="Most recent session"
                  accent
                  delay={0}
                />
                <StatCard
                  label="All-Time High"
                  value={data.ath}
                  helpText="Highest close, 5y lookback"
                  delay={0.05}
                />
                <StatCard
                  label="PATH"
                  value={data.path}
                  helpText="Previous all-time high (key level)"
                  delay={0.1}
                />
                <StatCard
                  label="SMA 20"
                  value={data.sma20}
                  helpText="20-session average"
                  delay={0.15}
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-medium">
                    Price vs. PATH / ATH
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PathChart series={data.series} ath={data.ath} path={data.path} />
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
