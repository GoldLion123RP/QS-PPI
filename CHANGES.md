# CHANGES.md — QS-PID Fix Log

All changes made to bring the repository to a fully runnable state on Windows 11 (Node.js v24.14.0, Circom 2.2.3).

---

## v1.0.2 — 2026-03-01 (Runtime Error Fixes)

### Bug 1 — `npm run compile` failed: circomlib not found
**Error:** `The file ../node_modules/circomlib/circuits/comparators.circom has not been found`
**Root Cause:** `circomlib` was accidentally removed from `package.json` in v1.0.1.
**Fix in `package.json`:**
- Re-added `"circomlib": "^2.0.5"` to dependencies (this is the npm package containing `.circom` template files)
- Added `-l node_modules` flag to the `compile` script so Circom knows where to find includes

### Bug 2 — `Cannot redefine property: FiatShamirBinding`
**Error:** `TypeError: Cannot redefine property: FiatShamirBinding` in `src/verifier.js` (Node.js v22+ strict)
**Root Cause:** `Object.defineProperty` was called twice on the same object — once on `IncomeVerifier` class, then again on `module.exports` (which IS `IncomeVerifier` after `module.exports = IncomeVerifier`). Node.js v22+ rejects redefining a non-configurable property.
**Fix in `src/verifier.js`:** Removed duplicate; now only one `Object.defineProperty` exists, with `configurable: true`.

### Bug 3 — `Cannot convert a BigInt value to a number` in prover
**Error:** Thrown by `circomlibjs` Poseidon hasher during `generateCommitments()`
**Root Cause:** `crypto.randomBytes(32)` generates a 256-bit value which can exceed the BN254 field prime (254-bit). Passing an out-of-range BigInt to Poseidon causes this error internally.
**Fix in `src/prover.js`:**
```js
const BN254_PRIME = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
const salt  = BigInt('0x' + crypto.randomBytes(32).toString('hex')) % BN254_PRIME;
const nonce = BigInt('0x' + crypto.randomBytes(32).toString('hex')) % BN254_PRIME;
```

### Bug 4 — Circuit signal name mismatch (`blindingFactor` vs `salt`)
**Error:** Silent wrong witness / proof failure
**Root Cause:** The Circom circuit declares `signal input salt` but the JS witness object passed `{ blindingFactor: ... }` — SnarkJS silently ignores unknown keys and treats missing signals as 0.
**Fix in `src/prover.js`:** Renamed `blindingFactor` → `salt` throughout `generateCommitments()` and `generateWitness()` to match the circuit signal name exactly.

### Bug 5 — Wrong vkey filename in verifier
**Error:** `Verification key not found: artifacts/incomeProof_vkey.json`
**Root Cause:** `src/verifier.js` looked for `incomeProof_vkey.json` but `scripts/setup.js` saves it as `verification_key.json`.
**Fix in `src/verifier.js`:** Changed path to `path.join(ARTIFACTS_DIR, 'verification_key.json')`.

### Bug 6 — Wrong `verifyProof()` call signature in `scripts/verify.js`
**Error:** Proof verification silently fails or crashes
**Root Cause:** `scripts/verify.js` was calling `verifyProof(proof, publicSignals, fiatShamirBinding)` but the method signature is `verifyProof(fullProofData, verifierId)`.
**Fix in `scripts/verify.js`:** Updated call to `verifier.verifyProof(proofData, proofData.verifierId || 'demo-verifier-001')`.

### Bug 7 — `[DEP0169] url.parse()` deprecation warning
**Error:** Deprecation warning on every request in `frontend/server.js`
**Fix in `frontend/server.js`:** Replaced `require('url')` + `url.parse()` with the WHATWG URL API:
```js
const reqUrl   = new URL(req.url, `http://localhost:${PORT}`);
const pathname = reqUrl.pathname;
```

---

## v1.0.1 — 2026-03-01 (Initial Fix Batch)

### Added
- `scripts/setup.js` — Trusted setup (downloads ptau, runs phase-2, exports vkey)
- `scripts/prove.js` — Proof generation script
- `scripts/verify.js` — Proof verification script
- `tests/testSecurityAudit.js` — 15 security tests
- `frontend/` — Full dark-theme UI (HTML + CSS + JS + Node HTTP server)
- `.gitignore` — Ignores node_modules, artifacts binaries, keys, logs, .env
- `artifacts/.gitkeep` — Ensures artifacts/ directory exists in repo

### Fixed
- `package.json` — Removed invalid `crypto` npm dep, added `circomlibjs`, `ffjavascript`
- `package.json compile` script — Added `-o artifacts/` output flag

---

## How to Run Locally (Windows 11 — Full Flow)

```powershell
# 1. Pull latest fixes
git pull

# 2. Install dependencies (includes circomlib now)
npm install

# 3. Compile the circuit
npm run compile

# 4. Trusted setup (downloads ~200 MB ptau file — first time only)
npm run setup

# 5. Generate a proof
npm run prove

# 6. Verify the proof
npm run verify

# 7. Run all tests
npm run test:all

# 8. Launch frontend UI → open http://localhost:3000
npm run frontend
```

---

## GitHub Pages Deployment

The `frontend/` folder is pure static HTML/CSS/JS:
1. Go to repo → **Settings → Pages**
2. Source: `main` branch, `/frontend` folder
3. Live at: `https://GoldLion123RP.github.io/zkp_v1/`

> ⚠️ GitHub Pages is static-only. The `/api/*` routes need a running Node.js server.
> For full functionality: run `npm run frontend` locally, or deploy to Railway/Render.

---

## Team Collaboration (Private Repo)

1. Go to **GitHub → repo → Settings → Collaborators**
2. Click **Add people** → enter GitHub username or email
3. Role: **Write** (can push) or **Read** (pull only)
4. They accept the email invite
5. They clone: `git clone https://github.com/GoldLion123RP/zkp_v1.git`
6. Standard workflow: each person works on their own branch → Pull Request → merge to `main`
