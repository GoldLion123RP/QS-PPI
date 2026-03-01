# QS-PID Implementation Guide

## Quick Start

### 1. Installation

```bash
# Clone the repository
cd /path/to/qs-pid

# Install dependencies
npm install

# Install Circom compiler (if not already installed)
# Linux/macOS:
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
cargo install circom

# Windows: Download from https://github.com/iden3/circom/releases
```

### 2. Compile Circuit

```bash
# Compile Circom circuit to R1CS and WASM
npm run compile

# This generates:
# - artifacts/incomeProof.r1cs
# - artifacts/incomeProof_js/incomeProof.wasm
# - artifacts/incomeProof_js/incomeProof.js
```

### 3. Setup Ceremony

```bash
# Perform trusted setup (generates proving and verifying keys)
npm run setup

# This generates:
# - artifacts/incomeProof_final.zkey (proving key)
# - artifacts/incomeProof_vkey.json (verifying key)
# - artifacts/incomeProof_verifier.sol (Solidity verifier)
```

### 4. Run Tests

```bash
# Test core ZKP functionality
npm test

# Test W3C VC 2.0 compliance
npm run test:vc

# Test post-quantum migration
npm run test:pq
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    QS-PID System                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐         ┌──────────────────────────┐ │
│  │  Prover (User)   │         │  Verifier (Service)      │ │
│  │                  │         │                          │ │
│  │ 1. Income Value  │         │ 1. Verify Proof         │ │
│  │ 2. Blinding      │────────│ 2. Check Threshold      │ │
│  │    Factor        │ Proof   │ 3. Validate VC          │ │
│  │ 3. Generate Proof│         │                          │ │
│  └──────────────────┘         └──────────────────────────┘ │
│         │                              │                    │
│         └──────────────────────────────┘                    │
│              W3C VC 2.0 Compliant                           │
│              Multi-Verifier Unlinkability                   │
│                                                               │
│  ┌──────────────────────────────────────────────────────────┐
│  │        Cryptographic Foundation (Circom/SnarkJS)         │
│  │                                                            │
│  │  • Circuit: Range Proof (Income > 5 LPA)                │
│  │  • Proof System: Groth16 (BN254)                         │
│  │  • Hash: Poseidon (unlinkability via blinding)           │
│  └──────────────────────────────────────────────────────────┘
│                                                               │
│  ┌──────────────────────────────────────────────────────────┐
│  │        Post-Quantum Roadmap (ML-DSA)                      │
│  │                                                            │
│  │  Phase 1: ECDSA Only                                     │
│  │  Phase 2: Hybrid (ECDSA + ML-DSA)                        │
│  │  Phase 3: ML-DSA Primary (legacy ECDSA)                  │
│  │  Phase 4: ML-DSA Only                                    │
│  └──────────────────────────────────────────────────────────┘
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Code Examples

### Example 1: Generate Income Proof

```javascript
const IncomeProver = require('./src/prover');

async function generateProof() {
    const prover = new IncomeProver();
    await prover.initialize();

    // Generate proof for 7 LPA income
    const proofData = await prover.generateProof(
        '700000000', // Income in basic units (7 LPA)
        '500000000'  // Threshold (5 LPA)
    );

    console.log('Proof Data:', {
        valid: proofData.isValid,
        proofSignals: proofData.publicSignals,
        commitments: proofData.commitments,
    });

    return proofData;
}

generateProof();
```

### Example 2: Verify Proof

```javascript
const IncomeVerifier = require('./src/verifier');

async function verifyProof(proofData) {
    const verifier = new IncomeVerifier();
    await verifier.initialize();

    const result = await verifier.verifyProof(
        proofData,
        'verifier-1'
    );

    if (result.valid) {
        console.log('✓ Proof verified!');
        console.log('Reason:', result.reason);
        console.log('Verification Time:', result.verificationTime);
    } else {
        console.log('✗ Proof invalid');
        console.log('Reason:', result.reason);
    }

    return result;
}
```

### Example 3: Issue W3C VC 2.0 Credential

```javascript
const { IncomeProofCredential } = require('./src/vc/credential');

async function issueCredential(proofData) {
    const issuerId = 'did:key:z6MkhaXgBZDvotDkL5257faWLpa8Ykb7iXqPXo4T6aMVxXZ6';
    const subjectId = 'did:key:z6MkpTHR6qWfqrjVczQ1PAiDT4d1N2VjExXR2AKNy8u6FKQT';

    const credentialBuilder = new IncomeProofCredential(
        issuerId,
        subjectId,
        proofData
    );

    let credential = credentialBuilder.build();
    credential = await credentialBuilder.sign(credential, 'issuer-secret-key');

    console.log('Credential Issued:', credential.id);
    return credential;
}
```

### Example 4: Create and Verify Presentation

```javascript
const PresentationHandler = require('./src/vc/presentation');

