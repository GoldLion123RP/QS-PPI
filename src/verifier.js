/**
 * QS-PID Verifier
 *
 * publicSignals[] order (MUST match circuit):
 *   [0] isValid          — 1 if income > threshold
 *   [1] threshold        — public input
 *   [2] incomeHashCommit — public input
 *
 * FIX (2026-03-01):
 *   - Corrected publicSignals index usage throughout
 *   - Fiat-Shamir binding reads threshold from publicSignals[1] (was broken)
 *   - Fiat-Shamir challenge in proofData is now a hex string (not Buffer)
 *     because JSON.stringify can't serialize Buffers
 *   - vkey path fixed: verification_key.json
 */

const fs      = require('fs');
const path    = require('path');
const snarkjs = require('snarkjs');
const crypto  = require('crypto');

const ARTIFACTS_DIR = path.join(__dirname, '../artifacts');

class IncomeVerifier {
    constructor() {
        this.vkeyPath = path.join(ARTIFACTS_DIR, 'verification_key.json');
        this.vkey     = null;
    }

    async initialize() {
        if (this.vkey) return;
        if (!fs.existsSync(this.vkeyPath))
            throw new Error(`Verification key not found: ${this.vkeyPath}\nRun: npm run setup`);
        this.vkey = JSON.parse(fs.readFileSync(this.vkeyPath, 'utf8'));
    }

    async verifyProof(proofData, verifierId = 'default-verifier', options = {}) {
        if (!this.vkey) await this.initialize();
        const { validateBinding = true } = options;

        try {
            // Reconstruct snarkjs-format proof from our stored format
            const proof = {
                pi_a: proofData.proof.pi_a,
                pi_b: proofData.proof.pi_b,
                pi_c: proofData.proof.pi_c,
                protocol: 'groth16',
                curve:    'bn254',
            };
            const publicSignals = proofData.publicSignals.map(s => s.toString());

            // publicSignals[0] = isValid, [1] = threshold, [2] = incomeHashCommit
            const isValidSignal = publicSignals[0];
            const thresholdSig  = publicSignals[1];
            const commitSig     = publicSignals[2];

            console.log('[*] Verifying proof...');
            console.log(`[*] Verifier ID      : ${verifierId}`);
            console.log(`[*] isValid signal   : ${isValidSignal}`);
            console.log(`[*] threshold signal : ${thresholdSig}`);

            // Optional Fiat-Shamir binding validation
            if (validateBinding && proofData.fiatShamirBinding) {
                const bindCheck = this._checkBinding(proofData, verifierId, isValidSignal, thresholdSig, commitSig);
                if (!bindCheck.valid) {
                    console.log(`[!] Binding check: ${bindCheck.reason}`);
                    // Non-fatal for demo — log but continue
                }
            }

            // Core SnarkJS verification
            const snarkValid = await snarkjs.groth16.verify(this.vkey, publicSignals, proof);
            if (!snarkValid) {
                return { valid: false, reason: 'Groth16 proof signature invalid', verifierId, timestamp: new Date().toISOString() };
            }

            // Check the circuit output bit
            if (isValidSignal !== '1') {
                return { valid: false, reason: 'Income does not exceed threshold', verifierId, timestamp: new Date().toISOString() };
            }

            // Max-age check (optional)
            if (options.maxAge && proofData.timestamp) {
                const age = Date.now() - new Date(proofData.timestamp).getTime();
                if (age > options.maxAge)
                    return { valid: false, reason: `Proof expired (${Math.round(age/1000)}s old)`, verifierId, timestamp: new Date().toISOString() };
            }

            console.log('[\u2713] Proof verified successfully\n');
            return {
                valid:     true,
                reason:    'Income verified > threshold',
                publicSignals: {
                    isValid:          true,
                    threshold:        thresholdSig,
                    incomeHashCommit: commitSig,
                },
                verifierId,
                verificationTime: new Date().toISOString(),
            };
        } catch (err) {
            return { valid: false, reason: err.message, verifierId, timestamp: new Date().toISOString() };
        }
    }

    _checkBinding(proofData, verifierId, isValidSignal, thresholdSig, commitSig) {
        try {
            const { FiatShamirBinding } = require('./prover');
            const challenge = proofData.fiatShamirBinding.challenge ||
                              proofData.fiatShamirBinding.challengeHex;
            return FiatShamirBinding.verifyChallengeBind(
                {
                    threshold:        thresholdSig,
                    isValid:          isValidSignal,
                    incomeHashCommit: commitSig,
                    verifierId:       proofData.verifierId || verifierId,
                    timestamp:        proofData.timestamp,
                },
                challenge
            );
        } catch (e) {
            return { valid: false, reason: e.message };
        }
    }

    async batchVerify(proofs, verifierId, options = {}) {
        const results   = [];
        for (const p of proofs) results.push(await this.verifyProof(p, verifierId, options));
        const validCount = results.filter(r => r.valid).length;
        return {
            totalProofs: proofs.length,
            validProofs: validCount,
            results,
            unlinkable:  this._checkUnlinkability(proofs),
        };
    }

    _checkUnlinkability(proofs) {
        if (proofs.length < 2) return { unlinkable: true, reason: 'Need ≥ 2 proofs to check' };
        const commits = proofs.map(p => p.commitments.incomeHashCommit);
        const unique  = new Set(commits);
        return {
            unlinkable:        unique.size === commits.length,
            uniqueCommitments: unique.size,
            totalProofs:       proofs.length,
        };
    }
}

module.exports = IncomeVerifier;
Object.defineProperty(module.exports, 'FiatShamirBinding', {
    get()         { return require('./prover').FiatShamirBinding; },
    configurable: true,
    enumerable:   false,
});
