/**
 * QS-PID Prover
 *
 * publicSignals[] order:
 *   [0] isValid          — output (1 = income > threshold)
 *   [1] threshold        — public input
 *   [2] incomeHashCommit — public input
 */

const fs      = require('fs');
const path    = require('path');
const snarkjs = require('snarkjs');
const crypto  = require('crypto');
const { buildPoseidon } = require('circomlibjs');
const { createHash }    = require('crypto');

const BN254_PRIME    = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
const CIRCUIT_NAME   = 'incomeProof';
const ARTIFACTS_DIR  = path.join(__dirname, '../artifacts');

class IncomeProver {
    constructor() {
        this.poseidon = null;
        this.zkeyPath = path.join(ARTIFACTS_DIR, `${CIRCUIT_NAME}_final.zkey`);
        this.wasmPath = path.join(ARTIFACTS_DIR, `${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm`);
    }

    async initialize() {
        if (this.poseidon) return;
        this.poseidon = await buildPoseidon();
    }

    generateCommitments(income) {
        const salt        = BigInt('0x' + crypto.randomBytes(32).toString('hex')) % BN254_PRIME;
        const nonce       = BigInt('0x' + crypto.randomBytes(32).toString('hex')) % BN254_PRIME;
        const incomeField = BigInt(income) % BN254_PRIME;
        const commitment  = this.poseidon.F.toObject(this.poseidon([incomeField, salt, nonce]));
        return {
            incomeHashCommit: commitment.toString(),
            salt:             salt.toString(),
            nonce:            nonce.toString(),
        };
    }

    generateWitness(income, threshold, commitments) {
        return {
            income:           income.toString(),
            threshold:        threshold.toString(),
            incomeHashCommit: commitments.incomeHashCommit,
            salt:             commitments.salt,
            nonce:            commitments.nonce,
        };
    }

    async generateProof(income, threshold = '500000000', verifierId = 'verifier-default') {
        if (!this.poseidon) await this.initialize();

        const incomeInt    = BigInt(income);
        const thresholdInt = BigInt(threshold);

        if (incomeInt < 0n)     throw new Error('Invalid income: must be non-negative');
        if (thresholdInt <= 0n) throw new Error('Invalid threshold: must be positive');

        console.log('[*] Generating income proof...');
        console.log(`[*] Income    : ${incomeInt}`);
        console.log(`[*] Threshold : ${thresholdInt}\n`);

        const commitments = this.generateCommitments(incomeInt);
        const witness     = this.generateWitness(incomeInt, thresholdInt, commitments);

        // ---- heartbeat timer so user knows it's alive, not frozen ----
        console.log('[*] Computing witness + generating Groth16 proof...');
        console.log('    (first run: 1-4 min — loading WASM + zkey into memory)');
        const start     = Date.now();
        const heartbeat = setInterval(() => {
            const s = Math.round((Date.now() - start) / 1000);
            process.stdout.write(`\r    still working... ${s}s elapsed    `);
        }, 2000);

        let proof, publicSignals;
        try {
            ({ proof, publicSignals } = await snarkjs.groth16.fullProve(
                witness,
                this.wasmPath,
                this.zkeyPath
            ));
        } finally {
            clearInterval(heartbeat);
            process.stdout.write('\n');
        }
        // --------------------------------------------------------------

        const elapsed = ((Date.now() - start) / 1000).toFixed(1);
        console.log(`[\u2713] Proof generated (${elapsed}s)\n`);

        const pubStr  = publicSignals.map(s => s.toString());
        const isValid = pubStr[0] === '1';

        console.log('[*] Creating Fiat-Shamir challenge binding...');
        const fiatShamirBinding = FiatShamirBinding.createSecureChallenge({
            threshold:        pubStr[1],
            isValid:          isValid ? '1' : '0',
            incomeHashCommit: pubStr[2],
            verifierId,
            timestamp:        new Date().toISOString(),
        });
        const bindingForJson = Object.assign({}, fiatShamirBinding, {
            challenge: fiatShamirBinding.challenge.toString('hex'),
        });
        console.log('[\u2713] Fiat-Shamir binding created\n');

        return {
            proof:             this.formatProof(proof),
            publicSignals:     pubStr,
            commitments,
            fiatShamirBinding: bindingForJson,
            timestamp:         new Date().toISOString(),
            isValid,
            verifierId,
            threshold:         thresholdInt.toString(),
        };
    }

