/**
 * W3C VC 2.0 Compliance Test Suite
 * 
 * Tests for verifiable credential issuance, presentation, and verification
 * per W3C VC Data Model 2.0 specification
 */

const {
    IncomeProofCredential,
    IncomeProofCredentialSchema,
    VerifiablePresentationSchema,
} = require('../src/vc/credential');
const PresentationHandler = require('../src/vc/presentation');

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
 * Test Suite: Credential Issuance
 */
async function testCredentialIssuance() {
    testGroup('Test 1: W3C VC 2.0 Credential Issuance');

    const issuerId = 'did:key:z6MkhaXgBZDvotDkL5257faWLpa8Ykb7iXqPXo4T6aMVxXZ6';
    const subjectId = 'did:key:z6MkpTHR6qWfqrjVczQ1PAiDT4d1N2VjExXR2AKNy8u6FKQT';

    const mockZkProofData = {
        proof: {
            A: ['1', '2', '3'],
            B: [['4', '5'], ['6', '7'], ['8', '9']],
            C: ['10', '11', '12'],
        },
        commitments: {
            incomeHashCommit: '0x' + '1'.repeat(64),
            blindingFactor: '1234567890',
            nonce: '0987654321',
        },
        publicSignals: ['1', '500000000', '0x' + '1'.repeat(64)],
        isValid: true,
    };

    testCase('Creating income proof credential');
    const credentialBuilder = new IncomeProofCredential(
        issuerId,
        subjectId,
        mockZkProofData,
        { expirationDays: 365, revocationEnabled: true }
    );

    const credential = credentialBuilder.build();

    assert(credential !== null, 'Credential object created');
    assert(credential['@context'], 'Has @context');
    assert(Array.isArray(credential['@context']), '@context is array');
    assert(credential['@context'].includes('https://www.w3.org/2018/credentials/v1'), 'Contains W3C VC context');
    assert(credential.type, 'Has type field');
    assert(credential.type.includes('VerifiableCredential'), 'Type includes VerifiableCredential');
    assert(credential.type.includes('IncomeProofCredential'), 'Type includes IncomeProofCredential');
    assert(credential.issuer.id === issuerId, 'Issuer ID set correctly');
    assert(credential.credentialSubject.id === subjectId, 'Subject ID set correctly');
    assert(credential.credentialSubject.incomeProof !== undefined, 'Includes income proof');
    assert(credential.credentialStatus !== undefined, 'Includes revocation status');

    console.log(`   └─ Credential ID: ${credential.id}\n`);
}

/**
 * Test Suite: Credential Signing
 */
async function testCredentialSigning() {
    testGroup('Test 2: Credential Signing');

    const issuerId = 'did:key:z6MkhaXgBZDvotDkL5257faWLpa8Ykb7iXqPXo4T6aMVxXZ6';
    const subjectId = 'did:key:z6MkpTHR6qWfqrjVczQ1PAiDT4d1N2VjExXR2AKNy8u6FKQT';

    const mockZkProofData = {
        proof: { A: ['1', '2', '3'], B: [['4', '5'], ['6', '7'], ['8', '9']], C: ['10', '11', '12'] },
        commitments: { incomeHashCommit: '0x' + 'a'.repeat(64), blindingFactor: '1234567890', nonce: '0987654321' },
        publicSignals: ['1', '500000000', '0x' + 'a'.repeat(64)],
        isValid: true,
    };

    const credentialBuilder = new IncomeProofCredential(issuerId, subjectId, mockZkProofData);
    let credential = credentialBuilder.build();

    testCase('Signing credential with issuer key');
    const signingKey = 'issuer-secret-key';
    credential = await credentialBuilder.sign(credential, signingKey);

    assert(credential.proof !== undefined, 'Proof added to credential');
    assert(credential.proof.type === 'EcdsaSecp256k1Signature2019', 'Correct proof type');
    assert(credential.proof.signatureValue !== undefined, 'Signature value present');
    assert(credential.proof.verificationMethod !== undefined, 'Verification method present');
    assert(credential.proof.created !== undefined, 'Creation timestamp present');
    assert(credential.proof.domain === 'qs-pid.example', 'Domain set correctly');

    console.log(`   └─ Signature: ${credential.proof.signatureValue.substring(0, 16)}...`);
    console.log(`   └─ Verification Method: ${credential.proof.verificationMethod}\n`);
}

