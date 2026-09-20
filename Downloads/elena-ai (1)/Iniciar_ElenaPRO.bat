@echo off
title Elena PRO - Servidor Local POS
color 0A

echo ======================================================================
echo                     INICIANDO SISTEMA ELENA PRO
echo ======================================================================
echo.

cd /d "%~dp0"

:: 1. Comprobar si Node.js está disponible en el PATH
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] No se encontro Node.js instalado en el sistema.
    echo Por favor descargue e instale Node.js desde https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: 2. Iniciar el servidor compilado en segundo plano
echo [INFO] Levantando servidor Node.js en puerto 3000...
start /b node dist/server.cjs > elena_server.log 2>&1

:: 3. Esperar 2 segundos para inicializar base de datos y socket
timeout /t 2 /nobreak >nul

:: 4. Abrir la interfaz en modo aplicación (sin barra de navegador) en Edge o Chrome
echo [INFO] Abriendo interfaz de usuario...
start msedge --app=http://localhost:3000 --start-maximized 2>nul || start chrome --app=http://localhost:3000 --start-maximized 2>nul || start http://localhost:3000

echo [INFO] Elena PRO esta en ejecucion.
exit
