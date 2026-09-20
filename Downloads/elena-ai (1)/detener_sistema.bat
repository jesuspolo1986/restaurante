@echo off
title Elena PRO - Detener Sistema Farmacéutico Local
echo =======================================================================
echo                 ELENA PRO - SISTEMA DE GESTION FARMACEUTICA
echo                         DETENER SERVICIO LOCAL
echo =======================================================================
echo.

echo [INFO] Buscando el servidor de Elena PRO en el puerto 3000...

:: Intentar detener por puerto 3000 de forma selectiva
set "PID="
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    set "PID=%%a"
)

if defined PID (
    echo [INFO] Servidor encontrado ejecutandose con el PID %PID%.
    echo [INFO] Apagando el servidor local de forma segura...
    taskkill /F /PID %PID% >nul 2>&1
    if %errorlevel% equ 0 (
        echo [OK] El servidor de Elena PRO se ha detenido exitosamente.
    ) else (
        echo [ALERTA] No se pudo finalizar el PID %PID%. Intentando cerrar procesos generales de Node...
        taskkill /F /IM node.exe >nul 2>&1
        echo [OK] El sistema de Node ha sido forzado a cerrarse.
    )
) else (
    :: Si no se encontró por puerto, ofrecer cerrar cualquier proceso de Node.exe que pueda estar colgado
    echo [ALERTA] No se detecto ningun servicio activo escuchando en el puerto 3000.
    echo.
    echo ¿Deseas forzar el cierre de todos los procesos de Node.js activos en el computador?
    echo (Esto cerrara Elena PRO si esta corriendo en otro puerto o de fondo).
    echo.
    choice /C SN /M "Presiona S para SI o N para NO: "
    if errorlevel 2 (
        echo [INFO] Operacion cancelada.
    ) else (
        taskkill /F /IM node.exe >nul 2>&1
        echo [OK] Procesos de Node.js finalizados.
    )
)

echo.
echo Presiona cualquier tecla para cerrar esta ventana...
pause >nul
exit
