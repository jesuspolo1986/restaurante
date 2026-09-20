@echo off
:: =======================================================================
::           ELENA PRO - ASISTENTE DE CONFIGURACIÓN DE IP ESTÁTICA
:: =======================================================================
:: Este script fija la dirección IP de la computadora servidor para que
:: nunca cambie, evitando desconexiones de cajas, celulares y tablets.
:: =======================================================================

chcp 65001 > nul
setlocal EnableDelayedExpansion
title Elena PRO - Fijador de IP Estática para Servidor

:: 1. VERIFICACIÓN Y AUTO-ELEVACIÓN DE PRIVILEGIOS DE ADMINISTRADOR
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo =======================================================================
    echo [SOLICITANDO PERMISOS DE ADMINISTRADOR]
    echo Se requieren permisos administrativos para modificar la configuracion
    echo de red y las reglas de Firewall de Windows...
    echo =======================================================================
    echo.
    powershell -Command "Start-Process cmd -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

:MENU_PRINCIPAL
cls
color 1F
echo =======================================================================
echo              ELENA PRO - GESTOR DE IP ESTÁTICA PARA SERVIDOR
echo =======================================================================
echo  Este asistente garantiza que la IP de este equipo nunca cambie,
echo  asegurando conexion 100%% estable para cajas, celulares y tablets.
echo =======================================================================
echo.

:: 2. DETECCIÓN AUTOMÁTICA DE ADAPTADOR ACTIVO
echo [1/3] Analizando adaptadores de red activos en este equipo...
echo.

set "ADAPTER_NAME="
set "CURRENT_IP="
set "CURRENT_MASK="
set "CURRENT_GATEWAY="

:: Usar PowerShell para obtener con precision el adaptador con puerta de enlace activa
for /f "usebackq tokens=1,2,3,4 delims=|" %%a in (`powershell -NoProfile -Command ^
    "$route = Get-NetRoute -DestinationPrefix '0.0.0.0/0' | Select-Object -First 1;" ^
    "if ($route) {" ^
    "  $ip = Get-NetIPAddress -InterfaceIndex $route.InterfaceIndex -AddressFamily IPv4 | Select-Object -First 1;" ^
    "  $iface = Get-NetAdapter -InterfaceIndex $route.InterfaceIndex;" ^
    "  $mask = '255.255.255.0';" ^
    "  if ($ip.PrefixLength -eq 24) { $mask = '255.255.255.0' } elseif ($ip.PrefixLength -eq 16) { $mask = '255.255.0.0' } elseif ($ip.PrefixLength -eq 8) { $mask = '255.0.0.0' };" ^
    "  Write-Output ($iface.Name + '|' + $ip.IPAddress + '|' + $mask + '|' + $route.NextHop)" ^
    "}"`) do (
    set "ADAPTER_NAME=%%a"
    set "CURRENT_IP=%%b"
    set "CURRENT_MASK=%%c"
    set "CURRENT_GATEWAY=%%d"
)

if "%ADAPTER_NAME%"=="" (
    echo [AVISO] No se detecto automaticamente con PowerShell. Consultando Netsh...
    for /f "tokens=3*" %%i in ('netsh interface show interface ^| findstr "Connected Conectado"') do (
        set "ADAPTER_NAME=%%j"
    )
)

echo -----------------------------------------------------------------------
echo  DIAGNÓSTICO DE RED ACTUAL:
echo -----------------------------------------------------------------------
echo  - Adaptador Activo   : %ADAPTER_NAME%
echo  - IP Actual Asignada : %CURRENT_IP%
echo  - Mascara de Subred  : %CURRENT_MASK%
echo  - Puerta de Enlace   : %CURRENT_GATEWAY% (Router)
echo  - Puerto del Sistema : 3000
echo -----------------------------------------------------------------------
echo.
echo ¿Que accion deseas realizar?
echo.
echo  [1] FIJAR AUTOMÁTICAMENTE LA IP ACTUAL (%CURRENT_IP%) [RECOMENDADO]
echo      Convierte la IP actual en Estatica sin alterar la conexion de los dispositivos.
echo.
echo  [2] ASIGNAR UNA IP ESTÁTICA PERSONALIZADA (Ej: 192.168.1.200)
echo      Permite escribir manualmente la IP, Mascara, Router y DNS.
echo.
echo  [3] RESTAURAR A DHCP (IP DINÁMICA / AUTOMÁTICA)
echo      Vuelve a la configuracion por defecto de Windows.
echo.
echo  [4] SOLO ABRIR PUERTO 3000 EN EL FIREWALL DE WINDOWS
echo.
echo  [5] SALIR
echo.
set /p OPCION="Selecciona una opcion (1-5) y presiona Enter: "