/**
 * Test Suite: Credential Validation
 */
async function testCredentialValidation() {
    testGroup('Test 3: Credential Schema Validation');

    const mockZkProofData = {
        proof: { A: ['1', '2', '3'], B: [['4', '5'], ['6', '7'], ['8', '9']], C: ['10', '11', '12'] },
        commitments: { incomeHashCommit: '0x' + 'b'.repeat(64), blindingFactor: '1234567890', nonce: '0987654321' },
        publicSignals: ['1', '500000000', '0x' + 'b'.repeat(64)],
        isValid: true,
    };

    const issuerId = 'did:key:z6MkhaXgBZDvotDkL5257faWLpa8Ykb7iXqPXo4T6aMVxXZ6';
    const subjectId = 'did:key:z6MkpTHR6qWfqrjVczQ1PAiDT4d1N2VjExXR2AKNy8u6FKQT';

    const credentialBuilder = new IncomeProofCredential(issuerId, subjectId, mockZkProofData);
    let credential = credentialBuilder.build();
    credential = await credentialBuilder.sign(credential, 'issuer-key');

    testCase('Validating well-formed credential');
    const validResult = credentialBuilder.validate(credential);
    assert(validResult.valid === true, 'Credential passes validation');
    assert(validResult.errors.length === 0, 'No validation errors');

    testCase('Detecting missing required field (@context)');
    const invalidCred1 = { ...credential };
    delete invalidCred1['@context'];
    const result1 = credentialBuilder.validate(invalidCred1);
    assert(result1.valid === false, 'Validation fails for missing @context');
    assert(result1.errors.length > 0, 'Errors detected');

    testCase('Detecting missing proof');
    const invalidCred2 = { ...credential };
    delete invalidCred2.proof;
    const result2 = credentialBuilder.validate(invalidCred2);
    assert(result2.valid === false, 'Validation fails for missing proof');

    testCase('Detecting expired credential');
    const expiredCred = JSON.parse(JSON.stringify(credential));
    expiredCred.expirationDate = new Date(Date.now() - 1000000).toISOString();
    const result3 = credentialBuilder.validate(expiredCred);
    assert(result3.valid === false, 'Validation fails for expired credential');
    assert(result3.errors.some(e => e.includes('expired')), 'Expiration error detected');

    console.log();
}

/**
 * Test Suite: Presentation Creation
 */
async function testPresentationCreation() {
    testGroup('Test 4: Verifiable Presentation Creation');

    const holderDid = 'did:key:z6MkpTHR6qWfqrjVczQ1PAiDT4d1N2VjExXR2AKNy8u6FKQT';
    const presentationHandler = new PresentationHandler(holderDid);

    const mockZkProofData = {
        proof: { A: ['1', '2', '3'], B: [['4', '5'], ['6', '7'], ['8', '9']], C: ['10', '11', '12'] },
        commitments: { incomeHashCommit: '0x' + 'c'.repeat(64), blindingFactor: '1234567890', nonce: '0987654321' },
        publicSignals: ['1', '500000000', '0x' + 'c'.repeat(64)],
        isValid: true,
    };

    const mockCredential = {
        '@context': 'https://www.w3.org/2018/credentials/v1',
        type: ['VerifiableCredential', 'IncomeProofCredential'],
        issuer: 'did:key:z6MkhaXgBZDvotDkL5257faWLpa8Ykb7iXqPXo4T6aMVxXZ6',
        credentialSubject: {
            id: holderDid,
            incomeProof: mockZkProofData.proof,
        },
    };

    const verifierChallenge = 'challenge-' + Math.random().toString(36).substring(7);

    testCase('Creating verifiable presentation');
    const presentation = await presentationHandler.createPresentation(
        mockCredential,
        verifierChallenge,
        { domain: 'verifier.example.com' }
    );

    assert(presentation !== null, 'Presentation created');
    assert(presentation['@context'] === 'https://www.w3.org/2018/credentials/v1', 'Correct context');
    assert(presentation.type === 'VerifiablePresentation', 'Correct type');
    assert(presentation.verifiableCredential !== undefined, 'Contains credential');
    assert(presentation.holder === holderDid, 'Holder DID set');
    assert(presentation.proof !== undefined, 'Presentation proof added');
    assert(presentation.proof.challenge === verifierChallenge, 'Challenge included');
    assert(presentation.proof.nonce !== undefined, 'Nonce generated');
    assert(presentation.proof.signatureValue !== undefined, 'Signed');

    console.log(`   └─ Presentation ID created at: ${presentation.proof.created}`);
    console.log(`   └─ Nonce: ${presentation.proof.nonce.substring(0, 16)}...`);
    console.log(`   └─ Challenge: ${verifierChallenge}\n`);
}

