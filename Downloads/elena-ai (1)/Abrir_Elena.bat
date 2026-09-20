@echo off
title ELENA PRO - SERVIDOR FARMACEUTICO LOCAL
color 0A
cls
echo =======================================================================
echo                 ELENA PRO - SISTEMA DE GESTION FARMACEUTICA
echo                         INICIO DE SERVICIO LOCAL
echo =======================================================================
echo.

:: Detectar directorio del script para ejecutarse siempre desde la carpeta correcta
cd /d "%~dp0"

:: 1. Verificar si Node.js esta instalado
node -v >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR CRITICO] Node.js no esta instalado en esta PC.
    echo Por favor, instala Node.js LTS desde https://nodejs.org/ e reintenta.
    echo.
    pause
    exit /b
)

:: 2. Crear carpeta de datos si no existe
if not exist "data" (
    echo [INFO] Creando directorio de datos 'data/'...
    mkdir data
)

:: 3. Verificar archivo de configuracion .env
if not exist ".env" (
    if exist ".env.example" (
        echo [INFO] Generando archivo de configuracion .env...
        copy .env.example .env >nul
    )
)

:: 4. Verificar e instalar dependencias completas del sistema
if not exist "node_modules\@supabase\supabase-js" (
    echo [INFO] Detectadas librerias faltantes (Supabase / QR / Red). Sincronizando dependencias...
    call npm install
) else if not exist "node_modules\qrcode" (
    echo [INFO] Instalando libreria de codigos QR para celulares...
    call npm install
)

:: 5. Compilar si no existe la carpeta dist
if not exist "dist\server.cjs" (
    echo [INFO] Compilando modulos de Elena PRO para maximo rendimiento...
    call npm run build
)

echo.
echo =======================================================================
echo  🚀 ELENA PRO SERVIDOR EN LINEA
echo.
echo  🖥️  ACCESO DESDE ESTA PC:
echo      👉 http://localhost:3000
echo.
echo  📱 PARA CONECTAR CELULARES, TABLETS U OTRAS PCS DE LA RED:
echo      👉 Abre la app en esta PC y haz clic en "Conectar Celulares"
echo      👉 Escanea el Código QR que aparece en pantalla.
echo =======================================================================
echo.

:: Abrir navegador automaticamente
start http://localhost:3000

:: Iniciar el servidor Node.js
node dist/server.cjs

pause
