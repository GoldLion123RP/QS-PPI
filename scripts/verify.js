/**
 * verify.js — Verify a previously generated proof
 *
 * Usage: npm run verify
 * Reads: artifacts/proof.json & artifacts/verification_key.json
 *
 * FIX (2026-03-01): corrected verifier.verifyProof() call signature.
 *   Was: verifyProof(proof, publicSignals, fiatShamirBinding)
 *   Now: verifyProof(fullProofData, verifierId)
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

        console.log('\n========== QS-PPI PROOF VERIFICATION ==========\n');

        const proofData = JSON.parse(fs.readFileSync(proofPath, 'utf8'));
        const verifier  = new IncomeVerifier();
        await verifier.initialize();

        // Pass the full proofData object + verifierId (fixed call signature)
        const result = await verifier.verifyProof(
            proofData,
            proofData.verifierId || 'demo-verifier-001'
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

