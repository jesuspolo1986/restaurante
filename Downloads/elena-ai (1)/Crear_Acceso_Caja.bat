@echo off
setlocal enabledelayedexpansion
title ELENA PRO POS - GENERADOR DE ACCESO DIRECTO PARA CAJAS
color 1F

cls
echo =======================================================================
echo          ELENA PRO POS - CREAR ACCESO DIRECTO PARA CAJA SECUNDARIA
echo =======================================================================
echo.
echo Este asistente creara un icono en el Escritorio para abrir la Caja POS.
echo.
echo Seleccione el tipo de conexion de esta Caja con la PC Servidor Principal:
echo.
echo   [1] Conectar por Red Local / Nombre de Red (Recomendado para la misma tienda)
echo       Direccion: http://%COMPUTERNAME%:3000 o nombre del Servidor
echo.
echo   [2] Conectar por IP Local Fija (Ej: 192.168.1.15)
echo.
echo   [3] Conectar por Tunel Web Cloudflare / Internet (Ej: https://...trycloudflare.com)
echo.
set /p OPCION="Ingrese opcion [1, 2 o 3] y presione Enter: "

if "%OPCION%"=="1" goto OP_NOMBRE
if "%OPCION%"=="2" goto OP_IP
if "%OPCION%"=="3" goto OP_TUNEL
goto OP_NOMBRE

:OP_NOMBRE
echo.
set /p NOMBRE_SERV="Ingrese el Nombre de la PC Servidor Principal (Ej: Polo, Servidor, PC-Principal) [%COMPUTERNAME%]: "
if "%NOMBRE_SERV%"=="" set NOMBRE_SERV=%COMPUTERNAME%
set URL_FINAL=http://!NOMBRE_SERV!:3000
goto CREAR_ACCESO

:OP_IP
echo.
set /p IP_SERV="Ingrese la direccion IP de la PC Servidor Principal (Ej: 192.168.1.30): "
if "%IP_SERV%"=="" set IP_SERV=127.0.0.1
set URL_FINAL=http://!IP_SERV!:3000
goto CREAR_ACCESO

:OP_TUNEL
echo.
set /p URL_TUNEL="Pegue el enlace HTTPS del Tunel Cloudflare (Ej: https://xyz.trycloudflare.com): "
if "%URL_TUNEL%"=="" (
  echo Error: Debe ingresar una URL valida.
  pause
  exit /b
)
set URL_FINAL=!URL_TUNEL!
goto CREAR_ACCESO

:CREAR_ACCESO
echo.
echo Configurando acceso directo hacia: !URL_FINAL! ...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell; " ^
  "$desktop = [System.Environment]::GetFolderPath('Desktop'); " ^
  "$s = $ws.CreateShortcut(\"$desktop\Elena PRO POS - Caja.lnk\"); " ^
  "$s.TargetPath = 'chrome.exe'; " ^
  "if (-not (Get-Command chrome.exe -ErrorAction SilentlyContinue)) { $s.TargetPath = 'msedge.exe'; } " ^
  "$s.Arguments = '--app=\"!URL_FINAL!\"'; " ^
  "$s.Description = 'Acceso a Terminal Caja - Elena PRO POS'; " ^
  "$s.Save(); "

echo.
echo =======================================================================
echo  [EXITO] Acceso directo 'Elena PRO POS - Caja' creado en el Escritorio!
echo  Se abrira en modo App pantalla completa con: !URL_FINAL!
echo =======================================================================
echo.
pause
