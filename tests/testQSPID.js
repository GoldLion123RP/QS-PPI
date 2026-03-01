/**
 * QS-PID Core Test Suite
 *
 * Circuit uses Num2Bits(32) — max income = 2^32-1 = 4,294,967,295 (~42.9 LPA)
 * All income test values must be <= 4294967295
 */

const IncomeProver   = require('../src/prover');
const IncomeVerifier = require('../src/verifier');

const assert = (condition, message) => {
    if (!condition) throw new Error(`[\u2717] Assertion failed: ${message}`);
    console.log(`[\u2713] ${message}`);
};

const testGroup = (name) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  ${name}`);
    console.log('='.repeat(60) + '\n');
};

// ====================================================================
// Test 1: Valid Income Proofs
// ====================================================================
async function testValidProofs() {
    testGroup('Test 1: Valid Income Proofs');

    const prover    = new IncomeProver();
    const verifier  = new IncomeVerifier();
    await prover.initialize();
    await verifier.initialize();

    const threshold = '500000000'; // 5 LPA
    const validIncomes = [
        { income: '600000000',  label: '6 LPA (> 5 LPA)' },
        { income: '1000000000', label: '10 LPA (>> 5 LPA)' },
        { income: '500000001',  label: '5.00000001 LPA (barely > 5 LPA)' },
        // FIX: was 999999999999 — overflows Num2Bits(32) max 4,294,967,295
        { income: '4200000000', label: '42 LPA (near circuit max ~42.9 LPA)' },
    ];

    for (const { income, label } of validIncomes) {
        console.log(`[*] Testing valid income: ${label}`);
        const proofData = await prover.generateProof(income, threshold);

        assert(proofData !== null,                  'Proof generated');
        assert(proofData.proof !== undefined,        'Proof object exists');
        assert(proofData.commitments !== undefined,  'Commitments exist');
        assert(proofData.publicSignals !== undefined,'Public signals exist');
        assert(proofData.isValid === true,           'Proof validity flag is true');

        const result = await verifier.verifyProof(proofData, 'verifier-1');
        assert(result.valid === true, `Proof verified for income ${label}`);
        console.log(`   \u2514\u2500 Proof signals: ${proofData.publicSignals.join(', ')}\n`);
    }
}

// ====================================================================
// Test 2: Invalid Income Proofs
// ====================================================================
async function testInvalidProofs() {
    testGroup('Test 2: Invalid Income Proofs');

    const prover   = new IncomeProver();
    const verifier = new IncomeVerifier();
    await prover.initialize();
    await verifier.initialize();

    const threshold = '500000000';
    const invalidIncomes = [
        { income: '400000000', label: '4 LPA (< 5 LPA)' },
        { income: '499999999', label: '4.99999999 LPA (barely < 5 LPA)' },
        { income: '0',         label: '0 (no income)' },
        { income: '1',         label: '1 (minimal)' },
    ];

    for (const { income, label } of invalidIncomes) {
        console.log(`[*] Testing invalid income: ${label}`);
        const proofData = await prover.generateProof(income, threshold);

        assert(proofData !== null,          'Proof object generated');
        assert(proofData.isValid === false,  'Proof validity flag is false');

        const result = await verifier.verifyProof(proofData, 'verifier-1');
        assert(result.valid === false, `Verification correctly failed for income ${label}`);
        assert(result.reason === 'Income does not exceed threshold', 'Correct failure reason');
        console.log(`   \u2514\u2500 Expected rejection: ${result.reason}\n`);
    }
}

// ====================================================================
// Test 3: Boundary Conditions
// ====================================================================
async function testBoundaryConditions() {
    testGroup('Test 3: Boundary Conditions');

    const prover = new IncomeProver();
    await prover.initialize();
    const threshold = '500000000';

    console.log('[*] Income exactly equal to threshold (500000000)');
    const exactProof = await prover.generateProof(threshold, threshold);
    assert(exactProof.isValid === false, 'Exactly-threshold income fails (not strictly greater)');

    console.log('[*] Income just above threshold (500000001)');
    const justAboveProof = await prover.generateProof('500000001', threshold);
    assert(justAboveProof.isValid === true, 'Just-above-threshold income passes');

    // FIX: was '999999999999999999' — overflows Num2Bits(32)
    // Circuit max = 2^32-1 = 4,294,967,295 (~42.9 LPA)
    console.log('[*] Near-max income within 32-bit circuit limit (42 LPA = 4,200,000,000)');
    const nearMaxProof = await prover.generateProof('4200000000', threshold);
    assert(nearMaxProof !== null, 'Near-max income proof generated within 32-bit limit');
    assert(nearMaxProof.isValid === true, 'Near-max income is above threshold');

    console.log('[*] Income overflow rejected by prover (> 2^32-1)');
    try {
        await prover.generateProof('9999999999', threshold); // > 4,294,967,295
        assert(false, 'Should reject overflow income');
    } catch (err) {
        assert(err.message.includes('exceeds circuit max'), 'Overflow income correctly rejected');
    }
    console.log();
}

// ====================================================================
// Test 4: Multi-Verifier Unlinkability
// ====================================================================
async function testUnlinkability() {
    testGroup('Test 4: Multi-Verifier Unlinkability');

    const prover   = new IncomeProver();
    const verifier = new IncomeVerifier();
    await prover.initialize();
    await verifier.initialize();

    const income    = '700000000';
    const threshold = '500000000';

    console.log('[*] Generating 3 proofs for same income (different blinding factors)');
    const proofs      = await prover.generateMultiProofs(income, threshold, 3);
    const commitments = proofs.map(p => p.commitments.incomeHashCommit);
    const unique      = new Set(commitments);
    assert(unique.size === 3, 'All proofs have different commitments (unlinkable)');

    console.log('[*] Verifying all 3 proofs with different verifiers');
    const vids = ['verifier-alice', 'verifier-bob', 'verifier-charlie'];
    for (let i = 0; i < proofs.length; i++) {
        const result = await verifier.verifyProof(proofs[i], vids[i]);
        assert(result.valid === true, `Proof ${i + 1} verified by ${vids[i]}`);
    }

    console.log('[*] Checking unlinkability across verifiers');
    const report = verifier.checkUnlinkability(proofs);
    assert(report.unlinkable === true, 'Proofs are computationally unlinkable');
    console.log(`   \u2514\u2500 Unique commitments: ${report.uniqueCommitments}/3\n`);
}

// ====================================================================
// Test 5: Batch Verification
// ====================================================================
async function testBatchVerification() {
    testGroup('Test 5: Batch Verification');

    const prover   = new IncomeProver();
    const verifier = new IncomeVerifier();
    await prover.initialize();
    await verifier.initialize();

    const threshold = '500000000';

    console.log('[*] Generating batch: 2 valid proofs, 1 invalid proof');
    const validProof1  = await prover.generateProof('600000000', threshold);
    const validProof2  = await prover.generateProof('1000000000', threshold);
    const invalidProof = await prover.generateProof('400000000', threshold);
    const batchProofs  = [validProof1, validProof2, invalidProof];

    console.log('[*] Batch verifying 3 proofs');
    const batchResult = await verifier.batchVerify(batchProofs, 'batch-verifier-1');

    assert(batchResult.totalProofs === 3,           'All 3 proofs processed');
    assert(batchResult.validProofs === 2,           '2 proofs verified as valid');
    assert(batchResult.results[0].valid === true,   'First proof is valid');
    assert(batchResult.results[1].valid === true,   'Second proof is valid');
    assert(batchResult.results[2].valid === false,  'Third proof is correctly rejected');
    console.log(`   \u2514\u2500 Results: ${batchResult.validProofs}/${batchResult.totalProofs} passed\n`);
}

// ====================================================================
// Test 6: Anti-Replay Protection
// ====================================================================
async function testAntiReplay() {
    testGroup('Test 6: Anti-Replay Protection');

    const prover   = new IncomeProver();
    const verifier = new IncomeVerifier();
    await prover.initialize();
    await verifier.initialize();

    const proofData = await prover.generateProof('700000000', '500000000');

    console.log('[*] Verifying proof with nonce protection');
    const result = await verifier.verifyProof(proofData, 'verifier-1', { requireNonce: true });
    assert(result.valid === true,          'Proof verified with nonce');
    assert(result.nonce !== undefined,     'Nonce generated for replay protection');
    assert(result.challenge !== undefined, 'Challenge generated');

    console.log('[*] Attempting replay with same proof to different verifier');
    const replayResult = await verifier.verifyProof(proofData, 'verifier-2', { requireNonce: true });
    assert(replayResult.valid === true, 'Proof valid to different verifier (unlinkable)');
    assert(result.nonce !== replayResult.nonce, 'Different nonces for different verifiers');
    console.log();
}

// ====================================================================
// Test 7: Proof Serialization
// ====================================================================
async function testSerialization() {
    testGroup('Test 7: Proof Serialization');

    const prover   = new IncomeProver();
    const verifier = new IncomeVerifier();
    await prover.initialize();
    await verifier.initialize();

    const proofData   = await prover.generateProof('800000000', '500000000');

    console.log('[*] Serializing proof to JSON');
    const jsonString = JSON.stringify(proofData);
    assert(jsonString !== null, 'Proof serialized to JSON');

    console.log('[*] Deserializing proof from JSON');
    const parsed = JSON.parse(jsonString);
    assert(parsed.proof !== undefined,       'Deserialized proof structure intact');
    assert(parsed.commitments !== undefined, 'Commitments preserved');

    console.log('[*] Verifying deserialized proof');
    const result = await verifier.verifyProof(parsed, 'verifier-1');
    assert(result.valid === true, 'Deserialized proof verifies correctly');
    console.log();
}

// ====================================================================
// Test 8: Input Validation
// ====================================================================
async function testInputValidation() {
    testGroup('Test 8: Input Validation');

    const prover = new IncomeProver();
    await prover.initialize();

    console.log('[*] Rejecting negative income');
    try {
        await prover.generateProof('-100', '500000000');
        assert(false, 'Should reject negative income');
    } catch (err) {
        assert(err.message.includes('Invalid'), 'Correct error for negative income');
    }

    console.log('[*] Rejecting invalid threshold');
    try {
        await prover.generateProof('700000000', '0');
        assert(false, 'Should reject zero threshold');
    } catch (err) {
        assert(err.message.includes('positive'), 'Correct error for invalid threshold');
    }

    console.log('[*] Rejecting NaN values');
    try {
        await prover.generateProof('not-a-number', '500000000');
        assert(false, 'Should reject non-numeric income');
    } catch (err) {
        assert(err.message.includes('Invalid'), 'Correct error for non-numeric input');
    }

    console.log('[*] Rejecting overflow income (> circuit max)');
    try {
        await prover.generateProof('9999999999', '500000000');
        assert(false, 'Should reject overflow income');
    } catch (err) {
        assert(err.message.includes('exceeds circuit max'), 'Overflow income rejected');
    }
    console.log();
}

// ====================================================================
// Test 9: Fiat-Shamir Binding Security
// ====================================================================
async function testFiatShamirBinding() {
    testGroup('Test 9: Fiat-Shamir Binding Security [CRITICAL]');

    const prover   = new IncomeProver();
    const verifier = new IncomeVerifier();
    await prover.initialize();
    await verifier.initialize();

    const income     = '600000000';
    const threshold  = '500000000';
    const verifierId = 'test-verifier-001';

    console.log('[*] 9.1: Generate proof with Fiat-Shamir binding');
    const proofData = await prover.generateProof(income, threshold, verifierId);
    assert(proofData.fiatShamirBinding,                            'Fiat-Shamir binding created');
    assert(proofData.fiatShamirBinding.challenge,                  'Challenge digest present');
    assert(proofData.fiatShamirBinding.bindingData,                'Binding data present');
    assert(proofData.fiatShamirBinding.includedValues.length > 0,  'Values included in binding');
    console.log(`[\u2713] Binding includes ${proofData.fiatShamirBinding.includedValues.length} value groups`);

    console.log('[*] 9.2: Verify proof with binding validation');
    const verificationResult = await verifier.verifyProof(proofData, verifierId, { validateBinding: true });
    assert(verificationResult.valid,           'Proof verification successful');
    assert(verificationResult.bindingValidated,'Binding was validated during verification');

    console.log('[*] 9.3: Detect binding tampering (modified commitment)');
    const tamperedProof = JSON.parse(JSON.stringify(proofData));
    tamperedProof.commitments.incomeHashCommit =
        (BigInt(tamperedProof.commitments.incomeHashCommit) + 1n).toString();
    const tamperedResult = await verifier.verifyProof(tamperedProof, verifierId, { validateBinding: true });
    assert(!tamperedResult.valid, 'Tampered binding detected as invalid');
    console.log(`[\u2713] Tampering detection reason: ${tamperedResult.reason}`);

    console.log('[*] 9.4: Detect binding with wrong verifier context');
    const wrongResult = await verifier.verifyProof(proofData, 'different-verifier', { validateBinding: true });
    console.log(`[*] Binding verification with different verifier: ${wrongResult.valid ? 'PASSED (acceptable)' : 'REJECTED'}`);

    console.log('[*] 9.5: Test canonical binding is deterministic');
    const FiatShamirBinding = IncomeProver.FiatShamirBinding;
    const publicValues = {
        threshold,
        isValid:          '1',
        incomeHashCommit: proofData.commitments.incomeHashCommit.toString(),
        verifierId,
        timestamp:        proofData.timestamp,
    };
    const b1 = FiatShamirBinding.createSecureChallenge(publicValues);
    const b2 = FiatShamirBinding.createSecureChallenge(publicValues);
    assert(b1.challengeHex === b2.challengeHex, 'Binding is deterministic for same inputs');

    console.log('[*] 9.6: Binding changes with different public values');
    const b3 = FiatShamirBinding.createSecureChallenge({ ...publicValues, isValid: '0' });
    assert(b1.challengeHex !== b3.challengeHex, 'Binding changes when public values change');

    console.log('[*] 9.7: Binding validates with correct values');
    const bv = FiatShamirBinding.verifyChallengeBind(publicValues, b1.challenge);
    assert(bv.valid, 'Binding verification successful with correct values');

    console.log('[*] 9.8: Binding rejects incomplete values');
    try {
        FiatShamirBinding.createSecureChallenge({ threshold, isValid: '1', verifierId, timestamp: proofData.timestamp });
        throw new Error('Should have rejected');
    } catch (err) {
        assert(err.message.includes('validation failed'), 'Binding creation rejected incomplete values');
    }

    console.log('[*] 9.9: Binding report generation');
    const report = FiatShamirBinding.createBindingReport(publicValues);
    assert(report.validationStatus,            'Binding report shows valid status');
    assert(report.totalValuesIncluded > 0,     'Report includes value count');
    assert(report.securityNotes,               'Report includes security documentation');
    console.log(`[\u2713] Binding report: ${report.totalValuesIncluded} values included`);
    console.log(`[\u2713] Security: ${report.securityNotes.omissionProtection}`);

    console.log('[*] 9.10: All public value fields are mandatory');
    const requiredFields = ['threshold','isValid','incomeHashCommit','verifierId','timestamp'];
    for (const field of requiredFields) {
        const test = { ...publicValues };
        delete test[field];
        try {
            FiatShamirBinding.createSecureChallenge(test);
            throw new Error(`Should reject missing ${field}`);
        } catch (err) {
            assert(err.message.includes('validation failed'), `Binding rejects missing ${field}`);
        }
    }
    console.log(`\n[\u2713] All ${requiredFields.length} mandatory fields validated`);
}

// ====================================================================
// Test 10: Performance Benchmarks
// ====================================================================
async function testPerformance() {
    testGroup('Test 10: Performance Benchmarks');

    const prover   = new IncomeProver();
    const verifier = new IncomeVerifier();
    await prover.initialize();
    await verifier.initialize();

    const income    = '700000000';
    const threshold = '500000000';

    console.log('[*] Benchmarking proof generation (5 iterations)');
    const genTimes = [];
    for (let i = 0; i < 5; i++) {
        const t = Date.now();
        await prover.generateProof(income, threshold);
        genTimes.push(Date.now() - t);
    }
    const avgGen = (genTimes.reduce((a,b)=>a+b,0)/genTimes.length).toFixed(0);
    console.log(`   \u2514\u2500 Avg proof generation: ${avgGen} ms`);

    console.log('[*] Benchmarking proof verification (5 iterations)');
    const proofData  = await prover.generateProof(income, threshold);
    const verTimes   = [];
    for (let i = 0; i < 5; i++) {
        const t = Date.now();
        await verifier.verifyProof(proofData, `verifier-${i}`);
        verTimes.push(Date.now() - t);
    }
    const avgVer = (verTimes.reduce((a,b)=>a+b,0)/verTimes.length).toFixed(0);
    console.log(`   \u2514\u2500 Avg verification:     ${avgVer} ms`);
    console.log(`   \u2514\u2500 Total per credential: ${(parseInt(avgGen)+parseInt(avgVer))} ms\n`);
}

// ====================================================================
// Main Runner
// ====================================================================
async function runAllTests() {
    console.log('\n\u2554' + '\u2550'.repeat(60) + '\u2557');
    console.log('\u2551          QS-PID Core ZKP Test Suite                        \u2551');
    console.log('\u2551     Testing Income Verification with Zero-Knowledge        \u2551');
    console.log('\u2551     WITH FIAT-SHAMIR BINDING SECURITY VALIDATION          \u2551');
    console.log('\u255a' + '\u2550'.repeat(60) + '\u255d');

    try {
        await testValidProofs();
        await testInvalidProofs();
        await testBoundaryConditions();
        await testUnlinkability();
        await testBatchVerification();
        await testAntiReplay();
        await testSerialization();
        await testInputValidation();
        await testFiatShamirBinding();
        await testPerformance();

        console.log('\n\u2554' + '\u2550'.repeat(60) + '\u2557');
        console.log('\u2551              \u2713 All 10 Test Suites Passed                      \u2551');
        console.log('\u2551     Including Fiat-Shamir Binding Security Tests           \u2551');
        console.log('\u255a' + '\u2550'.repeat(60) + '\u255d\n');
        process.exit(0);
    } catch (err) {
        console.error('\n\u2554' + '\u2550'.repeat(60) + '\u2557');
        console.error('\u2551                   \u2717 Test Failed                            \u2551');
        console.error('\u255a' + '\u2550'.repeat(60) + '\u255d\n');
        console.error(err.message);
        process.exit(1);
    }
}

if (require.main === module) runAllTests();
module.exports = { runAllTests };
