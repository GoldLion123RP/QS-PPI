# QS-PPI Post-Quantum Migration Plan

## Executive Summary

QS-PPI will transition from ECDSA-based signatures to ML-DSA (Module-Lattice-Based Digital Signature Algorithm) to maintain cryptographic security in the post-quantum era. This plan outlines a phased migration approach that maintains backward compatibility and security throughout the transition.

---

## 1. Threat Model & Motivation

### Current Threat
- **Harvest Now, Decrypt Later (HNDL)**: Adversaries can record encrypted credentials today and decrypt them when quantum computers become available
- **ECDSA Vulnerability**: Shor's algorithm can break ECDSA in polynomial time on quantum computers
- **Regulatory Pressure**: NIST PQC standards (FIPS 204) require migration by ~2030

### Why ML-DSA?
- **NIST Standardization**: Selected in FIPS 204 (August 2024)
- **Proven Security**: Based on lattice-hard problems (SVP, LWE)
- **Performance**: ~1KB signatures, similar to ECDSA but larger
- **Mature Implementation**: Available in C and Rust via liboqs

---

## 2. Migration Architecture

### 2.1 Technology Stack

| Component | Current | Post-Quantum | Hybrid Phase |
|-----------|---------|--------------|--------------|
| **Credential Signing** | ECDSA-Secp256k1 | ML-DSA-65 | Both |
| **Proof Verification** | Groth16 (BN254) | Lattice-based | Compatible |
| **Hash Functions** | SHA-256 | SLH-DSA* | Both |
| **KDF** | HKDF-SHA256 | ML-KEM + HKDF | Both |

*Note: SLH-DSA (Stateless Hash-Based Signatures) optional for extreme long-term security*

### 2.2 Key Parameters

**ML-DSA-44** (Conservative)
- 64-byte private key, 32-byte public key
- 688-byte signature
- Security: ~128 bits

**ML-DSA-65** (Recommended for QS-PPI)
- 96-byte private key, 48-byte public key
- 1032-byte signature
- Security: ~192 bits

**ML-DSA-87** (Maximum)
- 128-byte private key, 64-byte public key
- 1472-byte signature
- Security: ~256 bits

---

## 3. Migration Phases

### Phase 1: ECDSA Only (Current - Q1 2025)

**Timeline**: Immediate deployment

**Activities**:
- Deploy QS-PPI v1.0 with ECDSA-Secp256k1
- Implement ML-DSA infrastructure (key generation, signing)
- Create automated test suite for backward compatibility
- Begin ML-DSA code audits

**Credentials Issued**: ECDSA-signed only

**Verification**: ECDSA verifiers only

**Risk Level**: 🟢 Low (current standard)

```javascript
// Phase 1 Credential
{
  "proof": {
    "type": "EcdsaSecp256k1Signature2019",
    "signatureValue": "0x..."
  }
}
```

---

### Phase 2: Hybrid Signing (Q2 2025)

**Timeline**: 3-6 months after Phase 1

**Activities**:
- Issue credentials with both ECDSA and ML-DSA signatures
- Verifiers accept EITHER signature
- Update W3C VC context for ML-DSA support
- Deploy ML-DSA public key infrastructure (PKI)
- Begin issuing dual-signed credentials

**Credentials Issued**: Dual-signed (ECDSA + ML-DSA)

**Verification**: Accept either ECDSA OR ML-DSA

**Risk Level**: 🟡 Medium (dual maintenance)

```javascript
// Phase 2 Credential
{
  "proof": [
    {
      "type": "EcdsaSecp256k1Signature2019",
      "signatureValue": "0x..."
    },
    {
      "type": "ML-DSASignature2025",
      "signatureValue": "0x..."
    }
  ]
}
```

**Backward Compatibility**: ✅ 100% - Old verifiers still accept ECDSA

**New Dependencies**:
```json
{
  "dependencies": {
    "liboqs": "^0.9.0",  // NIST PQC library
    "mldsa": "^1.0.0"    // ML-DSA wrapper
  }
}
```

---

### Phase 3: ML-DSA Primary (Q4 2025)

**Timeline**: 9-12 months after Phase 1

**Activities**:
- New credentials issued with ML-DSA as primary
- ECDSA signatures maintained for legacy verification
- Revoke old ECDSA-only credentials
- Establish ML-DSA-only verifier endpoints
- Migrate holder keys to ML-DSA

**Credentials Issued**: ML-DSA primary, ECDSA fallback

**Verification**: Prefer ML-DSA, fallback to ECDSA

**Risk Level**: 🟠 Medium (transition active)

