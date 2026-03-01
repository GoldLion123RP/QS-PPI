# After Unzip: Complete Setup Guide

This guide covers **everything** you can do after unzipping the project, from instant demo to full compiler/backend setup.

---

## Option A: Instant Demo (No Install Required) ⚡

### 1. Offline Dashboard (Recommended for Quick Demo)

**Just open this file:**

```
docs/index.html
```

Or via PowerShell:

```powershell
cd "<unzipped-folder>\zkp_v1"
start .\docs\index.html
```

**What you get:**
- ✅ 3-screen dashboard (Dashboard / Issue Credential / Holder Wallet)
- ✅ Live W3C VC 2.0 credential preview
- ✅ Download/copy credentials
- ✅ Load credentials into wallet
- ✅ Generate ZK proofs with Groth16 structure
- ✅ Download/copy proofs
- ✅ Theme switcher (Dark/Light/Auto)
- ✅ Works 100% offline, no dependencies

---

## Option B: Full Backend Setup (Node.js API + Tests) 🔧

If you want the **Node.js backend** with API endpoints, proof generation/verification, and test suite:

### Prerequisites

- **Node.js 18+** ([Download](https://nodejs.org/))
- **npm 9+** (comes with Node.js)

### Step 1: Install Dependencies

```powershell
cd "<unzipped-folder>\zkp_v1"
npm install
```

This installs:
- `express` (backend server)
- `snarkjs` (ZKP proof generation/verification)
- `circomlib` (circuit libraries)
- `mocha` + `chai` (testing)
- Other dependencies from `package.json`

### Step 2: Run Backend Server

```powershell
node .\src\server.js
```

**Server starts on:** `http://localhost:3001`

**Available API endpoints:**
- `POST /api/issue` - Issue W3C VC 2.0 credential
- `POST /api/prove` - Generate ZK proof
- `POST /api/verify` - Verify ZK proof

### Step 3: Run Tests

```powershell
npm test
```

**Expected output:**
```
✓ Circuit constraints validation (28 tests)
✓ Proof generation (valid & invalid inputs)
✓ Proof verification
✓ W3C VC 2.0 compliance
✓ ML-DSA-65 signatures
✓ Unlinkability (Jaccard similarity)

Result: 28/28 passing
```

---

## Option C: Generate Circuit Files from Scratch (Full Compiler Setup) 🛠️

If you want to **compile the Circom circuit yourself** and generate proving/verification keys:

### Prerequisites

- **Circom 2.1.9+** ([Installation guide](https://docs.circom.io/getting-started/installation/))
- **snarkjs 0.7.5+** (install with `npm install -g snarkjs`)
- **Powers of Tau file** (pot16_final.ptau, ~30 MB)

### Step 1: Install Circom

**Windows (via Rust):**

```powershell
# Install Rust (if not installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Circom
git clone https://github.com/iden3/circom.git
cd circom
cargo build --release
cargo install --path circom

# Verify
circom --version
```

**Or use pre-built binaries:** [circom releases](https://github.com/iden3/circom/releases)

### Step 2: Install snarkjs (if not already installed)

```powershell
npm install -g snarkjs
```

### Step 3: Compile Circuit

```powershell
cd "<unzipped-folder>\zkp_v1\circuits"
circom circuits_incomeProof.circom --r1cs --wasm --sym
```

**Generates:**
- `circuits_incomeProof.r1cs` (~5 MB) - Constraint system
- `circuits_incomeProof_js/` folder with WASM prover
- `circuits_incomeProof.sym` - Debug symbols

### Step 4: Download Powers of Tau (if not present)

```powershell
curl -L https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_16.ptau -o pot16_final.ptau
```

**File size:** ~30 MB (supports circuits up to 2^16 constraints)

### Step 5: Generate Proving Key

```powershell
snarkjs groth16 setup circuits_incomeProof.r1cs pot16_final.ptau circuit_0000.zkey
```

**Generates:** `circuit_0000.zkey` (~20 MB)

### Step 6: Export Verification Key

```powershell
snarkjs zkey export verificationkey circuit_0000.zkey verification_key.json
```

**Generates:** `verification_key.json` (~1 KB) - Used by verifiers

### Step 7: Test Circuit

```powershell
cd ..
node .\src\server.js
# Open http://localhost:3001 and test proof generation
```

---

## Option D: React Dashboard (Advanced UI) 🎨

If you want the **Next.js/React dashboard** (alternative to `docs/index.html`):

### Step 1: Install Dependencies

```powershell
cd "<unzipped-folder>\zkp_v1\qspid-dashboard"
npm install
```

### Step 2: Run Development Server

```powershell
npm run dev
```

**Dashboard available at:** `http://localhost:3000`

**Features:**
- Interactive React components
- Real-time updates
- API client integration
- Tailwind CSS styling

---

## Cleanup (Reduce Folder Size to < 25 MB)

If your unzipped folder is huge (hundreds of MB), delete these:

```powershell
cd "<unzipped-folder>\zkp_v1"

# Delete node_modules (can reinstall with npm install)
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force qspid-dashboard\node_modules -ErrorAction SilentlyContinue

# Delete circuit build artifacts (can regenerate)
Remove-Item -Recurse -Force circuits\*.ptau -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force circuits\*.zkey -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force circuits\*.r1cs -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force circuits\*.wasm -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force circuits\*.sym -ErrorAction SilentlyContinue

# Delete other build artifacts
Remove-Item -Recurse -Force .next,dist,build,artifacts -ErrorAction SilentlyContinue
```

**Check new size:**

```powershell
Get-ChildItem -Recurse | Measure-Object -Property Length -Sum | Select-Object @{Name="Size(MB)";Expression={[math]::Round($_.Sum/1MB,2)}}
```

**Expected result:** ~15-25 MB (just source code + config)

---

## Summary: What to Use When

| Scenario | What to Run | Install Needed? |
|----------|-------------|----------------|
| **Quick demo for judges** | `docs/index.html` | ❌ No |
| **Backend API testing** | `npm install` + `node src/server.js` | ✅ Node.js |
| **Full ZKP compilation** | Circom + snarkjs workflow | ✅ Circom + snarkjs |
| **React UI development** | `cd qspid-dashboard && npm install && npm run dev` | ✅ Node.js |
| **Run automated tests** | `npm test` | ✅ Node.js |

---

## Troubleshooting

### "npm not found"

Install Node.js: https://nodejs.org/

### "circom not found"

Follow Circom installation guide: https://docs.circom.io/getting-started/installation/

### "Module not found: express"

Run `npm install` in the project root.

### "Circuit constraints mismatch"

Regenerate circuit files (see Option C above).

### Folder too large

Run cleanup commands above to remove `node_modules/` and circuit artifacts.

---

**For more details, see:**
- [README.md](./README.md) - Complete project overview
- [QUICKSTART.md](./QUICKSTART.md) - 5-minute setup
- [COMMANDS.md](./COMMANDS.md) - Useful PowerShell commands
