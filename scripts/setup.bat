@echo off
REM Controller Setup Script for Windows
REM This script initializes the development environment for the Controller project

echo.
echo Controller Project Setup
echo ==========================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed.
    echo         Please install Node.js 18.0.0 or higher from https://nodejs.org/
    exit /b 1
)

echo [OK] Node.js detected
for /f "delims=" %%i in ('node -v') do set NODE_VERSION=%%i
echo     Version: %NODE_VERSION%
echo.

REM Install MCP server dependencies
echo Installing MCP server dependencies...
cd mcp-server
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install dependencies
    exit /b 1
)
cd ..
echo [OK] MCP server dependencies installed
echo.

REM Check for API keys
echo Checking for API keys...
set API_KEYS_CONFIGURED=1

if "%ANTHROPIC_API_KEY%"=="" (
    echo [WARNING] ANTHROPIC_API_KEY not set
    set API_KEYS_CONFIGURED=0
)

if "%OPENAI_API_KEY%"=="" (
    echo [WARNING] OPENAI_API_KEY not set
    set API_KEYS_CONFIGURED=0
)

if %API_KEYS_CONFIGURED%==0 (
    echo.
    echo [WARNING] API keys are required to run the MCP server.
    echo           Please set the following environment variables:
    echo.
    echo           set ANTHROPIC_API_KEY=sk-ant-...
    echo           set OPENAI_API_KEY=sk-...
    echo.
    echo           For persistence, add them to your System Environment Variables.
) else (
    echo [OK] API keys configured
)

echo.
echo Setup complete!
echo.
echo Next steps:
echo   1. Configure API keys ^(if not already done^)
echo   2. Run the MCP server: npm run dev
echo   3. Or serve the Web UI: npm run serve:html
echo.
echo   For detailed instructions, see:
echo   - README.md for usage information
echo   - DEVELOPMENT.md for development guide
echo.