```javascript
// Phase 3 Credential
{
  "proof": {
    "type": "ML-DSASignature2025",
    "signatureValue": "0x...",
    "fallbackProof": {  // Legacy support
      "type": "EcdsaSecp256k1Signature2019",
      "signatureValue": "0x..."
    }
  }
}
```

**Backward Compatibility**: ⚠️ Partial (requires dual verifiers)

---

### Phase 4: ML-DSA Only (2026+)

**Timeline**: 12+ months after Phase 1

**Activities**:
- Deprecate ECDSA completely
- Full migration to ML-DSA infrastructure
- Shutdown ECDSA verifiers
- Update all systems to ML-DSA
- Archive historical ECDSA credentials

**Credentials Issued**: ML-DSA only

**Verification**: ML-DSA only

**Risk Level**: 🟢 Low (single standard)

```javascript
// Phase 4 Credential
{
  "proof": {
    "type": "ML-DSASignature2025",
    "signatureValue": "0x..."
  }
}
```

**Backward Compatibility**: ❌ None (ECDSA verifiers deprecated)

---

## 4. Implementation Details

### 4.1 ML-DSA Key Generation

```javascript
const { MLDSAKeyPair } = require('./src/pq/mldsa');

// Generate ML-DSA-65 keys (recommended)
const keyPair = MLDSAKeyPair.generate('ML-DSA-65');

// Export for storage
const publicKey = keyPair.exportPublicKey();
const privateKey = keyPair.exportPrivateKey(password);
```

### 4.2 Hybrid Signing Implementation

```javascript
const { HybridSigner } = require('./src/pq/mldsa');

// Create hybrid signer
const signer = new HybridSigner(ecdsaKeyPair, mldsaKeyPair);

// Sign with both algorithms
const dualSignature = signer.signHybrid(credential);

// Result:
// {
//   signatures: {
//     ecdsa: { algorithm: 'ECDSA', signature: '0x...' },
//     mlDSA: { algorithm: 'ML-DSA', signature: '0x...' }
//   }
// }
```

### 4.3 Verifier Updates

```javascript
// Phase 2: Accepts either signature
async function verifyCredential(credential) {
  let isValid = false;
  
  for (const proof of credential.proof) {
    if (proof.type === 'EcdsaSecp256k1Signature2019') {
      isValid = isValid || await ecdsaVerifier.verify(credential, proof);
    } else if (proof.type === 'ML-DSASignature2025') {
      isValid = isValid || await mldsaVerifier.verify(credential, proof);
    }
  }
  
  return isValid;
}
```

### 4.4 Migration State Tracking

```javascript
const { MigrationStateManager } = require('./src/pq/mldsa');

const stateManager = new MigrationStateManager();

// Track current phase
console.log(stateManager.getCurrentPhase());
// Output: 'PHASE_1_ECDSA_ONLY'

// Progress to next phase (after validation)
stateManager.progressPhase();

// Check statistics
console.log(stateManager.getStatistics());
// Output: { ecdsaCredentialsIssued: 1000, mldsaCredentialsIssued: 0, ... }
```

---

## 5. Security Guarantees

### 5.1 Post-Quantum Security

| Metric | ECDSA | ML-DSA-65 | Status |
|--------|-------|----------|--------|
| Classical Security | 256-bit | ~192-bit | ✅ Sufficient |
| Quantum Security | 0-bit | ~192-bit | ✅ Protected |
| Existential Forgery | 2^128 | 2^192 | ✅ Better |
| Signature Size | 64 bytes | 1032 bytes | ⚠️ Larger |

### 5.2 Transition Security

**During Phase 2-3** (Hybrid period):
- Credentials require BOTH signatures to be valid for maximum security
- At least one must verify as valid for backward compatibility
- Verifiers can enforce "require ML-DSA" if they support it

**Recommended Verification Policy**:
```javascript
// Phase 2-3: Require at least one valid signature
const ecdsaValid = await verifyECDSA(proof);
const mldsaValid = await verifyMLDSA(proof);

// Strict: both required
const isStrictValid = ecdsaValid && mldsaValid;

// Backward compatible: either accepted
const isBackwardValid = ecdsaValid || mldsaValid;
```

---

## 6. Rollback & Recovery

### 6.1 Contingency Plan

If ML-DSA implementation has critical issues:

**Option A**: Remain in Phase 2 (Hybrid)
- Continue dual-signing indefinitely
- Provides security of both algorithms
- Higher storage/bandwidth cost

**Option B**: Rollback to Phase 1 (ECDSA Only)
- Revert to ECDSA-only credentials
- Mark hybrid credentials as "partially trusted"
- Requires security event disclosure

### 6.2 Disaster Recovery

