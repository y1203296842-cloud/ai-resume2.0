@echo off
title Guohe AI - Starting...
echo.
echo ============================================
echo   Guohe AI - Starting...
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js not found!
    echo.
    echo Please install Node.js 18+ first:
    echo   https://nodejs.org/
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo [OK] Node.js: %NODE_VER%

where pnpm >nul 2>nul
if errorlevel 1 (
    echo [INFO] Installing pnpm...
    call npm install -g pnpm
    if errorlevel 1 (
        echo [ERROR] Failed to install pnpm
        echo Please run: npm install -g pnpm
        pause
        exit /b 1
    )
)
echo [OK] pnpm ready

if not exist "node_modules" (
    echo.
    echo [INFO] First run - installing dependencies...
    echo        This may take a few minutes.
    echo.
    call pnpm install
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies
        echo Try deleting pnpm-lock.yaml and run again
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed
)

echo.
echo [START] Starting server...
echo.
node scripts\easy-start.mjs

if errorlevel 1 (
    echo.
    echo [ERROR] Server failed to start
    echo Check if port 3000 is in use
    pause
)