"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy } from "lucide-react";
import { formatDate } from "@/lib/formatDate";
import { generateApiKey, revokeApiKey } from "@/lib/actions";
import type { ApiKey } from "./types";

type Props = {
  apiKeys: ApiKey[];
};

const DEFAULT_SCOPES = "inventory:read,inventory:write,pos:write";

export function ApiKeysPanel({ apiKeys }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState(DEFAULT_SCOPES);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issuedKey, setIssuedKey] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Give the key a name so you can recognise it later.");
      return;
    }

    setBusy(true);
    try {
      const result = await generateApiKey(name.trim(), scopes.trim() || DEFAULT_SCOPES);
      if (!result.ok || !result.apiKey) {
        setError(result.error ?? "Could not generate the key.");
        return;
      }
      setIssuedKey(result.apiKey);
      setName("");
      setScopes(DEFAULT_SCOPES);
      router.refresh();
    } catch {
      setError("Could not generate the key.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke(keyId: string) {
    setRevokingId(keyId);
    setConfirmingId(null);
    setError(null);
    try {
      const result = await revokeApiKey(keyId);
      if (!result.ok) {
        setError(result.error ?? "Could not revoke the key.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not revoke the key.");
    } finally {
      setRevokingId(null);
    }
  }

  async function copyIssuedKey() {
    if (!issuedKey) return;
    try {
      await navigator.clipboard.writeText(issuedKey);
      setCopied(true);
    } catch {
      setError("Clipboard access is unavailable. Select and copy the key manually.");
    }
  }

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">API Keys & Integrations</h3>
          <p className="text-xs text-slate-500">
            Connect POS terminals, barcode printers, accounting software
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen((value) => !value);
            setError(null);
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          {open ? "Hide" : "Manage"}
        </button>
      </div>

      {open && (
        <div className="space-y-2">
          {error && (
            <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </div>
          )}

          {issuedKey && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
              <div className="font-semibold">Save this key now. It will not be shown again.</div>
              <code className="mt-1 block break-all rounded bg-white px-2 py-1 font-mono text-[11px]">
                {issuedKey}
              </code>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={copyIssuedKey} className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-white px-3 py-2 font-semibold text-emerald-900 hover:bg-emerald-50">
                  {copied ? <Check aria-hidden="true" size={14} /> : <Copy aria-hidden="true" size={14} />}
                  {copied ? "Copied" : "Copy key"}
                </button>
                <button
                  type="button"
                  onClick={() => { setIssuedKey(null); setCopied(false); }}
                  className="rounded-md border border-emerald-300 bg-white px-3 py-2 font-semibold text-emerald-900 hover:bg-emerald-50"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {apiKeys.length === 0 && (
            <div className="py-4 text-center text-xs text-slate-500">
              No API keys. Create one to connect external systems.
            </div>
          )}

          {apiKeys.map((key) => (
            <div key={key.id} className="rounded-md border border-slate-200 bg-white p-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{key.name}</span>
                    <span className={`chip ${key.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>
                      {key.active ? "Active" : "Revoked"}
                    </span>
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] text-slate-600">
                    ••••••••••••{key.last4} · {key.scopes.split(",").length} scopes · created {formatDate(key.createdAt)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmingId(confirmingId === key.id ? null : key.id)}
                  disabled={!key.active || revokingId === key.id}
                  className="rounded-md border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-50 disabled:opacity-40"
                >
                  {revokingId === key.id ? "Revoking…" : "Revoke"}
                </button>
              </div>
              {confirmingId === key.id && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                  <p className="text-xs text-slate-700">Revoke this key? Connected systems will lose access.</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setConfirmingId(null)} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                      Cancel
                    </button>
                    <button type="button" onClick={() => handleRevoke(key.id)} disabled={revokingId === key.id} className="rounded-md bg-rose-700 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-800 disabled:opacity-50">
                      Confirm revoke
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          <form onSubmit={handleGenerate} className="mt-2 space-y-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-3">
            <div className="text-xs font-bold text-slate-700">Generate new API key</div>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Key name (e.g. Counter POS terminal)"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
            />
            <input
              value={scopes}
              onChange={(event) => setScopes(event.target.value)}
              placeholder="Scopes (comma separated)"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-[11px]"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-slate-900 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {busy ? "Generating…" : "Generate key"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
