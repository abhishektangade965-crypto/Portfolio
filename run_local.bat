@echo off
title Abhishek Tangade Portfolio Local Server
echo ===================================================
echo   Abhishek Tangade Portfolio - Local Server Starter
echo ===================================================
echo.

:: Check for Node.js
where node >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [FOUND] Node.js detected.
    echo Starting local server using server.js...
    echo Press Ctrl+C in this window to stop the server.
    echo.
    start http://localhost:5501
    node server.js
    goto end
)

:: Check for Python fallback
where python >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [FOUND] Python detected.
    echo Starting Python HTTP server on port 5501...
    echo Press Ctrl+C in this window to stop the server.
    echo.
    start http://localhost:5501
    python -m http.server 5501
    goto end
)

:: Fallback: Open index.html directly
echo [INFO] Node.js and Python were not detected in your system PATH.
echo Opening index.html directly in your default browser...
echo.
start index.html

:end
pause
