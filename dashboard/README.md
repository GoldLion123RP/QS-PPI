# QS-PID Dashboard Components

Enterprise-grade React/Next.js UI components for the QS-PID quantum-safe identity system.

## 🎨 Design System

- **Theme**: Dark mode (`bg-slate-900`) with deep blue panels and neon teal/green accents
- **Typography**: System fonts with monospace (`font-mono`) for cryptographic data
- **Icons**: Lucide React
- **Styling**: Tailwind CSS
- **Framework**: React/Next.js 14+ (App Router compatible)

---

## 📦 Components

### 1. `IssuerDashboard.tsx`
**Bank/Employer View**

- **Header & Navigation**: Logo, Dashboard, Issue Credential, Verifier Portal links
- **System Status Banner**: Live PQ algorithm status (ML-DSA-65) and ZKP curve (BN254)
- **Stats Cards**: 4-card grid showing:
  - Issued Credentials
  - Est. Circuit Constraints (~145K)
  - Avg. Proof Time (220ms)
  - Jaccard Similarity (< 0.05)
- **Registry Table**: Pseudonymized ledger with:
  - Holder ID (DID)
  - Annual Income (₹ INR) - marked `PRIVATE`
  - Blinding Salt - marked `PRIVATE`
  - Poseidon Commitment - marked `PUBLIC`
  - Actions (View VP button)

**Usage**:
```tsx
import { IssuerDashboard } from './components/IssuerDashboard';

export default function Page() {
  return <IssuerDashboard />;
}
```

---

### 2. `IncomeIssuanceForm.tsx`
**Credential Issuance Interface**

**Left Panel (Inputs)**:
- Full Name
- Annual Income (INR) - with LPA conversion helper (1 Lakh = 100,000)
- Employer (dropdown: HDFC Bank, ICICI Bank, TCS, Infosys, Reliance)
- Issuance Date (date picker)
- Cryptographic Toggles (disabled/checked):
  - Inject 32-byte Salt
  - Apply HybridSigner (ECDSA + ML-DSA)
  - Format as JSON-LD

**Right Panel (Preview)**:
- Live W3C VC 2.0 JSON-LD preview
- Updates dynamically with form inputs
- Shows proper INR scaling note: "1 Lakh = 100000 INR; 5 LPA = 500000"

**Usage**:
```tsx
import { IncomeIssuanceForm } from './components/IncomeIssuanceForm';

export default function IssuePage() {
  return <IncomeIssuanceForm />;
}
```

---

### 3. `HolderWalletView.tsx`
**Holder Wallet & Verifiable Presentation**

**Top Section (Split Cards)**:
- **Left**: Personal Information (Name, Employer, Income ₹7,50,000) - `PRIVATE` badge
- **Right**: Cryptographic Artifacts - `ZK-READY` badge
  - incomeHashCommit (Poseidon)
  - Session Nonce
  - ML-DSA-65 Signature
  - Download Wallet / View JSON-LD buttons

**Middle Section (ZKP Circuit Logic)**:
Visual terminal-like UI showing 3 circuit steps:
1. **Num2Bits(32)**: Boundary check (Preventing Field Overflow)
2. **Income > Threshold**: GreaterThan(32) comparison
3. **Fiat-Shamir Binding**: Challenge digest for tamper-proofing

**Bottom Section (Verifier Interaction)**:
- Verifier Challenge input (hex/UUID/random string)
- "Generate Proof for Verifier (5 LPA Threshold)" button
- Explanation: Challenge is bound in Fiat-Shamir transcript

**Usage**:
```tsx
import { HolderWalletView } from './components/HolderWalletView';

export default function WalletPage() {
  return <HolderWalletView />;
}
```

---

## ⚙️ Setup Instructions

### Prerequisites

```bash
Node.js >= 18.x
npm >= 9.x
```

### 1. Install Dependencies

```bash
npm install lucide-react
```

If using Next.js 14+ with App Router:

```bash
npx create-next-app@latest qspid-dashboard --typescript --tailwind --app
cd qspid-dashboard
npm install lucide-react
```

### 2. Configure Tailwind

