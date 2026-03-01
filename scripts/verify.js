/**
 * verify.js — Verify a previously generated proof
 *
 * Usage: npm run verify
 * Reads: artifacts/proof.json & artifacts/verification_key.json
 *
 * Prerequisites: npm run prove
 */

const path = require('path');
const fs   = require('fs');

const ARTIFACTS = path.join(__dirname, '../artifacts');

async function main() {
  try {
    const IncomeVerifier = require('../src/verifier');

    const proofPath = path.join(ARTIFACTS, 'proof.json');
    const vkeyPath  = path.join(ARTIFACTS, 'verification_key.json');

    if (!fs.existsSync(proofPath)) {
      throw new Error(`Proof not found. Run: npm run prove\nExpected: ${proofPath}`);
    }
    if (!fs.existsSync(vkeyPath)) {
      throw new Error(`Verification key not found. Run: npm run setup\nExpected: ${vkeyPath}`);
    }

    console.log('\n========== QS-PID PROOF VERIFICATION ==========\n');

    const proofData = JSON.parse(fs.readFileSync(proofPath, 'utf8'));
    const verifier  = new IncomeVerifier();
    await verifier.initialize();

    const result = await verifier.verifyProof(
      proofData.proof,
      proofData.publicSignals,
      proofData.fiatShamirBinding
    );

    if (result.valid) {
      console.log('[✓] PROOF VERIFIED — Income is above threshold\n');
    } else {
      console.log('[✗] PROOF INVALID —', result.reason, '\n');
    }

    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('\n[✗] Verification failed:', err.message);
    process.exit(1);
  }
}

main();
