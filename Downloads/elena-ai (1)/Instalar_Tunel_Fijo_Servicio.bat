@echo off
setlocal enabledelayedexpansion
title ELENA PRO POS - INSTALADOR DE TUNEL FIJO Y PERMANENTE
color 1F

cls
echo =======================================================================
echo          ELENA PRO POS - INSTALAR TUNEL FIJO PERMANENTE
echo =======================================================================
echo.
echo Este asistente instalara el Tunel de Cloudflare como SERVICIO DE WINDOWS.
echo.
echo BENEFICIOS:
echo   1. La direccion web NUNCA cambiara.
echo   2. Iniciara automaticamente cuando el cliente encienda la PC.
echo   3. No habra ninguna ventana negra abierta en la pantalla.
echo   4. Las cajas y celulares guardaran el acceso directo para siempre.
echo =======================================================================
echo.

:: Verificar permisos de Administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [!] ERROR: Se requieren permisos de Administrador.
    echo Haz clic derecho sobre este archivo y elige: "Ejecutar como Administrador".
    echo.
    pause
    exit /b 1
)

cd /d "%~dp0"

:: Comprobar si existe cloudflared.exe
if not exist "cloudflared.exe" (
    echo [1/3] Descargando modulo cloudflared.exe (15 MB)...
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe', 'cloudflared.exe')"
)

if not exist "cloudflared.exe" (
    echo [ERROR] No se pudo descargar cloudflared.exe. Verifica tu conexion a internet.
    pause
    exit /b 1
)

echo.
echo =======================================================================
echo   PASO FINAL: PEGAR EL TOKEN DEL TUNEL DE CLOUDFLARE
echo =======================================================================
echo.
echo Ve a tu panel de Cloudflare Zero Trust (Networks ^> Tunnels),
echo copia el comando o el Token largo que te entrega Cloudflare y pegalo aqui.
echo.
set /p USER_INPUT="Pega el Token o comando completo aqui: "

if "%USER_INPUT%"=="" (
    echo.
    echo [!] No ingresaste ningun token. Operacion cancelada.
    pause
    exit /b
)

:: Limpiar si el usuario pego todo el comando completo de cloudflare
set CLEAN_TOKEN=%USER_INPUT:cloudflared.exe service install =%
set CLEAN_TOKEN=%CLEAN_TOKEN:cloudflared service install =%

echo.
echo [2/3] Deteniendo y desinstalando servicios anteriores si existian...
"%~dp0cloudflared.exe" service uninstall >nul 2>&1

echo.
echo [3/3] Instalando Tunel Fijo Permanente como Servicio de Windows...
"%~dp0cloudflared.exe" service install %CLEAN_TOKEN%

if %errorLevel% equ 0 (
    echo.
    echo =======================================================================
    echo   [EXITO TOTAL] ¡EL TUNEL FIJO HA SIDO INSTALADO COMO SERVICIO!
    echo =======================================================================
    echo.
    echo   - El tunel ya esta activo en segundo plano.
    echo   - Encendera solo cada vez que prendan la computadora.
    echo   - Tu subdominio personalizado (Ej: farmacia.tudominio.com)
    echo     ya esta conectado al puerto 3000 de este equipo.
    echo =======================================================================
) else (
    echo.
    echo [!] Hubo un detalle al registrar el servicio. Verifica que el token sea correcto.
)

echo.
pause
