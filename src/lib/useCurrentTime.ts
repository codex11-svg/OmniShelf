"use client";

import { useEffect, useState } from "react";

export function useCurrentTime() {
  const [currentTime, setCurrentTime] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setCurrentTime(Date.now());
    update();
    const interval = window.setInterval(update, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  return currentTime;
}