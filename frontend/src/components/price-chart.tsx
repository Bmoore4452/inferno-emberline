"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  type TooltipContentProps,
} from "recharts";
import type { SeriesPoint } from "@/lib/api";

const LINES = [
  { key: "close", label: "Close", color: "var(--color-chart-1)", width: 2 },
  { key: "sma_20", label: "SMA 20", color: "var(--color-chart-2)", width: 1.5 },
  { key: "sma_50", label: "SMA 50", color: "var(--color-chart-3)", width: 1.5 },
  { key: "sma_200", label: "SMA 200", color: "var(--color-chart-4)", width: 1.5 },
] as const;

function formatDate(date: string) {
  const d = new Date(date);
  const month = d.toLocaleDateString(undefined, { month: "short" });
  // "Jul 26" reads as a day-of-month at a glance; "Jul '26" makes the
  // trailing number unambiguously a year.
  return `${month} '${d.toLocaleDateString(undefined, { year: "2-digit" })}`;
}

function ChartTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null;

  // The price Area and Line share dataKey="close" (fill + stroke for the same
  // series) — collapse to one tooltip row per dataKey, keeping the Line's entry
  // (declared after the Area, so it overwrites without disturbing row order).
  const byKey = new Map<string, (typeof payload)[number]>();
  for (const entry of payload) byKey.set(String(entry.dataKey), entry);
  const rows = Array.from(byKey.values());

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="mb-1.5 font-medium text-popover-foreground">
        {label ? new Date(label).toLocaleDateString() : ""}
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

export function PriceChart({ series }: { series: SeriesPoint[] }) {
  return (
    <div className="w-full">
      <div className="h-90 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="closeFill" x1="0" y1="0" x2="0" y2="1">
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
              tickFormatter={formatDate}
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
              axisLine={{ stroke: "var(--color-border)" }}
              tickLine={false}
              minTickGap={48}
            />
            <YAxis
              domain={["auto", "auto"]}
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `$${v.toFixed(0)}`}
              width={56}
            />
            <Tooltip content={(props) => <ChartTooltip {...props} />} />
            <Area
              type="monotone"
              dataKey="close"
              stroke="none"
              fill="url(#closeFill)"
              isAnimationActive
            />
            {LINES.map((line, i) => (
              <Line
                key={line.key}
                type="monotone"
                dataKey={line.key}
                name={line.label}
                stroke={line.color}
                strokeWidth={line.width}
                dot={false}
                isAnimationActive
                animationDuration={900}
                animationEasing="ease-out"
                animationBegin={i * 120}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        {LINES.map((line) => (
          <div key={line.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: line.color }}
            />
            {line.label}
          </div>
        ))}
      </div>
    </div>
  );
}
