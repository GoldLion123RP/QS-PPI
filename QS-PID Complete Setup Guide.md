# 🚀 QS-PID Complete Setup Guide

## Prerequisites
- Node.js (v18+) installed
- npm (comes with Node.js)

---

## PHASE 1: Verify Dependencies & Configuration

### Step 1: Check Node.js Installation
```bash
node --version
# Should show v18.x.x or higher
```

### Step 2: Check Project Structure
```bash
dir
# Or
Get-ChildItem | Format-List
# You should see: frontend/, src/, circuits/, tests/, package.json
```

### Step 3: Install Dependencies
```bash
npm install
```

---

## PHASE 2: Backend Services

### Option A: Frontend Only (Demo Mode) - RECOMMENDED FOR TESTING
This runs the web server with mock/demo proofs (no circuit compilation needed):

```bash
npm run frontend
```

**Expected Output:**
```
[✓] QS-PID frontend running at http://localhost:3000
[*] Artifacts ready : false
[*] Press Ctrl+C to stop
```

### Option B: Full Backend (Real ZKP)
If you want actual cryptographic proofs:
```bash
# Verify everything works
npm run test:all

# Compile Circom circuits
npm run compile

# Setup proving keys
npm run setup

# Then start frontend
npm run frontend
```

---

## PHASE 3: Verify Services Running

### Check Backend Status
1. Open browser to http://localhost:3000
2. Look at the **status bar** at the bottom of the hero section
3. You should see:
   - **Backend: ONLINE** (green dot) or OFFLINE (red dot)
   - **Artifacts Ready: NO** (in demo mode) or YES (if compiled)
   - **Node: v22.x.x**
   - **Uptime: Xs**

---

## PHASE 4: Frontend Navigation

### Page 1: Main Hub (http://localhost:3000)

**What you see:**
- Animated 3D wireframe (Three.js) - rotating icosahedron
- "QS-PID" title with "QUANTUM-SAFE · ZERO-KNOWLEDGE · POST-QUANTUM" badge
- Two buttons: "⚡ Launch Demo" and "📖 View Docs"
- 7 clickable cards (section cards)

**Interactive elements:**
- Scroll down to see all 7 cards
- Click any card to open in new tab
- Status bar shows backend health

---

### Page 2: Generate Income Proof (prove.html)

**Location:** Click first card "⚡ Generate Income Proof"

**Input Fields:**
| Field | Location | Example Value |
|-------|----------|---------------|
| Annual Income (LPA) | Top input | 12 |
| Threshold (LPA) | Second input | 5 |
| Verifier ID | Third input | demo-verifier-001 |

**What happens:**
- As you type in "Annual Income", the ₹ badge updates (e.g., 12 → ₹12,00,000)
- Same for Threshold

**Button: "⚡ Generate Proof"**
- Click to generate ZKP
- **Expected result:** Shows "✅ Income ABOVE threshold" (green) or "❌ Income BELOW threshold" (red)
- Privacy preserved: shows "Actual amount hidden"
- Mode: Shows "Demo" if no circuits compiled

**Action Buttons (appear after generation):**
- "📋 Copy Proof JSON" - copies to clipboard
- "✅ Verify This Proof" - opens verify.html with proof pre-filled

---

### Page 3: Verify Proof (verify.html)

**Location:** Click "✅ Verify Proof" card OR from prove.html

**Input Field:**
| Field | Location | What to Enter |
|-------|----------|---------------|
| Proof JSON | Large textarea | Paste proof JSON from prove page |

**Auto-fill:** If you came from prove.html, the proof is auto-filled in sessionStorage

**Button: "✅ Verify Proof"**
- Click to verify
- **Expected result:** 
  - Green banner: "✅ PROOF VALID"
  - Red banner: "❌ PROOF INVALID"

---

### Page 4: Post-Quantum ML-DSA (pq.html)

**Location:** Click "🔑 Post-Quantum ML-DSA" card

**What you see:**
- Info banner about NIST FIPS 204 ML-DSA-65

**Button: "🔑 Generate ML-DSA-65 Key Pair"**
- Click to generate key pair
- **Expected result:**
  - Variant: ML-DSA-65
  - Created At: [timestamp]
  - Phase: Active
  - Public Key: (truncated hex)
  - "View Full JSON" expandable section

---

### Page 5: System Status (status.html)

**Location:** Click "📊 System Status" card

**What you see (auto-loads on page open):**
- 4 stat cards in 2x2 grid:
  - Backend Status: ONLINE/OFFLINE
  - Artifacts Ready: YES/NO
  - Node Version: v22.x.x
  - Uptime: Xs
