@echo off
:: =======================================================================
::                  ELENA PRO - SISTEMA DE GESTION FARMACEUTICA
::                        SCRIPT PARA DETENER EL SISTEMA
:: =======================================================================
:: Este archivo detiene de forma segura el proceso del servidor local
:: que se ejecuta en segundo plano.

title ELENA PRO - Deteniendo Servicio...
echo =======================================================================
echo             ELENA PRO - DETENIENDO SERVIDOR LOCAL
echo =======================================================================
echo.

:: Buscar el proceso de Node que corre en el puerto 3000 y cerrarlo
echo [INFO] Buscando servicios de Elena PRO activos...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo [INFO] Deteniendo proceso con PID %%a en puerto 3000...
    taskkill /F /PID %%a >nul 2>&1
)

:: También se puede apagar por nombre de imagen si es necesario
taskkill /f /im node.exe >nul 2>&1

echo [OK] El servidor se ha detenido con exito. Ya puede cerrar esta ventana.
echo.
pause
