"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, RefreshCw, RotateCcw, Volume2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SiteHeader } from "@/components/site-header";
import { StageBadge } from "@/components/stage-badge";
import {
  fetchLeaders,
  fetchPathSetups,
  refreshLeaders,
  ApiRequestError,
  type Leader,
  type PathSetup,
} from "@/lib/api";

type Status = "loading" | "success" | "error";
type Row = Leader & Partial<PathSetup>;

const ACTIONABLE_STAGES = new Set(["entry_1_path_reclaim", "entry_2_sma20_reclaim"]);

export default function ScannerPage() {
  const [status, setStatus] = useState<Status>("loading");
  const [rows, setRows] = useState<Row[]>([]);
  const [benchmark, setBenchmark] = useState<{ ytd: number; threshold: number } | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const activeRequest = useRef<AbortController | null>(null);

  function runScan() {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;

    setStatus("loading");
    setErrorMessage("");

    fetchLeaders(controller.signal)
      .then(async (leadersRes) => {
        setBenchmark({
          ytd: leadersRes.benchmark_ytd_return_pct,
          threshold: leadersRes.outperformance_threshold_pct,
        });
        setGeneratedAt(leadersRes.generated_at);
        const tickers = leadersRes.leaders.map((l) => l.ticker);
        const pathRes = tickers.length
          ? await fetchPathSetups(tickers, controller.signal)
          : { tickers: [], results: [] };

        const byTicker = new Map(pathRes.results.map((r) => [r.ticker, r]));
        const combined = leadersRes.leaders.map((leader) => ({
          ...leader,
          ...byTicker.get(leader.ticker),
        }));

        setRows(combined);
        setStatus("success");
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setStatus("error");
        setErrorMessage(
          err instanceof ApiRequestError
            ? err.message
            : "Something went wrong running the scan.",
        );
      });
  }

  async function handleRegenerate() {
    if (
      !window.confirm(
        "Regenerate the watchlist? This replaces the current tickers with a fresh top-20 scan.",
      )
    ) {
      return;
    }

    setRegenerating(true);
    try {
      await refreshLeaders();
      runScan();
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof ApiRequestError
          ? err.message
          : "Couldn't regenerate the watchlist.",
      );
    } finally {
      setRegenerating(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetching from the API, an external system
    runScan();
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-12 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-wrap items-end justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Leaders scanner
            </h1>
            <p className="mt-2 max-w-xl text-muted-foreground">
              A fixed watchlist of up to 20 leaders outperforming the S&amp;P
              500 by 2x YTD across Tech/AI/Semis, Energy, Equipment, and
              Gas/Oil, tracked against their PATH breakout-retest / pullback
              setup. The list only changes when you regenerate it.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={runScan}
              disabled={status === "loading" || regenerating}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${status === "loading" ? "animate-spin" : ""}`}
              />
              Rescan
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={status === "loading" || regenerating}
            >
              <RotateCcw
                className={`h-3.5 w-3.5 ${regenerating ? "animate-spin" : ""}`}
              />
              Regenerate watchlist
            </Button>
          </div>
        </motion.div>

        {benchmark && (
          <p className="mt-4 text-sm text-muted-foreground">
            S&amp;P 500 YTD:{" "}
            <span className="font-medium text-foreground">
              {benchmark.ytd.toFixed(2)}%
            </span>{" "}
            &middot; 2x outperformance bar:{" "}
            <span className="font-medium text-foreground">
              {benchmark.threshold.toFixed(2)}%
            </span>
            {generatedAt && (
              <>
                {" "}
                &middot; watchlist locked{" "}
                <span className="font-medium text-foreground">
                  {new Date(generatedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </>
            )}
          </p>
        )}

        <div className="mt-8">
          <AnimatePresence mode="wait">
            {status === "loading" && rows.length === 0 && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-11 rounded-lg" />
                ))}
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
                  <AlertTitle>Couldn&apos;t run the scan</AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
                <Button variant="outline" className="mt-4" onClick={runScan}>
                  Retry
                </Button>
              </motion.div>
            )}

            {status === "success" && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <Card className="py-0">
                  <CardHeader className="border-b py-4">
                    <CardTitle className="text-base font-medium">
                      {rows.length} leaders
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-0 pb-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ticker</TableHead>
                          <TableHead>Sector</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead className="text-right">YTD</TableHead>
                          <TableHead className="text-right">vs. 2x SPX</TableHead>
                          <TableHead>Setup</TableHead>
                          <TableHead className="text-right">Volume</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((row) => (
                          <TableRow
                            key={row.ticker}
                            className={
                              row.stage && ACTIONABLE_STAGES.has(row.stage)
                                ? "bg-bullish/5 hover:bg-bullish/10"
                                : undefined
                            }
                          >
                            <TableCell className="font-medium">
                              <Link
                                href={`/scanner/${row.ticker}`}
                                className="hover:text-primary hover:underline"
                              >
                                {row.ticker}
                              </Link>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {row.sector}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              ${row.price.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-bullish">
                              +{row.ytd_return_pct.toFixed(1)}%
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {row.meets_criteria === false ? (
                                <Tooltip>
                                  <TooltipTrigger className="inline-flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3 text-watching" />
                                    {row.outperformance_pct.toFixed(1)}%
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    No longer clears the 2x SPX / SMA bar —
                                    still tracked since the watchlist is fixed.
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <>+{row.outperformance_pct.toFixed(1)}%</>
                              )}
                            </TableCell>
                            <TableCell>
                              {row.stage ? (
                                <StageBadge stage={row.stage} />
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  {row.error ?? "—"}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {row.high_volume && (
                                <Tooltip>
                                  <TooltipTrigger className="inline-flex">
                                    <Volume2 className="h-4 w-4 text-bullish" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {row.volume_vs_avg}x average volume
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <footer className="border-t border-border/60 py-6">
        <div className="mx-auto max-w-5xl px-4 text-xs sm:px-6 text-muted-foreground">
          Market data via yfinance. For research purposes only — not
          investment advice.
        </div>
      </footer>
    </div>
  );
}
