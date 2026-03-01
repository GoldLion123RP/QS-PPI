"use client";

import { useState } from "react";
import {
  ShieldCheck,
  PanelLeft,
  Cpu,
  Gauge,
  Sparkles,
  Lock,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  verifyIncomeProof,
  calculateJaccardSimilarity,
  estimateCircuitConstraints,
  formatINR,
  type ProofData,
  type VerificationResult,
} from "../lib/zkp-api";

const stats = [
  {
    label: "Issued Credentials",
    value: "1,248",
    sub: "Last 24h: 132",
    icon: ShieldCheck,
  },
  {
    label: "Est. Circuit Constraints",
    value: `~${Math.round(estimateCircuitConstraints() / 1000)}K`,
    sub: "Groth16 · Income Circuit",
    icon: Cpu,
  },
  {
    label: "Avg. Proof Time",
    value: "220 ms",
    sub: "Prover (Browser WASM)",
    icon: Gauge,
  },
  {
    label: "Jaccard Similarity",
    value: "< 0.05",
    sub: "Cross-verifier presentations",
    icon: Sparkles,
  },
];

const registryRows = [
  {
    id: 1,
    holderId: "did:key:z6Mkh...a91",
    annualIncome: 900000,
    blindingSalt: "0x8f3a...d21c",
    poseidonCommit: "0x1267...89ab",
  },
  {
    id: 2,
    holderId: "did:key:z6Mkf...b72",
    annualIncome: 600000,
    blindingSalt: "0x4bc1...aa09",
    poseidonCommit: "0x9f42...77cd",
  },
  {
    id: 3,
    holderId: "did:key:z6Mkq...c33",
    annualIncome: 500000,
    blindingSalt: "0xbe23...01ff",
    poseidonCommit: "0x3a91...10ef",
  },
];

export function IssuerDashboardInteractive() {
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [proofInput, setProofInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] =
    useState<VerificationResult | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(
    null
  );

  const handleVerify = async () => {
    if (!proofInput.trim()) {
      setVerificationError("Please paste a proof JSON");
      return;
    }

    setVerifying(true);
    setVerificationError(null);
    setVerificationResult(null);

    try {
      const proof: ProofData = JSON.parse(proofInput);

      // Simulate verification delay (~18-50ms)
      await new Promise((resolve) => setTimeout(resolve, 30));

      const result = await verifyIncomeProof(proof, "issuer-dashboard-001");
      setVerificationResult(result);
    } catch (err) {
      if (err instanceof SyntaxError) {
        setVerificationError("Invalid JSON format");
      } else {
        setVerificationError(
          err instanceof Error ? err.message : "Verification failed"
        );
      }
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Header / Nav */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 text-slate-950">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-wide text-teal-300">
                QS-PID
              </div>
              <div className="text-xs text-slate-400">
                Quantum-Safe Privacy-Preserving Identity
              </div>
            </div>
          </div>
          <nav className="flex items-center gap-6 text-sm">
            <button className="text-teal-300">Dashboard</button>
            <button className="text-slate-300 hover:text-teal-200">
              Issue Credential
            </button>
            <button
              onClick={() => setVerifyModalOpen(true)}
              className="text-slate-300 hover:text-teal-200"
            >
              Verifier Portal
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        {/* PQ Status Banner */}
        <section className="rounded-xl border border-slate-800 bg-gradient-to-r from-slate-900 to-slate-950 px-4 py-3 shadow-lg shadow-teal-500/10">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                <Lock className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-mono uppercase tracking-[0.18em] text-emerald-400">
                  NIST FIPS 204: ML-DSA-65 ACTIVE
                </div>
                <div className="mt-1 text-xs font-mono text-slate-400">
                  ZKP Curve: <span className="text-teal-300">BN254 (Groth16)</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              <span>Post-Quantum mode · Verified configuration</span>
            </div>
          </div>
        </section>

        {/* Stats Cards */}
        <section className="grid gap-4 md:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 shadow-sm shadow-slate-900"
            >
              <div className="flex items-center justify-between">
                <div className="text-[11px] uppercase tracking-wide text-slate-400">
                  {s.label}
                </div>
                <div className="rounded-full bg-slate-800/80 p-1 text-teal-300">
                  <s.icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-xl font-semibold text-slate-50">
                {s.value}
              </div>
              <div className="mt-1 text-xs text-slate-500">{s.sub}</div>
            </div>
          ))}
        </section>

        {/* Registry Table */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/70 shadow-sm shadow-slate-900">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <div className="flex items-center gap-2">
              <PanelLeft className="h-4 w-4 text-teal-300" />
              <h2 className="text-sm font-semibold text-slate-100">
                Issuer Registry
              </h2>
            </div>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-mono text-slate-400">
              Live pseudonymized ledger
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-950/60">
                <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2">#</th>
                  <th className="px-4 py-2">Holder ID</th>
                  <th className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      ANNUAL INCOME
                      <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-400">
                        PRIVATE
                      </span>
                    </div>
                  </th>
                  <th className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      BLINDING SALT
                      <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-400">
                        PRIVATE
                      </span>
                    </div>
                  </th>
                  <th className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      POSEIDON COMMITMENT
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                        PUBLIC
                      </span>
                    </div>
                  </th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {registryRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-900/80">
                    <td className="px-4 py-2 text-slate-500">{row.id}</td>
                    <td className="px-4 py-2 font-mono text-[11px] text-slate-300">
                      {row.holderId}
                    </td>
                    <td className="px-4 py-2 text-slate-200">
                      {formatINR(row.annualIncome)}
                    </td>
                    <td className="px-4 py-2 font-mono text-[11px] text-slate-400">
                      {row.blindingSalt}
                    </td>
                    <td className="px-4 py-2 font-mono text-[11px] text-teal-300">
                      {row.poseidonCommit}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] text-teal-300 hover:border-teal-500">
                        View VP
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Verifier Modal */}
      {verifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">
                Verifier Portal · Proof Verification
              </h2>
              <button
                onClick={() => setVerifyModalOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-300">
                  Paste Proof JSON (from Holder Wallet)
                </label>
                <textarea
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:border-teal-400 focus:outline-none"
                  rows={8}
                  placeholder='{\n  "proof": { ... },\n  "commitments": { ... },\n  "publicSignals": [1, 500000, "0x..."]\n}'
                  value={proofInput}
                  onChange={(e) => setProofInput(e.target.value)}
                />
              </div>

              <button
                onClick={handleVerify}
                disabled={verifying}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-teal-500/30 hover:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {verifying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying Proof...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Verify Proof
                  </>
                )}
              </button>

              {/* Error */}
              {verificationError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{verificationError}</span>
                </div>
              )}

              {/* Success */}
              {verificationResult && (
                <div
                  className={`flex items-start gap-2 rounded-lg border p-3 text-xs ${
                    verificationResult.valid
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-red-500/30 bg-red-500/10 text-red-300"
                  }`}
                >
                  {verificationResult.valid ? (
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  )}
                  <div>
                    <div className="font-semibold">
                      {verificationResult.valid
                        ? "✓ Proof Valid"
                        : "✗ Proof Invalid"}
                    </div>
                    <div className="mt-1 text-[11px] opacity-80">
                      {verificationResult.reason}
                    </div>
                    <div className="mt-2 font-mono text-[10px] opacity-60">
                      Verifier: {verificationResult.verifierId} · Time:{" "}
                      {new Date(verificationResult.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
