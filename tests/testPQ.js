/**
 * Post-Quantum Cryptography Test Suite
 * 
 * Tests for ML-DSA integration and migration plan
 * Covers:
 * - ML-DSA key generation and export
 * - Hybrid signing (ECDSA + ML-DSA)
 * - Migration phase transitions
 * - Backward compatibility
 */

const {
    MLDSAKeyPair,
    MLDSASigner,
    MLDSAVerifier,
    HybridSigner,
    MigrationStateManager,
} = require('../src/pq/mldsa');

const assert = (condition, message) => {
    if (!condition) {
        throw new Error(`[✗] Assertion failed: ${message}`);
    }
    console.log(`[✓] ${message}`);
};

const testGroup = (name) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  ${name}`);
    console.log(`${'='.repeat(60)}\n`);
};

const testCase = (name) => {
    console.log(`[*] ${name}`);
};

/**
 * Test Suite: ML-DSA Key Generation
 */
async function testMLDSAKeyGeneration() {
    testGroup('Test 1: ML-DSA Key Generation');

    testCase('Generating ML-DSA-65 key pair');
    const keyPair = MLDSAKeyPair.generate('ML-DSA-65');

    assert(keyPair !== null, 'Key pair created');
    assert(keyPair.publicKey !== null, 'Public key generated');
    assert(keyPair.privateKey !== null, 'Private key generated');
    assert(keyPair.parameters !== null, 'Parameters stored');
    assert(keyPair.parameters.securityLevel === 'ML-DSA-65', 'Correct security level');
    assert(keyPair.parameters.algorithm === 'ML-DSA', 'Algorithm is ML-DSA');

    testCase('Generating ML-DSA-44 key pair');
    const keyPair44 = MLDSAKeyPair.generate('ML-DSA-44');
    assert(keyPair44.parameters.securityLevel === 'ML-DSA-44', 'ML-DSA-44 generated');

    testCase('Generating ML-DSA-87 key pair');
    const keyPair87 = MLDSAKeyPair.generate('ML-DSA-87');
    assert(keyPair87.parameters.securityLevel === 'ML-DSA-87', 'ML-DSA-87 generated');

    console.log(`   └─ Public Key: ${keyPair.publicKey.toString('hex').substring(0, 32)}...`);
    console.log(`   └─ Private Key Size: ${keyPair.privateKey.length} bytes\n`);
}

/**
 * Test Suite: ML-DSA Key Export
 */
async function testMLDSAKeyExport() {
    testGroup('Test 2: ML-DSA Key Export & Import');

    const keyPair = MLDSAKeyPair.generate('ML-DSA-65');

    testCase('Exporting public key');
    const publicKeyExport = keyPair.exportPublicKey();

    assert(publicKeyExport !== null, 'Public key exported');
    assert(publicKeyExport.algorithm === 'ML-DSA', 'Algorithm in export');
    assert(publicKeyExport.publicKey !== undefined, 'Key data in export');
    assert(publicKeyExport.parameters !== undefined, 'Parameters in export');

    testCase('Exporting unencrypted private key');
    const privateKeyExport = keyPair.exportPrivateKey();

    assert(privateKeyExport !== null, 'Private key exported');
    assert(privateKeyExport.encrypted === false, 'Not encrypted by default');

    testCase('Exporting encrypted private key');
    const password = 'secure-password-123';
    const encryptedKeyExport = keyPair.exportPrivateKey(password);

    assert(encryptedKeyExport.encrypted === true, 'Marked as encrypted');
    assert(
        encryptedKeyExport.privateKey !== privateKeyExport.privateKey,
        'Encrypted key differs from plaintext'
    );

    console.log(`   └─ Unencrypted Key Size: ${privateKeyExport.privateKey.length} chars`);
    console.log(`   └─ Encrypted Key Size: ${encryptedKeyExport.privateKey.length} chars`);
    console.log(`   └─ Encryption successful: ${encryptedKeyExport.privateKey.length > privateKeyExport.privateKey.length ? 'Yes' : 'No'}\n`);
}

/**
 * Test Suite: ML-DSA Signing and Verification
 */
async function testMLDSASigningVerification() {
    testGroup('Test 3: ML-DSA Signing & Verification');

    const keyPair = MLDSAKeyPair.generate('ML-DSA-65');
    const signer = new MLDSASigner(keyPair);
    const verifier = new MLDSAVerifier(keyPair.publicKey.toString('hex'));

    const message = { username: 'alice', income: '700000000' };

    testCase('Signing message with ML-DSA');
    const signature = signer.sign(message);

    assert(signature !== null, 'Signature generated');
    assert(signature.algorithm === 'ML-DSA', 'Algorithm in signature');
    assert(signature.signature !== undefined, 'Signature value present');
    assert(signature.messageHash !== undefined, 'Message hash present');
    assert(signature.securityLevel === 'ML-DSA-65', 'Security level recorded');

    testCase('Verifying signature');
    const verifyResult = verifier.verify(message, signature);

    assert(verifyResult.valid === true, 'Signature verified');
    assert(verifyResult.algorithm === 'ML-DSA', 'Algorithm in verification');

    testCase('Detecting tampered message');
    const tamperedMessage = { ...message, income: '100000000' };
    const tamperedResult = verifier.verify(tamperedMessage, signature);

    assert(tamperedResult.valid === false, 'Tampered message rejected');

    testCase('Detecting invalid signature');
    const invalidSignature = { ...signature, signature: 'invalid-sig-data' };
    const invalidResult = verifier.verify(message, invalidSignature);

    assert(invalidResult.valid === false, 'Invalid signature rejected');

    console.log(`   └─ Signature Size: ${signature.signature.length / 2} bytes`);
    console.log(`   └─ Message Hash: ${signature.messageHash.substring(0, 16)}...`);
    console.log(`   └─ Timestamp: ${signature.timestamp}\n`);
}

/**
 * Test Suite: Hybrid Signing (ECDSA + ML-DSA)
 */
async function testHybridSigning() {
    testGroup('Test 4: Hybrid Signing (ECDSA + ML-DSA)');

    const ecdsaKeyPair = { privateKey: Buffer.from('ecdsakey'), publicKey: Buffer.from('ecdsapub') };
    const mldsaKeyPair = MLDSAKeyPair.generate('ML-DSA-65');

    const hybridSigner = new HybridSigner(ecdsaKeyPair, mldsaKeyPair);

    const credential = {
        issuer: 'did:key:issuer1',
        credentialSubject: { id: 'did:key:subject1', income: '750000000' },
    };

    testCase('Creating hybrid signature');
    const hybridSignature = hybridSigner.signHybrid(credential);

    assert(hybridSignature !== null, 'Hybrid signature created');
    assert(hybridSignature.signatures.ecdsa !== undefined, 'ECDSA signature present');
    assert(hybridSignature.signatures.mlDSA !== undefined, 'ML-DSA signature present');
    assert(hybridSignature.signatures.ecdsa.algorithm === 'ECDSA', 'ECDSA algorithm marked');
    assert(hybridSignature.signatures.mlDSA.algorithm === 'ML-DSA', 'ML-DSA algorithm marked');
    assert(
        hybridSignature.purpose === 'HYBRID_SIGNING_FOR_BACKWARD_COMPATIBILITY',
        'Purpose documented'
    );

    testCase('Getting hybrid identity');
    const hybridIdentity = hybridSigner.getIdentity();

    assert(hybridIdentity.mode === 'HYBRID', 'Mode is HYBRID');
    assert(hybridIdentity.algorithms.includes('ECDSA'), 'ECDSA in algorithms');
    assert(hybridIdentity.algorithms.includes('ML-DSA'), 'ML-DSA in algorithms');
    assert(hybridIdentity.primaryAlgorithm === 'ML-DSA', 'ML-DSA is primary');
    assert(hybridIdentity.fallbackAlgorithm === 'ECDSA', 'ECDSA is fallback');

    console.log(`   └─ ECDSA Signature: ${hybridSignature.signatures.ecdsa.signature.substring(0, 16)}...`);
    console.log(`   └─ ML-DSA Signature: ${hybridSignature.signatures.mlDSA.signature.substring(0, 16)}...`);
    console.log(`   └─ Message Hash: ${hybridSignature.messageHash.substring(0, 16)}...\n`);
}

/**
 * Test Suite: Migration State Management
 */
async function testMigrationStateManagement() {
    testGroup('Test 5: Migration State Management');

    const stateManager = new MigrationStateManager();

    testCase('Checking initial phase');
    const initialPhase = stateManager.getCurrentPhase();

    assert(initialPhase.phase === 'PHASE_1_ECDSA_ONLY', 'Initial phase is ECDSA only');
    assert(initialPhase.activeAlgorithms.includes('ECDSA-Secp256k1'), 'ECDSA active');
    assert(!initialPhase.activeAlgorithms.includes('ML-DSA'), 'ML-DSA not active yet');

    testCase('Recording credential issuance');
    stateManager.recordCredentialIssuance('ECDSA');
    stateManager.recordCredentialIssuance('ECDSA');
    stateManager.recordCredentialIssuance('ECDSA');

    const stats1 = stateManager.getStatistics();
    assert(stats1.ecdsaCredentialsIssued === 3, '3 ECDSA credentials recorded');
    assert(stats1.mldsaAdoption === '0%', 'No ML-DSA adoption yet');

    testCase('Progressing to Phase 2 (Hybrid)');
    const progressResult = stateManager.progressPhase();
    assert(progressResult === true, 'Phase progressed');

    const phase2 = stateManager.getCurrentPhase();
    assert(phase2.phase === 'PHASE_2_HYBRID', 'Now in Phase 2');
    assert(phase2.activeAlgorithms.includes('ECDSA-Secp256k1'), 'ECDSA still active');
    assert(phase2.activeAlgorithms.includes('ML-DSA-65'), 'ML-DSA now active');

    testCase('Recording hybrid credentials');
    stateManager.recordCredentialIssuance('HYBRID');
    stateManager.recordCredentialIssuance('HYBRID');
    stateManager.recordCredentialIssuance('ML-DSA');

    const stats2 = stateManager.getStatistics();
    assert(stats2.hybridCredentialsIssued === 2, '2 hybrid credentials recorded');
    assert(stats2.mldsaCredentialsIssued === 1, '1 ML-DSA credential recorded');

    testCase('Progressing through remaining phases');
    assert(stateManager.progressPhase() === true, 'Progress to Phase 3');
    assert(stateManager.getCurrentPhase().phase === 'PHASE_3_MLDSA_PRIMARY', 'Phase 3 reached');

    assert(stateManager.progressPhase() === true, 'Progress to Phase 4');
    assert(stateManager.getCurrentPhase().phase === 'PHASE_4_MLDSA_ONLY', 'Phase 4 reached');

    testCase('Attempting to progress beyond final phase');
    const finalProgress = stateManager.progressPhase();
    assert(finalProgress === false, 'Cannot progress beyond Phase 4');
    assert(stateManager.getCurrentPhase().phase === 'PHASE_4_MLDSA_ONLY', 'Still in Phase 4');

    console.log(`   └─ Phase Progression: Phase 1 → Phase 2 → Phase 3 → Phase 4 (Complete)`);
    console.log(`   └─ Final Statistics: ${JSON.stringify(stats2, null, 2)}\n`);
}

/**
 * Test Suite: Phase-Specific Verification Rules
 */
async function testPhaseSpecificRules() {
    testGroup('Test 6: Phase-Specific Verification Rules');

    const stateManager = new MigrationStateManager();

    // Phase 1: ECDSA Only
    testCase('Phase 1: ECDSA Only - Accept ECDSA signatures');
    let phase = stateManager.getCurrentPhase();
    assert(phase.phase === 'PHASE_1_ECDSA_ONLY', 'In Phase 1');
    const phase1Algorithms = stateManager.getActiveAlgorithms();
    assert(phase1Algorithms.length === 1, 'Only one algorithm active');
    assert(phase1Algorithms.includes('ECDSA-Secp256k1'), 'ECDSA is active');

    // Phase 2: Hybrid
    testCase('Phase 2: Hybrid - Accept ECDSA OR ML-DSA');
    stateManager.progressPhase();
    phase = stateManager.getCurrentPhase();
    assert(phase.phase === 'PHASE_2_HYBRID', 'In Phase 2');
    const phase2Algorithms = stateManager.getActiveAlgorithms();
    assert(phase2Algorithms.length === 2, 'Two algorithms active');
    assert(phase2Algorithms.includes('ECDSA-Secp256k1'), 'ECDSA active');
    assert(phase2Algorithms.includes('ML-DSA-65'), 'ML-DSA active');

    // Phase 3: ML-DSA Primary
    testCase('Phase 3: ML-DSA Primary - Prefer ML-DSA, accept ECDSA legacy');
    stateManager.progressPhase();
    phase = stateManager.getCurrentPhase();
    assert(phase.phase === 'PHASE_3_MLDSA_PRIMARY', 'In Phase 3');
    const phase3Algorithms = stateManager.getActiveAlgorithms();
    assert(phase3Algorithms[0] === 'ML-DSA-65', 'ML-DSA is primary');
    assert(phase3Algorithms.some(a => a.includes('ECDSA')), 'ECDSA available as legacy');

    // Phase 4: ML-DSA Only
    testCase('Phase 4: ML-DSA Only - Accept ML-DSA only');
    stateManager.progressPhase();
    phase = stateManager.getCurrentPhase();
    assert(phase.phase === 'PHASE_4_MLDSA_ONLY', 'In Phase 4');
    const phase4Algorithms = stateManager.getActiveAlgorithms();
    assert(phase4Algorithms.length === 1, 'Only one algorithm active');
    assert(phase4Algorithms.includes('ML-DSA-65'), 'ML-DSA is only algorithm');

    console.log();
}

/**
 * Test Suite: Backward Compatibility
 */
async function testBackwardCompatibility() {
    testGroup('Test 7: Backward Compatibility');

    testCase('Creating credentials in Phase 1 (ECDSA)');
    const stateManager1 = new MigrationStateManager();
    stateManager1.recordCredentialIssuance('ECDSA');

    const credPhase1 = {
        type: 'IncomeProofCredential',
        proof: {
            type: 'EcdsaSecp256k1Signature2019',
            signatureValue: '0x...',
        },
    };

    testCase('Verifying Phase 1 credential in Phase 2 (Hybrid)');
    const stateManager2 = new MigrationStateManager();
    stateManager2.progressPhase(); // Move to Phase 2

    // In Phase 2, ECDSA-signed credentials should still verify
    const phase2Can = stateManager2.getActiveAlgorithms().some(a => a.includes('ECDSA'));
    assert(phase2Can === true, 'Phase 2 can verify Phase 1 credentials');

    testCase('Verifying Phase 1 credential in Phase 3 (ML-DSA Primary)');
    const stateManager3 = new MigrationStateManager();
    stateManager3.progressPhase();
    stateManager3.progressPhase();

    const phase3Can = stateManager3.getActiveAlgorithms().some(a => a.includes('ECDSA'));
    assert(phase3Can === true, 'Phase 3 can verify Phase 1 credentials (legacy mode)');

    testCase('Verifying Phase 1 credential in Phase 4 (ML-DSA Only)');
    const stateManager4 = new MigrationStateManager();
    stateManager4.progressPhase();
    stateManager4.progressPhase();
    stateManager4.progressPhase();

    const phase4Can = stateManager4.getActiveAlgorithms().some(a => a.includes('ECDSA'));
    assert(phase4Can === false, 'Phase 4 cannot verify Phase 1 credentials (not backward compatible)');

    console.log(`   └─ Backward compatibility window: Phase 1 → Phase 3`);
    console.log(`   └─ ECDSA sunset: Phase 4\n`);
}

/**
 * Test Suite: Migration Timeline
 */
async function testMigrationTimeline() {
    testGroup('Test 8: Migration Timeline Simulation');

    console.log('[*] Simulating QS-PID migration timeline\n');

    const timeline = [];

    // Phase 1: ECDSA Only
    console.log('[Phase 1: ECDSA Only - Q1 2025]');
    const sm1 = new MigrationStateManager();
    for (let i = 0; i < 1000; i++) {
        sm1.recordCredentialIssuance('ECDSA');
    }
    timeline.push({ phase: 'PHASE_1', stats: sm1.getStatistics() });
    console.log(`   Issued: 1000 ECDSA credentials`);
    console.log(`   ML-DSA Adoption: ${sm1.getStatistics().mldsaAdoption}\n`);

    // Phase 2: Hybrid
    console.log('[Phase 2: Hybrid - Q2 2025]');
    sm1.progressPhase();
    for (let i = 0; i < 500; i++) {
        sm1.recordCredentialIssuance('HYBRID');
    }
    for (let i = 0; i < 200; i++) {
        sm1.recordCredentialIssuance('ML-DSA');
    }
    timeline.push({ phase: 'PHASE_2', stats: sm1.getStatistics() });
    console.log(`   Issued: 500 Hybrid + 200 ML-DSA credentials`);
    console.log(`   ML-DSA Adoption: ${sm1.getStatistics().mldsaAdoption}\n`);

    // Phase 3: ML-DSA Primary
    console.log('[Phase 3: ML-DSA Primary - Q4 2025]');
    sm1.progressPhase();
    for (let i = 0; i < 100; i++) {
        sm1.recordCredentialIssuance('ECDSA');
    }
    for (let i = 0; i < 900; i++) {
        sm1.recordCredentialIssuance('ML-DSA');
    }
    timeline.push({ phase: 'PHASE_3', stats: sm1.getStatistics() });
    console.log(`   Issued: 100 ECDSA (legacy) + 900 ML-DSA credentials`);
    console.log(`   ML-DSA Adoption: ${sm1.getStatistics().mldsaAdoption}\n`);

    // Phase 4: ML-DSA Only
    console.log('[Phase 4: ML-DSA Only - 2026+]');
    sm1.progressPhase();
    for (let i = 0; i < 1000; i++) {
        sm1.recordCredentialIssuance('ML-DSA');
    }
    timeline.push({ phase: 'PHASE_4', stats: sm1.getStatistics() });
    console.log(`   Issued: 1000 ML-DSA credentials`);
    console.log(`   ML-DSA Adoption: ${sm1.getStatistics().mldsaAdoption}\n`);

    console.log('[*] Migration Summary:');
    console.log(`   Total Credentials Issued: ${sm1.getStatistics().totalCredentials}`);
    console.log(`   ECDSA: ${sm1.getStatistics().ecdsaCredentialsIssued}`);
    console.log(`   Hybrid: ${sm1.getStatistics().hybridCredentialsIssued}`);
    console.log(`   ML-DSA: ${sm1.getStatistics().mldsaCredentialsIssued}`);
    console.log(`   Final ML-DSA Adoption: ${sm1.getStatistics().mldsaAdoption}\n`);
}

/**
 * Main Test Runner
 */
async function runAllTests() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║     Post-Quantum Cryptography (ML-DSA) Test Suite        ║');
    console.log('║           Testing Migration Plan Implementation           ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    try {
        await testMLDSAKeyGeneration();
        await testMLDSAKeyExport();
        await testMLDSASigningVerification();
        await testHybridSigning();
        await testMigrationStateManagement();
        await testPhaseSpecificRules();
        await testBackwardCompatibility();
        await testMigrationTimeline();

        console.log('\n╔════════════════════════════════════════════════════════════╗');
        console.log('║       ✓ All Post-Quantum Tests Passed                    ║');
        console.log('╚════════════════════════════════════════════════════════════╝\n');
        process.exit(0);
    } catch (error) {
        console.error('\n\n╔════════════════════════════════════════════════════════════╗');
        console.error('║                   ✗ Test Failed                            ║');
        console.error('╚════════════════════════════════════════════════════════════╝\n');
        console.error(error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    runAllTests();
}

module.exports = { runAllTests };
