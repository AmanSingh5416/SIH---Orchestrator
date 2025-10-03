@echo off
echo.
echo ================================
echo   HRMS Server Network Setup
echo ================================
echo.

echo Finding your network IP addresses...
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr "IPv4"') do (
    set "ip=%%i"
    set "ip=!ip: =!"
    if not "!ip!"=="127.0.0.1" (
        echo Network IP: !ip!
        echo Frontend URL: http://!ip!:3000
        echo Backend URL:  http://!ip!:5000
        echo.
    )
)

echo.
echo Instructions for network users:
echo 1. Use any of the Network IP addresses above
echo 2. Make sure both frontend and backend are running
echo 3. Access via: http://[NETWORK_IP]:3000
echo.
echo To start servers:
echo - Backend: cd backend && npm start
echo - Frontend: cd frontend && npx serve . -p 3000
echo.
pause