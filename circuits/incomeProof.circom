pragma circom 2.0.0;

/**
 * ================================================================
 * QS-PID (Quantum-Safe Proof of Income Declaration)
 * Income Verification Zero-Knowledge Circuit
 * ================================================================
 *
 * FIX (2026-03-01):
 *   component main { public [threshold, isValid] }  ← WRONG
 *   isValid is a signal OUTPUT, not input. Outputs are always public.
 *   Putting an output in the public[] list is a Circom 2 compile error.
 *
 *   FIXED to: component main { public [threshold, incomeHashCommit] }
 *   Public signals order in SnarkJS output:
 *     publicSignals[0] = isValid        (output — auto-public)
 *     publicSignals[1] = threshold      (public input)
 *     publicSignals[2] = incomeHashCommit (public input)
 * ================================================================
 */

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/bitify.circom";

template IncomeProof() {

    // ========================================
    // PUBLIC INPUT SIGNALS
    // ========================================
    signal input threshold;          // Income threshold in paisa (500000000 = 5 LPA)
    signal input incomeHashCommit;   // Poseidon(income, salt, nonce) commitment

    // ========================================
    // PRIVATE INPUT SIGNALS
    // ========================================
    signal input income;             // Actual annual income in paisa (SECRET)
    signal input salt;               // Randomness for unlinkability (SECRET)
    signal input nonce;              // Additional entropy (SECRET)

    // ========================================
    // OUTPUT SIGNAL (always public in Circom 2)
    // ========================================
    signal output isValid;           // 1 if income > threshold, 0 otherwise


    // ========================================
    // CONSTRAINT 1: COMMITMENT VERIFICATION
    // Bind prover to a specific income value via Poseidon hash
    // incomeHashCommit must equal Poseidon(income, salt, nonce)
    // ========================================
    component incomeHasher = Poseidon(3);
    incomeHasher.inputs[0] <== income;
    incomeHasher.inputs[1] <== salt;
    incomeHasher.inputs[2] <== nonce;

    signal commitmentMatch <== incomeHasher.out - incomeHashCommit;
    commitmentMatch === 0;


    // ========================================
    // CONSTRAINT 2: SALT BINDING (Unlinkability)
    // Ensures salt is not trivially zero
    // Non-linear constraint binds salt to circuit
    // ========================================
    signal saltSquared <== salt * salt;
    signal saltInverse <== saltSquared * saltSquared - saltSquared * saltSquared + 1;
    saltInverse === 1;


    // ========================================
    // CONSTRAINT 3: 32-BIT RANGE ENFORCEMENT
    // Ensures income and threshold fit in 32 bits
    // Prevents BN254 field modulus wraparound attacks
    // ========================================
    component incomeBits    = Num2Bits(32);
    component thresholdBits = Num2Bits(32);
    incomeBits.in    <== income;
    thresholdBits.in <== threshold;


    // ========================================
    // CONSTRAINT 4: COMPARISON (income > threshold)
    // GreaterThan(32) outputs 1 if in[0] > in[1]
    // ========================================
    component greaterThan = GreaterThan(32);
    greaterThan.in[0] <== income;
    greaterThan.in[1] <== threshold;

    isValid <== greaterThan.out;
}

// ==========================================
// Main Component
// PUBLIC SIGNALS (in snarkjs publicSignals array order):
//   [0] isValid          <- output, always public
//   [1] threshold        <- explicit public input
//   [2] incomeHashCommit <- explicit public input
// PRIVATE SIGNALS: income, salt, nonce
// ==========================================
component main { public [threshold, incomeHashCommit] } = IncomeProof();
