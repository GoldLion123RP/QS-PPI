# =============================================================================
# QS-PID Comprehensive Startup Script (PowerShell Version)
# =============================================================================
# This script automates the entire project startup workflow
# Usage: .\start-project.ps1 [-Auto] [-SkipTests]] [-SkipCompile [-SkipSetup]
# =============================================================================

param(
    [switch]$Auto,           # Run in automatic mode without prompts
    [switch]$SkipTests,      # Skip running tests
    [switch]$SkipCompile,    # Skip circuit compilation
    [switch]$SkipSetup       # Skip project setup
)

$ErrorActionPreference = "Continue"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = $ScriptDir
$FrontendDir = Join-Path $RootDir "qspid-dashboard"

# Colors
function Write-Green { param([string]$Msg) Write-Host "[OK] $Msg" -ForegroundColor Green }
function Write-Yellow { param([string]$Msg) Write-Host "[SKIP] $Msg" -ForegroundColor Yellow }
function Write-Red { param([string]$Msg) Write-Host "[ERROR] $Msg" -ForegroundColor Red }
function Write-Blue { param([string]$Msg) Write-Host "[INFO] $Msg" -ForegroundColor Cyan }

Write-Host "==============================================================================" -ForegroundColor Magenta
Write-Host "              QS-PID Comprehensive Startup Script (PowerShell)" -ForegroundColor Magenta
Write-Host "==============================================================================" -ForegroundColor Magenta
Write-Host ""

# ==============================================================================
# STEP 1: Verify Node.js Version
# ==============================================================================
Write-Blue "[STEP 1] Verifying Node.js installation..."
Write-Host "-----------------------------------------------------------"

try {
    $NodeVersion = node --version 2>$null
    if (-not $NodeVersion) { throw "Node.js not found" }
    Write-Green "Node.js version: $NodeVersion"
    
    # Check version is 14 or higher
    $VersionNum = $NodeVersion -replace 'v',''
    $Major = [int]($VersionNum.Split('.')[0])
    if ($Major -lt 14) {
        Write-Red "Node.js version must be 14 or higher"
        exit 1
    }
    Write-Green "Node.js version is compatible"
} catch {
    Write-Red "Node.js is not installed or not in PATH"
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    if (-not $Auto) { Read-Host "Press Enter to exit" }
    exit 1
}
Write-Host ""

# ==============================================================================
# STEP 2: List Directory Contents
# ==============================================================================
Write-Blue "[STEP 2] Listing directory contents..."
Write-Host "-----------------------------------------------------------"
Write-Host "Root directory: $RootDir"
Write-Host ""

Get-ChildItem -Path $RootDir -Directory | Select-Object -ExpandProperty Name | ForEach-Object { Write-Host "  $_" }
Write-Host ""

# ==============================================================================
# STEP 3: Check npm
# ==============================================================================
Write-Blue "[STEP 3] Checking npm installation..."
Write-Host "-----------------------------------------------------------"

try {
    $NpmVersion = npm --version 2>$null
    if (-not $NpmVersion) { throw "npm not found" }
    Write-Green "npm version: $NpmVersion"
} catch {
    Write-Red "npm is not installed"
    Write-Host "Please reinstall Node.js from https://nodejs.org/" -ForegroundColor Yellow
    if (-not $Auto) { Read-Host "Press Enter to exit" }
    exit 1
}
Write-Host ""

# ==============================================================================
# STEP 4: Install Dependencies
# ==============================================================================
Write-Blue "[STEP 4] Installing root dependencies..."
Write-Host "-----------------------------------------------------------"

Set-Location $RootDir
if (-not (Test-Path "node_modules")) {
    Write-Host "Running: npm install"
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Red "Failed to install root dependencies"
        if (-not $Auto) { Read-Host "Press Enter to exit" }
        exit 1
    }
} else {
    Write-Yellow "node_modules already exists"
}
Write-Green "Root dependencies installed"
Write-Host ""

# Install qspid-dashboard dependencies
Write-Blue "[STEP 4b] Installing qspid-dashboard dependencies..."
Write-Host "-----------------------------------------------------------"

Set-Location $FrontendDir
if (-not (Test-Path "node_modules")) {
    Write-Host "Running: npm install"
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Red "Failed to install dashboard dependencies"
        if (-not $Auto) { Read-Host "Press Enter to exit" }
        exit 1
    }
} else {
    Write-Yellow "node_modules already exists"
}
Write-Green "Dashboard dependencies installed"
Write-Host ""

# ==============================================================================
# STEP 5: Run Tests
# ==============================================================================
if (-not $SkipTests) {
    Write-Blue "[STEP 5] Running tests..."
    Write-Host "-----------------------------------------------------------"
    
    Set-Location $RootDir
    
    if ($Auto) {
        $RunTests = $true
    } else {
        $response = Read-Host "Run all tests? (Y/N)"
        $RunTests = $response -eq 'Y' -or $response -eq 'y'
    }
    
    if ($RunTests) {
        Write-Host "Running: npm run test:all"
        Write-Host "This may take several minutes..." -ForegroundColor Yellow
        npm run test:all
        if ($LASTEXITCODE -ne 0) {
            Write-Yellow "Some tests may have failed"
        } else {
            Write-Green "All tests passed"
        }
    } else {
        Write-Yellow "Tests skipped by user"
    }
    Write-Host ""
} else {
    Write-Yellow "[STEP 5] Tests skipped (--SkipTests)"
    Write-Host ""
}

