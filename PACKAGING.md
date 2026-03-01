# 📦 Packaging Instructions for Hackathon Submission

**Last updated**: March 1, 2026  
**Purpose**: Create submission ZIP for judges to run locally

---

## 📝 What to Include in ZIP

### ✅ Essential Files (MUST Include)

```
zkp_v1/
├── README.md                    # Main documentation
├── SUBMISSION.md                # Setup guide for judges
├── package.json                 # Dependencies
├── package-lock.json            # Exact versions
├── LICENSE                      # MIT License
├── .gitignore                   # Reference
├─── circuits/
│   └── incomeProof.circom       # ZK circuit source
├─── src/
│   ├── prover.js                # Core logic
│   ├── verifier.js
│   ├── fiatShamir.js
│   ├── vc/
│   │   ├── credential.js
│   │   └── presentation.js
│   └── pq/
│       └── mldsa.js
├─── tests/
│   ├── testQSPID.js             # All test files
│   ├── testVC.js
│   ├── testPQ.js
│   └── testSecurityAudit.js
├─── web/
│   ├── index.html               # Interactive demo
│   └── README.md                # Web demo docs
├─── docs/
│   ├── ARCHITECTURE.md          # Technical specs
│   ├── SECURITY.md              # Security model
│   ├── PQ-MIGRATION.md          # Post-quantum plan
│   └── DEMO-SCRIPT.md           # Presentation guide
└─── build/
    ├── incomeProof_js/          # Compiled circuit
    │   ├── generate_witness.js
    │   └── witness_calculator.js
    ├── incomeProof.wasm         # WASM witness gen
    ├── incomeProof.zkey         # Proving key
    └── verification_key.json    # Verification key
```

### ❌ Exclude from ZIP (DO NOT Include)

```
❌ node_modules/              # ~50 MB (judges install via npm install)
❌ .git/                      # Git history (not needed)
❌ .github/                   # CI/CD configs
❌ *.log                      # Log files
❌ .DS_Store, Thumbs.db       # OS files
❌ .vscode/, .idea/           # Editor configs
❌ .env                       # Environment files
```

---

## 🛠️ Step-by-Step Packaging

### Method 1: Using Git Archive (Recommended)

```bash
# Pull latest changes
git pull

# Create clean ZIP (excludes node_modules, .git automatically)
git archive --format=zip --output=zkp_v1_submission.zip HEAD

# Verify ZIP contents
unzip -l zkp_v1_submission.zip
```

**Pros**:
- Automatically excludes `.git`, `node_modules`
- Clean, consistent structure
- Fast

**Expected size**: ~5-8 MB (without node_modules)

---

### Method 2: Manual ZIP (Windows)

```powershell
# Navigate to project root
cd E:\Documents\Rahul Pal\Coding\Hackathon\zkp_v1

# Create temporary copy (exclude node_modules)
$source = "zkp_v1"
$dest = "zkp_v1_submission"

# Copy files
robocopy $source $dest /E /XD node_modules .git .github .vscode .idea

# Create ZIP
Compress-Archive -Path $dest -DestinationPath zkp_v1_submission.zip

# Clean up temp folder
Remove-Item -Recurse -Force $dest
```

---

### Method 3: Manual ZIP (macOS/Linux)

```bash
# Navigate to parent directory
cd ~/Documents/Hackathon

# Create ZIP excluding unnecessary folders
zip -r zkp_v1_submission.zip zkp_v1 \
  -x "*/node_modules/*" \
  -x "*/.git/*" \
  -x "*/.github/*" \
  -x "*/.vscode/*" \
  -x "*/.idea/*" \
  -x "*/.DS_Store" \
  -x "*.log"

# Verify size
ls -lh zkp_v1_submission.zip
```

---

## ✅ Pre-Submission Verification

### 1. Test the ZIP Package

```bash
# Extract to temp location
mkdir temp_test
cd temp_test
unzip ../zkp_v1_submission.zip

# Navigate to extracted folder
cd zkp_v1

# Install dependencies (simulating judge's setup)
npm install

# Run tests
npm run test:all

# Expected: 28/28 tests passing
```

### 2. Verify File Structure

```bash
# Check all essential files present
ls -la
ls -la circuits/
ls -la src/
ls -la tests/
ls -la web/
ls -la docs/
ls -la build/
```

### 3. Test Web Demo

```bash
cd web

# Open in browser
open index.html  # macOS
start index.html # Windows

# Verify:
# - Page loads without errors
# - Generate proof works
# - Verify proof works
# - Copy button works
```

### 4. Check Documentation

```bash
# Ensure all docs are readable
cat README.md
cat SUBMISSION.md
cat docs/ARCHITECTURE.md
cat docs/SECURITY.md
cat docs/PQ-MIGRATION.md
cat docs/DEMO-SCRIPT.md
cat web/README.md
```

---

