# COMMANDS

This file is focused on the most useful commands for:
- Running the demo after unzip
- Reducing local folder size under 25 MB (for packaging)

## Run after unzip (offline demo)

```powershell
cd "<unzipped-folder>\QS-PPI"
start .\docs\index.html
```

## Check total folder size

```powershell
cd "E:\Documents\Rahul Pal\Coding\Hackathon\QS-PPI\QS-PPI"
Get-ChildItem -Recurse | Measure-Object -Property Length -Sum | Select-Object @{Name="Size(MB)";Expression={[math]::Round($_.Sum/1MB,2)}}
```

## Show top-level folder sizes (find the culprit)

```powershell
cd "E:\Documents\Rahul Pal\Coding\Hackathon\QS-PPI\QS-PPI"
Get-ChildItem -Directory | ForEach-Object {
  $s=(Get-ChildItem $_.FullName -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum/1MB
  [PSCustomObject]@{Folder=$_.Name; 'Size(MB)'=[math]::Round($s,2)}
} | Sort-Object 'Size(MB)' -Descending | Format-Table -AutoSize
```

## List files (use PowerShell, not bash)

```powershell
# Basic listing
dir

# Detailed listing
Get-ChildItem | Format-List

# Recursive listing
Get-ChildItem -Recurse
```

## Cleanup (make it small)

```powershell
cd "E:\Documents\Rahul Pal\Coding\Hackathon\QS-PPI\QS-PPI"
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force qs-ppi-dashboard\node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force dashboard\node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .next,dist,build,artifacts -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force circuits\*.ptau,circuits\*.zkey,circuits\*.r1cs,circuits\*.wasm,circuits\*.sym,circuits\*.wtns -ErrorAction SilentlyContinue
```

## Restore dependencies (when needed)

Root backend:

```powershell
cd "E:\Documents\Rahul Pal\Coding\Hackathon\QS-PPI\QS-PPI"
npm install
```

React dashboard:

```powershell
cd "E:\Documents\Rahul Pal\Coding\Hackathon\QS-PPI\QS-PPI\qs-ppi-dashboard"
npm install
```
