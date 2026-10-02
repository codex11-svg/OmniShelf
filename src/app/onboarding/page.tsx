"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Pill, Store } from "lucide-react";
import { createMerchant } from "@/lib/actions";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    storeName: "",
    storeType: "KIRANA" as "KIRANA" | "MEDICAL",
    ownerName: "",
    address: "",
    city: "",
    pincode: "",
    phone: "",
    licenseNumber: "",
  });
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  function updateField<K extends keyof typeof formData>(
    key: K,
    value: (typeof formData)[K]
  ) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  async function handleFileUpload(file: File) {
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    form.append("type", "license");

    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || typeof data.key !== "string") {
        throw new Error(data.error ?? "License upload failed.");
      }
      return data.key as string;
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);

    try {
      // Upload license if provided
      let licenseUrl: string | undefined;
      if (licenseFile) {
        licenseUrl = await handleFileUpload(licenseFile);
      }

      // Create merchant
      const result = await createMerchant({
        ...formData,
        licenseDocUrl: licenseUrl,
      });

      if (result.ok) {
        router.push("/vendor");
      } else {
        setError(result.error || "Failed to create store");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create store");
    } finally {
      setSubmitting(false);
    }
  }

  const canProceed = {
    1: formData.storeName && formData.storeType && formData.ownerName,
    2: formData.address && formData.city && formData.pincode && formData.phone,
    3: true, // License upload is optional
  };

  return (
    <div className="page-enter min-h-screen bg-[#f4f6f3] py-8 sm:py-12">
      <div className="mx-auto max-w-2xl px-4">
        {/* Header */}
        <div className="mb-7">
          <p className="text-xs font-semibold uppercase text-emerald-800">Merchant onboarding</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Set up your store</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Add your store details to create a workspace on OmniShelf.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-5 rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-600">
            <span>Step {step} of 3</span>
            <span>{step === 1 ? "Store details" : step === 2 ? "Location and contact" : "License and review"}</span>
          </div>
          <div
            role="progressbar"
            aria-label="Onboarding progress"
            aria-valuemin={1}
            aria-valuemax={3}
            aria-valuenow={step}
            className="h-1.5 overflow-hidden rounded-full bg-slate-100"
          >
            <div className="h-full rounded-full bg-emerald-800 transition-[width] duration-200" style={{ width: `${(step / 3) * 100}%` }} />
          </div>
          <div className="mt-3 grid grid-cols-3 text-[11px] font-medium text-slate-500">
            <span className={step === 1 ? "text-emerald-800" : ""}>Store</span>
            <span className={`text-center ${step === 2 ? "text-emerald-800" : ""}`}>Contact</span>
            <span className={`text-right ${step === 3 ? "text-emerald-800" : ""}`}>Verification</span>
          </div>
        </div>

        {/* Form Card */}
        <div className="card p-4 sm:p-6">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Store Information</h2>

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Store Name *
                </label>
                <input
                  type="text"
                  value={formData.storeName}
                  onChange={(e) => updateField("storeName", e.target.value)}
                  placeholder="e.g., Sharma General Store"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Store Type *
                </label>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => updateField("storeType", "KIRANA")}
                    aria-pressed={formData.storeType === "KIRANA"}
                    className={`rounded-md border p-4 text-left transition-colors ${
                      formData.storeType === "KIRANA"
                        ? "border-emerald-700 bg-emerald-50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Store aria-hidden="true" size={22} className="text-emerald-800" />
                    <div className="mt-3 font-semibold text-slate-900">Grocery store</div>
                    <div className="text-xs text-slate-600">
                      FMCG, perishables, staples
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField("storeType", "MEDICAL")}
                    aria-pressed={formData.storeType === "MEDICAL"}
                    className={`rounded-md border p-4 text-left transition-colors ${
                      formData.storeType === "MEDICAL"
                        ? "border-emerald-700 bg-emerald-50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Pill aria-hidden="true" size={22} className="text-emerald-800" />
                    <div className="mt-3 font-semibold text-slate-900">Pharmacy</div>
                    <div className="text-xs text-slate-600">Over-the-counter and prescription inventory</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Owner Name *
                </label>
                <input
                  type="text"
                  value={formData.ownerName}
                  onChange={(e) => updateField("ownerName", e.target.value)}
                  placeholder="Your full name"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          {/* Step 2: Location & Contact */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Location & Contact</h2>

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Address *
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  placeholder="Street address"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    City *
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    placeholder="e.g., Pune"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    PIN Code *
                  </label>
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => updateField("pincode", e.target.value)}
                    placeholder="e.g., 411001"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="+91 98XXXXXXXX"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          {/* Step 3: License Upload */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">License & Verification</h2>
              <p className="text-sm text-slate-600">
                Upload your {formData.storeType === "MEDICAL" ? "Drug License" : "FSSAI License"} for
                KYC verification (optional for now, can upload later)
              </p>

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  License Number (optional)
                </label>
                <input
                  type="text"
                  value={formData.licenseNumber}
                  onChange={(e) => updateField("licenseNumber", e.target.value)}
                  placeholder={
                    formData.storeType === "MEDICAL"
                      ? "MH-PHARM-2026-XXXXX"
                      : "FSSAI-XXXXXXXXXXXXXX"
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Upload License Document (optional)
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setLicenseFile(e.target.files?.[0] || null)}
                  className="mt-1 w-full text-sm"
                />
                {uploading && (
                  <div className="mt-2 text-xs text-slate-600">Uploading...</div>
                )}
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <b>Note:</b> Your store will be in &quot;Pending&quot; status until admin approves your KYC.
                You can still explore the platform in demo mode.
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-6 flex justify-between border-t border-slate-100 pt-4">
            <button
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1 || submitting}
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              <ArrowLeft aria-hidden="true" size={16} /> Back
            </button>

            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed[step as keyof typeof canProceed]}
                className="inline-flex min-h-10 items-center gap-2 rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-40"
              >
                Continue <ArrowRight aria-hidden="true" size={16} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex min-h-10 items-center gap-2 rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-40"
              >
                {submitting ? "Creating…" : "Create store"}
              </button>
            )}
          </div>

          {error && (
            <div role="alert" className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
