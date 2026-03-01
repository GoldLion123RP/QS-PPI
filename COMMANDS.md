# ⚡ Quick Command Reference

**For QS-PID System** - All commands at a glance

---

## 📦 Initial Setup (One-Time)

```bash
# 1. Extract ZIP
unzip zkp_v1_submission.zip
cd zkp_v1

# 2. Install dependencies (takes 2-3 minutes)
npm install
```

---

## ✅ Running Tests

```bash
# Run all test suites (28 tests, ~1 minute)
npm run test:all

# Run individual test suites
npm test                # Core ZKP tests (10)
npm run test:vc         # W3C VC 2.0 tests (8)
npm run test:pq         # Post-quantum tests (8)
npm run test:security   # Security audit (14)
```

---

## 🌐 Web Demo

### Method 1: Direct Open (Easiest)

```bash
# Windows
cd web
start index.html

# macOS
cd web
open index.html

# Linux
cd web
xdg-open index.html
```

### Method 2: Local Server (Recommended)

```bash
# Using Node.js http-server
npm install -g http-server
cd web
http-server -p 8000
# Visit: http://localhost:8000

# Using Python 3
cd web
python3 -m http.server 8000
# Visit: http://localhost:8000

# Using Python 2
cd web
python -m SimpleHTTPServer 8000
# Visit: http://localhost:8000
```

---

## 💻 Manual Terminal Demo

### Quick Node.js Test

```bash
# Start Node.js REPL
node
```

```javascript
// In Node.js REPL
const { IncomeProofGenerator } = require('./src/prover');
const { IncomeProofVerifier } = require('./src/verifier');

const prover = new IncomeProofGenerator();
const verifier = new IncomeProofVerifier();

// Generate proof
const proof = await prover.generateIncomeProof(750000000, 500000000);
console.log('Valid:', proof.isValid);

// Verify proof
const result = await verifier.verifyIncomeProof(proof, 'test-verifier');
console.log('Result:', result.valid, result.reason);

.exit
```

### Run Custom Demo Script

```bash
# Create manual_demo.js (see QUICKSTART.md for full code)
node manual_demo.js
```

---

## 📝 View Documentation

```bash
# Main README
cat README.md

# Technical docs
cat docs/ARCHITECTURE.md    # System design (20 KB)
cat docs/SECURITY.md        # Security model (21 KB)
cat docs/PQ-MIGRATION.md    # Post-quantum roadmap (19 KB)
cat docs/DEMO-SCRIPT.md     # Presentation guide (13 KB)

# Setup guides
cat QUICKSTART.md           # Detailed setup (this file)
cat SUBMISSION.md           # Judges' guide (12 KB)
cat PACKAGING.md            # How ZIP was created (9 KB)

# Web demo
cat web/README.md           # UI documentation (9 KB)
```

---

## 🔍 Explore Code

```bash
# Core implementation
cat src/prover.js           # Proof generation
cat src/verifier.js         # Proof verification
cat src/fiatShamir.js       # Security binding

# Verifiable Credentials
cat src/vc/credential.js    # W3C VC 2.0
cat src/vc/presentation.js  # Presentations

# Post-quantum crypto
cat src/pq/mldsa.js         # ML-DSA integration

# Zero-knowledge circuit
cat circuits/incomeProof.circom

# Tests
cat tests/testQSPID.js
cat tests/testVC.js
cat tests/testPQ.js
cat tests/testSecurityAudit.js
```

---

## 🛠️ Build Commands (Optional)

```bash
# Compile Circom circuit (already done in build/)
circom circuits/incomeProof.circom --r1cs --wasm --sym -o build/

# Generate proving key (already done)
snarkjs groth16 setup build/incomeProof.r1cs powersOfTau28_hez_final_14.ptau build/incomeProof.zkey

# Export verification key (already done)
snarkjs zkey export verificationkey build/incomeProof.zkey build/verification_key.json
```

---

## 🧹 Clean & Reinstall

```bash
# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clean npm cache (if errors persist)
npm cache clean --force
npm install
```

---

## 📊 Check Versions

```bash
# Node.js version (should be >= 18.x)
node --version

# npm version (should be >= 9.x)
npm --version

# Python version (optional, for web server)
python3 --version

# List installed packages
npm list --depth=0
```

---

## 📸 Demo Scenarios (Web UI)

### Scenario 1: Valid Proof

```
Prover Panel:
  Income: 750000000 (7.5 LPA)
  Threshold: 500000000 (5 LPA)
  → Generate Proof → Copy JSON

Verifier Panel:
  Paste proof → Verifier ID: demo-001
  → Verify → Result: ✅ VALID
```

### Scenario 2: Invalid Proof

```
Prover Panel:
  Income: 400000000 (4 LPA)
  Threshold: 500000000 (5 LPA)
  → Generate Proof → Copy JSON

Verifier Panel:
  Paste proof → Verify
  → Result: ❌ INVALID
```

### Scenario 3: Unlinkability

```
Generate 3 proofs with same income:
  Proof 1: Income=700000000, Threshold=500000000
  Proof 2: Same values
  Proof 3: Same values

Compare commitments in JSON:
  All different! ✅ Unlinkable
```

---

## ⏱️ Time Estimates

| Task | Time |
|------|------|
| Extract ZIP | 10s |
| `npm install` | 2-3 min |
| Run all tests | 1 min |
| Web demo (3 scenarios) | 5 min |
| Browse docs | 5 min |
| Manual terminal demo | 2 min |
| **Total** | **~15 min** |

---

## 🔗 Quick Links

- **GitHub**: https://github.com/GoldLion123RP/zkp_v1
- **Issues**: https://github.com/GoldLion123RP/zkp_v1/issues
- **Node.js Download**: https://nodejs.org/
- **Circom Docs**: https://docs.circom.io/
- **snarkjs Docs**: https://github.com/iden3/snarkjs
- **W3C VC Spec**: https://www.w3.org/TR/vc-data-model-2.0/

---

## 📧 Support

**Team**:
- Rahul Pal: goldlion123.rp@gmail.com
- Akash Dutta: akashdutta123456@gmail.com

---

## ✅ Success Checklist

- [ ] Node.js >= 18.x installed
- [ ] `npm install` completed
- [ ] All 28 tests passing
- [ ] Web demo opens
- [ ] Valid proof works
- [ ] Invalid proof detected
- [ ] Unlinkability demonstrated

---

<p align="center">
  <strong>All Commands at Your Fingertips! ⚡</strong>
</p>
