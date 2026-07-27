"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  type TooltipContentProps,
} from "recharts";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FIB_RATIOS,
  GOLDEN_RATIO,
  type ChartInterval,
  type FibonacciLevels,
  type FibRatio,
  type PathSeriesPoint,
} from "@/lib/api";

const CHART_PERIODS = [
  { value: "3mo", label: "3M", months: 3 },
  { value: "6mo", label: "6M", months: 6 },
  { value: "1y", label: "1Y", months: 12 },
  { value: "2y", label: "2Y", months: 24 },
  { value: "5y", label: "5Y", months: null },
] as const;

function sliceByPeriod(series: PathSeriesPoint[], months: number | null) {
  if (months === null || series.length === 0) return series;
  const lastDate = new Date(series[series.length - 1].date);
  const cutoff = new Date(lastDate);
  cutoff.setMonth(cutoff.getMonth() - months);
  return series.filter((point) => new Date(point.date) >= cutoff);
}

function formatDate(date: string, interval: ChartInterval) {
  const d = new Date(date);
  if (interval === "1h") {
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
    });
  }
  const month = d.toLocaleDateString(undefined, { month: "short" });
  return `${month} '${d.toLocaleDateString(undefined, { year: "2-digit" })}`;
}

function ChartTooltip({
  active,
  payload,
  label,
  interval,
}: TooltipContentProps & { interval: ChartInterval }) {
  if (!active || !payload?.length) return null;

  const byKey = new Map<string, (typeof payload)[number]>();
  for (const entry of payload) byKey.set(String(entry.dataKey), entry);
  const rows = Array.from(byKey.values());

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="mb-1.5 font-medium text-popover-foreground">
        {label
          ? interval === "1h"
            ? new Date(label).toLocaleString()
            : new Date(label).toLocaleDateString()
          : ""}
      </p>
      <div className="space-y-1">
        {rows.map((entry) => (
          <div key={String(entry.dataKey)} className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="ml-auto font-medium tabular-nums text-popover-foreground">
              {typeof entry.value === "number" ? `$${entry.value.toFixed(2)}` : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PathChart({
  series,
  ath,
  path,
  fibonacci,
  interval,
  onIntervalChange,
}: {
  series: PathSeriesPoint[];
  ath: number | null;
  path: number | null;
  fibonacci: FibonacciLevels | null;
  interval: ChartInterval;
  onIntervalChange: (interval: ChartInterval) => void;
}) {
  const [period, setPeriod] = useState("1y");

  const visibleSeries = useMemo(() => {
    if (interval === "1h") return series;
    const months = CHART_PERIODS.find((p) => p.value === period)?.months ?? null;
    return sliceByPeriod(series, months);
  }, [series, period, interval]);

  const smaLabel = interval === "1h" ? "SMA 20 (1h)" : "SMA 20";

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={interval} onValueChange={(v) => onIntervalChange(v as ChartInterval)}>
          <TabsList>
            <TabsTrigger value="1d" className="min-w-12 px-1.5 text-xs sm:min-w-16 sm:px-1.5 sm:text-sm">
              Daily
            </TabsTrigger>
            <TabsTrigger value="1h" className="min-w-12 px-1.5 text-xs sm:min-w-16 sm:px-1.5 sm:text-sm">
              Hourly
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {interval === "1d" && (
          <Tabs value={period} onValueChange={setPeriod}>
            <TabsList>
              {CHART_PERIODS.map((p) => (
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
        )}
      </div>
      <div className="overflow-x-auto">
        <div className="h-96 w-full min-w-[640px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={visibleSeries} margin={{ top: 8, right: 64, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="pathCloseFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tickFormatter={(d: string) => formatDate(d, interval)}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
                axisLine={{ stroke: "var(--color-border)" }}
                tickLine={false}
                minTickGap={64}
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `$${v.toFixed(0)}`}
                width={56}
              />
              <Tooltip content={(props) => <ChartTooltip {...props} interval={interval} />} />
              <Area
                type="monotone"
                dataKey="close"
                stroke="none"
                fill="url(#pathCloseFill)"
                isAnimationActive
              />
              {fibonacci &&
                FIB_RATIOS.map((ratio: FibRatio) => {
                  const isGolden = ratio === GOLDEN_RATIO;
                  return (
                    <ReferenceLine
                      key={ratio}
                      y={fibonacci.levels[ratio]}
                      stroke="var(--color-chart-5)"
                      strokeDasharray={isGolden ? undefined : "2 3"}
                      strokeWidth={isGolden ? 1.5 : 1}
                      strokeOpacity={isGolden ? 0.9 : 0.45}
                      label={{
                        value: `${(parseFloat(ratio) * 100).toFixed(1)}%`,
                        position: "insideBottomLeft",
                        dx: 4,
                        dy: -2,
                        fill: "var(--color-chart-5)",
                        fontSize: 10,
                        fontWeight: isGolden ? 700 : 400,
                      }}
                    />
                  );
                })}
              {ath !== null && (
                <ReferenceLine
                  y={ath}
                  stroke="var(--color-chart-4)"
                  strokeDasharray="5 5"
                  label={{
                    value: `$${ath.toFixed(0)}`,
                    position: "right",
                    dy: -8,
                    fill: "var(--color-chart-4)",
                    fontSize: 11,
                  }}
                />
              )}
              {path !== null && (
                <ReferenceLine
                  y={path}
                  stroke="var(--color-watching)"
                  strokeDasharray="5 5"
                  label={{
                    value: `$${path.toFixed(0)}`,
                    position: "right",
                    dy: 8,
                    fill: "var(--color-watching)",
                    fontSize: 11,
                  }}
                />
              )}
              <Line
                type="monotone"
                dataKey="close"
                name="Close"
                stroke="var(--color-chart-1)"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive
                animationDuration={900}
                animationEasing="ease-out"
              />
              <Line
                type="monotone"
                dataKey="sma_20"
                name={smaLabel}
                stroke="var(--color-chart-2)"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive
                animationDuration={900}
                animationEasing="ease-out"
                animationBegin={120}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--color-chart-1)" }} />
          Close
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--color-chart-2)" }} />
          {smaLabel}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--color-chart-4)" }} />
          ATH
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--color-watching)" }} />
          PATH
        </div>
        {fibonacci && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--color-chart-5)" }} />
            Fib 61.8% (golden ratio)
          </div>
        )}
      </div>
    </div>
  );
}
