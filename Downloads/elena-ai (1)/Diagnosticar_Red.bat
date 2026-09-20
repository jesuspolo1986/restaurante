@echo off
setlocal enabledelayedexpansion
title ELENA PRO POS - DIAGNOSTICO DE CONECTIVIDAD LOCAL
color 0E

cls
echo =======================================================================
echo          ELENA PRO POS - DIAGNOSTICO DE RED LOCAL (CAJAS E IPS)
echo =======================================================================
echo.
echo Este reporte analiza por que las cajas secundarias no pudieron entrar por IP.
echo.

:: 1. Verificar si Node esta escuchando en 0.0.0.0:3000
echo [1/5] Verificando en que direcciones esta escuchando el Servidor Elena...
netstat -ano | findstr ":3000"
echo.

:: 2. Verificar perfil de Red (Privada vs Publica)
echo [2/5] Perfil de Red actual en Windows:
powershell -Command "Get-NetConnectionProfile | Select-Object InterfaceAlias, NetworkCategory, IPv4Connectivity"
echo.

:: 3. Verificar Reglas de Firewall de Windows
echo [3/5] Estado de reglas de Firewall para Puerto 3000 y Node:
netsh advfirewall firewall show rule name="Elena PRO POS - Servidor Puerto 3000" | findstr /i "Enabled Profile Action Direction LocalPort"
echo.

:: 4. Detectar Antivirus de Terceros instalados
echo [4/5] Comprobando Antivirus / Suites de Seguridad instaladas:
powershell -Command "Get-CimInstance -Namespace root/SecurityCenter2 -ClassName AntiVirusProduct | Select-Object displayName, productState"
echo.

:: 5. Mostrar direcciones IPs utilizables
echo [5/5] Direcciones IP disponibles en este equipo:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4" /c:"IP Address"') do (
    for /f "tokens=1" %%b in ("%%a") do (
        echo   - IP Detectada: http://%%b:3000
    )
)
echo.
echo =======================================================================
echo INFORME DE DIAGNOSTICO COMPLETADO.
echo Presione cualquier tecla para salir...
echo =======================================================================
pause >nul
