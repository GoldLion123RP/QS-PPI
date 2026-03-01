/**
 * prove.js — Generate a ZKP income proof
 *
 * Usage: npm run prove
 * Or with env vars:
 *   INCOME=700000000 THRESHOLD=500000000 node scripts/prove.js
 *
 * Prerequisites: npm run compile && npm run setup
 */

const path = require('path');
const fs   = require('fs');

const ARTIFACTS = path.join(__dirname, '../artifacts');
const CIRCUIT   = 'incomeProof';

async function main() {
  try {
    // Dynamic require after compile check
    const IncomeProver = require('../src/prover');

    const income    = process.env.INCOME    || '700000000';  // 7 LPA default
    const threshold = process.env.THRESHOLD || '500000000';  // 5 LPA
    const verifier  = process.env.VERIFIER  || 'demo-verifier-001';

    console.log('\n========== QS-PID PROOF GENERATION ==========\n');
    console.log(`Income    : ${income}`);
    console.log(`Threshold : ${threshold}`);
    console.log(`Verifier  : ${verifier}\n`);

    const prover = new IncomeProver();
    await prover.initialize();

    const result = await prover.generateProof(income, threshold, verifier);

    const outputPath = path.join(ARTIFACTS, 'proof.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

    console.log(`\n[✓] Proof saved to artifacts/proof.json`);
    console.log(`[✓] Income valid (above threshold): ${result.isValid}\n`);
  } catch (err) {
    console.error('\n[✗] Proof generation failed:', err.message);
    console.error('    Make sure you ran: npm run compile && npm run setup');
    process.exit(1);
  }
}

main();