async function presentAndVerify(credential) {
    const holderDid = 'did:key:z6MkpTHR6qWfqrjVczQ1PAiDT4d1N2VjExXR2AKNy8u6FKQT';
    const presentationHandler = new PresentationHandler(holderDid);

    // Create presentation with challenge from verifier
    const presentation = await presentationHandler.createPresentation(
        credential,
        'challenge-12345',
        { domain: 'verifier.example.com' }
    );

    console.log('Presentation created with nonce:', presentation.proof.nonce);

    // Verify presentation
    const verifyResult = presentationHandler.verifyPresentation(
        presentation,
        'verifier.example.com'
    );

    if (verifyResult.valid) {
        console.log('✓ Presentation verified!');
    } else {
        console.log('✗ Presentation invalid:', verifyResult.reason);
    }

    return presentation;
}
```

### Example 5: ML-DSA Setup and Signing

```javascript
const {
    MLDSAKeyPair,
    MLDSASigner,
    HybridSigner,
} = require('./src/pq/mldsa');

async function setupPostQuantum() {
    // Generate ML-DSA keys
    console.log('[*] Generating ML-DSA-65 key pair...');
    const mldsaKeyPair = MLDSAKeyPair.generate('ML-DSA-65');

    // Export public key (shareable)
    const publicKey = mldsaKeyPair.exportPublicKey();
    console.log('Public Key Hash:', publicKey.parameters.algorithm);

    // Create ML-DSA signer
    const mldsaSigner = new MLDSASigner(mldsaKeyPair);

    // Sign a credential
    const credential = { issuer: 'issuer-1', subject: 'subject-1' };
    const mldsaSignature = mldsaSigner.sign(credential);
    console.log('ML-DSA Signature:', mldsaSignature.signature.substring(0, 32) + '...');

    return { mldsaKeyPair, mldsaSigner, mldsaSignature };
}

// For hybrid transition (Phase 2)
async function setupHybridSigning() {
    const ecdsaKeyPair = Buffer.from('ecdsa-key');
    const mldsaKeyPair = MLDSAKeyPair.generate('ML-DSA-65');

    const hybridSigner = new HybridSigner(ecdsaKeyPair, mldsaKeyPair);

    const credential = { issuer: 'issuer-1' };
    const dualSignature = hybridSigner.signHybrid(credential);

    console.log('Hybrid Signature:', {
        ecdsa: dualSignature.signatures.ecdsa.algorithm,
        mlDSA: dualSignature.signatures.mlDSA.algorithm,
    });

    return dualSignature;
}
```

### Example 6: Migration State Tracking

```javascript
const { MigrationStateManager } = require('./src/pq/mldsa');

async function trackMigration() {
    const manager = new MigrationStateManager();

    console.log('Current Phase:', manager.getCurrentPhase().phase);
    console.log('Active Algorithms:', manager.getActiveAlgorithms());

    // Record credentials
    manager.recordCredentialIssuance('ECDSA');
    manager.recordCredentialIssuance('ECDSA');
    manager.recordCredentialIssuance('ML-DSA');

    // Check statistics
    const stats = manager.getStatistics();
    console.log('ML-DSA Adoption:', stats.mldsaAdoption);

    // Progress to next phase
    if (manager.progressPhase()) {
        console.log('Progressed to:', manager.phase);
    }
}
```

---

## Security Considerations

### 1. Trusted Setup
- The circuit requires a secure trusted setup ceremony
- Multiple participants should contribute randomness
- "Powers of Tau" parameters are sensitive and must be protected
- Recommendation: Use distributed ceremony for production

### 2. Blinding Factors
- Each proof uses cryptographically random blinding factors
- Ensures unlinkability across verifiers
- Blinding factors should NEVER be revealed
- Recommendation: Generate with `crypto.randomBytes()`

### 3. Proof Verification
- Always verify in a trusted environment
- Check proof signatures and timestamps
- Validate against verified keys
- Implement nonce/challenge-response for anti-replay

### 4. Credential Storage
- Store credentials securely (encrypted at rest)
- Private keys require strong encryption
- Use secure key management systems (KMS)
- Recommendation: Hardware security modules (HSM) for production

### 5. Revocation Checking
- Check revocation lists before accepting credentials
- Implement status check registry
- Monitor for credential expiration
- Maintain audit logs of verification attempts

---

## API Reference

### IncomeProver

```javascript
const prover = new IncomeProver();
await prover.initialize();

// Generate single proof
const proof = await prover.generateProof(income, threshold);
// Returns: { proof, publicSignals, commitments, timestamp, isValid }

