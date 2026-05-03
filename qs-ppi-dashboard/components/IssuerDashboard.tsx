"use client";

import {
  ShieldCheck,
  PanelLeft,
  Cpu,
  Gauge,
  Sparkles,
  Lock,
} from "lucide-react";

const stats = [
  {
    label: "Issued Credentials",
    value: "1,248",
    sub: "Last 24h: 132",
    icon: ShieldCheck,
  },
  {
    label: "Est. Circuit Constraints",
    value: "~145K",
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
    annualIncome: "₹9,00,000 (9 LPA)",
    blindingSalt: "0x8f3a...d21c",
    poseidonCommit: "0x1267...89ab",
  },
  {
    id: 2,
    holderId: "did:key:z6Mkf...b72",
    annualIncome: "₹6,00,000 (6 LPA)",
    blindingSalt: "0x4bc1...aa09",
    poseidonCommit: "0x9f42...77cd",
  },
  {
    id: 3,
    holderId: "did:key:z6Mkq...c33",
    annualIncome: "₹5,00,000 (5 LPA)",
    blindingSalt: "0xbe23...01ff",
    poseidonCommit: "0x3a91...10ef",
  },
];

export function IssuerDashboard() {
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
                QS-PPI
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
            <button className="text-slate-300 hover:text-teal-200">
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
                      {row.annualIncome}
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
    </div>
  );
}

