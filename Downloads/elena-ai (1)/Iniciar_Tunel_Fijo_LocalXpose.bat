@echo off
setlocal enabledelayedexpansion
title ELENA PRO POS - TUNEL FIJO LOCALXPOSE
color 0B
cls

echo =======================================================================
echo     ELENA PRO POS - INICIADOR DE TUNEL FIJO (LOCALXPOSE)
echo =======================================================================
echo.
echo Enlace permanente configurado:
echo   --^> https://lacasadelsoldado.locx.io
echo.
echo =======================================================================
echo.

cd /d "%~dp0"

:: 1. Verificar y descargar loclx.exe si no existe
if not exist "loclx.exe" (
    echo [1/3] Descargando cliente loclx.exe...
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('https://api.localxpose.io/api/v2/downloads/loclx-windows-amd64.zip', 'loclx.zip'); Expand-Archive -Path 'loclx.zip' -DestinationPath '.' -Force; Remove-Item 'loclx.zip'"
)

:: 2. Inyectar el token automáticamente sin pedir escribir en consola
echo [2/3] Autenticando token de forma automatica...
powershell -Command "echo 9Ez5Z3jiVP0QWzWLNGbtywU3wwYoSNfQosbwECLp | .\loclx.exe account login"

:: 3. Iniciar el túnel directamente
echo.
echo [3/3] Iniciando enlace permanente en puerto 3000...
echo.
echo =======================================================================
echo  TUNEL CONECTADO AL PUERTO 3000
echo =======================================================================
echo.

.\loclx.exe tunnel http --to 127.0.0.1:3000 --subdomain lacasadelsoldado

echo.
pause