if "%OPCION%"=="1" goto FIJAR_ACTUAL
if "%OPCION%"=="2" goto FIJAR_MANUAL
if "%OPCION%"=="3" goto RESTAURAR_DHCP
if "%OPCION%"=="4" goto CONFIG_FIREWALL
if "%OPCION%"=="5" exit /b
goto MENU_PRINCIPAL


:FIJAR_ACTUAL
cls
echo =======================================================================
echo   OPCIÓN 1: FIJANDO LA IP ACTUAL (%CURRENT_IP%) COMO ESTÁTICA
echo =======================================================================
echo.
if "%CURRENT_IP%"=="" (
    echo [ERROR] No se pudo detectar la IP actual. Por favor usa la opcion 2 para escribirla manualmente.
    pause
    goto MENU_PRINCIPAL
)

if "%CURRENT_GATEWAY%"=="" (
    set "CURRENT_GATEWAY=192.168.1.1"
)
if "%CURRENT_MASK%"=="" (
    set "CURRENT_MASK=255.255.255.0"
)

echo Configurando adaptador: "%ADAPTER_NAME%"
echo IP Estatica           : %CURRENT_IP%
echo Mascara               : %CURRENT_MASK%
echo Puerta de Enlace      : %CURRENT_GATEWAY%
echo DNS Primario          : 8.8.8.8 (Google DNS)
echo DNS Secundario        : 1.1.1.1 (Cloudflare)
echo.
echo Aplicando cambios en Windows...

netsh interface ipv4 set address name="%ADAPTER_NAME%" static %CURRENT_IP% %CURRENT_MASK% %CURRENT_GATEWAY% 1 >nul 2>&1
netsh interface ipv4 set dns name="%ADAPTER_NAME%" static 8.8.8.8 primary >nul 2>&1
netsh interface ipv4 add dns name="%ADAPTER_NAME%" 1.1.1.1 index=2 >nul 2>&1

goto APLICAR_FIREWALL_Y_FINALIZAR


:FIJAR_MANUAL
cls
echo =======================================================================
echo   OPCIÓN 2: ASIGNACIÓN MANUAL DE IP ESTÁTICA
echo =======================================================================
echo.
echo Ingresa los datos de red para el servidor:
echo (Si dejas vacio, se usara el valor entre corchetes)
echo.

set "TARGET_IP=%CURRENT_IP%"
if "%TARGET_IP%"=="" set "TARGET_IP=192.168.1.150"
set /p USER_IP="Direccion IP Fija deseada [%TARGET_IP%]: "
if not "%USER_IP%"=="" set "TARGET_IP=%USER_IP%"

set "TARGET_MASK=%CURRENT_MASK%"
if "%TARGET_MASK%"=="" set "TARGET_MASK=255.255.255.0"
set /p USER_MASK="Mascara de Subred [%TARGET_MASK%]: "
if not "%USER_MASK%"=="" set "TARGET_MASK=%USER_MASK%"

set "TARGET_GW=%CURRENT_GATEWAY%"
if "%TARGET_GW%"=="" set "TARGET_GW=192.168.1.1"
set /p USER_GW="Puerta de Enlace / Router [%TARGET_GW%]: "
if not "%USER_GW%"=="" set "TARGET_GW=%USER_GW%"

echo.
echo Configurando adaptador: "%ADAPTER_NAME%"
echo IP: %TARGET_IP% | Mascara: %TARGET_MASK% | Gateway: %TARGET_GW%
echo.

netsh interface ipv4 set address name="%ADAPTER_NAME%" static %TARGET_IP% %TARGET_MASK% %TARGET_GW% 1 >nul 2>&1
netsh interface ipv4 set dns name="%ADAPTER_NAME%" static 8.8.8.8 primary >nul 2>&1
netsh interface ipv4 add dns name="%ADAPTER_NAME%" 1.1.1.1 index=2 >nul 2>&1
set "CURRENT_IP=%TARGET_IP%"

