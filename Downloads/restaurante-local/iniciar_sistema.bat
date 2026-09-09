@echo off
:: =================================================================
::   GastroLocal - Lanzador de Servidor Local
:: =================================================================
::   Si el puerto 8080 esta ocupado por otro programa en tu PC, 
::   puedes cambiarlo aqui abajo (por ejemplo: set PORT=9000)
:: =================================================================
set PORT=8080

title GastroLocal Server - Puerto %PORT%
color 0F
cd /d "%~dp0"

echo =================================================================
echo       GASTROLOCAL - SERVIDOR DE ESCRITORIO PARA TU PC
echo =================================================================
echo.

:: 1. Verificar si existe el archivo ejecutable GastroLocal.exe en la misma carpeta
if exist "%~dp0GastroLocal.exe" (
    echo Iniciando GastroLocal en segundo plano...
    echo Abriendo Panel de Administrador en el navegador...
    start "" "%~dp0GastroLocal.exe" %PORT%
    timeout /t 2 >nul
    exit /b
)

:: 2. Verificar si existe en la carpeta dist\
if exist "%~dp0dist\GastroLocal.exe" (
    echo Iniciando dist\GastroLocal en segundo plano...
    echo Abriendo Panel de Administrador en el navegador...
    start "" "%~dp0dist\GastroLocal.exe" %PORT%
    timeout /t 2 >nul
    exit /b
)

:: 3. Si no hay .exe, intentar correr con Python
echo Verificando instalacion de Python en tu sistema...
where python >nul 2>&1
if %errorlevel% neq 0 (
    where py >nul 2>&1
    if %errorlevel% neq 0 (
        echo.
        echo ERROR: No se encontro GastroLocal.exe ni Python en tu sistema.
        echo.
        echo Opciones para solucionar esto:
        echo 1. Si descargaste el codigo fuente, instala Python desde:
        echo    https://www.python.org/downloads/
        echo    (Marca la casilla "Add python.exe to PATH").
        echo 2. O ejecuta "compilar_todo_a_instalador.bat" para generar el instalador .EXE.
        echo.
        pause
        exit /b
    ) else (
        set PYCMD=py
    )
) else (
    set PYCMD=python
)

echo.
echo Iniciando servidor GastroLocal en el puerto: %PORT%...
echo.
%PYCMD% gastro_local_pc_server.py %PORT%

if %errorlevel% neq 0 (
    echo.
    echo Ocurrio un error al ejecutar el servidor.
    pause
)