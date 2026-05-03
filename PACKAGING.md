# PACKAGING (Keep under 25 MB)

This project can be packaged as a lightweight ZIP (target: **< 25 MB**) that still runs the demo after unzip.

## What must NOT be in the ZIP

Delete these before zipping:

- `node_modules/`
- `qs-ppi-dashboard/node_modules/` (and `dashboard/node_modules/` if it exists)
- `.next/`, `dist/`, `build/`, `artifacts/`
- Circom/SnarkJS generated files:
  - `circuits/*.ptau`
  - `circuits/*.zkey`
  - `circuits/*.r1cs`
  - `circuits/*.wasm`
  - `circuits/*.sym`
  - `circuits/*.wtns`

These items are the main reason a folder becomes 500MB–4GB.

## Windows PowerShell cleanup (recommended)

```powershell
cd "E:\Documents\Rahul Pal\Coding\Hackathon\QS-PPI\QS-PPI"
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force qs-ppi-dashboard\node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force dashboard\node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .next,dist,build,artifacts -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force circuits\*.ptau,circuits\*.zkey,circuits\*.r1cs,circuits\*.wasm,circuits\*.sym,circuits\*.wtns -ErrorAction SilentlyContinue
```

## Verify folder size

```powershell
cd "E:\Documents\Rahul Pal\Coding\Hackathon\QS-PPI\QS-PPI"
Get-ChildItem -Recurse | Measure-Object -Property Length -Sum | Select-Object @{Name="Size(MB)";Expression={[math]::Round($_.Sum/1MB,2)}}
```

## Create the ZIP

Option A (Explorer): Right-click folder → Send to → Compressed (zipped) folder.

Option B (PowerShell):

```powershell
cd "E:\Documents\Rahul Pal\Coding\Hackathon\QS-PPI"
Compress-Archive -Path .\QS-PPI -DestinationPath .\QS-PPI_light.zip -Force
```

## After unzip

The ZIP should run instantly by opening:

`docs/index.html`

See: [AFTER_UNZIP.md](./AFTER_UNZIP.md)
