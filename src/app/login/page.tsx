"use client";

import { useEffect, useState } from "react";
import { requestOtp, verifyAndLogin, impersonateDemo, listDemoAccounts, ensureSeeded } from "@/lib/actions";
import { useRouter } from "next/navigation";

type DemoAccount = Awaited<ReturnType<typeof listDemoAccounts>>[number];

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"otp" | "demo">("demo");
  const [phone, setPhone] = useState("+919000000001");
  const [step, setStep] = useState<"request" | "verify">("request");
  const [demoOtp, setDemoOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<DemoAccount[]>([]);
  const [demoAccessKey, setDemoAccessKey] = useState("");

  useEffect(() => {
    (async () => {
      await ensureSeeded(demoAccessKey);
      const list = await listDemoAccounts(demoAccessKey);
      setAccounts(list);
    })();
  }, [demoAccessKey]);

  async function handleRequestOtp() {
    setError(null);
    setLoading(true);
    const res = await requestOtp(phone);
    setLoading(false);
    if (!res.ok || !res.otp) {
      setError(res.error ?? "Failed to send OTP");
      return;
    }
    setDemoOtp(res.otp);
    setStep("verify");
  }

  async function handleVerify() {
    setError(null);
    setLoading(true);
    const res = await verifyAndLogin(phone, demoOtp);
    setLoading(false);
    if (!res.ok || !res.redirect) {
      setError(res.error ?? "Login failed");
      return;
    }
    router.push(res.redirect);
  }

  async function handleDemoClick(p: string | null) {
    if (!p) return; // Skip if no phone
    setError(null);
    setLoading(true);
    const res = await impersonateDemo(p, demoAccessKey);
    setLoading(false);
    if (!res.ok || !res.redirect) {
      setError(res.error ?? "Demo login failed");
      return;
    }
    router.push(res.redirect);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:py-16">
      <div className="grid gap-8 md:grid-cols-2">
        {/* Left: OTP flow */}
        <div className="card p-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            <span className="live-dot" /> 2026 Login
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Passwordless sign-in</h1>
          <p className="mt-1 text-sm text-slate-600">
            Local preview OTPs are shown on screen. Deployed phone sign-in requires an OTP delivery provider.
          </p>

          <div className="mt-5 flex gap-2 rounded-lg bg-slate-100 p-1 text-xs">
            <button
              onClick={() => setMode("demo")}
              className={`flex-1 rounded-md px-3 py-2 font-semibold ${mode === "demo" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
            >
              One-tap demo
            </button>
            <button
              onClick={() => setMode("otp")}
              className={`flex-1 rounded-md px-3 py-2 font-semibold ${mode === "otp" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
            >
              Phone OTP
            </button>
          </div>

          {mode === "otp" && (
            <div className="mt-5 space-y-3">
              {step === "request" ? (
                <>
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-700">Phone number (with country code)</span>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+9198XXXXXXXX"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </label>
                  <button
                    onClick={handleRequestOtp}
                    disabled={loading}
                    className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow disabled:opacity-60"
                  >
                    {loading ? "Requesting OTP…" : "Request phone OTP"}
                  </button>
                </>
              ) : (
                <>
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                    <div className="font-semibold">Demo mode — OTP delivered</div>
                    <div className="mt-1">Your code is: <span className="rounded bg-white px-1.5 py-0.5 font-mono font-bold">{demoOtp}</span></div>
                    <div className="mt-1 opacity-80">In production, this would arrive via WhatsApp Business Cloud API.</div>
                  </div>
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-700">6-digit OTP</span>
                    <input
                      value={demoOtp}
                      onChange={(e) => setDemoOtp(e.target.value)}
                      placeholder="••••••"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-center font-mono text-lg tracking-widest outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </label>
                  <button
                    onClick={handleVerify}
                    disabled={loading}
                    className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {loading ? "Verifying…" : "Verify & enter console"}
                  </button>
                  <button
                    onClick={() => setStep("request")}
                    className="w-full text-xs font-medium text-slate-500 hover:text-slate-700"
                  >
                    ← Use a different phone
                  </button>
                </>
              )}
            </div>
          )}

          {mode === "demo" && (
            <div className="mt-5">
              <p className="text-xs text-slate-600">
                Local preview only. Deployed previews require the private prototype access key.
              </p>
              <label className="mt-3 block">
                <span className="text-xs font-semibold text-slate-700">Prototype access key</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={demoAccessKey}
                  onChange={(event) => setDemoAccessKey(event.target.value)}
                  placeholder="Leave blank for local development"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </label>
              <div className="mt-3 space-y-2">
                {accounts.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => handleDemoClick(a.phone)}
                    disabled={loading || !a.phone}
                    className="group flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left hover:border-indigo-300 hover:bg-indigo-50/40 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{a.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {a.phone || a.email || "No contact"}
                        {a.merchantName ? ` · ${a.merchantName}` : ""}
                        {a.merchantKycStatus && a.merchantKycStatus !== "APPROVED" && (
                          <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                            KYC: {a.merchantKycStatus}
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className={`chip ${
                        a.role === "ADMIN"
                          ? "bg-rose-100 text-rose-700"
                          : a.role === "VENDOR_OWNER"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {a.role === "ADMIN" ? "Admin" : a.role === "VENDOR_OWNER" ? "Owner" : "Clerk"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </div>
          )}
        </div>

        {/* Right: Info panel */}
        <div className="space-y-4">
          <div className="card p-6">
            <div className="mb-2 text-xs font-bold uppercase tracking-widest text-indigo-600">Prototype authentication</div>
            <h3 className="text-lg font-bold text-slate-900">Provider-backed sign-in</h3>
            <p className="mt-2 text-sm text-slate-600">
              This prototype supports local demo OTPs and signed sessions. Production phone OTP and passkeys
              are not connected; configure a delivery and identity provider before inviting real account holders.
            </p>
            <ul className="mt-3 space-y-1 text-xs text-slate-700">
              <li>· Local preview OTP has a 5-minute TTL and single-use verification</li>
              <li>· Deployed one-tap demos require a private prototype access key</li>
              <li>· HMAC-signed httpOnly session cookie (no localStorage tokens)</li>
              <li>· Per-tenant RBAC: ADMIN · VENDOR_OWNER · VENDOR_CLERK</li>
            </ul>
          </div>

          <div className="card p-6">
            <div className="mb-2 text-xs font-bold uppercase tracking-widest text-emerald-600">Tenant isolation</div>
            <h3 className="text-lg font-bold text-slate-900">Strict multi-tenancy</h3>
            <p className="mt-2 text-sm text-slate-600">
              Every server action re-verifies the signed session and re-attaches the merchantId
              as a WHERE clause — a clerk at Sharma General Store cannot read, scan, or mutate
              Dr. Kulkarni&apos;s inventory. Admin endpoints reject non-ADMIN roles at the gateway.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
