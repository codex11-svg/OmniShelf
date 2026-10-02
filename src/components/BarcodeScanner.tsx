"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, ScanLine, Volume2 } from "lucide-react";
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
  const feedbackEnabledRef = useRef(false);
  const [scanning, setScanning] = useState(false);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [activeCamera, setActiveCamera] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState("");
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [feedbackEnabled, setFeedbackEnabled] = useState(false);

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
          if (feedbackEnabledRef.current) {
            if ("vibrate" in navigator) navigator.vibrate?.(60);
            try {
              const context = new AudioContext();
              const tone = context.createOscillator();
              const volume = context.createGain();
              tone.frequency.value = 880;
              volume.gain.value = 0.08;
              tone.connect(volume);
              volume.connect(context.destination);
              tone.start();
              tone.stop(context.currentTime + 0.07);
              tone.onended = () => void context.close();
            } catch {
              // Audio feedback is optional and can be blocked by the browser.
            }
          }
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
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <ScanLine aria-hidden="true" size={17} /> Barcode scanner
        </h3>
        {scanning ? (
          <button
            onClick={stopScanner}
            className="rounded-md bg-rose-700 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-800"
          >
            Stop scanning
          </button>
        ) : (
          <button
            onClick={() => startScanner(activeCamera ?? undefined)}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-800 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-900"
          >
            <Camera aria-hidden="true" size={15} /> Start scan
          </button>
        )}
      </div>

      {/* Camera viewport */}
      <div className={`relative overflow-hidden rounded-md bg-slate-950 ${compact ? "h-48" : "h-64"}`}>
        <div id={scannerId} className="h-full w-full" />
        {scanning && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-28 w-[82%] max-w-sm rounded-md border border-white/30">
              <span className="absolute -left-px -top-px h-5 w-5 border-l-2 border-t-2 border-emerald-300" />
              <span className="absolute -right-px -top-px h-5 w-5 border-r-2 border-t-2 border-emerald-300" />
              <span className="absolute -bottom-px -left-px h-5 w-5 border-b-2 border-l-2 border-emerald-300" />
              <span className="absolute -bottom-px -right-px h-5 w-5 border-b-2 border-r-2 border-emerald-300" />
              <span className="absolute left-2 right-2 top-1/2 h-px bg-emerald-300/80" />
            </div>
          </div>
        )}
        {!scanning && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center text-white">
            <Camera aria-hidden="true" size={28} className="text-white/80" />
            <div className="mt-2 text-xs text-white/70">
              Start scanning to activate the camera
            </div>
          </div>
        )}
      </div>

      {cameraError && (
        <div role="alert" className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {cameraError}
        </div>
      )}

      {lastScanned && (
        <div role="status" className="mt-2 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          <Check aria-hidden="true" size={14} /> Last scan: <code className="font-mono font-bold">{lastScanned}</code>
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
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={`${scannerId}-feedback`} className="inline-flex items-center gap-2 text-xs text-slate-600">
          <input
            id={`${scannerId}-feedback`}
            type="checkbox"
            checked={feedbackEnabled}
            onChange={(event) => {
              feedbackEnabledRef.current = event.target.checked;
              setFeedbackEnabled(event.target.checked);
            }}
            className="accent-emerald-800"
          />
          <Volume2 aria-hidden="true" size={14} /> Scan sound and vibration
        </label>
        <span className="text-[11px] text-slate-500">Optional device feedback</span>
      </div>

      <form onSubmit={handleManualSubmit} className="mt-3">
        <label htmlFor={`${scannerId}-manual`} className="text-xs font-semibold text-slate-700">
          Enter UPC or EAN manually
        </label>
        <div className="mt-1 flex gap-2">
          <input
            id={`${scannerId}-manual`}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Enter barcode digits"
            className="min-w-0 flex-1 rounded-md border border-slate-200 px-3 py-2 font-mono text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-emerald-800 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-900"
          >
            Lookup
          </button>
        </div>
      </form>
    </div>
  );
}
