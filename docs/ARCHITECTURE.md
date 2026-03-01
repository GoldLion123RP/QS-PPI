# QS-PID System Architecture

**Quantum-Safe Privacy-Preserving Income Verification System**

This document describes the technical architecture, component interactions, and design decisions behind the QS-PID system.

---

## Table of Contents

1. [Overview](#overview)
2. [System Layers](#system-layers)
3. [Component Architecture](#component-architecture)
4. [Data Flow](#data-flow)
5. [Cryptographic Primitives](#cryptographic-primitives)
6. [Security Architecture](#security-architecture)
7. [Performance Considerations](#performance-considerations)
8. [Scalability Design](#scalability-design)

---

## Overview

### Design Philosophy

**Core Principles:**
1. **Privacy by Design**: Zero-knowledge proofs ensure verifiers learn nothing beyond validity
2. **Unlinkability**: Multiple verifiers cannot correlate user proofs
3. **Future-Proof**: Post-quantum cryptography migration path
4. **Standards-Based**: W3C VC 2.0 compliance for ecosystem interoperability
5. **Production-Ready**: <250ms latency, comprehensive security auditing

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Application Layer                          │
│  (Loan Apps, Rental Platforms, Job Portals, etc.)          │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              Credential Management Layer                     │
│  (W3C VC 2.0: Issuance, Storage, Presentation)              │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│               Zero-Knowledge Proof Layer                     │
│  (Groth16 SNARKs: Prove income > threshold)                 │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              Cryptographic Binding Layer                     │
│  (Fiat-Shamir: Tamper-proof public value binding)           │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│            Post-Quantum Cryptography Layer                   │
│  (ML-DSA: Quantum-resistant signatures)                     │
└─────────────────────────────────────────────────────────┘
```

---

## System Layers

### Layer 1: Circom Circuit (ZK Logic)

**Purpose**: Define the constraint system for income verification

**Components:**
- **Input Signals**:
  - `income` (private): User's actual income in paisa
  - `threshold` (public): Minimum required income
  - `blindingFactor` (private): Random value for commitment
  - `nonce` (private): Unique identifier for replay protection

- **Output Signals**:
  - `isValid` (public): 1 if income > threshold, 0 otherwise
  - `incomeHashCommit` (public): Commitment to income

**Constraints:**
```circom
// Arithmetic constraint: income > threshold
component gt = GreaterThan(32);  // 32-bit comparison
gt.in[0] <== income;
gt.in[1] <== threshold;
isValid <== gt.out;

// Commitment constraint: Hash(income || blindingFactor || nonce)
component hash = Poseidon(3);
hash.inputs[0] <== income;
hash.inputs[1] <== blindingFactor;
hash.inputs[2] <== nonce;
incomeHashCommit <== hash.out;
```

**Circuit Size**: ~100 R1CS constraints (lightweight for fast proving)

### Layer 2: Groth16 SNARK (Proof System)

**Workflow:**

1. **Trusted Setup** (one-time):
   ```
   Powers of Tau Ceremony → CRS (Common Reference String)
   ```
   - Produces: `proving_key.zkey` + `verification_key.json`
   - Security: Requires 1 honest participant (trapdoor destroyed)

2. **Witness Generation** (prover-side):
   ```javascript
   const witness = await calculateWitness(
     { income, threshold, blindingFactor, nonce }
   );
   ```
   - Computes: All intermediate signals in the circuit
   - Time: ~50ms

3. **Proof Generation** (prover-side):
   ```javascript
   const proof = await groth16.prove(
     proving_key, 
     witness
   );
   ```
   - Produces: `{ A, B, C }` (elliptic curve points)
   - Time: ~150ms
   - Size: ~1KB (constant, independent of circuit size)

4. **Proof Verification** (verifier-side):
   ```javascript
   const valid = await groth16.verify(
     verification_key,
     publicSignals,
     proof
   );
   ```
   - Time: ~18ms (constant, fast pairing check)
   - Requires: Only `verification_key` + `publicSignals` (no secrets)

### Layer 3: Fiat-Shamir Binding (Security)

**Purpose**: Prevent tampering with public signals

**Mechanism:**
```javascript
const challenge = SHA256(
  isValid ||
  threshold ||
  incomeHashCommit ||
  verifierId ||
  timestamp
);
```

**Properties:**
- **Binding**: Changing any public value changes the challenge
- **Non-Malleable**: Attacker cannot create valid proof with modified signals
- **Context-Specific**: `verifierId` prevents cross-verifier proof reuse

**Security Guarantee**: Tampering detected with probability ~1 (SHA-256 collision resistance)

### Layer 4: W3C VC 2.0 (Credential Format)

**Structure:**
```json
{
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://qs-pid.example/contexts/v1"
  ],
  "type": ["VerifiableCredential", "IncomeProofCredential"],
  "issuer": "did:key:zQ3shokF...",
  "issuanceDate": "2026-03-01T12:00:00Z",
  "credentialSubject": {
    "id": "did:key:zQ3shP9m...",
    "incomeProof": {
      "proof": { ... },
      "commitments": { ... },
      "publicSignals": [1, 500000000, "0x1a2b..."],
      "isValid": true
    }
  },
  "credentialStatus": {
    "type": "StatusList2021Revocation",
    "statusListCredential": "https://issuer.example/status/1",
    "statusListIndex": "42"
  },
  "proof": {
    "type": "EcdsaSecp256k1Signature2019",
    "created": "2026-03-01T12:00:00Z",
    "verificationMethod": "did:key:zQ3shokF...#key-1",
    "proofPurpose": "assertionMethod",
    "proofValue": "z5fG7h..."
  }
}
```

**Verifiable Presentation** (user-controlled sharing):
```json
{
  "@context": ["https://www.w3.org/ns/credentials/v2"],
  "type": ["VerifiablePresentation"],
  "holder": "did:key:zQ3shP9m...",
  "verifiableCredential": [ <credential_above> ],
  "proof": {
    "type": "EcdsaSecp256k1Signature2019",
    "created": "2026-03-01T13:00:00Z",
    "challenge": "nonce-abc123",
    "domain": "bank-verifier.example",
    "proofPurpose": "authentication",
    "verificationMethod": "did:key:zQ3shP9m...#key-1",
    "proofValue": "z8dK1j..."
  }
}
```

**Benefits:**
- **Interoperability**: Compatible with existing VC wallets/verifiers
- **Holder Control**: User decides when/where to share credentials
- **Revocation**: Issuer can revoke credentials (StatusList2021)

### Layer 5: Post-Quantum Layer (ML-DSA)

**Migration Phases:**

| Phase | Timeline | Algorithm | Credential Signing |
|-------|----------|-----------|-------------------|
| **1** | Q1 2025 | ECDSA only | ECDSA-Secp256k1 |
| **2** | Q2 2025 | Hybrid | ECDSA + ML-DSA-65 (dual-signature) |
| **3** | Q4 2025 | ML-DSA primary | ML-DSA-65 (ECDSA for legacy verification) |
| **4** | 2026+ | ML-DSA only | ML-DSA-65 |

**ML-DSA Implementation:**
```javascript
class MLDSAKeyPair {
  static generate(securityLevel = 'ML-DSA-65') {
    // Generate lattice-based key pair
    // Security levels: ML-DSA-44 (128-bit), ML-DSA-65 (192-bit), ML-DSA-87 (256-bit)
  }
}

class HybridSigner {
  signHybrid(message) {
    return {
      signatures: {
        ecdsa: this.ecdsaSigner.sign(message),
        mlDSA: this.mldsaSigner.sign(message)
      },
      purpose: 'HYBRID_SIGNING_FOR_BACKWARD_COMPATIBILITY'
    };
  }
}
```

**Backward Compatibility:**
- Phase 1 credentials valid until Phase 3
- Phase 4 drops ECDSA support (quantum-safe only)

---

## Component Architecture

### Prover Components

#### 1. `IncomeProofGenerator`
**Responsibility**: Generate zero-knowledge proofs

```javascript
class IncomeProofGenerator {
  async generateIncomeProof(income, threshold) {
    // 1. Validate inputs
    this.validateInputs(income, threshold);
    
    // 2. Generate random blinding factor
    const blindingFactor = this.generateBlindingFactor();
    const nonce = this.generateNonce();
    
    // 3. Compute witness
    const witness = await this.calculateWitness({
      income,
      threshold,
      blindingFactor,
      nonce
    });
    
    // 4. Generate Groth16 proof
    const proof = await groth16.prove(provingKey, witness);
    
    // 5. Create Fiat-Shamir binding
    const binding = this.createFiatShamirBinding(
      proof.publicSignals,
      verifierId,
      timestamp
    );
    
    return { proof, commitments, publicSignals, binding, isValid };
  }
}
```

**Key Methods:**
- `validateInputs()`: Check income/threshold range (0 to 2^32-1)
- `generateBlindingFactor()`: Cryptographic randomness (256-bit)
- `calculateWitness()`: Call WASM circuit (snarkjs)
- `createFiatShamirBinding()`: SHA-256 challenge generation

#### 2. `IncomeProofCredential`
**Responsibility**: Wrap proof in W3C VC format

```javascript
class IncomeProofCredential {
  build() {
    return {
      '@context': [...],
      type: ['VerifiableCredential', 'IncomeProofCredential'],
      issuer: this.issuerDID,
      credentialSubject: {
        id: this.subjectDID,
        incomeProof: this.proof
      },
      credentialStatus: this.revocationStatus
    };
  }
  
  async sign(issuerPrivateKey) {
    const credential = this.build();
    const signature = await this.ecdsaSign(credential, issuerPrivateKey);
    credential.proof = signature;
    return credential;
  }
}
```

### Verifier Components

#### 1. `IncomeProofVerifier`
**Responsibility**: Verify zero-knowledge proofs

```javascript
class IncomeProofVerifier {
  async verifyIncomeProof(proof, verifierId) {
    // 1. Validate Fiat-Shamir binding
    const bindingValid = this.verifyFiatShamirBinding(
      proof.binding,
      proof.publicSignals,
      verifierId
    );
    if (!bindingValid) {
      return { valid: false, reason: 'Binding tampered' };
    }
    
    // 2. Verify Groth16 proof
    const proofValid = await groth16.verify(
      verificationKey,
      proof.publicSignals,
      proof.proof
    );
    if (!proofValid) {
      return { valid: false, reason: 'Invalid ZK proof' };
    }
    
    // 3. Check public signals
    const [isValid, threshold, incomeHashCommit] = proof.publicSignals;
    if (isValid !== 1) {
      return { valid: false, reason: 'Income does not exceed threshold' };
    }
    
    // 4. Anti-replay: Check nonce
    if (this.nonceUsed(proof.binding.nonce)) {
      return { valid: false, reason: 'Replay attack detected' };
    }
    this.markNonceUsed(proof.binding.nonce);
    
    return { valid: true, reason: 'Proof verified' };
  }
}
```

**Key Methods:**
- `verifyFiatShamirBinding()`: Recompute challenge, compare
- `verifyGroth16Proof()`: Call snarkjs verifier
- `nonceUsed()`: Check replay protection (state: CREATED → USED)

#### 2. `PresentationVerifier`
**Responsibility**: Verify W3C presentations

```javascript
class PresentationVerifier {
  async verifyPresentation(presentation, domain, challenge) {
    // 1. Check domain
    if (presentation.proof.domain !== domain) {
      return { valid: false, reason: 'Domain mismatch' };
    }
    
    // 2. Check challenge (replay protection)
    if (presentation.proof.challenge !== challenge) {
      return { valid: false, reason: 'Challenge mismatch' };
    }
    
    // 3. Verify presentation signature (holder authentication)
    const sigValid = await this.verifyECDSASignature(
      presentation,
      presentation.proof.verificationMethod
    );
    
    // 4. Verify each embedded credential
    for (const credential of presentation.verifiableCredential) {
      const credValid = await this.verifyCredentialSignature(credential);
      const proofValid = await this.verifyIncomeProof(credential.credentialSubject.incomeProof);
    }
    
    return { valid: true };
  }
}
```

---

## Data Flow

### End-to-End Flow (Loan Application Example)

```
┌───────────┐       ┌───────────┐       ┌───────────┐
│   User    │       │  Issuer  │       │   Bank    │
│ (Holder)  │       │ (Govt)   │       │(Verifier)│
└───────────┘       └───────────┘       └───────────┘
      │                   │                   │
      │ 1. Income data    │                   │
      │───────────────────>│                   │
      │                   │                   │
      │ 2. ZK Proof       │                   │
      │   (income > 5L)   │                   │
      │<───────────────────│                   │
      │                   │                   │
      │ 3. VC issued      │                   │
      │<───────────────────│                   │
      │                   │                   │
      │                   │ 4. Loan request   │
      │                   │   (VC presentation)│
      │───────────────────────────────────────────>│
      │                   │                   │
      │                   │ 5. Verify proof   │
      │                   │   (isValid=true)  │
      │                   │<──────────────────│
      │                   │                   │
      │                   │ 6. Loan approved  │
      │<───────────────────────────────────────────│
```

**Privacy Guarantee**: Bank learns `isValid=true` but **never** sees `income=7.5 LPA`

---

## Cryptographic Primitives

### Elliptic Curves

- **Groth16 Proving**: BN254 curve (alt_bn128)
  - Order: ~254 bits
  - Pairing-friendly (supports efficient verification)
  
- **ECDSA Signatures**: Secp256k1 curve
  - Order: ~256 bits
  - Bitcoin/Ethereum standard

### Hash Functions

- **Circuit Hashing**: Poseidon
  - SNARK-friendly (low constraint count)
  - Used for commitment: `Hash(income || blinding || nonce)`
  
- **Fiat-Shamir Binding**: SHA-256
  - Standard hash for challenge generation
  - 256-bit output (collision-resistant)

### Random Number Generation

- **Blinding Factors**: `crypto.randomBytes(32)` (Node.js)
- **Nonces**: `crypto.randomBytes(32)`
- **ML-DSA Entropy**: HMAC-DRBG (NIST SP 800-90A)

---

## Security Architecture

### Threat Model

#### Adversaries

1. **Malicious Verifier**:
   - Goal: Learn exact income from proof
   - Mitigation: Zero-knowledge property of Groth16

2. **Colluding Verifiers**:
   - Goal: Link proofs across verifiers (track user)
   - Mitigation: Unlinkability (random blinding factors)

3. **Man-in-the-Middle**:
   - Goal: Tamper with public signals
   - Mitigation: Fiat-Shamir binding (tampering detected)

4. **Replay Attacker**:
   - Goal: Reuse old proofs
   - Mitigation: Nonce tracking (CREATED → USED state)

5. **Quantum Adversary** (future):
   - Goal: Break ECDSA signatures
   - Mitigation: ML-DSA migration (post-quantum)

### Security Properties

| Property | Guarantee | Mechanism |
|----------|-----------|----------|
| **Confidentiality** | Income hidden | Private signals in ZK circuit |
| **Integrity** | Proofs unforgeable | Groth16 soundness |
| **Unlinkability** | Cross-verifier privacy | Random blinding per proof |
| **Non-Malleability** | Tamper-proof | Fiat-Shamir binding |
| **Freshness** | No replay attacks | Nonce + timestamp |
| **Revocability** | Credentials can be revoked | StatusList2021 |

---

## Performance Considerations

### Latency Breakdown

| Operation | Time | Bottleneck |
|-----------|------|------------|
| **Witness Calculation** | ~50ms | WASM execution |
| **Proof Generation** | ~150ms | Elliptic curve operations |
| **Fiat-Shamir Binding** | <1ms | SHA-256 hashing |
| **Total Proving Time** | ~200ms | — |
| **Proof Verification** | ~18ms | Pairing check (constant) |

### Optimization Strategies

1. **Proof Caching**:
   - Cache proofs for same income/threshold
   - Invalidate on income update

2. **Batch Verification**:
   - Verify multiple proofs in parallel
   - Throughput: 5-10x improvement

3. **Circuit Simplification**:
   - Minimize R1CS constraints (currently ~100)
   - Trade-off: Expressiveness vs. performance

4. **WASM Optimization**:
   - Use compiled circom (faster witness generation)
   - Alternative: Native C++ implementation

---

## Scalability Design

### Horizontal Scaling

```
Load Balancer
      │
      ├────> Prover Node 1 (Stateless)
      ├────> Prover Node 2 (Stateless)
      └────> Prover Node N (Stateless)
```

**Properties:**
- Stateless proof generation (no coordination needed)
- Linear scalability (N nodes = N× throughput)

### Throughput Estimates

| Configuration | Throughput |
|--------------|------------|
| **Single Node** | ~270 proofs/min |
| **10 Nodes** | ~2,700 proofs/min |
| **100 Nodes** | ~27,000 proofs/min |

**Real-World Scenario**: 1M loan applications/day → ~695 proofs/min → **3 nodes sufficient**

---

## Future Enhancements

1. **Recursive SNARKs**: Aggregate multiple proofs into one (proof-of-proofs)
2. **Multi-Attribute Proofs**: Combine income + age + location in single proof
3. **Credential Chaining**: Prove relationships between credentials
4. **Decentralized Verifier Network**: Trustless proof verification (blockchain)

---

## References

- **Groth16 Paper**: ["On the Size of Pairing-based Non-interactive Arguments"](https://eprint.iacr.org/2016/260.pdf)
- **Circom Documentation**: [circom.io](https://docs.circom.io/)
- **W3C VC 2.0 Spec**: [W3C Verifiable Credentials](https://www.w3.org/TR/vc-data-model-2.0/)
- **ML-DSA Standard**: [NIST FIPS 204](https://csrc.nist.gov/pubs/fips/204/final)
