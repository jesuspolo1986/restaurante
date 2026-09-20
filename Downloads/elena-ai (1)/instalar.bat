@echo off
title Instalador Automático - Elena PRO
chcp 65001 > nul
cls

echo =======================================================================
echo                  ELENA PRO - INSTALADOR DE UN SOLO CLIC
echo =======================================================================
echo.
echo Este asistente instalará y configurará el sistema de forma automática
echo en tu computadora local.
echo.
echo Presiona cualquier tecla para comenzar la instalación...
pause > nul
echo.

:: 1. Verificar si Node.js está instalado
echo [1/5] Verificando requisitos del sistema...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [ERROR] Node.js no está instalado en este sistema.
    echo El sistema requiere Node.js para poder ejecutar el servidor y la base de datos.
    echo.
    echo Por favor:
    echo 1. Descarga e instala Node.js (versión recomendada LTS) desde:
    echo    https://nodejs.org/
    echo 2. Cierra esta ventana e inicia nuevamente este instalador.
    echo.
    pause
    exit
)
echo - Node.js detectado correctamente.
echo.

:: [MEDIDA DRASTICA] Detener cualquier proceso previo de Node.js o Elena PRO en segundo plano
echo [INFO] Deteniendo cualquier instancia previa de Elena PRO o proceso de Node.js...
echo Esto liberará los archivos del sistema para permitir una instalación/actualización limpia.
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
taskkill /F /IM node.exe >nul 2>&1
echo - Procesos de fondo finalizados.
echo.

:: 2. Instalar dependencias y Compilar
echo [2/5] Instalando dependencias y compilando la interfaz...
echo Esto puede tomar de 1 a 2 minutos dependiendo de tu internet. Por favor espera...
echo.
call npm install
call npm run build
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Hubo un problema al compilar la aplicación. Asegúrate de estar conectado a Internet.
    pause
    exit
)
echo.
echo [INFO] Optimizando espacio (removiendo dependencias de desarrollo)...
call npm prune --production
echo.
echo - Dependencias instaladas y compilación exitosa.
echo.

:: 3. Definir Carpeta de Destino Seguro (Donde vivirá el sistema)
set "DESTINO=C:\ElenaPRO"
echo [3/5] Creando directorio seguro de instalación en: %DESTINO%

:: Asegurar de nuevo la detención de procesos antes de modificar la carpeta destino
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
taskkill /F /IM node.exe >nul 2>&1

if not exist "%DESTINO%" (
    mkdir "%DESTINO%"
)
if exist "%DESTINO%\dist" (
    echo [INFO] Detectada instalación anterior. Eliminando versión previa de 'dist' para una copia 100%% limpia...
    rmdir /S /Q "%DESTINO%\dist"
)
if not exist "%DESTINO%\data" (
    mkdir "%DESTINO%\data"
)
echo - Carpetas creadas y permisos de base de datos listos.
echo.

:: 4. Copiar archivos necesarios al destino final
echo [4/5] Copiando archivos del sistema...
xcopy /E /I /Y "dist" "%DESTINO%\dist" >nul
xcopy /E /I /Y "node_modules" "%DESTINO%\node_modules" >nul
copy /Y "package.json" "%DESTINO%\" >nul
copy /Y "server.ts" "%DESTINO%\" >nul
copy /Y "iniciar_sistema.bat" "%DESTINO%\" >nul
copy /Y "detener_sistema.bat" "%DESTINO%\" >nul
copy /Y "apagar_sistema.bat" "%DESTINO%\" >nul
copy /Y "iniciar_invisible.vbs" "%DESTINO%\" >nul

:: Crear .env dinámicamente si no existe
if not exist "%DESTINO%\.env" (
    copy /Y ".env.example" "%DESTINO%\.env" >nul
)
echo - Copia de archivos completada.
echo.

:: 5. Crear accesos directos dinámicos en el Escritorio usando PowerShell
echo [5/5] Creando accesos directos en tu Escritorio...

set "SCRIPT_VBS=%DESTINO%\iniciar_invisible.vbs"
set "SCRIPT_STOP=%DESTINO%\detener_sistema.bat"

:: Acceso directo principal para Iniciar
powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut([System.IO.Path]::Combine([Environment]::GetFolderPath('Desktop'), 'Elena PRO.lnk')); $Shortcut.TargetPath = '%SCRIPT_VBS%'; $Shortcut.WorkingDirectory = '%DESTINO%'; $Shortcut.Save()"

:: Acceso directo para Apagar
powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut([System.IO.Path]::Combine([Environment]::GetFolderPath('Desktop'), 'Elena PRO - Apagar.lnk')); $Shortcut.TargetPath = '%SCRIPT_STOP%'; $Shortcut.WorkingDirectory = '%DESTINO%'; $Shortcut.Save()"

echo - Accesos directos creados exitosamente en tu Escritorio.
echo.
echo =======================================================================
echo          ¡INSTALACIÓN COMPLETADA CON ÉXITO EN %DESTINO%!
echo =======================================================================
echo.
echo El sistema está listo para ser usado.
echo 1. Haz doble clic en el icono "Elena PRO" en tu Escritorio para iniciar el sistema.
echo 2. El sistema se abrirá automáticamente en tu navegador.
echo 3. Para apagarlo de forma segura, usa el acceso directo "Elena PRO - Apagar".
echo.
pause
