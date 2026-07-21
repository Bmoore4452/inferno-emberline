"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/animated-number";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  helpText,
  accent = false,
  delay = 0,
}: {
  label: string;
  value: number | null;
  helpText: string;
  accent?: boolean;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="gap-3 py-5">
        <CardContent className="px-5">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p
            className={cn(
              "mt-1 text-2xl font-semibold tabular-nums tracking-tight",
              accent && "text-primary",
            )}
          >
            {value === null ? (
              <span className="text-muted-foreground/60">&mdash;</span>
            ) : (
              <AnimatedNumber value={value} prefix="$" />
            )}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{helpText}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