## 📊 Expected Package Size

| Component | Size | Notes |
|-----------|------|-------|
| **Source Code** | ~50 KB | .js files |
| **Circuits** | ~5 KB | .circom |
| **Build** | ~4 MB | .zkey, .wasm, .json |
| **Documentation** | ~120 KB | 7 markdown files |
| **Tests** | ~30 KB | 4 test files |
| **Web Demo** | ~20 KB | index.html |
| **package.json** | ~2 KB | Dependencies list |
| **Total ZIP** | **~5-8 MB** | (compressed) |

**After `npm install`**: ~55-60 MB (with node_modules)

---

## 📝 Submission Checklist

Before finalizing ZIP:

- [ ] Latest code pulled from GitHub (`git pull`)
- [ ] All tests passing locally (`npm run test:all`)
- [ ] Web demo works (open `web/index.html`)
- [ ] `SUBMISSION.md` included (judges' setup guide)
- [ ] `README.md` has team info & emails
- [ ] `node_modules/` excluded from ZIP
- [ ] `.git/` excluded from ZIP
- [ ] ZIP tested in clean environment
- [ ] File size reasonable (~5-8 MB)
- [ ] Documentation complete (7 files)

---

## 📧 Submission Metadata

Include this info with your submission:

**Project Name**: QS-PID (Quantum-Safe Privacy-Preserving Income Verification)

**Team Members**:
- Rahul Pal (goldlion123.rp@gmail.com)
- Akash Dutta (akashdutta123456@gmail.com)

**GitHub**: https://github.com/GoldLion123RP/zkp_v1

**Tech Stack**: Node.js, Circom, Groth16, snarkjs, W3C VC 2.0, ML-DSA

**Setup Time**: 5 minutes (npm install + open demo)

**Test Coverage**: 28/28 tests passing

**Documentation**: 113 KB (7 comprehensive files)

**Key Innovation**: Zero-knowledge income verification with unlinkability

---

## 💼 Additional Submission Materials (Optional)

### If Required by Hackathon

1. **Demo Video** (3-5 minutes):
   - Record using docs/DEMO-SCRIPT.md
   - Show: Problem → Solution → Live Demo → Impact
   - Upload to YouTube (unlisted) or Google Drive
   - Include link in submission form

2. **Pitch Deck** (5-8 slides):
   - Slide 1: Problem statement
   - Slide 2: QS-PID solution
   - Slide 3: Architecture diagram
   - Slide 4: Live demo (screenshots)
   - Slide 5: Use cases
   - Slide 6: Technical highlights
   - Slide 7: Roadmap
   - Slide 8: Team & contact

3. **Screenshots**:
   - Web demo (prover panel)
   - Web demo (verifier panel)
   - Test results (28/28 passing)
   - Architecture diagram (from README)

---

## 🚀 Final Steps

### 1. Create the ZIP

```bash
# Pull latest
git pull

# Create ZIP
git archive --format=zip --output=zkp_v1_submission.zip HEAD
```

### 2. Verify Package

```bash
# Test in clean environment
mkdir test_submission
cd test_submission
unzip ../zkp_v1_submission.zip
cd zkp_v1
npm install
npm run test:all
```

### 3. Upload & Submit

- Upload `zkp_v1_submission.zip` to hackathon platform
- Include GitHub link: https://github.com/GoldLion123RP/zkp_v1
- Add team member emails
- Attach demo video (if required)
- Submit pitch deck (if required)

---

## 🎯 Judge Evaluation Flow

**Expected judge experience** (10-15 minutes):

1. **Extract ZIP** (30s)
2. **Read SUBMISSION.md** (2 min)
3. **Run `npm install`** (2 min)
4. **Run `npm run test:all`** (1 min)
5. **Open web demo** (5 min):
   - Generate valid proof
   - Verify proof
   - Test unlinkability
6. **Browse documentation** (5 min):
   - ARCHITECTURE.md
   - SECURITY.md

**Total**: 15 minutes to fully evaluate

---

## ✨ Success Criteria

Your submission is ready when:

✅ ZIP extracts cleanly  
✅ `npm install` completes without errors  
✅ All 28 tests pass  
✅ Web demo works (no console errors)  
✅ Documentation is clear and complete  
✅ Team info & emails included  
✅ File size reasonable (~5-8 MB)  
✅ No sensitive data (keys, .env) in ZIP  

---

## 📞 Support During Evaluation

If judges encounter issues:

**Email**:
- Rahul Pal: goldlion123.rp@gmail.com
- Akash Dutta: akashdutta123456@gmail.com

**GitHub Issues**: [zkp_v1/issues](https://github.com/GoldLion123RP/zkp_v1/issues)

**Response Time**: Within 2 hours during hackathon period

---

<p align="center">
  <strong>Ready to submit! 🏆</strong><br>
  <em>Good luck with the hackathon!</em>
</p>
