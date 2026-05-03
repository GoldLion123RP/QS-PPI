/**
 * prove.js — Generate a ZKP income proof
 *
 * Usage: npm run prove
 * Env vars:
 *   INCOME=600000000 THRESHOLD=500000000 VERIFIER=myverifier node scripts/prove.js
 *
 * FIX (2026-03-01):
 *   JSON.stringify crashes on BigInt values that snarkjs returns in publicSignals.
 *   Added bigintReplacer so all BigInt values are serialized as strings.
 */

const path = require('path');
const fs   = require('fs');

const ARTIFACTS = path.join(__dirname, '../artifacts');

/** JSON replacer that converts BigInt to string (JSON has no BigInt type) */
function bigintReplacer(key, value) {
    return typeof value === 'bigint' ? value.toString() : value;
}

async function main() {
    try {
        const IncomeProver = require('../src/prover');

        const income    = process.env.INCOME    || '700000000';  // 7 LPA
        const threshold = process.env.THRESHOLD || '500000000';  // 5 LPA
        const verifier  = process.env.VERIFIER  || 'demo-verifier-001';

        console.log('\n========== QS-PPI PROOF GENERATION ==========\n');
        console.log(`Income    : ${income}`);
        console.log(`Threshold : ${threshold}`);
        console.log(`Verifier  : ${verifier}\n`);

        const prover = new IncomeProver();
        await prover.initialize();

        const result = await prover.generateProof(income, threshold, verifier);

        const outputPath = path.join(ARTIFACTS, 'proof.json');
        // FIX: use bigintReplacer — snarkjs publicSignals contains BigInt values
        fs.writeFileSync(outputPath, JSON.stringify(result, bigintReplacer, 2));

        console.log(`[\u2713] Proof saved → artifacts/proof.json`);
        console.log(`[\u2713] Income valid (above threshold): ${result.isValid}\n`);
    } catch (err) {
        console.error('\n[\u2717] Proof generation failed:', err.message);
        console.error('    Make sure you ran: npm run compile && npm run setup');
        process.exit(1);
    }
}

main();

