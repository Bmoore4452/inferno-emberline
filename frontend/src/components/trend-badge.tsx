import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Trend } from "@/lib/api";

const TREND_CONFIG: Record<
  Trend,
  { label: string; icon: typeof TrendingUp; className: string }
> = {
  strong_bullish: {
    label: "Strong Bullish",
    icon: TrendingUp,
    className: "bg-bullish/15 text-bullish border-bullish/30",
  },
  bullish: {
    label: "Bullish",
    icon: TrendingUp,
    className: "bg-bullish/10 text-bullish border-bullish/20",
  },
  neutral: {
    label: "Neutral",
    icon: Minus,
    className: "bg-muted text-muted-foreground border-border",
  },
  bearish: {
    label: "Bearish",
    icon: TrendingDown,
    className: "bg-bearish/10 text-bearish border-bearish/20",
  },
  strong_bearish: {
    label: "Strong Bearish",
    icon: TrendingDown,
    className: "bg-bearish/15 text-bearish border-bearish/30",
  },
};

export function TrendBadge({ trend }: { trend: Trend }) {
  const config = TREND_CONFIG[trend];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors",
        config.className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}
