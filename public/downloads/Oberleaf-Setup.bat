@echo off
setlocal
title Oberleaf - Scholarly TeX Studio Setup
echo ==========================================================
echo       Oberleaf - Scholarly TeX Studio Setup
echo    Fast, Local-First LaTeX Without Cloud Timeouts
echo ==========================================================
echo.
echo Launching automated setup for SRM AP...
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $u1='https://friendlylearning.in/downloads/install.ps1'; $u2='https://raw.githubusercontent.com/sahgyan9/Oberleaf/main/scripts/install.ps1'; try { $wc = New-Object Net.WebClient; $script = $wc.DownloadString($u1) } catch { $script = (New-Object Net.WebClient).DownloadString($u2) }; Invoke-Expression $script"

if %ERRORLEVEL% neq 0 (
    echo.
    echo [!] Setup encountered a notice or error.
    echo Press any key to exit...
    pause >nul
)
