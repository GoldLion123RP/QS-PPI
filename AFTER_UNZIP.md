# Run After Unzip (Windows)

This repo is designed so the **demo works immediately after you unzip**, without installing anything.

## Option A: Instant demo (no install)

1. Unzip the project.
2. Open this file:

`docs/index.html`

That’s it — the 3-screen dashboard (Dashboard / Issue Credential / Wallet) runs fully offline.

### One-click (PowerShell)

```powershell
cd "<unzipped-folder>\zkp_v1"
start .\docs\index.html
```

## Option B: Run the backend (optional)

If you want the Node server (API endpoints), you must install dependencies because the lightweight zip should **not** include `node_modules/`.

```powershell
cd "<unzipped-folder>\zkp_v1"
npm install
node .\src\server.js
# open http://localhost:3001
```

## Option C: Run the React dashboard (optional)

The React/Next dashboard is optional and also needs dependencies:

```powershell
cd "<unzipped-folder>\zkp_v1\qspid-dashboard"
npm install
npm run dev
# open http://localhost:3000
```

## If the folder is huge (fix size)

If your unzipped folder is hundreds of MB/GB, delete the usual offenders:

```powershell
cd "<unzipped-folder>\zkp_v1"
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force qspid-dashboard\node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force dashboard\node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .next,dist,build,artifacts -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force circuits\*.ptau,circuits\*.zkey,circuits\*.r1cs,circuits\*.wasm,circuits\*.sym,circuits\*.wtns -ErrorAction SilentlyContinue
```

## Verify size (PowerShell)

```powershell
cd "<unzipped-folder>\zkp_v1"
Get-ChildItem -Recurse | Measure-Object -Property Length -Sum | Select-Object @{Name="Size(MB)";Expression={[math]::Round($_.Sum/1MB,2)}}
```
