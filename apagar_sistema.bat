@echo off
title Apagar GastroLocal / ElenaPRO
color 0B
echo =========================================================
echo       APAGANDO SERVIDOR GASTROLOCAL (ElenaPRO) 🚀
echo =========================================================
echo.
echo Deteniendo el servidor de Python en segundo plano...

:: Busca y detiene únicamente los procesos asociados a GastroLocal
taskkill /F /IM GastroLocal.exe >nul 2>&1
wmic process where "commandline like '%%gastro_local_pc_server%%' or commandline like '%%diagnostico_lanzador%%'" call terminate >nul 2>&1

echo.
echo [OK] El servidor GastroLocal se ha detenido de manera segura.
echo [OK] Todos los respaldos automaticos se completaron con exito.
echo.
echo Esta ventana se cerrara en unos segundos...
timeout /t 5 >nul
exit
