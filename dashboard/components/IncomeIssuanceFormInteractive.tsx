"use client";

import { useState } from "react";
import {
  ShieldCheck,
  ChevronDown,
  Calendar,
  FileJson,
  BadgeCheck,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { issueCredential, formatINR, type CredentialData } from "../lib/zkp-api";

const employers = ["HDFC Bank", "ICICI Bank", "TCS", "Infosys", "Reliance"];

export function IncomeIssuanceFormInteractive() {
  const [name, setName] = useState("Rahul Pal");
  const [income, setIncome] = useState<number>(750000);
  const [employer, setEmployer] = useState(employers[0]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [loading, setLoading] = useState(false);
  const [credential, setCredential] = useState<CredentialData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleIssue = async () => {
    if (!name || !income || income <= 0) {
      setError("Please fill all fields with valid values");
      return;
    }

    setLoading(true);
    setError(null);
    setCredential(null);

    try {
      // Simulate realistic delay for proof generation (~200-300ms)
      await new Promise(resolve => setTimeout(resolve, 250));
      
      const cred = await issueCredential(name, income, employer, date);
      setCredential(cred);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to issue credential");
    } finally {
      setLoading(false);
    }
  };

  const downloadCredential = () => {
    if (!credential) return;
    
    const blob = new Blob([JSON.stringify(credential, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qspid-credential-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
                  onChange={(e) => setIncome(Number(e.target.value))}
                />
                <p className="text-[11px] text-slate-500">
                  Current: {formatINR(income)}
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
            <button
              onClick={handleIssue}
              disabled={loading}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-teal-500/30 hover:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Proof...
                </>
              ) : (
                <>
                  <BadgeCheck className="h-4 w-4" />
                  Issue Quantum-Safe Credential &amp; Generate Wallet
                </>
              )}
            </button>

            {/* Error Display */}
            {error && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Success Display */}
            {credential && (
              <div className="mt-3 space-y-2">
                <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  <div>
                    <div className="font-semibold">Credential Issued Successfully!</div>
                    <div className="mt-1 text-[11px] text-emerald-400/80">
                      Subject ID: {credential.credentialSubject.id}
                    </div>
                  </div>
                </div>
                <button
                  onClick={downloadCredential}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-100 hover:border-teal-500"
                >
                  <FileJson className="h-3.5 w-3.5 text-teal-300" />
                  Download Credential JSON
                </button>
              </div>
            )}
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
{credential ? JSON.stringify(credential, null, 2) : `{
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://schema.org"
  ],
  "type": ["VerifiableCredential", "IncomeCredential"],
  "issuer": "did:key:issuer-bank-001",
  "issuanceDate": "${date}",
  "credentialSubject": {
    "id": "did:key:subject-xyz",
    "name": "${name}",
    "employer": "${employer}",
    "annualIncomeINR": ${income},
    "thresholdINR": 500000,
    "jurisdiction": "IN"
  }
}`}
              </pre>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <div className="flex items-center gap-1">
                <FileJson className="h-3.5 w-3.5 text-teal-300" />
                <span>Hybrid-signed (ECDSA + ML-DSA-65)</span>
              </div>
              {credential && (
                <span className="text-emerald-400">✓ Proof included</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