# ==============================================================================
# STEP 6: Compile Circom Circuits
# ==============================================================================
if (-not $SkipCompile) {
    Write-Blue "[STEP 6] Compiling Circom circuits..."
    Write-Host "-----------------------------------------------------------"
    
    Set-Location $RootDir
    
    if ($Auto) {
        $CompileCircuits = $true
    } else {
        $response = Read-Host "Compile Circom circuits? (Y/N)"
        $CompileCircuits = $response -eq 'Y' -or $response -eq 'y'
    }
    
    if ($CompileCircuits) {
        Write-Host "Running: npm run compile"
        npm run compile
        if ($LASTEXITCODE -ne 0) {
            Write-Yellow "Circuit compilation may have failed"
            Write-Host "This is expected if circom is not installed" -ForegroundColor Yellow
        } else {
            Write-Green "Circuits compiled successfully"
        }
    } else {
        Write-Yellow "Circuit compilation skipped"
    }
    Write-Host ""
} else {
    Write-Yellow "[STEP 6] Circuit compilation skipped (--SkipCompile)"
    Write-Host ""
}

# ==============================================================================
# STEP 7: Run Setup
# ==============================================================================
if (-not $SkipSetup) {
    Write-Blue "[STEP 7] Running project setup..."
    Write-Host "-----------------------------------------------------------"
    
    Set-Location $RootDir
    
    if ($Auto) {
        $RunSetup = $true
    } else {
        $response = Read-Host "Run project setup? (Y/N)"
        $RunSetup = $response -eq 'Y' -or $response -eq 'y'
    }
    
    if ($RunSetup) {
        Write-Host "Running: npm run setup"
        npm run setup
        if ($LASTEXITCODE -ne 0) {
            Write-Yellow "Setup may have encountered issues"
        } else {
            Write-Green "Setup completed"
        }
    } else {
        Write-Yellow "Setup skipped"
    }
    Write-Host ""
} else {
    Write-Yellow "[STEP 7] Setup skipped (--SkipSetup)"
    Write-Host ""
}

# ==============================================================================
# STEP 8: Start Backend Server
# ==============================================================================
Write-Blue "[STEP 8] Starting backend server..."
Write-Host "-----------------------------------------------------------"

$BackendFile = Join-Path $RootDir "src\index.js"
if (Test-Path $BackendFile) {
    Write-Host "Starting backend server..."
    Write-Host "Backend will run in a separate PowerShell window"
    Write-Host ""
    
    # Start backend in a new window
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'QS-PID Backend Server Starting...' -ForegroundColor Green; Set-Location '\''$RootDir'\''; node src/index.js" -WindowStyle Normal
    
    Write-Green "Backend server started in new window"
    Start-Sleep -Seconds 3
} else {
    Write-Yellow "No backend server found at $BackendFile"
}
Write-Host ""

# ==============================================================================
# STEP 9: Start Frontend Server
# ==============================================================================
Write-Blue "[STEP 9] Starting frontend server (Next.js)..."
Write-Host "-----------------------------------------------------------"

Write-Host "Starting Next.js development server..."
Write-Host "Frontend will run in a separate PowerShell window"
Write-Host ""

# Start frontend in a new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'QS-PID Frontend (Next.js) Starting...' -ForegroundColor Green; Set-Location '\''$FrontendDir'\''; npm run dev" -WindowStyle Normal

Write-Green "Frontend server started in new window"
Start-Sleep -Seconds 5
Write-Host ""

# ==============================================================================
# STEP 10: Open Browser
# ==============================================================================
Write-Blue "[STEP 10] Opening frontend in browser..."
Write-Host "-----------------------------------------------------------"

$FrontendURL = "http://localhost:3000"

Write-Host "Waiting for frontend server to start..."
Start-Sleep -Seconds 8

Write-Host "Opening: $FrontendURL"
Start-Process $FrontendURL

Write-Green "Browser opened with frontend URL"
Write-Host ""

# ==============================================================================
# Summary
# ==============================================================================
Write-Host "==============================================================================" -ForegroundColor Magenta
Write-Host "                      Startup Complete!" -ForegroundColor Magenta
Write-Host "==============================================================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  - Backend server: Running in separate terminal" -ForegroundColor White
Write-Host "  - Frontend server: Running in separate terminal (Next.js on port 3000)" -ForegroundColor White
Write-Host "  - Browser: Opened with frontend URL" -ForegroundColor White
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Cyan
Write-Host "  - Stop servers: Close the terminal windows" -ForegroundColor White
Write-Host "  - View logs: Check the terminal output" -ForegroundColor White
Write-Host ""

if (-not $Auto) {
    Read-Host "Press Enter to exit"
}
