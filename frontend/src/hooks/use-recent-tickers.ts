"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "emberline:recent-tickers";
const MAX_RECENT = 5;

export function useRecentTickers() {
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrating from localStorage, an external system
      if (stored) setRecent(JSON.parse(stored));
    } catch {
      // localStorage unavailable — recent tickers just won't persist
    }
  }, []);

  function addRecent(ticker: string) {
    setRecent((prev) => {
      const next = [ticker, ...prev.filter((t) => t !== ticker)].slice(
        0,
        MAX_RECENT,
      );
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore persistence failures
      }
      return next;
    });
  }

  return { recent, addRecent };
}