// Generate multiple unlinkable proofs
const proofs = await prover.generateMultiProofs(income, threshold, count);
// Returns: Array of proof objects with different blinding factors
```

### IncomeVerifier

```javascript
const verifier = new IncomeVerifier();
await verifier.initialize();

// Verify single proof
const result = await verifier.verifyProof(proofData, verifierId, options);
// Returns: { valid, reason, publicSignals, ... }

// Batch verify proofs
const batchResult = await verifier.batchVerify(proofs, verifierId, options);
// Returns: { totalProofs, validProofs, results, unlinkable }

// Check unlinkability
const unlinkReport = verifier.checkUnlinkability(proofs);
// Returns: { unlinkable, totalProofs, uniqueCommitments }
```

### IncomeProofCredential

```javascript
const credential = new IncomeProofCredential(issuerId, subjectId, zkProof, options);

let vc = credential.build();
// Returns: W3C VC 2.0 credential object

vc = await credential.sign(vc, signingKey);
// Adds cryptographic proof to credential

const validation = credential.validate(vc);
// Returns: { valid, errors }
```

### PresentationHandler

```javascript
const handler = new PresentationHandler(holderDid);

const presentation = await handler.createPresentation(credential, challenge, options);
// Returns: Verifiable Presentation with proof and anti-replay protection

const verified = handler.verifyPresentation(presentation, domain, maxAge);
// Returns: { valid, reason, ... }

const unlinkable = handler.checkUnlinkability(presentation1, presentation2);
// Returns: { unlinkable, similarity, reason }

const credentials = handler.extractCredentials(presentation);
// Returns: Array of credentials from presentation
```

### MLDSAKeyPair

```javascript
const keyPair = MLDSAKeyPair.generate(securityLevel);
// Parameters: 'ML-DSA-44', 'ML-DSA-65', 'ML-DSA-87'
// Returns: KeyPair with public and private keys

const publicExport = keyPair.exportPublicKey();
const privateExport = keyPair.exportPrivateKey(password);
```

---

## Testing

Run the comprehensive test suite:

```bash
# All core tests (ZKP, proof generation/verification, unlinkability)
npm test

# W3C VC 2.0 compliance tests
npm run test:vc

# Post-quantum migration tests
npm run test:pq
```

Test coverage includes:
- ✅ Valid income proofs
- ❌ Invalid income proofs
- ✅ Boundary conditions
- ✅ Multi-verifier unlinkability
- ✅ Batch verification
- ✅ Anti-replay protection
- ✅ W3C VC 2.0 schema compliance
- ✅ Presentation creation/verification
- ✅ ML-DSA key generation
- ✅ Hybrid signing
- ✅ Migration phase transitions

---

## Performance Benchmarks

| Operation | Time | Memory |
|-----------|------|--------|
| Proof Generation | ~100-150ms | ~50MB |
| Proof Verification | ~50-80ms | ~30MB |
| Credential Issuance | ~150-200ms | ~10MB |
| Presentation Creation | ~50-100ms | ~5MB |
| W3C Validation | ~10-20ms | ~2MB |
| ML-DSA Signing | ~100-120ms | ~20MB |

**System Requirements**:
- Node.js 14+ (18+ recommended)
- RAM: 2GB minimum, 4GB+ recommended
- Storage: 500MB for artifacts
- CPU: Dual-core processor minimum

---

## Troubleshooting

### Circuit Compilation Fails
```bash
# Ensure Circom is installed
circom --version

# Reinstall if needed
cargo install circom --force

# Check circuit syntax
circom circuits/incomeProof.circom --r1cs --sym
```

### Proof Generation Fails
```bash
# Verify artifacts exist
ls -la artifacts/

# Run setup ceremony again
npm run setup

# Check for sufficient memory
node --max-old-space-size=4096 node_modules/.bin/circom ...
```

### Verification Always Fails
```bash
// Check proof validity signal
if (proofData.publicSignals[0] === '1') {
    console.log('Income is above threshold');
} else {
    console.log('Income is below threshold');
}

// Verify with correct threshold
const result = await verifier.verifyProof(proofData, verifierId);
```

---

## Contributing

Contributions are welcome! Areas for enhancement:
- Additional ZK circuits (age, credit score, etc.)
- Smart contract integrations
- Mobile SDK
- Additional post-quantum algorithms (Crystals-Dilithium, etc.)
- Multi-chain support

---

## License

MIT License - See LICENSE file for details

---

## References

- [Circom Documentation](https://docs.circom.io)
- [SnarkJS Repository](https://github.com/iden3/snarkjs)
- [W3C VC Data Model 2.0](https://www.w3.org/TR/vc-data-model-2.0/)
- [NIST FIPS 204 (ML-DSA)](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.204.pdf)
- [Zero-Knowledge Proofs Primer](https://blog.cryptographyengineering.com/2014/11/27/zero-knowledge-proofs-illustrated-primer/)