/**
 * Test Suite: Presentation Verification
 */
async function testPresentationVerification() {
    testGroup('Test 5: Verifiable Presentation Verification');

    const holderDid = 'did:key:z6MkpTHR6qWfqrjVczQ1PAiDT4d1N2VjExXR2AKNy8u6FKQT';
    const presentationHandler = new PresentationHandler(holderDid);

    const mockCredential = {
        '@context': 'https://www.w3.org/2018/credentials/v1',
        type: ['VerifiableCredential', 'IncomeProofCredential'],
        issuer: 'did:key:z6MkhaXgBZDvotDkL5257faWLpa8Ykb7iXqPXo4T6aMVxXZ6',
        credentialSubject: { id: holderDid },
    };

    const verifierChallenge = 'challenge-test';
    const presentation = await presentationHandler.createPresentation(
        mockCredential,
        verifierChallenge,
        { domain: 'verifier.example.com' }
    );

    testCase('Verifying authentic presentation');
    const verifyResult = presentationHandler.verifyPresentation(
        presentation,
        'verifier.example.com',
        10000 // 10 second max age
    );
    assert(verifyResult.valid === true, 'Presentation verified');

    testCase('Detecting domain mismatch');
    const wrongDomainResult = presentationHandler.verifyPresentation(
        presentation,
        'wrong-domain.com'
    );
    assert(wrongDomainResult.valid === false, 'Domain mismatch detected');
    assert(wrongDomainResult.reason === 'Domain mismatch', 'Correct error reason');

    testCase('Detecting expired presentation');
    // Modify timestamp to simulate old presentation
    const oldPresentation = JSON.parse(JSON.stringify(presentation));
    oldPresentation.proof.created = new Date(Date.now() - 100000).toISOString();

    const expiredResult = presentationHandler.verifyPresentation(
        oldPresentation,
        'verifier.example.com',
        1000 // 1 second max age
    );
    assert(expiredResult.valid === false, 'Expired presentation rejected');
    assert(expiredResult.reason === 'Presentation expired', 'Expiration detected');

    console.log();
}

/**
 * Test Suite: Multi-Presentation Unlinkability
 */
async function testPresentationUnlinkability() {
    testGroup('Test 6: Multi-Presentation Unlinkability');

    const holderDid = 'did:key:z6MkpTHR6qWfqrjVczQ1PAiDT4d1N2VjExXR2AKNy8u6FKQT';
    const presentationHandler = new PresentationHandler(holderDid);

    const mockCredential = {
        '@context': 'https://www.w3.org/2018/credentials/v1',
        type: ['VerifiableCredential', 'IncomeProofCredential'],
        issuer: 'did:key:z6MkhaXgBZDvotDkL5257faWLpa8Ykb7iXqPXo4T6aMVxXZ6',
        credentialSubject: {
            id: holderDid,
            incomeProof: {
                proofValue: 'proof-data-1',
            },
        },
    };

    testCase('Creating 2 presentations to different verifiers');
    const presentation1 = await presentationHandler.createPresentation(
        mockCredential,
        'challenge-1',
        { domain: 'verifier-alice.com' }
    );

    const presentation2 = await presentationHandler.createPresentation(
        mockCredential,
        'challenge-2',
        { domain: 'verifier-bob.com' }
    );

    testCase('Checking unlinkability between presentations');
    const unlinkabilityReport = presentationHandler.checkUnlinkability(
        presentation1,
        presentation2
    );

    assert(
        unlinkabilityReport.unlinkable === true,
        'Presentations are unlinkable'
    );
    console.log(`   └─ Similarity: ${(unlinkabilityReport.similarity * 100).toFixed(2)}%`);
    console.log(`   └─ Status: ${unlinkabilityReport.reason}\n`);
}

