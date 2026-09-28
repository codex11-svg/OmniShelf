"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

type ScannerProps = {
  onScan: (barcode: string) => void;
  onError?: (error: string) => void;
  onManual?: (barcode: string) => void;
  scannerId?: string;
  autoStopOnScan?: boolean;
  compact?: boolean;
  active?: boolean;
};

export function BarcodeScanner({
  onScan,
  onError,
  onManual,
  scannerId = "barcode-reader",
  autoStopOnScan = true,
  compact = false,
  active = true,
}: ScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const activeRef = useRef(active);
  const startTokenRef = useRef(0);
  const [scanning, setScanning] = useState(false);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [activeCamera, setActiveCamera] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState("");
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Enumerate cameras
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) return;
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        const cams = devices
          .filter((d) => d.kind === "videoinput")
          .map((d, i) => ({
            id: d.deviceId,
            label: d.label || `Camera ${i + 1}`,
          }));
        setCameras(cams);
      })
      .catch(() => {});
  }, []);

  async function startScanner(cameraId?: string) {
    if (!activeRef.current) return;
    const startToken = ++startTokenRef.current;
    setCameraError(null);
    try {
      const previousScanner = scannerRef.current;
      if (previousScanner) {
        try {
          await previousScanner.stop();
        } catch {}
        try {
          previousScanner.clear();
        } catch {}
      }

      const scanner = new Html5Qrcode(scannerId);
      scannerRef.current = scanner;

      const config = {
        fps: 12,
        qrbox: compact ? { width: 200, height: 140 } : { width: 280, height: 180 },
        aspectRatio: 1.777,
      };

      const cameraConfig = cameraId
        ? { deviceId: { exact: cameraId } }
        : { facingMode: "environment" };

      await scanner.start(
        cameraConfig,
        config,
        (decodedText) => {
          setLastScanned(decodedText);
          onScan(decodedText);
          if (autoStopOnScan) {
            scanner.stop().catch(() => {});
            setScanning(false);
          }
        },
        () => {
          // Ignore scan errors (no barcode in frame)
        }
      );

      if (!activeRef.current || startToken !== startTokenRef.current) {
        try {
          await scanner.stop();
        } catch {}
        return;
      }
      setScanning(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Camera access denied";
      setCameraError(msg);
      onError?.(msg);
      setScanning(false);
    }
  }

  async function stopScanner() {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {}
    }
    setScanning(false);
  }

  useEffect(() => {
    activeRef.current = active;
    if (active) return;
    startTokenRef.current += 1;
    const scanner = scannerRef.current;
    if (!scanner) return;
    void (async () => {
      try {
        await scanner.stop();
      } catch {}
      setScanning(false);
    })();
  }, [active]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const scanner = scannerRef.current;
      if (scanner) {
        void (async () => {
          try {
            await scanner.stop();
          } catch {}
        })();
      }
    };
  }, []);

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualInput.trim()) return;
    setLastScanned(manualInput.trim());
    onScan(manualInput.trim());
    onManual?.(manualInput.trim());
    setManualInput("");
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
          📷 Barcode Scanner
        </h3>
        {scanning ? (
          <button
            onClick={stopScanner}
            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
          >
            ⏹ Stop
          </button>
        ) : (
          <button
            onClick={() => startScanner(activeCamera ?? undefined)}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            📸 Start Scan
          </button>
        )}
      </div>

      {/* Camera viewport */}
      <div className={`relative overflow-hidden rounded-xl bg-slate-900 ${compact ? "h-48" : "h-64"}`}>
        <div id={scannerId} className="h-full w-full" />
        {!scanning && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center text-white">
            <div className="text-4xl">📱</div>
            <div className="mt-2 text-xs opacity-70">
              Click &quot;Start Scan&quot; to activate camera
            </div>
          </div>
        )}
      </div>

      {cameraError && (
        <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          ⚠️ {cameraError}
        </div>
      )}

      {lastScanned && (
        <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          ✓ Last scan: <code className="font-mono font-bold">{lastScanned}</code>
        </div>
      )}

      {/* Camera selector */}
      {cameras.length > 1 && (
        <div className="mt-2">
          <label className="text-xs font-semibold text-slate-700">Camera:</label>
          <select
            value={activeCamera ?? ""}
            onChange={(e) => {
              setActiveCamera(e.target.value || null);
              if (scanning) startScanner(e.target.value || undefined);
            }}
            className="ml-2 rounded border border-slate-200 bg-white px-2 py-1 text-xs"
          >
            <option value="">Auto (rear camera)</option>
            {cameras.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Manual barcode input */}
      <form onSubmit={handleManualSubmit} className="mt-3">
        <label className="text-xs font-semibold text-slate-700">
          Or enter barcode manually:
        </label>
        <div className="mt-1 flex gap-2">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="e.g., 8901187110018"
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm"
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
          >
            Lookup
          </button>
        </div>
      </form>
    </div>
  );
}
