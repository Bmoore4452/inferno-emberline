"use client";

import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const PERIODS = [
  { value: "3mo", label: "3M" },
  { value: "6mo", label: "6M" },
  { value: "1y", label: "1Y" },
  { value: "2y", label: "2Y" },
  { value: "5y", label: "5Y" },
] as const;

const SUGGESTIONS = ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL"];

export function TickerSearch({
  ticker,
  onTickerChange,
  period,
  onPeriodChange,
  onSubmit,
  onQuickSelect,
  loading,
  recentTickers,
}: {
  ticker: string;
  onTickerChange: (value: string) => void;
  period: string;
  onPeriodChange: (value: string) => void;
  onSubmit: () => void;
  onQuickSelect: (ticker: string) => void;
  loading: boolean;
  recentTickers: string[];
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (ticker.trim() && !loading) onSubmit();
      }}
      className="w-full"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={ticker}
            onChange={(e) => onTickerChange(e.target.value.toUpperCase())}
            placeholder="Search a ticker (e.g. AAPL)"
            aria-label="Ticker symbol"
            maxLength={10}
            autoComplete="off"
            spellCheck={false}
            className="h-11 pl-9 pr-24 text-base tracking-wide uppercase placeholder:normal-case placeholder:tracking-normal"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!ticker.trim() || loading}
            className="absolute right-1.5 top-1.5 h-8"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analyze"}
          </Button>
        </div>

        <Tabs value={period} onValueChange={onPeriodChange}>
          <TabsList>
            {PERIODS.map((p) => (
              <TabsTrigger
                key={p.value}
                value={p.value}
                className="min-w-8 px-1 text-xs sm:min-w-11 sm:px-1.5 sm:text-sm"
              >
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {(recentTickers.length > 0 || !ticker) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {recentTickers.length > 0 ? "Recent:" : "Try:"}
          </span>
          {(recentTickers.length > 0 ? recentTickers : SUGGESTIONS).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onQuickSelect(t)}
              className={cn(
                "rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground",
                "transition-colors hover:border-primary/40 hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
