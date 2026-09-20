@echo off
title Elena PRO - Iniciar Sistema Farmacéutico Local
echo =======================================================================
echo                 ELENA PRO - SISTEMA DE GESTION FARMACEUTICA
echo                         INICIO DE SERVICIO LOCAL
echo =======================================================================
echo.

:: Verificar si Node.js está instalado
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado en este computador.
    echo Por favor, descarga e instala Node.js (Version LTS de https://nodejs.org/^)
    echo e intenta ejecutar este archivo de nuevo.
    echo.
    pause
    exit /b
)

:: Verificar si existe la carpeta de datos
if not exist "data" (
    echo [INFO] Creando directorio local de base de datos "data/"...
    mkdir data
)

:: Verificar archivo de variables de entorno .env
if not exist ".env" (
    echo [INFO] Creando archivo de configuracion local .env desde la plantilla...
    copy .env.example .env >nul
    echo [ALERTA] Se ha creado un archivo ".env" en la raiz del proyecto.
    echo Si deseas habilitar el asistente de Inteligencia Artificial Elena AI,
    echo edita el archivo ".env" con un bloc de notas e ingresa tu GEMINI_API_KEY.
    echo.
)

:: Instalar dependencias si no existen
if not exist "node_modules" (
    echo [INFO] Instalando dependencias del sistema... (Esto puede tardar unos minutos^)
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Hubo un problema al instalar las dependencias. 
        echo Asegurate de estar conectado a internet durante la primera instalacion.
        pause
        exit /b
    )
)

:: Compilar la aplicacion para produccion si no se ha hecho antes
if not exist "dist" (
    echo [INFO] Compilando modulos del sistema para maximo rendimiento...
    call npm run build
)

echo [INFO] Iniciando el servidor local de Elena PRO...
echo El sistema se abrira automaticamente en tu navegador web en breves segundos.
echo (Para detener el sistema, cierra esta ventana de comandos^).
echo.

:: Abrir navegador por defecto en localhost:3000
start http://localhost:3000

:: Iniciar el servicio en produccion
call npm start

pause
