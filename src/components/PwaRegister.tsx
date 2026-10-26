"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { RefreshCw, WifiOff } from "lucide-react";
import { usePosQueue } from "@/lib/usePosQueue";

function subscribeToNetwork(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function getOnlineSnapshot() {
  return navigator.onLine;
}

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function PwaRegister() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const isOnline = useSyncExternalStore(subscribeToNetwork, getOnlineSnapshot, () => true);
  // Counter bills taken while offline sit in a device outbox. Anything else typed into
  // a form does not sync, so the banner below says exactly that.
  const { pendingCount, syncing, syncNow } = usePosQueue();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
      console.error("OmniShelf service worker registration failed:", error);
    });

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleInstalled = () => setInstallPrompt(null);

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  return (
    <>
      {(!isOnline || pendingCount > 0) && (
        <div role="status" className="fixed inset-x-3 bottom-3 z-[60] mx-auto flex max-w-xl items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 shadow-lg sm:inset-x-6">
          <WifiOff aria-hidden="true" size={17} className="shrink-0 text-amber-600" />
          <span className="flex-1">
            {!isOnline
              ? "You're offline. Counter bills you take are saved on this device and recorded once the connection returns; other screens are read-only."
              : `${pendingCount} counter bill${pendingCount === 1 ? "" : "s"} waiting to sync.`}
          </span>
          {pendingCount > 0 && (
            <button
              type="button"
              onClick={() => void syncNow()}
              disabled={syncing}
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-amber-300 bg-white px-2 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
            >
              <RefreshCw aria-hidden="true" size={12} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Syncing…" : "Sync now"}
            </button>
          )}
        </div>
      )}
      {installPrompt && (
        <button
          type="button"
          onClick={installApp}
          className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-100"
        >
          Install app
        </button>
      )}
    </>
  );
}
