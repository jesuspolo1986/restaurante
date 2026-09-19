@echo off
:: =================================================================
::   GastroLocal - Compilador Automático a .EXE e Instalador (.ISS)
:: =================================================================
title GastroLocal - Generador de Instalador
color 0B

echo =================================================================
echo       GENERADOR DE INSTALADOR GASTROLOCAL (PYINSTALLER + INNO)
echo =================================================================
echo.

:: 1. Verificar si Python está instalado
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python no esta disponible en el sistema.
    pause
    exit /b
)

:: 2. Cerrar GastroLocal.exe si ya está abierto en segundo plano (Evita el error 'Acceso denegado')
echo [Paso 1/4] Cerrando instancias activas de GastroLocal en segundo plano...
taskkill /F /IM GastroLocal.exe >nul 2>&1
timeout /t 1 /nobreak >nul

:: 3. Instalar / verificar PyInstaller
echo [Paso 2/4] Verificando e instalando PyInstaller...
pip install pyinstaller --upgrade --quiet

:: 4. Compilar el script Python a un solo archivo ejecutable (.exe)
echo.
echo [Paso 3/4] Compilando gastro_local_pc_server.py en un unico archivo GastroLocal.exe...
pyinstaller --onefile --noconsole --name=GastroLocal --clean gastro_local_pc_server.py

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Ocurrio un fallo al compilar con PyInstaller.
    echo Asegurate de que no tengas GastroLocal.exe bloqueado por el antivirus o abierto.
    pause
    exit /b
)

echo.
echo [Paso 4/4] Compilando Instalador con Inno Setup...

:: 4. Buscar Inno Setup Compiler en rutas estandar
set ISCC="C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
if not exist %ISCC% set ISCC="C:\Program Files\Inno Setup 6\ISCC.exe"
if not exist %ISCC% set ISCC="C:\Program Files (x86)\Inno Setup 5\ISCC.exe"

if exist %ISCC% (
    %ISCC% setup_gastrolocal.iss
    echo.
    echo =================================================================
    echo  LISTO! Tu instalador se creo en la carpeta: \Instalador_Salida\
    echo =================================================================
) else (
    echo.
    echo NOTA: No se encontro el compilador automatico de Inno Setup (ISCC.exe).
    echo.
    echo Para generar el instalador final:
    echo 1. Descarga e instala Inno Setup: https://jrsoftware.org/isdl.php
    echo 2. Haz doble clic en el archivo "setup_gastrolocal.iss"
    echo 3. Presiona el boton "Compile" (o presiona F9).
)

echo.
pause
