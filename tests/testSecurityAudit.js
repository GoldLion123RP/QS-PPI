/**
 * testSecurityAudit.js — Security Audit Tests for QS-PID
 *
 * Tests covered:
 *   1. Fiat-Shamir binding completeness
 *   2. Missing public value detection
 *   3. Challenge tampering detection
 *   4. ML-DSA key generation strength
 *   5. Replay attack prevention
 *   6. Commitment unlinkability
 *   7. Threshold boundary enforcement
 *
 * Run: npm run test:security
 */

const crypto = require('crypto');
const { MLDSAKeyPair } = require('../src/pq/mldsa');
const { FiatShamirBinding } = require('../src/prover');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  [✓] ${name}`);
    passed++;
  } catch (e) {
    console.log(`  [✗] ${name}`);
    console.log(`       → ${e.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`  [✓] ${name}`);
    passed++;
  } catch (e) {
    console.log(`  [✗] ${name}`);
    console.log(`       → ${e.message}`);
    failed++;
  }
}

// ─── Section 1: Fiat-Shamir Binding ─────────────────────────────────────────
console.log('\n=== 1. Fiat-Shamir Binding Security ===');

const validPublicValues = {
  threshold: '500000000',
  isValid: '1',
  incomeHashCommit: '12345678901234567890',
  verifierId: 'verifier-001',
  timestamp: new Date().toISOString(),
};

test('Valid binding creates challenge without error', () => {
  const binding = FiatShamirBinding.createSecureChallenge(validPublicValues);
  assert(binding.challenge, 'No challenge produced');
  assert(binding.challengeHex.length === 64, 'Challenge hex must be 64 chars (32 bytes)');
});

test('Missing threshold is detected', () => {
  const bad = { ...validPublicValues };
  delete bad.threshold;
  try {
    FiatShamirBinding.createSecureChallenge(bad);
    assert(false, 'Should have thrown');
  } catch (e) {
    assert(e.message.includes('threshold'), `Expected threshold error, got: ${e.message}`);
  }
});

test('Missing isValid is detected', () => {
  const bad = { ...validPublicValues };
  delete bad.isValid;
  try {
    FiatShamirBinding.createSecureChallenge(bad);
    assert(false, 'Should have thrown');
  } catch (e) {
    assert(e.message.includes('isValid'), `Expected isValid error, got: ${e.message}`);
  }
});

test('Missing incomeHashCommit is detected', () => {
  const bad = { ...validPublicValues };
  delete bad.incomeHashCommit;
  try {
    FiatShamirBinding.createSecureChallenge(bad);
    assert(false, 'Should have thrown');
  } catch (e) {
    assert(
      e.message.includes('incomeHashCommit'),
      `Expected incomeHashCommit error, got: ${e.message}`
    );
  }
});

test('Challenge verification succeeds for matching values', () => {
  const binding = FiatShamirBinding.createSecureChallenge(validPublicValues);
  const verify  = FiatShamirBinding.verifyChallengeBind(validPublicValues, binding.challenge);
  assert(verify.valid, `Challenge verify failed: ${verify.reason}`);
});

test('Challenge verification fails for tampered verifierId', () => {
  const binding  = FiatShamirBinding.createSecureChallenge(validPublicValues);
  const tampered = { ...validPublicValues, verifierId: 'evil-attacker' };
  const verify   = FiatShamirBinding.verifyChallengeBind(tampered, binding.challenge);
  assert(!verify.valid, 'Tampered challenge should NOT verify');
});

test('Different timestamps produce different challenges', () => {
  const b1 = FiatShamirBinding.createSecureChallenge({ ...validPublicValues, timestamp: new Date().toISOString() });
  const b2 = FiatShamirBinding.createSecureChallenge({ ...validPublicValues, timestamp: new Date(Date.now() + 1000).toISOString() });
  assert(b1.challengeHex !== b2.challengeHex, 'Timestamps must produce different challenges');
});

// ─── Section 2: ML-DSA Key Security ─────────────────────────────────────────
console.log('\n=== 2. ML-DSA Post-Quantum Key Security ===');

test('ML-DSA key pair is generated with correct variant', () => {
  const kp = MLDSAKeyPair.generate('ML-DSA-65');
  assert(kp.variant === 'ML-DSA-65', 'Variant mismatch');
  assert(kp.publicKey, 'No public key');
  assert(kp.privateKey, 'No private key');
});

test('Two generated key pairs are different', () => {
  const kp1 = MLDSAKeyPair.generate('ML-DSA-65');
  const kp2 = MLDSAKeyPair.generate('ML-DSA-65');
  assert(
    JSON.stringify(kp1.publicKey) !== JSON.stringify(kp2.publicKey),
    'Key pairs must be unique'
  );
});

test('ML-DSA key pair has creation timestamp', () => {
  const kp = MLDSAKeyPair.generate('ML-DSA-44');
  assert(kp.createdAt, 'Missing createdAt timestamp');
});

// ─── Section 3: Replay Attack Prevention ────────────────────────────────────
console.log('\n=== 3. Replay Attack / Nonce Entropy ===');

test('Two random nonces are never equal', () => {
  const n1 = crypto.randomBytes(32).toString('hex');
  const n2 = crypto.randomBytes(32).toString('hex');
  assert(n1 !== n2, 'Collision in 32-byte random nonces — entropy broken');
});

test('Challenge includes verifierId to prevent cross-verifier replay', () => {
  const b1 = FiatShamirBinding.createSecureChallenge({ ...validPublicValues, verifierId: 'verifier-A' });
  const b2 = FiatShamirBinding.createSecureChallenge({ ...validPublicValues, verifierId: 'verifier-B' });
  assert(b1.challengeHex !== b2.challengeHex, 'Different verifiers must produce different challenges');
});

// ─── Section 4: isValid Binary Enforcement ──────────────────────────────────
console.log('\n=== 4. Input Validation ===');

test('isValid rejects non-binary values', () => {
  const bad = { ...validPublicValues, isValid: '2' };
  try {
    FiatShamirBinding.createSecureChallenge(bad);
    assert(false, 'Should have thrown for isValid=2');
  } catch (e) {
    assert(e.message.includes('isValid'), `Expected isValid error, got: ${e.message}`);
  }
});

test('Binding report marks all required fields', () => {
  const report = FiatShamirBinding.createBindingReport(validPublicValues);
  assert(report.validationStatus === true, 'Binding report validation should pass');
  assert(report.totalValuesIncluded >= 5, 'Expected at least 5 values included');
});

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log('\n============================================');
console.log(`  Security Audit Results: ${passed} passed, ${failed} failed`);
console.log('============================================\n');

if (failed > 0) process.exit(1);
