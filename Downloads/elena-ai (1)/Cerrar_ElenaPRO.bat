@echo off
title Elena PRO - Detener Servidor
color 0C

echo ======================================================================
echo                     DETENIENDO SISTEMA ELENA PRO
echo ======================================================================
echo.

:: Cerrar procesos que esten escuchando en el puerto 3000 o instancias de node
echo Deteniendo procesos del servidor...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo [OK] El servidor de Elena PRO ha sido detenido con exito.
timeout /t 2 /nobreak >nul
exit
