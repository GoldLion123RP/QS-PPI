/**
 * QS-PID Verifier
 *
 * publicSignals[] order (matches circuit):
 *   [0] isValid          — 1 if income > threshold
 *   [1] threshold        — public input
 *   [2] incomeHashCommit — public input
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
        const { validateBinding = true, requireNonce = false } = options;

        try {
            const proof = {
                pi_a: proofData.proof.pi_a,
                pi_b: proofData.proof.pi_b,
                pi_c: proofData.proof.pi_c,
                protocol: 'groth16',
                curve:    'bn254',
            };
            const publicSignals = proofData.publicSignals.map(s => s.toString());

            // [0]=isValid  [1]=threshold  [2]=incomeHashCommit
            const isValidSignal = publicSignals[0];
            const thresholdSig  = publicSignals[1];
            const commitSig     = publicSignals[2];

            console.log('[*] Verifying proof...');
            console.log(`[*] Verifier ID      : ${verifierId}`);
            console.log(`[*] isValid signal   : ${isValidSignal}`);
            console.log(`[*] threshold signal : ${thresholdSig}`);

            // Fiat-Shamir binding check
            let bindingValidated = false;
            if (validateBinding && proofData.fiatShamirBinding) {
                const bindCheck = this._checkBinding(
                    proofData, isValidSignal, thresholdSig, commitSig
                );
                bindingValidated = bindCheck.valid;
                if (!bindCheck.valid) {
                    console.log(`[!] Binding check: ${bindCheck.reason}`);
                }
            }

            // Core SnarkJS verification
            const snarkValid = await snarkjs.groth16.verify(this.vkey, publicSignals, proof);
            if (!snarkValid) {
                return { valid: false, reason: 'Groth16 proof signature invalid',
                    bindingValidated, verifierId, timestamp: new Date().toISOString() };
            }

            if (isValidSignal !== '1') {
                return { valid: false, reason: 'Income does not exceed threshold',
                    bindingValidated, verifierId, timestamp: new Date().toISOString() };
            }

            // Max-age check
            if (options.maxAge && proofData.timestamp) {
                const age = Date.now() - new Date(proofData.timestamp).getTime();
                if (age > options.maxAge)
                    return { valid: false, reason: `Proof expired (${Math.round(age/1000)}s old)`,
                        bindingValidated, verifierId, timestamp: new Date().toISOString() };
            }

            // Nonce + challenge for anti-replay
            const nonce     = requireNonce ? crypto.randomBytes(16).toString('hex') : undefined;
            const challenge = requireNonce
                ? crypto.createHash('sha256')
                    .update(verifierId + (proofData.timestamp || '') + (nonce || ''))
                    .digest('hex')
                : undefined;

            console.log('[\u2713] Proof verified successfully\n');
            return {
                valid:     true,
                reason:    'Income verified > threshold',
                publicSignals: {
                    isValid:          true,
                    threshold:        thresholdSig,
                    incomeHashCommit: commitSig,
                },
                bindingValidated,
                nonce,
                challenge,
                verifierId,
                verificationTime: new Date().toISOString(),
            };
        } catch (err) {
            return { valid: false, reason: err.message,
                bindingValidated: false, verifierId, timestamp: new Date().toISOString() };
        }
    }

    _checkBinding(proofData, isValidSignal, thresholdSig, commitSig) {
        try {
            const { FiatShamirBinding } = require('./prover');
            const challenge = proofData.fiatShamirBinding.challenge ||
                              proofData.fiatShamirBinding.challengeHex;
            return FiatShamirBinding.verifyChallengeBind(
                {
                    threshold:        thresholdSig,
                    isValid:          isValidSignal,
                    incomeHashCommit: commitSig,
                    verifierId:       proofData.verifierId,
                    timestamp:        proofData.timestamp,  // same timestamp (now fixed in prover)
                },
                challenge
            );
        } catch (e) {
            return { valid: false, reason: e.message };
        }
    }

    /** Public method for unlinkability check (used in tests) */
    checkUnlinkability(proofs) {
        return this._checkUnlinkability(proofs);
    }

    _checkUnlinkability(proofs) {
        if (proofs.length < 2) return { unlinkable: true, reason: 'Need ≥ 2 proofs to check', uniqueCommitments: proofs.length, totalProofs: proofs.length };
        const commits = proofs.map(p => p.commitments.incomeHashCommit);
        const unique  = new Set(commits);
        return {
            unlinkable:        unique.size === commits.length,
            uniqueCommitments: unique.size,
            totalProofs:       proofs.length,
        };
    }

    async batchVerify(proofs, verifierId, options = {}) {
        const results    = [];
        for (const p of proofs) results.push(await this.verifyProof(p, verifierId, options));
        const validCount = results.filter(r => r.valid).length;
        return {
            totalProofs: proofs.length,
            validProofs: validCount,
            results,
            unlinkable:  this._checkUnlinkability(proofs),
        };
    }
}

module.exports = IncomeVerifier;
