@echo off
title ELENA PRO - TUNEL WEB SEGURO PARA CELULARES
color 0A
cls

echo =======================================================================
echo          ELENA PRO POS - CONECTOR WEB SEGURO (CLOUDFLARE)
echo =======================================================================
echo.
echo  Iniciando conector para celulares y tablets...
echo.

cd /d "%~dp0"

:: 1. Comprobar si ya existe el ejecutable
if exist "cloudflared.exe" goto :RUN_TUNNEL

echo [PASO 1/2] Descargando modulo seguro (15 MB, solo la primera vez)...
echo Por favor espera unos segundos mientras se descarga...
echo.

:: Descarga segura con PowerShell usando curl nativo o WebClient
powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe', 'cloudflared.exe')"

if not exist "cloudflared.exe" (
    echo.
    echo =======================================================================
    echo  [AVISO] No se pudo descargar automaticamente con PowerShell.
    echo  Intentando descarga directa con curl...
    echo =======================================================================
    curl -L "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -o "cloudflared.exe"
)

if not exist "cloudflared.exe" (
    echo.
    echo [ERROR] No se pudo descargar el archivo cloudflared.exe
    echo Verifica tu conexion a internet e intenta de nuevo.
    echo.
    pause
    exit /b
)

:RUN_TUNNEL
cls
echo =======================================================================
echo          ELENA PRO POS - CONECTOR WEB SEGURO ACTIVO
echo =======================================================================
echo.
echo  [PASO 2/2] Estableciendo tunel HTTPS con el servidor POS (Puerto 3000)...
echo.
echo  ======================================================================
echo  INSTRUCCIONES:
echo  1. Busca abajo la linea con el enlace que termina en .trycloudflare.com
echo     (Ejemplo: https://mi-pos-123.trycloudflare.com)
echo.
echo  2. Abre ese enlace en el celular O pegalo en el sistema POS en el boton
echo     "Conectar Celulares" para que te dibuje el Codigo QR.
echo.
echo  3. NO CIERRES ESTA VENTANA mientras quieras usar los celulares.
echo  ======================================================================
echo.

cloudflared.exe tunnel --url http://127.0.0.1:3000

echo.
echo El tunel se ha detenido.
pause