- API Endpoints table
- "🔄 Refresh Status" button

**Button: "🔄 Refresh Status"**
- Click to reload status data

---

### Page 6: Issuer Registry Dashboard (dashboard.html)

**Location:** Click "🗂️ Issuer Registry" card

**What you see:**
- Info pill: "NIST FIPS 204: ML-DSA-65 ACTIVE · ZKP Curve: BN254 (Groth16)"
- 4 stat cards:
  - Issued Credentials: 1,248
  - Circuit Constraints: ~145K
  - Avg. Proof Time: 220 ms
  - Jaccard Similarity: < 0.05
- Table with 3 sample holders

**Sample Data Explanation:**
- These are DEMO/SAMPLE records showing the data structure
- In production, this would connect to a real database
- Columns marked PRIVATE are hidden from verifiers
- Only Commitment (PUBLIC) can be shared

---

### Page 7: Issue Credential (issue.html)

**Location:** Click "📝 Issue Credential" card

**Input Fields:**
| Field | Location | Example |
|-------|----------|---------|
| Full Name | First input | Rahul Pal |
| Annual Income (INR) | Second input | 750000 |
| Employer | Dropdown | HDFC Bank |
| Issuance Date | Date picker | 2026-03-07 |

**Cryptographic Pipeline (non-editable, shows what's happening):**
- ✅ 32-byte Salt - Randomness for security
- ✅ HybridSigner (ECDSA+ML-DSA) - Quantum-safe signatures
- ✅ JSON-LD Format - W3C standard

**Buttons:**
| Button | Action |
|--------|--------|
| ✓ Issue Credential | Generates the VC JSON |
| ⬇️ Download | Downloads credential-{timestamp}.json |
| 📋 Copy | Copies JSON to clipboard |
| 📦 Load into Wallet | Opens wallet.html with credential loaded |

**Live Preview:** The W3C VC 2.0 JSON updates as you type

---

### Page 8: Wallet (wallet.html)

**Location:** Click "💼 Wallet" card OR from issue.html via "Load into Wallet"

**What you see (3 sections):**

#### Section 1: Personal Info (PRIVATE)
- Name, Employer, Income (hidden from verifiers)

#### Section 2: Crypto Artifacts (ZK-READY)
- Poseidon Commitment
- Session Nonce
- ML-DSA-65 Signature

**Button: "⬇️ Download Wallet"** - Downloads wallet backup

#### Section 3: ZKP Circuit Logic
Shows the 3 circuit steps:
1. ✓ Num2Bits(32) - Prevents overflow
2. ✓ Income > Threshold - Comparison
3. ✓ Fiat-Shamir - Challenge binding

#### Section 4: 🔑 Verifier Challenge (IMPORTANT!)

**Purpose:** Generate a proof showing "income > 5 LPA" WITHOUT revealing exact salary

**Input Field:**
| Field | Location | Example |
|-------|----------|---------|
| Challenge (optional) | Text input | bank-loan-2026 |

**Button: "✓ Generate Proof"**
- Click to create ZK proof
- **Expected result:** Green "✅ ZK Proof Generated" section appears
- Shows the proof JSON with privacy guarantee

**Proof Output Actions:**
- ⬇️ Download - Saves proof-{timestamp}.json
- 📋 Copy - Copies to clipboard

**How to use the proof:**
1. Download or copy the generated proof
2. Send to verifier (bank, lender, etc.)
3. They can verify it shows "income > 5 LPA" without knowing exact amount

---

## PHASE 5: Complete Workflow Example

### Scenario: Apply for Loan

1. **Go to Issue Credential** → Fill details → Click "Issue Credential" → Click "Load into Wallet"

2. **In Wallet page:**
   - Your info is now loaded
   - Scroll to "🔑 Verifier Challenge"
   - Enter challenge: "loan-application-123"
   - Click "✓ Generate Proof"

3. **Download proof** (or copy)

4. **Send to bank** - They verify and only learn "income > 5 LPA" not your exact ₹7.5L

---

## Troubleshooting

### Issue: "Backend: OFFLINE"
- Make sure `npm run frontend` is running
- Check port 3000 isn't blocked

### Issue: Network Error on prove/verify
- Server might be crashed - restart with `npm run frontend`

### Issue: Favicon not showing
- Clear browser cache or use incognito mode
- Some browsers need explicit favicon.ico file

### Issue: Three.js animation slow
- This is normal on mobile - it will be smoother on desktop
- The canvas has a pixel ratio cap for performance