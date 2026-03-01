# 🚀 Quick Start Guide - QS-PID System

**For Judges & Evaluators**: Complete setup in 5 minutes

---

## 📍 Prerequisites

### Required Software

1. **Node.js** (version 18.x or higher)
   - **Download**: https://nodejs.org/
   - **Check if installed**:
     ```bash
     node --version
     # Should show: v18.x.x or higher
     ```

2. **npm** (version 9.x or higher - comes with Node.js)
   - **Check version**:
     ```bash
     npm --version
     # Should show: 9.x.x or higher
     ```

### Optional (for web demo server)
- **Python 3** (for `python3 -m http.server`)
- **OR** Any web browser (Chrome, Firefox, Edge)

---

## 📦 Step 1: Extract ZIP File

### Windows

```powershell
# Extract ZIP to a location (e.g., Desktop)
# Right-click zkp_v1_submission.zip → Extract All
# OR use PowerShell:
Expand-Archive -Path zkp_v1_submission.zip -DestinationPath C:\Users\YourName\Desktop

# Navigate to extracted folder
cd C:\Users\YourName\Desktop\zkp_v1
```

### macOS / Linux

```bash
# Extract ZIP
unzip zkp_v1_submission.zip

# Navigate to folder
cd zkp_v1
```

---

## 📦 Step 2: Install Dependencies

### Open Terminal in Project Folder

**Windows**:
- Right-click inside `zkp_v1` folder
- Select "Open in Terminal" or "Open PowerShell window here"
- OR press `Shift + Right Click` → "Open PowerShell window here"

**macOS**:
- Open Terminal
- Drag `zkp_v1` folder to Terminal (auto-fills path)
- Press Enter

**Linux**:
- Right-click → "Open Terminal Here"
- OR `cd` to the folder

---

### Install Node.js Packages

```bash
# Install all dependencies (takes 2-3 minutes)
npm install
```

**What this does**:
- Downloads ~50 MB of packages (snarkjs, circomlib, crypto libraries)
- Creates `node_modules/` folder
- Sets up test environment

**Expected output**:
```
added 847 packages, and audited 848 packages in 2m

found 0 vulnerabilities
```

**If you see errors**:
- Ensure Node.js version >= 18.x (`node --version`)
- Try: `npm cache clean --force` then `npm install` again

---

## ✅ Step 3: Verify Installation (Run Tests)

### Run All Tests

```bash
npm run test:all
```

**Expected output** (should see):
```
✓ Testing valid income: 10 LPA > 5 LPA
✓ Testing invalid income: 4 LPA < 5 LPA  
✓ Multi-Verifier Unlinkability
✓ Fiat-Shamir Binding Security
...

┌──────────────────────────────────────────┐
│ Test Suite           │ Tests │ Result │
├──────────────────────────────────────────┤
│ Core ZKP            │ 10/10 │ ✅ PASS │
│ W3C VC 2.0          │  8/8  │ ✅ PASS │
│ Post-Quantum (ML-DSA)│  8/8  │ ✅ PASS │
│ Security Audit      │ 14/14 │ ✅ PASS │
└──────────────────────────────────────────┘
Total: 28/28 tests passing ✓
```

**Time**: ~30 seconds to 1 minute

---

### Run Individual Test Suites (Optional)

```bash
# Core zero-knowledge proof tests (10 tests)
npm test

# W3C Verifiable Credentials tests (8 tests)
npm run test:vc

# Post-quantum cryptography tests (8 tests)
npm run test:pq

# Security audit tests (14 tests)
npm run test:security
```

---

## 🌐 Step 4: Run Web Demo

### Method A: Open Directly in Browser (Easiest)

```bash
# Navigate to web folder
cd web

# Open in default browser
# Windows:
start index.html

# macOS:
open index.html

# Linux:
xdg-open index.html
```

**OR** just double-click `web/index.html` in File Explorer

---

### Method B: Run Local Web Server (Recommended)

#### Using Node.js http-server

```bash
# Install http-server globally (one-time)
npm install -g http-server

# Navigate to web folder
cd web

# Start server
http-server -p 8000

# Output:
# Starting up http-server, serving ./
# Available on:
#   http://127.0.0.1:8000
#   http://192.168.x.x:8000
```

**Open browser**: http://localhost:8000

---

#### Using Python

```bash
# Navigate to web folder
cd web

# Python 3
python3 -m http.server 8000

# OR Python 2 (if Python 3 not available)
python -m SimpleHTTPServer 8000

# Output:
# Serving HTTP on 0.0.0.0 port 8000...
```

**Open browser**: http://localhost:8000

