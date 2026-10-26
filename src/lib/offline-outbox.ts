/**
 * Device-side outbox for counter sales taken while the network is down.
 *
 * A shop on a mobile hotspot drops connectivity mid-bill all the time, and a POS that
 * simply fails the sale is unusable. Instead, the bill is written to IndexedDB with a
 * client-generated idempotency key and replayed when the connection returns. The key is
 * what makes replay safe: `completePosSale` takes a transaction-scoped advisory lock on
 * it, so a bill that syncs twice (retry after a dropped response, a second browser tab,
 * a manual "sync now" during an automatic flush) only ever decrements stock once.
 *
 * Only bills that are already on screen can be queued — the product catalogue arrives
 * with the server-rendered page, so a cold offline start still shows the reconnect
 * screen. Private store pages are deliberately not cached; see README "Install and sign
 * up".
 */

import { completePosSale } from "@/lib/actions";
import type { PosPaymentMode } from "@/lib/pos-types";

const DB_NAME = "omnishelf-offline";
const DB_VERSION = 1;
const STORE_NAME = "sales";

export type QueuedSalePayload = {
  items: Array<{ productId: string; quantity: number }>;
  paymentMode: PosPaymentMode;
  paymentRef?: string;
  customerName?: string;
  customerPhone?: string;
  patientName?: string;
  doctorName?: string;
  prescriptionKey?: string;
  heldTabId?: string;
};

export type QueuedSaleLine = {
  name: string;
  quantity: number;
  unitPrice: number;
};

export type QueuedSale = {
  key: string;
  queuedAt: string;
  attempts: number;
  lastError: string | null;
  itemCount: number;
  total: number;
  lines: QueuedSaleLine[];
  payload: QueuedSalePayload;
};

export type FlushOutcome = {
  synced: QueuedSale[];
  blocked: Array<{ sale: QueuedSale; error: string }>;
  remaining: number;
};

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
          const database = request.result;
          if (!database.objectStoreNames.contains(STORE_NAME)) {
            database.createObjectStore(STORE_NAME, { keyPath: "key" });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
        request.onblocked = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  return dbPromise;
}

function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T | null> {
  return openDb().then(
    (database) =>
      new Promise<T | null>((resolve) => {
        if (!database) {
          resolve(null);
          return;
        }
        try {
          const transaction = database.transaction(STORE_NAME, mode);
          const request = run(transaction.objectStore(STORE_NAME));
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      })
  );
}

function sortByQueuedAt(sales: QueuedSale[]): QueuedSale[] {
  return [...sales].sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
}

async function readAll(): Promise<QueuedSale[]> {
  const rows = await withStore<QueuedSale[]>("readonly", (store) => store.getAll() as IDBRequest<QueuedSale[]>);
  return sortByQueuedAt(Array.isArray(rows) ? rows : []);
}

/**
 * Keys must satisfy the server-side `idempotencyKey` pattern (`/^[A-Za-z0-9_-]{16,64}$/`).
 * Generated once per bill, before the first send attempt, so a retry reuses it.
 */
export function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const random = Math.random().toString(36).slice(2, 12).padEnd(10, "0");
  return `osk-${Date.now().toString(36)}-${random}`.slice(0, 64);
}

export function isDeviceOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine !== false;
}

// ---- Snapshot store, so any component can render the pending count ----

let snapshot: QueuedSale[] = [];
let flushInFlight: Promise<FlushOutcome> | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribeOutbox(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getOutboxSnapshot(): QueuedSale[] {
  return snapshot;
}

export async function refreshOutbox(): Promise<QueuedSale[]> {
  snapshot = await readAll();
  emit();
  return snapshot;
}

export async function enqueueSale(
  key: string,
  payload: QueuedSalePayload,
  lines: QueuedSaleLine[]
): Promise<QueuedSale | null> {
  const total = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const entry: QueuedSale = {
    key,
    queuedAt: new Date().toISOString(),
    attempts: 0,
    lastError: null,
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    total: Math.round(total * 100) / 100,
    lines,
    payload,
  };
  const written = await withStore<IDBValidKey>("readwrite", (store) => store.put(entry));
  if (written === null) return null;
  await refreshOutbox();
  return entry;
}

export async function discardQueuedSale(key: string): Promise<void> {
  await withStore<undefined>("readwrite", (store) => store.delete(key));
  await refreshOutbox();
}

async function recordAttempt(key: string, error: string | null): Promise<void> {
  const existing = await withStore<QueuedSale>("readonly", (store) => store.get(key) as IDBRequest<QueuedSale>);
  if (!existing) return;
  const updated: QueuedSale = { ...existing, attempts: existing.attempts + 1, lastError: error };
  await withStore<IDBValidKey>("readwrite", (store) => store.put(updated));
}

/**
 * Replays queued bills oldest-first, one at a time. Sequential on purpose: it keeps
 * receipt order matching the order the clerk actually served, and it avoids two queued
 * bills racing for the same last unit of stock.
 *
 * A transport failure leaves the bill queued and stops the run — the network is still
 * down, so hammering the rest of the queue achieves nothing. A business rejection
 * (item sold out while the bill sat in the queue) is recorded on the entry so the clerk
 * can see why it did not sync and void it deliberately.
 */
export async function flushOutbox(): Promise<FlushOutcome> {
  // Several components can mount at once (nav badge + POS tab). Concurrent flushes would
  // each replay the same bill; the server's idempotency key makes that harmless but it
  // still wastes round trips, so only one run happens at a time per tab.
  if (flushInFlight) return flushInFlight;
  flushInFlight = runFlush().finally(() => {
    flushInFlight = null;
  });
  return flushInFlight;
}

async function runFlush(): Promise<FlushOutcome> {
  const pending = await readAll();
  const synced: QueuedSale[] = [];
  const blocked: Array<{ sale: QueuedSale; error: string }> = [];

  for (const sale of pending) {
    let result: Awaited<ReturnType<typeof completePosSale>>;
    try {
      result = await completePosSale({
        ...sale.payload,
        idempotencyKey: sale.key,
        queuedOffline: true,
      });
    } catch {
      await recordAttempt(sale.key, null);
      break;
    }

    if (result.ok) {
      await withStore<undefined>("readwrite", (store) => store.delete(sale.key));
      synced.push(sale);
    } else {
      const error = result.error ?? "This bill could not be recorded.";
      await recordAttempt(sale.key, error);
      blocked.push({ sale, error });
    }
  }

  snapshot = await readAll();
  emit();
  return { synced, blocked, remaining: snapshot.length };
}