Ensure `tailwind.config.ts` includes:

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./dashboard/**/*.{js,ts,jsx,tsx,mdx}", // Add this line
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
export default config;
```

### 3. Copy Components

Copy the three `.tsx` files from this folder into your Next.js project:

```bash
cp dashboard/components/*.tsx <your-nextjs-project>/components/
```

### 4. Create Pages

Example `app/page.tsx` (main dashboard):

```tsx
import { IssuerDashboard } from "@/components/IssuerDashboard";

export default function Home() {
  return <IssuerDashboard />;
}
```

Example `app/issue/page.tsx`:

```tsx
import { IncomeIssuanceForm } from "@/components/IncomeIssuanceForm";

export default function IssuePage() {
  return <IncomeIssuanceForm />;
}
```

Example `app/wallet/page.tsx`:

```tsx
import { HolderWalletView } from "@/components/HolderWalletView";

export default function WalletPage() {
  return <HolderWalletView />;
}
```

### 5. Run Development Server

```bash
npm run dev
```

Visit:
- `http://localhost:3000` - Issuer Dashboard
- `http://localhost:3000/issue` - Issuance Form
- `http://localhost:3000/wallet` - Holder Wallet

---

## 📊 INR/LPA Scaling (Corrected)

All components now use the **correct Indian Rupee scaling**:

| LPA | INR Value |
|-----|----------|
| 5   | 500,000  |
| 6   | 600,000  |
| 7.5 | 750,000  |
| 10  | 1,000,000|

**Formula**: `INR = LPA × 100,000`

Previously, the system incorrectly used "paisa" (e.g., 750000000 for 7.5 LPA). This has been fixed across:
- Web demo (`web/index.html`)
- Backend tests (`tests/testQSPID.js`)
- Dashboard components (all 3 `.tsx` files)

---

## 🔐 Security Features Displayed

### 1. Privacy Indicators
- **Red badges**: `PRIVATE` data (income, salt) never leave holder wallet
- **Green badges**: `PUBLIC` data (commitments, thresholds) shared with verifiers

### 2. Post-Quantum Readiness
- **ML-DSA-65** status banner (NIST FIPS 204)
- **Hybrid signatures** toggle (ECDSA + ML-DSA)

### 3. Zero-Knowledge Proofs
- **Circuit visualization**: Shows 3-step ZKP logic (Num2Bits, comparison, Fiat-Shamir)
- **Commitment display**: Poseidon hash in monospace font
- **Unlinkability note**: Different proofs for same income across verifiers

---

## 🎯 Demo Workflow

1. **Issuer Dashboard**: View registry, see stats (145K constraints, 220ms avg proof time)
2. **Issue Credential**: Fill form (Rahul Pal, ₹7,50,000, HDFC Bank) → Generate W3C VC 2.0
3. **Holder Wallet**: View private income + cryptographic artifacts → Generate proof for verifier
4. **Verification**: Submit proof to verifier → Verifier learns only "income > 5 LPA" (not exact amount)

---

## 🛠️ Customization

### Change Theme Colors

Edit component files to change accent colors:

```tsx
// Current: teal/emerald accents
from-teal-400 to-emerald-500
text-teal-300
bg-emerald-500/10

// Example: blue/purple accents
from-blue-400 to-purple-500
text-blue-300
bg-purple-500/10
```

### Add Real Backend Integration

Replace demo data with API calls:

```tsx
// Example: IncomeIssuanceForm.tsx
const handleSubmit = async () => {
  const response = await fetch('/api/issue-credential', {
    method: 'POST',
    body: JSON.stringify({ name, income, employer, date }),
  });
  const credential = await response.json();
  // Handle credential...
};
```

---

## 📝 Notes

- All cryptographic hashes, nonces, and signatures use `font-mono` for readability
- Layout is fully responsive (mobile-first grid layouts)
- Components are "use client" (Next.js App Router client components)
- No external state management (useState only) - easy to integrate with Zustand/Redux later

---

## 📧 Support

- **GitHub**: [GoldLion123RP/zkp_v1](https://github.com/GoldLion123RP/zkp_v1)
- **Team**: Rahul Pal (goldlion123.rp@gmail.com), Akash Dutta (akashdutta123456@gmail.com)

---

<p align="center">
  <strong>Built for Privacy-First Finance | QS-PID Dashboard © 2026</strong>
</p>