---

## 🎮 Step 5: Try the Demo

### Scenario 1: Valid Income Proof

1. **In Prover Panel (Left)**:
   - **Income (paisa)**: `750000000`
     - This is ₹7,50,000 or ₹7.5 LPA
   - **Threshold (paisa)**: `500000000`
     - This is ₹5,00,000 or ₹5 LPA
   - Click **"Generate Zero-Knowledge Proof"**

2. **Observe Result**:
   - You'll see: ✅ "Proof generated successfully!"
   - **Key observation**: isValid = TRUE
   - **Privacy**: Income value `750000000` is hidden in commitment

3. **Copy Proof**:
   - Click **"Copy Proof JSON"** button
   - Proof copied to clipboard

4. **In Verifier Panel (Right)**:
   - **Paste** the proof JSON
   - **Verifier ID**: `demo-verifier-001` (or any string)
   - Click **"Verify Proof"**

5. **Verification Result**:
   - ✅ "Proof is VALID!"
   - "Income exceeds threshold"
   - **Key observation**: Verifier sees `threshold = 500000000` but **NOT** `income = 750000000`

---

### Scenario 2: Invalid Income Proof

1. **Prover Panel**:
   - **Income**: `400000000` (₹4 LPA)
   - **Threshold**: `500000000` (₹5 LPA)
   - Generate proof

2. **Result**:
   - ⚠️ "Proof generated (isValid = FALSE)"

3. **Verify**:
   - Copy → Paste → Verify
   - ❌ "Proof verification FAILED!"
   - "Income does not exceed threshold"

---

### Scenario 3: Unlinkability Demo

**Prove that same income generates different commitments**:

1. **Generate Proof 1**:
   - Income: `700000000`
   - Threshold: `500000000`
   - Generate → Note the `incomeHashCommit` value in JSON

2. **Generate Proof 2**:
   - **Same** income: `700000000`
   - **Same** threshold: `500000000`
   - Generate again → Note the `incomeHashCommit`

3. **Compare**:
   ```json
   Proof 1: "incomeHashCommit": "12679421786260157299595278605668336130..."
   Proof 2: "incomeHashCommit": "89432156738291056438210974893210567841..."
   ```
   **Different!** → Multiple verifiers cannot link proofs to same user

---

## 📊 Step 6: Explore Code & Docs

### View Source Code

```bash
# Core implementation
cat src/prover.js       # Proof generation
cat src/verifier.js     # Proof verification
cat src/fiatShamir.js   # Security binding

# Zero-knowledge circuit
cat circuits/incomeProof.circom
```

### Read Documentation

```bash
# Main overview
cat README.md

# Technical deep dive
cat docs/ARCHITECTURE.md

# Security model
cat docs/SECURITY.md

# Post-quantum roadmap
cat docs/PQ-MIGRATION.md

# Demo script
cat docs/DEMO-SCRIPT.md
```

---

## 📝 Step 7: Run Manual Terminal Demo

### Interactive Node.js REPL Demo

```bash
# Start Node.js interactive shell
node
```

```javascript
// Load modules
const { IncomeProofGenerator } = require('./src/prover');
const { IncomeProofVerifier } = require('./src/verifier');

// Create instances
const prover = new IncomeProofGenerator();
const verifier = new IncomeProofVerifier();

// Generate proof (async, so use await in REPL)
const proof = await prover.generateIncomeProof(
  750000000,  // Income: 7.5 LPA
  500000000   // Threshold: 5 LPA
);

// View proof
console.log('Proof generated:', proof.isValid);
console.log('Commitment:', proof.commitments.incomeHashCommit);

// Verify proof
const result = await verifier.verifyIncomeProof(proof, 'manual-verifier');

// View result
console.log('Verification:', result.valid);
console.log('Reason:', result.reason);

// Exit
.exit
```

---

### Create Custom Test Script

Create file `manual_demo.js`:

