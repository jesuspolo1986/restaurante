@echo off
title GastroLocal - Diagnostico y Prueba de Inicio
color 0E
cd /d "%~dp0"

echo =================================================================
echo        GASTROLOCAL - MODO DE PRUEBA Y DIAGNOSTICO
echo =================================================================
echo.
echo Este script ejecutara GastroLocal mostrando todos los detalles
echo en esta ventana para identificar la causa exacta del cierre.
echo.

:: 1. Cerrar cualquier instancia previa
echo [1/3] Limpiando procesos previos...
taskkill /F /IM GastroLocal.exe >nul 2>&1
timeout /t 1 /nobreak >nul

:: 2. Verificar ejecutable o Python
echo [2/3] Buscando ejecutable o entorno de Python...

if exist "%~dp0GastroLocal.exe" (
    echo Ejecutando GastroLocal.exe directamente...
    "%~dp0GastroLocal.exe"
    goto :fin
)

if exist "%~dp0dist\GastroLocal.exe" (
    echo Ejecutando dist\GastroLocal.exe directamente...
    "%~dp0dist\GastroLocal.exe"
    goto :fin
)

where python >nul 2>&1
if %errorlevel% equ 0 (
    echo Ejecutando con Python en modo diagnostico...
    python diagnostico_lanzador.py
    goto :fin
)

where py >nul 2>&1
if %errorlevel% equ 0 (
    echo Ejecutando con Python (py) en modo diagnostico...
    py diagnostico_lanzador.py
    goto :fin
)

echo.
echo [ERROR] No se encontro ni GastroLocal.exe ni Python en esta maquina.

:fin
echo.
echo =================================================================
echo  La ejecucion ha finalizado.
echo  Revisa el archivo 'gastro_diagnostico.log' o los mensajes arriba.
echo =================================================================
echo.
pause
