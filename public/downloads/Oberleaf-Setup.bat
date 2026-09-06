@echo off
setlocal EnableDelayedExpansion
title Oberleaf - Scholarly TeX Studio Setup
echo ==========================================================
echo       Oberleaf - Scholarly TeX Studio Setup
echo    Fast, Local-First LaTeX Without Cloud Timeouts
echo ==========================================================
echo.
echo Launching automated setup for SRM AP...
echo.

:: Try primary URL first, fall back to GitHub raw
set "TMPSCRIPT=%TEMP%\oberleaf_install_%RANDOM%.ps1"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $u1='https://friendlylearning.in/downloads/install.ps1'; $u2='https://raw.githubusercontent.com/sahgyan9/Oberleaf/main/scripts/install.ps1'; $wc = New-Object Net.WebClient; try { $wc.DownloadFile($u1, '!TMPSCRIPT!') } catch { $wc.DownloadFile($u2, '!TMPSCRIPT!') }"

if exist "!TMPSCRIPT!" (
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "!TMPSCRIPT!"
    del /f /q "!TMPSCRIPT!" 2>nul
) else (
    echo [!] Failed to download Oberleaf installer. Check your internet connection.
    echo     Try manually visiting: https://github.com/sahgyan9/Oberleaf
)

if %ERRORLEVEL% neq 0 (
    echo.
    echo [!] Setup encountered a notice or error.
    echo Press any key to exit...
    pause >nul
)
