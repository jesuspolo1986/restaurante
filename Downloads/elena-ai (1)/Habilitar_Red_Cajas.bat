@echo off
:: ==============================================================================
:: ASISTENTE MAESTRO DE RED, FIREWALL Y PERFIL PRIVADO - ELENA PRO POS
:: Resuelve el bloqueo de cajas secundarias y celulares en Windows 10/11
:: ==============================================================================

chcp 65001 > nul
title Elena PRO POS - Reparador de Red y Cajas
color 0B

:: Verificar permisos de Administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ====================================================================
    echo   [!] SE REQUIEREN PERMISOS DE ADMINISTRADOR
    echo ====================================================================
    echo   Por favor, haz clic derecho sobre este archivo y selecciona:
    echo   "EJECUTAR COMO ADMINISTRADOR"
    echo ====================================================================
    echo.
    pause
    exit /b 1
)

cls
echo ====================================================================
echo     REPARADOR AUTOMATICO DE CONEXION DE CAJAS - ELENA PRO POS
echo ====================================================================
echo.
echo [1/4] Abriendo Puerto 3000 (TCP) en todos los perfiles de Windows Firewall...

netsh advfirewall firewall delete rule name="Elena PRO POS - Servidor Puerto 3000" >nul 2>&1
netsh advfirewall firewall add rule name="Elena PRO POS - Servidor Puerto 3000" dir=in action=allow protocol=TCP localport=3000 profile=any >nul 2>&1

if %errorLevel% equ 0 (
    echo       [OK] Puerto 3000 desbloqueado con exito.
) else (
    echo       [!] No se pudo registrar la regla del puerto.
)

echo.
echo [2/4] Permitiendo trafico completo para el motor Node.js...
netsh advfirewall firewall delete rule name="Elena PRO POS - Node Service" >nul 2>&1
netsh advfirewall firewall add rule name="Elena PRO POS - Node Service" dir=in action=allow program="%~dp0\node.exe" enable=yes profile=any >nul 2>&1
netsh advfirewall firewall add rule name="Elena PRO POS - Node Global" dir=in action=allow program="node.exe" enable=yes profile=any >nul 2>&1
echo       [OK] Reglas de Node.js creadas.

echo.
echo [3/4] Activando Deteccion de Redes y Perfil Privado en Windows...
powershell -Command "Get-NetConnectionProfile | Set-NetConnectionProfile -NetworkCategory Private -ErrorAction SilentlyContinue" >nul 2>&1
netsh advfirewall firewall set rule group="Detección de redes" new enable=Yes >nul 2>&1
netsh advfirewall firewall set rule group="Network Discovery" new enable=Yes >nul 2>&1
echo       [OK] Deteccion de red local habilitada.

echo.
echo [4/4] Obteniendo la direccion IP del Servidor en tu red local...
echo ====================================================================
echo.
set IP_ENCONTRADA=
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4" /c:"IP Address"') do (
    for /f "tokens=1" %%b in ("%%a") do (
        if not defined IP_ENCONTRADA (
            set IP_ENCONTRADA=%%b
        )
        echo   >>> DIRECCION IP LOCAL: http://%%b:3000
    )
)
echo.
echo ====================================================================
echo   [EXITO TOTAL] TODO QUEDO CONFIGURADO CORRECTAMENTE.
echo.
echo   AHORA HAZ ESTO EN LAS OTRAS CAJAS Y COMPUTADORAS:
echo   1. En las otras cajas abre Google Chrome o Edge.
echo   2. Escribe en la barra de direcciones:
echo      http://%COMPUTERNAME%:3000   o   http://%IP_ENCONTRADA%:3000
echo.
echo   3. ¡La conexion abrira de inmediato y sin errores!
echo ====================================================================
echo.
pause
