# QUICKSTART

## 1) Run demo after unzip (no install)

Open:

`docs/index.html`

Or PowerShell:

```powershell
cd "<unzipped-folder>\QS-PID"
start .\docs\index.html
```

---

## 2) Backend (optional)

```powershell
cd "<unzipped-folder>\QS-PID"
npm install
node .\src\server.js
```

---

## 3) React dashboard (optional)

```powershell
cd "<unzipped-folder>\QS-PID\qspid-dashboard"
npm install
npm run dev
```

---

## Common problems

- If the folder is massive, delete `node_modules/`, `.next/`, `dist/`, `build/`, and Circom/SnarkJS generated artifacts (`*.ptau`, `*.zkey`, `*.r1cs`, `*.wasm`).
- If you only need the demo for judges, `docs/index.html` is enough.
