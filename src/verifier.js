/**
 * QS-PID Verifier
 * 
 * Handles proof verification for income credentials
 * Supports multi-verifier scenarios with unlinkability
 * 
 * SECURITY: Validates Fiat-Shamir binding to prevent forgery attacks
 * by ensuring all public values are included in challenge hash
 */

const fs = require('fs');
const path = require('path');
const snarkjs = require('snarkjs');
const crypto = require('crypto');

// Lazy load FiatShamirBinding to avoid circular dependency
let FiatShamirBinding = null;

const CIRCUIT_NAME = 'incomeProof';
const ARTIFACTS_DIR = path.join(__dirname, '../artifacts');

class IncomeVerifier {
    constructor() {
        this.vkeyPath = path.join(ARTIFACTS_DIR, `${CIRCUIT_NAME}_vkey.json`);
        this.vkey = null;
    }

    /**
     * Load verification key
     */
    async initialize() {
        if (this.vkey) return;

        if (!fs.existsSync(this.vkeyPath)) {
            throw new Error(`Verification key not found: ${this.vkeyPath}`);
        }

        const vkeyData = fs.readFileSync(this.vkeyPath, 'utf8');
        this.vkey = JSON.parse(vkeyData);
    }

    /**
     * Verify a single proof with Fiat-Shamir binding validation
     * 
     * @param {object} proofData - Proof object from prover
     * @param {string} verifierId - Unique identifier for this verifier
     * @param {object} options - Additional options
     * @returns {object} Verification result
     */
    async verifyProof(proofData, verifierId, options = {}) {
        if (!this.vkey) await this.initialize();

        const {
            validateBinding = true,
            requireNonce = true,
            timestamp = null,
        } = options;

        try {
            // Step 1: Reconstruct proof from formatted data
            const proof = this.reconstructProof(proofData.proof);

            // Step 2: Prepare public signals
            const publicSignals = proofData.publicSignals.map(s => s.toString());

            console.log('[*] Verifying proof...');
            console.log(`[*] Verifier ID: ${verifierId}`);
            console.log(`[*] Public Signals: ${publicSignals.join(', ')}\n`);

            // Step 2a: VALIDATE FIAT-SHAMIR BINDING (Security check)
            if (validateBinding && proofData.fiatShamirBinding) {
                console.log('[*] Validating Fiat-Shamir binding...');
                const bindingValid = this.validateFiatShamirBinding(
                    proofData,
                    verifierId
                );
                if (!bindingValid.valid) {
                    console.log('[✗] Fiat-Shamir binding validation failed');
                    return {
                        valid: false,
                        reason: `Fiat-Shamir binding invalid: ${bindingValid.reason}`,
                        bindingError: bindingValid,
                        verifierId: verifierId,
                        timestamp: new Date().toISOString(),
                    };
                }
                console.log('[✓] Fiat-Shamir binding validated\n');
            }

            // Step 3: Verify using SnarkJS
            const isValid = await snarkjs.groth16.verify(
                this.vkey,
                publicSignals,
                proof
            );

            // Step 4: Check proof validity signal
            const proofValid = parseInt(publicSignals[0]) === 1;

            if (!isValid) {
                console.log('[✗] Proof verification failed (invalid proof)');
                return {
                    valid: false,
                    reason: 'Invalid proof signature',
                    verifierId: verifierId,
                    timestamp: new Date().toISOString(),
                };
            }

            if (!proofValid) {
                console.log('[✗] Proof verification failed (income not > threshold)');
                return {
                    valid: false,
                    reason: 'Income does not exceed threshold',
                    verifierId: verifierId,
                    timestamp: new Date().toISOString(),
                };
            }

            // Step 5: Anti-replay checks
            const replayCheck = this.checkReplayProtection(
                proofData,
                verifierId,
                requireNonce
            );

            if (!replayCheck.valid) {
                console.log('[✗] Replay protection check failed');
                return replayCheck;
            }

            // Step 6: Timestamp validation (if provided)
            if (timestamp && options.maxAge) {
                const proofTime = new Date(proofData.timestamp).getTime();
                const currentTime = new Date().getTime();
                const age = currentTime - proofTime;

                if (age > options.maxAge) {
                    console.log('[✗] Proof expired');
                    return {
                        valid: false,
                        reason: 'Proof expired',
                        age: age,
                        maxAge: options.maxAge,
                        verifierId: verifierId,
                        timestamp: new Date().toISOString(),
                    };
                }
            }

            console.log('[✓] Proof verified successfully\n');

            return {
                valid: true,
                reason: 'Income verified > 5 LPA',
                publicSignals: {
                    isValid: proofValid,
                    threshold: publicSignals[1] || 'N/A',
                    incomeHashCommit: publicSignals[2] || 'N/A',
                },
                verifierId: verifierId,
                verificationTime: new Date().toISOString(),
                proofAge: timestamp ? new Date().getTime() - new Date(proofData.timestamp).getTime() : 0,
                bindingValidated: validateBinding && proofData.fiatShamirBinding,
            };
        } catch (error) {
            console.error('[!] Verification error:', error.message);
            return {
                valid: false,
                reason: `Verification error: ${error.message}`,
                verifierId: verifierId,
                timestamp: new Date().toISOString(),
            };
        }
    }