goto APLICAR_FIREWALL_Y_FINALIZAR


:RESTAURAR_DHCP
cls
echo =======================================================================
echo   OPCIÓN 3: RESTAURANDO A IP AUTOMÁTICA (DHCP)
echo =======================================================================
echo.
echo Restableciendo configuracion dinamica en "%ADAPTER_NAME%"...
netsh interface ipv4 set address name="%ADAPTER_NAME%" source=dhcp >nul 2>&1
netsh interface ipv4 set dns name="%ADAPTER_NAME%" source=dhcp >nul 2>&1
echo.
echo [✓] El adaptador ahora obtiene IP y DNS automaticamente desde el router.
echo.
pause
goto MENU_PRINCIPAL


:CONFIG_FIREWALL
cls
echo =======================================================================
echo   CONFIGURACIÓN DE REGLAS DE FIREWALL DE WINDOWS
echo =======================================================================
echo.
echo Abriendo puerto 3000 (TCP) y 5353 (mDNS) para Elena PRO...

netsh advfirewall firewall delete rule name="Elena PRO Servidor (Puerto 3000)" >nul 2>&1
netsh advfirewall firewall add rule name="Elena PRO Servidor (Puerto 3000)" dir=in action=allow protocol=TCP localport=3000 profile=any >nul 2>&1
netsh advfirewall firewall add rule name="Elena PRO Servidor (Puerto 3000 Out)" dir=out action=allow protocol=TCP localport=3000 profile=any >nul 2>&1

netsh advfirewall firewall delete rule name="Elena PRO mDNS Bonjour (5353)" >nul 2>&1
netsh advfirewall firewall add rule name="Elena PRO mDNS Bonjour (5353)" dir=in action=allow protocol=UDP localport=5353 profile=any >nul 2>&1

echo [✓] Reglas de Firewall aplicadas con exito.
echo.
pause
goto MENU_PRINCIPAL


:APLICAR_FIREWALL_Y_FINALIZAR
echo.
echo [2/3] Configurando permisos en el Firewall de Windows...
netsh advfirewall firewall delete rule name="Elena PRO Servidor (Puerto 3000)" >nul 2>&1
netsh advfirewall firewall add rule name="Elena PRO Servidor (Puerto 3000)" dir=in action=allow protocol=TCP localport=3000 profile=any >nul 2>&1
netsh advfirewall firewall add rule name="Elena PRO Servidor (Puerto 3000 Out)" dir=out action=allow protocol=TCP localport=3000 profile=any >nul 2>&1

netsh advfirewall firewall delete rule name="Elena PRO mDNS Bonjour (5353)" >nul 2>&1
netsh advfirewall firewall add rule name="Elena PRO mDNS Bonjour (5353)" dir=in action=allow protocol=UDP localport=5353 profile=any >nul 2>&1

echo [3/3] Verificando conectividad...
ping -n 1 8.8.8.8 >nul 2>&1
if %errorlevel% equ 0 (
    set "INTERNET_STATUS=ONLINE (Internet Funcionando)"
) else (
    set "INTERNET_STATUS=LOCAL (Solo Red Local o Sin Salida Externa)"
)

cls
color 2F
echo =======================================================================
echo       ¡CONFIGURACIÓN DE IP ESTÁTICA COMPLETADA EXITOSAMENTE!
echo =======================================================================
echo.
echo  La direccion IP de este equipo ha quedado FIJADA permanentemente:
echo.
echo  =====================================================================
echo    DIRECCIÓN DEL SERVIDOR ELENA PRO : http://%CURRENT_IP%:3000
echo    ACCESO POR NOMBRE DE RED         : http://%COMPUTERNAME%:3000
echo    ESTADO DE CONEXIÓN               : %INTERNET_STATUS%
echo  =====================================================================
echo.
echo  BENEFICIOS:
echo  1. La IP nunca cambiara aunque se apague el router o la computadora.
echo  2. Los codigos QR y accesos directos guardados en celulares funcionaran SIEMPRE.
echo  3. Cajas y terminales secundarias no perderan conexion.
echo.
echo Presiona cualquier tecla para volver al menu principal o cierra esta ventana.
pause > nul
goto MENU_PRINCIPAL
