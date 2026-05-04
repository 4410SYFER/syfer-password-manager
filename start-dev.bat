@echo off
setlocal

set "MYSQL_EXE=mysql"
if exist "C:\xampp\mysql\bin\mysql.exe" set "MYSQL_EXE=C:\xampp\mysql\bin\mysql.exe"

echo Checking database setup...
set "USERS_TABLE_COUNT=0"
set "TABLE_COUNT_FILE=%TEMP%\syfer-table-count.txt"
"%MYSQL_EXE%" -u root -N -s -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='password_manager' AND table_name='users';" > "%TABLE_COUNT_FILE%"
if exist "%TABLE_COUNT_FILE%" (
	set /p USERS_TABLE_COUNT=<"%TABLE_COUNT_FILE%"
	del "%TABLE_COUNT_FILE%" >nul 2>nul
)

if "%USERS_TABLE_COUNT%"=="0" (
	echo Creating password_manager database and tables...
	"%MYSQL_EXE%" -u root -e "CREATE DATABASE IF NOT EXISTS password_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"
	"%MYSQL_EXE%" -u root password_manager < "%~dp0schema.sql"
) else (
	echo Database already exists. Skipping schema import.
)

if not exist "%~dp0backend\node_modules" (
	echo Installing backend dependencies...
	pushd "%~dp0backend"
	npm install
	popd
)

if not exist "%~dp0frontend\node_modules" (
	echo Installing frontend dependencies...
	pushd "%~dp0frontend"
	npm install
	popd
)

echo Starting Syfer backend...
start "Syfer Backend" cmd /k "cd /d ""%~dp0backend"" && npm start"

echo Starting Syfer frontend...
start "Syfer Frontend" cmd /k "cd /d ""%~dp0frontend"" && npm run dev"

echo.
echo Make sure XAMPP and MySQL are running before using the app.
echo Backend: http://localhost:3001
echo Frontend: http://localhost:5173

endlocal