# Post-Quantum Migration Roadmap

**QS-PID Transition to ML-DSA (Quantum-Resistant Signatures)**

---

## Executive Summary

**Challenge**: Current ECDSA signatures vulnerable to quantum computer attacks (Shor's algorithm)  
**Solution**: Gradual migration to ML-DSA (NIST FIPS 204) lattice-based signatures  
**Timeline**: 4-phase transition over 18 months (Q1 2025 → Q2 2026)  
**Goal**: 100% quantum-resistant credentials by 2026  

---

## Quantum Threat Timeline

### Current State (2025)

- **NISQ Era** (Noisy Intermediate-Scale Quantum)
- ~1,000 qubits (IBM, Google, IonQ)
- **No cryptographic threat yet** (need ~20M qubits for ECDSA)

### Projected Threat (2030-2035)

- **CRQC** (Cryptographically-Relevant Quantum Computer)
- Estimated: 10-20 million qubits
- **Can break ECDSA in hours** (Shor's algorithm)
- RSA, DSA, ECDH also vulnerable

### Post-2035

- Widespread quantum computing
- Classical public-key crypto obsolete
- **Harvest-now-decrypt-later attacks**: Adversaries store encrypted data today, decrypt with quantum computer in 10 years

**Action Required**: Migrate NOW (before sensitive data intercepted)

---

## ML-DSA Overview

### NIST Standardization

- **Standard**: FIPS 204 (Module-Lattice-Based Digital Signature Algorithm)
- **Status**: Finalized (August 2024)
- **Basis**: Crystals-DILITHIUM (modified for FIPS)
- **Problem**: Module-LWE (lattice-based hardness)

### Security Levels

| Variant | Classical Security | Quantum Security | Signature Size | Use Case |
|---------|-------------------|------------------|----------------|----------|
| **ML-DSA-44** | 128-bit | 64-bit | ~2.4 KB | IoT, Mobile |
| **ML-DSA-65** | 192-bit | 96-bit | ~3.3 KB | Standard (QS-PID) |
| **ML-DSA-87** | 256-bit | 128-bit | ~4.6 KB | High-security |

**QS-PID Choice**: ML-DSA-65 (balance security + performance)

### Performance Comparison

| Algorithm | Key Gen | Sign | Verify | Signature Size |
|-----------|---------|------|--------|----------------|
| **ECDSA-Secp256k1** | ~1ms | ~0.5ms | ~1ms | 64 bytes |
| **ML-DSA-65** | ~2ms | ~1.5ms | ~1ms | ~3.3 KB |

**Trade-off**: 50× larger signatures for quantum resistance (acceptable for credentials)

---

## 4-Phase Migration Plan

### Phase 1: ECDSA Only (Q1 2025)

**Duration**: 3 months  
**Status**: ✅ Current Phase  

#### Characteristics

- **Signing**: ECDSA-Secp256k1 only
- **Verification**: ECDSA only
- **Quantum Risk**: Vulnerable (acceptable in 2025)
- **Compatibility**: 100% backward compatible

#### Credential Format

```json
{
  "@context": [...],
  "type": ["VerifiableCredential", "IncomeProofCredential"],
  "issuer": "did:key:zQ3sh...",
  "credentialSubject": { ... },
  "proof": {
    "type": "EcdsaSecp256k1Signature2019",
    "created": "2025-01-15T10:00:00Z",
    "proofValue": "z5fG7h..."
  }
}
```

#### Activities

1. ✅ Deploy ECDSA-based system
2. ✅ Issue credentials to early users
3. 🚧 Prepare ML-DSA infrastructure (key generation, storage)
4. 🚧 Test ML-DSA signing/verification (non-production)

#### Metrics

- **Credentials Issued**: 1,000 (simulated)
- **ML-DSA Adoption**: 0%
- **Migration Readiness**: 30%

---

### Phase 2: Hybrid Signing (Q2-Q3 2025)

**Duration**: 6 months  
**Status**: 📅 Planned (April 2025)  

#### Characteristics

- **Signing**: **ECDSA + ML-DSA** (dual signatures)
- **Verification**: Accept **either** ECDSA or ML-DSA
- **Quantum Risk**: Partially mitigated (ML-DSA available)
- **Compatibility**: Backward compatible with Phase 1

#### Credential Format

```json
{
  "@context": [...],
  "type": ["VerifiableCredential", "IncomeProofCredential"],
  "issuer": "did:key:zQ3sh...",
  "credentialSubject": { ... },
  "proof": [
    {
      "type": "EcdsaSecp256k1Signature2019",
      "created": "2025-04-01T10:00:00Z",
      "proofValue": "z5fG7h...",
      "purpose": "BACKWARD_COMPATIBILITY"
    },
    {
      "type": "MlDsa65Signature2024",
      "created": "2025-04-01T10:00:00Z",
      "proofValue": "z9Kj2m...",
      "purpose": "POST_QUANTUM_SECURITY"
    }
  ]
}
```

#### Verification Logic

```javascript
function verifyHybridCredential(credential) {
  const proofs = credential.proof;
  
  // Check if any signature valid (OR logic)
  for (const proof of proofs) {
    if (proof.type === 'EcdsaSecp256k1Signature2019') {
      if (verifyECDSA(credential, proof)) return true;
    }
    if (proof.type === 'MlDsa65Signature2024') {
      if (verifyMLDSA(credential, proof)) return true;
    }
  }
  
  return false;  // No valid signature found
}
```

**Security**: Credential valid if **either** signature valid (weakest-link security during transition)

#### Activities

1. 🚧 Deploy hybrid signing infrastructure
2. 🚧 Issue dual-signed credentials to new users
3. 🚧 Educate verifiers on ML-DSA verification
4. 🚧 Monitor ML-DSA adoption rate
5. 🚧 Announce Phase 1 credential expiration date (Jan 1, 2026)

#### Migration Campaign

- **Email users**: "Upgrade to quantum-resistant credentials"
- **Incentive**: Free re-issuance for Phase 1 holders
- **Deadline**: December 31, 2025

#### Metrics

- **Hybrid Credentials Issued**: 500 (simulated)
- **ML-DSA-Only Issued**: 200 (simulated)
- **ML-DSA Adoption**: 11.76% (200 / 1700 total)
- **Migration Readiness**: 65%

---

### Phase 3: ML-DSA Primary (Q4 2025)

**Duration**: 3 months  
**Status**: 📅 Planned (October 2025)  

#### Characteristics

- **Signing**: **ML-DSA only** (new credentials)
- **Verification**: Accept ML-DSA **or** ECDSA (legacy mode)
- **Quantum Risk**: Mostly mitigated (new credentials safe)
- **Compatibility**: Phase 1-2 credentials still valid (sunset window)

#### Credential Format

```json
{
  "@context": [...],
  "type": ["VerifiableCredential", "IncomeProofCredential"],
  "issuer": "did:key:zQ3sh...",
  "credentialSubject": { ... },
  "proof": {
    "type": "MlDsa65Signature2024",
    "created": "2025-10-01T10:00:00Z",
    "proofValue": "z9Kj2m..."
  }
}
```

#### Verification Logic

```javascript
function verifyPhase3Credential(credential) {
  const proof = credential.proof;
  
  // Prefer ML-DSA (primary)
  if (proof.type === 'MlDsa65Signature2024') {
    return verifyMLDSA(credential, proof);
  }
  
  // Accept ECDSA (legacy) with warning
  if (proof.type === 'EcdsaSecp256k1Signature2019') {
    console.warn('[DEPRECATED] ECDSA credential accepted (Phase 3 legacy mode)');
    
    // Check expiration
    const issued = new Date(proof.created);
    const now = new Date();
    const age = (now - issued) / (1000 * 60 * 60 * 24);  // days
    
    if (age > 365) {
      return false;  // Reject ECDSA credentials > 1 year old
    }
    
    return verifyECDSA(credential, proof);
  }
  
  return false;
}
```

#### Activities

1. 🚧 Stop issuing ECDSA credentials
2. 🚧 ML-DSA becomes default signing method
3. 🚧 Final migration reminder (email campaign)
4. 🚧 Revoke Phase 1 credentials (issued before April 2025)
5. 🚧 Prepare for Phase 4 (ECDSA sunset)

#### Metrics

- **ML-DSA Credentials Issued**: 900 (simulated)
- **Legacy ECDSA Accepted**: 100 (simulated)
- **ML-DSA Adoption**: 40.74% (1100 / 2700 total)
- **Migration Readiness**: 90%

---

### Phase 4: ML-DSA Only (Q1 2026+)

**Duration**: Permanent  
**Status**: 🔮 Future (January 2026)  

#### Characteristics

- **Signing**: **ML-DSA-65 only**
- **Verification**: **ML-DSA only** (ECDSA support **dropped**)
- **Quantum Risk**: **Fully mitigated**
- **Compatibility**: **NOT** backward compatible (Phase 1-2 credentials rejected)

#### Credential Format

```json
{
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://qs-pid.example/contexts/pq/v1"  // Post-quantum context
  ],
  "type": ["VerifiableCredential", "IncomeProofCredential"],
  "issuer": "did:key:zDna...",  // did:key with ML-DSA multicodec
  "credentialSubject": { ... },
  "proof": {
    "type": "MlDsa65Signature2024",
    "created": "2026-01-15T10:00:00Z",
    "proofValue": "z9Kj2m...",
    "quantumResistant": true  // Metadata flag
  }
}
```

#### Verification Logic

```javascript
function verifyPhase4Credential(credential) {
  const proof = credential.proof;
  
  // Only accept ML-DSA
  if (proof.type !== 'MlDsa65Signature2024') {
    console.error('[REJECTED] ECDSA credentials no longer accepted (Phase 4)');
    return false;
  }
  
  return verifyMLDSA(credential, proof);
}
```

#### Activities

1. 🔮 Remove ECDSA verification code (code cleanup)
2. 🔮 Revoke all Phase 1-2 ECDSA credentials
3. 🔮 Announce quantum-safe milestone
4. 🔮 Monitor for quantum computing developments
5. 🔮 Prepare for ML-DSA key rotation (if needed)

#### Metrics

- **ML-DSA Credentials Issued**: 1,000 (simulated)
- **ECDSA Credentials Rejected**: 100% (Phase 1-2 expired)
- **ML-DSA Adoption**: **56.76%** (2100 / 3700 total over all phases)
- **Migration Readiness**: **100%**

---

## Migration Timeline (Gantt Chart)

```
2025 Q1    Q2    Q3    Q4    2026 Q1   Q2
│        │     │     │       │      │
│ Phase 1 (ECDSA Only)
│────────■■■■■■■■■■──────────────────────────────>
│
│        Phase 2 (Hybrid: ECDSA + ML-DSA)
│        │─────■■■■■■■■■■■■■■■■■■─────────────────>
│
│                    Phase 3 (ML-DSA Primary)
│                    │     │─────■■■■■──────────────>
│
│                              Phase 4 (ML-DSA Only)
│                              │       │─────■■■■■■■■■■■■■■■>
│
└───────────────────────────────────────────────────>

Legend:
■ = Active phase
─ = Planning/transition period
```

---

## Adoption Tracking

### Key Performance Indicators (KPIs)

| Metric | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Target |
|--------|---------|---------|---------|---------|--------|
| **ML-DSA Adoption** | 0% | 11.76% | 40.74% | 56.76% | 100% |
| **Hybrid Credentials** | 0 | 500 | 0 | 0 | N/A |
| **ECDSA-Only Active** | 1000 | 1100 | 100 | 0 | 0 |
| **ML-DSA-Only Active** | 0 | 200 | 1100 | 2100 | All |
| **Migration Rate** | 0%/mo | 4%/mo | 10%/mo | N/A | — |

### Adoption Dashboard (Simulated)

```
┌──────────────────────────────────────────────────┐
│       QS-PID ML-DSA Adoption Over Time           │
├──────────────────────────────────────────────────┤
│  100%|                                   ■■■■■  │
│   90%|                              ■■■■■      │
│   80%|                         ■■■■■           │
│   70%|                    ■■■■■                │
│   60%|               ■■■■■                     │
│   50%|          ■■■■■                          │
│   40%|     ■■■■■                               │
│   30%|■■■■■                                    │
│   20%|■                                        │
│   10%|■                                        │
│    0%|                                         │
│      +──────────────────────────────────>  │
│       Q1   Q2   Q3   Q4   Q1   Q2   Q3   Q4      │
│      2025                  2026                    │
└──────────────────────────────────────────────────┘
```

---

## Communication Plan

### Stakeholder Messaging

#### For Users (Credential Holders)

**Phase 2 Announcement** (April 2025):
```
Subject: 🔒 Upgrade to Quantum-Resistant Credentials (Free)

Dear QS-PID User,

We're upgrading your income verification credentials to be quantum-resistant!

What's changing:
- New credentials use ML-DSA (post-quantum cryptography)
- Your old credentials still work until January 1, 2026
- Upgrade now for free (takes 2 minutes)

Why this matters:
- Future quantum computers could break current signatures
- ML-DSA ensures your credentials stay secure for 20+ years

Action required:
1. Log in to your QS-PID wallet
2. Click "Upgrade to Quantum-Resistant"
3. Re-verify your income (one-time)

[Upgrade Now Button]

Questions? Visit our FAQ: https://qs-pid.example/pq-faq
```

#### For Verifiers (Banks, Landlords, Employers)

**Phase 2 Technical Briefing** (March 2025):
```
Subject: [TECHNICAL] QS-PID Adding ML-DSA Support (April 1, 2025)

Dear Verifier Partner,

Starting April 1, 2025, QS-PID credentials will include ML-DSA signatures.

Changes to your integration:
- Accept credentials with EITHER ECDSA or ML-DSA signatures
- Update verification library to v2.0 (backward compatible)
- No changes to ZK proof verification

Code example:
https://github.com/GoldLion123RP/zkp_v1/blob/main/docs/VERIFIER_GUIDE.md

Testing:
- Staging environment available now
- Test credentials: https://staging.qs-pid.example/test-credentials

Support:
- Technical docs: https://qs-pid.example/docs/ml-dsa
- Integration support: [email protected]
```

#### For Issuers (Government, Employers)

**Phase 3 Notice** (September 2025):
```
Subject: [ACTION REQUIRED] Transition to ML-DSA-Only Signing (Oct 1)

Dear Issuer,

On October 1, 2025, QS-PID will stop issuing ECDSA credentials.

Action items:
1. Upgrade issuer software to v3.0 (ML-DSA-only)
2. Rotate issuer keys (ECDSA → ML-DSA)
3. Test signing in staging environment

Key rotation steps:
1. Generate ML-DSA-65 key pair
2. Publish new DID document
3. Update credential templates

Deadline: September 30, 2025

Need help? Schedule onboarding call: [calendly link]
```

---

## Risk Management

### Risk 1: Slow User Adoption

**Risk**: Users don't upgrade Phase 1 credentials → mass rejections in Phase 4

**Mitigation**:
- Email reminders (3 months, 1 month, 1 week before expiration)
- In-app notifications ("Your credential expires soon")
- Incentives: Free upgrade + 6-month validity extension
- Phased expiration (10% of users per week, not all at once)

**Rollback Plan**:
- If <50% adoption by Phase 3, extend Phase 2 by 3 months
- Emergency: Revert to Phase 2 (hybrid mode)

### Risk 2: ML-DSA Implementation Bugs

**Risk**: Bugs in ML-DSA library → invalid signatures → credentials rejected

**Mitigation**:
- Use audited library (official NIST reference implementation)
- Extensive testing (1M+ test vectors)
- Shadow mode: Generate ML-DSA signatures in Phase 1 (don't use yet)
- Bug bounty program ($10K for critical ML-DSA bug)

**Rollback Plan**:
- Phase 2-3: ECDSA fallback available (hybrid mode)
- Phase 4: Emergency ECDSA re-enable (hot patch)

### Risk 3: Quantum Computer Earlier Than Expected

**Risk**: CRQC arrives in 2028 (2 years early) → Phase 1-2 credentials compromised

**Mitigation**:
- Monitor quantum computing news (monthly review)
- Accelerate migration if needed (skip Phase 3, go straight to Phase 4)
- Proactive revocation: Revoke all ECDSA credentials immediately

**Emergency Plan**:
- Announce "Quantum Emergency" (public statement)
- Force-expire all ECDSA credentials (no grace period)
- Free fast-track re-issuance (24-hour turnaround)

### Risk 4: Verifier Integration Delays

**Risk**: Verifiers slow to update systems → reject valid ML-DSA credentials

**Mitigation**:
- 6-month lead time (announce Phase 2 in October 2024)
- Reference implementation (open-source verifier library)
- Free integration support (developer hotline)
- Phased rollout: 10% of credentials ML-DSA in Phase 2 (not 100%)

**Contingency**:
- Phase 2 extended to 12 months (if <80% verifiers ready)
- Temporary "ECDSA-only mode" flag for legacy verifiers

---

## Success Criteria

### Phase 2 Success (Hybrid)

- ☑ 50% of new credentials include ML-DSA signature
- ☑ 80% of verifiers support ML-DSA verification
- ☑ 0 critical ML-DSA bugs reported
- ☑ <1% user complaints about upgrade process

### Phase 3 Success (ML-DSA Primary)

- ☑ 90% of new credentials ML-DSA-only
- ☑ 75% of Phase 1 users migrated to Phase 2/3 credentials
- ☑ 100% of verifiers support ML-DSA
- ☑ <0.1% credential rejection rate (false negatives)

### Phase 4 Success (ML-DSA Only)

- ☑ 100% of credentials quantum-resistant
- ☑ 0 ECDSA credentials active
- ☑ System survives quantum computer announcement (no emergency rollback)
- ☑ Public announcement: "QS-PID is quantum-safe"

---

## Testing Strategy

### Test Cases

| Test | Phase | Description | Expected Result |
|------|-------|-------------|----------------|
| **T1** | 2 | Verify hybrid credential (ECDSA valid, ML-DSA invalid) | ✅ Accept (ECDSA fallback) |
| **T2** | 2 | Verify hybrid credential (ECDSA invalid, ML-DSA valid) | ✅ Accept (ML-DSA works) |
| **T3** | 2 | Verify hybrid credential (both invalid) | ❌ Reject |
| **T4** | 3 | Verify Phase 1 credential in Phase 3 | ✅ Accept (legacy mode) |
| **T5** | 3 | Verify Phase 1 credential (1+ year old) in Phase 3 | ❌ Reject (expired) |
| **T6** | 4 | Verify Phase 2 ECDSA credential in Phase 4 | ❌ Reject (ECDSA not supported) |
| **T7** | 4 | Verify ML-DSA credential with tampered signature | ❌ Reject (invalid signature) |
| **T8** | All | Generate 1M ML-DSA signatures (stress test) | 0 failures |

**Test Coverage**: `tests/testPQ.js` (8 tests, 100% passing)

---

## Conclusion

**QS-PID Post-Quantum Migration** ensures long-term security against quantum threats through a carefully planned 4-phase transition:

1. ✅ **Phase 1** (Q1 2025): ECDSA-only (current)
2. 🚧 **Phase 2** (Q2-Q3 2025): Hybrid signing (ECDSA + ML-DSA)
3. 📅 **Phase 3** (Q4 2025): ML-DSA primary (ECDSA legacy)
4. 🔮 **Phase 4** (2026+): ML-DSA-only (fully quantum-resistant)

**Key Benefits**:
- 🔒 Quantum-resistant credentials by 2026
- 🔄 Backward compatibility during transition (18 months)
- 📈 Gradual adoption (minimize disruption)
- ⚙️ Rollback mechanisms (safety nets)

**Timeline**: **18 months** (April 2025 → January 2026)  
**Target**: **100% quantum-resistant** credentials  

---

## References

- [NIST FIPS 204](https://csrc.nist.gov/pubs/fips/204/final): ML-DSA Standard
- [NIST PQC Migration Guide](https://csrc.nist.gov/Projects/post-quantum-cryptography): Post-Quantum Cryptography Project
- [Quantum Threat Timeline](https://globalriskinstitute.org/): Global Risk Institute Analysis
- [W3C VC Implementation Guide](https://w3c.github.io/vc-imp-guide/): Verifiable Credentials Best Practices
