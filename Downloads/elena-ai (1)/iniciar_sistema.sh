#!/bin/bash

# Elena PRO - Iniciar Sistema Farmacéutico Local en macOS/Linux
echo "======================================================================="
echo "                ELENA PRO - SISTEMA DE GESTIÓN FARMACÉUTICA"
echo "                        INICIO DE SERVICIO LOCAL"
echo "======================================================================="
echo ""

# Verificar si Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js no está instalado en este sistema."
    echo "Por favor, descarga e instala Node.js (Versión LTS desde https://nodejs.org/) e inténtalo de nuevo."
    echo ""
    exit 1
fi

# Crear directorio de datos si no existe
if [ ! -d "data" ]; then
    echo "[INFO] Creando directorio local de base de datos 'data/'..."
    mkdir -p data
fi

# Crear archivo de variables de entorno .env si no existe
if [ ! -f ".env" ]; then
    echo "[INFO] Creando archivo de configuración local .env desde la plantilla..."
    cp .env.example .env
    echo "[ALERTA] Se ha creado un archivo '.env' en la raíz del proyecto."
    echo "Si deseas habilitar el asistente de Inteligencia Artificial Elena AI,"
    echo "edita el archivo '.env' con tu editor de texto favorito e ingresa tu GEMINI_API_KEY."
    echo ""
fi

# Instalar dependencias si no existen
if [ ! -d "node_modules" ]; then
    echo "[INFO] Instalando dependencias del sistema... (Esto puede tardar unos minutos)"
    npm install
    if [ $? -ne 0 ]; then
        echo "[ERROR] Hubo un problema al instalar las dependencias."
        echo "Asegúrate de estar conectado a internet durante la primera instalación."
        exit 1
    fi
fi

# Compilar para producción si no se ha hecho antes
if [ ! -d "dist" ]; then
    echo "[INFO] Compilando módulos del sistema para máximo rendimiento..."
    npm run build
fi

echo "[INFO] Iniciando el servidor local de Elena PRO..."
echo "El sistema se abrirá automáticamente en tu navegador web."
echo "(Para detener el sistema, presiona Ctrl+C en esta terminal)."
echo ""

# Abrir el navegador por defecto
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000
elif command -v open &> /dev/null; then
    open http://localhost:3000
fi

# Iniciar el servicio en producción
npm start
