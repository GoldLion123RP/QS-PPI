"use client";

import { useState } from "react";
import {
  ShieldCheck,
  ChevronDown,
  Calendar,
  FileJson,
  BadgeCheck,
} from "lucide-react";

const employers = ["HDFC Bank", "ICICI Bank", "TCS", "Infosys", "Reliance"];

export function IncomeIssuanceForm() {
  const [name, setName] = useState("");
  const [income, setIncome] = useState<number | "">("");
  const [employer, setEmployer] = useState(employers[0]);
  const [date, setDate] = useState("");

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 text-slate-950">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-50">
              Income Credential Issuance
            </h1>
            <p className="text-xs text-slate-400">
              Issue W3C VC 2.0 income credentials with quantum-safe signatures.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Left: Form */}
          <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-sm shadow-slate-900">
            <h2 className="text-sm font-semibold text-slate-100">
              Issuer Input Panel
            </h2>
            <div className="space-y-3">
              {/* FULL NAME */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">
                  FULL NAME
                </label>
                <input
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-teal-400 focus:outline-none"
                  placeholder="e.g., Rahul Pal"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* ANNUAL INCOME (INR) */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">
                  ANNUAL INCOME (INR)
                </label>
                <input
                  type="number"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-teal-400 focus:outline-none"
                  placeholder="e.g., 750000 for 7.5 LPA"
                  value={income}
                  onChange={(e) =>
                    setIncome(e.target.value === "" ? "" : Number(e.target.value))
                  }
                />
                <p className="text-[11px] text-slate-500">
                  Scaling: 1 Lakh = 100,000 INR. Example: 5 LPA = 500000.
                </p>
              </div>

              {/* EMPLOYER */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">
                  EMPLOYER
                </label>
                <div className="relative">
                  <select
                    className="w-full appearance-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 pr-8 text-sm text-slate-100 focus:border-teal-400 focus:outline-none"
                    value={employer}
                    onChange={(e) => setEmployer(e.target.value)}
                  >
                    {employers.map((e) => (
                      <option key={e}>{e}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-slate-500" />
                </div>
              </div>

              {/* ISSUANCE DATE */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">
                  ISSUANCE DATE
                </label>
                <div className="relative">
                  <input
                    type="date"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 pr-9 text-sm text-slate-100 focus:border-teal-400 focus:outline-none"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                  <Calendar className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-slate-500" />
                </div>
              </div>
            </div>

            {/* Cryptographic Toggles */}
            <div className="mt-4 space-y-2 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Cryptographic Pipeline
              </p>
              <div className="space-y-1 text-xs text-slate-300">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked
                    disabled
                    className="h-3 w-3 rounded border-slate-600 bg-slate-900 text-teal-400"
                  />
                  <span>Inject 32-byte Salt</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked
                    disabled
                    className="h-3 w-3 rounded border-slate-600 bg-slate-900 text-teal-400"
                  />
                  <span>Apply HybridSigner (ECDSA + ML-DSA)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked
                    disabled
                    className="h-3 w-3 rounded border-slate-600 bg-slate-900 text-teal-400"
                  />
                  <span>Format as JSON-LD</span>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <button className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-teal-500/30 hover:bg-teal-400">
              <BadgeCheck className="h-4 w-4" />
              Issue Quantum-Safe Credential &amp; Generate Wallet
            </button>
          </div>

          {/* Right: VC Preview */}
          <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-sm shadow-slate-900">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-100">
                W3C VC 2.0 Credential Preview
              </h2>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-[11px] font-mono text-teal-300">
                application/vc+ld+json
              </span>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs font-mono text-slate-300">
              <pre className="overflow-x-auto text-[11px] leading-relaxed">
{`{
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://schema.org"
  ],
  "type": ["VerifiableCredential", "IncomeCredential"],
  "issuer": "did:key:issuer-bank-001",
  "issuanceDate": "${date || "2026-03-01"}",
  "credentialSubject": {
    "id": "did:key:subject-xyz",
    "name": "${name || "Rahul Pal"}",
    "employer": "${employer}",
    "annualIncomeINR": ${income || 750000},
    "thresholdINR": 500000,
    "jurisdiction": "IN",
    "scaleNote": "1 Lakh = 100000 INR; 5 LPA = 500000."
  }
}`}
              </pre>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <div className="flex items-center gap-1">
                <FileJson className="h-3.5 w-3.5 text-teal-300" />
                <span>Hybrid-signed (ECDSA + ML-DSA-65)</span>
              </div>
              <span>Poseidon commitment hides exact income from verifiers</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