/**
 * Test Suite: Credential Extraction
 */
async function testCredentialExtraction() {
    testGroup('Test 7: Credential Extraction from Presentation');

    const holderDid = 'did:key:z6MkpTHR6qWfqrjVczQ1PAiDT4d1N2VjExXR2AKNy8u6FKQT';
    const presentationHandler = new PresentationHandler(holderDid);

    const mockCredentials = [
        {
            '@context': 'https://www.w3.org/2018/credentials/v1',
            type: ['VerifiableCredential', 'IncomeProofCredential'],
            issuer: 'did:key:issuer1',
            credentialSubject: { id: holderDid },
        },
        {
            '@context': 'https://www.w3.org/2018/credentials/v1',
            type: ['VerifiableCredential', 'EducationCredential'],
            issuer: 'did:key:issuer2',
            credentialSubject: { id: holderDid },
        },
    ];

    const presentation = {
        '@context': 'https://www.w3.org/2018/credentials/v1',
        type: 'VerifiablePresentation',
        verifiableCredential: mockCredentials,
        holder: holderDid,
    };

    testCase('Extracting credentials from presentation');
    const extractedCredentials = presentationHandler.extractCredentials(presentation);

    assert(
        extractedCredentials.length === 2,
        'All credentials extracted'
    );
    assert(
        extractedCredentials[0].type.includes('IncomeProofCredential'),
        'First credential is income proof'
    );
    assert(
        extractedCredentials[1].type.includes('EducationCredential'),
        'Second credential is education'
    );

    console.log(`   └─ Extracted ${extractedCredentials.length} credentials\n`);
}

/**
 * Test Suite: Cleanup Operations
 */
async function testCleanupOperations() {
    testGroup('Test 8: Cleanup and Memory Management');

    const holderDid = 'did:key:z6MkpTHR6qWfqrjVczQ1PAiDT4d1N2VjExXR2AKNy8u6FKQT';
    const presentationHandler = new PresentationHandler(holderDid);

    const mockCredential = {
        '@context': 'https://www.w3.org/2018/credentials/v1',
        type: ['VerifiableCredential'],
        credentialSubject: { id: holderDid },
    };

    testCase('Creating 5 presentations (logs nonces)');
    for (let i = 0; i < 5; i++) {
        await presentationHandler.createPresentation(
            mockCredential,
            `challenge-${i}`,
            { domain: 'verifier.com' }
        );
    }

    const initialSize = presentationHandler.presentationLog.size;
    assert(initialSize === 5, 'All 5 nonces logged');

    testCase('Cleaning up old presentation logs (immediate cleanup)');
    presentationHandler.cleanupOldLogs(0); // 0 max age means cleanup all

    const finalSize = presentationHandler.presentationLog.size;
    assert(finalSize === 0, 'All old logs cleaned up');
    console.log(`   └─ Cleaned: ${initialSize} → ${finalSize} entries\n`);
}

/**
 * Main Test Runner
 */
async function runAllTests() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║        W3C VC 2.0 Compliance Test Suite                   ║');
    console.log('║    Testing Credential Issuance & Presentation             ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    try {
        await testCredentialIssuance();
        await testCredentialSigning();
        await testCredentialValidation();
        await testPresentationCreation();
        await testPresentationVerification();
        await testPresentationUnlinkability();
        await testCredentialExtraction();
        await testCleanupOperations();

        console.log('\n╔════════════════════════════════════════════════════════════╗');
        console.log('║              ✓ All VC 2.0 Tests Passed                    ║');
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
