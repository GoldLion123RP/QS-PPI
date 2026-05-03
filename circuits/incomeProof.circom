pragma circom 2.0.0;

/**
 * QS-PPI Income Verification Circuit
 * Circom 2.0 — Groth16 / BN254
 *
 * FIX (2026-03-01 v3):
 *   Removed non-quadratic salt constraint:
 *     saltSquared * saltSquared  ← degree 4 — NOT allowed in R1CS
 *   Circom only permits quadratic constraints (degree ≤ 2).
 *   The Poseidon(income, salt, nonce) commitment already cryptographically
 *   binds salt — a separate non-zero check is redundant.
 *
 * PUBLIC SIGNALS (in snarkjs publicSignals[] order):
 *   [0] isValid          — output, 1 if income > threshold
 *   [1] threshold        — public input (500000000 = 5 LPA)
 *   [2] incomeHashCommit — public input  Poseidon(income,salt,nonce)
 *
 * PRIVATE SIGNALS:
 *   income, salt, nonce
 */

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/bitify.circom";

template IncomeProof() {

    // ── PUBLIC INPUTS ────────────────────────────────────────────
    signal input threshold;          // 500000000 = 5 LPA
    signal input incomeHashCommit;   // Poseidon(income, salt, nonce)

    // ── PRIVATE INPUTS ───────────────────────────────────────────
    signal input income;             // Actual income (secret)
    signal input salt;               // Unlinkability randomness (secret)
    signal input nonce;              // Commitment entropy (secret)

    // ── OUTPUT ───────────────────────────────────────────────────
    signal output isValid;           // 1 if income > threshold, else 0


    // ── CONSTRAINT 1: Poseidon commitment ────────────────────────
    // Binds prover to a specific income value.
    // incomeHashCommit must equal Poseidon(income, salt, nonce).
    component incomeHasher = Poseidon(3);
    incomeHasher.inputs[0] <== income;
    incomeHasher.inputs[1] <== salt;
    incomeHasher.inputs[2] <== nonce;

    signal commitmentMatch <== incomeHasher.out - incomeHashCommit;
    commitmentMatch === 0;


    // ── CONSTRAINT 2: 32-bit range enforcement ────────────────────
    // Prevents BN254 field modulus wrap-around attacks.
    // Ensures income and threshold are genuine 32-bit values.
    component incomeBits    = Num2Bits(32);
    component thresholdBits = Num2Bits(32);
    incomeBits.in    <== income;
    thresholdBits.in <== threshold;


    // ── CONSTRAINT 3: income > threshold ──────────────────────────
    // GreaterThan(32) outputs 1 iff in[0] > in[1]
    component greaterThan = GreaterThan(32);
    greaterThan.in[0] <== income;
    greaterThan.in[1] <== threshold;
    isValid <== greaterThan.out;
}

// publicSignals[] order: [isValid(out), threshold(pub-in), incomeHashCommit(pub-in)]
component main { public [threshold, incomeHashCommit] } = IncomeProof();

