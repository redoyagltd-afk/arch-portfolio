@echo off
title ARK STUDIO — Local Management Studio
echo ========================================================
echo   Starting ARK STUDIO Management Dashboard...
echo ========================================================
echo.
echo   Opening: http://localhost:3000/dashboard.html
echo   Press Ctrl+C in this window anytime to stop the server.
echo.
start http://localhost:3000/dashboard.html
node tools\server.js
pause