    formatProof(proof) {
        return {
            pi_a: proof.pi_a.map(x => x.toString()),
            pi_b: proof.pi_b.map(row => row.map(x => x.toString())),
            pi_c: proof.pi_c.map(x => x.toString()),
            protocol: 'groth16',
            curve:    'bn254',
        };
    }

    async generateMultiProofs(income, threshold = '500000000', count = 3) {
        const proofs = [];
        for (let i = 0; i < count; i++) {
            console.log(`[*] Generating proof ${i + 1}/${count}...`);
            proofs.push(await this.generateProof(income, threshold, `verifier-${i + 1}`));
        }
        return proofs;
    }
}

// ================================================================
// FIAT-SHAMIR BINDING
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
        if (!validation.valid)
            throw new Error(`Fiat-Shamir validation failed: ${validation.errors.join('; ')}`);
        const bindingData   = this.createCanonicalBinding(publicValues, options);
        const challengeData = this.computeSecureHash(bindingData);
        return {
            challenge:      challengeData.digest,
            challengeHex:   challengeData.hex,
            bindingData,
            bindingHash:    challengeData.bindingHash,
            includedValues: validation.includedValues,
            timestamp:      new Date().toISOString(),
            circuitSpec:    CIRCUIT_SPEC,
        };
    }

    static validatePublicValues(pv) {
        const errors = [], included = [];
        const need = (k, extra) => {
            if (pv[k] == null) { errors.push(`Missing: ${k}`); }
            else { if (extra) extra(); included.push(k); }
        };
        need('threshold');
        need('isValid', () => { if (!['0','1',0,1].includes(pv.isValid)) errors.push('isValid must be 0 or 1'); });
        need('incomeHashCommit');
        need('verifierId');
        need('timestamp');
        return { valid: errors.length === 0, errors, includedValues: included };
    }

    static createCanonicalBinding(pv, options = {}) {
        const parts = [
            `CIRCUIT:${CIRCUIT_SPEC.circuitId}`,
            `VERSION:${CIRCUIT_SPEC.version}`,
            `PROTOCOL:${CIRCUIT_SPEC.protocol}`,
            `THRESHOLD:${pv.threshold}`,
            `IS_VALID:${pv.isValid}`,
            `INCOME_HASH_COMMIT:${pv.incomeHashCommit}`,
            `VERIFIER_ID:${pv.verifierId}`,
            `TIMESTAMP:${pv.timestamp}`,
        ];
        if (options.additionalBinding) parts.push(`ADDITIONAL:${options.additionalBinding}`);
        return parts.join('|');
    }

    static computeSecureHash(bindingData) {
        const d1  = createHash('sha256').update(bindingData).digest();
        const d2  = createHash('sha512').update(bindingData).digest();
        const out = Buffer.alloc(32);
        for (let i = 0; i < 32; i++) out[i] = d1[i] ^ d2[i];
        return {
            digest:      out,
            hex:         out.toString('hex'),
            bindingHash: createHash('sha256').update(out).digest('hex'),
        };
    }

    static verifyChallengeBind(publicValues, providedChallenge) {
        try {
            const v = this.validatePublicValues(publicValues);
            if (!v.valid) return { valid: false, reason: 'Validation failed', errors: v.errors };
            const binding  = this.createSecureChallenge(publicValues);
            const provided = Buffer.isBuffer(providedChallenge)
                ? providedChallenge
                : Buffer.from(providedChallenge, 'hex');
            const match = provided.equals(binding.challenge);
            return match
                ? { valid: true,  reason: 'Challenge matches' }
                : { valid: false, reason: 'Challenge mismatch', expected: binding.challengeHex, got: provided.toString('hex') };
        } catch (e) {
            return { valid: false, reason: e.message };
        }
    }
}

module.exports                   = IncomeProver;
module.exports.FiatShamirBinding = FiatShamirBinding;
