# QS-PID Zero-Knowledge Proof Setup Guide

## Quick Start Commands

Run these commands in order to set up the entire QS-PID system:

```powershell
# Navigate to project directory
cd "e:\Documents\Rahul Pal\Coding\Hackathon\QS-PID"

# Step 1: Install all dependencies
npm install

# Step 2: Compile the Circom circuit to R1CS and WASM
npm run compile

# Step 3: Run trusted setup (downloads ptau, generates zkey, verification key)
npm run setup

# Step 4: Generate a proof
npm run prove

# Step 5: Verify the proof
npm run verify
```

---

## Available npm Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install all Node.js dependencies |
| `npm run compile` | Compile Circom circuit to R1CS and WASM |
| `npm run setup` | Run trusted setup (downloads ptau, generates keys) |
| `npm run prove` | Generate a zero-knowledge proof |
| `npm run verify` | Verify an existing proof |
| `npm test` | Run core ZKP tests |
| `npm run test:vc` | Run W3C Verifiable Credentials tests |
| `npm run test:pq` | Run Post-Quantum cryptography tests |
| `npm run test:security` | Run security audit tests |
| `npm run test:all` | Run all test suites |
| `npm run frontend` | Start the frontend development server |

---

## Detailed Step-by-Step Setup

### Prerequisites

Before starting, ensure you have the following installed:
- **Node.js** (v18 or higher recommended)
- **circom** compiler (v2.0 or higher)

Verify installations:
```powershell
node --version
circom --version
```

---

### Step 1: Install Dependencies

```powershell
npm install
```

This installs all required packages:
- `snarkjs` - ZK-SNARK proving and verification
- `circomlib` - Circuit libraries
- `circomlibjs` - JavaScript utilities
- `ffjavascript` - Finite field arithmetic

---

### Step 2: Compile the Circuit

```powershell
npm run compile
```

This command:
1. Reads `circuits/incomeProof.circom`
2. Compiles to R1CS format (`artifacts/incomeProof.r1cs`)
3. Generates WASM prover (`artifacts/incomeProof_js/incomeProof.wasm`)
4. Creates symbol table (`artifacts/incomeProof.sym`)

Expected output:
```
Compile: Done
```

---

### Step 3: Trusted Setup

```powershell
npm run setup
```

This script performs the following automatically:
1. Downloads Powers of Tau file (pot14_final.ptau ~18 MB)
2. Prepares Phase 2 of trusted setup
3. Generates initial zkey
4. Adds entropy contribution
5. Exports verification key

**First run may take 1-2 minutes** due to downloading and cryptographic operations.

Generated files:
- `artifacts/pot14_phase1.ptau` - Phase 1 ptau
- `artifacts/pot14_final.ptau` - Phase 2 ptau
- `artifacts/incomeProof_0000.zkey` - Initial zkey
- `artifacts/incomeProof_final.zkey` - Final proving key
- `artifacts/verification_key.json` - Verification key

---

### Step 4: Generate a Proof

```powershell
npm run prove
```

This generates a zero-knowledge proof for income verification.

The proof is saved to: `artifacts/proof.json`

---

### Step 5: Verify a Proof

```powershell
npm run verify
```

This verifies the proof generated in Step 4 using the verification key.

---

## Running Tests

### Run All Tests

```powershell
npm run test:all
```

### Run Individual Test Suites

```powershell
# Core ZKP functionality tests
npm test

# W3C Verifiable Credentials tests
npm run test:vc

# Post-Quantum cryptography tests
npm run test:pq

# Security audit tests
npm run test:security
```

---

## Frontend Development

Start the frontend server:

```powershell
npm run frontend
```

Then open your browser to: `http://localhost:3000`

---

## Troubleshooting

### "Cannot find module 'snarkjs'"
Run `npm install` to ensure all dependencies are installed.

### Circuit compilation fails
Ensure `circom` is installed:
```powershell
npm install -g circom
```

### Trusted setup fails (download issues)
The setup script will attempt multiple download sources. If all fail, manually download:
1. Go to: https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_14.ptau
2. Save to: `artifacts/pot14_phase1.ptau`
3. Run: `npm run setup`

### Verification fails
Ensure you've run the full setup:
1. `npm run compile`
2. `npm run setup`
3. `npm run prove`
4. `npm run verify`

---

## Project Structure

```
QS-PID/
├── circuits/
│   └── incomeProof.circom      # ZK circuit definition
├── artifacts/                   # Generated files
│   ├── incomeProof.r1cs         # Compiled circuit
│   ├── incomeProof.sym          # Symbol table
│   ├── incomeProof_js/          # WASM prover
│   ├── incomeProof_final.zkey  # Proving key
│   ├── verification_key.json    # Verification key
│   └── proof.json               # Generated proof
├── src/
│   ├── prover.js                # Proof generation
│   └── verifier.js              # Proof verification
├── scripts/
│   ├── setup.js                 # Trusted setup script
│   ├── prove.js                 # Proof generation script
│   └── verify.js                # Verification script
├── tests/                       # Test suites
├── frontend/                    # Web interface
├── package.json
└── SETUP_GUIDE.md              # This file
```

---

## Technical Details

- **ZK Scheme**: Groth16
- **Circuit**: Income Proof (361 constraints)
- **Hash Function**: Poseidon (ZK-friendly)
- **Post-Quantum**: ML-DSA-65 support
- **VC Standard**: W3C Verifiable Credentials 2.0

---

## Next Steps

After setup, explore:
- Read [`README.md`](README.md) for project overview
- Check [`COMMANDS.md`](COMMANDS.md) for all available commands
- Review [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for system design