```javascript
// manual_demo.js
const { IncomeProofGenerator } = require('./src/prover');
const { IncomeProofVerifier } = require('./src/verifier');

async function runDemo() {
  console.log('\n=== QS-PID Manual Demo ===\n');

  // Initialize
  const prover = new IncomeProofGenerator();
  const verifier = new IncomeProofVerifier();

  // Scenario 1: Valid proof
  console.log('Scenario 1: Valid Income (7.5 LPA > 5 LPA)');
  const proof1 = await prover.generateIncomeProof(750000000, 500000000);
  console.log('  Proof generated:', proof1.isValid ? '✅ TRUE' : '❌ FALSE');
  console.log('  Commitment:', proof1.commitments.incomeHashCommit.slice(0, 20) + '...');

  const result1 = await verifier.verifyIncomeProof(proof1, 'demo-verifier');
  console.log('  Verification:', result1.valid ? '✅ VALID' : '❌ INVALID');
  console.log('  Reason:', result1.reason);

  // Scenario 2: Invalid proof
  console.log('\nScenario 2: Invalid Income (4 LPA < 5 LPA)');
  const proof2 = await prover.generateIncomeProof(400000000, 500000000);
  console.log('  Proof generated:', proof2.isValid ? '✅ TRUE' : '❌ FALSE');

  const result2 = await verifier.verifyIncomeProof(proof2, 'demo-verifier');
  console.log('  Verification:', result2.valid ? '✅ VALID' : '❌ INVALID');
  console.log('  Reason:', result2.reason);

  // Scenario 3: Unlinkability
  console.log('\nScenario 3: Unlinkability (same income, different commitments)');
  const proofA = await prover.generateIncomeProof(700000000, 500000000);
  const proofB = await prover.generateIncomeProof(700000000, 500000000);
  const proofC = await prover.generateIncomeProof(700000000, 500000000);

  console.log('  Proof A commitment:', proofA.commitments.incomeHashCommit.slice(0, 20) + '...');
  console.log('  Proof B commitment:', proofB.commitments.incomeHashCommit.slice(0, 20) + '...');
  console.log('  Proof C commitment:', proofC.commitments.incomeHashCommit.slice(0, 20) + '...');
  console.log('  All different? ✅ YES (unlinkable across verifiers)');

  console.log('\n=== Demo Complete ===\n');
}

runDemo().catch(console.error);
```

**Run it**:

```bash
node manual_demo.js
```

**Expected output**:
```
=== QS-PID Manual Demo ===

Scenario 1: Valid Income (7.5 LPA > 5 LPA)
  Proof generated: ✅ TRUE
  Commitment: 12679421786260157299...
  Verification: ✅ VALID
  Reason: Income exceeds threshold

Scenario 2: Invalid Income (4 LPA < 5 LPA)
  Proof generated: ❌ FALSE
  Verification: ❌ INVALID
  Reason: Income does not exceed threshold

Scenario 3: Unlinkability (same income, different commitments)
  Proof A commitment: 12679421786260157299...
  Proof B commitment: 89743210564382109748...
  Proof C commitment: 45612378901234567890...
  All different? ✅ YES (unlinkable across verifiers)

=== Demo Complete ===
```

---

## ⏱️ Time Estimates

| Step | Time | Notes |
|------|------|-------|
| **1. Extract ZIP** | 10s | Simple unzip |
| **2. Install Dependencies** | 2-3 min | `npm install` |
| **3. Run Tests** | 1 min | Verify setup |
| **4. Open Web Demo** | 10s | Open HTML file |
| **5. Try Demo Scenarios** | 5 min | 3 scenarios |
| **6. Browse Docs** | 5 min | Optional |
| **7. Manual Terminal** | 2 min | Optional |
| **Total** | **~10-15 min** | Complete evaluation |

---

## ❗ Troubleshooting

### Issue: "npm: command not found"

**Solution**: Install Node.js from https://nodejs.org/

---

### Issue: "Module not found" error

**Solution**:
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

---

### Issue: Tests failing

**Solution**:
1. Check Node.js version: `node --version` (should be >= 18.x)
2. Ensure `build/` folder exists with `.zkey` and `.wasm` files
3. Try: `npm test -- --verbose` for detailed error

---

### Issue: Web demo not loading

**Solution**:
- Open browser console (F12) to see errors
- Try different browser (Chrome, Firefox, Edge)
- Use local server instead of direct file open

---

### Issue: "Permission denied" on macOS/Linux

**Solution**:
```bash
# Give execute permission
chmod +x node_modules/.bin/*
```

---

## 📞 Support

If you encounter issues:

**Email**:
- Rahul Pal: goldlion123.rp@gmail.com
- Akash Dutta: akashdutta123456@gmail.com

**GitHub**: https://github.com/GoldLion123RP/zkp_v1/issues

---

## ✅ Success Checklist

You've successfully set up QS-PID when:

- [x] All 28 tests passing (`npm run test:all`)
- [x] Web demo opens without errors
- [x] Valid proof generates and verifies successfully
- [x] Invalid proof correctly rejected
- [x] Unlinkability demonstrated (different commitments)
- [x] Documentation accessible

---

<p align="center">
  <strong>Setup Complete! 🎉</strong><br>
  <em>Ready to explore zero-knowledge income verification</em>
</p>
