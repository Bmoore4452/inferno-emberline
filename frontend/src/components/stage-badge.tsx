import { Rocket, Shield, Target, Eye, XCircle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PathStage } from "@/lib/api";

const STAGE_CONFIG: Record<
  PathStage,
  { label: string; icon: typeof Rocket; className: string }
> = {
  at_new_highs: {
    label: "At New Highs",
    icon: Rocket,
    className: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  },
  pulled_back_above_path: {
    label: "Above PATH",
    icon: Shield,
    className: "bg-muted text-muted-foreground border-border",
  },
  entry_1_path_reclaim: {
    label: "Entry 1: PATH Reclaim",
    icon: Target,
    className: "bg-bullish/15 text-bullish border-bullish/30",
  },
  below_path_above_sma20: {
    label: "Watching SMA20",
    icon: Eye,
    className: "bg-watching/10 text-watching border-watching/25",
  },
  entry_2_sma20_reclaim: {
    label: "Entry 2: SMA20 Reclaim",
    icon: Target,
    className: "bg-bullish/15 text-bullish border-bullish/30",
  },
  below_sma20_invalidated: {
    label: "Invalidated",
    icon: XCircle,
    className: "bg-bearish/10 text-bearish border-bearish/20",
  },
  insufficient_history: {
    label: "Insufficient History",
    icon: HelpCircle,
    className: "bg-muted text-muted-foreground border-border",
  },
};

export function StageBadge({ stage }: { stage: PathStage }) {
  const config = STAGE_CONFIG[stage];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        config.className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}
