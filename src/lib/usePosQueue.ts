"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  flushOutbox,
  getOutboxSnapshot,
  isDeviceOnline,
  refreshOutbox,
  subscribeOutbox,
  type FlushOutcome,
  type QueuedSale,
} from "@/lib/offline-outbox";

function subscribeToNetwork(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/**
 * Wires the device outbox to the UI: pending bills, a manual/auto sync, and a refresh
 * of server-rendered stock and recent-bill lists once queued sales land.
 */
export function usePosQueue() {
  const router = useRouter();
  const queued = useSyncExternalStore<QueuedSale[]>(subscribeOutbox, getOutboxSnapshot, getOutboxSnapshot);
  const online = useSyncExternalStore(subscribeToNetwork, isDeviceOnline, () => true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<FlushOutcome | null>(null);
  const mountFlushed = useRef(false);
  const syncingRef = useRef(false);

  const syncNow = useCallback(async (): Promise<FlushOutcome | null> => {
    if (syncingRef.current) return null;
    syncingRef.current = true;
    setSyncing(true);
    try {
      const outcome = await flushOutbox();
      setLastSync(outcome);
      if (outcome.synced.length > 0) router.refresh();
      return outcome;
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [router]);

  useEffect(() => {
    // A bill queued in a previous visit is still waiting if the page was closed before
    // the connection came back, so retry it once on load.
    let cancelled = false;
    void refreshOutbox().then(() => {
      if (cancelled || mountFlushed.current) return;
      mountFlushed.current = true;
      if (getOutboxSnapshot().length > 0 && isDeviceOnline()) void syncNow();
    });

    const handleOnline = () => {
      void syncNow();
    };
    window.addEventListener("online", handleOnline);
    return () => {
      cancelled = true;
      window.removeEventListener("online", handleOnline);
    };
  }, [syncNow]);

  return {
    queued,
    pendingCount: queued.length,
    syncing,
    online,
    lastSync,
    syncNow,
    clearLastSync: () => setLastSync(null),
  };
}