```javascript
// Detect ML-DSA failure
try {
  const mldsaSignature = await mldsaSigner.sign(credential);
} catch (error) {
  console.error('[!] ML-DSA failure detected, initiating rollback');
  
  // Fallback to ECDSA-only
  const ecdsaSignature = await ecdsaSigner.sign(credential);
  
  // Alert administrators
  notifySecurityTeam({
    reason: 'ML-DSA failure',
    timestamp: new Date(),
    fallback: 'ECDSA'
  });
}
```

---

## 7. Performance Considerations

### 7.1 Signature Size Impact

**Phase 1 (ECDSA)**:
- Signature size: 64 bytes
- Credential size: ~2 KB

**Phase 2 (Hybrid)**:
- Dual signatures: 64 + 1032 = 1096 bytes
- Credential size: ~3.5 KB (↑75%)

**Phase 4 (ML-DSA Only)**:
- Signature size: 1032 bytes
- Credential size: ~3 KB

**Mitigation**:
- Use compression (gzip) for storage/transmission
- Implement signature aggregation if possible
- Use ZK proofs instead of full signatures for non-critical fields

### 7.2 Computation Time

| Operation | ECDSA | ML-DSA-65 |
|-----------|-------|-----------|
| Key Generation | ~10ms | ~50ms |
| Signing | ~50ms | ~100ms |
| Verification | ~60ms | ~80ms |
| Total per Credential | ~170ms | ~230ms |

---

## 8. Testing Strategy

### 8.1 Unit Tests

```bash
npm run test:pq
```

Tests cover:
- ✅ ML-DSA key generation
- ✅ Signature generation/verification
- ✅ Hybrid signing mode
- ✅ Phase transitions
- ✅ Backward compatibility

### 8.2 Integration Tests

```javascript
// Test hybrid credentials end-to-end
describe('Phase 2: Hybrid Signing', () => {
  it('should issue dual-signed credentials', async () => {
    const credential = await issuer.issueDualSignedCredential(holder);
    assert(credential.proof.ecdsa !== undefined);
    assert(credential.proof.mlDSA !== undefined);
  });
  
  it('should verify with either signature', async () => {
    const withoutECDSA = credential;
    withoutECDSA.proof = [credential.proof.mlDSA];
    assert(await verifier.verify(withoutECDSA));
  });
});
```

### 8.3 Load Testing

- Test signature generation throughput
- Monitor memory usage with large credential batches
- Benchmark hybrid signing vs single-algorithm

---

## 9. Stakeholder Communication

### 9.1 Timeline & Announcements

**Q1 2025**: Phase 1 announcement
- "QS-PPI supports ECDSA with planned post-quantum migration"
- Publish migration roadmap
- Open-source ML-DSA integration code

**Q2 2025**: Phase 2 announcement
- "Hybrid credentials now issued"
- Enable dual-signature verification
- Encourage verifier upgrades

**Q3 2025**: Phase 3 planning
- Survey ML-DSA adoption
- Plan ECDSA deprecation timeline
- Offer legacy credential migration tools

**Q1 2026+**: Phase 4 execution
- Sunset ECDSA support
- Migrate remaining credentials
- Archive historical data

### 9.2 Documentation Updates

- Update W3C VC context for ML-DSA proof types
- Create ML-DSA integration guides
- Publish security advisories
- Maintain compatibility matrix

---

## 10. References & Resources

### NIST Standards
- [FIPS 204 - ML-DSA](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.204.pdf)
- [FIPS 203 - ML-KEM](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.203.pdf)

### Libraries & Tools
- [liboqs](https://openquantumcomp.com/) - NIST PQC implementations
- [Open Quantum Safe](https://github.com/open-quantum-safe) - PQC project

### Further Reading
- Quantum Computing Timeline: [MIT Technology Review](https://www.technologyreview.com)
- Lattice Cryptography Primer: [Crypto 2015 Lattice Tutorials](https://www.iacr.org/conferences/crypto2015/)

---

## 11. Appendix: Migration Checklist

- [ ] Phase 1: Deploy ECDSA-based QS-PPI v1.0
- [ ] Develop and audit ML-DSA integration code
- [ ] Create hybrid signing implementation
- [ ] Update W3C VC context with ML-DSA proof types
- [ ] Phase 2: Issue dual-signed credentials
- [ ] Monitor ML-DSA adoption metrics
- [ ] Phase 3: Switch to ML-DSA primary
- [ ] Deprecate ECDSA-only credential issuance
- [ ] Phase 4: Complete ECDSA sunset
- [ ] Archive historical ECDSA credentials
- [ ] Update compliance documentation

---

**Document Version**: 1.0  
**Last Updated**: December 2025  
**Next Review**: Q2 2026

