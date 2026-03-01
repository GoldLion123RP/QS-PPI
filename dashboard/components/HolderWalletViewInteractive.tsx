"use client";

import { useState } from "react";
import {
  Download,
  FileJson,
  CheckCircle2,
  TerminalSquare,
  KeyRound,
  Loader2,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";
import {
  generatePresentationProof,
  formatINR,
  type ProofData,
} from "../lib/zkp-api";

export function HolderWalletViewInteractive() {
  const name = "Rahul Pal";
  const employer = "HDFC Bank";
  const incomeINR = 750000; // 7.5 LPA
  const thresholdINR = 500000; // 5 LPA

  const incomeHashCommit =
    "0x1267942178626015729959527860566833613012679421786260157...";
  const sessionNonce = "0x9f83b1c0ee14a2f9d7c4a8bbd2ac019f...";
  const mldsaSignature =
    "mldsa65_sig_01fdd92d4f9b3c1a7e6c9b0e2a3f4d5c6b7a8e9f0d1c2b3...";

  const [verifierChallenge, setVerifierChallenge] = useState(
    "verif-5lpa-demo-0x9f3a2b"
  );
  const [loading, setLoading] = useState(false);
  const [proof, setProof] = useState<ProofData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerateProof = async () => {
    if (!verifierChallenge.trim()) {
      setError("Please enter a verifier challenge");
      return;
    }

    setLoading(true);
    setError(null);
    setProof(null);

    try {
      // Simulate realistic proof generation time (~200-300ms)
      await new Promise((resolve) => setTimeout(resolve, 250));

      const generatedProof = await generatePresentationProof(
        incomeINR,
        thresholdINR,
        verifierChallenge
      );

      setProof(generatedProof);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate proof"
      );
    } finally {
      setLoading(false);
    }
  };

  const copyProofToClipboard = async () => {
    if (!proof) return;

    try {
      await navigator.clipboard.writeText(JSON.stringify(proof, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const downloadWallet = () => {
    const walletData = {
      holderInfo: { name, employer, incomeINR },
      cryptographicArtifacts: {
        incomeHashCommit,
        sessionNonce,
        mldsaSignature,
      },
      proof: proof || null,
      timestamp: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(walletData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qspid-wallet-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        {/* Top split cards */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Personal Info (Private) */}
          <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-sm shadow-slate-900">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-100">
                Holder Wallet · Personal Information
              </h2>
              <span className="rounded-full bg-red-500/10 px-3 py-1 text-[11px] font-semibold text-red-400">
                PRIVATE
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Name</span>
                <span className="font-medium text-slate-50">{name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Employer</span>
                <span className="font-medium text-slate-50">{employer}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Annual Income (INR)</span>
                <span className="font-medium text-slate-50">
                  {formatINR(incomeINR)}
                </span>
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                Raw income stays in the holder wallet. Verifiers only see range
                proofs like &quot;income &gt; 5 LPA&quot; via zero-knowledge.
              </p>
            </div>
          </div>

          {/* Cryptographic Artifacts */}
          <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-sm shadow-slate-900">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-100">
                Cryptographic Artifacts
              </h2>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-400">
                ZK-READY
              </span>
            </div>
            <div className="space-y-2 text-xs font-mono text-slate-300">
              <div>
                <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-400">
                  incomeHashCommit (Poseidon)
                </div>
                <div className="truncate rounded-md bg-slate-950/70 px-3 py-2 text-[11px] text-teal-300">
                  {incomeHashCommit}
                </div>
              </div>
              <div>
                <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-400">
                  Session Nonce
                </div>
                <div className="truncate rounded-md bg-slate-950/70 px-3 py-2 text-[11px] text-slate-300">
                  {sessionNonce}
                </div>
              </div>
              <div>
                <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-400">
                  ML-DSA-65 Signature
                </div>
                <div className="truncate rounded-md bg-slate-950/70 px-3 py-2 text-[11px] text-emerald-300">
                  {mldsaSignature}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={downloadWallet}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-100 hover:border-teal-500"
              >
                <Download className="h-3.5 w-3.5 text-teal-300" />
                Download Wallet
              </button>
              <button className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-100 hover:border-teal-500">
                <FileJson className="h-3.5 w-3.5 text-teal-300" />
                View JSON-LD
              </button>
            </div>
          </div>
        </div>

        {/* Middle: ZKP Range Proof Logic */}
        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-sm shadow-slate-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TerminalSquare className="h-4 w-4 text-teal-300" />
              <h2 className="text-sm font-semibold text-slate-100">
                ZKP Range Proof Logic (circuits_incomeProof.circom)
              </h2>
            </div>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-[11px] font-mono text-slate-400">
              income: {incomeINR.toLocaleString("en-IN")} · threshold:{" "}
              {thresholdINR.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {/* Step 1 */}
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-100">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Step 1: Num2Bits(32)
              </div>
              <p className="text-[11px] text-slate-400">
                Decompose income and threshold into 32 bits to prevent field
                overflow and keep values within the BN254 scalar field.
              </p>
              <p className="mt-2 text-[10px] font-mono text-slate-500">
                assert(income &lt; 2^32);
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-100">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Step 2: Income &gt; Threshold
              </div>
              <p className="text-[11px] text-slate-400">
                Compare private income against public threshold (5 LPA = 500000
                INR) via a GreaterThan(32) gadget inside the circuit.
              </p>
              <p className="mt-2 text-[10px] font-mono text-slate-500">
                isValid &lt;== income &gt; threshold;
              </p>
            </div>

            {/* Step 3 */}
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-100">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Step 3: Fiat-Shamir Binding
              </div>
              <p className="text-[11px] text-slate-400">
                Bind isValid, threshold, incomeHashCommit, verifierId, and
                timestamp into a single SHA-256 challenge to prevent tampering.
              </p>
              <p className="mt-2 text-[10px] font-mono text-slate-500">
                challenge = H(isValid || threshold || commit || verifierId ||
                ts);
              </p>
            </div>
          </div>
        </div>

        {/* Bottom: Verifier Interaction */}
        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-sm shadow-slate-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-teal-300" />
              <h2 className="text-sm font-semibold text-slate-100">
                Verifier Challenge · 5 LPA Threshold
              </h2>
            </div>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-[11px] font-mono text-slate-400">
              Public threshold = 500000 INR (5 LPA)
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-[2fr,1fr]">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">
                Verifier Challenge (hex / UUID / random string)
              </label>
              <input
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-mono text-slate-100 placeholder:text-slate-500 focus:border-teal-400 focus:outline-none"
                placeholder="e.g., verif-5lpa-demo-0x9f3a2b..."
                value={verifierChallenge}
                onChange={(e) => setVerifierChallenge(e.target.value)}
              />
              <p className="text-[11px] text-slate-500">
                The challenge is included in the Fiat-Shamir transcript;
                replaying this proof with a different challenge will fail.
              </p>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleGenerateProof}
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-xs font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Generate Proof (5 LPA)
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Proof Result */}
          {proof && (
            <div className="mt-3 space-y-3">
              <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-semibold">
                    ✓ Proof Generated Successfully!
                  </div>
                  <div className="mt-1 text-[11px] text-emerald-400/80">
                    isValid: {proof.isValid ? "TRUE" : "FALSE"} · Threshold:{" "}
                    {formatINR(thresholdINR)}
                  </div>
                  <div className="mt-1 text-[11px] font-mono text-emerald-400/60">
                    Commitment: {proof.commitments.incomeHashCommit.slice(0, 32)}
                    ...
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">
                    Proof JSON (Ready for Verifier)
                  </span>
                  <button
                    onClick={copyProofToClipboard}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-300 hover:border-teal-500"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <pre className="max-h-48 overflow-auto text-[10px] font-mono text-slate-400">
                  {JSON.stringify(proof, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
