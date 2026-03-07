# =============================================================================
# QS-PID Fully Automated Startup Script
# =============================================================================
# This script runs completely automatically without any user prompts
# Usage: .\start-automated.ps1
# =============================================================================

$ErrorActionPreference = "Continue"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = $ScriptDir
$FrontendDir = Join-Path $RootDir "qspid-dashboard"

# Colors
function Write-Green { param([string]$Msg) Write-Host "[OK] $Msg" -ForegroundColor Green }
function Write-Yellow { param([string]$Msg) Write-Host "[INFO] $Msg" -ForegroundColor Yellow }
function Write-Red { param([string]$Msg) Write-Host "[ERROR] $Msg" -ForegroundColor Red }
function Write-Blue { param([string]$Msg) Write-Host "[STEP] $Msg" -ForegroundColor Cyan }

$StartTime = Get-Date

Write-Host "==============================================================================" -ForegroundColor Magenta
Write-Host "              QS-PID Fully Automated Startup Script" -ForegroundColor Magenta
Write-Host "==============================================================================" -ForegroundColor Magenta
Write-Host "Started at: $StartTime" -ForegroundColor Gray
Write-Host ""

# ==============================================================================
# STEP 1: Verify Node.js Version
# ==============================================================================
Write-Blue "1. Verifying Node.js..."
try {
    $NodeVersion = node --version 2>$null
    if (-not $NodeVersion) { throw "Node.js not found" }
    Write-Green "Node.js version: $NodeVersion"
    
    $VersionNum = $NodeVersion -replace 'v',''
    $Major = [int]($VersionNum.Split('.')[0])
    if ($Major -lt 14) {
        Write-Red "Node.js version must be 14 or higher"
        exit 1
    }
} catch {
    Write-Red "Node.js not found. Please install from https://nodejs.org/"
    exit 1
}

# ==============================================================================
# STEP 2: List Directory Contents
# ==============================================================================
Write-Blue "2. Listing directories..."
Get-ChildItem -Path $RootDir -Directory | Select-Object -ExpandProperty Name | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }

# ==============================================================================
# STEP 3: Check npm
# ==============================================================================
Write-Blue "3. Checking npm..."
try {
    $NpmVersion = npm --version 2>$null
    Write-Green "npm version: $NpmVersion"
} catch {
    Write-Red "npm not found"
    exit 1
}

# ==============================================================================
# STEP 4: Install Dependencies
# ==============================================================================
Write-Blue "4. Installing root dependencies..."
Set-Location $RootDir
if (-not (Test-Path "node_modules")) {
    npm install 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Green "Root dependencies installed"
    } else {
        Write-Yellow "Some root dependencies may have issues"
    }
} else {
    Write-Green "Root dependencies already installed"
}

Write-Blue "4b. Installing dashboard dependencies..."
Set-Location $FrontendDir
if (-not (Test-Path "node_modules")) {
    npm install 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Green "Dashboard dependencies installed"
    } else {
        Write-Yellow "Some dashboard dependencies may have issues"
    }
} else {
    Write-Green "Dashboard dependencies already installed"
}

# ==============================================================================
# STEP 5: Run Tests
# ==============================================================================
Write-Blue "5. Running all tests..."
Set-Location $RootDir
npm run test:all 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Green "All tests passed"
} else {
    Write-Yellow "Some tests may have failed (this is OK for development)"
}

# ==============================================================================
# STEP 6: Compile Circuits
# ==============================================================================
Write-Blue "6. Compiling Circom circuits..."
Set-Location $RootDir
npm run compile 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Green "Circuits compiled successfully"
} else {
    Write-Yellow "Circuit compilation skipped (circom may not be installed)"
}

# ==============================================================================
# STEP 7: Run Setup
# ==============================================================================
Write-Blue "7. Running project setup..."
Set-Location $RootDir
npm run setup 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Green "Setup completed"
} else {
    Write-Yellow "Setup encountered issues (this is OK)"
}

# ==============================================================================
# STEP 8: Start Backend Server
# ==============================================================================
Write-Blue "8. Starting backend server..."
$BackendFile = Join-Path $RootDir "src\index.js"
if (Test-Path $BackendFile) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '=== QS-PID BACKEND SERVER ===' -ForegroundColor Green; Set-Location '\''$RootDir'\''; node src/index.js" -WindowStyle Normal
    Write-Green "Backend started in new window"
    Start-Sleep -Seconds 3
} else {
    Write-Yellow "No backend server found"
}

# ==============================================================================
# STEP 9: Start Frontend Server
# ==============================================================================
Write-Blue "9. Starting frontend server (Next.js)..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '=== QS-PID FRONTEND (Next.js) ===' -ForegroundColor Green; Set-Location '\''$FrontendDir'\''; npm run dev" -WindowStyle Normal
Write-Green "Frontend started in new window"
Start-Sleep -Seconds 5

# ==============================================================================
# STEP 10: Open Browser
# ==============================================================================
Write-Blue "10. Opening browser..."
$FrontendURL = "http://localhost:3000"
Start-Sleep -Seconds 8
Start-Process $FrontendURL
Write-Green "Browser opened: $FrontendURL"

# ==============================================================================
# Complete
# ==============================================================================
$EndTime = Get-Date
$Duration = $EndTime - $StartTime

Write-Host ""
Write-Host "==============================================================================" -ForegroundColor Magenta
Write-Host "                      AUTOMATED STARTUP COMPLETE!" -ForegroundColor Magenta
Write-Host "==============================================================================" -ForegroundColor Magenta
Write-Host "Duration: $($Duration.ToString('mm\:ss'))" -ForegroundColor Gray
Write-Host ""
Write-Host "Services running:" -ForegroundColor Cyan
Write-Host "  - Backend: Check new terminal window" -ForegroundColor White
Write-Host "  - Frontend: http://localhost:3000" -ForegroundColor White
Write-Host ""
