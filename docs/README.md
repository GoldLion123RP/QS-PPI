# QS-PID GitHub Pages Dashboard

## 🎉 Live Demo

Once you enable GitHub Pages, your dashboard will be live at:

**https://goldlion123rp.github.io/zkp_v1/**

---

## ⚙️ Enable GitHub Pages (1 minute)

1. Go to your repo: [https://github.com/GoldLion123RP/zkp_v1](https://github.com/GoldLion123RP/zkp_v1)
2. Click **Settings** (top right)
3. Scroll to **Pages** (left sidebar)
4. Under "Source", select:
   - **Branch**: `main`
   - **Folder**: `/docs`
5. Click **Save**
6. Wait 1-2 minutes
7. Visit: **https://goldlion123rp.github.io/zkp_v1/**

---

## 💻 Local Testing

You don't need a server—just open the file directly:

### Windows:
```powershell
cd "E:\\Documents\\Rahul Pal\\Coding\\Hackathon\\zkp_v1\\zkp_v1\\docs"
start index.html
```

### Mac/Linux:
```bash
cd ~/path/to/zkp_v1/docs
open index.html  # Mac
xdg-open index.html  # Linux
```

Or drag `docs/index.html` into your browser.

---

## ✨ Features

### 📊 Issuer Dashboard
- Live stats: Issued Credentials, Circuit Constraints, Avg. Proof Time, Jaccard Similarity
- PQ Status Banner: "NIST FIPS 204: ML-DSA-65 ACTIVE"
- Registry Table: Shows PRIVATE/PUBLIC columns with Poseidon commitments

### 📝 Issue Credential
- Form: Name, Income (INR), Employer, Date
- Live W3C VC 2.0 JSON-LD preview (updates as you type)
- Cryptographic toggles: 32-byte Salt, HybridSigner (ECDSA+ML-DSA), JSON-LD format
- Button: "Issue Quantum-Safe Credential & Generate Wallet"

### 🔐 Holder Wallet
- Split cards: Personal Info (PRIVATE) vs Cryptographic Artifacts (ZK-READY)
- ZKP Circuit Visualization: 3 steps (Num2Bits, Income>Threshold, Fiat-Shamir)
- Verifier Challenge: Input + "Generate Proof for Verifier (5 LPA Threshold)" button

### 🎨 Theme Switcher
- **Dark** (default): Slate-900 background with teal/emerald accents
- **Light**: White background with blue accents
- **Auto**: Respects system preference
- Theme saved in localStorage

---

## 👏 Hackathon-Ready Features

✅ **Single file** — No npm, no build, no dependencies  
✅ **Responsive** — Works on mobile and desktop  
✅ **Professional** — Dark theme with proper typography  
✅ **Educational** — Shows ZKP circuit steps visually  
✅ **Privacy-focused** — RED "PRIVATE" and GREEN "PUBLIC" badges  
✅ **Live interactions** — VC preview updates as you type  
✅ **INR/LPA correct** — ₹750,000 = 7.5 LPA (no more "paisa" confusion)  
✅ **Monospace crypto** — Hashes/nonces in `font-mono`  
✅ **Winner aesthetic** — Matches enterprise-grade crypto platforms  

---

## 🔗 Share This Link

After enabling Pages, share:

**https://goldlion123rp.github.io/zkp_v1/**

With judges, teammates, or on social media!

---

## 🛠️ Tech Stack

- Pure HTML5
- CSS3 (CSS Variables for theming)
- Vanilla JavaScript
- **Zero external dependencies**

---

## 👍 Tips

- The dashboard is a **demo UI**. For full ZKP functionality, run the Node.js backend (see main README).
- All proof generation/verification shown here is **simulated client-side** for demo purposes.
- For production, integrate with your backend API at `http://localhost:3001`.

---

**Built by**: Rahul Pal  
**For**: Privacy-First Finance Hackathon 2026  
**License**: MIT  
