# QS-PID Web Demo Interface

**Live visualization of zero-knowledge income verification**

---

## 🚀 Quick Start

### Option 1: Open Locally

```bash
# From project root
cd web
open index.html  # macOS
# OR
start index.html  # Windows
# OR
xdg-open index.html  # Linux
```

### Option 2: Python HTTP Server

```bash
cd web
python3 -m http.server 8000
# Open http://localhost:8000 in browser
```

### Option 3: Live Server (VS Code)

1. Install "Live Server" extension
2. Right-click `index.html` → "Open with Live Server"
3. Opens at `http://127.0.0.1:5500/web/index.html`

---

## 🎨 Features

### Prover Panel (Left)
- **Input Fields**:
  - Income (in paisa, e.g., 750000000 = ₹7.5 LPA)
  - Threshold (e.g., 500000000 = ₹5 LPA)
- **Generate Proof Button**: Creates zero-knowledge proof
- **Output**: Proof JSON with commitments (income hidden)
- **Copy Button**: Copy proof to clipboard for verifier

### Verifier Panel (Right)
- **Input Fields**:
  - Proof JSON (paste from prover)
  - Verifier ID (e.g., `bank-verifier-001`)
- **Verify Proof Button**: Validates proof
- **Output**: Verification result (✓ Valid / ❌ Invalid)
- **Privacy Guarantee**: Shows only `isValid` and `threshold`, NOT exact income

---

## 📖 Usage Tutorial

### Scenario 1: Valid Income Proof

1. **Prover Side**:
   - Income: `750000000` (₹7.5 LPA)
   - Threshold: `500000000` (₹5 LPA)
   - Click **"Generate Zero-Knowledge Proof"**
   - Result: ✓ Proof generated (isValid = TRUE)

2. **Copy Proof**:
   - Click **"📋 Copy Proof JSON"** button

3. **Verifier Side**:
   - Paste proof JSON into "Proof JSON" field
   - Verifier ID: `demo-verifier-001`
   - Click **"✓ Verify Proof"**
   - Result: ✅ Proof verified (income exceeds threshold)
   - **Privacy**: Verifier sees `threshold = ₹5 LPA`, but NOT `income = ₹7.5 LPA`

### Scenario 2: Invalid Income Proof

1. **Prover Side**:
   - Income: `400000000` (₹4 LPA)
   - Threshold: `500000000` (₹5 LPA)
   - Click **"Generate Zero-Knowledge Proof"**
   - Result: ⚠️ Proof generated (isValid = FALSE)

2. **Verifier Side**:
   - Paste proof JSON
   - Click **"✓ Verify Proof"**
   - Result: ❌ Proof verification failed (income does NOT exceed threshold)

### Scenario 3: Unlinkability Demo

1. Generate 3 proofs with **same income** (e.g., ₹7 LPA):
   - Proof 1: Click generate → Copy JSON
   - Proof 2: Click generate again → Copy JSON
   - Proof 3: Click generate again → Copy JSON

2. Compare commitments:
   ```json
   Proof 1: "incomeHashCommit": "0x1a2b3c4d..."
   Proof 2: "incomeHashCommit": "0x9f8e7d6c..."
   Proof 3: "incomeHashCommit": "0x3c9b8a7f..."
   ```
   All different! → **Unlinkable across verifiers**

---

## 💡 How It Works (Simulated)

### Client-Side Demo

This web UI simulates the QS-PID system for demonstration purposes:

**Proof Generation** (JavaScript simulation):
```javascript
// Simulated Groth16 proof
const proof = {
  proof: { A: [...], B: [...], C: [...] },  // Random elliptic curve points
  commitments: {
    incomeHashCommit: Hash(income || blindingFactor || nonce),
    blindingFactor: randomHex(64),
    nonce: randomHex(64)
  },
  publicSignals: [isValid, threshold, incomeHashCommit],
  isValid: income > threshold  // Circuit constraint
};
```

**Verification** (JavaScript simulation):
```javascript
function verifyProof(proof, verifierId) {
  const [isValid, threshold, commitment] = proof.publicSignals;
  
  // Simulated Groth16 verification
  if (isValid === 1) {
    return { valid: true, reason: 'Income exceeds threshold' };
  } else {
    return { valid: false, reason: 'Income does not exceed threshold' };
  }
}
```

**Note**: For **real zero-knowledge proofs**, the backend Node.js system (`src/prover.js`, `src/verifier.js`) uses actual Groth16 SNARKs with circom circuits.

---

## 🛠️ Backend Integration (Optional)

To connect this UI to the **real QS-PID backend**:

### Step 1: Create API Server

Create `web/api/server.js`:

