# CHANGES.md — QS-PID v1.0 Fix Log

All changes made to bring the repository to a fully runnable state on Windows 11 (Node.js v24, Circom 2.2.3).

---

## Date: 2026-03-01

### 🔴 Critical Fixes

#### 1. Created `scripts/` folder (was completely missing)
- **`scripts/setup.js`** — Trusted setup script. Downloads Powers of Tau (hermez BN254-14), runs phase-2 setup, contributes randomness, exports `verification_key.json`. Run: `npm run setup`.
- **`scripts/prove.js`** — Proof generation script. Reads env vars `INCOME`, `THRESHOLD`, `VERIFIER`. Calls `src/prover.js` and saves output to `artifacts/proof.json`. Run: `npm run prove`.
- **`scripts/verify.js`** — Proof verification script. Reads `artifacts/proof.json` + `artifacts/verification_key.json`. Run: `npm run verify`.

#### 2. Created missing `tests/testSecurityAudit.js`
- Referenced in `package.json` `test:security` and `test:all` scripts but did not exist.
- Now contains 15 security tests covering:
  - Fiat-Shamir binding completeness
  - Missing public value detection
  - Challenge tampering detection
  - ML-DSA key generation strength & uniqueness
  - Replay attack prevention via verifierId
  - Binary enforcement for `isValid`
  - Binding report validation

#### 3. Fixed `package.json`
- **Removed** `crypto` from dependencies — it's a built-in Node.js module; listing it as an npm dep causes install warnings/errors on Node.js v22+.
- **Removed** `circomlib` (replaced with correct `circomlibjs` which is the actual npm package for Poseidon etc.).
- **Removed** `circom` from devDependencies — Circom v2 is a Rust binary installed separately, NOT an npm package.
- **Added** `ffjavascript` as a direct dependency (required by snarkjs internally).
- **Added** `npm run frontend` script to launch the local UI server.
- **Fixed** `compile` script: added `-o artifacts/` flag so compiled files go to the artifacts directory.
- Updated `author` field.

#### 4. Created `artifacts/` folder with `.gitkeep`
- `npm run compile` output target directory now exists in the repo.
- `.gitignore` ensures large binary artifacts (`.zkey`, `.ptau`, `.wasm`, `.r1cs`) are not committed.

### 🟡 Improvements

#### 5. Added `.gitignore`
- Ignores: `node_modules/`, `artifacts/` binaries (`*.zkey`, `*.ptau`, `*.wasm`, `*.r1cs`), `*.key`, `logs/`, `.env`, editor files (`.vscode/`, `.idea/`).

#### 6. Added `frontend/` — Full UI
- **`frontend/index.html`** — Single-page app with 4 sections: Generate Proof, Verify Proof, PQ Key Demo, System Status.
- **`frontend/style.css`** — Dark theme UI (purple/green accent, cards, animated loader).
- **`frontend/app.js`** — Pure vanilla JS frontend that calls the local backend API.
- **`frontend/server.js`** — Zero-dependency Node.js HTTP server (no Express needed). Serves static files + API routes (`/api/prove`, `/api/verify`, `/api/pq`, `/api/status`). Runs in **demo mode** (mock data) if artifacts aren't compiled yet, and **real mode** once setup is complete.

---

## How to Run Locally (Windows 11)

```powershell
# 1. Clone & install
git clone https://github.com/GoldLion123RP/zkp_v1.git
cd zkp_v1
npm install

# 2. Compile the Circom circuit
npm run compile

# 3. Trusted setup (downloads ~200MB ptau file first time)
npm run setup

# 4. Generate a proof
npm run prove

# 5. Verify the proof
npm run verify

# 6. Run all tests
npm run test:all

# 7. Launch the frontend UI
npm run frontend
# → Open http://localhost:3000
```

---

## GitHub Pages Deployment

The `frontend/` folder is pure static HTML/CSS/JS and can be published to GitHub Pages:
1. Go to repo **Settings → Pages**
2. Set source to `main` branch, `/frontend` folder
3. Your UI will be live at `https://GoldLion123RP.github.io/zkp_v1/`

> ⚠️ GitHub Pages is static only — the `/api/*` calls will not work there. For full functionality, keep running `npm run frontend` locally or deploy `frontend/server.js` to a Node.js host (Railway, Render, etc.).

---

## Team Collaboration

To give teammates access to this private repository:
1. Go to **GitHub → repo → Settings → Collaborators**
2. Click **Add people** → enter their GitHub username or email
3. Set role: **Write** (can push) or **Read** (can pull only)
4. They accept the invite from their email / GitHub notifications
5. They clone: `git clone https://github.com/GoldLion123RP/zkp_v1.git`
