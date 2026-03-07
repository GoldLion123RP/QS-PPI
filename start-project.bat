@echo off
setlocal enabledelayedexpansion

:: =============================================================================
:: QS-PID Comprehensive Startup Script
:: =============================================================================
:: This script automates the entire project startup workflow:
:: 1. Verify system environment (Node.js version)
:: 2. List directory contents
:: 3. Check and install npm if needed
:: 4. Install dependencies
:: 5. Run tests (optional)
:: 6. Compile Circom circuits
:: 7. Run setup
:: 8. Start backend server
:: 9. Start frontend server
:: 10. Open browser
:: =============================================================================

set SCRIPT_DIR=%~dp0
set ROOT_DIR=%SCRIPT_DIR%
set FRONTEND_DIR=%ROOT_DIR%qspid-dashboard
set LOG_FILE=%ROOT_DIR%\startup.log

:: Color codes for output
set GREEN=[92m
set YELLOW=[93m
set RED=[91m
set BLUE=[94m
set RESET=[0m

echo ==============================================================================
echo                QS-PID Comprehensive Startup Script
echo ==============================================================================
echo.

:: ==============================================================================
:: STEP 1: Verify Node.js Version
:: ==============================================================================
echo %GREEN%[STEP 1]%RESET% Verifying Node.js installation...
echo -----------------------------------------------------------

node --version >nul 2>&1
if errorlevel 1 (
    echo %RED%[ERROR]%RESET% Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

for /f "delims=" %%i in ('node --version') do set NODE_VERSION=%%i
echo %GREEN%[OK]%RESET% Node.js version: %NODE_VERSION%

:: Check Node.js version is 14 or higher
for /f "tokens=1 delims=v." %%a in ("%NODE_VERSION%") do (
    set VERSION=%%a
)
set MAJOR=%VERSION%
if %MAJOR% LSS 14 (
    echo %RED%[ERROR]%RESET% Node.js version must be 14 or higher
    pause
    exit /b 1
)
echo %GREEN%[OK]%RESET% Node.js version is compatible
echo.

:: ==============================================================================
:: STEP 2: List Directory Contents
:: ==============================================================================
echo %GREEN%[STEP 2]%RESET% Listing directory contents...
echo -----------------------------------------------------------
echo Root directory: %ROOT_DIR%
echo.

dir /b "%ROOT_DIR%"
echo.

:: ==============================================================================
:: STEP 3: Check and Install npm
:: ==============================================================================
echo %GREEN%[STEP 3]%RESET% Checking npm installation...
echo -----------------------------------------------------------

npm --version >nul 2>&1
if errorlevel 1 (
    echo %YELLOW%[WARNING]%RESET% npm is not installed
    echo Installing npm via Node.js...
    
    :: Reinstall Node.js to get npm
    echo Please reinstall Node.js from https://nodejs.org/ to get npm
    pause
    exit /b 1
)

for /f "delims=" %%i in ('npm --version') do set NPM_VERSION=%%i
echo %GREEN%[OK]%RESET% npm version: %NPM_VERSION%
echo.

:: ==============================================================================
:: STEP 4: Install Dependencies
:: ==============================================================================
echo %GREEN%[STEP 4]%RESET% Installing root dependencies...
echo -----------------------------------------------------------

cd /d "%ROOT_DIR%"
if not exist node_modules (
    echo Running: npm install
    call npm install
    if errorlevel 1 (
        echo %RED%[ERROR]%RESET% Failed to install root dependencies
        pause
        exit /b 1
    )
) else (
    echo %YELLOW%[SKIP]%RESET% node_modules already exists
)
echo %GREEN%[OK]%RESET% Root dependencies installed
echo.

:: Install qspid-dashboard dependencies
echo %GREEN%[STEP 4b]%RESET% Installing qspid-dashboard dependencies...
echo -----------------------------------------------------------

cd /d "%FRONTEND_DIR%"
if not exist node_modules (
    echo Running: npm install
    call npm install
    if errorlevel 1 (
        echo %RED%[ERROR]%RESET% Failed to install dashboard dependencies
        pause
        exit /b 1
    )
) else (
    echo %YELLOW%[SKIP]%RESET% node_modules already exists
)
echo %GREEN%[OK]%RESET% Dashboard dependencies installed
echo.

:: ==============================================================================
:: STEP 5: Run Tests (Optional)
:: ==============================================================================
echo %GREEN%[STEP 5]%RESET% Running tests...
echo -----------------------------------------------------------

cd /d "%ROOT_DIR%"
set RUN_TESTS=n

echo Do you want to run all tests? (Y/N)
set /p RUN_TESTS=

if /i "%RUN_TESTS%"=="Y" (
    echo Running: npm run test:all
    echo This may take several minutes...
    call npm run test:all
    if errorlevel 1 (
        echo %YELLOW%[WARNING]%RESET% Some tests may have failed
    ) else (
        echo %GREEN%[OK]%RESET% All tests passed
    )
) else (
    echo %YELLOW%[SKIP]%RESET% Tests skipped by user
)
echo.

:: ==============================================================================
:: STEP 6: Compile Circom Circuits
:: ==============================================================================
echo %GREEN%[STEP 6]%RESET% Compiling Circom circuits...
echo -----------------------------------------------------------

cd /d "%ROOT_DIR%"
set COMPILE_CIRCUITS=y

echo Do you want to compile the Circom circuits? (Y/N)
set /p COMPILE_CIRCUITS=

if /i "%COMPILE_CIRCUITS%"=="Y" (
    echo Running: npm run compile
    call npm run compile
    if errorlevel 1 (
        echo %YELLOW%[WARNING]%RESET% Circuit compilation may have failed
        echo This is expected if circom is not installed
    ) else (
        echo %GREEN%[OK]%RESET% Circuits compiled successfully
    )
) else (
    echo %YELLOW%[SKIP]%RESET% Circuit compilation skipped
)
echo.

:: ==============================================================================
:: STEP 7: Run Setup
:: ==============================================================================
echo %GREEN%[STEP 7]%RESET% Running project setup...
echo -----------------------------------------------------------

cd /d "%ROOT_DIR%"
set RUN_SETUP=y

echo Do you want to run the project setup? (Y/N)
set /p RUN_SETUP=

if /i "%RUN_SETUP%"=="Y" (
    echo Running: npm run setup
    call npm run setup
    if errorlevel 1 (
        echo %YELLOW%[WARNING]%RESET% Setup may have encountered issues
    ) else (
        echo %GREEN%[OK]%RESET% Setup completed
    )
) else (
    echo %YELLOW%[SKIP]%RESET% Setup skipped
)
echo.

:: ==============================================================================
:: STEP 8: Start Backend Server
:: ==============================================================================
echo %GREEN%[STEP 8]%RESET% Starting backend server...
echo -----------------------------------------------------------

cd /d "%ROOT_DIR%"

:: Check if there's a backend server to start
if exist "src\index.js" (
    echo Starting backend server...
    echo The backend will run on a separate terminal
    echo.
    
    :: Start backend in a new command window
    start "QS-PID Backend Server" cmd /k "cd /d ""%ROOT_DIR%"" && echo Starting Backend Server... && node src/index.js"
    
    echo %GREEN%[OK]%RESET% Backend server started in new terminal
    timeout /t 3 /nobreak >nul
) else (
    echo %YELLOW%[SKIP]%RESET% No backend server found
)
echo.

:: ==============================================================================
:: STEP 9: Start Frontend Server (Next.js Dashboard)
:: ==============================================================================
echo %GREEN%[STEP 9]%RESET% Starting frontend server...
echo -----------------------------------------------------------

cd /d "%FRONTEND_DIR%"

echo Starting Next.js development server...
echo The frontend will run on a separate terminal
echo.

:: Start frontend in a new command window
start "QS-PID Frontend (Next.js)" cmd /k "cd /d ""%FRONTEND_DIR%"" && echo Starting Frontend Server... && npm run dev"

echo %GREEN%[OK]%RESET% Frontend server started in new terminal
timeout /t 5 /nobreak >nul
echo.

:: ==============================================================================
:: STEP 10: Open Browser
:: ==============================================================================
echo %GREEN%[STEP 10]%RESET% Opening frontend in browser...
echo -----------------------------------------------------------

set FRONTEND_URL=http://localhost:3000

echo Waiting for frontend server to start...
timeout /t 8 /nobreak >nul

echo Opening: %FRONTEND_URL%
start "" "%FRONTEND_URL%"

echo %GREEN%[OK]%RESET% Browser opened with frontend URL
echo.

:: ==============================================================================
:: Summary
:: ==============================================================================
echo ==============================================================================
echo                      Startup Complete!
echo ==============================================================================
echo.
echo Summary:
echo   - Backend server: Running in separate terminal
echo   - Frontend server: Running in separate terminal (Next.js on port 3000)
echo   - Browser: Opened with frontend URL
echo.
echo Useful commands:
echo   - Stop servers: Close the terminal windows
echo   - View logs: Check the terminal output
echo.
echo ==============================================================================

pause
