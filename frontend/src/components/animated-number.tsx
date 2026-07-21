"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useMotionValue, useMotionValueEvent } from "framer-motion";

export function AnimatedNumber({
  value,
  decimals = 2,
  prefix = "",
}: {
  value: number;
  decimals?: number;
  prefix?: string;
}) {
  const motionValue = useMotionValue(0);
  const [display, setDisplay] = useState("0");
  const previous = useRef(0);

  useMotionValueEvent(motionValue, "change", (latest) => {
    setDisplay(latest.toFixed(decimals));
  });

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 0.7,
      ease: [0.16, 1, 0.3, 1],
    });
    previous.current = value;
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <span>
      {prefix}
      {display}
    </span>
  );
}