```javascript
const express = require('express');
const { IncomeProofGenerator } = require('../../src/prover');
const { IncomeProofVerifier } = require('../../src/verifier');

const app = express();
app.use(express.json());
app.use(express.static('../'));

app.post('/api/generate-proof', async (req, res) => {
  const { income, threshold } = req.body;
  
  try {
    const prover = new IncomeProofGenerator();
    const proof = await prover.generateIncomeProof(income, threshold);
    res.json({ success: true, proof });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post('/api/verify-proof', async (req, res) => {
  const { proof, verifierId } = req.body;
  
  try {
    const verifier = new IncomeProofVerifier();
    const result = await verifier.verifyIncomeProof(proof, verifierId);
    res.json({ success: true, result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.listen(3000, () => {
  console.log('QS-PID API server running on http://localhost:3000');
});
```

### Step 2: Update Frontend (index.html)

Replace simulated functions with API calls:

```javascript
async function generateProof() {
  const income = parseInt(document.getElementById('income').value);
  const threshold = parseInt(document.getElementById('threshold').value);
  
  const response = await fetch('/api/generate-proof', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ income, threshold })
  });
  
  const data = await response.json();
  // Display real proof with Groth16 SNARKs
}
```

### Step 3: Run Backend

```bash
cd web/api
node server.js
# API available at http://localhost:3000
```

---

## 🎨 Customization

### Change Color Scheme

Edit CSS in `index.html`:

```css
/* Current: Purple gradient */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* Alternative: Blue gradient */
background: linear-gradient(135deg, #667eea 0%, #2575fc 100%);

/* Alternative: Green gradient */
background: linear-gradient(135deg, #56ab2f 0%, #a8e063 100%);
```

### Add Logo

Replace `🔐 QS-PID` with:

```html
<img src="logo.png" alt="QS-PID Logo" style="height: 60px; margin-bottom: 10px;">
<h1>QS-PID</h1>
```

### Change Currency

Replace `₹` (Rupee) with:

```javascript
// USD
function formatIncome(paisa) {
  const dollars = paisa / 100;
  return `$${dollars.toLocaleString('en-US')}`;
}

// EUR
function formatIncome(paisa) {
  const euros = paisa / 100;
  return `€${euros.toLocaleString('de-DE')}`;
}
```

---

## 📸 Screenshots (for Demo Video)

### 1. Prover Panel
- Show income input: `750000000`
- Show threshold input: `500000000`
- Click "Generate Proof" → Success message
- Highlight: "Commitment: 0x1a2b3c..."
- Caption: "Income hidden with random blinding"

### 2. Verifier Panel
- Paste proof JSON
- Click "Verify Proof" → ✅ Valid
- Highlight: "isValid: TRUE, Threshold: ₹5 LPA"
- Caption: "Verifier learns NOTHING about exact income"

### 3. Unlinkability
- Generate 3 proofs side-by-side
- Show 3 different commitments
- Caption: "Same income, different proofs → Unlinkable"

---

## 🚀 Deployment

### GitHub Pages (Free Hosting)

1. Enable GitHub Pages:
   - Repo settings → Pages → Source: `main` branch, `/web` folder

2. Access at:
   ```
   https://GoldLion123RP.github.io/zkp_v1/
   ```

### Vercel (Recommended)

```bash
cd web
npx vercel --prod
# Deploys to: https://zkp-v1.vercel.app
```

### Netlify

```bash
cd web
npx netlify deploy --prod --dir=.
```

---

## 📚 Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| **Chrome** | 90+ | ✅ Fully supported |
| **Firefox** | 88+ | ✅ Fully supported |
| **Safari** | 14+ | ✅ Fully supported |
| **Edge** | 90+ | ✅ Fully supported |
| **Mobile** | iOS 14+, Android 10+ | ✅ Responsive design |

---

## ✨ Future Enhancements

### Planned Features

- [ ] **Real-time Collaboration**: Share proof link (WebRTC)
- [ ] **QR Code Sharing**: Generate QR for mobile scanning
- [ ] **Dark Mode Toggle**: Switch between light/dark themes
- [ ] **Multi-Language Support**: i18n for global users
- [ ] **Proof History**: Save generated proofs locally (IndexedDB)
- [ ] **Credential Wallet**: Store W3C VCs in browser wallet
- [ ] **Revocation Check**: Query StatusList2021 on-chain
- [ ] **Performance Metrics**: Show proof generation time graph

---

## 🐛 Troubleshooting

### Issue: Proof not copying to clipboard

**Solution**: Use HTTPS (not HTTP) for clipboard API:
```bash
python3 -m http.server 8000 --bind 127.0.0.1
# Use https://localhost:8000 (with self-signed cert)
```

### Issue: Styles not loading

**Solution**: Clear browser cache (Ctrl+Shift+R / Cmd+Shift+R)

### Issue: Mobile layout broken

**Solution**: Enable responsive design (already implemented, ensure viewport meta tag present)

---

## 💬 Feedback

For issues or feature requests, open a GitHub issue:
[zkp_v1/issues](https://github.com/GoldLion123RP/zkp_v1/issues)

---

## 📄 License

MIT License - see [LICENSE](../LICENSE) file

---

**Built with 🔐 for privacy-first finance**
