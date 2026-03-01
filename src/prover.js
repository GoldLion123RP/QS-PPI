/**
 * QS-PID Prover
 *
 * Handles proof generation for income verification.
 * Uses Circom circuit with SnarkJS Groth16.
 *
 * FIXES applied (2026-03-01):
 *   - Renamed 'blindingFactor' -> 'salt' to match circuit signal name
 *   - All random BigInts reduced mod BN254_PRIME (prevents "Cannot convert BigInt" error)
 *   - Removed duplicate module.exports.FiatShamirBinding defineProperty
 */

const fs     = require('fs');
const path   = require('path');
const snarkjs = require('snarkjs');
const crypto  = require('crypto');
const { buildPoseidon } = require('circomlibjs');
const { createHash }    = require('crypto');

// BN254 field prime — all inputs to Poseidon must be reduced mod this
const BN254_PRIME = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

const CIRCUIT_NAME  = 'incomeProof';
const ARTIFACTS_DIR = path.join(__dirname, '../artifacts');

class IncomeProver {
    constructor() {
        this.poseidon  = null;
        this.zkeyPath  = path.join(ARTIFACTS_DIR, `${CIRCUIT_NAME}_final.zkey`);
        this.wasmPath  = path.join(ARTIFACTS_DIR, `${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm`);
    }

    async initialize() {
        if (this.poseidon) return;
        this.poseidon = await buildPoseidon();
    }

    /**
     * Generate cryptographic commitments.
     * salt & nonce are reduced mod BN254_PRIME so they are valid field elements.
     */
    generateCommitments(income) {
        const salt  = BigInt('0x' + crypto.randomBytes(32).toString('hex')) % BN254_PRIME;
        const nonce = BigInt('0x' + crypto.randomBytes(32).toString('hex')) % BN254_PRIME;
        const incomeField = BigInt(income) % BN254_PRIME;

        const commitment = this.poseidon.F.toObject(
            this.poseidon([incomeField, salt, nonce])
        );

        return {
            incomeHashCommit: commitment,
            salt:  salt.toString(),
            nonce: nonce.toString(),
        };
    }

    /**
     * Generate witness (circuit inputs).
     * Signal names MUST match the Circom circuit exactly:
     *   income, threshold, incomeHashCommit, salt, nonce
     */
    generateWitness(income, threshold, commitments) {
        return {
            income:           BigInt(income).toString(),
            threshold:        BigInt(threshold).toString(),
            incomeHashCommit: commitments.incomeHashCommit.toString(),
            salt:             commitments.salt,   // circuit signal name is 'salt'
            nonce:            commitments.nonce,
        };
    }

    /**
     * Generate Groth16 proof with Fiat-Shamir security binding.
     */
    async generateProof(income, threshold = '500000000', verifierId = 'verifier-default') {
        if (!this.poseidon) await this.initialize();

        const incomeInt    = BigInt(income);
        const thresholdInt = BigInt(threshold);

        if (incomeInt < 0n)      throw new Error('Invalid income: must be non-negative integer');
        if (thresholdInt <= 0n)  throw new Error('Invalid threshold: must be positive integer');

        console.log('[*] Generating income proof...');
        console.log(`[*] Income    : ${incomeInt.toString()}`);
        console.log(`[*] Threshold : ${thresholdInt.toString()}\n`);

        try {
            const commitments = this.generateCommitments(incomeInt);
            const witness     = this.generateWitness(incomeInt, thresholdInt, commitments);

            console.log('[*] Computing witness...');
            const { proof, publicSignals } = await snarkjs.groth16.fullProve(
                witness,
                this.wasmPath,
                this.zkeyPath
            );
            console.log('[✓] Proof generated successfully\n');

            const formattedProof = this.formatProof(proof);
            const isValid        = parseInt(publicSignals[0]) === 1;

            console.log('[*] Creating Fiat-Shamir challenge binding...');
            const fiatShamirChallenge = FiatShamirBinding.createSecureChallenge({
                threshold:        thresholdInt.toString(),
                isValid:          isValid ? '1' : '0',
                incomeHashCommit: commitments.incomeHashCommit.toString(),
                verifierId:       verifierId,
                timestamp:        new Date().toISOString(),
            });
            console.log('[✓] Fiat-Shamir binding created\n');

            return {
                proof:             formattedProof,
                publicSignals:     publicSignals,
                commitments:       commitments,
                fiatShamirBinding: fiatShamirChallenge,
                timestamp:         new Date().toISOString(),
                isValid:           isValid,
                verifierId:        verifierId,
            };
        } catch (error) {
            console.error('[!] Proof generation failed:', error.message);
            throw error;
        }
    }

    formatProof(proof) {
        return {
            A: [proof.pi_a[0].toString(), proof.pi_a[1].toString(), proof.pi_a[2].toString()],
            B: [
                [proof.pi_b[0][1].toString(), proof.pi_b[0][0].toString()],
                [proof.pi_b[1][1].toString(), proof.pi_b[1][0].toString()],
                [proof.pi_b[2][1].toString(), proof.pi_b[2][0].toString()],
            ],
            C: [proof.pi_c[0].toString(), proof.pi_c[1].toString(), proof.pi_c[2].toString()],
            protocol: 'groth16',
            curve:    'bn254',
        };
    }

