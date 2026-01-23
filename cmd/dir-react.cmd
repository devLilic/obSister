@echo off
setlocal

REM 1. Obține folderul unde se află acest script (fără numele fișierului)
set "SCRIPT_DIR=%~dp0"

REM 2. Construiește path-ul ../src
for %%I in ("%SCRIPT_DIR%..\src") do set "REACT_DIR=%%~fI"

REM 3. Verifică dacă folderul există
if not exist "%REACT_DIR%" (
    echo Folderul nu exista: %REACT_DIR%
    echo.
    pause
    exit /b 1
)

REM 4. Rulează dir recursiv și salvează rezultatul
dir "%REACT_DIR%" /S /B /A:-D > "files-react.txt"

echo.
echo Lista de fisiere a fost salvata in files-react.txt
echo Path analizat: %REACT_DIR%
echo.

REM 5. Pauză la final
pause

endlocal
