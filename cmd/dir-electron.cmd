@echo off
setlocal

REM 1. Obține folderul unde se află acest script (fără numele fișierului)
set "SCRIPT_DIR=%~dp0"

REM 2. Construiește path-ul ../electron
for %%I in ("%SCRIPT_DIR%..\electron") do set "ELECTRON_DIR=%%~fI"

REM 3. Verifică dacă folderul există
if not exist "%ELECTRON_DIR%" (
    echo Folderul nu exista: %ELECTRON_DIR%
    echo.
    pause
    exit /b 1
)

REM 4. Rulează dir recursiv și salvează rezultatul
dir "%ELECTRON_DIR%" /S /B /A:-D > "files-electron.txt"

echo.
echo Lista de fisiere a fost salvata in files-electron.txt
echo Path analizat: %ELECTRON_DIR%
echo.

REM 5. Pauză la final
pause

endlocal
