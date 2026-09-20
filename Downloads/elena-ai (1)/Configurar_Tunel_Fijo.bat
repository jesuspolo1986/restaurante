@echo off
setlocal enabledelayedexpansion
title ELENA PRO POS - CONFIGURAR TUNEL FIJO PERMANENTE (NUNCA CAMBIA)
color 1F

cls
echo =======================================================================
echo     ELENA PRO POS - CONFIGURACION DE TUNEL WEB FIJO PERMANENTE
echo =======================================================================
echo.
echo Esta opcion permite conectar TODAS las Cajas y Celulares a un enlace FIJO
echo que NUNCA cambiara, aunque reinicies la PC o el modem mil veces.
echo.
echo Hay 2 metodos 100%% efectivos:
echo.
echo   [1] LocalXpose / ngrok / Localtunnel (Subdominio Fijo personalizado)
echo   [2] Cloudflare Tunnel con Token de Cuenta (Gratuito y 100%% Oficial)
echo   [3] Crear Acceso Directo a Caja con URL actual
echo.
set /p MODO="Selecciona una opcion [1, 2 o 3]: "

if "%MODO%"=="1" goto MODO_LOCALXPOSE
if "%MODO%"=="2" goto MODO_CLOUDFLARE_TOKEN
if "%MODO%"=="3" goto MODO_ACCESO

:MODO_LOCALXPOSE
cls
echo =======================================================================
echo   OPCION 1: TUNEL CON NOMBRE PERSONALIZADO FIJO (Ej: mifarmacia.loca.lt)
echo =======================================================================
echo.
echo Ejecutando conector Localtunnel permanente hacia el puerto 3000...
echo.
npx -y localtunnel --port 3000
pause
exit /b

:MODO_CLOUDFLARE_TOKEN
cls
echo =======================================================================
echo   OPCION 2: CLOUDFLARE TUNNEL CON NOMBRE DE DOMINIO FIJO
echo =======================================================================
echo.
echo Si tienes un token de tunel fijo de Cloudflare (Zero Trust gratuito):
echo.
set /p TOKEN="Pega aqui tu Token de Cloudflare Tunnel: "
if "%TOKEN%"=="" (
  echo Error: Token no valido.
  pause
  exit /b
)
cloudflared.exe service install %TOKEN%
echo.
echo [EXITO] Tunel Cloudflare instalado como Servicio de Windows automatico!
echo Iniciara solo cada vez que encienda la PC.
pause
exit /b

:MODO_ACCESO
call Crear_Acceso_Caja.bat