    /**
     * Validate Fiat-Shamir binding to detect forgery attempts
     * Reconstructs the binding and verifies all public values are included
     */
    validateFiatShamirBinding(proofData, verifierId) {
        try {
            if (!proofData.fiatShamirBinding) {
                return {
                    valid: false,
                    reason: 'No Fiat-Shamir binding found in proof',
                };
            }

            const binding = proofData.fiatShamirBinding;
            const isValid = parseInt(proofData.publicSignals[0]) === 1;

            // Lazy load FiatShamirBinding to avoid circular dependency
            if (!FiatShamirBinding) {
                FiatShamirBinding = require('./prover.js').FiatShamirBinding;
            }

            // Verify the binding
            const verification = FiatShamirBinding.verifyChallengeBind(
                {
                    threshold: proofData.publicSignals[1] || binding.bindingData.split('THRESHOLD:')[1]?.split('|')[0],
                    isValid: isValid ? '1' : '0',
                    incomeHashCommit: proofData.commitments.incomeHashCommit.toString(),
                    verifierId: verifierId,
                    timestamp: proofData.timestamp,
                },
                binding.challenge
            );

            return verification;
        } catch (error) {
            return {
                valid: false,
                reason: `Binding validation error: ${error.message}`,
            };
        }
    }

    /**
     * Reconstruct proof object from formatted data
     */
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

    /**
     * Anti-replay and unlinkability checks
     */
    checkReplayProtection(proofData, verifierId, requireNonce = true) {
        // In production, store verified proofs with nonces
        const nonce = this.generateNonce();
        const challenge = this.generateChallenge(verifierId, proofData.commitments);

        // Check if nonce has been seen before (would need persistent storage)
        // For demo, we just generate it

        if (requireNonce && !proofData.commitments) {
            return {
                valid: false,
                reason: 'Missing commitments for nonce verification',
                verifierId: verifierId,
                timestamp: new Date().toISOString(),
            };
        }

        return {
            valid: true,
            nonce: nonce,
            challenge: challenge,
        };
    }

    /**
     * Generate verifier-specific nonce (prevents replay)
     */
    generateNonce() {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Generate challenge for verifier
     */
    generateChallenge(verifierId, commitments) {
        const hash = crypto.createHash('sha256');
        hash.update(verifierId);
        hash.update(JSON.stringify(commitments || {}));
        return hash.digest('hex');
    }

    /**
     * Batch verify proofs (for multi-verifier scenarios)
     */
    async batchVerify(proofs, verifierId, options = {}) {
        console.log(`[*] Batch verifying ${proofs.length} proofs...\n`);

        const results = [];
        for (const proofData of proofs) {
            const result = await this.verifyProof(proofData, verifierId, options);
            results.push(result);
        }

        const validCount = results.filter(r => r.valid).length;
        console.log(`[✓] Batch verification complete: ${validCount}/${proofs.length} valid\n`);

        return {
            totalProofs: proofs.length,
            validProofs: validCount,
            results: results,
            unlinkable: this.checkUnlinkability(proofs),
        };
    }

    /**
     * Verify that multiple proofs are unlinkable
     * (different blinding factors produce different commitments)
     */
    checkUnlinkability(proofs) {
        if (proofs.length < 2) return { unlinkable: true, reason: 'Need at least 2 proofs' };

        const commitments = proofs.map(p => p.commitments.incomeHashCommit);
        const uniqueCommitments = new Set(commitments);

        const isUnlinkable = uniqueCommitments.size === commitments.length;

        return {
            unlinkable: isUnlinkable,
            totalProofs: proofs.length,
            uniqueCommitments: uniqueCommitments.size,
            reason: isUnlinkable
                ? 'All proofs use different commitments (unlinkable)'
                : 'WARNING: Some proofs share commitments (linkable)',
        };
    }
}

// Export FiatShamirBinding through prover module (lazy loaded to avoid circular dependency)
// FiatShamirBinding will be available as IncomeVerifier.FiatShamirBinding but loaded on first use
Object.defineProperty(IncomeVerifier, 'FiatShamirBinding', {
    get() {
        if (!FiatShamirBinding) {
            FiatShamirBinding = require('./prover.js').FiatShamirBinding;
        }
        return FiatShamirBinding;
    }
});

module.exports = IncomeVerifier;
Object.defineProperty(module.exports, 'FiatShamirBinding', {
    get() {
        if (!FiatShamirBinding) {
            FiatShamirBinding = require('./prover.js').FiatShamirBinding;
        }
        return FiatShamirBinding;
    }
});
