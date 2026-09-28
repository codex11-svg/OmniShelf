"use client";

import { useState } from "react";
import { createMerchantForAdmin } from "@/lib/actions";

const STEPS = [
  { id: "type", label: "Store type" },
  { id: "owner", label: "Owner details" },
  { id: "license", label: "License" },
  { id: "review", label: "Review & submit" },
];

type MerchantForm = {
  type: "KIRANA" | "MEDICAL";
  name: string;
  ownerName: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  pincode: string;
  licenseNumber: string;
  notes: string;
};

export function AdminOnboardingPanel() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<MerchantForm>({
    type: "KIRANA",
    name: "",
    ownerName: "",
    phone: "",
    whatsapp: "",
    address: "",
    city: "",
    pincode: "",
    licenseNumber: "",
    notes: "",
  });
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof MerchantForm>(key: K, value: MerchantForm[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  const canAdvance = step === 0 || (
    step === 1 && [form.name, form.ownerName, form.phone, form.whatsapp, form.address, form.city, form.pincode]
      .every((value) => value.trim().length > 0)
  ) || (step === 2 && form.licenseNumber.trim().length > 0);

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      let licenseDocUrl: string | undefined;
      if (licenseFile) {
        const upload = new FormData();
        upload.append("file", licenseFile);
        upload.append("type", "license");
        const response = await fetch("/api/upload", { method: "POST", body: upload });
        const result = await response.json();
        if (!response.ok || typeof result.key !== "string") {
          throw new Error(result.error ?? "License upload failed.");
        }
        licenseDocUrl = result.key;
      }

      const result = await createMerchantForAdmin({ ...form, licenseDocUrl });
      if (!result.ok) {
        setError(result.error ?? "Merchant creation failed.");
        return;
      }
      setSubmitted(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not submit this merchant.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="card p-8 text-center">
        <div className="mb-3 text-5xl">🎉</div>
        <h3 className="text-xl font-bold text-slate-900">Merchant application submitted</h3>
        <p className="mt-2 text-sm text-slate-600">
          <b>{form.name}</b> has been saved and queued for KYC review.
        </p>
        <div className="mt-4 inline-flex rounded-xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
          Status: <b className="ml-1">Pending</b>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm text-emerald-900">
        <b>🧭 Vendor onboarding wizard.</b> Register a merchant and owner account for KYC review.
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
        {STEPS.map((item, index) => (
          <div key={item.id} className="flex flex-1 items-center">
            <div className="flex flex-col items-center">
              <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${index < step ? "bg-emerald-500 text-white" : index === step ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"}`}>
                {index < step ? "✓" : index + 1}
              </div>
              <div className={`mt-1 text-[10px] font-semibold ${index <= step ? "text-slate-900" : "text-slate-500"}`}>
                {item.label}
              </div>
            </div>
            {index < STEPS.length - 1 && (
              <div className={`mx-2 h-0.5 flex-1 ${index < step ? "bg-emerald-500" : "bg-slate-200"}`} />
            )}
          </div>
        ))}
      </div>

      <div className="card p-5">
        {step === 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">What kind of store?</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {(["KIRANA", "MEDICAL"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => update("type", type)}
                  className={`rounded-xl border-2 p-4 text-left ${form.type === type ? "border-indigo-500 bg-indigo-50/40" : "border-slate-200 hover:bg-slate-50"}`}
                >
                  <div className="text-2xl">{type === "KIRANA" ? "🛒" : "💊"}</div>
                  <div className="mt-2 font-bold">{type === "KIRANA" ? "Kirana / Grocery" : "Medical / Pharmacy"}</div>
                  <div className="text-xs text-slate-600">
                    {type === "KIRANA" ? "FMCG, perishables, staples. FSSAI license required." : "OTC + Rx drugs. Drug / Pharmacy Council license required."}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Owner and store details</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Store name" value={form.name} onChange={(value) => update("name", value)} />
              <Field label="Owner full name" value={form.ownerName} onChange={(value) => update("ownerName", value)} />
              <Field label="Phone" value={form.phone} onChange={(value) => update("phone", value)} placeholder="+91XXXXXXXXXX" />
              <Field label="WhatsApp" value={form.whatsapp} onChange={(value) => update("whatsapp", value)} placeholder="+91XXXXXXXXXX" />
              <Field label="Address" value={form.address} onChange={(value) => update("address", value)} className="md:col-span-2" />
              <Field label="City" value={form.city} onChange={(value) => update("city", value)} />
              <Field label="PIN code" value={form.pincode} onChange={(value) => update("pincode", value)} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              {form.type === "MEDICAL" ? "Drug license" : "FSSAI license"}
            </h3>
            <Field
              label="License number"
              value={form.licenseNumber}
              onChange={(value) => update("licenseNumber", value)}
              placeholder={form.type === "MEDICAL" ? "MH-PHARM-2026-XXXXX" : "FSSAI-XXXXXXXXXXXXXX"}
            />
            <label className="block rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-5">
              <span className="block text-sm font-semibold text-slate-700">License document (optional)</span>
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={(event) => setLicenseFile(event.target.files?.[0] ?? null)}
                className="mt-2 w-full text-sm"
              />
              <span className="mt-1 block text-xs text-slate-500">PDF, JPEG, PNG, or WebP, up to 4 MB. Private R2 storage is required.</span>
            </label>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Review & submit</h3>
            <dl className="grid gap-2 text-sm">
              <Row label="Store type" value={form.type === "MEDICAL" ? "💊 Medical" : "🛒 Kirana"} />
              <Row label="Store name" value={form.name} />
              <Row label="Owner" value={form.ownerName} />
              <Row label="Phone" value={form.phone} />
              <Row label="WhatsApp" value={form.whatsapp} />
              <Row label="Address" value={`${form.address}, ${form.city} ${form.pincode}`} />
              <Row label="License" value={form.licenseNumber} />
              <Row label="Document" value={licenseFile?.name ?? "Not attached"} />
            </dl>
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Review notes</span>
              <textarea
                value={form.notes}
                onChange={(event) => update("notes", event.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>
          </div>
        )}

        <div className="mt-5 flex justify-between">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0 || submitting}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
          >
            ← Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canAdvance || submitting}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={submitting}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit for KYC review ✓"}
            </button>
          )}
        </div>
        {error && (
          <div role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="text-xs font-semibold text-slate-700">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 rounded-lg bg-slate-50 px-3 py-2">
      <dt className="w-32 text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="flex-1 text-sm text-slate-900">{value || <span className="italic text-slate-400">—</span>}</dd>
    </div>
  );
}
