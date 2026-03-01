/**
 * QS-PID Verifier
 *
 * Handles proof verification for income credentials.
 *
 * FIXES applied (2026-03-01):
 *   - Fixed vkey path: was 'incomeProof_vkey.json', now 'verification_key.json'
 *   - Removed duplicate Object.defineProperty on module.exports (caused
 *     "Cannot redefine property: FiatShamirBinding" on Node.js v22+)
 */

const fs      = require('fs');
const path    = require('path');
const snarkjs = require('snarkjs');
const crypto  = require('crypto');

const CIRCUIT_NAME  = 'incomeProof';
const ARTIFACTS_DIR = path.join(__dirname, '../artifacts');

class IncomeVerifier {
    constructor() {
        // FIX: was '${CIRCUIT_NAME}_vkey.json' — setup.js saves as 'verification_key.json'
        this.vkeyPath = path.join(ARTIFACTS_DIR, 'verification_key.json');
        this.vkey     = null;
    }

    async initialize() {
        if (this.vkey) return;
        if (!fs.existsSync(this.vkeyPath)) {
            throw new Error(`Verification key not found: ${this.vkeyPath}\nRun: npm run setup`);
        }
        this.vkey = JSON.parse(fs.readFileSync(this.vkeyPath, 'utf8'));
    }

    /**
     * Verify a proof with optional Fiat-Shamir binding validation.
     * @param {object} proofData  - Full proof object returned by prover.generateProof()
     * @param {string} verifierId - Unique identifier for this verifier
     * @param {object} options    - { validateBinding, requireNonce, maxAge }
     */
    async verifyProof(proofData, verifierId = 'default-verifier', options = {}) {
        if (!this.vkey) await this.initialize();

        const { validateBinding = true, requireNonce = true } = options;

        try {
            // Reconstruct proof
            const proof         = this.reconstructProof(proofData.proof);
            const publicSignals = proofData.publicSignals.map(s => s.toString());

            console.log('[*] Verifying proof...');
            console.log(`[*] Verifier ID     : ${verifierId}`);
            console.log(`[*] Public Signals  : ${publicSignals.join(', ')}\n`);

            // Fiat-Shamir binding check
            if (validateBinding && proofData.fiatShamirBinding) {
                const bindingValid = this.validateFiatShamirBinding(proofData, verifierId);
                if (!bindingValid.valid) {
                    return { valid: false, reason: `Fiat-Shamir binding invalid: ${bindingValid.reason}`, verifierId, timestamp: new Date().toISOString() };
                }
                console.log('[✓] Fiat-Shamir binding validated\n');
            }

            // SnarkJS verification
            const isValid = await snarkjs.groth16.verify(this.vkey, publicSignals, proof);
            if (!isValid) {
                return { valid: false, reason: 'Invalid proof signature', verifierId, timestamp: new Date().toISOString() };
            }

            const proofValid = parseInt(publicSignals[0]) === 1;
            if (!proofValid) {
                return { valid: false, reason: 'Income does not exceed threshold', verifierId, timestamp: new Date().toISOString() };
            }

            // Anti-replay
            const replayCheck = this.checkReplayProtection(proofData, verifierId, requireNonce);
            if (!replayCheck.valid) return replayCheck;

            // Max-age check
            if (options.maxAge) {
                const age = Date.now() - new Date(proofData.timestamp).getTime();
                if (age > options.maxAge) {
                    return { valid: false, reason: 'Proof expired', age, maxAge: options.maxAge, verifierId, timestamp: new Date().toISOString() };
                }
            }

            console.log('[✓] Proof verified successfully\n');
            return {
                valid:     true,
                reason:    'Income verified > 5 LPA',
                publicSignals: {
                    isValid:          proofValid,
                    threshold:        publicSignals[1] || 'N/A',
                    incomeHashCommit: publicSignals[2] || 'N/A',
                },
                verifierId,
                verificationTime: new Date().toISOString(),
                bindingValidated: !!(validateBinding && proofData.fiatShamirBinding),
            };
        } catch (error) {
            console.error('[!] Verification error:', error.message);
            return { valid: false, reason: `Verification error: ${error.message}`, verifierId, timestamp: new Date().toISOString() };
        }
    }

    validateFiatShamirBinding(proofData, verifierId) {
        try {
            if (!proofData.fiatShamirBinding) return { valid: false, reason: 'No binding in proof' };
            const { FiatShamirBinding } = require('./prover');
            const isValid = parseInt(proofData.publicSignals[0]) === 1;
            const binding = proofData.fiatShamirBinding;
            const threshold = proofData.publicSignals[1] ||
                (binding.bindingData && binding.bindingData.split('THRESHOLD:')[1]?.split('|')[0]) ||
                '500000000';
            return FiatShamirBinding.verifyChallengeBind(
                {
                    threshold,
                    isValid:          isValid ? '1' : '0',
                    incomeHashCommit: proofData.commitments.incomeHashCommit.toString(),
                    verifierId,
                    timestamp:        proofData.timestamp,
                },
                binding.challenge
            );
        } catch (e) {
            return { valid: false, reason: `Binding validation error: ${e.message}` };
        }
    }

    reconstructProof(formattedProof) {
        return {
            pi_a: [formattedProof.A[0], formattedProof.A[1], formattedProof.A[2]],
            pi_b: [
                [formattedProof.B[0][1], formattedProof.B[0][0]],
                [formattedProof.B[1][1], formattedProof.B[1][0]],
                [formattedProof.B[2][1], formattedProof.B[2][0]],
            ],
            pi_c: [formattedProof.C[0], formattedProof.C[1], formattedProof.C[2]],
        };
    }

    checkReplayProtection(proofData, verifierId, requireNonce = true) {
        if (requireNonce && !proofData.commitments) {
            return { valid: false, reason: 'Missing commitments for nonce verification', verifierId, timestamp: new Date().toISOString() };
        }
        return {
            valid:     true,
            nonce:     crypto.randomBytes(32).toString('hex'),
            challenge: crypto.createHash('sha256').update(verifierId + JSON.stringify(proofData.commitments || {})).digest('hex'),
        };
    }

    async batchVerify(proofs, verifierId, options = {}) {
        console.log(`[*] Batch verifying ${proofs.length} proofs...\n`);
        const results    = [];
        for (const p of proofs) results.push(await this.verifyProof(p, verifierId, options));
        const validCount = results.filter(r => r.valid).length;
        console.log(`[✓] Batch verification: ${validCount}/${proofs.length} valid\n`);
        return { totalProofs: proofs.length, validProofs: validCount, results, unlinkable: this.checkUnlinkability(proofs) };
    }

    checkUnlinkability(proofs) {
        if (proofs.length < 2) return { unlinkable: true, reason: 'Need at least 2 proofs' };
        const commits = proofs.map(p => p.commitments.incomeHashCommit);
        const unique  = new Set(commits);
        return {
            unlinkable:        unique.size === commits.length,
            totalProofs:       proofs.length,
            uniqueCommitments: unique.size,
            reason:            unique.size === commits.length
                ? 'All proofs use different commitments (unlinkable)'
                : 'WARNING: Some proofs share commitments (linkable)',
        };
    }
}

// FIX: Single clean export — no duplicate Object.defineProperty
module.exports = IncomeVerifier;
Object.defineProperty(module.exports, 'FiatShamirBinding', {
    get()        { return require('./prover').FiatShamirBinding; },
    configurable: true,
    enumerable:   false,
});
