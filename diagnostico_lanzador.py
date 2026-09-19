import sys
import os
import time
import traceback
from datetime import datetime

# 1. Determinar el directorio base de ejecución (soporta PyInstaller .exe y script .py)
if getattr(sys, 'frozen', False):
    BASE_DIR = os.path.dirname(sys.executable)
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Asegurar que el CWD sea el directorio base
try:
    os.chdir(BASE_DIR)
except Exception:
    pass

# Directorio para archivos de log
LOG_DIR = BASE_DIR
try:
    # Probar si el directorio base es escribible
    test_file = os.path.join(BASE_DIR, f".write_test_{os.getpid()}.tmp")
    with open(test_file, "w") as f:
        f.write("ok")
    os.remove(test_file)
except Exception:
    # Si no es escribible (ej. Program Files), usar APPDATA
    if os.name == 'nt':
        appdata = os.environ.get('APPDATA', os.path.expanduser('~'))
        LOG_DIR = os.path.join(appdata, 'GastroLocal')
    else:
        LOG_DIR = os.path.expanduser('~/.gastrolocal')
    os.makedirs(LOG_DIR, exist_ok=True)

DIAGNOSTIC_LOG = os.path.join(LOG_DIR, "gastro_diagnostico.log")

def log_event(message, level="INFO"):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    formatted = f"[{timestamp}] [{level}] {message}\n"
    try:
        with open(DIAGNOSTIC_LOG, "a", encoding="utf-8", errors="replace") as f:
            f.write(formatted)
            f.flush()
    except Exception:
        pass
    try:
        if sys.__stdout__:
            sys.__stdout__.write(formatted)
            sys.__stdout__.flush()
    except Exception:
        pass

def show_popup(title, message, is_error=True):
    """Muestra un cuadro de diálogo nativo en Windows para que el usuario sepa qué ocurrió."""
    try:
        if os.name == 'nt':
            import ctypes
            icon = 0x10 if is_error else 0x40 # MB_ICONERROR or MB_ICONINFORMATION
            ctypes.windll.user32.MessageBoxW(0, str(message), str(title), icon)
    except Exception:
        pass

# Stream que captura todas las llamadas de salida estándar y error
class DiagnosticStream:
    def __init__(self, prefix):
        self.prefix = prefix

    def write(self, text):
        if not text or text.isspace():
            return
        log_event(text.rstrip(), level=self.prefix)

    def flush(self):
        pass

    def isatty(self):
        return False

# Iniciar logging
log_event("=" * 60)
log_event("INICIANDO GASTROLOCAL CON ENVOLTORIO DE DIAGNÓSTICO")
log_event(f"Python Version: {sys.version}")
log_event(f"Ejecutable: {sys.executable}")
log_event(f"Base Dir: {BASE_DIR}")
log_event(f"Log Dir: {LOG_DIR}")
log_event(f"Log Path: {DIAGNOSTIC_LOG}")
log_event(f"Argumentos: {sys.argv}")
log_event("=" * 60)

# Redirigir stdout y stderr para atrapar cualquier salida o print silencioso
sys.stdout = DiagnosticStream("STDOUT")
sys.stderr = DiagnosticStream("STDERR")

def main():
    try:
        log_event("Paso 1: Verificando dependencias e importando el módulo del servidor...")
        import gastro_local_pc_server as server_module
        log_event("Paso 1: Módulo 'gastro_local_pc_server' importado con éxito.")

        log_event("Paso 2: Verificando la carga de la base de datos local...")
        db = server_module.load_db()
        cat_count = len(db.get("categories", []))
        prod_count = len(db.get("products", []))
        log_event(f"Paso 2: Base de datos cargada ({cat_count} categorías, {prod_count} productos).")

        log_event("Paso 3: Verificando dirección IP y puerto de red...")
        port = server_module.PORT
        ip = server_module.get_ip_address()
        log_event(f"Paso 3: IP detectada: {ip} | Puerto configurado: {port}")

        log_event("Paso 4: Creando instancia del servidor HTTP...")
        server = server_module.GastroServer(('0.0.0.0', port), server_module.GastroRequestHandler)
        log_event(f"Paso 4: Servidor HTTP vinculado exitosamente a 0.0.0.0:{port}")

        log_event("Paso 5: Lanzando hilo para abrir el navegador en http://localhost:{port}/admin...")
        import threading
        import webbrowser
        
        def open_browser_delayed():
            time.sleep(1.2)
            url = f"http://localhost:{port}/admin"
            log_event(f"Abriendo navegador en: {url}")
            try:
                webbrowser.open(url)
            except Exception as e:
                log_event(f"Aviso al abrir webbrowser: {e}", level="WARN")
                if os.name == 'nt':
                    try:
                        os.system(f'start {url}')
                    except Exception:
                        pass

        threading.Thread(target=open_browser_delayed, daemon=True).start()

        log_event("Paso 6: Servidor en funcionamiento. Iniciando bucle principal (serve_forever)...")
        server.serve_forever()

    except Exception as e:
        error_msg = traceback.format_exc()
        log_event(f"CRASH DETECTADO:\n{error_msg}", level="CRITICAL")
        
        user_message = (
            "GastroLocal no pudo iniciar correctamente.\n\n"
            f"Detalle del error:\n{str(e)}\n\n"
            f"El informe completo ha sido guardado en:\n{DIAGNOSTIC_LOG}"
        )
        show_popup("Error de Inicio - GastroLocal", user_message, is_error=True)
        
        # Mantener la consola abierta en caso de ejecutarse desde CMD
        time.sleep(3)
        sys.exit(1)

if __name__ == '__main__':
    main()