    async generateMultiProofs(income, threshold = '500000000', count = 3) {
        const proofs = [];
        console.log(`[*] Generating ${count} unlinkable proofs...\n`);
        for (let i = 0; i < count; i++) {
            console.log(`[*] Generating proof ${i + 1}/${count}...`);
            proofs.push(await this.generateProof(income, threshold));
        }
        console.log(`\n[✓] Generated ${count} proofs with different salts`);
        return proofs;
    }
}

// ================================================================
// FIAT-SHAMIR BINDING SECURITY MODULE
// ================================================================

const CIRCUIT_SPEC = {
    name:      'incomeProof',
    version:   '1.0.0',
    protocol:  'Groth16',
    curve:     'BN254',
    circuitId: 'QS-PID-INCOME-VERIFICATION-V1',
};

class FiatShamirBinding {
    static createSecureChallenge(publicValues, options = {}) {
        const validation = this.validatePublicValues(publicValues);
        if (!validation.valid) {
            throw new Error(`Fiat-Shamir binding validation failed: ${validation.errors.join('; ')}`);
        }
        const canonicalBinding = this.createCanonicalBinding(publicValues, options);
        const challengeData    = this.computeSecureHash(canonicalBinding);
        return {
            challenge:      challengeData.digest,
            challengeHex:   challengeData.hex,
            bindingData:    canonicalBinding,
            bindingHash:    challengeData.bindingHash,
            includedValues: validation.includedValues,
            timestamp:      new Date().toISOString(),
            circuitSpec:    CIRCUIT_SPEC,
        };
    }

    static validatePublicValues(publicValues) {
        const errors = [], included = [];
        const check  = (key, extra) => {
            if (publicValues[key] == null) {
                errors.push(`Missing public value: ${key}`);
            } else {
                if (extra) extra();
                included.push(key);
            }
        };
        check('threshold');
        check('isValid', () => {
            if (![0, 1, '0', '1'].includes(publicValues.isValid))
                errors.push('isValid must be binary (0 or 1)');
        });
        check('incomeHashCommit');
        check('verifierId');
        check('timestamp');
        if (publicValues.context) included.push('context');
        return { valid: errors.length === 0, errors, includedValues: included };
    }

    static createCanonicalBinding(publicValues, options = {}) {
        const parts = [
            `CIRCUIT:${CIRCUIT_SPEC.circuitId}`,
            `VERSION:${CIRCUIT_SPEC.version}`,
            `PROTOCOL:${CIRCUIT_SPEC.protocol}`,
            `THRESHOLD:${publicValues.threshold}`,
            `IS_VALID:${publicValues.isValid}`,
            `INCOME_HASH_COMMIT:${publicValues.incomeHashCommit}`,
            `VERIFIER_ID:${publicValues.verifierId}`,
        ];
        if (publicValues.context)     parts.push(`CONTEXT:${publicValues.context}`);
        parts.push(`TIMESTAMP:${publicValues.timestamp}`);
        if (options.protocolVersion)  parts.push(`PROTOCOL_VERSION:${options.protocolVersion}`);
        if (options.additionalBinding) parts.push(`ADDITIONAL:${options.additionalBinding}`);
        return parts.join('|');
    }

    static computeSecureHash(bindingData) {
        const d1       = createHash('sha256').update(bindingData).digest();
        const d2       = createHash('sha512').update(bindingData).digest();
        const combined = Buffer.alloc(32);
        for (let i = 0; i < 32; i++) combined[i] = d1[i] ^ d2[i];
        return {
            digest:      combined,
            hex:         combined.toString('hex'),
            bindingHash: createHash('sha256').update(combined).digest('hex'),
        };
    }

    static verifyChallengeBind(publicValues, providedChallenge, options = {}) {
        try {
            const validation = this.validatePublicValues(publicValues);
            if (!validation.valid)
                return { valid: false, reason: 'Public values validation failed', errors: validation.errors };
            const binding  = this.createSecureChallenge(publicValues, options);
            const provided = Buffer.isBuffer(providedChallenge)
                ? providedChallenge
                : Buffer.from(providedChallenge, 'hex');
            const match = provided.equals(binding.challenge);
            return match
                ? { valid: true,  reason: 'Challenge properly bound', includedValues: validation.includedValues }
                : { valid: false, reason: 'Challenge does not match — values missing or modified',
                    expectedChallenge: binding.hex, providedChallenge: provided.toString('hex') };
        } catch (e) {
            return { valid: false, reason: `Binding verification error: ${e.message}` };
        }
    }

    static createBindingReport(publicValues, options = {}) {
        const validation    = this.validatePublicValues(publicValues);
        const challengeData = validation.valid ? this.createSecureChallenge(publicValues, options) : null;
        return {
            timestamp:           new Date().toISOString(),
            circuitSpec:         CIRCUIT_SPEC,
            validationStatus:    validation.valid,
            validationErrors:    validation.errors,
            includedValues:      validation.includedValues,
            totalValuesIncluded: validation.includedValues.length,
            challenge:           challengeData ? challengeData.challengeHex : null,
            bindingData:         challengeData ? challengeData.bindingData  : null,
        };
    }
}

// Single clean export — no duplicate defineProperty
module.exports                  = IncomeProver;
module.exports.FiatShamirBinding = FiatShamirBinding;
