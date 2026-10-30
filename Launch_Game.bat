@echo off
title Beyond Barriers - Inclusive VR Sports
cd /d "%~dp0"

echo ==========================================================
echo   BEYOND BARRIERS - INCLUSIVE VR SPORTS
echo   Starting local server and launching browser...
echo ==========================================================

start powershell -ExecutionPolicy Bypass -File "%~dp0server.ps1"
timeout /t 2 /nobreak >nul

start http://localhost:8080/

echo Server is running at http://localhost:8080/
echo Enjoy playing Beyond Barriers!
pause
