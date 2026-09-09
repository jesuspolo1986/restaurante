#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
GastroLocal - Servidor Web de Escritorio Autónomo 🚀
Este script permite correr GastroLocal directamente en tu PC/Mac de forma local
sin necesidad de emuladores de Android.

Inicia un servidor de red que:
1. Distribuye el Menú Digital para tablets y celulares de clientes.
2. Proporciona un Panel de Administración interactivo en la PC (http://localhost:8080/admin)
   para ver pedidos en tiempo real, actualizar la tasa del dólar, gestionar stock y productos.
"""

import os
import sys
import json
import socket
import urllib.parse
import uuid
import traceback
import threading
import secrets
import time
import html
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from datetime import datetime

# Asegurar UTF-8 en streams estándar de Windows para evitar UnicodeEncodeError
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass


# Determinar el directorio base de la aplicación de forma robusta
if getattr(sys, 'frozen', False):
    # Ejecutándose como .exe empaquetado (PyInstaller)
    APP_DIR = os.path.dirname(sys.executable)
else:
    # Ejecutándose como script .py normal
    APP_DIR = os.path.dirname(os.path.abspath(__file__))

# Asegurar que el directorio de trabajo sea siempre la carpeta de la app
try:
    os.chdir(APP_DIR)
except Exception:
    pass

# Determinar carpeta de datos escribible (AppDir o %APPDATA%\GastroLocal si AppDir está protegido)
def get_writable_data_dir():
    test_file = os.path.join(APP_DIR, f".test_write_{os.getpid()}.tmp")
    try:
        with open(test_file, "w") as f:
            f.write("ok")
        try:
            os.remove(test_file)
        except Exception:
            pass
        return APP_DIR
    except Exception:
        if os.name == 'nt':
            appdata = os.environ.get('APPDATA', os.path.expanduser('~'))
            user_data_dir = os.path.join(appdata, 'GastroLocal')
        else:
            user_data_dir = os.path.expanduser('~/.gastrolocal')
        try:
            os.makedirs(user_data_dir, exist_ok=True)
            # Copiar data.json inicial si existe en APP_DIR y no en user_data_dir
            src_db = os.path.join(APP_DIR, "data.json")
            dst_db = os.path.join(user_data_dir, "data.json")
            if os.path.exists(src_db) and not os.path.exists(dst_db):
                import shutil
                shutil.copy2(src_db, dst_db)
        except Exception:
            pass
        return user_data_dir

DATA_DIR = get_writable_data_dir()
DB_FILE = os.path.join(DATA_DIR, "data.json")
LOG_FILE = os.path.join(DATA_DIR, "gastro_server.log")

# Stream seguro para evitar crashes con stdout/stderr None en Windows (--noconsole)
class SafeStream:
    def __init__(self, original_stream, log_file_path=None):
        self.original_stream = original_stream
        self.log_file_path = log_file_path

    def write(self, text):
        if not text:
            return
        if self.original_stream:
            try:
                self.original_stream.write(text)
            except Exception:
                pass
        if self.log_file_path:
            try:
                with open(self.log_file_path, "a", encoding="utf-8", errors="replace") as f:
                    f.write(text)
            except Exception:
                pass

    def flush(self):
        if self.original_stream:
            try:
                self.original_stream.flush()
            except Exception:
                pass

    def isatty(self):
        return False

# Redirigir streams de salida a log seguro
sys.stdout = SafeStream(sys.stdout, LOG_FILE)
sys.stderr = SafeStream(sys.stderr, LOG_FILE)

PORT = int(os.environ.get("PORT", sys.argv[1] if len(sys.argv) > 1 and sys.argv[1].isdigit() else 8080))
SESSION_TOKEN = str(uuid.uuid4())
DB_LOCK = threading.RLock()
SESSION_LOCK = threading.RLock()
# Almacén seguro de sesiones administrativas en memoria: token -> timestamp expiración (7 días inicial para la PC principal)
ACTIVE_ADMIN_SESSIONS = { SESSION_TOKEN: time.time() + 86400 * 7 }

def show_native_error(title, message):
    """Muestra un cuadro de diálogo nativo en Windows en caso de fallo crítico en lugar de cerrarse en silencio."""
    try:
        log_path = os.path.join(DATA_DIR, "gastro_error.log")
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {title}: {message}\n")
    except Exception:
        pass
    try:
        if os.name == 'nt':
            import ctypes
            ctypes.windll.user32.MessageBoxW(0, str(message), str(title), 0x10)
    except Exception:
        pass
    try:
        sys.stderr.write(f"[{title}] {message}\n")
    except Exception:
        pass

class GastroServer(ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True

    def __init__(self, server_address, RequestHandlerClass, bind_and_activate=True):
        host, port = server_address
        # Si el puerto solicitado está ocupado, probar automáticamente puertos alternativos (8080, 8081, 8082, 8085, 9090)
        ports_to_try = [port] + [p for p in [8080, 8081, 8082, 8085, 8090, 8888, 9090] if p != port]
        last_err = None
        for p in ports_to_try:
            try:
                self.server_address = (host, p)
                ThreadingHTTPServer.__init__(self, (host, p), RequestHandlerClass, bind_and_activate)
                global PORT
                PORT = p
                return
            except OSError as e:
                last_err = e
                continue
        if last_err:
            raise last_err

# Datos iniciales por defecto (idénticos a la base de datos de la App de Android)
DEFAULT_DATA = {
    "categories": [
        {"id": 1, "name": "Platos Fuertes", "iconName": "restaurant", "station": "kitchen"},
        {"id": 2, "name": "Entradas", "iconName": "fastfood", "station": "kitchen"},
        {"id": 3, "name": "Bebidas", "iconName": "wine_bar", "station": "bar"},
        {"id": 4, "name": "Postres", "iconName": "cake", "station": "kitchen"}
    ],
    "products": [
        {
            "id": 1,
            "name": "Pabellón Criollo",
            "description": "Delicioso plato tradicional venezolano con arroz blanco, caraotas negras guisadas, carne mechada jugosa y tajadas de plátano frito.",
            "priceUsd": 8.50,
            "categoryId": 1,
            "stock": 30,
            "isAvailable": True,
            "imageUri": "pabellon",
            "modifiers": [
                {"name": "Queso Llanero Extra", "priceUsd": 1.00},
                {"name": "Aguacate Maduro", "priceUsd": 0.80},
                {"name": "Tajadas Extras", "priceUsd": 1.20},
                {"name": "Sin Cebolla", "priceUsd": 0.00}
            ]
        },
        {
            "id": 2,
            "name": "Asado Negro",
            "description": "Muchacho redondo horneado lentamente en un almíbar de papelón caramelizado con vino tinto y especias.",
            "priceUsd": 9.50,
            "categoryId": 1,
            "stock": 25,
            "isAvailable": True,
            "imageUri": "asado",
            "modifiers": [
                {"name": "Salsa de Papelón Extra", "priceUsd": 0.50},
                {"name": "Porción de Puré", "priceUsd": 1.50},
                {"name": "Arroz Extra", "priceUsd": 1.00}
            ]
        },
        {
            "id": 3,
            "name": "Arepa Reina Pepiada",
            "description": "Arepa de maíz tostada rellena de ensalada cremosa de pollo desmechado, aguacate maduro, mayonesa casera y un toque de cilantro.",
            "priceUsd": 4.50,
            "categoryId": 1,
            "stock": 100,
            "isAvailable": True,
            "imageUri": "arepa",
            "modifiers": [
                {"name": "Queso Amarillo Extra", "priceUsd": 1.00},
                {"name": "Extra Aguacate", "priceUsd": 0.80},
                {"name": "Tocineta Crujiente", "priceUsd": 1.50},
                {"name": "Sin Mayonesa", "priceUsd": 0.00}
            ]
        },
        {
            "id": 4,
            "name": "Tequeños de Queso (5 uds)",
            "description": "Deditos crujientes de masa rellenos de sabroso queso blanco llanero fritos al momento. Se acompañan con salsa de ajo.",
            "priceUsd": 3.50,
            "categoryId": 2,
            "stock": 60,
            "isAvailable": True,
            "imageUri": "tequenos",
            "modifiers": [
                {"name": "Salsa Tártara Extra", "priceUsd": 0.50},
                {"name": "Salsa de Ajo Extra", "priceUsd": 0.50},
                {"name": "Ración Doble (10 uds)", "priceUsd": 3.00}
            ]
        },
        {
            "id": 5,
            "name": "Empanaditas de Cazón (3 uds)",
            "description": "Empanadas de masa de maíz dulce rellenas de cazón (tiburón pequeño) desmechado, sofrito y frito.",
            "priceUsd": 3.00,
            "categoryId": 2,
            "stock": 40,
            "isAvailable": True,
            "imageUri": "empanadas",
            "modifiers": [
                {"name": "Guasacaca Extra", "priceUsd": 0.50},
                {"name": "Picante Casero", "priceUsd": 0.00}
            ]
        },
        {
            "id": 6,
            "name": "Chicha Criolla",
            "description": "Bebida tradicional cremosa hecha a base de arroz cocido con canela, servida fría con hielo y generosa leche condensada.",
            "priceUsd": 2.50,
            "categoryId": 3,
            "stock": 35,
            "isAvailable": True,
            "imageUri": "chicha",
            "modifiers": [
                {"name": "Extra Leche Condensada", "priceUsd": 0.50},
                {"name": "Canela Extra", "priceUsd": 0.00},
                {"name": "Topping de Galleta", "priceUsd": 0.75}
            ]
        },
        {
            "id": 7,
            "name": "Papelón con Limón",
            "description": "Bebida típica ultra refrescante y natural preparada con papelón y jugo de limón fresco recién exprimido.",
            "priceUsd": 1.50,
            "categoryId": 3,
            "stock": 80,
            "isAvailable": True,
            "imageUri": "papelon",
            "modifiers": [
                {"name": "Vaso Grande 500ml", "priceUsd": 0.80},
                {"name": "Extra Hielo", "priceUsd": 0.00}
            ]
        },
        {
            "id": 8,
            "name": "Quesillo Tradicional",
            "description": "El postre favorito: flan cremoso de leche condensada aromatizado con ron venezolano y bañado en caramelo oscuro.",
            "priceUsd": 2.80,
            "categoryId": 4,
            "stock": 20,
            "isAvailable": True,
            "imageUri": "quesillo",
            "modifiers": [
                {"name": "Porción Doble", "priceUsd": 2.00},
                {"name": "Topping de Ron Añejo", "priceUsd": 0.50}
            ]
        },
        {
            "id": 9,
            "name": "Tres Leches",
            "description": "Delicioso bizcocho bañado en tres tipos de leche (evaporada, condensada y crema), decorado con merengue y canela molida.",
            "priceUsd": 3.20,
            "categoryId": 4,
            "stock": 15,
            "isAvailable": True,
            "imageUri": "tresleches",
            "modifiers": [
                {"name": "Extra Canela", "priceUsd": 0.00},
                {"name": "Topping de Fresa", "priceUsd": 0.80}
            ]
        }
    ],
    "config": {
        "exchangeRateBs": 42.50,
        "totalTables": 10,
        "restaurantName": "GastroLocal Criollo",
        "restaurantSlogan": "Sabor Tradicional & Calidad",
        "restaurantLogo": "",
        "restaurantRif": "J-50123456-7",
        "restaurantAddress": "Av. Principal, C.C. Gourmet Plaza, Nivel PB, Local 04",
        "restaurantPhone": "+58 412-1234567",
        "restaurantInstagram": "@gastrolocal_criollo",
        "ticketFooter": "¡Muchas gracias por su visita y preferencia!\nClave WiFi: Gastro2026\nEscanee el código QR para volver a pedir.",
        "pagoMovil": {
            "bank": "0134 - Banesco",
            "phone": "0412-1234567",
            "idNumber": "V-12345678",
            "accountName": "Restaurante GastroLocal C.A."
        }
    },
    "orders": []
}

def load_db():
    with DB_LOCK:
        if not os.path.exists(DB_FILE):
            try:
                os.makedirs(os.path.dirname(DB_FILE), exist_ok=True)
                tmp_file = DB_FILE + f".tmp_{os.getpid()}_{int(time.time()*1000)}"
                with open(tmp_file, "w", encoding="utf-8") as f:
                    json.dump(DEFAULT_DATA, f, indent=4, ensure_ascii=False)
                    f.flush()
                    os.fsync(f.fileno())
                os.replace(tmp_file, DB_FILE)
            except Exception as e:
                sys.stderr.write(f"Aviso al crear DB_FILE: {e}\n")
            return DEFAULT_DATA
        try:
            with open(DB_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                # Asegurar campos de configuración por defecto si faltan
                if "config" not in data:
                    data["config"] = {}
                for k, v in DEFAULT_DATA["config"].items():
                    if k not in data["config"]:
                        data["config"][k] = v
                for cat in data.get("categories", []):
                    if "station" not in cat:
                        cat["station"] = "bar" if "bebida" in cat.get("name", "").lower() or "trago" in cat.get("name", "").lower() else "kitchen"
                for prod in data.get("products", []):
                    if "modifiers" not in prod:
                        prod["modifiers"] = []
                return data
        except Exception as e:
            sys.stderr.write(f"Aviso al leer DB_FILE: {e}\n")
            return DEFAULT_DATA

def save_db(data):
    with DB_LOCK:
        try:
            os.makedirs(os.path.dirname(DB_FILE), exist_ok=True)
            tmp_file = DB_FILE + f".tmp_{os.getpid()}_{int(time.time()*1000)}"
            with open(tmp_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=4, ensure_ascii=False)
                f.flush()
                os.fsync(f.fileno())
            os.replace(tmp_file, DB_FILE)
        except Exception as e:
            sys.stderr.write(f"Error al guardar DB_FILE de forma atómica: {e}\n")
            # Respaldo directo en caso de fallo en replace
            try:
                with open(DB_FILE, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=4, ensure_ascii=False)
            except Exception as e2:
                sys.stderr.write(f"Fallo crítico de guardado en DB_FILE: {e2}\n")

def get_ip_address():
    # 1. Probar ruta de red local (funciona con o sin Internet)
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.5)
        s.connect(('10.255.255.255', 1))
        ip = s.getsockname()[0]
        s.close()
        if ip and not ip.startswith('127.'):
            return ip
    except Exception:
        pass

    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.5)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        if ip and not ip.startswith('127.'):
            return ip
    except Exception:
        pass

    # 2. Obtener por hostname del sistema
    try:
        hostname = socket.gethostname()
        ip = socket.gethostbyname(hostname)
        if ip and not ip.startswith('127.'):
            return ip
    except Exception:
        pass

    try:
        hostname = socket.gethostname()
        _, _, ips = socket.gethostbyname_ex(hostname)
        for ip in ips:
            if ip and not ip.startswith('127.') and not ip.startswith('169.254.'):
                return ip
        if ips:
            return ips[0]
    except Exception:
        pass

    return '127.0.0.1'


import hashlib
import calendar

# Secret Salt for offline verification (can be changed by developer)
SECRET_LICENSE_SALT = "GASTRO_OFFLINE_SECRET_2026_PRO"

def get_days_in_month(year, month):
    return calendar.monthrange(year, month)[1]

def generate_activation_code(installation_id, target_period):
    # target_period is like "2026-08"
    input_str = f"{installation_id}:{target_period}:{SECRET_LICENSE_SALT}"
    return hashlib.sha256(input_str.encode("utf-8")).hexdigest()[:8].upper()

def verify_license_state(db):
    """
    Verifies license state in the database.
    Returns:
       dict: {
          "status": "active" | "expired" | "clock_tampering",
          "installationId": str,
          "expirationDate": str,
          "message": str
       }
    """
    if "config" not in db:
        db["config"] = {}
        
    config = db["config"]
    
    # 1. Ensure Installation ID exists
    if "installationId" not in config:
        import random
        # Generate a unique offline installation ID: GL-XXXX-XXXX
        chars = "0123456789ABCDEF"
        part1 = "".join(random.choices(chars, k=4))
        part2 = "".join(random.choices(chars, k=4))
        config["installationId"] = f"GL-{part1}-{part2}"
        save_db(db)
        
    installation_id = config["installationId"]
    
    # 2. Ensure activeLicenseUntil exists (default 15 days trial)
    if "activeLicenseUntil" not in config:
        from datetime import timedelta
        trial_expiration = (datetime.now() + timedelta(days=15)).strftime("%Y-%m-%d")
        config["activeLicenseUntil"] = trial_expiration
        save_db(db)
        
    # Ensure lastSeenDate exists to prevent rollbacks
    if "lastSeenDate" not in config:
        config["lastSeenDate"] = datetime.now().strftime("%Y-%m-%d")
        save_db(db)
        
    expiration_str = config["activeLicenseUntil"]
    last_seen_str = config["lastSeenDate"]
    
    # Parse dates safely
    try:
        today_date = datetime.now().date()
        expiration_date = datetime.strptime(expiration_str, "%Y-%m-%d").date()
        last_seen_date = datetime.strptime(last_seen_str, "%Y-%m-%d").date()
    except Exception:
        today_date = datetime.now().date()
        expiration_date = today_date
        last_seen_date = today_date
        config["activeLicenseUntil"] = today_date.strftime("%Y-%m-%d")
        config["lastSeenDate"] = today_date.strftime("%Y-%m-%d")
        save_db(db)

    # Check clock rollback
    if today_date < last_seen_date:
        return {
            "status": "clock_tampering",
            "installationId": installation_id,
            "expirationDate": expiration_str,
            "message": f"Se detectó una alteración en el reloj de la PC. Última fecha registrada: {last_seen_str}. Reloj actual: {today_date.strftime('%Y-%m-%d')}."
        }
        
    # Update last seen date
    if today_date > last_seen_date:
        config["lastSeenDate"] = today_date.strftime("%Y-%m-%d")
        save_db(db)
        
    # Check if expired
    if today_date > expiration_date:
        return {
            "status": "expired",
            "installationId": installation_id,
            "expirationDate": expiration_str,
            "message": f"La licencia de uso expiró el {expiration_str}. Solicite un código mensual para reactivar el sistema."
        }
        
    return {
        "status": "active",
        "installationId": installation_id,
        "expirationDate": expiration_str,
        "message": f"Licencia activa hasta {expiration_str}."
    }


class GastroRequestHandler(BaseHTTPRequestHandler):
    
    def log_message(self, format, *args):
        # Desactivar logs pesados en consola para una experiencia limpia
        pass

    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Admin-Token, Authorization")

    def is_authorized_admin(self, post_params=None):
        token = self.headers.get("X-Admin-Token")
        if not token:
            auth = self.headers.get("Authorization", "")
            if auth.startswith("Bearer "):
                token = auth[7:].strip()
            elif auth:
                token = auth.strip()
        if not token and post_params and isinstance(post_params, dict):
            token = post_params.get("adminToken")
        if not token:
            parsed = urllib.parse.urlparse(self.path)
            qs = urllib.parse.parse_qs(parsed.query)
            if "token" in qs:
                token = qs["token"][0]
                
        if not token:
            return False
            
        with SESSION_LOCK:
            exp = ACTIVE_ADMIN_SESSIONS.get(token)
            if exp and exp > time.time():
                ACTIVE_ADMIN_SESSIONS[token] = time.time() + 86400  # Renovar ventana activa de 24h
                return True
        return False

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_cors_headers()
        self.end_headers()

    def do_GET(self):
        db = load_db()
        lic_state = verify_license_state(db)
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path

        if lic_state["status"] != "active":
            if path.startswith("/api/"):
                self.send_response(403)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({
                    "status": "blocked",
                    "reason": lic_state["status"],
                    "message": lic_state["message"],
                    "installationId": lic_state["installationId"]
                }, ensure_ascii=False).encode("utf-8"))
            else:
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_cors_headers()
                self.end_headers()
                html = self.get_license_locked_html(lic_state)
                self.wfile.write(html.encode("utf-8"))
            return

        # 1. MENU DIGITAL CLIENTE (Página de Inicio)
        if path == "/":
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_cors_headers()
            self.end_headers()
            
            categories_json = json.dumps(db["categories"], ensure_ascii=False)
            # Solo enviar productos activos y disponibles
            active_products = [p for p in db["products"] if p.get("isAvailable", True)]
            products_json = json.dumps(active_products, ensure_ascii=False)
            exchange_rate = db["config"]["exchangeRateBs"]

            html = self.get_client_menu_html(db, categories_json, products_json, exchange_rate)
            self.wfile.write(html.encode("utf-8"))

        # 2. PANEL DE ADMINISTRACIÓN / COCINA (Para la PC)
        elif path == "/admin":
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_cors_headers()
            self.end_headers()
            
            html = self.get_admin_panel_html(db)
            self.wfile.write(html.encode("utf-8"))

        # API - OBTENER CONFIGURACIÓN DEL NEGOCIO
        elif path == "/api/config":
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(db.get("config", {}), ensure_ascii=False).encode("utf-8"))

        # 3. API - OBTENER PRODUCTOS
        elif path == "/api/products":
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(db["products"], ensure_ascii=False).encode("utf-8"))

        # 4. API - OBTENER PEDIDOS (Para actualización en tiempo real en /admin)
        elif path == "/api/orders":
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(db["orders"], ensure_ascii=False).encode("utf-8"))

        # API - OBTENER CATEGORÍAS (Para sincronizar categorías de menú)
        elif path == "/api/categories":
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(db["categories"], ensure_ascii=False).encode("utf-8"))

        # API - OBTENER ESTADOS Y SILLAS DE MESAS
        elif path == "/api/table-states":
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(db.get("tableStates", {}), ensure_ascii=False).encode("utf-8"))

        # 5. VISTA SIMPLIFICADA PARA COCINA (KDS)
        elif path == "/kitchen":
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_cors_headers()
            self.end_headers()
            
            html = self.get_kitchen_view_html(db)
            self.wfile.write(html.encode("utf-8"))

                # 7. VISTA MOVIL DE MOZO / CAMARERO (/waiter)
        elif path == "/waiter":
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_cors_headers()
            self.end_headers()
            
            html = self.get_waiter_view_html(db)
            self.wfile.write(html.encode("utf-8"))

        # 6. TICKET / COMPROBANTE DE PAGO EN PDF Y VISTA STANDALONE
        elif path == "/ticket" or path.startswith("/ticket/"):
            query_params = urllib.parse.parse_qs(parsed_path.query)
            order_id = None
            if "id" in query_params:
                try:
                    order_id = int(query_params["id"][0])
                except Exception:
                    order_id = None
            elif path.startswith("/ticket/"):
                parts = path.strip("/").split("/")
                if len(parts) >= 2 and parts[1].isdigit():
                    order_id = int(parts[1])
            
            target_order = None
            if order_id is not None:
                target_order = next((o for o in db.get("orders", []) if o.get("id") == order_id), None)
            elif db.get("orders"):
                target_order = db["orders"][0]
                
            if target_order:
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_cors_headers()
                self.end_headers()
                html = self.get_ticket_html(db, target_order)
                self.wfile.write(html.encode("utf-8"))
            else:
                self.send_response(404)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(b"<!DOCTYPE html><html><body style='font-family:sans-serif;text-align:center;padding:50px;'><h2>Ticket no encontrado</h2><p>No se encontro un pedido asociado a este numero.</p><a href='/'>Volver al Menu</a></body></html>")

        else:
            self.send_response(404)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(b"No encontrado / Not Found")

    def do_POST(self):
        with DB_LOCK:
            db = load_db()
            lic_state = verify_license_state(db)
            parsed_path = urllib.parse.urlparse(self.path)
            path = parsed_path.path

            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else ""

            # Si el sistema no está activo y NO es la ruta de activación, rechazar la petición
            if lic_state["status"] != "active" and path != "/api/license/activate":
                self.send_response(403)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({
                    "status": "blocked",
                    "reason": lic_state["status"],
                    "message": lic_state["message"],
                    "installationId": lic_state["installationId"]
                }, ensure_ascii=False).encode("utf-8"))
                return

            # ACTIVAR LICENCIA OFFLINE
            if path == "/api/license/activate":
                try:
                    params = json.loads(post_data)
                    code = str(params.get("code", "")).strip().upper()
                    period = str(params.get("period", "")).strip() # format "YYYY-MM" (e.g. "2026-08")
                
                    if not code:
                        raise Exception("El código de activación no puede estar vacío")
                    if not period:
                        raise Exception("El período a activar no puede estar vacío")
                    
                    installation_id = db["config"].get("installationId")
                
                    # Verificar el código de activación
                    expected_code = generate_activation_code(installation_id, period)
                
                    if code == expected_code:
                        year, month = map(int, period.split("-"))
                        days = get_days_in_month(year, month)
                        new_expiration = f"{year:04d}-{month:02d}-{days:02d}"
                    
                        db["config"]["activeLicenseUntil"] = new_expiration
                        db["config"]["lastSeenDate"] = datetime.now().strftime("%Y-%m-%d")
                        save_db(db)
                    
                        self.send_response(200)
                        self.send_header("Content-Type", "application/json; charset=utf-8")
                        self.send_cors_headers()
                        self.end_headers()
                        self.wfile.write(json.dumps({
                            "status": "success",
                            "message": f"¡Licencia activada con éxito hasta el {new_expiration}!",
                            "expirationDate": new_expiration
                        }, ensure_ascii=False).encode("utf-8"))
                    else:
                        self.send_response(400)
                        self.send_header("Content-Type", "application/json; charset=utf-8")
                        self.send_cors_headers()
                        self.end_headers()
                        self.wfile.write(json.dumps({
                            "status": "error",
                            "message": "Código de activación incorrecto o inválido para este período."
                        }, ensure_ascii=False).encode("utf-8"))
                except Exception as e:
                    self.send_response(400)
                    self.send_header("Content-Type", "application/json; charset=utf-8")
                    self.send_cors_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "error", "message": str(e)}, ensure_ascii=False).encode("utf-8"))
                return

            post_data_dict = {}
            if post_data:
                try:
                    post_data_dict = json.loads(post_data)
                except Exception:
                    post_data_dict = {}

            # Validación de seguridad: rutas de administración protegidas por Token de Sesión
            if path.startswith("/api/admin/"):
                # Excepción: La pantalla de cocina (/kitchen) actualizando comanda a PREPARING o READY
                is_kitchen_action = (path == "/api/admin/update-order-status" and 
                                     isinstance(post_data_dict, dict) and 
                                     post_data_dict.get("status") in ["PREPARING", "READY"])
            
                if not is_kitchen_action and not self.is_authorized_admin(post_data_dict):
                    self.send_response(401)
                    self.send_header("Content-Type", "application/json; charset=utf-8")
                    self.send_cors_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        "status": "unauthorized",
                        "message": "Acceso denegado: Token de sesión de administración ausente, inválido o expirado. Ingrese el PIN."
                    }, ensure_ascii=False).encode("utf-8"))
                    return

                        # 1. API - CREAR UN NUEVO PEDIDO DESDE LA TABLET O MOZO
            if path == "/api/order":
                try:
                    order_payload = json.loads(post_data)
                    table_number = order_payload.get("tableNumber", "Para llevar")
                    order_type = order_payload.get("orderType", "TAKEAWAY")
                    payment_method = order_payload.get("paymentMethod", "Efectivo $")
                    waiter_name = str(order_payload.get("waiterName", "")).strip()
                    notes = order_payload.get("notes", "")
                    items_req = order_payload.get("items", [])

                    items_to_order = []
                    total_usd = 0.0

                    for it in items_req:
                        prod_id = int(it["productId"])
                        qty = int(it["quantity"])
                        product = next((p for p in db["products"] if p["id"] == prod_id), None)
                    
                        if product and product.get("stock", 0) >= qty:
                            selected_modifiers = it.get("selectedModifiers", [])
                            # Calcular modificadores
                            mod_total = 0.0
                            sanitized_modifiers = []
                            for m in selected_modifiers:
                                m_name = str(m.get("name", "")).strip()
                                try:
                                    m_price = float(m.get("priceUsd", 0.0))
                                except Exception:
                                    m_price = 0.0
                                if m_name:
                                    mod_total += m_price
                                    sanitized_modifiers.append({"name": m_name, "priceUsd": m_price})

                            unit_total = product["priceUsd"] + mod_total
                            items_to_order.append({
                                "productId": prod_id,
                                "productName": product["name"],
                                "quantity": qty,
                                "priceUsd": product["priceUsd"],
                                "selectedModifiers": sanitized_modifiers,
                                "unitTotalUsd": round(unit_total, 2)
                            })
                            total_usd += unit_total * qty
                            # Reducir stock inmediatamente
                            product["stock"] = max(0, product["stock"] - qty)

                    if items_to_order:
                        new_order_id = len(db["orders"]) + 1
                        payment_ref = str(order_payload.get("paymentReference", "")).strip()
                        payment_origin_bank = str(order_payload.get("paymentOriginBank", "")).strip()
                        payment_phone = str(order_payload.get("paymentPhone", "")).strip()
                        payment_v_status = "PENDING_VERIFICATION" if (payment_method == "Pago Movil" or payment_ref) else "NONE"

                        new_order = {
                            "id": new_order_id,
                            "tableNumber": table_number,
                            "status": "PENDING",  # PENDING, CONFIRMED, READY, DELIVERED, CANCELLED
                            "totalUsd": round(total_usd, 2),
                            "paymentMethod": payment_method,
                            "paymentStatus": "PENDING_CONFIRMATION",
                            "paymentReference": payment_ref,
                            "paymentOriginBank": payment_origin_bank,
                            "paymentPhone": payment_phone,
                            "paymentVerificationStatus": payment_v_status,
                            "orderType": order_type,
                            "waiterName": waiter_name,
                            "notes": notes,
                            "timestamp": datetime.now().strftime("%Y-%m-%d %I:%M %p"),
                            "createdAtIso": datetime.now().isoformat(),
                            "items": items_to_order
                        }
                        db["orders"].insert(0, new_order)  # Agregar al inicio para ver los nuevos primero
                        save_db(db)

                        self.send_response(200)
                        self.send_header("Content-Type", "application/json")
                        self.send_cors_headers()
                        self.end_headers()
                        self.wfile.write(json.dumps({"status": "success", "orderId": new_order_id, "totalUsd": round(total_usd, 2)}).encode("utf-8"))
                    else:
                        self.send_response(400)
                        self.send_header("Content-Type", "application/json")
                        self.send_cors_headers()
                        self.end_headers()
                        self.wfile.write(json.dumps({"status": "error", "message": "Inventario insuficiente o carrito vacio"}).encode("utf-8"))
                except Exception as e:
                    self.send_response(500)
                    self.send_header("Content-Type", "application/json")
                    self.send_cors_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode("utf-8"))

            # 2. ACCIÓN ADMIN - CAMBIAR ESTADO DE UN PEDIDO
            elif path == "/api/admin/update-order-status":
                try:
                    params = json.loads(post_data)
                    order_id = int(params["orderId"])
                    new_status = params["status"]

                    order = next((o for o in db["orders"] if o["id"] == order_id), None)
                    if order:
                        order["status"] = new_status
                        if new_status == "DELIVERED":
                            # We keep the current payment status (e.g. PENDING_CONFIRMATION) so the admin can collect it.
                            pass
                        elif new_status == "CANCELLED":
                            order["paymentStatus"] = "REFUNDED_OR_CANCELLED"
                            # Regresar el stock de los productos
                            for item in order["items"]:
                                p = next((prod for prod in db["products"] if prod["id"] == item["productId"]), None)
                                if p:
                                    p["stock"] += item["quantity"]

                        save_db(db)
                        self.send_response(200)
                        self.send_header("Content-Type", "application/json")
                        self.send_cors_headers()
                        self.end_headers()
                        self.wfile.write(json.dumps({"status": "success"}).encode("utf-8"))
                    else:
                        self.send_response(404)
                        self.end_headers()
                except Exception as e:
                    self.send_response(500)
                    self.end_headers()

            # 2b. ACCIÓN ADMIN - COBRAR PEDIDO(S) CON PAGO MIXTO O MESA COMPLETA
            elif path == "/api/admin/collect-payment":
                try:
                    params = json.loads(post_data)
                    order_ids = params.get("orderIds", [])
                    if not order_ids and "orderId" in params:
                        order_ids = [params["orderId"]]
                    order_ids = [int(i) for i in order_ids if str(i).isdigit()]

                    payment_method = params.get("paymentMethod", "EFECTIVO")
                    new_status = params.get("newStatus")

                    updated_orders = []
                    for order in db.get("orders", []):
                        if order["id"] in order_ids:
                            order["paymentMethod"] = payment_method
                            order["paymentStatus"] = "PAID"
                            if new_status:
                                order["status"] = new_status
                            else:
                                order["status"] = "DELIVERED"
                            updated_orders.append(order)

                    if updated_orders:
                        # Limpiar llamadas de mesa y liberar mesa
                        for o in updated_orders:
                            num_str = str(o.get("tableNumber", "")).replace("Mesa", "").strip()
                            if "tableStates" in db and num_str in db["tableStates"]:
                                db["tableStates"][num_str].pop("call", None)
                                db["tableStates"][num_str]["status"] = "FREE"
                                db["tableStates"][num_str]["pax"] = 0

                        save_db(db)
                        self.send_response(200)
                        self.send_header("Content-Type", "application/json")
                        self.send_cors_headers()
                        self.end_headers()
                        self.wfile.write(json.dumps({"status": "success", "paidOrdersCount": len(updated_orders)}).encode("utf-8"))
                    else:
                        self.send_response(404)
                        self.end_headers()
                except Exception as e:
                    self.send_response(500)
                    self.send_header("Content-Type", "application/json")
                    self.send_cors_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode("utf-8"))

            # 3. ACCIÓN ADMIN - ACTUALIZAR TASA DEL DÓLAR
            elif path == "/api/admin/update-exchange-rate":
                try:
                    params = json.loads(post_data)
                    new_rate = float(params["exchangeRateBs"])
                    db["config"]["exchangeRateBs"] = new_rate
                    save_db(db)
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_cors_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "success"}).encode("utf-8"))
                except Exception:
                    self.send_response(400)
                    self.end_headers()

            # 3b. ACCIÓN ADMIN - ACTUALIZAR CAPACIDAD DE MESAS
            elif path == "/api/admin/update-total-tables":
                try:
                    params = json.loads(post_data)
                    new_total = int(params["totalTables"])
                    if new_total < 1:
                        new_total = 1
                    db["config"]["totalTables"] = new_total
                    save_db(db)
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_cors_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "success", "totalTables": new_total}).encode("utf-8"))
                except Exception as e:
                    self.send_response(400)
                    self.end_headers()

            # 3c. ACCIÓN ADMIN - ACTUALIZAR ESTADO Y SILLAS DE MESA INDIVIDUAL
            elif path == "/api/admin/update-table-state":
                try:
                    params = json.loads(post_data)
                    table_num = str(params["tableNum"])
                    if "tableStates" not in db:
                        db["tableStates"] = {}
                
                    curr = db["tableStates"].get(table_num, {"status": "FREE", "pax": 0, "capacity": 4, "notes": ""})
                
                    if "status" in params:
                        curr["status"] = str(params["status"])
                    if "pax" in params:
                        curr["pax"] = max(0, int(params["pax"]))
                    if "capacity" in params:
                        curr["capacity"] = max(1, int(params["capacity"]))
                    if "notes" in params:
                        curr["notes"] = str(params["notes"])
                    
                    db["tableStates"][table_num] = curr
                    save_db(db)
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_cors_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "success", "tableStates": db["tableStates"]}).encode("utf-8"))
                except Exception as e:
                    self.send_response(400)
                    self.end_headers()

            # 3d. ACCIÓN CLIENTE - LLAMAR MESERO O SOLICITAR CUENTA
            elif path == "/api/client/table-call":
                try:
                    params = json.loads(post_data)
                    table_num = str(params["tableNum"])
                    call_type = str(params.get("type", "WAITER"))
                    if "tableStates" not in db:
                        db["tableStates"] = {}
                    curr = db["tableStates"].get(table_num, {"status": "FREE", "pax": 0, "capacity": 4, "notes": ""})
                    curr["call"] = {
                        "type": call_type,
                        "time": datetime.now().strftime("%I:%M %p")
                    }
                    if curr.get("status") == "FREE":
                        curr["status"] = "OCCUPIED_DECIDING"
                        if curr.get("pax", 0) == 0:
                            curr["pax"] = 2
                    db["tableStates"][table_num] = curr
                    save_db(db)
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_cors_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "success", "message": "Notificación enviada", "tableStates": db["tableStates"]}).encode("utf-8"))
                except Exception as e:
                    self.send_response(400)
                    self.send_header("Content-Type", "application/json")
                    self.send_cors_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode("utf-8"))

            # 3e. ACCIÓN ADMIN - LIMPIAR ATENCIÓN DE MESA
            elif path == "/api/admin/clear-table-call":
                try:
                    params = json.loads(post_data)
                    table_num = str(params["tableNum"])
                    if "tableStates" in db and table_num in db["tableStates"]:
                        db["tableStates"][table_num].pop("call", None)
                        save_db(db)
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_cors_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "success", "tableStates": db.get("tableStates", {})}).encode("utf-8"))
                except Exception as e:
                    self.send_response(400)
                    self.end_headers()

            # 3f. ACCIÓN ADMIN - CAMBIAR DE MESA (TRANSFERIR PEDIDO)
            elif path == "/api/admin/transfer-table":
                try:
                    params = json.loads(post_data)
                    from_num = str(params["fromTable"])
                    to_num = str(params["toTable"])
                    from_label = f"Mesa {from_num}"
                    to_label = f"Mesa {to_num}"
                
                    for o in db.get("orders", []):
                        if o.get("status") not in ["CANCELLED", "DELIVERED"] and o.get("paymentStatus") != "PAID":
                            num_str = str(o.get("tableNumber", "")).strip()
                            if num_str.lower() == from_label.lower() or num_str == from_num:
                                o["tableNumber"] = f"Mesa {to_num}"
                            
                    if "tableStates" not in db:
                        db["tableStates"] = {}
                    state_from = db["tableStates"].get(from_num, {"status": "FREE", "pax": 0, "capacity": 4})
                    state_to = db["tableStates"].get(to_num, {"status": "FREE", "pax": 0, "capacity": 4})
                
                    state_to["status"] = state_from.get("status", "OCCUPIED_DECIDING")
                    state_to["pax"] = state_from.get("pax", 2)
                    if "call" in state_from:
                        state_to["call"] = state_from["call"]
                    
                    db["tableStates"][to_num] = state_to
                    db["tableStates"][from_num] = {"status": "FREE", "pax": 0, "capacity": state_from.get("capacity", 4)}
                    save_db(db)
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_cors_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "success", "orders": db["orders"], "tableStates": db["tableStates"]}).encode("utf-8"))
                except Exception as e:
                    self.send_response(400)
                    self.end_headers()

            # 3g. ACCIÓN ADMIN - UNIR MESAS (FUSIONAR)
            elif path == "/api/admin/merge-tables":
                try:
                    params = json.loads(post_data)
                    main_num = str(params["mainTable"])
                    sec_num = str(params["secondaryTable"])
                
                    for o in db.get("orders", []):
                        if o.get("status") not in ["CANCELLED"] and o.get("paymentStatus") != "PAID":
                            num_str = str(o.get("tableNumber", "")).strip()
                            if f"Mesa {sec_num}".lower() in num_str.lower() or num_str == sec_num:
                                o["tableNumber"] = f"Mesa {main_num} (Unida con Mesa {sec_num})"
                            
                    if "tableStates" not in db:
                        db["tableStates"] = {}
                    state_main = db["tableStates"].get(main_num, {"status": "FREE", "pax": 0, "capacity": 4})
                    state_sec = db["tableStates"].get(sec_num, {"status": "FREE", "pax": 0, "capacity": 4})
                
                    state_main["pax"] = (state_main.get("pax", 0) or 2) + (state_sec.get("pax", 0) or 2)
                    state_main["notes"] = f"Unida con Mesa {sec_num}"
                
                    db["tableStates"][main_num] = state_main
                    db["tableStates"][sec_num] = {"status": "FREE", "pax": 0, "capacity": state_sec.get("capacity", 4), "notes": f"Unida a Mesa {main_num}"}
                    save_db(db)
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_cors_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "success", "orders": db["orders"], "tableStates": db["tableStates"]}).encode("utf-8"))
                except Exception as e:
                    self.send_response(400)
                    self.end_headers()

            # 3h. ACCIÓN ADMIN - CIERRE DE CAJA / TURNO (REPORTE Z)
            elif path == "/api/admin/close-cash-register":
                try:
                    params = json.loads(post_data) if post_data else {}
                    action = params.get("action", "preview")
                    rate = db["config"].get("exchangeRateBs", 40.0)
                    paid_orders = [o for o in db.get("orders", []) if o.get("paymentStatus") == "PAID" and not o.get("archived", False)]
                
                    total_usd = sum(o.get("totalUsd", 0) for o in paid_orders)
                    total_bs = total_usd * rate
                
                    method_breakdown = {
                        "CASH_USD": 0.0,
                        "CASH_BS": 0.0,
                        "PAGO_MOVIL": 0.0,
                        "PUNTO": 0.0,
                        "ZELLE": 0.0,
                        "OTROS": 0.0
                    }
                    for o in paid_orders:
                        m = str(o.get("paymentMethod", "")).strip()
                        t_usd = float(o.get("totalUsd", 0))

                        if ":" in m:
                            parts = m.split(",")
                            for part in parts:
                                clean_part = part.strip()
                                if ":" in clean_part:
                                    sub_parts = clean_part.split(":")
                                    name = sub_parts[0].strip().upper()
                                    val_str = sub_parts[1].replace("$", "").replace("Bs", "").strip()
                                    try:
                                        val = float(val_str)
                                    except ValueError:
                                        val = 0.0
                                
                                    if "EFECTIVO $" in name or "CASH $" in name:
                                        method_breakdown["CASH_USD"] += val
                                    elif "ZELLE" in name:
                                        method_breakdown["ZELLE"] += val
                                    elif "PAGO MÓVIL" in name or "PAGO MOVIL" in name or "PAGOMOVIL" in name:
                                        method_breakdown["PAGO_MOVIL"] += val
                                    elif "PUNTO" in name:
                                        method_breakdown["PUNTO"] += val
                                    elif "EFECTIVO BS" in name or "CASH BS" in name:
                                        method_breakdown["CASH_BS"] += val
                                    else:
                                        method_breakdown["OTROS"] += val
                        else:
                            m_upper = m.upper()
                            if "PAGO_MOVIL" in m_upper or "PAGOMOVIL" in m_upper or "PAGO MOVIL" in m_upper:
                                method_breakdown["PAGO_MOVIL"] += t_usd
                            elif "PUNTO" in m_upper:
                                method_breakdown["PUNTO"] += t_usd
                            elif "ZELLE" in m_upper:
                                method_breakdown["ZELLE"] += t_usd
                            elif "CASH_BS" in m_upper or "EFECTIVO BS" in m_upper or "EFECTIVO_BS" in m_upper:
                                method_breakdown["CASH_BS"] += t_usd
                            elif "EFECTIVO" in m_upper or "CASH" in m_upper or "USD" in m_upper or m_upper == "":
                                method_breakdown["CASH_USD"] += t_usd
                            else:
                                method_breakdown["OTROS"] += t_usd
                        
                    total_tables_count = db["config"].get("totalTables", 10)
                    avg_per_table = total_usd / max(1, total_tables_count)
                
                    report = {
                        "id": len(db.get("zReports", [])) + 1,
                        "timestamp": datetime.now().strftime("%Y-%m-%d %I:%M:%S %p"),
                        "totalOrdersPaid": len(paid_orders),
                        "totalUsd": round(total_usd, 2),
                        "totalBs": round(total_bs, 2),
                        "exchangeRate": rate,
                        "methodBreakdownUsd": {k: round(v, 2) for k, v in method_breakdown.items()},
                        "methodBreakdownBs": {k: round(v * rate, 2) for k, v in method_breakdown.items()},
                        "avgPerTableUsd": round(avg_per_table, 2),
                        "notes": params.get("notes", "Cierre de Turno Normal")
                    }
                
                    if action == "confirm":
                        if "zReports" not in db:
                            db["zReports"] = []
                        db["zReports"].append(report)
                        for o in paid_orders:
                            o["archived"] = True
                        save_db(db)
                
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_cors_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "success", "report": report, "orders": db.get("orders", [])}).encode("utf-8"))
                except Exception as e:
                    self.send_response(500)
                    self.send_header("Content-Type", "application/json")
                    self.send_cors_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode("utf-8"))

            # 4. ACCIÓN ADMIN - TOGGLE DISPONIBILIDAD DE PRODUCTO
            elif path == "/api/admin/toggle-product":
                try:
                    params = json.loads(post_data)
                    prod_id = int(params["productId"])
                    p = next((prod for prod in db["products"] if prod["id"] == prod_id), None)
                    if p:
                        p["isAvailable"] = not p.get("isAvailable", True)
                        save_db(db)
                        self.send_response(200)
                        self.send_header("Content-Type", "application/json")
                        self.send_cors_headers()
                        self.end_headers()
                        self.wfile.write(json.dumps({"status": "success", "isAvailable": p["isAvailable"]}).encode("utf-8"))
                    else:
                        self.send_response(404)
                        self.end_headers()
                except Exception:
                    self.send_response(400)
                    self.end_headers()

            # 5. ACCIÓN ADMIN - ACTUALIZAR STOCK DE PRODUCTO
            elif path == "/api/admin/update-stock":
                try:
                    params = json.loads(post_data)
                    prod_id = int(params["productId"])
                    new_stock = int(params["stock"])
                    p = next((prod for prod in db["products"] if prod["id"] == prod_id), None)
                    if p:
                        p["stock"] = max(0, new_stock)
                        save_db(db)
                        self.send_response(200)
                        self.send_header("Content-Type", "application/json")
                        self.send_cors_headers()
                        self.end_headers()
                        self.wfile.write(json.dumps({"status": "success"}).encode("utf-8"))
                    else:
                        self.send_response(404)
                        self.end_headers()
                except Exception:
                    self.send_response(400)
                    self.end_headers()

                        # 6. ACCIÓN ADMIN - AGREGAR PRODUCTO
            elif path == "/api/admin/add-product":
                try:
                    params = json.loads(post_data)
                    name = params.get("name", "Nuevo Producto") or "Nuevo Producto"
                    description = params.get("description", "") or ""
                
                    price_val = params.get("priceUsd")
                    price_usd = float(price_val) if price_val is not None and str(price_val).strip() != "" else 0.0
                
                    cat_val = params.get("categoryId")
                    category_id = int(cat_val) if cat_val is not None and str(cat_val).strip() != "" else 1
                
                    stock_val = params.get("stock")
                    stock = int(stock_val) if stock_val is not None and str(stock_val).strip() != "" else 0
                
                    image_uri = params.get("imageUri", "plato") or "plato"
                    
                    # Modificadores opcionales
                    modifiers = params.get("modifiers", [])
                    sanitized_modifiers = []
                    for m in modifiers:
                        m_n = str(m.get("name", "")).strip()
                        try:
                            m_p = float(m.get("priceUsd", 0.0))
                        except Exception:
                            m_p = 0.0
                        if m_n:
                            sanitized_modifiers.append({"name": m_n, "priceUsd": m_p})
                
                    next_id = max([p["id"] for p in db["products"]]) + 1 if db["products"] else 1
                
                    new_product = {
                        "id": next_id,
                        "name": name,
                        "description": description,
                        "priceUsd": price_usd,
                        "categoryId": category_id,
                        "stock": stock,
                        "isAvailable": True,
                        "imageUri": image_uri,
                        "modifiers": sanitized_modifiers
                    }
                
                    db["products"].append(new_product)
                    save_db(db)
                
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_cors_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "success", "product": new_product}).encode("utf-8"))
                except Exception as e:
                    self.send_response(400)
                    self.send_header("Content-Type", "application/json")
                    self.send_cors_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode("utf-8"))

            # 7. ACCIÓN ADMIN - EDITAR PRODUCTO
            elif path == "/api/admin/edit-product":
                try:
                    params = json.loads(post_data)
                    prod_id = int(params["productId"])
                    name = params.get("name")
                    description = params.get("description")
                    price_usd = params.get("priceUsd")
                    category_id = params.get("categoryId")
                    stock = params.get("stock")
                    image_uri = params.get("imageUri")
                    modifiers = params.get("modifiers")
                
                    p = next((prod for prod in db["products"] if prod["id"] == prod_id), None)
                    if p:
                        if name is not None: p["name"] = name
                        if description is not None: p["description"] = description
                        if price_usd is not None and str(price_usd).strip() != "": p["priceUsd"] = float(price_usd)
                        if category_id is not None and str(category_id).strip() != "": p["categoryId"] = int(category_id)
                        if stock is not None and str(stock).strip() != "": p["stock"] = int(stock)
                        if image_uri is not None: p["imageUri"] = image_uri
                        if modifiers is not None:
                            sanitized_modifiers = []
                            for m in modifiers:
                                m_n = str(m.get("name", "")).strip()
                                try:
                                    m_p = float(m.get("priceUsd", 0.0))
                                except Exception:
                                    m_p = 0.0
                                if m_n:
                                    sanitized_modifiers.append({"name": m_n, "priceUsd": m_p})
                            p["modifiers"] = sanitized_modifiers
                    
                        save_db(db)
                        self.send_response(200)
                        self.send_header("Content-Type", "application/json")
                        self.send_cors_headers()
                        self.end_headers()
                        self.wfile.write(json.dumps({"status": "success"}).encode("utf-8"))
                    else:
                        self.send_response(404)
                        self.end_headers()
                except Exception as e:
                    self.send_response(400)
                    self.send_header("Content-Type", "application/json")
                    self.send_cors_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode("utf-8"))

            # 8. ACCIÓN ADMIN - ELIMINAR PRODUCTO
            elif path == "/api/admin/delete-product":
                try:
                    params = json.loads(post_data)
                    prod_id = int(params["productId"])
                    db["products"] = [p for p in db["products"] if p["id"] != prod_id]
                    save_db(db)
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_cors_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "success"}).encode("utf-8"))
                except Exception as e:
                    self.send_response(400)
                    self.send_header("Content-Type", "application/json")
                    self.send_cors_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode("utf-8"))

            # 9. ACCIÓN - VERIFICAR PIN DE ADMINISTRADOR
            elif path == "/api/verify-pin":
                try:
                    params = json.loads(post_data)
                    entered_pin = str(params.get("pin", ""))
                    correct_pin = str(db["config"].get("adminPin", "1234"))
                    if entered_pin == correct_pin:
                        new_token = secrets.token_hex(24)
                        with SESSION_LOCK:
                            ACTIVE_ADMIN_SESSIONS[new_token] = time.time() + 86400  # 24 horas activas
                        self.send_response(200)
                        self.send_header("Content-Type", "application/json")
                        self.send_cors_headers()
                        self.end_headers()
                        self.wfile.write(json.dumps({"status": "success", "token": new_token}).encode("utf-8"))
                    else:
                        self.send_response(200)
                        self.send_header("Content-Type", "application/json")
                        self.send_cors_headers()
                        self.end_headers()
                        self.wfile.write(json.dumps({"status": "error", "message": "PIN incorrecto"}).encode("utf-8"))
                except Exception as e:
                    self.send_response(400)
                    self.send_header("Content-Type", "application/json")
                    self.send_cors_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode("utf-8"))

            # 10. ACCIÓN ADMIN - ACTUALIZAR PIN DE ADMINISTRADOR
            elif path == "/api/admin/update-pin":
                try:
                    params = json.loads(post_data)
                    new_pin = str(params.get("pin", "")).strip()
                    if not new_pin:
                        raise Exception("El PIN no puede estar vacío")
                    db["config"]["adminPin"] = new_pin
                    save_db(db)
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_cors_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "success"}).encode("utf-8"))
                except Exception as e:
                    self.send_response(400)
                    self.send_header("Content-Type", "application/json")
                    self.send_cors_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode("utf-8"))

            # ACCIÓN ADMIN - AGREGAR CATEGORÍA
            elif path == "/api/admin/add-category":
                try:
                    params = json.loads(post_data)
                    name = str(params.get("name", "")).strip()
                    icon_name = str(params.get("iconName", "restaurant")).strip() or "restaurant"
                    station = str(params.get("station", "kitchen")).strip()
                    if station not in ["kitchen", "bar"]:
                        station = "bar" if "bebida" in name.lower() or "trago" in name.lower() or "coctel" in name.lower() else "kitchen"
                    if not name:
                        raise Exception("El nombre de la categoría no puede estar vacío")
                    next_id = max([c["id"] for c in db["categories"]]) + 1 if db["categories"] else 1
                    new_category = {
                        "id": next_id,
                        "name": name,
                        "iconName": icon_name,
                        "station": station
                    }
                    db["categories"].append(new_category)
                    save_db(db)
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_cors_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "success", "category": new_category}).encode("utf-8"))
                except Exception as e:
                    self.send_response(400)
                    self.send_header("Content-Type", "application/json")
                    self.send_cors_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode("utf-8"))

            # ACCIÓN ADMIN - EDITAR CATEGORÍA
            elif path == "/api/admin/edit-category":
                try:
                    params = json.loads(post_data)
                    cat_id = int(params["categoryId"])
                    name = params.get("name")
                    icon_name = params.get("iconName")
                    station = params.get("station")
                
                    cat = next((c for c in db["categories"] if c["id"] == cat_id), None)
                    if cat:
                        if name is not None and str(name).strip(): cat["name"] = str(name).strip()
                        if icon_name is not None and str(icon_name).strip(): cat["iconName"] = str(icon_name).strip()
                        if station is not None and str(station).strip(): cat["station"] = str(station).strip()
                        save_db(db)
                        self.send_response(200)
                        self.send_header("Content-Type", "application/json")
                        self.send_cors_headers()
                        self.end_headers()
                        self.wfile.write(json.dumps({"status": "success", "category": cat}).encode("utf-8"))
                    else:
                        self.send_response(404)
                        self.end_headers()
                except Exception as e:
                    self.send_response(400)
                    self.send_header("Content-Type", "application/json")
                    self.send_cors_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode("utf-8"))

            # ACCIÓN ADMIN - ELIMINAR CATEGORÍA
            elif path == "/api/admin/delete-category":
                try:
                    params = json.loads(post_data)
                    cat_id = int(params["categoryId"])
                
                    # Prevenir borrar la última categoría o categorías críticas si se quiere
                    if len(db["categories"]) <= 1:
                        raise Exception("Debe haber al menos una categoría en el sistema")
                
                    # Eliminar categoría
                    db["categories"] = [c for c in db["categories"] if c["id"] != cat_id]
                
                    # Reasignar los productos de esta categoría a la primera categoría disponible
                    fallback_cat_id = db["categories"][0]["id"]
                    for p in db["products"]:
                        if p.get("categoryId") == cat_id:
                            p["categoryId"] = fallback_cat_id
                
                    save_db(db)
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_cors_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "success"}).encode("utf-8"))
                except Exception as e:
                    self.send_response(400)
                    self.send_header("Content-Type", "application/json")
                    self.send_cors_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode("utf-8"))

            # ACCIÓN CLIENTE - ENVIAR / ACTUALIZAR REFERENCIA DE PAGO MÓVIL
            elif path == "/api/client/submit-payment-ref":
                try:
                    params = json.loads(post_data)
                    order_id = params.get("orderId")
                    table_num = str(params.get("tableNumber", "")).strip()
                    ref = str(params.get("reference", "")).strip()
                    origin_bank = str(params.get("originBank", "")).strip()
                    phone = str(params.get("phone", "")).strip()
                
                    if not ref:
                        raise Exception("Debes ingresar el número de referencia del Pago Móvil")
                    
                    target_orders = []
                    if order_id:
                        target_orders = [o for o in db.get("orders", []) if o["id"] == int(order_id)]
                    elif table_num:
                        clean_num = table_num.replace("Mesa", "").strip()
                        target_orders = [o for o in db.get("orders", []) if str(o.get("tableNumber", "")).replace("Mesa", "").strip() == clean_num and o.get("paymentStatus") != "PAID"]
                
                    if not target_orders and db.get("orders"):
                        # Fallback al último pedido activo no pagado
                        unpaid = [o for o in db.get("orders", []) if o.get("paymentStatus") != "PAID"]
                        if unpaid:
                            target_orders = [unpaid[0]]
                    
                    if target_orders:
                        for o in target_orders:
                            o["paymentMethod"] = "Pago Movil"
                            o["paymentReference"] = ref
                            if origin_bank:
                                o["paymentOriginBank"] = origin_bank
                            if phone:
                                o["paymentPhone"] = phone
                            o["paymentVerificationStatus"] = "PENDING_VERIFICATION"
                        
                        save_db(db)
                        self.send_response(200)
                        self.send_header("Content-Type", "application/json")
                        self.send_cors_headers()
                        self.end_headers()
                        self.wfile.write(json.dumps({
                            "status": "success", 
                            "message": "¡Referencia de Pago Móvil enviada a caja administrativa con éxito!",
                            "ordersUpdated": len(target_orders)
                        }).encode("utf-8"))
                    else:
                        self.send_response(404)
                        self.send_header("Content-Type", "application/json")
                        self.send_cors_headers()
                        self.end_headers()
                        self.wfile.write(json.dumps({"status": "error", "message": "No se encontró un pedido activo para asociar esta referencia"}).encode("utf-8"))
                except Exception as e:
                    self.send_response(400)
                    self.send_header("Content-Type", "application/json")
                    self.send_cors_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode("utf-8"))

            # ACCIÓN ADMIN - APROBAR O RECHAZAR REFERENCIA DE PAGO MÓVIL
            elif path == "/api/admin/verify-payment-ref":
                try:
                    params = json.loads(post_data)
                    order_id = int(params["orderId"])
                    action = str(params.get("action", "APPROVE")).upper() # APPROVE or REJECT
                
                    order = next((o for o in db.get("orders", []) if o["id"] == order_id), None)
                    if order:
                        if action == "APPROVE":
                            order["paymentVerificationStatus"] = "VERIFIED"
                            order["paymentStatus"] = "PAID"
                            order["paymentMethod"] = "Pago Movil"
                            if order.get("status") == "PENDING":
                                order["status"] = "CONFIRMED"
                        
                            # Limpiar llamada de mesa si la mesa quedó sin pedidos pendientes
                            num_str = str(order.get("tableNumber", "")).replace("Mesa", "").strip()
                            if "tableStates" in db and num_str in db["tableStates"]:
                                db["tableStates"][num_str].pop("call", None)
                        else:
                            order["paymentVerificationStatus"] = "REJECTED"
                            order["paymentStatus"] = "PENDING_CONFIRMATION"
                    
                        save_db(db)
                        self.send_response(200)
                        self.send_header("Content-Type", "application/json")
                        self.send_cors_headers()
                        self.end_headers()
                        self.wfile.write(json.dumps({"status": "success", "order": order}).encode("utf-8"))
                    else:
                        self.send_response(404)
                        self.send_header("Content-Type", "application/json")
                        self.send_cors_headers()
                        self.end_headers()
                        self.wfile.write(json.dumps({"status": "error", "message": "Pedido no encontrado"}).encode("utf-8"))
                except Exception as e:
                    self.send_response(400)
                    self.send_header("Content-Type", "application/json")
                    self.send_cors_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode("utf-8"))

            # ACCIÓN ADMIN - ACTUALIZAR IDENTIDAD DEL NEGOCIO (NOMBRE, LOGO, ESLOGAN, RIF, CONTACTO, TICKET, PAGO MÓVIL)
            elif path == "/api/admin/update-business-config":
                try:
                    params = json.loads(post_data)
                    if "config" not in db:
                        db["config"] = {}
                    
                    if "restaurantName" in params:
                        name = str(params["restaurantName"]).strip()
                        if name:
                            db["config"]["restaurantName"] = name
                    if "restaurantSlogan" in params:
                        db["config"]["restaurantSlogan"] = str(params["restaurantSlogan"]).strip()
                    if "restaurantLogo" in params:
                        db["config"]["restaurantLogo"] = str(params["restaurantLogo"])
                    if "restaurantRif" in params:
                        db["config"]["restaurantRif"] = str(params["restaurantRif"]).strip()
                    if "restaurantAddress" in params:
                        db["config"]["restaurantAddress"] = str(params["restaurantAddress"]).strip()
                    if "restaurantPhone" in params:
                        db["config"]["restaurantPhone"] = str(params["restaurantPhone"]).strip()
                    if "restaurantInstagram" in params:
                        db["config"]["restaurantInstagram"] = str(params["restaurantInstagram"]).strip()
                    if "ticketFooter" in params:
                        db["config"]["ticketFooter"] = str(params["ticketFooter"]).strip()
                    if "pagoMovil" in params and isinstance(params["pagoMovil"], dict):
                        db["config"]["pagoMovil"] = {
                            "bank": str(params["pagoMovil"].get("bank", "")).strip(),
                            "phone": str(params["pagoMovil"].get("phone", "")).strip(),
                            "idNumber": str(params["pagoMovil"].get("idNumber", "")).strip(),
                            "accountName": str(params["pagoMovil"].get("accountName", "")).strip()
                        }
                    
                    save_db(db)
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_cors_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "success", "config": db["config"]}).encode("utf-8"))
                except Exception as e:
                    self.send_response(400)
                    self.send_header("Content-Type", "application/json")
                    self.send_cors_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode("utf-8"))

            # 11. ACCIÓN ADMIN - RESPALDAR Y CERRAR SESIÓN (BÚSQUEDA DE PENDRIVES)
            elif path == "/api/admin/run-backup":
                try:
                    saved_paths = perform_backup_on_shutdown()
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_cors_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "success", "destinations": saved_paths}).encode("utf-8"))
                except Exception as e:
                    self.send_response(400)
                    self.send_header("Content-Type", "application/json")
                    self.send_cors_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode("utf-8"))

            else:
                self.send_response(404)
                self.end_headers()

    # RETORNA EL HTML DEL MENÚ DIGITAL DEL CLIENTE (Elegante, Responsivo, Estilo M3)
    # RETORNA EL HTML DEL MENÚ DIGITAL DEL CLIENTE (Elegante, Responsivo, Estilo M3)
    # RETORNA EL HTML DEL MENÚ DIGITAL DEL CLIENTE (Elegante, Responsivo, Estilo M3)
    # RETORNA EL HTML DEL MENÚ DIGITAL DEL CLIENTE (Elegante, Responsivo, Estilo M3)
    # RETORNA EL HTML DEL MENÚ DIGITAL DEL CLIENTE (Elegante, Responsivo, Estilo M3)
    def get_client_menu_html(self, db, categories_json, products_json, exchange_rate):
        restaurant_name = db["config"].get("restaurantName", "GastroLocal")
        restaurant_slogan = db["config"].get("restaurantSlogan", "Menú Digital & Autoservicio")
        restaurant_logo = db["config"].get("restaurantLogo", "")
        restaurant_rif = db["config"].get("restaurantRif", "J-00000000-0")
        restaurant_address = db["config"].get("restaurantAddress", "")
        restaurant_phone = db["config"].get("restaurantPhone", "")
        pago_movil = db["config"].get("pagoMovil", {
            "bank": "",
            "phone": "",
            "idNumber": "",
            "accountName": ""
        })
        pm_json = json.dumps(pago_movil, ensure_ascii=False)

        logo_header_html = f'<img src="{restaurant_logo}" class="w-full h-full object-contain" alt="Logo">' if restaurant_logo else '<span class="material-icons text-xl">restaurant</span>'

        return f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{restaurant_name} - Menú Digital</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet" />
    <style>
        body {{ font-family: 'Inter', sans-serif; }}
        .scrollbar-none::-webkit-scrollbar {{ display: none; }}
        .scrollbar-none {{ -ms-overflow-style: none; scrollbar-width: none; }}
    </style>
</head>
<body class="bg-[#fef7ff] text-[#1d1b20] pb-28 font-sans antialiased">
    <!-- Header Principal -->
    <header class="bg-[#6750a4] text-white shadow-md sticky top-0 z-40">
        <div class="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white overflow-hidden shrink-0 border border-white/20 shadow-inner">
                    {logo_header_html}
                </div>
                <div class="flex flex-col">
                    <h1 class="text-base sm:text-lg font-black tracking-tight leading-tight">{restaurant_name}</h1>
                    <span class="text-[10px] sm:text-[11px] font-medium text-[#eaddff] leading-none mt-0.5">{restaurant_slogan}</span>
                </div>
            </div>
            
            <div class="flex items-center gap-2">
                <!-- Botón Llamar al Mozo / Cuenta -->
                <button onclick="openTableCallModal()" class="bg-white/10 hover:bg-white/20 text-[#eaddff] hover:text-white px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 border border-white/10 active:scale-95">
                    <span class="material-icons text-sm text-amber-300">notifications</span>
                    <span class="hidden sm:inline">Mozo</span>
                </button>
                
                <!-- Identificador de Mesa -->
                <div class="bg-[#21005d] text-[#eaddff] px-3 py-1.5 rounded-xl text-xs font-black tracking-wide flex items-center gap-1.5 border border-white/10 shadow-sm">
                    <span class="material-icons text-xs text-[#d0bcff]">table_restaurant</span>
                    <span id="display-table-number" class="uppercase">Mesa ?</span>
                </div>
            </div>
        </div>

        <!-- Barra de Tasa y Búsqueda Rápida -->
        <div class="bg-[#4f378b] px-4 py-2 text-white">
            <div class="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
                <div class="flex items-center gap-2 text-xs text-[#eaddff]">
                    <span class="material-icons text-sm text-emerald-400">payments</span>
                    <span>Tasa oficial: <strong class="text-white font-mono">{exchange_rate:.2f} Bs/$</strong></span>
                </div>
                
                <!-- Buscador de Platos -->
                <div class="relative w-full sm:w-64">
                    <span class="material-icons absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300 text-sm">search</span>
                    <input type="text" id="menu-search-input" placeholder="Buscar plato o bebida..." 
                           oninput="handleSearchInput(this.value)"
                           class="w-full bg-white/10 text-white placeholder:text-purple-200 text-xs rounded-xl pl-8 pr-7 py-1.5 border border-white/20 focus:outline-none focus:bg-white/20">
                    <button id="menu-search-clear" onclick="clearSearch()" class="hidden absolute right-2 top-1/2 -translate-y-1/2 text-purple-200 hover:text-white">
                        <span class="material-icons text-xs">close</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- Categorías (Chips con Scroll Horizontal) -->
        <div class="bg-[#f3edf7] border-b border-[#e7e0ec] py-2.5 px-4 overflow-x-auto scrollbar-none">
            <div class="max-w-4xl mx-auto flex items-center gap-2" id="categories-bar">
                <button onclick="filterCategory('ALL')" class="category-chip active shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm bg-[#6750a4] text-white">
                    Todos
                </button>
            </div>
        </div>
    </header>

    <!-- Contenido Principal (Catálogo de Platos) -->
    <main class="max-w-4xl mx-auto px-4 py-6">
        <div id="products-container" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <!-- Rellenado dinámicamente por JavaScript -->
        </div>
    </main>

    <!-- Barra Flotante de Carrito / Footer -->
    <div id="cart-footer" class="hidden fixed bottom-0 left-0 right-0 bg-[#f3edf7] border-t border-[#e7e0ec] shadow-2xl p-4 z-40 backdrop-blur-lg bg-opacity-95">
        <div class="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div class="flex flex-col cursor-pointer" onclick="openOrderModal()">
                <span class="text-xs text-[#49454f] font-medium" id="cart-count">0 artículos</span>
                <div class="text-lg font-black text-[#6750a4]" id="cart-total">$0.00 / 0.00 Bs</div>
            </div>
            <button onclick="openOrderModal()" class="bg-[#6750a4] hover:bg-[#523e85] text-white font-bold px-6 py-3 rounded-2xl text-sm shadow-lg shadow-purple-900/20 flex items-center gap-2 transition active:scale-95">
                <span class="material-icons text-base">shopping_cart_checkout</span>
                <span>Ver Carrito / Pedir</span>
            </button>
        </div>
    </div>

    <!-- Modal de Detalle y Modificadores de Producto (Zoom / Extras) -->
    <div id="image-modal" class="hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div class="relative bg-slate-900 aspect-video flex items-center justify-center overflow-hidden shrink-0">
                <img id="image-modal-img" src="" alt="" class="w-full h-full object-cover">
                <button onclick="closeImageModal()" class="absolute top-3 right-3 bg-black/50 hover:bg-black/80 text-white rounded-full p-2 transition">
                    <span class="material-icons text-base">close</span>
                </button>
                <div id="image-modal-stock" class="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-md text-emerald-400 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/30">
                    Disponible
                </div>
            </div>
            
            <div class="p-6 overflow-y-auto space-y-4">
                <div>
                    <h3 id="image-modal-title" class="text-xl font-black text-slate-900">Nombre del Plato</h3>
                    <p id="image-modal-desc" class="text-xs text-slate-500 mt-1">Descripción detallada</p>
                    <div id="image-modal-price" class="text-lg font-black text-purple-700 mt-2">$0.00 / 0.00 Bs</div>
                </div>

                <!-- Sección de Modificadores / Extras -->
                <div id="image-modal-modifiers-section" class="hidden border-t border-slate-100 pt-3">
                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Personaliza tu plato (Extras)</label>
                    <div id="image-modal-modifiers-list" class="space-y-2">
                        <!-- Rellenado dinámico con checkboxes -->
                    </div>
                </div>

                <!-- Selector de Cantidad en Modal -->
                <div class="border-t border-slate-100 pt-3 flex items-center justify-between">
                    <span class="text-xs font-bold text-slate-600">Cantidad:</span>
                    <div class="flex items-center gap-3 bg-slate-100 p-1.5 rounded-2xl">
                        <button onclick="modalChangeQty(-1)" class="w-8 h-8 rounded-xl bg-white text-slate-700 font-black flex items-center justify-center shadow-sm active:scale-95">-</button>
                        <span id="image-modal-qty" class="text-sm font-black text-slate-900 px-2">1</span>
                        <button onclick="modalChangeQty(1)" class="w-8 h-8 rounded-xl bg-purple-600 text-white font-black flex items-center justify-center shadow-sm active:scale-95">+</button>
                    </div>
                </div>
            </div>

            <div class="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4">
                <div class="flex flex-col">
                    <span class="text-[10px] text-slate-400 uppercase font-bold">Total con extras</span>
                    <span id="image-modal-total-calc" class="text-base font-black text-purple-700">$0.00</span>
                </div>
                <button onclick="confirmAddClientModalProduct()" class="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-3 rounded-2xl text-sm shadow-md transition flex items-center gap-2 active:scale-95">
                    <span class="material-icons text-base">add_shopping_cart</span>
                    <span>Agregar al Pedido</span>
                </button>
            </div>
        </div>
    </div>

    <!-- Modal de Confirmación y Envío de Pedido -->
    <div id="order-modal" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl flex flex-col max-h-[92vh]">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div class="flex items-center gap-2">
                    <span class="material-icons text-purple-600">shopping_bag</span>
                    <h3 class="text-lg font-black text-slate-900">Tu Pedido</h3>
                </div>
                <button onclick="closeOrderModal()" class="text-slate-400 hover:text-slate-600 p-1">
                    <span class="material-icons">close</span>
                </button>
            </div>

            <div class="overflow-y-auto space-y-4 flex-1 pr-1">
                <!-- Lista de Productos en el Carrito (ESTO ERA LO QUE NO APARECÍA) -->
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Platos y Bebidas seleccionados</label>
                    <div id="modal-order-items-summary" class="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                        <!-- Rellenado dinámicamente con los items del pedido -->
                    </div>
                </div>

                <!-- Selección / Confirmación de Mesa -->
                <div class="bg-purple-50 p-3.5 rounded-2xl border border-purple-100">
                    <label class="block text-xs font-bold text-purple-900 mb-1">Mesa o Ubicación:</label>
                    <input type="text" id="order-table-input" placeholder="Ej: Mesa 1, Barra, Terraza" 
                           class="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-600">
                </div>

                <!-- Notas para Cocina -->
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">Instrucciones especiales para cocina:</label>
                    <textarea id="order-notes" rows="2" placeholder="Ej: Sin cebolla, salsa aparte, bien cocido..."
                              class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-purple-600 resize-none"></textarea>
                </div>

                <!-- Método de Pago -->
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">¿Cómo deseas pagar?</label>
                    <select id="order-payment-method" onchange="togglePagoMovilRefBox()" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-600">
                        <option value="CASH_USD">💵 Efectivo USD ($)</option>
                        <option value="CASH_BS">💵 Efectivo Bolívares (Bs)</option>
                        <option value="PAGO_MOVIL">📱 Pago Móvil (Venezuela)</option>
                        <option value="PUNTO">💳 Punto de Venta / Tarjeta</option>
                        <option value="ZELLE">⚡ Zelle</option>
                        <option value="OTROS">🔄 Otro método / Por definir</option>
                    </select>
                </div>

                <!-- Recuadro informativo de Pago Móvil -->
                <div id="client-pm-info-box" class="hidden bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 space-y-2">
                    <div class="text-xs font-bold text-emerald-900 flex items-center justify-between">
                        <span>Datos de Pago Móvil:</span>
                        <button type="button" onclick="copyPagoMovilDetails()" class="text-[10px] text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded-lg font-bold">Copiar</button>
                    </div>
                    <div class="text-[11px] text-emerald-800 font-mono space-y-0.5" id="client-pm-details-text">
                        <div><strong>Banco:</strong> {pago_movil.get('bank', 'N/A')}</div>
                        <div><strong>Teléfono:</strong> {pago_movil.get('phone', 'N/A')}</div>
                        <div><strong>C.I / RIF:</strong> {pago_movil.get('idNumber', 'N/A')}</div>
                    </div>
                    <input type="text" id="order-pm-ref" placeholder="Nº de Referencia (últimos 4 u 8 dígitos)"
                           class="w-full bg-white border border-emerald-300 rounded-xl px-3 py-1.5 text-xs font-mono font-bold focus:outline-none focus:border-emerald-600">
                </div>

                <!-- Total a Pagar -->
                <div class="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between">
                    <div>
                        <span class="text-[10px] text-slate-400 block font-bold">TOTAL A PAGAR</span>
                        <span id="order-modal-total-usd" class="text-lg font-black text-amber-400">$0.00</span>
                    </div>
                    <div class="text-right">
                        <span class="text-[10px] text-slate-400 block font-bold">EN BOLÍVARES</span>
                        <span id="order-modal-total-bs" class="text-sm font-bold text-slate-200">0.00 Bs</span>
                    </div>
                </div>
            </div>

            <!-- Botones de Acción -->
            <div class="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                <button type="button" onclick="closeOrderModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-2xl text-xs font-bold transition">
                    Seguir pidiendo
                </button>
                <button type="button" id="btn-submit-order" onclick="submitOrder()" class="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-2xl text-xs font-black shadow-lg shadow-purple-900/30 transition active:scale-95 flex items-center justify-center gap-1">
                    <span>Enviar a Cocina</span>
                    <span class="material-icons text-sm">send</span>
                </button>
            </div>
        </div>
    </div>

    <!-- Modal de Llamado de Mozo / Cuenta -->
    <div id="table-call-modal" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
            <div class="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
                <span class="material-icons text-3xl">room_service</span>
            </div>
            <div>
                <h3 class="text-lg font-black text-slate-900">Atención en Mesa</h3>
                <p class="text-xs text-slate-500 mt-1">¿En qué podemos ayudarte?</p>
            </div>
            <div class="space-y-2">
                <button onclick="sendTableCall('WAITER_CALL')" class="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-2xl text-xs transition flex items-center justify-center gap-2 shadow-sm">
                    <span class="material-icons text-sm">hail</span>
                    <span>Llamar al Camarero / Mozo</span>
                </button>
                <button onclick="sendTableCall('BILL_REQUEST')" class="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-2xl text-xs transition flex items-center justify-center gap-2 shadow-sm">
                    <span class="material-icons text-sm">receipt_long</span>
                    <span>Solicitar la Cuenta</span>
                </button>
                <button onclick="closeTableCallModal()" class="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 rounded-2xl text-xs transition">
                    Cancelar
                </button>
            </div>
        </div>
    </div>

    <!-- Toast Notification -->
    <div id="toast" class="hidden fixed bottom-24 left-4 right-4 max-w-sm mx-auto bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center justify-between text-xs font-bold transition-all z-50 border border-slate-700">
        <span id="toast-message">Mensaje</span>
        <span class="material-icons text-emerald-400 text-sm">check_circle</span>
    </div>

    <!-- SCRIPTS JAVASCRIPT DEL CLIENTE -->
    <script>
        const categories = {categories_json};
        const products = {products_json};
        const exchangeRate = {exchange_rate};
        const pagoMovilConfig = {pm_json};
        
        // Estructura de items en carrito: cartId, productId, productName, quantity, priceUsd, selectedModifiers, unitTotalUsd
        let cartItems = [];
        let currentCategory = 'ALL';
        let searchQuery = '';
        let tableNumber = "Mesa 1";
        
        // Estado del modal de plato activo
        let activeModalProduct = null;
        let activeModalQty = 1;

        // Inicialización
        document.addEventListener('DOMContentLoaded', () => {{
            // Leer número de mesa desde la URL (ej: /?table=3)
            const urlParams = new URLSearchParams(window.location.search);
            const tableParam = urlParams.get('table');
            if (tableParam) {{
                tableNumber = isNaN(tableParam) ? tableParam : `Mesa ${{tableParam}}`;
            }}
            
            const displayTable = document.getElementById('display-table-number');
            if (displayTable) displayTable.textContent = tableNumber;
            const inputTable = document.getElementById('order-table-input');
            if (inputTable) inputTable.value = tableNumber;

            renderCategoriesBar();
            renderProductsGrid();
            updateCartUI();
        }});

        // Toast de notificación
        function showToast(message, isSuccess = true) {{
            const toast = document.getElementById('toast');
            const toastMsg = document.getElementById('toast-message');
            if (!toast || !toastMsg) return;
            toastMsg.textContent = message;
            toast.classList.remove('hidden');
            setTimeout(() => {{
                toast.classList.add('hidden');
            }}, 2500);
        }}

        // Renderizado de barra de categorías
        function renderCategoriesBar() {{
            const bar = document.getElementById('categories-bar');
            if (!bar) return;
            
            let html = `
                <button onclick="filterCategory('ALL')" class="category-chip shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${{currentCategory === 'ALL' ? 'bg-[#6750a4] text-white' : 'bg-white text-slate-700 border border-slate-200'}}">
                    Todos
                </button>
            `;
            
            categories.forEach(c => {{
                const isActive = currentCategory === String(c.id);
                html += `
                    <button onclick="filterCategory('${{c.id}}')" class="category-chip shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${{isActive ? 'bg-[#6750a4] text-white' : 'bg-white text-slate-700 border border-slate-200'}}">
                        ${{c.name}}
                    </button>
                `;
            }});
            
            bar.innerHTML = html;
        }}

        function filterCategory(catId) {{
            currentCategory = catId;
            renderCategoriesBar();
            renderProductsGrid();
        }}

        function handleSearchInput(val) {{
            searchQuery = (val || '').trim().toLowerCase();
            const clearBtn = document.getElementById('menu-search-clear');
            if (clearBtn) {{
                if (searchQuery) clearBtn.classList.remove('hidden');
                else clearBtn.classList.add('hidden');
            }}
            renderProductsGrid();
        }}

        function clearSearch() {{
            const input = document.getElementById('menu-search-input');
            if (input) input.value = '';
            handleSearchInput('');
        }}

        // Renderizado de la cuadrícula de productos
        function renderProductsGrid() {{
            const container = document.getElementById('products-container');
            if (!container) return;

            let filtered = products.filter(p => {{
                const matchCat = (currentCategory === 'ALL') || (String(p.categoryId) === String(currentCategory));
                const matchSearch = !searchQuery || (p.name && p.name.toLowerCase().includes(searchQuery)) || (p.description && p.description.toLowerCase().includes(searchQuery));
                return matchCat && matchSearch;
            }});

            if (filtered.length === 0) {{
                container.innerHTML = `
                    <div class="col-span-full text-center py-12 text-slate-400">
                        <span class="material-icons text-5xl block mb-2 text-slate-300">search_off</span>
                        <p class="text-sm font-bold">No se encontraron platos disponibles</p>
                    </div>
                `;
                return;
            }}

            container.innerHTML = filtered.map(p => {{
                const priceBs = (p.priceUsd * exchangeRate).toFixed(2);
                const hasStock = (p.stock === undefined || p.stock === null || p.stock > 0);
                const hasModifiers = p.modifiers && Array.isArray(p.modifiers) && p.modifiers.length > 0;
                
                // Buscar cantidad actual en el carrito
                const totalInCart = cartItems.filter(item => item.productId === p.id).reduce((sum, item) => sum + item.quantity, 0);

                const imageHtml = p.imageUrl 
                    ? `<img src="${{p.imageUrl}}" alt="${{p.name}}" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105">`
                    : `<div class="w-full h-full flex items-center justify-center text-slate-300 bg-slate-100"><span class="material-icons text-4xl">restaurant</span></div>`;

                return `
                    <div class="group bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                        <div class="relative aspect-video bg-slate-100 cursor-pointer overflow-hidden" onclick="openProductModal(${{p.id}})">
                            ${{imageHtml}}
                            ${{hasModifiers ? `<span class="absolute top-2.5 left-2.5 bg-purple-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/20">Personalizable</span>` : ''}}
                            ${{!hasStock ? `<div class="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs font-black uppercase tracking-wider">Agotado</div>` : ''}}
                        </div>

                        <div class="p-4 flex-1 flex flex-col justify-between">
                            <div>
                                <h3 class="font-black text-slate-900 text-sm sm:text-base leading-snug cursor-pointer" onclick="openProductModal(${{p.id}})">${{p.name}}</h3>
                                ${{p.description ? `<p class="text-slate-500 text-xs mt-1 line-clamp-2">${{p.description}}</p>` : ''}}
                            </div>

                            <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                                <div class="flex flex-col">
                                    <span class="text-sm font-black text-purple-700 font-mono">$${{p.priceUsd.toFixed(2)}}</span>
                                    <span class="text-[11px] font-semibold text-slate-400 font-mono">${{priceBs}} Bs</span>
                                </div>

                                ${{hasStock ? `
                                    <div class="flex items-center gap-1.5">
                                        ${{totalInCart > 0 ? `
                                            <button onclick="decrementProductSimple(${{p.id}})" class="w-7 h-7 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center active:scale-95 transition">-</button>
                                            <span class="text-xs font-black text-purple-900 px-1.5">${{totalInCart}}</span>
                                        ` : ''}}
                                        <button onclick="handleCardAddClick(${{p.id}})" class="bg-[#6750a4] hover:bg-[#523e85] text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 shadow-sm active:scale-95 transition">
                                            <span class="material-icons text-xs">add</span>
                                            <span>${{totalInCart > 0 ? 'Más' : 'Agregar'}}</span>
                                        </button>
                                    </div>
                                ` : `
                                    <span class="text-xs font-bold text-slate-400">No disponible</span>
                                `}}
                            </div>
                        </div>
                    </div>
                `;
            }}).join('');
        }}

        // Manejo de clic en botón rápido de tarjeta
        function handleCardAddClick(productId) {{
            const prod = products.find(p => p.id === productId);
            if (!prod) return;

            // Si tiene modificadores / extras, abrimos el modal para que los elija
            if (prod.modifiers && prod.modifiers.length > 0) {{
                openProductModal(productId);
            }} else {{
                // Si es un producto simple, lo agregamos directo al carrito
                addSimpleProductToCart(prod);
            }}
        }}

        function addSimpleProductToCart(prod) {{
            // Buscar si ya existe el item simple en el carrito
            const existing = cartItems.find(item => item.productId === prod.id && (!item.selectedModifiers || item.selectedModifiers.length === 0));
            if (existing) {{
                existing.quantity += 1;
            }} else {{
                cartItems.push({{
                    cartId: Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                    productId: prod.id,
                    productName: prod.name,
                    quantity: 1,
                    priceUsd: prod.priceUsd,
                    selectedModifiers: [],
                    unitTotalUsd: prod.priceUsd
                }});
            }}
            updateCartUI();
            renderProductsGrid();
            showToast(`Agregado: ${{prod.name}}`);
        }}

        function decrementProductSimple(productId) {{
            // Buscar el último item agregado de ese producto
            const index = cartItems.map(item => item.productId).lastIndexOf(productId);
            if (index !== -1) {{
                if (cartItems[index].quantity > 1) {{
                    cartItems[index].quantity -= 1;
                }} else {{
                    cartItems.splice(index, 1);
                }}
            }}
            updateCartUI();
            renderProductsGrid();
        }}

        // Modal de Producto (Detalle, Zoom y Extras)
        function openProductModal(productId) {{
            const prod = products.find(p => p.id === productId);
            if (!prod) return;
            
            activeModalProduct = prod;
            activeModalQty = 1;

            const modal = document.getElementById('image-modal');
            const img = document.getElementById('image-modal-img');
            const title = document.getElementById('image-modal-title');
            const desc = document.getElementById('image-modal-desc');
            const price = document.getElementById('image-modal-price');
            const stock = document.getElementById('image-modal-stock');
            const qty = document.getElementById('image-modal-qty');
            const modSection = document.getElementById('image-modal-modifiers-section');
            const modList = document.getElementById('image-modal-modifiers-list');

            if (img) img.src = prod.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';
            if (title) title.textContent = prod.name;
            if (desc) desc.textContent = prod.description || 'Delicioso plato preparado al momento con los mejores ingredientes.';
            if (price) price.textContent = `$${{prod.priceUsd.toFixed(2)}} / ${{(prod.priceUsd * exchangeRate).toFixed(2)}} Bs`;
            if (stock) stock.textContent = (prod.stock !== undefined && prod.stock !== null) ? `Stock: ${{prod.stock}} disponibles` : 'Disponible';
            if (qty) qty.textContent = "1";

            // Modificadores / Extras
            if (prod.modifiers && prod.modifiers.length > 0 && modSection && modList) {{
                modSection.classList.remove('hidden');
                modList.innerHTML = prod.modifiers.map((m, idx) => `
                    <label class="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:bg-purple-50/50 cursor-pointer transition">
                        <div class="flex items-center gap-2">
                            <input type="checkbox" name="modal-modifier" value="${{idx}}" onchange="recalcModalTotal()" class="w-4 h-4 text-purple-600 rounded focus:ring-purple-500">
                            <span class="text-xs font-bold text-slate-800">${{m.name}}</span>
                        </div>
                        <span class="text-xs font-black text-purple-700 font-mono">+ $${{m.priceUsd.toFixed(2)}}</span>
                    </label>
                `).join('');
            }} else if (modSection) {{
                modSection.classList.add('hidden');
            }}

            recalcModalTotal();
            if (modal) modal.classList.remove('hidden');
        }}

        function closeImageModal() {{
            const modal = document.getElementById('image-modal');
            if (modal) modal.classList.add('hidden');
            activeModalProduct = null;
        }}

        function modalChangeQty(delta) {{
            activeModalQty = Math.max(1, activeModalQty + delta);
            const qty = document.getElementById('image-modal-qty');
            if (qty) qty.textContent = activeModalQty;
            recalcModalTotal();
        }}

        function recalcModalTotal() {{
            if (!activeModalProduct) return;
            let unitTotal = activeModalProduct.priceUsd;
            
            const checkboxes = document.querySelectorAll('input[name="modal-modifier"]:checked');
            checkboxes.forEach(cb => {{
                const modIdx = parseInt(cb.value, 10);
                if (activeModalProduct.modifiers && activeModalProduct.modifiers[modIdx]) {{
                    unitTotal += activeModalProduct.modifiers[modIdx].priceUsd;
                }}
            }});

            const fullTotal = unitTotal * activeModalQty;
            const calc = document.getElementById('image-modal-total-calc');
            if (calc) {{
                calc.textContent = `$${{fullTotal.toFixed(2)}} / ${{(fullTotal * exchangeRate).toFixed(2)}} Bs`;
            }}
        }}

        function confirmAddClientModalProduct() {{
            if (!activeModalProduct) return;
            
            let selectedMods = [];
            let unitTotal = activeModalProduct.priceUsd;

            const checkboxes = document.querySelectorAll('input[name="modal-modifier"]:checked');
            checkboxes.forEach(cb => {{
                const modIdx = parseInt(cb.value, 10);
                if (activeModalProduct.modifiers && activeModalProduct.modifiers[modIdx]) {{
                    const m = activeModalProduct.modifiers[modIdx];
                    selectedMods.push({{ name: m.name, priceUsd: m.priceUsd }});
                    unitTotal += m.priceUsd;
                }}
            }});

            cartItems.push({{
                cartId: Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                productId: activeModalProduct.id,
                productName: activeModalProduct.name,
                quantity: activeModalQty,
                priceUsd: activeModalProduct.priceUsd,
                selectedModifiers: selectedMods,
                unitTotalUsd: unitTotal
            }});

            updateCartUI();
            renderProductsGrid();
            closeImageModal();
            showToast(`Agregado al carrito: ${{activeModalProduct.name}}`);
        }}

        // Actualización de la barra flotante y estado del carrito
        function updateCartUI() {{
            const totalCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
            const totalUsd = cartItems.reduce((sum, item) => sum + (item.unitTotalUsd * item.quantity), 0);
            const totalBs = (totalUsd * exchangeRate).toFixed(2);

            const footer = document.getElementById('cart-footer');
            const countEl = document.getElementById('cart-count');
            const totalEl = document.getElementById('cart-total');

            if (totalCount > 0) {{
                if (footer) footer.classList.remove('hidden');
                if (countEl) countEl.textContent = `${{totalCount}} ${{totalCount === 1 ? 'artículo' : 'artículos'}} en el carrito`;
                if (totalEl) totalEl.textContent = `$${{totalUsd.toFixed(2)}} / ${{totalBs}} Bs`;
            }} else {{
                if (footer) footer.classList.add('hidden');
            }}
        }}

        // Modal de Pedido / Carrito (Renderiza la lista completa de platos)
        function openOrderModal() {{
            if (cartItems.length === 0) {{
                showToast("El carrito está vacío. Agrega platos para pedir.");
                return;
            }}

            const modal = document.getElementById('order-modal');
            const summaryContainer = document.getElementById('modal-order-items-summary');
            
            // Rellenar lista de items en el modal
            if (summaryContainer) {{
                summaryContainer.innerHTML = cartItems.map((item, idx) => {{
                    const itemTotalUsd = (item.unitTotalUsd * item.quantity).toFixed(2);
                    const itemTotalBs = (item.unitTotalUsd * item.quantity * exchangeRate).toFixed(2);
                    const modsText = (item.selectedModifiers && item.selectedModifiers.length > 0)
                        ? item.selectedModifiers.map(m => `+ ${{m.name}}`).join(', ')
                        : '';

                    return `
                        <div class="flex items-center justify-between bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                            <div class="flex-1 pr-2">
                                <h4 class="text-xs font-black text-slate-900 leading-tight">${{item.productName}}</h4>
                                ${{modsText ? `<p class="text-[10px] text-purple-700 font-medium leading-tight mt-0.5">${{modsText}}</p>` : ''}}
                                <span class="text-[11px] font-black text-purple-900 font-mono mt-0.5 block">$${{itemTotalUsd}} / ${{itemTotalBs}} Bs</span>
                            </div>

                            <div class="flex items-center gap-2 shrink-0">
                                <div class="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-sm">
                                    <button onclick="changeCartItemQty(${{idx}}, -1)" class="w-6 h-6 rounded-lg text-slate-700 font-black text-xs hover:bg-slate-100 flex items-center justify-center">-</button>
                                    <span class="text-xs font-black text-purple-900 px-2 font-mono">${{item.quantity}}</span>
                                    <button onclick="changeCartItemQty(${{idx}}, 1)" class="w-6 h-6 rounded-lg bg-purple-600 text-white font-black text-xs hover:bg-purple-700 flex items-center justify-center">+</button>
                                </div>
                                <button onclick="removeCartItem(${{idx}})" class="text-rose-400 hover:text-rose-600 p-1">
                                    <span class="material-icons text-base">delete</span>
                                </button>
                            </div>
                        </div>
                    `;
                }}).join('');
            }}

            // Actualizar totales en el modal
            const totalUsd = cartItems.reduce((sum, item) => sum + (item.unitTotalUsd * item.quantity), 0);
            const totalBs = (totalUsd * exchangeRate).toFixed(2);

            const totalUsdEl = document.getElementById('order-modal-total-usd');
            const totalBsEl = document.getElementById('order-modal-total-bs');
            if (totalUsdEl) totalUsdEl.textContent = `$${{totalUsd.toFixed(2)}}`;
            if (totalBsEl) totalBsEl.textContent = `${{totalBs}} Bs`;

            togglePagoMovilRefBox();
            if (modal) modal.classList.remove('hidden');
        }}

        function closeOrderModal() {{
            const modal = document.getElementById('order-modal');
            if (modal) modal.classList.add('hidden');
        }}

        function changeCartItemQty(index, delta) {{
            if (cartItems[index]) {{
                cartItems[index].quantity += delta;
                if (cartItems[index].quantity <= 0) {{
                    cartItems.splice(index, 1);
                }}
            }}
            updateCartUI();
            renderProductsGrid();
            if (cartItems.length === 0) {{
                closeOrderModal();
            }} else {{
                openOrderModal();
            }}
        }}

        function removeCartItem(index) {{
            if (cartItems[index]) {{
                cartItems.splice(index, 1);
            }}
            updateCartUI();
            renderProductsGrid();
            if (cartItems.length === 0) {{
                closeOrderModal();
            }} else {{
                openOrderModal();
            }}
        }}

        function togglePagoMovilRefBox() {{
            const method = document.getElementById('order-payment-method').value;
            const box = document.getElementById('client-pm-info-box');
            if (box) {{
                if (method === 'PAGO_MOVIL') box.classList.remove('hidden');
                else box.classList.add('hidden');
            }}
        }}

        function copyPagoMovilDetails() {{
            const text = `Pago Móvil:\\nBanco: ${{pagoMovilConfig.bank || 'N/A'}}\\nTeléfono: ${{pagoMovilConfig.phone || 'N/A'}}\\nRIF/CI: ${{pagoMovilConfig.idNumber || 'N/A'}}`;
            if (navigator.clipboard && navigator.clipboard.writeText) {{
                navigator.clipboard.writeText(text).then(() => showToast("Datos de Pago Móvil copiados"));
            }} else {{
                showToast("Datos copiados");
            }}
        }}

        // Envío del Pedido al Backend
        function submitOrder() {{
            if (cartItems.length === 0) {{
                showToast("Tu carrito está vacío.");
                return;
            }}

            const tableInput = document.getElementById('order-table-input');
            const finalTable = (tableInput && tableInput.value.trim()) ? tableInput.value.trim() : tableNumber;
            const notes = document.getElementById('order-notes').value.trim();
            const paymentMethod = document.getElementById('order-payment-method').value;
            const pmRef = document.getElementById('order-pm-ref') ? document.getElementById('order-pm-ref').value.trim() : '';

            const btn = document.getElementById('btn-submit-order');
            if (btn) {{
                btn.disabled = true;
                btn.innerHTML = `<span class="material-icons text-sm animate-spin">sync</span> <span>Enviando a Cocina...</span>`;
            }}

            // Construir payload con modificadores
            const itemsPayload = cartItems.map(item => ({{
                productId: item.productId,
                quantity: item.quantity,
                priceUsd: item.priceUsd,
                selectedModifiers: item.selectedModifiers || [],
                unitTotalUsd: item.unitTotalUsd
            }}));

            const payload = {{
                tableNumber: finalTable,
                items: itemsPayload,
                orderType: "DINE_IN",
                paymentMethod: paymentMethod,
                paymentRef: pmRef,
                notes: notes
            }};

            fetch('/api/order', {{
                method: 'POST',
                headers: {{ 'Content-Type': 'application/json' }},
                body: JSON.stringify(payload)
            }})
            .then(res => res.json())
            .then(data => {{
                if (btn) {{
                    btn.disabled = false;
                    btn.innerHTML = `<span>Enviar a Cocina</span><span class="material-icons text-sm">send</span>`;
                }}

                if (data.status === 'success') {{
                    cartItems = [];
                    updateCartUI();
                    renderProductsGrid();
                    closeOrderModal();
                    
                    alert(`✅ ¡PEDIDO #${{data.orderId}} ENVIADO CON ÉXITO!\\n\\nTu comanda ha sido enviada directamente a cocina para preparación.`);
                }} else {{
                    alert("❌ No se pudo enviar el pedido: " + (data.message || "Error desconocido"));
                }}
            }})
            .catch(err => {{
                if (btn) {{
                    btn.disabled = false;
                    btn.innerHTML = `<span>Enviar a Cocina</span><span class="material-icons text-sm">send</span>`;
                }}
                console.error("Error al enviar pedido:", err);
                alert("⚠️ Error de conexión al enviar el pedido a la PC principal.");
            }});
        }}

        // Llamado de Mozo / Cuenta
        function openTableCallModal() {{
            const modal = document.getElementById('table-call-modal');
            if (modal) modal.classList.remove('hidden');
        }}

        function closeTableCallModal() {{
            const modal = document.getElementById('table-call-modal');
            if (modal) modal.classList.add('hidden');
        }}

        function sendTableCall(type) {{
            const tableInput = document.getElementById('order-table-input');
            const finalTable = (tableInput && tableInput.value.trim()) ? tableInput.value.trim() : tableNumber;

            fetch('/api/client/table-call', {{
                method: 'POST',
                headers: {{ 'Content-Type': 'application/json' }},
                body: JSON.stringify({{ tableNumber: finalTable, type: type }})
            }})
            .then(res => res.json())
            .then(data => {{
                closeTableCallModal();
                if (data.status === 'success') {{
                    if (type === 'WAITER_CALL') {{
                        alert("🔔 ¡Llamado enviado!\\nUn camarero se acercará a tu mesa en breve.");
                    }} else {{
                        alert("🧾 ¡Solicitud enviada!\\nEl mozo te llevará la cuenta a tu mesa.");
                    }}
                }} else {{
                    alert("No se pudo enviar la solicitud: " + (data.message || "Error"));
                }}
            }})
            .catch(err => {{
                closeTableCallModal();
                alert("Error de conexión al llamar al mozo.");
            }});
        }}
    </script>
</body>
</html>"""


    def get_ticket_html(self, db, order):
        cfg = db.get("config", {})
        restaurant_name = cfg.get("restaurantName", "GastroLocal Criollo")
        restaurant_slogan = cfg.get("restaurantSlogan", "Sabor Tradicional & Calidad")
        restaurant_logo = cfg.get("restaurantLogo", "")
        restaurant_rif = cfg.get("restaurantRif", "J-50123456-7")
        restaurant_address = cfg.get("restaurantAddress", "Av. Principal, C.C. Gourmet Plaza, Nivel PB, Local 04")
        restaurant_phone = cfg.get("restaurantPhone", "+58 412-1234567")
        restaurant_instagram = cfg.get("restaurantInstagram", "@gastrolocal_criollo")
        ticket_footer = cfg.get("ticketFooter", "¡Muchas gracias por su compra y preferencia!\nClave WiFi: Gastro2026\nEscanee el QR para volver a pedir.")
        exchange_rate = float(cfg.get("exchangeRateBs", 42.50))

        order_id = order.get("id", 1)
        timestamp = order.get("timestamp", datetime.now().strftime("%Y-%m-%d %I:%M %p"))
        table_number = order.get("tableNumber", "Para Llevar")
        order_type = order.get("orderType", "TAKEAWAY")
        type_str = "🍽️ En Mesa" if order_type == "DINE_IN" else "🚚 Para Llevar"
        payment_method = order.get("paymentMethod", "Efectivo $")
        payment_status = order.get("paymentStatus", "PAID")
        payment_ref = order.get("paymentReference", "")
        payment_bank = order.get("paymentOriginBank", "")
        waiter_name = order.get("waiterName", "")
        items = order.get("items", [])
        total_usd = float(order.get("totalUsd", 0.0))
        total_bs = total_usd * exchange_rate

        status_badge_html = """
        <span class="inline-block px-3 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-full font-black text-[11px] tracking-wider uppercase">
            ✓ PAGADO
        </span>
        """ if payment_status == "PAID" else """
        <span class="inline-block px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full font-black text-[11px] tracking-wider uppercase">
            ⏳ PRE-CUENTA / PENDIENTE
        </span>
        """

        # Generar filas de items consumidos con modificadores
        items_rows_html = ""
        for it in items:
            q = it.get("quantity", 1)
            p_name = it.get("productName", "Producto")
            p_price = float(it.get("priceUsd", 0.0))
            mods = it.get("selectedModifiers", [])
            mods_total = sum(float(m.get("priceUsd", 0.0)) for m in mods)
            unit_total = float(it.get("unitTotalUsd", p_price + mods_total))
            sub_usd = unit_total * q
            sub_bs = sub_usd * exchange_rate

            mods_html = ""
            for m in mods:
                m_n = m.get("name", "")
                m_p = float(m.get("priceUsd", 0.0))
                p_label = f" (+${m_p:.2f})" if m_p > 0 else ""
                mods_html += f'<div class="text-[10px] text-slate-600 font-medium ml-2">• {m_n}{p_label}</div>'

            items_rows_html += f"""
            <tr class="border-b border-dashed border-slate-300 text-slate-900">
                <td class="py-2.5 pr-2 font-mono font-black text-sm align-top">{q}x</td>
                <td class="py-2.5 pr-2 align-top">
                    <div class="font-bold text-xs text-slate-900 leading-tight">{p_name}</div>
                    {mods_html}
                    <div class="text-[10px] text-slate-500 font-mono mt-0.5">${unit_total:.2f} c/u &bull; {(unit_total * exchange_rate):.2f} Bs</div>
                </td>
                <td class="py-2.5 text-right font-mono align-top whitespace-nowrap">
                    <div class="font-black text-xs text-slate-900">${sub_usd:.2f}</div>
                    <div class="text-[10px] font-bold text-purple-700">{sub_bs:.2f} Bs</div>
                </td>
            </tr>
            """

        logo_html = f'<div class="mb-3 flex justify-center"><img src="{restaurant_logo}" alt="Logo" class="max-h-16 max-w-[180px] object-contain rounded-lg"></div>' if restaurant_logo else ''
        footer_clean = ticket_footer.replace("\n", "<br>")

        server_ip = get_ip_address()
        ticket_url = f"http://{server_ip}:{PORT}/ticket?id={order_id}"
        qr_api_url = f"https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=4&data=http://{server_ip}:{PORT}/ticket?id={order_id}"

        payment_extra_info = ""
        if payment_ref or payment_bank:
            payment_extra_info = f"""
            <div class="mt-1.5 p-2 bg-purple-50/70 border border-purple-200 rounded-xl text-[10px] font-mono text-purple-950 space-y-0.5">
                {"<div><strong>Banco:</strong> " + payment_bank + "</div>" if payment_bank else ""}
                {"<div><strong>Ref:</strong> #" + payment_ref + "</div>" if payment_ref else ""}
            </div>
            """

        waiter_badge_html = f'<div class="text-[11px] text-slate-600 font-semibold mt-1">👤 Atendido por: <strong class="text-slate-900">{waiter_name}</strong></div>' if waiter_name else ''

        return f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ticket #{order_id:05d} - {restaurant_name}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400;1,700&family=Inter:wght@400;600;700;800;900&family=JetBrains+Mono:wght@400;700;800&display=swap" rel="stylesheet">
    <style>
        body {{
            font-family: 'Inter', sans-serif;
            background-color: #0f172a;
        }}
        .font-receipt {{
            font-family: 'Courier Prime', 'JetBrains Mono', monospace;
        }}
        .receipt-zigzag {{
            background: radial-gradient(circle, transparent, transparent 50%, #ffffff 50%, #ffffff 100%);
            background-size: 14px 14px;
        }}
        @media print {{
            @page {{
                margin: 0;
                size: 80mm auto;
            }}
            body {{
                background: white !important;
                padding: 0 !important;
                margin: 0 !important;
            }}
            .no-print {{
                display: none !important;
            }}
            #printable-ticket-wrapper {{
                box-shadow: none !important;
                border: none !important;
                width: 80mm !important;
                max-width: 80mm !important;
                margin: 0 !important;
                padding: 4mm !important;
            }}
        }}
    </style>
</head>
<body class="min-h-screen text-slate-800 flex flex-col items-center justify-start p-3 sm:p-6">

    <!-- Barra Superior de Acciones Flotantes -->
    <div class="no-print w-full max-w-[400px] mb-4 bg-slate-900/90 backdrop-blur-md border border-slate-700/60 p-3 rounded-2xl shadow-xl flex items-center justify-between gap-3 text-white">
        <button type="button" onclick="goBack()" class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition flex items-center gap-1.5 text-xs font-bold text-slate-200 hover:text-white active:scale-95 shadow-sm">
            <span class="material-icons text-base">arrow_back</span> Volver
        </button>
        <div class="flex items-center gap-2">
            <button type="button" onclick="window.print()" class="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1 active:scale-95 border border-slate-700">
                <span class="material-icons text-sm">print</span> Imprimir
            </button>
            <button type="button" onclick="downloadPDF()" class="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-black px-3.5 py-2 rounded-xl transition shadow-lg flex items-center gap-1.5 active:scale-95">
                <span class="material-icons text-sm">picture_as_pdf</span> PDF
            </button>
        </div>
    </div>

    <!-- Contenedor del Ticket Estilo Recibo Térmico de Alta Gama -->
    <div id="printable-ticket-wrapper" class="w-full max-w-[400px] bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 relative p-6 sm:p-7 space-y-4">
        
        <!-- Marca de Agua o Encabezado Decorativo -->
        <div class="text-center space-y-1">
            {logo_html}
            <h1 class="text-xl sm:text-2xl font-black uppercase text-slate-950 tracking-tight leading-tight">
                {restaurant_name}
            </h1>
            <p class="text-[11px] text-slate-500 font-medium italic">{restaurant_slogan}</p>
            <div class="text-[11px] text-slate-600 font-mono pt-1 space-y-0.5">
                <div><strong>RIF:</strong> {restaurant_rif}</div>
                <div>{restaurant_address}</div>
                <div><strong>Tel:</strong> {restaurant_phone}</div>
                {f"<div>{restaurant_instagram}</div>" if restaurant_instagram else ""}
            </div>
        </div>

        <div class="border-t border-b border-dashed border-slate-300 py-2.5 flex items-center justify-between text-xs font-mono">
            <div>
                <span class="text-slate-400 block text-[10px]">COMPROBANTE</span>
                <span class="font-black text-slate-900 text-sm">#{order_id:05d}</span>
            </div>
            <div class="text-right">
                <span class="text-slate-400 block text-[10px]">FECHA / HORA</span>
                <span class="font-bold text-slate-800 text-[11px]">{timestamp}</span>
            </div>
        </div>

        <div class="flex items-center justify-between bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
            <div>
                <span class="text-[10px] text-slate-400 block uppercase font-bold">Ubicación / Modalidad</span>
                <span class="font-extrabold text-sm text-slate-900">{table_number} &bull; {type_str}</span>
                {waiter_badge_html}
            </div>
            <div class="text-right">
                {status_badge_html}
            </div>
        </div>

        <!-- Tabla de Productos Consumidos -->
        <div class="space-y-2">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="border-b-2 border-slate-900 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                        <th class="pb-1 pr-2 w-8">Cant</th>
                        <th class="pb-1 pr-2">Descripción</th>
                        <th class="pb-1 text-right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {items_rows_html}
                </tbody>
            </table>
        </div>

        <!-- Totales y Resumen Financiero -->
        <div class="border-t border-slate-900 pt-3 space-y-1.5 font-mono text-xs">
            <div class="flex justify-between items-center text-slate-600">
                <span>Tasa Oficial Bs:</span>
                <span class="font-bold">{exchange_rate:.2f} Bs/$</span>
            </div>
            <div class="flex justify-between items-center text-slate-600">
                <span>Método de Pago:</span>
                <span class="font-bold uppercase text-slate-900">{payment_method}</span>
            </div>
            {payment_extra_info}
            
            <div class="border-t-2 border-dashed border-slate-300 pt-2 mt-2">
                <div class="flex justify-between items-baseline text-slate-950">
                    <span class="text-sm font-black uppercase tracking-wide">TOTAL USD:</span>
                    <span class="text-xl font-black">${total_usd:.2f}</span>
                </div>
                <div class="flex justify-between items-baseline text-purple-700 mt-0.5">
                    <span class="text-xs font-bold uppercase tracking-wider">TOTAL EN BS:</span>
                    <span class="text-base font-extrabold">{total_bs:.2f} Bs</span>
                </div>
            </div>
        </div>

        <!-- Mensaje de Pie y Código QR -->
        <div class="border-t border-dashed border-slate-300 pt-4 text-center space-y-3">
            <div class="flex justify-center">
                <div class="p-2 bg-white rounded-2xl border border-slate-200 shadow-sm inline-block">
                    <img src="{qr_api_url}" alt="QR Ticket" class="w-24 h-24 object-contain">
                </div>
            </div>
            <p class="text-[11px] text-slate-500 leading-relaxed font-medium">
                {footer_clean}
            </p>
            <div class="text-[9px] text-slate-400 font-mono tracking-widest uppercase">
                GastroLocal • Sistema TPV Autónomo Offline
            </div>
        </div>

    </div>

    <script>
        function goBack() {{
            if (window.history.length > 1) {{
                window.history.back();
            }} else {{
                window.location.href = '/';
            }}
        }}

        function downloadPDF() {{
            const element = document.getElementById('printable-ticket-wrapper');
            const opt = {{
                margin:       [5, 5, 5, 5],
                filename:     'Ticket_GastroLocal_{{order_id:05d}}.pdf',
                image:        {{ type: 'jpeg', quality: 0.98 }},
                html2canvas:  {{ scale: 2, useCORS: true }},
                jsPDF:        {{ unit: 'mm', format: [80, 240], orientation: 'portrait' }}
            }};
            html2pdf().set(opt).from(element).save();
        }}
            // ==========================================
        // GESTIÓN DE MODIFICADORES EN FORMULARIO ADMIN
        // ==========================================
        function addFormModifierRow(name = "", priceUsd = 0.0) {{
            const container = document.getElementById('form-modifiers-container');
            if (!container) return;
            const row = document.createElement('div');
            row.className = "flex items-center gap-2 bg-white p-2 rounded-xl border border-purple-200 shadow-sm modifier-form-row";
            row.innerHTML = `
                <input type="text" placeholder="Nombre (ej: Queso Extra)" value="${{name}}" class="mod-name flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-purple-600">
                <div class="flex items-center gap-1 w-24">
                    <span class="text-xs text-slate-500 font-bold">$</span>
                    <input type="number" step="0.01" min="0" placeholder="0.00" value="${{priceUsd}}" class="mod-price w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono focus:outline-none focus:border-purple-600">
                </div>
                <button type="button" onclick="this.parentElement.remove()" class="text-rose-500 hover:text-rose-700 p-1">
                    <span class="material-icons text-sm">delete</span>
                </button>
            `;
            container.appendChild(row);
        }}

        function getFormModifiers() {{
            const rows = document.querySelectorAll('.modifier-form-row');
            const result = [];
            rows.forEach(r => {{
                const nameInput = r.querySelector('.mod-name');
                const priceInput = r.querySelector('.mod-price');
                if (nameInput && nameInput.value.trim()) {{
                    result.push({{
                        name: nameInput.value.trim(),
                        priceUsd: parseFloat(priceInput.value || 0)
                    }});
                }}
            }});
            return result;
        }}

        // ==========================================
        // ANALÍTICA, GRÁFICOS Y EXPORTACIÓN A EXCEL
        // ==========================================
        function renderReports() {{
            const paidOrders = orders.filter(o => o.paymentStatus === 'PAID');
            const totalUsd = paidOrders.reduce((sum, o) => sum + (o.totalUsd || 0), 0);
            const totalBs = totalUsd * exchangeRate;
            const avgTicket = paidOrders.length > 0 ? (totalUsd / paidOrders.length) : 0;

            document.getElementById('rep-kpi-total-usd').textContent = `$${{totalUsd.toFixed(2)}}`;
            document.getElementById('rep-kpi-total-bs').textContent = `${{totalBs.toFixed(2)}} Bs`;
            document.getElementById('rep-kpi-avg-ticket').textContent = `$${{avgTicket.toFixed(2)}}`;
            document.getElementById('rep-kpi-orders-count').textContent = paidOrders.length;

            // Calcular ventas por producto
            const prodCounts = {{}};
            const prodRevenue = {{}};
            paidOrders.forEach(o => {{
                (o.items || []).forEach(it => {{
                    const name = it.productName || 'Producto';
                    prodCounts[name] = (prodCounts[name] || 0) + it.quantity;
                    prodRevenue[name] = (prodRevenue[name] || 0) + (it.unitTotalUsd || it.priceUsd || 0) * it.quantity;
                }});
            }});

            // Top Producto
            let topName = "Sin ventas aún";
            let topQty = 0;
            for (const name in prodCounts) {{
                if (prodCounts[name] > topQty) {{
                    topQty = prodCounts[name];
                    topName = name;
                }}
            }}
            document.getElementById('rep-kpi-top-product').textContent = topName;
            document.getElementById('rep-kpi-top-qty').textContent = `${{topQty}} unidades vendidas`;

            // Gráfico 1: Ventas por Hora (08:00 a 23:00)
            const hourTotals = new Array(24).fill(0);
            paidOrders.forEach(o => {{
                if (o.timestamp) {{
                    // Extraer hora si es formato "YYYY-MM-DD HH:MM PM" o similar
                    let hour = 12;
                    if (o.timestamp.includes(':')) {{
                        const parts = o.timestamp.split(' ');
                        const timePart = parts[1] || '';
                        let h = parseInt(timePart.split(':')[0] || '12');
                        const isPm = o.timestamp.toUpperCase().includes('PM');
                        const isAm = o.timestamp.toUpperCase().includes('AM');
                        if (isPm && h < 12) h += 12;
                        if (isAm && h === 12) h = 0;
                        hour = Math.min(23, Math.max(0, h));
                    }}
                    hourTotals[hour] += (o.totalUsd || 0);
                }}
            }});

            const relevantHours = [8, 10, 12, 14, 16, 18, 20, 22];
            const maxHourVal = Math.max(...hourTotals.slice(8, 23), 10);
            const chartHourly = document.getElementById('chart-hourly-sales');
            chartHourly.innerHTML = "";

            for (let h = 8; h <= 22; h++) {{
                const val = hourTotals[h];
                const pct = Math.min(100, Math.max(8, (val / maxHourVal) * 100));
                const bar = document.createElement('div');
                bar.className = "flex-1 flex flex-col items-center gap-1 group relative h-full justify-end";
                bar.innerHTML = `
                    <div class="text-[9px] font-mono text-purple-700 font-bold opacity-0 group-hover:opacity-100 transition absolute -top-5">$${{val.toFixed(0)}}</div>
                    <div class="w-full bg-gradient-to-t from-purple-700 to-indigo-500 rounded-t-lg transition-all duration-500 hover:brightness-110 shadow-sm" style="height: ${{pct}}%;"></div>
                    <span class="text-[9px] text-slate-400 font-mono">${{h}}h</span>
                `;
                chartHourly.appendChild(bar);
            }}

            // Gráfico 2: Top 5 Platos
            const sortedProds = Object.keys(prodCounts).sort((a, b) => prodCounts[b] - prodCounts[a]).slice(0, 5);
            const topProductsCont = document.getElementById('chart-top-products');
            topProductsCont.innerHTML = "";

            if (sortedProds.length === 0) {{
                topProductsCont.innerHTML = '<div class="text-center py-6 text-slate-400 text-xs">No hay ventas registradas aún.</div>';
            }} else {{
                const maxProdQty = prodCounts[sortedProds[0]] || 1;
                sortedProds.forEach(name => {{
                    const qty = prodCounts[name];
                    const rev = prodRevenue[name] || 0;
                    const pct = Math.min(100, Math.max(15, (qty / maxProdQty) * 100));
                    const row = document.createElement('div');
                    row.className = "space-y-1";
                    row.innerHTML = `
                        <div class="flex justify-between text-xs">
                            <span class="font-bold text-slate-800">${{name}}</span>
                            <span class="font-mono text-slate-600 font-bold">${{qty}} uds • <strong class="text-purple-700">$${{rev.toFixed(2)}}</strong></span>
                        </div>
                        <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div class="bg-gradient-to-r from-purple-600 to-indigo-500 h-full rounded-full transition-all duration-500" style="width: ${{pct}}%;"></div>
                        </div>
                    `;
                    topProductsCont.appendChild(row);
                }});
            }}

            // Desglose Métodos de Pago
            const methodTotals = {{ "Efectivo $": 0, "Pago Móvil": 0, "Punto": 0, "Zelle": 0, "Efectivo Bs": 0, "Otros": 0 }};
            paidOrders.forEach(o => {{
                const m = (o.paymentMethod || '').toUpperCase();
                const t = o.totalUsd || 0;
                if (m.includes('PAGO')) methodTotals["Pago Móvil"] += t;
                else if (m.includes('PUNTO')) methodTotals["Punto"] += t;
                else if (m.includes('ZELLE')) methodTotals["Zelle"] += t;
                else if (m.includes('BS')) methodTotals["Efectivo Bs"] += t;
                else if (m.includes('EFECTIVO') || m.includes('USD')) methodTotals["Efectivo $"] += t;
                else methodTotals["Otros"] += t;
            }});

            const methodContainer = document.getElementById('chart-payment-methods');
            methodContainer.innerHTML = Object.entries(methodTotals).map(([method, amt]) => `
                <div class="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center space-y-0.5">
                    <span class="text-[10px] text-slate-500 font-bold block truncate uppercase">${{method}}</span>
                    <span class="text-sm font-black text-slate-900 font-mono block">$${{amt.toFixed(2)}}</span>
                    <span class="text-[10px] text-purple-700 font-bold font-mono block">${{(amt * exchangeRate).toFixed(2)}} Bs</span>
                </div>
            `).join("");
        }}

        // ==========================================
        // EXPORTACIÓN DE DATOS A EXCEL (.CSV UTF-8 BOM)
        // ==========================================
        function exportSalesToExcelCSV() {{
            if (orders.length === 0) {{
                alert("No hay ventas para exportar.");
                return;
            }}

            let csv = "\uFEFF"; // UTF-8 Byte Order Mark para compatibilidad perfecta con Microsoft Excel
            csv += `ID Pedido;Fecha y Hora;Mesa;Mozo;Productos y Extras;Metodo de Pago;Estado Pago;Total USD;Total Bs\n`;

            orders.forEach(o => {{
                const id = o.id || "";
                const fecha = (o.timestamp || "").replace(/;/g, ',');
                const mesa = (o.tableNumber || "").replace(/;/g, ',');
                const mozo = (o.waiterName || "N/A").replace(/;/g, ',');
                
                const itemsStr = (o.items || []).map(it => {{
                    let text = `${{it.quantity}}x ${{it.productName}}`;
                    if (it.selectedModifiers && it.selectedModifiers.length > 0) {{
                        text += " (" + it.selectedModifiers.map(m => m.name).join(', ') + ")";
                    }}
                    return text;
                }}).join(" + ").replace(/;/g, ',');

                const metodo = (o.paymentMethod || "").replace(/;/g, ',');
                const estado = o.paymentStatus === 'PAID' ? 'PAGADO' : 'PENDIENTE';
                const totalUsd = (o.totalUsd || 0).toFixed(2);
                const totalBs = ((o.totalUsd || 0) * exchangeRate).toFixed(2);

                csv += `${{id}};${{fecha}};${{mesa}};${{mozo}};"${{itemsStr}}";${{metodo}};${{estado}};${{totalUsd}};${{totalBs}}\n`;
            }});

            const blob = new Blob([csv], {{ type: 'text/csv;charset=utf-8;' }});
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `Ventas_GastroLocal_${{new Date().toISOString().slice(0,10)}}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }}

        function exportInventoryToExcelCSV() {{
            if (products.length === 0) {{
                alert("No hay productos en inventario para exportar.");
                return;
            }}

            let csv = "\uFEFF";
            csv += `ID;Nombre Producto;Categoria;Estacion;Precio USD;Precio Bs;Stock Actual;Modificadores / Extras;Estado\n`;

            products.forEach(p => {{
                const id = p.id;
                const name = (p.name || "").replace(/;/g, ',');
                const cat = categories.find(c => c.id === p.categoryId);
                const catName = cat ? cat.name.replace(/;/g, ',') : "General";
                const station = cat ? (cat.station || "kitchen").toUpperCase() : "KITCHEN";
                const priceUsd = (p.priceUsd || 0).toFixed(2);
                const priceBs = ((p.priceUsd || 0) * exchangeRate).toFixed(2);
                const stock = p.stock || 0;
                
                const modsStr = (p.modifiers || []).map(m => `${{m.name}} (+$${{m.priceUsd}})`).join(', ').replace(/;/g, ',');
                const estado = p.isAvailable ? "DISPONIBLE" : "NO DISPONIBLE";

                csv += `${{id}};"${{name}}";${{catName}};${{station}};${{priceUsd}};${{priceBs}};${{stock}};"${{modsStr}}";${{estado}}\n`;
            }});

            const blob = new Blob([csv], {{ type: 'text/csv;charset=utf-8;' }});
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `Inventario_GastroLocal_${{new Date().toISOString().slice(0,10)}}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }}
    </script>
</body>
</html>
"""

    def get_kitchen_view_html(self, db):
        orders_json = json.dumps(db.get("orders", []), ensure_ascii=False)
        categories_json = json.dumps(db.get("categories", []), ensure_ascii=False)
        products_json = json.dumps(db.get("products", []), ensure_ascii=False)
        return f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GastroLocal - KDS Pantalla de Cocina y Bar</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
    <style>
        body {{ font-family: 'Inter', sans-serif; }}
        @keyframes pulse-slow {{
            0%, 100% {{ opacity: 1; }}
            50% {{ opacity: 0.5; }}
        }}
        .animate-pulse-slow {{
            animation: pulse-slow 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }}
    </style>
</head>
<body class="bg-zinc-950 text-zinc-100 min-h-screen pb-12 font-sans select-none">
    <!-- Barra Superior de Navegación y Filtros de Estación -->
    <nav class="bg-zinc-900 border-b border-zinc-800 text-white shadow-md sticky top-0 z-40">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-3">
                <div class="p-2 bg-emerald-600 rounded-xl shadow-lg shadow-emerald-600/30">
                    <span class="material-icons text-white text-xl">kitchen</span>
                </div>
                <div>
                    <h1 class="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                        KDS • Pantalla de Comandas
                        <span id="active-station-badge" class="text-[11px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold uppercase">Todas</span>
                    </h1>
                    <p class="text-[11px] text-zinc-400">GastroLocal • Pacing y Tiempos en Vivo</p>
                </div>
            </div>
            
            <!-- Selector de Estación (Cocina / Bar / Todas) -->
            <div class="flex items-center bg-zinc-950 p-1 rounded-2xl border border-zinc-800 text-xs font-bold gap-1">
                <button onclick="setStation('all')" id="btn-station-all" class="px-3 py-1.5 rounded-xl bg-emerald-600 text-white transition shadow-sm flex items-center gap-1">
                    <span class="material-icons text-xs">restaurant</span> Todas
                </button>
                <button onclick="setStation('kitchen')" id="btn-station-kitchen" class="px-3 py-1.5 rounded-xl text-zinc-400 hover:text-white transition flex items-center gap-1">
                    <span class="material-icons text-xs">lunch_dining</span> Cocina
                </button>
                <button onclick="setStation('bar')" id="btn-station-bar" class="px-3 py-1.5 rounded-xl text-zinc-400 hover:text-white transition flex items-center gap-1">
                    <span class="material-icons text-xs">local_bar</span> Bar
                </button>
            </div>

            <!-- Contadores y Acciones -->
            <div class="flex items-center gap-3">
                <button onclick="toggleUndoDrawer()" title="Ver comandas despachadas recientemente" class="bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-200 border border-zinc-700 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5">
                    <span class="material-icons text-sm text-amber-400">history</span> Deshacer / Historial
                </button>
                <span id="pending-counter" class="bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full font-black text-xs tracking-wide">
                    PEDIDOS: 0
                </span>
                <span id="connection-status" class="text-xs bg-zinc-800 text-zinc-400 border border-zinc-700 px-2.5 py-1 rounded-full hidden sm:flex items-center gap-1.5 font-semibold">
                    <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> CONECTADO
                </span>
            </div>
        </div>
    </nav>

    <!-- Área Principal de Comandas -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <!-- Grid de Pedidos -->
        <div id="kitchen-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <!-- Comandas dinámicas -->
        </div>

        <!-- Mensaje de Cocina Vacía -->
        <div id="empty-state" class="hidden text-center py-24 text-zinc-500">
            <span class="material-icons text-7xl mb-4 text-emerald-500/20">check_circle</span>
            <h3 class="text-xl font-bold text-zinc-300">¡Comandas al día!</h3>
            <p class="text-sm text-zinc-500 mt-1">No hay pedidos pendientes para esta estación en este momento.</p>
        </div>
    </main>

    <!-- Modal / Cajón de Historial Reciente (Deshacer) -->
    <div id="undo-drawer" class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 hidden">
        <div class="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div class="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div class="flex items-center gap-2">
                    <span class="material-icons text-amber-400">history</span>
                    <h3 class="font-extrabold text-white text-base">Historial Reciente de Comandas</h3>
                </div>
                <button onclick="toggleUndoDrawer()" class="text-zinc-400 hover:text-white">
                    <span class="material-icons">close</span>
                </button>
            </div>
            <p class="text-xs text-zinc-400">¿Marcaste una comanda lista por error? Pulsa <strong>Restaurar</strong> para regresarla a la pantalla principal de preparación.</p>
            
            <div id="undo-list" class="space-y-2 overflow-y-auto flex-1 pr-1">
                <!-- Lista de órdenes completadas recientemente -->
            </div>
            
            <div class="pt-2 border-t border-zinc-800">
                <button onclick="toggleUndoDrawer()" class="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-2.5 rounded-xl font-bold text-xs">
                    Cerrar
                </button>
            </div>
        </div>
    </div>

    <script>
        let orders = {orders_json};
        let categories = {categories_json};
        let products = {products_json};
        let knownOrderIds = new Set(orders.map(o => o.id));
        let activeStation = 'all'; // 'all', 'kitchen', 'bar'
        let recentlyCompletedOrders = [];

        document.addEventListener('DOMContentLoaded', () => {{
            renderKitchen();
            
            // Actualizar cronómetros cada segundo
            setInterval(updateTimersOnly, 1000);
            // Sincronizar con el servidor cada 2.5 segundos
            setInterval(fetchUpdates, 2500);
        }});

        function setStation(station) {{
            activeStation = station;
            
            const btnAll = document.getElementById('btn-station-all');
            const btnKitchen = document.getElementById('btn-station-kitchen');
            const btnBar = document.getElementById('btn-station-bar');
            const badge = document.getElementById('active-station-badge');
            
            [btnAll, btnKitchen, btnBar].forEach(btn => {{
                btn.className = "px-3 py-1.5 rounded-xl text-zinc-400 hover:text-white transition flex items-center gap-1";
            }});
            
            if (station === 'kitchen') {{
                btnKitchen.className = "px-3 py-1.5 rounded-xl bg-amber-600 text-white transition shadow-sm flex items-center gap-1";
                badge.textContent = "Cocina";
                badge.className = "text-[11px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-bold uppercase";
            }} else if (station === 'bar') {{
                btnBar.className = "px-3 py-1.5 rounded-xl bg-purple-600 text-white transition shadow-sm flex items-center gap-1";
                badge.textContent = "Bar / Bebidas";
                badge.className = "text-[11px] bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2.5 py-0.5 rounded-full font-bold uppercase";
            }} else {{
                btnAll.className = "px-3 py-1.5 rounded-xl bg-emerald-600 text-white transition shadow-sm flex items-center gap-1";
                badge.textContent = "Todas";
                badge.className = "text-[11px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold uppercase";
            }}
            
            renderKitchen();
        }}

        function getCategoryStation(categoryId) {{
            const cat = categories.find(c => c.id === categoryId);
            if (!cat) return 'kitchen';
            if (cat.station) return cat.station;
            const name = (cat.name || '').toLowerCase();
            return (name.includes('bebida') || name.includes('trago') || name.includes('coctel') || name.includes('vino')) ? 'bar' : 'kitchen';
        }}

        function getItemStation(productId) {{
            const prod = products.find(p => p.id === productId);
            if (!prod) return 'kitchen';
            return getCategoryStation(prod.categoryId);
        }}

        function playKitchenBell() {{
            try {{
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const osc1 = audioCtx.createOscillator();
                const osc2 = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                
                osc1.type = 'sine';
                osc1.frequency.setValueAtTime(880, audioCtx.currentTime); // La5
                osc2.type = 'triangle';
                osc2.frequency.setValueAtTime(1760, audioCtx.currentTime);
                
                gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
                
                osc1.connect(gainNode);
                osc2.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                
                osc1.start();
                osc2.start();
                osc1.stop(audioCtx.currentTime + 1.2);
                osc2.stop(audioCtx.currentTime + 1.2);

                const flash = document.createElement('div');
                flash.className = "fixed inset-0 bg-emerald-500/20 backdrop-blur-sm z-[9999] pointer-events-none transition-all duration-300 animate-pulse";
                document.body.appendChild(flash);
                setTimeout(() => {{
                    flash.classList.add('opacity-0');
                    setTimeout(() => flash.remove(), 300);
                }}, 2000);
            }} catch(e) {{
                console.log("Audio bell not supported: " + e);
            }}
        }}

        function getElapsedInfo(order) {{
            let orderTime = null;
            if (order.createdAtIso) {{
                orderTime = new Date(order.createdAtIso).getTime();
            }}
            if (!orderTime || isNaN(orderTime)) {{
                orderTime = Date.now();
            }}
            
            const diffSeconds = Math.max(0, Math.floor((Date.now() - orderTime) / 1000));
            const mins = Math.floor(diffSeconds / 60);
            const secs = diffSeconds % 60;
            const timeStr = `${{String(mins).padStart(2, '0')}}:${{String(secs).padStart(2, '0')}}`;

            let badgeClass = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
            let alertText = "";
            let cardBorder = "border-zinc-800";

            if (diffSeconds >= 1200) {{ // > 20 min (Crítico)
                badgeClass = "bg-rose-500/25 text-rose-300 border-rose-500/50 animate-pulse font-black";
                alertText = "⚠️ RETRASADO";
                cardBorder = "border-rose-500/60 ring-1 ring-rose-500/40";
            }} else if (diffSeconds >= 600) {{ // 10 - 20 min (Atención)
                badgeClass = "bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold";
                alertText = "⏳ ATENCIÓN";
                cardBorder = "border-amber-500/40";
            }}

            return {{ timeStr, badgeClass, alertText, cardBorder, diffSeconds }};
        }}

        function renderKitchen() {{
            const grid = document.getElementById('kitchen-grid');
            const emptyState = document.getElementById('empty-state');
            
            const activeOrders = orders.filter(o => o.status === "CONFIRMED" || o.status === "PREPARING" || o.status === "PENDING");
            
            // Filtrar por estación seleccionada
            const filteredOrders = activeOrders.filter(o => {{
                if (activeStation === 'all') return true;
                return o.items && o.items.some(it => getItemStation(it.productId) === activeStation);
            }});

            document.getElementById('pending-counter').textContent = `PEDIDOS: ${{filteredOrders.length}}`;

            if (filteredOrders.length === 0) {{
                grid.innerHTML = "";
                emptyState.classList.remove('hidden');
                return;
            }}

            emptyState.classList.add('hidden');
            grid.innerHTML = "";

            filteredOrders.forEach(o => {{
                const {{ timeStr, badgeClass, alertText, cardBorder }} = getElapsedInfo(o);
                
                // Renderizar items resaltando modificadores
                const itemsHtml = o.items.map(it => {{
                    const itStation = getItemStation(it.productId);
                    const isMuted = (activeStation !== 'all' && itStation !== activeStation);
                    
                    let modsHtml = "";
                    if (it.selectedModifiers && it.selectedModifiers.length > 0) {{
                        modsHtml = '<div class="mt-1 flex flex-wrap gap-1">' + it.selectedModifiers.map(m => {{
                            const isSin = (m.name || '').toLowerCase().startsWith('sin ');
                            if (isSin) {{
                                return `<span class="inline-block bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-black px-1.5 py-0.5 rounded tracking-wide">${{m.name}}</span>`;
                            }} else {{
                                return `<span class="inline-block bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-bold px-1.5 py-0.5 rounded">${{m.name}}</span>`;
                            }}
                        }}).join("") + '</div>';
                    }}

                    const stationPill = itStation === 'bar' ? '<span class="text-[9px] bg-purple-900/60 text-purple-300 border border-purple-700/50 px-1.5 py-0.5 rounded font-mono shrink-0">BAR</span>' : '';

                    return `
                    <label class="flex items-start gap-3 py-2 px-1 border-b border-zinc-800 hover:bg-zinc-800/30 rounded cursor-pointer transition select-none ${{isMuted ? 'opacity-35' : ''}}">
                        <input type="checkbox" class="w-5 h-5 mt-0.5 rounded border-zinc-700 bg-zinc-800 text-emerald-600 focus:ring-emerald-500 accent-emerald-500">
                        <div class="flex-1 text-sm font-semibold text-zinc-100 min-w-0">
                            <div class="flex items-center justify-between gap-1">
                                <div>
                                    <span class="text-amber-400 font-black text-base mr-1">${{it.quantity}}x</span>
                                    <span>${{it.productName}}</span>
                                </div>
                                ${{stationPill}}
                            </div>
                            ${{modsHtml}}
                        </div>
                    </label>
                    `;
                }}).join("");

                const waiterBadge = o.waiterName ? `<span class="text-[10px] bg-purple-950/60 text-purple-300 border border-purple-800/40 px-2 py-0.5 rounded-md font-bold">👤 ${{o.waiterName}}</span>` : '';

                const orderCard = document.createElement('div');
                orderCard.id = `order-card-${{o.id}}`;
                orderCard.className = `bg-zinc-900 border ${{cardBorder}} rounded-3xl p-5 shadow-xl flex flex-col justify-between transition-all duration-200 hover:border-zinc-700`;
                
                orderCard.innerHTML = `
                    <div class="space-y-3.5 flex-1">
                        <!-- Cabecera Tarjeta -->
                        <div class="flex items-center justify-between border-b border-zinc-800 pb-3">
                            <div class="flex items-center gap-2">
                                <span class="bg-zinc-800 text-zinc-100 px-2.5 py-1 rounded-xl text-xs font-black">#${{o.id}}</span>
                                <span class="text-base font-black text-white tracking-tight">${{o.tableNumber}}</span>
                            </div>
                            <div class="flex items-center gap-1.5">
                                <span id="timer-${{o.id}}" class="text-xs px-2.5 py-0.5 rounded-full border font-mono font-bold flex items-center gap-1 ${{badgeClass}}">
                                    <span class="material-icons text-xs">timer</span> ${{timeStr}}
                                </span>
                            </div>
                        </div>

                        <div class="flex items-center justify-between text-[11px] text-zinc-400 pb-1">
                            <span>🕒 ${{o.timestamp}}</span>
                            ${{waiterBadge}}
                        </div>

                        <!-- Lista de Ítems (Tachado con Modificadores) -->
                        <div class="space-y-1">
                            ${{itemsHtml}}
                        </div>

                        <!-- Notas Especiales -->
                        ${{o.notes ? `
                            <div class="bg-amber-500/10 border border-amber-500/20 text-amber-300 p-2.5 rounded-xl text-xs font-semibold">
                                <div class="flex items-center gap-1 mb-0.5 text-amber-400 font-bold">
                                    <span class="material-icons text-sm">warning</span>
                                    <span>NOTA DE COMANDA:</span>
                                </div>
                                <p class="text-zinc-200 font-medium">${{o.notes}}</p>
                            </div>
                        ` : ''}}
                    </div>

                    <!-- Botón de Despacho Inmediato -->
                    <div class="mt-5">
                        <button onclick="markReady(${{o.id}})" class="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white py-3 rounded-2xl font-black text-xs sm:text-sm tracking-wide shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2">
                            <span class="material-icons text-base">check_circle</span> LISTO PARA SERVIR
                        </button>
                    </div>
                `;
                grid.appendChild(orderCard);
            }});
        }}

        function updateTimersOnly() {{
            orders.forEach(o => {{
                const timerEl = document.getElementById(`timer-${{o.id}}`);
                const cardEl = document.getElementById(`order-card-${{o.id}}`);
                if (timerEl && cardEl) {{
                    const {{ timeStr, badgeClass, alertText, cardBorder }} = getElapsedInfo(o);
                    timerEl.innerHTML = `<span class="material-icons text-xs">timer</span> ${{timeStr}} ${{alertText ? '<span class="text-[9px]">' + alertText + '</span>' : ''}}`;
                    timerEl.className = `text-xs px-2.5 py-0.5 rounded-full border font-mono font-bold flex items-center gap-1 ${{badgeClass}}`;
                    cardEl.className = `bg-zinc-900 border ${{cardBorder}} rounded-3xl p-5 shadow-xl flex flex-col justify-between transition-all duration-200 hover:border-zinc-700`;
                }}
            }});
        }}

        function markReady(orderId) {{
            const target = orders.find(o => o.id === orderId);
            if (target) {{
                recentlyCompletedOrders.unshift({{ ...target, completedAt: new Date().toLocaleTimeString() }});
                if (recentlyCompletedOrders.length > 10) recentlyCompletedOrders.pop();
            }}

            orders = orders.filter(o => o.id !== orderId);
            renderKitchen();

            fetch('/api/admin/update-order-status', {{
                method: 'POST',
                headers: {{ 'Content-Type': 'application/json' }},
                body: JSON.stringify({{ orderId: orderId, status: "READY" }})
            }})
            .then(res => {{
                if (!res.ok) fetchUpdates();
            }})
            .catch(err => {{
                console.error("Error al marcar como listo: ", err);
                fetchUpdates();
            }});
        }}

        function toggleUndoDrawer() {{
            const drawer = document.getElementById('undo-drawer');
            const list = document.getElementById('undo-list');
            
            if (drawer.classList.contains('hidden')) {{
                if (recentlyCompletedOrders.length === 0) {{
                    list.innerHTML = '<div class="text-center py-8 text-zinc-500 text-xs">No hay comandas completadas recientemente en esta sesión.</div>';
                }} else {{
                    list.innerHTML = recentlyCompletedOrders.map(o => `
                        <div class="bg-zinc-950 p-3 rounded-2xl border border-zinc-800 flex items-center justify-between gap-2">
                            <div>
                                <div class="flex items-center gap-2">
                                    <span class="font-black text-white text-xs">#${{o.id}}</span>
                                    <span class="font-bold text-emerald-400 text-xs">${{o.tableNumber}}</span>
                                    <span class="text-[10px] text-zinc-500 font-mono">(${{o.completedAt || ''}})</span>
                                </div>
                                <div class="text-[11px] text-zinc-400 truncate max-w-[240px]">
                                    ${{o.items.map(it => it.quantity + 'x ' + it.productName).join(', ')}}
                                </div>
                            </div>
                            <button onclick="restoreOrder(${{o.id}})" class="bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1 active:scale-95 shrink-0">
                                <span class="material-icons text-xs">undo</span> Restaurar
                            </button>
                        </div>
                    `).join("");
                }}
                drawer.classList.remove('hidden');
            }} else {{
                drawer.classList.add('hidden');
            }}
        }}

        function restoreOrder(orderId) {{
            fetch('/api/admin/update-order-status', {{
                method: 'POST',
                headers: {{ 'Content-Type': 'application/json' }},
                body: JSON.stringify({{ orderId: orderId, status: "PREPARING" }})
            }})
            .then(res => res.json())
            .then(() => {{
                recentlyCompletedOrders = recentlyCompletedOrders.filter(o => o.id !== orderId);
                toggleUndoDrawer();
                fetchUpdates();
            }})
            .catch(err => {{
                alert("No se pudo restaurar la comanda: " + err);
            }});
        }}

        function fetchUpdates() {{
            fetch('/api/orders')
            .then(res => res.json())
            .then(newOrders => {{
                orders = newOrders;
                
                let hasNewOrder = false;
                newOrders.forEach(o => {{
                    if (!knownOrderIds.has(o.id) && (o.status === 'CONFIRMED' || o.status === 'PREPARING' || o.status === 'PENDING')) {{
                        hasNewOrder = true;
                        knownOrderIds.add(o.id);
                    }}
                }});

                if (hasNewOrder) {{
                    playKitchenBell();
                }}

                renderKitchen();
                document.getElementById('connection-status').innerHTML = `
                    <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> CONECTADO
                `;
            }})
            .catch(err => {{
                document.getElementById('connection-status').innerHTML = `
                    <span class="w-2 h-2 rounded-full bg-rose-500"></span> DESCONECTADO
                `;
            }});
        }}
            // ==========================================
        // GESTIÓN DE MODIFICADORES EN FORMULARIO ADMIN
        // ==========================================
        function addFormModifierRow(name = "", priceUsd = 0.0) {{
            const container = document.getElementById('form-modifiers-container');
            if (!container) return;
            const row = document.createElement('div');
            row.className = "flex items-center gap-2 bg-white p-2 rounded-xl border border-purple-200 shadow-sm modifier-form-row";
            row.innerHTML = `
                <input type="text" placeholder="Nombre (ej: Queso Extra)" value="${{name}}" class="mod-name flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-purple-600">
                <div class="flex items-center gap-1 w-24">
                    <span class="text-xs text-slate-500 font-bold">$</span>
                    <input type="number" step="0.01" min="0" placeholder="0.00" value="${{priceUsd}}" class="mod-price w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono focus:outline-none focus:border-purple-600">
                </div>
                <button type="button" onclick="this.parentElement.remove()" class="text-rose-500 hover:text-rose-700 p-1">
                    <span class="material-icons text-sm">delete</span>
                </button>
            `;
            container.appendChild(row);
        }}

        function getFormModifiers() {{
            const rows = document.querySelectorAll('.modifier-form-row');
            const result = [];
            rows.forEach(r => {{
                const nameInput = r.querySelector('.mod-name');
                const priceInput = r.querySelector('.mod-price');
                if (nameInput && nameInput.value.trim()) {{
                    result.push({{
                        name: nameInput.value.trim(),
                        priceUsd: parseFloat(priceInput.value || 0)
                    }});
                }}
            }});
            return result;
        }}

        // ==========================================
        // ANALÍTICA, GRÁFICOS Y EXPORTACIÓN A EXCEL
        // ==========================================
        function renderReports() {{
            const paidOrders = orders.filter(o => o.paymentStatus === 'PAID');
            const totalUsd = paidOrders.reduce((sum, o) => sum + (o.totalUsd || 0), 0);
            const totalBs = totalUsd * exchangeRate;
            const avgTicket = paidOrders.length > 0 ? (totalUsd / paidOrders.length) : 0;

            document.getElementById('rep-kpi-total-usd').textContent = `$${{totalUsd.toFixed(2)}}`;
            document.getElementById('rep-kpi-total-bs').textContent = `${{totalBs.toFixed(2)}} Bs`;
            document.getElementById('rep-kpi-avg-ticket').textContent = `$${{avgTicket.toFixed(2)}}`;
            document.getElementById('rep-kpi-orders-count').textContent = paidOrders.length;

            // Calcular ventas por producto
            const prodCounts = {{}};
            const prodRevenue = {{}};
            paidOrders.forEach(o => {{
                (o.items || []).forEach(it => {{
                    const name = it.productName || 'Producto';
                    prodCounts[name] = (prodCounts[name] || 0) + it.quantity;
                    prodRevenue[name] = (prodRevenue[name] || 0) + (it.unitTotalUsd || it.priceUsd || 0) * it.quantity;
                }});
            }});

            // Top Producto
            let topName = "Sin ventas aún";
            let topQty = 0;
            for (const name in prodCounts) {{
                if (prodCounts[name] > topQty) {{
                    topQty = prodCounts[name];
                    topName = name;
                }}
            }}
            document.getElementById('rep-kpi-top-product').textContent = topName;
            document.getElementById('rep-kpi-top-qty').textContent = `${{topQty}} unidades vendidas`;

            // Gráfico 1: Ventas por Hora (08:00 a 23:00)
            const hourTotals = new Array(24).fill(0);
            paidOrders.forEach(o => {{
                if (o.timestamp) {{
                    // Extraer hora si es formato "YYYY-MM-DD HH:MM PM" o similar
                    let hour = 12;
                    if (o.timestamp.includes(':')) {{
                        const parts = o.timestamp.split(' ');
                        const timePart = parts[1] || '';
                        let h = parseInt(timePart.split(':')[0] || '12');
                        const isPm = o.timestamp.toUpperCase().includes('PM');
                        const isAm = o.timestamp.toUpperCase().includes('AM');
                        if (isPm && h < 12) h += 12;
                        if (isAm && h === 12) h = 0;
                        hour = Math.min(23, Math.max(0, h));
                    }}
                    hourTotals[hour] += (o.totalUsd || 0);
                }}
            }});

            const relevantHours = [8, 10, 12, 14, 16, 18, 20, 22];
            const maxHourVal = Math.max(...hourTotals.slice(8, 23), 10);
            const chartHourly = document.getElementById('chart-hourly-sales');
            chartHourly.innerHTML = "";

            for (let h = 8; h <= 22; h++) {{
                const val = hourTotals[h];
                const pct = Math.min(100, Math.max(8, (val / maxHourVal) * 100));
                const bar = document.createElement('div');
                bar.className = "flex-1 flex flex-col items-center gap-1 group relative h-full justify-end";
                bar.innerHTML = `
                    <div class="text-[9px] font-mono text-purple-700 font-bold opacity-0 group-hover:opacity-100 transition absolute -top-5">$${{val.toFixed(0)}}</div>
                    <div class="w-full bg-gradient-to-t from-purple-700 to-indigo-500 rounded-t-lg transition-all duration-500 hover:brightness-110 shadow-sm" style="height: ${{pct}}%;"></div>
                    <span class="text-[9px] text-slate-400 font-mono">${{h}}h</span>
                `;
                chartHourly.appendChild(bar);
            }}

            // Gráfico 2: Top 5 Platos
            const sortedProds = Object.keys(prodCounts).sort((a, b) => prodCounts[b] - prodCounts[a]).slice(0, 5);
            const topProductsCont = document.getElementById('chart-top-products');
            topProductsCont.innerHTML = "";

            if (sortedProds.length === 0) {{
                topProductsCont.innerHTML = '<div class="text-center py-6 text-slate-400 text-xs">No hay ventas registradas aún.</div>';
            }} else {{
                const maxProdQty = prodCounts[sortedProds[0]] || 1;
                sortedProds.forEach(name => {{
                    const qty = prodCounts[name];
                    const rev = prodRevenue[name] || 0;
                    const pct = Math.min(100, Math.max(15, (qty / maxProdQty) * 100));
                    const row = document.createElement('div');
                    row.className = "space-y-1";
                    row.innerHTML = `
                        <div class="flex justify-between text-xs">
                            <span class="font-bold text-slate-800">${{name}}</span>
                            <span class="font-mono text-slate-600 font-bold">${{qty}} uds • <strong class="text-purple-700">$${{rev.toFixed(2)}}</strong></span>
                        </div>
                        <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div class="bg-gradient-to-r from-purple-600 to-indigo-500 h-full rounded-full transition-all duration-500" style="width: ${{pct}}%;"></div>
                        </div>
                    `;
                    topProductsCont.appendChild(row);
                }});
            }}

            // Desglose Métodos de Pago
            const methodTotals = {{ "Efectivo $": 0, "Pago Móvil": 0, "Punto": 0, "Zelle": 0, "Efectivo Bs": 0, "Otros": 0 }};
            paidOrders.forEach(o => {{
                const m = (o.paymentMethod || '').toUpperCase();
                const t = o.totalUsd || 0;
                if (m.includes('PAGO')) methodTotals["Pago Móvil"] += t;
                else if (m.includes('PUNTO')) methodTotals["Punto"] += t;
                else if (m.includes('ZELLE')) methodTotals["Zelle"] += t;
                else if (m.includes('BS')) methodTotals["Efectivo Bs"] += t;
                else if (m.includes('EFECTIVO') || m.includes('USD')) methodTotals["Efectivo $"] += t;
                else methodTotals["Otros"] += t;
            }});

            const methodContainer = document.getElementById('chart-payment-methods');
            methodContainer.innerHTML = Object.entries(methodTotals).map(([method, amt]) => `
                <div class="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center space-y-0.5">
                    <span class="text-[10px] text-slate-500 font-bold block truncate uppercase">${{method}}</span>
                    <span class="text-sm font-black text-slate-900 font-mono block">$${{amt.toFixed(2)}}</span>
                    <span class="text-[10px] text-purple-700 font-bold font-mono block">${{(amt * exchangeRate).toFixed(2)}} Bs</span>
                </div>
            `).join("");
        }}

        // ==========================================
        // EXPORTACIÓN DE DATOS A EXCEL (.CSV UTF-8 BOM)
        // ==========================================
        function exportSalesToExcelCSV() {{
            if (orders.length === 0) {{
                alert("No hay ventas para exportar.");
                return;
            }}

            let csv = "\uFEFF"; // UTF-8 Byte Order Mark para compatibilidad perfecta con Microsoft Excel
            csv += `ID Pedido;Fecha y Hora;Mesa;Mozo;Productos y Extras;Metodo de Pago;Estado Pago;Total USD;Total Bs\n`;

            orders.forEach(o => {{
                const id = o.id || "";
                const fecha = (o.timestamp || "").replace(/;/g, ',');
                const mesa = (o.tableNumber || "").replace(/;/g, ',');
                const mozo = (o.waiterName || "N/A").replace(/;/g, ',');
                
                const itemsStr = (o.items || []).map(it => {{
                    let text = `${{it.quantity}}x ${{it.productName}}`;
                    if (it.selectedModifiers && it.selectedModifiers.length > 0) {{
                        text += " (" + it.selectedModifiers.map(m => m.name).join(', ') + ")";
                    }}
                    return text;
                }}).join(" + ").replace(/;/g, ',');

                const metodo = (o.paymentMethod || "").replace(/;/g, ',');
                const estado = o.paymentStatus === 'PAID' ? 'PAGADO' : 'PENDIENTE';
                const totalUsd = (o.totalUsd || 0).toFixed(2);
                const totalBs = ((o.totalUsd || 0) * exchangeRate).toFixed(2);

                csv += `${{id}};${{fecha}};${{mesa}};${{mozo}};"${{itemsStr}}";${{metodo}};${{estado}};${{totalUsd}};${{totalBs}}\n`;
            }});

            const blob = new Blob([csv], {{ type: 'text/csv;charset=utf-8;' }});
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `Ventas_GastroLocal_${{new Date().toISOString().slice(0,10)}}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }}

        function exportInventoryToExcelCSV() {{
            if (products.length === 0) {{
                alert("No hay productos en inventario para exportar.");
                return;
            }}

            let csv = "\uFEFF";
            csv += `ID;Nombre Producto;Categoria;Estacion;Precio USD;Precio Bs;Stock Actual;Modificadores / Extras;Estado\n`;

            products.forEach(p => {{
                const id = p.id;
                const name = (p.name || "").replace(/;/g, ',');
                const cat = categories.find(c => c.id === p.categoryId);
                const catName = cat ? cat.name.replace(/;/g, ',') : "General";
                const station = cat ? (cat.station || "kitchen").toUpperCase() : "KITCHEN";
                const priceUsd = (p.priceUsd || 0).toFixed(2);
                const priceBs = ((p.priceUsd || 0) * exchangeRate).toFixed(2);
                const stock = p.stock || 0;
                
                const modsStr = (p.modifiers || []).map(m => `${{m.name}} (+$${{m.priceUsd}})`).join(', ').replace(/;/g, ',');
                const estado = p.isAvailable ? "DISPONIBLE" : "NO DISPONIBLE";

                csv += `${{id}};"${{name}}";${{catName}};${{station}};${{priceUsd}};${{priceBs}};${{stock}};"${{modsStr}}";${{estado}}\n`;
            }});

            const blob = new Blob([csv], {{ type: 'text/csv;charset=utf-8;' }});
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `Inventario_GastroLocal_${{new Date().toISOString().slice(0,10)}}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }}
    </script>
</body>
</html>
"""

        # 7. VISTA MOVIL DE MOZO / CAMARERO (/waiter)
    def get_waiter_view_html(self, db):
        cfg = db.get("config", {})
        restaurant_name = cfg.get("restaurantName", "GastroLocal Criollo")
        exchange_rate = float(cfg.get("exchangeRateBs", 42.50))
        total_tables = int(cfg.get("totalTables", 10))
        categories_json = json.dumps(db.get("categories", []), ensure_ascii=False)
        products_json = json.dumps([p for p in db.get("products", []) if p.get("isAvailable", True)], ensure_ascii=False)
        orders_json = json.dumps(db.get("orders", []), ensure_ascii=False)
        table_states_json = json.dumps(db.get("tableStates", {}), ensure_ascii=False)

        return f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>GastroLocal - Mozo / Comandero Móvil</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@700;800&display=swap" rel="stylesheet">
    <style>
        body {{ font-family: 'Inter', sans-serif; touch-action: manipulation; }}
        .font-mono {{ font-family: 'JetBrains Mono', monospace; }}
    </style>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen pb-24 font-sans select-none">

    <!-- Notificación Flotante Superior de Plato Listo (KDS Alert) -->
    <div id="ready-alert-banner" class="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-3.5 shadow-2xl transition-all duration-300 transform -translate-y-full flex items-center justify-between border-b-2 border-emerald-400">
        <div class="flex items-center gap-2.5">
            <span class="material-icons text-2xl animate-bounce">notifications_active</span>
            <div>
                <p id="ready-alert-title" class="font-black text-xs uppercase tracking-wide">¡Plato Listo para Servir!</p>
                <p id="ready-alert-subtitle" class="text-xs text-emerald-100 font-medium">Mesa 4 • 2 ítems preparados</p>
            </div>
        </div>
        <div class="flex items-center gap-2">
            <button onclick="dismissReadyAlert()" class="bg-emerald-950/50 hover:bg-emerald-950 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition">
                Cerrar
            </button>
            <button onclick="openTab('ready')" class="bg-white text-emerald-900 px-3 py-1.5 rounded-xl text-xs font-black shadow transition active:scale-95">
                Ver
            </button>
        </div>
    </div>

    <!-- Barra de Cabecera Móvil -->
    <header class="bg-slate-950 border-b border-slate-800 sticky top-0 z-30 shadow-lg px-4 py-3 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
            <div class="p-1.5 bg-purple-600 rounded-xl">
                <span class="material-icons text-white text-lg">person_pin</span>
            </div>
            <div>
                <h1 class="text-sm font-black text-white leading-tight">{restaurant_name}</h1>
                <div class="flex items-center gap-1.5 mt-0.5">
                    <select id="select-waiter" onchange="changeWaiter(this.value)" class="bg-slate-800 text-purple-300 font-bold text-xs rounded-lg px-2 py-0.5 border border-slate-700 focus:outline-none">
                        <option value="Mozo 1">Mozo 1</option>
                        <option value="Mozo 2">Mozo 2</option>
                        <option value="Mozo 3">Mozo 3</option>
                        <option value="Carlos">Carlos</option>
                        <option value="María">María</option>
                        <option value="Juan">Juan</option>
                    </select>
                    <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                </div>
            </div>
        </div>

        <div class="flex items-center gap-2">
            <button onclick="openTab('ready')" class="relative p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition">
                <span class="material-icons text-base text-emerald-400">room_service</span>
                <span id="ready-badge-count" class="absolute -top-1 -right-1 bg-emerald-500 text-slate-950 text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center hidden">0</span>
            </button>
            <a href="/admin" class="p-2 bg-slate-800 text-slate-400 rounded-xl border border-slate-700 hover:text-white" title="Ir al Panel POS">
                <span class="material-icons text-base">point_of_sale</span>
            </a>
        </div>
    </header>

    <!-- Pestañas Principales Móviles -->
    <div class="bg-slate-950/80 backdrop-blur-md px-4 py-2 border-b border-slate-800 flex gap-2 sticky top-[57px] z-20">
        <button onclick="openTab('tables')" id="tab-btn-tables" class="flex-1 py-2 bg-purple-600 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1 shadow-md">
            <span class="material-icons text-sm">table_restaurant</span> Mesas
        </button>
        <button onclick="openTab('order')" id="tab-btn-order" class="flex-1 py-2 bg-slate-800 text-slate-400 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1">
            <span class="material-icons text-sm">add_shopping_cart</span> Pedir
        </button>
        <button onclick="openTab('ready')" id="tab-btn-ready" class="flex-1 py-2 bg-slate-800 text-slate-400 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1">
            <span class="material-icons text-sm text-emerald-400">check_circle</span> Listos
        </button>
    </div>

    <!-- CONTENIDO: 1. PESTAÑA DE MESAS -->
    <main id="view-tables" class="p-4 max-w-lg mx-auto space-y-4">
        <div class="flex items-center justify-between">
            <h2 class="text-xs font-black uppercase text-slate-400 tracking-wider">Estado de Mesas en Salón</h2>
            <button onclick="refreshData()" class="text-xs text-purple-400 font-bold flex items-center gap-1">
                <span class="material-icons text-sm">sync</span> Actualizar
            </button>
        </div>

        <div id="waiter-tables-grid" class="grid grid-cols-2 gap-3">
            <!-- Renderizado dinámico de mesas -->
        </div>
    </main>

    <!-- CONTENIDO: 2. PESTAÑA DE TOMAR PEDIDO -->
    <main id="view-order" class="p-4 max-w-lg mx-auto space-y-4 hidden">
        <!-- Selector de Mesa Activa -->
        <div class="bg-slate-800/90 border border-slate-700 p-3 rounded-2xl flex items-center justify-between">
            <div>
                <span class="text-[10px] text-slate-400 uppercase font-extrabold block">Mesa Destino:</span>
                <span id="order-active-table-label" class="font-black text-purple-300 text-sm">Mesa 1</span>
            </div>
            <button onclick="openTab('tables')" class="bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1 rounded-xl text-xs font-bold">
                Cambiar Mesa
            </button>
        </div>

        <!-- Filtro por Categorías -->
        <div id="waiter-categories" class="flex gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
            <!-- Categorías dinámicas -->
        </div>

        <!-- Buscador Rápido -->
        <div class="relative">
            <span class="material-icons absolute left-3 top-2.5 text-slate-500 text-sm">search</span>
            <input type="text" id="product-search-input" oninput="filterProductsByName(this.value)" placeholder="Buscar plato, bebida..." class="w-full bg-slate-800 border border-slate-700 text-white rounded-2xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-purple-500">
        </div>

        <!-- Catálogo de Productos -->
        <div id="waiter-products-list" class="space-y-2.5">
            <!-- Productos dinámicos -->
        </div>
    </main>

    <!-- CONTENIDO: 3. PESTAÑA DE PLATOS LISTOS -->
    <main id="view-ready" class="p-4 max-w-lg mx-auto space-y-4 hidden">
        <div class="flex items-center justify-between">
            <h2 class="text-xs font-black uppercase text-emerald-400 tracking-wider">Comandas Listas para Servir</h2>
            <span class="text-[11px] text-slate-400">Cocina despachada</span>
        </div>

        <div id="waiter-ready-list" class="space-y-3">
            <!-- Pedidos listos dinámicos -->
        </div>
    </main>

    <!-- BARRA INFERIOR FLOTANTE DE COMANDA (Carrito del Mozo) -->
    <footer id="waiter-cart-bar" class="fixed bottom-0 left-0 right-0 bg-slate-950 border-t border-slate-800 p-3 z-30 shadow-2xl flex items-center justify-between gap-3 hidden">
        <div class="min-w-0">
            <span id="waiter-cart-table" class="text-[10px] text-purple-400 font-extrabold uppercase block truncate">Mesa 1 &bull; 0 ítems</span>
            <span id="waiter-cart-total" class="font-black text-sm text-white font-mono">$0.00 / 0.00 Bs</span>
        </div>
        <button onclick="openOrderConfirmModal()" class="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 active:scale-95 text-white px-4 py-2.5 rounded-2xl font-black text-xs shadow-lg flex items-center gap-1.5 shrink-0">
            <span class="material-icons text-sm">send</span> Enviar a Cocina
        </button>
    </footer>

    <!-- MODAL DE MODIFICADORES Y EXTRAS DEL PLATO -->
    <div id="modifier-modal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 hidden">
        <div class="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                    <h3 id="mod-modal-title" class="font-black text-white text-sm">Personalizar Plato</h3>
                    <p id="mod-modal-base-price" class="text-xs text-purple-400 font-mono font-bold">$0.00</p>
                </div>
                <button onclick="closeModifierModal()" class="text-slate-400 hover:text-white">
                    <span class="material-icons">close</span>
                </button>
            </div>

            <div id="mod-modal-options-list" class="space-y-2">
                <!-- Modificadores dinámicos con checkboxes -->
            </div>

            <div>
                <label class="block text-[11px] font-bold text-slate-400 mb-1">Nota especial para Cocina (Opcional)</label>
                <input type="text" id="mod-modal-item-notes" placeholder="Ej: Salsa aparte, bien cocido..." class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500">
            </div>

            <div class="flex items-center justify-between pt-2">
                <div class="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl p-1">
                    <button onclick="changeModalQty(-1)" class="w-7 h-7 rounded-lg bg-slate-700 text-white font-bold flex items-center justify-center text-sm">-</button>
                    <span id="mod-modal-qty" class="text-xs font-black px-2 text-white">1</span>
                    <button onclick="changeModalQty(1)" class="w-7 h-7 rounded-lg bg-slate-700 text-white font-bold flex items-center justify-center text-sm">+</button>
                </div>

                <button onclick="confirmAddProductWithModifiers()" class="bg-purple-600 hover:bg-purple-500 text-white font-black text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1 shadow-lg active:scale-95">
                    <span class="material-icons text-sm">add_shopping_cart</span> Añadir (<span id="mod-modal-total-calc">$0.00</span>)
                </button>
            </div>
        </div>
    </div>

    <!-- MODAL DE CONFIRMACIÓN DE ENVÍO A COCINA -->
    <div id="order-confirm-modal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 hidden">
        <div class="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 class="font-black text-white text-sm">Confirmar Pedido a Cocina</h3>
                <button onclick="closeOrderConfirmModal()" class="text-slate-400 hover:text-white">
                    <span class="material-icons">close</span>
                </button>
            </div>

            <div class="space-y-2">
                <div class="flex justify-between text-xs text-slate-300">
                    <span>Mesa:</span>
                    <strong id="confirm-modal-table" class="text-white font-black">Mesa 1</strong>
                </div>
                <div class="flex justify-between text-xs text-slate-300">
                    <span>Mozo Responsable:</span>
                    <strong id="confirm-modal-waiter" class="text-purple-400 font-bold">Carlos</strong>
                </div>
                <div class="border-t border-slate-800 pt-2">
                    <span class="text-[10px] text-slate-500 uppercase font-bold block mb-1">Ítems de la ronda:</span>
                    <div id="confirm-modal-items-list" class="space-y-1.5 max-h-36 overflow-y-auto text-xs font-mono text-slate-300">
                    </div>
                </div>
                <div class="border-t border-slate-800 pt-2 flex justify-between font-mono font-black text-sm text-white">
                    <span>Total Ronda:</span>
                    <span id="confirm-modal-total" class="text-emerald-400">$0.00</span>
                </div>
            </div>

            <div class="flex gap-2 pt-2">
                <button onclick="closeOrderConfirmModal()" class="flex-1 bg-slate-800 text-slate-300 py-2.5 rounded-xl font-bold text-xs">
                    Cancelar
                </button>
                <button onclick="submitWaiterOrder()" class="flex-1 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white py-2.5 rounded-xl font-black text-xs shadow-lg transition">
                    🚀 Enviar
                </button>
            </div>
        </div>
    </div>

    <script>
        let exchangeRate = {exchange_rate};
        let totalTables = {total_tables};
        let categories = {categories_json};
        let products = {products_json};
        let orders = {orders_json};
        let tableStates = {table_states_json};
        
        let selectedTable = localStorage.getItem('waiter_selected_table') || "Mesa 1";
        let activeWaiter = localStorage.getItem('waiter_name') || "Carlos";
        let selectedCatId = 0;
        let waiterCart = []; // [{{ id: 'temp_id', productId, quantity, selectedModifiers: [], itemNotes, unitTotal }}]
        let currentModalProduct = null;
        let currentModalQty = 1;
        let knownReadyOrderIds = new Set(orders.filter(o => o.status === 'READY').map(o => o.id));

        document.addEventListener('DOMContentLoaded', () => {{
            const selectW = document.getElementById('select-waiter');
            if (selectW) selectW.value = activeWaiter;
            
            renderTables();
            renderCategories();
            renderProducts();
            renderReadyOrders();
            updateCartBar();

            setInterval(syncBackground, 2500);
        }});

        function changeWaiter(name) {{
            activeWaiter = name;
            localStorage.setItem('waiter_name', name);
        }}

        function openTab(tabName) {{
            const vTables = document.getElementById('view-tables');
            const vOrder = document.getElementById('view-order');
            const vReady = document.getElementById('view-ready');
            
            const bTables = document.getElementById('tab-btn-tables');
            const bOrder = document.getElementById('tab-btn-order');
            const bReady = document.getElementById('tab-btn-ready');

            [vTables, vOrder, vReady].forEach(v => v.classList.add('hidden'));
            [bTables, bOrder, bReady].forEach(b => {{
                b.className = "flex-1 py-2 bg-slate-800 text-slate-400 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1";
            }});

            if (tabName === 'order') {{
                vOrder.classList.remove('hidden');
                bOrder.className = "flex-1 py-2 bg-purple-600 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1 shadow-md";
                document.getElementById('order-active-table-label').textContent = selectedTable;
            }} else if (tabName === 'ready') {{
                vReady.classList.remove('hidden');
                bReady.className = "flex-1 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1 shadow-md";
                dismissReadyAlert();
            }} else {{
                vTables.classList.remove('hidden');
                bTables.className = "flex-1 py-2 bg-purple-600 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1 shadow-md";
            }}
        }}

        function selectTableForOrder(tableName) {{
            selectedTable = tableName;
            localStorage.setItem('waiter_selected_table', tableName);
            openTab('order');
        }}

        function renderTables() {{
            const container = document.getElementById('waiter-tables-grid');
            container.innerHTML = "";

            const tableList = [];
            for (let i = 1; i <= totalTables; i++) {{
                tableList.push(`Mesa ${{i}}`);
            }}
            tableList.push("Para llevar");

            tableList.forEach(tName => {{
                const cleanNum = tName.replace(/[^0-9]/g, '');
                const state = tableStates[cleanNum] || {{ status: 'FREE' }};
                
                // Buscar pedidos activos en esta mesa
                const activeOrders = orders.filter(o => {{
                    const oTable = String(o.tableNumber || '').trim().toLowerCase();
                    return (oTable === tName.toLowerCase() || (cleanNum && oTable === cleanNum)) && o.status !== 'CANCELLED' && o.paymentStatus !== 'PAID';
                }});

                const isOccupied = activeOrders.length > 0 || state.status === 'OCCUPIED' || state.status === 'OCCUPIED_DECIDING';
                const hasCall = state.call || false;
                const hasReady = activeOrders.some(o => o.status === 'READY');
                const totalMesaUsd = activeOrders.reduce((sum, o) => sum + (o.totalUsd || 0), 0);

                let cardBg = "bg-slate-800/80 border-slate-700";
                let statusBadge = `<span class="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">Libre</span>`;

                if (hasReady) {{
                    cardBg = "bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500";
                    statusBadge = `<span class="text-[10px] bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full font-black animate-pulse">¡LISTO!</span>`;
                }} else if (hasCall) {{
                    cardBg = "bg-rose-950/40 border-rose-500/60 ring-1 ring-rose-500";
                    statusBadge = `<span class="text-[10px] bg-rose-500 text-white px-2 py-0.5 rounded-full font-black animate-pulse">Llamando</span>`;
                }} else if (isOccupied) {{
                    cardBg = "bg-amber-950/30 border-amber-500/40";
                    statusBadge = `<span class="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">Ocupada</span>`;
                }}

                const card = document.createElement('div');
                card.className = `${{cardBg}} border rounded-3xl p-4 shadow-lg flex flex-col justify-between space-y-3 cursor-pointer transition active:scale-95`;
                card.onclick = () => selectTableForOrder(tName);

                card.innerHTML = `
                    <div class="flex items-center justify-between">
                        <span class="font-black text-sm text-white">${{tName}}</span>
                        ${{statusBadge}}
                    </div>
                    <div>
                        <span class="text-[10px] text-slate-400 block font-mono">Consumo acumulado:</span>
                        <span class="text-sm font-black text-white font-mono">$${{totalMesaUsd.toFixed(2)}}</span>
                        <span class="text-[10px] text-slate-400 font-mono block">${{(totalMesaUsd * exchangeRate).toFixed(2)}} Bs</span>
                    </div>
                    <button class="w-full bg-purple-600 hover:bg-purple-500 text-white py-1.5 rounded-xl text-[11px] font-black transition flex items-center justify-center gap-1 shadow">
                        <span class="material-icons text-xs">add_circle</span> Tomar Pedido
                    </button>
                `;
                container.appendChild(card);
            }});
        }}

        function renderCategories() {{
            const container = document.getElementById('waiter-categories');
            container.innerHTML = `
                <button onclick="filterCat(0)" id="w-cat-0" class="px-3.5 py-1.5 rounded-xl font-bold shrink-0 transition bg-purple-600 text-white shadow">
                    Todos
                </button>
            `;
            categories.forEach(c => {{
                const btn = document.createElement('button');
                btn.id = `w-cat-${{c.id}}`;
                btn.className = "px-3.5 py-1.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl font-bold shrink-0 transition";
                btn.textContent = c.name;
                btn.onclick = () => filterCat(c.id);
                container.appendChild(btn);
            }});
        }}

        function filterCat(catId) {{
            selectedCatId = catId;
            document.querySelectorAll('#waiter-categories button').forEach(b => {{
                b.className = "px-3.5 py-1.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl font-bold shrink-0 transition";
            }});
            const activeB = document.getElementById(`w-cat-${{catId}}`);
            if (activeB) activeB.className = "px-3.5 py-1.5 bg-purple-600 text-white rounded-xl font-bold shrink-0 transition shadow";
            renderProducts();
        }}

        function filterProductsByName(term) {{
            const list = document.getElementById('waiter-products-list');
            const clean = term.toLowerCase().trim();
            document.querySelectorAll('.waiter-prod-card').forEach(card => {{
                const title = card.getAttribute('data-name').toLowerCase();
                card.style.display = title.includes(clean) ? 'flex' : 'none';
            }});
        }}

        function renderProducts() {{
            const container = document.getElementById('waiter-products-list');
            container.innerHTML = "";

            const filtered = selectedCatId === 0 ? products : products.filter(p => p.categoryId === selectedCatId);

            if (filtered.length === 0) {{
                container.innerHTML = '<div class="text-center py-8 text-slate-500 text-xs">No hay productos disponibles</div>';
                return;
            }}

            filtered.forEach(p => {{
                const card = document.createElement('div');
                card.className = "waiter-prod-card bg-slate-800/90 border border-slate-700 rounded-2xl p-3 flex items-center justify-between gap-3 shadow transition active:scale-[0.99]";
                card.setAttribute('data-name', p.name);

                const hasMods = (p.modifiers && p.modifiers.length > 0);
                const isOutOfStock = (p.stock <= 0);

                card.innerHTML = `
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2">
                            <h4 class="font-extrabold text-white text-xs truncate">${{p.name}}</h4>
                            ${{hasMods ? '<span class="text-[9px] bg-purple-950 text-purple-300 border border-purple-700/50 px-1.5 py-0.2 rounded font-bold">Opciones</span>' : ''}}
                        </div>
                        <div class="flex items-center gap-2 mt-0.5">
                            <span class="font-black text-purple-300 text-xs font-mono">$${{p.priceUsd.toFixed(2)}}</span>
                            <span class="text-[10px] text-slate-400 font-mono">${{(p.priceUsd * exchangeRate).toFixed(2)}} Bs</span>
                            <span class="text-[10px] text-slate-500">Stock: ${{p.stock}}</span>
                        </div>
                    </div>
                    <div>
                        ${{isOutOfStock ? `
                            <span class="text-[10px] bg-rose-900/40 text-rose-300 border border-rose-700/40 px-2 py-1 rounded-xl font-bold">Agotado</span>
                        ` : `
                            <button onclick="openModifierModal(${{p.id}})" class="bg-purple-600 hover:bg-purple-500 text-white font-black text-xs px-3 py-2 rounded-xl transition flex items-center gap-1 active:scale-95 shadow">
                                <span class="material-icons text-xs">add</span> Pedir
                            </button>
                        `}}
                    </div>
                `;
                container.appendChild(card);
            }});
        }}

        function openModifierModal(productId) {{
            const p = products.find(prod => prod.id === productId);
            if (!p) return;
            currentModalProduct = p;
            currentModalQty = 1;

            document.getElementById('mod-modal-title').textContent = p.name;
            document.getElementById('mod-modal-base-price').textContent = `Precio base: $${{p.priceUsd.toFixed(2)}}`;
            document.getElementById('mod-modal-qty').textContent = "1";
            document.getElementById('mod-modal-item-notes').value = "";

            const listContainer = document.getElementById('mod-modal-options-list');
            listContainer.innerHTML = "";

            if (p.modifiers && p.modifiers.length > 0) {{
                p.modifiers.forEach((m, idx) => {{
                    const label = document.createElement('label');
                    label.className = "flex items-center justify-between p-2.5 bg-slate-800 border border-slate-700 rounded-xl cursor-pointer hover:bg-slate-700/50 transition";
                    label.innerHTML = `
                        <div class="flex items-center gap-2">
                            <input type="checkbox" id="mod-check-${{idx}}" data-name="${{m.name}}" data-price="${{m.priceUsd}}" onchange="calcModalTotal()" class="w-4 h-4 rounded border-slate-600 text-purple-600 focus:ring-purple-500 accent-purple-600">
                            <span class="text-xs font-bold text-white">${{m.name}}</span>
                        </div>
                        <span class="text-xs font-mono font-bold text-purple-300">${{m.priceUsd > 0 ? '+$' + m.priceUsd.toFixed(2) : '$0.00'}}</span>
                    `;
                    listContainer.appendChild(label);
                }});
            }} else {{
                listContainer.innerHTML = '<div class="text-[11px] text-slate-500 italic py-1">Este producto no requiere opciones adicionales.</div>';
            }}

            calcModalTotal();
            document.getElementById('modifier-modal').classList.remove('hidden');
        }}

        function closeModifierModal() {{
            document.getElementById('modifier-modal').classList.add('hidden');
        }}

        function changeModalQty(delta) {{
            currentModalQty = Math.max(1, currentModalQty + delta);
            if (currentModalProduct && currentModalProduct.stock) {{
                currentModalQty = Math.min(currentModalProduct.stock, currentModalQty);
            }}
            document.getElementById('mod-modal-qty').textContent = currentModalQty;
            calcModalTotal();
        }}

        function calcModalTotal() {{
            if (!currentModalProduct) return;
            let unitPrice = currentModalProduct.priceUsd;
            
            document.querySelectorAll('#mod-modal-options-list input[type="checkbox"]:checked').forEach(cb => {{
                unitPrice += parseFloat(cb.getAttribute('data-price') || 0);
            }});

            const total = unitPrice * currentModalQty;
            document.getElementById('mod-modal-total-calc').textContent = `$${{total.toFixed(2)}}`;
        }}

        function confirmAddProductWithModifiers() {{
            if (!currentModalProduct) return;
            
            const selectedMods = [];
            let unitPrice = currentModalProduct.priceUsd;
            
            document.querySelectorAll('#mod-modal-options-list input[type="checkbox"]:checked').forEach(cb => {{
                const mPrice = parseFloat(cb.getAttribute('data-price') || 0);
                unitPrice += mPrice;
                selectedMods.push({{
                    name: cb.getAttribute('data-name'),
                    priceUsd: mPrice
                }});
            }});

            const notes = document.getElementById('mod-modal-item-notes').value.trim();

            waiterCart.push({{
                cartId: Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                productId: currentModalProduct.id,
                productName: currentModalProduct.name,
                quantity: currentModalQty,
                priceUsd: currentModalProduct.priceUsd,
                selectedModifiers: selectedMods,
                unitTotalUsd: unitPrice,
                notes: notes
            }});

            closeModifierModal();
            updateCartBar();
        }}

        function updateCartBar() {{
            const bar = document.getElementById('waiter-cart-bar');
            if (waiterCart.length === 0) {{
                bar.classList.add('hidden');
                return;
            }}

            bar.classList.remove('hidden');
            const totalCount = waiterCart.reduce((sum, it) => sum + it.quantity, 0);
            const totalUsd = waiterCart.reduce((sum, it) => sum + (it.unitTotalUsd * it.quantity), 0);
            const totalBs = totalUsd * exchangeRate;

            document.getElementById('waiter-cart-table').textContent = `${{selectedTable}} • ${{totalCount}} ${{totalCount === 1 ? 'ítem' : 'ítems'}} en comanda`;
            document.getElementById('waiter-cart-total').textContent = `$${{totalUsd.toFixed(2)}} / ${{totalBs.toFixed(2)}} Bs`;
        }}

        function openOrderConfirmModal() {{
            if (waiterCart.length === 0) return;
            document.getElementById('confirm-modal-table').textContent = selectedTable;
            document.getElementById('confirm-modal-waiter').textContent = activeWaiter;
            
            const totalUsd = waiterCart.reduce((sum, it) => sum + (it.unitTotalUsd * it.quantity), 0);
            document.getElementById('confirm-modal-total').textContent = `$${{totalUsd.toFixed(2)}} (${{(totalUsd * exchangeRate).toFixed(2)}} Bs)`;

            const list = document.getElementById('confirm-modal-items-list');
            list.innerHTML = waiterCart.map((it, idx) => `
                <div class="flex items-center justify-between border-b border-slate-800 pb-1">
                    <div>
                        <span class="font-black text-amber-400">${{it.quantity}}x</span>
                        <span class="text-white">${{it.productName}}</span>
                        ${{it.selectedModifiers.length > 0 ? '<div class="text-[10px] text-slate-400">' + it.selectedModifiers.map(m => m.name).join(', ') + '</div>' : ''}}
                        ${{it.notes ? '<div class="text-[10px] text-amber-300 italic">Nota: ' + it.notes + '</div>' : ''}}
                    </div>
                    <button onclick="removeCartItem(${{idx}})" class="text-rose-400 hover:text-rose-300 ml-2">
                        <span class="material-icons text-xs">delete</span>
                    </button>
                </div>
            `).join("");

            document.getElementById('order-confirm-modal').classList.remove('hidden');
        }}

        function removeCartItem(idx) {{
            waiterCart.splice(idx, 1);
            openOrderConfirmModal();
            updateCartBar();
            if (waiterCart.length === 0) closeOrderConfirmModal();
        }}

        function closeOrderConfirmModal() {{
            document.getElementById('order-confirm-modal').classList.add('hidden');
        }}

        function submitWaiterOrder() {{
            if (waiterCart.length === 0) return;

            const itemsPayload = waiterCart.map(it => ({{
                productId: it.productId,
                quantity: it.quantity,
                selectedModifiers: it.selectedModifiers
            }}));

            const notesCombined = waiterCart.filter(it => it.notes).map(it => `${{it.productName}}: ${{it.notes}}`).join(' | ');

            const payload = {{
                tableNumber: selectedTable,
                orderType: selectedTable.toLowerCase().includes('llevar') ? "TAKEAWAY" : "DINE_IN",
                paymentMethod: "Efectivo $",
                waiterName: activeWaiter,
                notes: notesCombined,
                items: itemsPayload
            }};

            fetch('/api/order', {{
                method: 'POST',
                headers: {{ 'Content-Type': 'application/json' }},
                body: JSON.stringify(payload)
            }})
            .then(res => res.json())
            .then(data => {{
                if (data.status === 'success') {{
                    waiterCart = [];
                    updateCartBar();
                    closeOrderConfirmModal();
                    alert(`✅ ¡Comanda #${{data.orderId}} enviada a Cocina para la ${{selectedTable}}!`);
                    openTab('tables');
                    syncBackground();
                }} else {{
                    alert("Error al enviar pedido: " + (data.message || 'Desconocido'));
                }}
            }})
            .catch(err => {{
                alert("Fallo de conexión al enviar comanda: " + err);
            }});
        }}

        function playReadyChime() {{
            try {{
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const now = audioCtx.currentTime;
                
                // Trino armónico agradable (Ding-Dong)
                const osc1 = audioCtx.createOscillator();
                const gain1 = audioCtx.createGain();
                osc1.type = 'sine';
                osc1.frequency.setValueAtTime(587.33, now); // Re5
                gain1.gain.setValueAtTime(0.3, now);
                gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
                osc1.connect(gain1);
                gain1.connect(audioCtx.destination);
                osc1.start(now);
                osc1.stop(now + 0.6);

                const osc2 = audioCtx.createOscillator();
                const gain2 = audioCtx.createGain();
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(880.00, now + 0.2); // La5
                gain2.gain.setValueAtTime(0.35, now + 0.2);
                gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
                osc2.connect(gain2);
                gain2.connect(audioCtx.destination);
                osc2.start(now + 0.2);
                osc2.stop(now + 1.0);
            }} catch(e) {{
                console.log("Audio chime error: " + e);
            }}
        }}

        function showReadyAlertBanner(order) {{
            const banner = document.getElementById('ready-alert-banner');
            document.getElementById('ready-alert-title').textContent = `¡${{order.tableNumber}} LISTA PARA SERVIR!`;
            const count = (order.items || []).reduce((sum, it) => sum + it.quantity, 0);
            document.getElementById('ready-alert-subtitle').textContent = `Comanda #${{order.id}} • ${{count}} ítems preparados por Cocina`;
            banner.classList.remove('-translate-y-full');
            playReadyChime();
        }}

        function dismissReadyAlert() {{
            document.getElementById('ready-alert-banner').classList.add('-translate-y-full');
        }}

        function renderReadyOrders() {{
            const list = document.getElementById('waiter-ready-list');
            const readyOrders = orders.filter(o => o.status === 'READY');
            
            const badgeCount = document.getElementById('ready-badge-count');
            if (readyOrders.length > 0) {{
                badgeCount.textContent = readyOrders.length;
                badgeCount.classList.remove('hidden');
            }} else {{
                badgeCount.classList.add('hidden');
            }}

            if (readyOrders.length === 0) {{
                list.innerHTML = '<div class="text-center py-12 text-slate-500 text-xs">No hay platos pendientes por entregar.</div>';
                return;
            }}

            list.innerHTML = readyOrders.map(o => `
                <div class="bg-slate-800 border border-emerald-500/40 rounded-3xl p-4 shadow-xl space-y-3">
                    <div class="flex items-center justify-between border-b border-slate-700 pb-2">
                        <div class="flex items-center gap-2">
                            <span class="bg-emerald-500 text-slate-950 px-2.5 py-0.5 rounded-xl font-black text-xs">#${{o.id}}</span>
                            <span class="font-black text-white text-sm">${{o.tableNumber}}</span>
                        </div>
                        <span class="text-[10px] text-emerald-400 font-bold uppercase">Listo para Servir</span>
                    </div>

                    <div class="space-y-1 text-xs">
                        ${{o.items.map(it => `
                            <div class="flex justify-between text-slate-200">
                                <span><strong class="text-amber-400">${{it.quantity}}x</strong> ${{it.productName}}</span>
                            </div>
                        `).join("")}}
                    </div>

                    <button onclick="confirmDeliveredOrder(${{o.id}})" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-2xl font-black text-xs transition flex items-center justify-center gap-1.5 shadow active:scale-95">
                        <span class="material-icons text-sm">done_all</span> Confirmar Entrega en Mesa
                    </button>
                </div>
            `).join("");
        }}

        function confirmDeliveredOrder(orderId) {{
            fetch('/api/admin/update-order-status', {{
                method: 'POST',
                headers: {{ 'Content-Type': 'application/json' }},
                body: JSON.stringify({{ orderId: orderId, status: "DELIVERED" }})
            }})
            .then(res => res.json())
            .then(() => {{
                syncBackground();
            }})
            .catch(err => {{
                alert("Error al confirmar entrega: " + err);
            }});
        }}

        function refreshData() {{
            syncBackground();
        }}

        function syncBackground() {{
            Promise.all([
                fetch('/api/orders').then(r => r.json()),
                fetch('/api/table-states').then(r => r.json()),
                fetch('/api/products').then(r => r.json())
            ])
            .then(([newOrders, newTables, newProducts]) => {{
                orders = newOrders;
                tableStates = newTables;
                products = newProducts;

                // Detectar pedidos listos recién actualizados
                newOrders.forEach(o => {{
                    if (o.status === 'READY' && !knownReadyOrderIds.has(o.id)) {{
                        knownReadyOrderIds.add(o.id);
                        showReadyAlertBanner(o);
                    }}
                }});

                renderTables();
                renderReadyOrders();
            }})
            .catch(err => console.log("Sync error: " + err));
        }}
            // ==========================================
        // GESTIÓN DE MODIFICADORES EN FORMULARIO ADMIN
        // ==========================================
        function addFormModifierRow(name = "", priceUsd = 0.0) {{
            const container = document.getElementById('form-modifiers-container');
            if (!container) return;
            const row = document.createElement('div');
            row.className = "flex items-center gap-2 bg-white p-2 rounded-xl border border-purple-200 shadow-sm modifier-form-row";
            row.innerHTML = `
                <input type="text" placeholder="Nombre (ej: Queso Extra)" value="${{name}}" class="mod-name flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-purple-600">
                <div class="flex items-center gap-1 w-24">
                    <span class="text-xs text-slate-500 font-bold">$</span>
                    <input type="number" step="0.01" min="0" placeholder="0.00" value="${{priceUsd}}" class="mod-price w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono focus:outline-none focus:border-purple-600">
                </div>
                <button type="button" onclick="this.parentElement.remove()" class="text-rose-500 hover:text-rose-700 p-1">
                    <span class="material-icons text-sm">delete</span>
                </button>
            `;
            container.appendChild(row);
        }}

        function getFormModifiers() {{
            const rows = document.querySelectorAll('.modifier-form-row');
            const result = [];
            rows.forEach(r => {{
                const nameInput = r.querySelector('.mod-name');
                const priceInput = r.querySelector('.mod-price');
                if (nameInput && nameInput.value.trim()) {{
                    result.push({{
                        name: nameInput.value.trim(),
                        priceUsd: parseFloat(priceInput.value || 0)
                    }});
                }}
            }});
            return result;
        }}

        // ==========================================
        // ANALÍTICA, GRÁFICOS Y EXPORTACIÓN A EXCEL
        // ==========================================
        function renderReports() {{
            const paidOrders = orders.filter(o => o.paymentStatus === 'PAID');
            const totalUsd = paidOrders.reduce((sum, o) => sum + (o.totalUsd || 0), 0);
            const totalBs = totalUsd * exchangeRate;
            const avgTicket = paidOrders.length > 0 ? (totalUsd / paidOrders.length) : 0;

            document.getElementById('rep-kpi-total-usd').textContent = `$${{totalUsd.toFixed(2)}}`;
            document.getElementById('rep-kpi-total-bs').textContent = `${{totalBs.toFixed(2)}} Bs`;
            document.getElementById('rep-kpi-avg-ticket').textContent = `$${{avgTicket.toFixed(2)}}`;
            document.getElementById('rep-kpi-orders-count').textContent = paidOrders.length;

            // Calcular ventas por producto
            const prodCounts = {{}};
            const prodRevenue = {{}};
            paidOrders.forEach(o => {{
                (o.items || []).forEach(it => {{
                    const name = it.productName || 'Producto';
                    prodCounts[name] = (prodCounts[name] || 0) + it.quantity;
                    prodRevenue[name] = (prodRevenue[name] || 0) + (it.unitTotalUsd || it.priceUsd || 0) * it.quantity;
                }});
            }});

            // Top Producto
            let topName = "Sin ventas aún";
            let topQty = 0;
            for (const name in prodCounts) {{
                if (prodCounts[name] > topQty) {{
                    topQty = prodCounts[name];
                    topName = name;
                }}
            }}
            document.getElementById('rep-kpi-top-product').textContent = topName;
            document.getElementById('rep-kpi-top-qty').textContent = `${{topQty}} unidades vendidas`;

            // Gráfico 1: Ventas por Hora (08:00 a 23:00)
            const hourTotals = new Array(24).fill(0);
            paidOrders.forEach(o => {{
                if (o.timestamp) {{
                    // Extraer hora si es formato "YYYY-MM-DD HH:MM PM" o similar
                    let hour = 12;
                    if (o.timestamp.includes(':')) {{
                        const parts = o.timestamp.split(' ');
                        const timePart = parts[1] || '';
                        let h = parseInt(timePart.split(':')[0] || '12');
                        const isPm = o.timestamp.toUpperCase().includes('PM');
                        const isAm = o.timestamp.toUpperCase().includes('AM');
                        if (isPm && h < 12) h += 12;
                        if (isAm && h === 12) h = 0;
                        hour = Math.min(23, Math.max(0, h));
                    }}
                    hourTotals[hour] += (o.totalUsd || 0);
                }}
            }});

            const relevantHours = [8, 10, 12, 14, 16, 18, 20, 22];
            const maxHourVal = Math.max(...hourTotals.slice(8, 23), 10);
            const chartHourly = document.getElementById('chart-hourly-sales');
            chartHourly.innerHTML = "";

            for (let h = 8; h <= 22; h++) {{
                const val = hourTotals[h];
                const pct = Math.min(100, Math.max(8, (val / maxHourVal) * 100));
                const bar = document.createElement('div');
                bar.className = "flex-1 flex flex-col items-center gap-1 group relative h-full justify-end";
                bar.innerHTML = `
                    <div class="text-[9px] font-mono text-purple-700 font-bold opacity-0 group-hover:opacity-100 transition absolute -top-5">$${{val.toFixed(0)}}</div>
                    <div class="w-full bg-gradient-to-t from-purple-700 to-indigo-500 rounded-t-lg transition-all duration-500 hover:brightness-110 shadow-sm" style="height: ${{pct}}%;"></div>
                    <span class="text-[9px] text-slate-400 font-mono">${{h}}h</span>
                `;
                chartHourly.appendChild(bar);
            }}

            // Gráfico 2: Top 5 Platos
            const sortedProds = Object.keys(prodCounts).sort((a, b) => prodCounts[b] - prodCounts[a]).slice(0, 5);
            const topProductsCont = document.getElementById('chart-top-products');
            topProductsCont.innerHTML = "";

            if (sortedProds.length === 0) {{
                topProductsCont.innerHTML = '<div class="text-center py-6 text-slate-400 text-xs">No hay ventas registradas aún.</div>';
            }} else {{
                const maxProdQty = prodCounts[sortedProds[0]] || 1;
                sortedProds.forEach(name => {{
                    const qty = prodCounts[name];
                    const rev = prodRevenue[name] || 0;
                    const pct = Math.min(100, Math.max(15, (qty / maxProdQty) * 100));
                    const row = document.createElement('div');
                    row.className = "space-y-1";
                    row.innerHTML = `
                        <div class="flex justify-between text-xs">
                            <span class="font-bold text-slate-800">${{name}}</span>
                            <span class="font-mono text-slate-600 font-bold">${{qty}} uds • <strong class="text-purple-700">$${{rev.toFixed(2)}}</strong></span>
                        </div>
                        <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div class="bg-gradient-to-r from-purple-600 to-indigo-500 h-full rounded-full transition-all duration-500" style="width: ${{pct}}%;"></div>
                        </div>
                    `;
                    topProductsCont.appendChild(row);
                }});
            }}

            // Desglose Métodos de Pago
            const methodTotals = {{ "Efectivo $": 0, "Pago Móvil": 0, "Punto": 0, "Zelle": 0, "Efectivo Bs": 0, "Otros": 0 }};
            paidOrders.forEach(o => {{
                const m = (o.paymentMethod || '').toUpperCase();
                const t = o.totalUsd || 0;
                if (m.includes('PAGO')) methodTotals["Pago Móvil"] += t;
                else if (m.includes('PUNTO')) methodTotals["Punto"] += t;
                else if (m.includes('ZELLE')) methodTotals["Zelle"] += t;
                else if (m.includes('BS')) methodTotals["Efectivo Bs"] += t;
                else if (m.includes('EFECTIVO') || m.includes('USD')) methodTotals["Efectivo $"] += t;
                else methodTotals["Otros"] += t;
            }});

            const methodContainer = document.getElementById('chart-payment-methods');
            methodContainer.innerHTML = Object.entries(methodTotals).map(([method, amt]) => `
                <div class="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center space-y-0.5">
                    <span class="text-[10px] text-slate-500 font-bold block truncate uppercase">${{method}}</span>
                    <span class="text-sm font-black text-slate-900 font-mono block">$${{amt.toFixed(2)}}</span>
                    <span class="text-[10px] text-purple-700 font-bold font-mono block">${{(amt * exchangeRate).toFixed(2)}} Bs</span>
                </div>
            `).join("");
        }}

        // ==========================================
        // EXPORTACIÓN DE DATOS A EXCEL (.CSV UTF-8 BOM)
        // ==========================================
        function exportSalesToExcelCSV() {{
            if (orders.length === 0) {{
                alert("No hay ventas para exportar.");
                return;
            }}

            let csv = "\uFEFF"; // UTF-8 Byte Order Mark para compatibilidad perfecta con Microsoft Excel
            csv += `ID Pedido;Fecha y Hora;Mesa;Mozo;Productos y Extras;Metodo de Pago;Estado Pago;Total USD;Total Bs\n`;

            orders.forEach(o => {{
                const id = o.id || "";
                const fecha = (o.timestamp || "").replace(/;/g, ',');
                const mesa = (o.tableNumber || "").replace(/;/g, ',');
                const mozo = (o.waiterName || "N/A").replace(/;/g, ',');
                
                const itemsStr = (o.items || []).map(it => {{
                    let text = `${{it.quantity}}x ${{it.productName}}`;
                    if (it.selectedModifiers && it.selectedModifiers.length > 0) {{
                        text += " (" + it.selectedModifiers.map(m => m.name).join(', ') + ")";
                    }}
                    return text;
                }}).join(" + ").replace(/;/g, ',');

                const metodo = (o.paymentMethod || "").replace(/;/g, ',');
                const estado = o.paymentStatus === 'PAID' ? 'PAGADO' : 'PENDIENTE';
                const totalUsd = (o.totalUsd || 0).toFixed(2);
                const totalBs = ((o.totalUsd || 0) * exchangeRate).toFixed(2);

                csv += `${{id}};${{fecha}};${{mesa}};${{mozo}};"${{itemsStr}}";${{metodo}};${{estado}};${{totalUsd}};${{totalBs}}\n`;
            }});

            const blob = new Blob([csv], {{ type: 'text/csv;charset=utf-8;' }});
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `Ventas_GastroLocal_${{new Date().toISOString().slice(0,10)}}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }}

        function exportInventoryToExcelCSV() {{
            if (products.length === 0) {{
                alert("No hay productos en inventario para exportar.");
                return;
            }}

            let csv = "\uFEFF";
            csv += `ID;Nombre Producto;Categoria;Estacion;Precio USD;Precio Bs;Stock Actual;Modificadores / Extras;Estado\n`;

            products.forEach(p => {{
                const id = p.id;
                const name = (p.name || "").replace(/;/g, ',');
                const cat = categories.find(c => c.id === p.categoryId);
                const catName = cat ? cat.name.replace(/;/g, ',') : "General";
                const station = cat ? (cat.station || "kitchen").toUpperCase() : "KITCHEN";
                const priceUsd = (p.priceUsd || 0).toFixed(2);
                const priceBs = ((p.priceUsd || 0) * exchangeRate).toFixed(2);
                const stock = p.stock || 0;
                
                const modsStr = (p.modifiers || []).map(m => `${{m.name}} (+$${{m.priceUsd}})`).join(', ').replace(/;/g, ',');
                const estado = p.isAvailable ? "DISPONIBLE" : "NO DISPONIBLE";

                csv += `${{id}};"${{name}}";${{catName}};${{station}};${{priceUsd}};${{priceBs}};${{stock}};"${{modsStr}}";${{estado}}\n`;
            }});

            const blob = new Blob([csv], {{ type: 'text/csv;charset=utf-8;' }});
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `Inventario_GastroLocal_${{new Date().toISOString().slice(0,10)}}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }}
    </script>
</body>
</html>
"""

    # RETORNA LA PANTALLA DE BLOQUEO DE LICENCIA (Para bloqueo offline ultra-seguro)
    def get_license_locked_html(self, state):
        installation_id = state["installationId"]
        message = state["message"]
        status = state["status"]
        
        status_title = "Licencia Suspendida" if status == "expired" else "Reloj del Sistema Alterado"
        icon_name = "history_toggle_off" if status == "clock_tampering" else "lock"
        
        return f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{status_title} - GastroLocal</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        body {{
            font-family: 'Plus Jakarta Sans', sans-serif;
        }}
    </style>
</head>
<body class="bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 text-slate-100 min-h-screen flex items-center justify-center p-4">
    <div class="max-w-lg w-full bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl shadow-purple-950/40 backdrop-blur-xl space-y-8 relative overflow-hidden">
        
        <!-- Decoración de Fondo -->
        <div class="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div class="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl"></div>

        <!-- Encabezado con Icono -->
        <div class="text-center space-y-4">
            <div class="w-20 h-20 bg-gradient-to-tr from-purple-500 via-purple-600 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-purple-500/20 animate-pulse">
                <span class="material-icons text-white text-4xl">{icon_name}</span>
            </div>
            <div class="space-y-2">
                <span class="inline-block bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-bold tracking-wider uppercase px-3 py-1 rounded-full">
                    {status_title}
                </span>
                <h1 class="text-3xl font-black text-white tracking-tight">Acceso Suspendido</h1>
                <p class="text-slate-300 text-sm max-w-sm mx-auto leading-relaxed">
                    {message}
                </p>
            </div>
        </div>

        <!-- ID de Instalación y Períodos -->
        <div class="space-y-4 bg-white/5 border border-white/5 rounded-2xl p-5">
            <div class="flex items-center justify-between">
                <span class="text-xs text-slate-400 font-semibold uppercase tracking-wider">ID de Instalación</span>
                <button onclick="copiarID()" class="text-xs text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1 active:scale-95">
                    <span class="material-icons text-sm">content_copy</span> Copiar ID
                </button>
            </div>
            <div class="flex items-center justify-between bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 font-mono text-lg font-bold text-indigo-300 select-all" id="install-id">
                {installation_id}
            </div>
            
            <div class="space-y-2 pt-2">
                <label for="period-select" class="block text-xs text-slate-400 font-semibold uppercase tracking-wider">Período de Activación</label>
                <select id="period-select" class="w-full bg-slate-900/60 border border-white/15 hover:border-white/25 rounded-xl px-4 py-3 text-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition">
                    <!-- Dinámico con JS -->
                </select>
            </div>
        </div>

        <!-- Input de Código y Botón -->
        <div class="space-y-4">
            <div class="space-y-2">
                <label for="activation-code" class="block text-xs text-slate-400 font-semibold uppercase tracking-wider">Código de Activación Mensual</label>
                <input type="text" id="activation-code" placeholder="Escribe el código de 8 dígitos..." 
                    class="w-full bg-slate-900/80 border border-white/15 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30 rounded-xl px-4 py-3.5 text-center font-mono text-xl font-bold tracking-widest text-purple-200 placeholder:text-slate-600 focus:outline-none uppercase transition-all">
            </div>

            <button onclick="activarLicencia()" id="btn-activate"
                class="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-sm py-4 rounded-xl shadow-lg shadow-purple-600/30 hover:shadow-purple-500/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                <span class="material-icons text-sm">vpn_key</span> ACTIVAR SISTEMA
            </button>
        </div>

        <!-- Instrucciones para el Cliente -->
        <div class="text-center pt-2 border-t border-white/5 space-y-2">
            <p class="text-xs text-slate-400 leading-normal">
                Para obtener su código de activación mensual, realice el pago correspondiente y envíe su ID de instalación al administrador del sistema.
            </p>
            <a href="https://wa.me/?text=Hola%2C%20necesito%20mi%20c%C3%B3digo%20de%20activaci%C3%B3n%20para%20GastroLocal.%20Mi%20ID%20de%20Instalaci%C3%B3n%20es%3A%20{installation_id}" 
                target="_blank" class="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition">
                <span class="material-icons text-sm">chat</span> Contactar Soporte por WhatsApp
            </a>
        </div>

        <!-- Feedback Toasts -->
        <div id="toast" class="hidden fixed bottom-6 left-1/2 -translate-x-1/2 bg-rose-500 text-white text-xs font-bold px-6 py-3.5 rounded-xl shadow-xl flex items-center gap-2 transition-all duration-300 z-50">
            <span class="material-icons text-sm" id="toast-icon">error</span>
            <span id="toast-text">Código inválido</span>
        </div>

    </div>

    <script>
        // Cargar los meses dinámicamente
        const select = document.getElementById('period-select');
        const now = new Date();
        for (let i = 0; i < 4; i++) {{
            const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const val = `${{year}}-${{month}}`;
            
            // Nombre de mes bonito en español
            const name = d.toLocaleString('es-ES', {{ month: 'long', year: 'numeric' }});
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = name.charAt(0).toUpperCase() + name.slice(1);
            select.appendChild(opt);
        }}

        function showToast(text, isError = true) {{
            const toast = document.getElementById('toast');
            const icon = document.getElementById('toast-icon');
            const textEl = document.getElementById('toast-text');
            
            toast.className = `fixed bottom-6 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-6 py-3.5 rounded-xl shadow-xl flex items-center gap-2 transition-all duration-300 z-50 ` + 
                (isError ? "bg-rose-600 border border-rose-500/30" : "bg-emerald-600 border border-emerald-500/30");
            
            icon.textContent = isError ? "error" : "check_circle";
            textEl.textContent = text;
            toast.classList.remove('hidden');
            
            setTimeout(() => {{
                toast.classList.add('hidden');
            }}, 4000);
        }}

        function copiarID() {{
            const installId = document.getElementById('install-id').textContent.trim();
            navigator.clipboard.writeText(installId).then(() => {{
                showToast("¡ID Copiado al portapapeles!", false);
            }}).catch(() => {{
                showToast("Error al copiar");
            }});
        }}

        function activarLicencia() {{
            const code = document.getElementById('activation-code').value.trim();
            const period = document.getElementById('period-select').value;
            const btn = document.getElementById('btn-activate');

            if (!code) {{
                showToast("Por favor, ingresa el código de activación.");
                return;
            }}

            btn.disabled = true;
            btn.innerHTML = `<span class="animate-spin material-icons text-sm">sync</span> ACTIVANDO...`;

            fetch('/api/license/activate', {{
                method: 'POST',
                headers: {{ 'Content-Type': 'application/json' }},
                body: JSON.stringify({{ code, period }})
            }})
            .then(res => res.json().then(data => ({{ status: res.status, data }})))
            .then(res => {{
                if (res.status === 200) {{
                    showToast("¡Sistema activado con éxito! Recargando...", false);
                    setTimeout(() => {{
                        window.location.reload();
                    }}, 2000);
                }} else {{
                    showToast(res.data.message || "Error al activar");
                    btn.disabled = false;
                    btn.innerHTML = `<span class="material-icons text-sm">vpn_key</span> ACTIVAR SISTEMA`;
                }}
            }})
            .catch(err => {{
                showToast("Error de conexión con el servidor");
                btn.disabled = false;
                btn.innerHTML = `<span class="material-icons text-sm">vpn_key</span> ACTIVAR SISTEMA`;
            }});
        }}
    </script>
</body>
</html>"""

    # RETORNA EL HTML DEL PANEL DE ADMINISTRACIÓN (Visual, Autorefrescable por Polling para Cocina)
    def get_admin_panel_html(self, db):
        exchange_rate = db["config"]["exchangeRateBs"]
        total_tables = db["config"].get("totalTables", 10)
        admin_pin = db["config"].get("adminPin", "1234")
        restaurant_name = db["config"].get("restaurantName", "GastroLocal Criollo")
        restaurant_slogan = db["config"].get("restaurantSlogan", "Sabor Tradicional & Calidad")
        restaurant_logo = db["config"].get("restaurantLogo", "")
        restaurant_rif = db["config"].get("restaurantRif", "J-50123456-7")
        restaurant_address = db["config"].get("restaurantAddress", "Av. Principal, C.C. Gourmet Plaza, Nivel PB, Local 04")
        restaurant_phone = db["config"].get("restaurantPhone", "+58 412-1234567")
        restaurant_instagram = db["config"].get("restaurantInstagram", "@gastrolocal_criollo")
        ticket_footer = db["config"].get("ticketFooter", "¡Muchas gracias por su compra y preferencia!\nClave WiFi: Gastro2026\nEscanee el QR para volver a pedir.")
        pago_movil = db["config"].get("pagoMovil", {
            "bank": "",
            "phone": "",
            "idNumber": "",
            "accountName": ""
        })
        pm_bank = pago_movil.get("bank", "")
        pm_phone = pago_movil.get("phone", "")
        pm_id = pago_movil.get("idNumber", "")
        pm_name = pago_movil.get("accountName", "")
        config_json = json.dumps(db["config"], ensure_ascii=False)

        orders_json = json.dumps(db["orders"], ensure_ascii=False)
        products_json = json.dumps(db["products"], ensure_ascii=False)
        categories_json = json.dumps(db["categories"], ensure_ascii=False)
        table_states_json = json.dumps(db.get("tableStates", {}), ensure_ascii=False)
        session_token = SESSION_TOKEN
        server_ip = get_ip_address()
        
        return f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{restaurant_name} - Panel de Administración</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400;1,700&family=Inter:wght@400;600;700;800;900&family=JetBrains+Mono:wght@400;700;800&display=swap" rel="stylesheet">
    <style>
        body {{ font-family: 'Inter', sans-serif; }}
        
        @keyframes shake {{
            0%, 100% {{ transform: translateX(0); }}
            25% {{ transform: translateX(-8px); }}
            75% {{ transform: translateX(8px); }}
        }}
        .animate-shake {{
            animation: shake 0.2s ease-in-out 2;
        }}
        
        @media print {{
            @page {{
                size: portrait;
                margin: 8mm;
            }}
            body {{
                background: white !important;
                color: black !important;
                padding: 0 !important;
                margin: 0 !important;
            }}
            
            /* Cuando se está imprimiendo el Ticket */
            body.printing-ticket nav,
            body.printing-ticket main,
            body.printing-ticket #pin-overlay,
            body.printing-ticket #payment-modal,
            body.printing-ticket #cash-register-modal,
            body.printing-ticket #product-modal,
            body.printing-ticket #category-modal,
            body.printing-ticket #toast,
            body.printing-ticket .print\\:hidden,
            body.printing-ticket button,
            body.printing-ticket .no-print {{
                display: none !important;
            }}

            body.printing-ticket #ticket-modal {{
                position: static !important;
                inset: auto !important;
                display: block !important;
                background: white !important;
                padding: 0 !important;
                margin: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                box-shadow: none !important;
                border: none !important;
            }}

            body.printing-ticket #ticket-modal > div {{
                position: static !important;
                display: block !important;
                width: 100% !important;
                max-width: 80mm !important;
                margin: 0 auto !important;
                padding: 0 !important;
                border: none !important;
                box-shadow: none !important;
                background: white !important;
            }}

            body.printing-ticket #admin-ticket-content-wrapper {{
                box-shadow: none !important;
                border: none !important;
                padding: 0 !important;
            }}

            /* Cuando se está imprimiendo el Cierre Z */
            body.printing-z-report nav,
            body.printing-z-report main,
            body.printing-z-report #pin-overlay,
            body.printing-z-report #payment-modal,
            body.printing-z-report #ticket-modal,
            body.printing-z-report #product-modal,
            body.printing-z-report #toast,
            body.printing-z-report .print\\:hidden,
            body.printing-z-report button {{
                display: none !important;
            }}

            body.printing-z-report #cash-register-modal {{
                position: static !important;
                inset: auto !important;
                display: block !important;
                background: white !important;
                padding: 0 !important;
                margin: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                box-shadow: none !important;
                border: none !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
            }}

            body.printing-z-report #cash-register-modal > div {{
                position: static !important;
                display: block !important;
                width: 100% !important;
                max-width: 100% !important;
                max-height: none !important;
                overflow: visible !important;
                padding: 0 !important;
                margin: 0 !important;
                border: none !important;
                box-shadow: none !important;
                background: white !important;
            }}

            body.printing-z-report #z-report-content {{
                max-height: none !important;
                overflow: visible !important;
            }}

            /* Modo Impresión Normal (por ejemplo, Tarjetas QR) */
            body:not(.printing-z-report):not(.printing-ticket) nav, 
            body:not(.printing-z-report):not(.printing-ticket) main > div:not(#view-qr), 
            body:not(.printing-z-report):not(.printing-ticket) .print\\:hidden, 
            body:not(.printing-z-report):not(.printing-ticket) #cash-register-modal,
            body:not(.printing-z-report):not(.printing-ticket) #payment-modal,
            body:not(.printing-z-report):not(.printing-ticket) #ticket-modal,
            body:not(.printing-z-report):not(.printing-ticket) #product-modal,
            body:not(.printing-z-report):not(.printing-ticket) #pin-overlay {{
                display: none !important;
            }}

            #view-qr {{
                display: block !important;
                padding: 0 !important;
                border: none !important;
                box-shadow: none !important;
            }}
            #view-qr > div {{
                border: none !important;
                box-shadow: none !important;
                padding: 0 !important;
            }}
            #qr-cards-container {{
                display: grid !important;
                grid-template-columns: repeat(2, 1fr) !important;
                gap: 1.5cm !important;
                padding: 0 !important;
            }}
            .page-break-inside-avoid {{
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                border: 2px solid #ddd !important;
                box-shadow: none !important;
                margin-bottom: 1cm !important;
            }}
        }}
    </style>
</head>
<body class="bg-slate-100 text-slate-800 pb-12 font-sans">
    <!-- Pantalla de Bloqueo por PIN de Seguridad -->
    <div id="pin-overlay" class="fixed inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 flex flex-col items-center justify-center z-50 transition-all duration-300">
        <div class="max-w-md w-[92%] mx-auto px-6 py-8 text-center space-y-8 bg-white/5 border border-white/10 rounded-3xl shadow-2xl shadow-purple-950/40 backdrop-blur-xl">
            <div class="space-y-3">
                <div class="w-16 h-16 bg-gradient-to-tr from-purple-500 via-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-purple-500/30 animate-pulse">
                    <span class="material-icons text-white text-3xl">lock</span>
                </div>
                <h2 class="text-2xl font-extrabold text-white tracking-tight bg-clip-text bg-gradient-to-r from-white to-slate-200">Panel de Administración</h2>
                <p class="text-xs text-slate-300 font-semibold">Introduce el PIN de acceso para continuar</p>
            </div>

            <!-- Visualizador del PIN ingresado -->
            <div class="flex items-center justify-center gap-4 py-2">
                <div id="dot-1" class="w-4.5 h-4.5 rounded-full border-2 border-white/20 bg-white/5 transition-all duration-150"></div>
                <div id="dot-2" class="w-4.5 h-4.5 rounded-full border-2 border-white/20 bg-white/5 transition-all duration-150"></div>
                <div id="dot-3" class="w-4.5 h-4.5 rounded-full border-2 border-white/20 bg-white/5 transition-all duration-150"></div>
                <div id="dot-4" class="w-4.5 h-4.5 rounded-full border-2 border-white/20 bg-white/5 transition-all duration-150"></div>
            </div>

            <!-- Campo de entrada directo y botón de acceso -->
            <!-- Campo de entrada directo y botón de acceso -->
            <div class="flex items-center justify-center gap-2 max-w-[280px] mx-auto">
                <input type="password" id="pin-direct-input" maxlength="8" placeholder="O escribe tu PIN" 
                       class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-center text-white font-mono text-base tracking-widest placeholder:text-slate-400 placeholder:text-xs placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                       oninput="handleDirectPinInput(this.value)" onkeydown="if(event.key==='Enter') submitPin();">
                <button id="btn-submit-pin" onclick="submitPin()" class="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-lg shadow-purple-900/40">
                    <span>ENTRAR</span>
                    <span class="material-icons text-sm">arrow_forward</span>
                </button>
            </div>
            <div id="pin-error-msg" class="hidden text-xs text-rose-400 font-bold bg-rose-950/60 border border-rose-800/80 rounded-xl py-2 px-3 animate-pulse"></div>

            <!-- Teclado Numérico -->
            <div class="grid grid-cols-3 gap-4 max-w-[280px] mx-auto">
                <button onclick="pressPin('1')" class="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 text-white font-extrabold text-xl hover:bg-white/15 hover:border-white/25 transition-all flex items-center justify-center active:scale-90 shadow-sm backdrop-blur-sm">1</button>
                <button onclick="pressPin('2')" class="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 text-white font-extrabold text-xl hover:bg-white/15 hover:border-white/25 transition-all flex items-center justify-center active:scale-90 shadow-sm backdrop-blur-sm">2</button>
                <button onclick="pressPin('3')" class="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 text-white font-extrabold text-xl hover:bg-white/15 hover:border-white/25 transition-all flex items-center justify-center active:scale-90 shadow-sm backdrop-blur-sm">3</button>
                <button onclick="pressPin('4')" class="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 text-white font-extrabold text-xl hover:bg-white/15 hover:border-white/25 transition-all flex items-center justify-center active:scale-90 shadow-sm backdrop-blur-sm">4</button>
                <button onclick="pressPin('5')" class="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 text-white font-extrabold text-xl hover:bg-white/15 hover:border-white/25 transition-all flex items-center justify-center active:scale-90 shadow-sm backdrop-blur-sm">5</button>
                <button onclick="pressPin('6')" class="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 text-white font-extrabold text-xl hover:bg-white/15 hover:border-white/25 transition-all flex items-center justify-center active:scale-90 shadow-sm backdrop-blur-sm">6</button>
                <button onclick="pressPin('7')" class="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 text-white font-extrabold text-xl hover:bg-white/15 hover:border-white/25 transition-all flex items-center justify-center active:scale-90 shadow-sm backdrop-blur-sm">7</button>
                <button onclick="pressPin('8')" class="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 text-white font-extrabold text-xl hover:bg-white/15 hover:border-white/25 transition-all flex items-center justify-center active:scale-90 shadow-sm backdrop-blur-sm">8</button>
                <button onclick="pressPin('9')" class="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 text-white font-extrabold text-xl hover:bg-white/15 hover:border-white/25 transition-all flex items-center justify-center active:scale-90 shadow-sm backdrop-blur-sm">9</button>
                <button onclick="clearPin()" class="w-16 h-16 rounded-2xl bg-transparent text-slate-300 font-bold text-[11px] hover:text-white transition-all flex items-center justify-center active:scale-90">BORRAR</button>
                <button onclick="pressPin('0')" class="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 text-white font-extrabold text-xl hover:bg-white/15 hover:border-white/25 transition-all flex items-center justify-center active:scale-90 shadow-sm backdrop-blur-sm">0</button>
                <button onclick="deleteLast()" class="w-16 h-16 rounded-2xl bg-transparent text-slate-300 hover:text-white transition-all flex items-center justify-center active:scale-90">
                    <span class="material-icons text-xl">backspace</span>
                </button>
            </div>

            <div class="text-[11px] text-slate-500 font-medium">
                💡 Nota: El PIN predeterminado es <strong class="text-slate-400">1234</strong>. Puedes cambiarlo en la barra superior al ingresar.
            </div>
        </div>
    </div>

    <!-- Contenido Principal Protegido -->
    <div id="admin-main-content" class="hidden">
        <nav class="bg-slate-900 text-white shadow-md">
            <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="p-2 bg-purple-600 rounded-xl">
                        <span class="material-icons">dashboard</span>
                    </div>
                    <div>
                        <h1 class="text-lg font-bold">GastroLocal - Panel PC</h1>
                        <p class="text-xs text-slate-400">Panel de Control y Monitor de Cocina</p>
                    </div>
                </div>
                
                <div class="flex items-center gap-4">
                    <!-- Tasa de Cambio -->
                    <div class="bg-slate-800 p-2 px-3.5 rounded-xl border border-slate-700 flex items-center gap-2.5">
                        <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tasa:</span>
                        <input type="number" id="input-rate" value="{exchange_rate:.2f}" step="0.01" class="w-24 bg-slate-700 text-white rounded px-2 py-0.5 text-center text-sm font-extrabold focus:outline-none focus:ring-1 focus:ring-purple-500">
                        <span class="text-xs font-bold text-slate-400">Bs/$</span>
                        <div class="flex items-center gap-1">
                            <button onclick="updateRate()" class="bg-purple-600 hover:bg-purple-700 text-white p-1 rounded text-xs font-bold transition" title="Guardar Manualmente">
                                <span class="material-icons text-sm block">save</span>
                            </button>
                            <button onclick="sincronizarTasaDolarApi(this)" class="bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white p-1 rounded text-xs font-bold transition border border-slate-600 flex items-center justify-center" title="Sincronizar desde DolarApi (BCV)">
                                <span class="material-icons text-sm block">sync</span>
                            </button>
                        </div>
                    </div>

                    <!-- PIN de Acceso -->
                    <div class="bg-slate-800 p-2 px-4 rounded-xl border border-slate-700 flex items-center gap-3">
                        <span class="text-xs font-semibold text-slate-400">PIN ADMIN:</span>
                        <input type="password" id="input-pin" value="{admin_pin}" class="w-14 bg-slate-700 text-white rounded px-1 text-center text-sm font-bold focus:outline-none" maxlength="6" placeholder="1234">
                        <button onclick="updatePin()" class="bg-purple-600 text-white px-2 py-1 rounded text-xs font-bold hover:bg-purple-700 transition">Guardar</button>
                    </div>

                    <!-- Botón Cierre de Caja / Turno (Reporte Z) -->
                    <button onclick="openCashRegisterModal()" class="bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-xs px-3.5 py-2.5 rounded-xl border border-emerald-500/30 shadow-md flex items-center gap-1.5 transition active:scale-95" title="Abrir Cierre de Caja y Cuadre de Turno (Reporte Z)">
                        <span class="material-icons text-sm">point_of_sale</span>
                        <span class="hidden md:inline">Cierre de Caja</span>
                    </button>

                    <!-- Botón de Cerrar Sesión y Respaldar -->
                    <button onclick="logoutWithBackup(this)" class="bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl border border-red-500/10 shadow-sm flex items-center gap-2 transition active:scale-95" title="Cerrar sesión y realizar copia de seguridad en Pendrive / Unidad Externa">
                        <span class="material-icons text-sm">power_settings_new</span>
                        <span class="hidden sm:inline">Cerrar Sesión</span>
                    </button>
                    
                    <div class="flex flex-col items-end hidden lg:flex">
                        <span class="text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <span class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span> Servidor Local Activo
                        </span>
                        <span class="text-[10px] text-slate-400 mt-1" id="local-ip">IP: {get_ip_address()}</span>
                    </div>
                </div>
            </div>
        </nav>

    <main class="max-w-7xl mx-auto px-6 py-6">
        <!-- Navegación de Pestañas del Admin -->
        <div class="flex flex-wrap border border-slate-200/60 mb-6 bg-white rounded-2xl p-2 shadow-sm gap-2 print:hidden">
            <button onclick="switchTab('pedidos')" id="tab-pedidos" class="flex-1 min-w-[130px] py-3 px-3 rounded-xl font-bold text-xs sm:text-sm text-purple-700 bg-purple-50 flex items-center justify-center gap-1.5 transition-all">
                <span class="material-icons text-base">kitchen</span> Pedidos y Cobros
            </button>
            <button onclick="switchTab('pagos')" id="tab-pagos" class="flex-1 min-w-[130px] py-3 px-3 rounded-xl font-bold text-xs sm:text-sm text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-all relative">
                <span class="material-icons text-base">verified_user</span> Validación Pago Móvil
                <span id="badge-pagos-pendientes" class="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm hidden">0</span>
            </button>
            <button onclick="switchTab('mesas')" id="tab-mesas" class="flex-1 min-w-[130px] py-3 px-3 rounded-xl font-bold text-xs sm:text-sm text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-all relative">
                <span class="material-icons text-base">table_restaurant</span> Mesas
                <span id="badge-mesas-ocupadas" class="bg-slate-200 text-slate-600 text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">0</span>
            </button>
            <button onclick="switchTab('inventario')" id="tab-inventario" class="flex-1 min-w-[130px] py-3 px-3 rounded-xl font-bold text-xs sm:text-sm text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-all">
                <span class="material-icons text-base">inventory_2</span> Inventario
            </button>
            <button onclick="switchTab('ventas')" id="tab-ventas" class="flex-1 min-w-[130px] py-3 px-3 rounded-xl font-bold text-xs sm:text-sm text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-all">
                <span class="material-icons text-base">trending_up</span> Reportes / BI
            </button>
            <button onclick="switchTab('qr')" id="tab-qr" class="flex-1 min-w-[130px] py-3 px-3 rounded-xl font-bold text-xs sm:text-sm text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-all">
                <span class="material-icons text-base">qr_code_2</span> QR Mesas
            </button>
            <button onclick="switchTab('config')" id="tab-config" class="flex-1 min-w-[130px] py-3 px-3 rounded-xl font-bold text-xs sm:text-sm text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-all">
                <span class="material-icons text-base">receipt_long</span> Mi Negocio & Tickets
            </button>
        </div>

        <!-- Vista de Pedidos y Cobros -->
        <div id="view-pedidos" class="space-y-6">
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div class="flex flex-wrap justify-between items-center gap-4 mb-6">
                    <div>
                        <h2 class="text-base font-bold flex items-center gap-2">
                            <span class="material-icons text-purple-600">kitchen</span> Monitor de Pedidos Activos
                        </h2>
                        <p class="text-xs text-slate-500 mt-0.5" id="last-update">Buscando nuevos pedidos...</p>
                    </div>
                    
                    <div class="flex flex-wrap items-center gap-3">
                        <button onclick="switchTab('mesas')" class="bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200/80 px-3.5 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition shadow-sm active:scale-95" title="Ver plano y mapa de mesas">
                            <span class="material-icons text-base text-purple-600">table_restaurant</span>
                            <span id="orders-header-table-status">Salón: 0/10 Ocupadas</span>
                        </button>
                        <!-- Filtros de Pedidos -->
                        <div class="flex bg-slate-100 p-1 rounded-xl gap-1 border border-slate-200">
                            <button onclick="setOrderFilter('PENDING')" id="btn-filter-pending" class="px-4 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-800 shadow-sm transition">Pendientes</button>
                            <button onclick="setOrderFilter('PREPARING')" id="btn-filter-preparing" class="px-4 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-white/50 transition">Cocina</button>
                            <button onclick="setOrderFilter('HISTORIAL')" id="btn-filter-historial" class="px-4 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-white/50 transition">Historial</button>
                        </div>
                    </div>
                </div>
                
                <div id="orders-monitor" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <!-- Pedidos se renderizan dinámicamente -->
                </div>
            </div>
        </div>

        <!-- Vista de Estado y Control de Mesas -->
        <div id="view-mesas" class="hidden space-y-6">
            <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-4">
                    <div>
                        <h2 class="text-base font-bold flex items-center gap-2">
                            <span class="material-icons text-purple-600">table_restaurant</span> Estado y Control de Mesas en Tiempo Real
                        </h2>
                        <p class="text-xs text-slate-500 mt-0.5">Monitorea la ocupación de tu salón, mesas con consumo activo y mesas libres para comensales.</p>
                    </div>
                    
                    <div class="flex items-center gap-3">
                        <button onclick="promptUpdateTotalTables()" class="bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2.5 rounded-xl font-bold text-xs border border-slate-200 transition flex items-center gap-2 shadow-sm active:scale-95">
                            <span class="material-icons text-sm text-purple-600">tune</span> Capacidad: <span id="label-total-tables-btn">10 Mesas</span>
                        </button>
                    </div>
                </div>

                <!-- KPI Summary Cards -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <!-- Total Mesas -->
                    <div class="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 flex items-center gap-3.5 shadow-sm">
                        <div class="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                            <span class="material-icons text-2xl">table_bar</span>
                        </div>
                        <div>
                            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Mesas</span>
                            <span id="kpi-total-tables" class="text-2xl font-black text-slate-900">10</span>
                            <span class="text-[10px] text-slate-500 block font-medium">Capacidad de salón</span>
                        </div>
                    </div>

                    <!-- Mesas Ocupadas -->
                    <div class="bg-amber-50/80 p-4 rounded-2xl border border-amber-200/80 flex items-center gap-3.5 shadow-sm">
                        <div class="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
                            <span class="material-icons text-2xl">no_meals</span>
                        </div>
                        <div>
                            <span class="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">Mesas Ocupadas</span>
                            <span id="kpi-occupied-tables" class="text-2xl font-black text-amber-950">0</span>
                            <span id="kpi-occupied-sub" class="text-[10px] text-amber-600 font-semibold block">Con pedido/Decidiendo</span>
                        </div>
                    </div>

                    <!-- Mesas Disponibles -->
                    <div class="bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200/80 flex items-center gap-3.5 shadow-sm">
                        <div class="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
                            <span class="material-icons text-2xl">check_circle</span>
                        </div>
                        <div>
                            <span class="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Mesas Libres</span>
                            <span id="kpi-free-tables" class="text-2xl font-black text-emerald-950">10</span>
                            <span class="text-[10px] text-emerald-600 font-semibold block">Listas para clientes</span>
                        </div>
                    </div>

                    <!-- Sillas / Pax Ocupadas -->
                    <div class="bg-purple-50/80 p-4 rounded-2xl border border-purple-200/80 flex items-center gap-3.5 shadow-sm">
                        <div class="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-500/20">
                            <span class="material-icons text-2xl">event_seat</span>
                        </div>
                        <div>
                            <span class="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">Aforo Sillas</span>
                            <div class="flex items-baseline gap-1">
                                <span id="kpi-occupied-chairs" class="text-2xl font-black text-purple-950">0</span>
                                <span class="text-xs text-purple-700 font-bold">/ <span id="kpi-total-chairs">40</span> Sillas</span>
                            </div>
                            <span class="text-[10px] text-purple-600 font-semibold block"><span id="kpi-free-chairs">40</span> Libres en salón</span>
                        </div>
                    </div>

                    <!-- Porcentaje de Ocupación -->
                    <div class="bg-indigo-50/80 p-4 rounded-2xl border border-indigo-200/80 flex flex-col justify-center shadow-sm">
                        <div class="flex justify-between items-center mb-1.5">
                            <span class="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Ocupación Salón</span>
                            <span id="kpi-occupancy-percent" class="text-xs font-black text-indigo-900">0%</span>
                        </div>
                        <div class="w-full bg-indigo-200/60 rounded-full h-3 overflow-hidden">
                            <div id="kpi-occupancy-bar" class="bg-gradient-to-r from-indigo-600 to-purple-600 h-full rounded-full transition-all duration-500" style="width: 0%"></div>
                        </div>
                        <span id="kpi-occupancy-label" class="text-[10px] text-indigo-600 font-medium mt-1">Salón disponible</span>
                    </div>
                </div>
            </div>

            <!-- Plano Visual y Filtros -->
            <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-6">
                <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <h3 class="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <span class="material-icons text-purple-600 text-base">grid_view</span> Mapa Interactivo de Mesas
                    </h3>
                    
                    <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <button onclick="setTableFilter('ALL')" id="btn-table-filter-all" class="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-800 shadow-sm transition">Todas (<span id="count-tables-all">10</span>)</button>
                        <button onclick="setTableFilter('OCCUPIED')" id="btn-table-filter-occupied" class="px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-white/50 transition">Ocupadas (<span id="count-tables-occupied">0</span>)</button>
                        <button onclick="setTableFilter('FREE')" id="btn-table-filter-free" class="px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-white/50 transition">Libres (<span id="count-tables-free">10</span>)</button>
                    </div>
                </div>

                <!-- Grid Container de Mesas -->
                <div id="tables-grid" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                    <!-- Renderizado dinámico de mesas -->
                </div>
            </div>
        </div>

        <!-- Vista de Inventario -->
        <div id="view-inventario" class="hidden space-y-6">
            <!-- Gestión de Categorías del Menú -->
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-base font-bold flex items-center gap-2">
                        <span class="material-icons text-purple-600 font-bold">category</span> Categorías del Menú
                    </h2>
                    <button onclick="openAddCategoryModal()" class="bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white px-4 py-2 rounded-xl flex items-center gap-1.5 font-bold text-xs transition shadow-md shadow-purple-500/10 active:scale-95">
                        <span class="material-icons text-sm">add</span> Crear Categoría
                    </button>
                </div>
                <div id="admin-categories-list" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <!-- Las categorías se cargarán dinámicamente aquí -->
                </div>
            </div>

            <!-- Productos del Menú -->
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-base font-bold flex items-center gap-2">
                        <span class="material-icons text-purple-600">inventory_2</span> Productos del Menú y Disponibilidad
                    </h2>
                    <button onclick="openAddProductModal()" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl flex items-center gap-1.5 font-bold text-xs transition shadow-sm">
                        <span class="material-icons text-sm">add</span> Agregar Producto
                    </button>
                </div>
                <div id="products-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <!-- Productos se renderizan aquí -->
                </div>
            </div>
        </div>

        <!-- Vista de Resumen de Ventas (BI) -->
        <div id="view-ventas" class="hidden space-y-6">
            <!-- KPI Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div class="bg-gradient-to-br from-purple-500 to-indigo-600 text-white p-6 rounded-3xl shadow-md border border-purple-400/20 relative overflow-hidden">
                    <span class="material-icons absolute right-4 bottom-4 text-white/10 text-7xl select-none">monetization_on</span>
                    <span class="text-xs font-bold text-purple-100 uppercase tracking-wide">Total USD Acumulado</span>
                    <h3 id="kpi-total-usd" class="text-3xl font-black mt-2">$0.00</h3>
                    <p class="text-xs text-purple-200 mt-1">Ventas finalizadas y cobradas</p>
                </div>
                <div class="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-6 rounded-3xl shadow-md border border-emerald-400/20 relative overflow-hidden">
                    <span class="material-icons absolute right-4 bottom-4 text-white/10 text-7xl select-none">payments</span>
                    <span class="text-xs font-bold text-emerald-100 uppercase tracking-wide">Equivalente en Bolívares (Bs)</span>
                    <h3 id="kpi-total-bs" class="text-3xl font-black mt-2">0.00 Bs</h3>
                    <p id="kpi-exchange-rate" class="text-xs text-emerald-200 mt-1">Calculado a tasa: 0.00 Bs/$</p>
                </div>
                <div class="bg-gradient-to-br from-amber-500 to-orange-600 text-white p-6 rounded-3xl shadow-md border border-amber-400/20 relative overflow-hidden">
                    <span class="material-icons absolute right-4 bottom-4 text-white/10 text-7xl select-none">receipt_long</span>
                    <span class="text-xs font-bold text-amber-100 uppercase tracking-wide">Transacciones Exitosas</span>
                    <h3 id="kpi-trans-count" class="text-3xl font-black mt-2">0</h3>
                    <p class="text-xs text-amber-200 mt-1">Cuentas cobradas con éxito</p>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Métricas por Método de Pago -->
                <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 lg:col-span-1">
                    <h3 class="font-bold text-slate-800 flex items-center gap-2 mb-4">
                        <span class="material-icons text-purple-600">donut_large</span> Ventas por Método de Pago
                    </h3>
                    <div id="sales-by-method-container" class="space-y-4">
                        <!-- Progreso por método -->
                    </div>
                </div>

                <!-- Historial de Transacciones -->
                <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 lg:col-span-2">
                    <h3 class="font-bold text-slate-800 flex items-center gap-2 mb-4">
                        <span class="material-icons text-purple-600">history</span> Historial de Transacciones Cobradas
                    </h3>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="border-b border-slate-100 text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                                    <th class="py-3 pr-2">Pedido</th>
                                    <th class="py-3 px-2">Fecha/Hora</th>
                                    <th class="py-3 px-2">Tipo / Ubicación</th>
                                    <th class="py-3 px-2">Método de Pago Detallado</th>
                                    <th class="py-3 px-2 text-right">Total USD</th>
                                    <th class="py-3 px-2 text-right">Total Bs</th>
                                    <th class="py-3 pl-2 text-right">Comprobante</th>
                                </tr>
                            </thead>
                            <tbody id="transactions-log-tbody" class="text-sm text-slate-600">
                                <!-- Filas de transacciones -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <!-- Vista de Códigos QR para Mesas -->
        <div id="view-qr" class="hidden space-y-6">
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-4">
                    <div>
                        <h2 class="text-base font-bold flex items-center gap-2">
                            <span class="material-icons text-purple-600">qr_code_2</span> Generador de Códigos QR para Mesas
                        </h2>
                        <p class="text-xs text-slate-500 mt-0.5">Genera, previsualiza e imprime tarjetas con códigos QR listos para colocar en tus mesas.</p>
                    </div>
                    <button onclick="window.print()" class="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold text-xs transition shadow-md print:hidden">
                        <span class="material-icons text-sm">print</span> Imprimir Tarjetas de Mesas
                    </button>
                </div>

                <!-- Configuración del Generador -->
                <div class="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-200/60 print:hidden">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div class="space-y-2">
                            <label class="block text-xs font-bold text-slate-600">Enlace Base del Servidor (Auto-detectado)</label>
                            <input type="text" id="qr-base-url" placeholder="http://192.168.1.10:8000" class="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600/20" oninput="generateQRCards()">
                            <p class="text-[10px] text-slate-400">Este es el enlace base. Asegúrate de que use la IP de tu red local.</p>
                        </div>
                        <div class="space-y-2">
                            <label class="block text-xs font-bold text-slate-600">Número Inicial de Mesa</label>
                            <input type="number" id="qr-start-table" value="1" min="1" class="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600/20" oninput="generateQRCards()">
                        </div>
                        <div class="space-y-2">
                            <label class="block text-xs font-bold text-slate-600">Número Final de Mesa</label>
                            <input type="number" id="qr-end-table" value="10" min="1" class="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600/20" oninput="generateQRCards()">
                        </div>
                    </div>
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-200/60">
                        <label class="flex items-center gap-2.5 text-xs font-bold text-slate-700 cursor-pointer select-none">
                            <input type="checkbox" id="qr-include-kitchen" checked class="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4" onchange="generateQRCards()">
                            <span>Generar también Tarjeta Especial para Pantalla de Cocina (/kitchen)</span>
                        </label>
                        <div class="flex items-center gap-1.5 text-xs text-purple-700 font-medium">
                            <span class="material-icons text-sm animate-bounce">info</span>
                            <span>💡 Tip: En el diálogo de impresión, selecciona <strong>"Guardar como PDF"</strong> para exportar.</span>
                        </div>
                    </div>
                </div>

                <!-- Contenedor de Tarjetas Generadas -->
                <div class="mt-8">
                    <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 print:hidden">Vista Previa de Tarjetas Impresas</h3>
                    
                    <div id="qr-cards-container" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        <!-- Tarjetas generadas dinámicamente -->
                    </div>
                </div>
            </div>
        </div>

        <!-- Vista de Validación de Pago Móvil en Caja -->
        <div id="view-pagos" class="space-y-6 hidden">
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div class="flex flex-wrap justify-between items-center gap-4 mb-6">
                    <div>
                        <h2 class="text-base font-bold flex items-center gap-2">
                            <span class="material-icons text-purple-600">verified_user</span> Validación de Pago Móvil y Transferencias
                        </h2>
                        <p class="text-xs text-slate-500 mt-0.5">Revisa las referencias enviadas por los clientes y aprueba o rechaza el cobro en tiempo real.</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="renderPaymentReferences()" class="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1 transition">
                            <span class="material-icons text-sm">refresh</span> Actualizar
                        </button>
                    </div>
                </div>

                <!-- Tabla de Referencias -->
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="border-b border-slate-200 text-[11px] font-black text-slate-400 uppercase tracking-wider bg-slate-50">
                                <th class="p-3">Pedido</th>
                                <th class="p-3">Mesa / Cliente</th>
                                <th class="p-3">Monto Bs / $</th>
                                <th class="p-3">Referencia</th>
                                <th class="p-3">Banco / Teléfono Origen</th>
                                <th class="p-3">Estado</th>
                                <th class="p-3 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody id="payment-refs-table" class="divide-y divide-slate-100 text-xs">
                            <!-- Filas dinámicas -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Vista de Configuración del Negocio y Personalización de Tickets -->
        <div id="view-config" class="space-y-6 hidden">
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                <!-- Columna Izquierda: Formulario de Configuración (7 cols) -->
                <div class="lg:col-span-7 space-y-6">
                    
                    <!-- Tarjeta 1: Identidad de Marca -->
                    <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                        <div class="flex items-center gap-3 border-b border-slate-100 pb-3">
                            <div class="p-2.5 bg-purple-100 text-purple-700 rounded-xl">
                                <span class="material-icons">storefront</span>
                            </div>
                            <div>
                                <h3 class="text-base font-bold text-slate-900">Identidad de tu Negocio</h3>
                                <p class="text-xs text-slate-500">Aparecerá en el menú digital de los clientes y en los tickets de pago.</p>
                            </div>
                        </div>

                        <div class="space-y-3">
                            <div>
                                <label class="block text-xs font-bold text-slate-700 mb-1">Nombre del Restaurante / Negocio</label>
                                <input type="text" id="cfg-restaurant-name" value="{restaurant_name}" oninput="updateLiveTicketPreview()" placeholder="Ej. GastroLocal Criollo" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600/30">
                            </div>

                            <div>
                                <label class="block text-xs font-bold text-slate-700 mb-1">Eslogan o Subtítulo</label>
                                <input type="text" id="cfg-restaurant-slogan" value="{restaurant_slogan}" oninput="updateLiveTicketPreview()" placeholder="Ej. Sabor Tradicional & Calidad" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600/30">
                            </div>

                            <div>
                                <label class="block text-xs font-bold text-slate-700 mb-1">Logotipo del Negocio (Imagen / URL / Base64)</label>
                                <div class="flex gap-2">
                                    <input type="text" id="cfg-restaurant-logo" value="{restaurant_logo}" oninput="updateLiveTicketPreview()" placeholder="Pega URL de imagen o sube un archivo..." class="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600/30">
                                    <label class="cursor-pointer bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1 transition">
                                        <span class="material-icons text-sm">upload_file</span> Subir
                                        <input type="file" id="cfg-logo-file" accept="image/*" class="hidden" onchange="handleLogoUpload(this)">
                                    </label>
                                </div>
                            </div>

                            <!-- Vista Previa Mini Logo -->
                            <div class="flex items-center gap-3 pt-1">
                                <div class="w-16 h-16 rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden p-1 shadow-inner shrink-0">
                                    <img id="cfg-logo-preview" src="{restaurant_logo}" alt="Logo Preview" class="w-full h-full object-contain {'hidden' if not restaurant_logo else ''}">
                                    <span id="cfg-logo-placeholder" class="material-icons text-2xl text-slate-300 {'hidden' if restaurant_logo else ''}">image</span>
                                </div>
                                <div class="text-[11px] text-slate-500">
                                    El logo se posicionará automáticamente en el encabezado superior de los Tickets PDF y en la barra de clientes.
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Tarjeta 2: Datos Fiscales y Contacto para Tickets -->
                    <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                        <div class="flex items-center gap-3 border-b border-slate-100 pb-3">
                            <div class="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
                                <span class="material-icons">receipt</span>
                            </div>
                            <div>
                                <h3 class="text-base font-bold text-slate-900">Datos Fiscales y Contacto en Tickets</h3>
                                <p class="text-xs text-slate-500">Información comercial que se imprimirá en cada comprobante / factura.</p>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label class="block text-xs font-bold text-slate-700 mb-1">RIF / Identificación Fiscal</label>
                                <input type="text" id="cfg-restaurant-rif" value="{restaurant_rif}" oninput="updateLiveTicketPreview()" placeholder="Ej. J-50123456-7" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600/30">
                            </div>

                            <div>
                                <label class="block text-xs font-bold text-slate-700 mb-1">Teléfono / WhatsApp de Atención</label>
                                <input type="text" id="cfg-restaurant-phone" value="{restaurant_phone}" oninput="updateLiveTicketPreview()" placeholder="Ej. +58 412-1234567" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600/30">
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">Dirección Comercial / Local</label>
                            <input type="text" id="cfg-restaurant-address" value="{restaurant_address}" oninput="updateLiveTicketPreview()" placeholder="Ej. Av. Principal, C.C. Gourmet Plaza, Local 04" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600/30">
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">Redes Sociales / Instagram</label>
                            <input type="text" id="cfg-restaurant-instagram" value="{restaurant_instagram}" oninput="updateLiveTicketPreview()" placeholder="Ej. @gastrolocal_criollo" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600/30">
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">Mensaje de Agradecimiento / Pie de Ticket</label>
                            <textarea id="cfg-ticket-footer" oninput="updateLiveTicketPreview()" rows="3" placeholder="Mensaje al final del ticket..." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600/30">{ticket_footer}</textarea>
                            <p class="text-[10px] text-slate-400 mt-0.5">Puedes incluir agradecimiento, clave del Wi-Fi, promociones u horarios.</p>
                        </div>
                    </div>

                    <!-- Tarjeta 3: Datos para Pago Móvil -->
                    <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                        <div class="flex items-center gap-3 border-b border-slate-100 pb-3">
                            <div class="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                                <span class="material-icons">account_balance_wallet</span>
                            </div>
                            <div>
                                <h3 class="text-base font-bold text-slate-900">Datos Receptor de Pago Móvil</h3>
                                <p class="text-xs text-slate-500">Datos bancarios donde tus clientes transferirán en Bs.</p>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label class="block text-xs font-bold text-slate-700 mb-1">Banco Receptor</label>
                                <input type="text" id="cfg-pm-bank" value="{pm_bank}" placeholder="Ej. Banesco (0134)" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/30">
                            </div>

                            <div>
                                <label class="block text-xs font-bold text-slate-700 mb-1">Teléfono Afiliado</label>
                                <input type="text" id="cfg-pm-phone" value="{pm_phone}" placeholder="Ej. 0414-1234567" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/30">
                            </div>

                            <div>
                                <label class="block text-xs font-bold text-slate-700 mb-1">Cédula de Identidad o RIF</label>
                                <input type="text" id="cfg-pm-id" value="{pm_id}" placeholder="Ej. J-12345678-0" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/30">
                            </div>

                            <div>
                                <label class="block text-xs font-bold text-slate-700 mb-1">Nombre del Titular</label>
                                <input type="text" id="cfg-pm-name" value="{pm_name}" placeholder="Ej. Inversiones Gastro C.A." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/30">
                            </div>
                        </div>
                    </div>

                    <!-- Botón Guardar Cambios -->
                    <div class="flex justify-end pt-2">
                        <button onclick="saveBusinessConfig()" class="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-sm px-8 py-3.5 rounded-2xl shadow-xl transition flex items-center justify-center gap-2 active:scale-95">
                            <span class="material-icons">save</span> Guardar Configuración y Tickets
                        </button>
                    </div>
                </div>

                <!-- Columna Derecha: Simulador Interactivo de Ticket Térmico en Tiempo Real (5 cols) -->
                <div class="lg:col-span-5 space-y-4">
                    <div class="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between shadow-md">
                        <div class="flex items-center gap-2">
                            <span class="material-icons text-purple-400">preview</span>
                            <span class="text-xs font-black uppercase tracking-wider">Vista Previa de Ticket</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <button onclick="downloadLivePreviewPDF()" class="bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-black px-3 py-1.5 rounded-xl transition flex items-center gap-1 active:scale-95 shadow-sm">
                                <span class="material-icons text-xs">picture_as_pdf</span> PDF Muestra
                            </button>
                            <button onclick="printLivePreviewTicket()" class="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold px-2.5 py-1.5 rounded-xl transition flex items-center gap-1 active:scale-95 border border-slate-700">
                                <span class="material-icons text-xs">print</span> Imprimir
                            </button>
                        </div>
                    </div>

                    <!-- Ticket Impreso Simulado -->
                    <div class="flex justify-center">
                        <div id="live-ticket-preview-container" class="w-full max-w-[360px] bg-white rounded-3xl shadow-2xl p-6 border border-slate-200 text-slate-900 font-sans space-y-3 relative transition-all">
                            
                            <!-- Header de Negocio -->
                            <div class="text-center space-y-1">
                                <div id="sim-logo-wrapper" class="{'hidden' if not restaurant_logo else ''} mb-2 flex justify-center">
                                    <img id="sim-logo" src="{restaurant_logo}" alt="Logo" class="max-h-12 max-w-[140px] object-contain rounded-md">
                                </div>
                                <h4 id="sim-name" class="text-lg font-black uppercase tracking-tight text-slate-950 leading-tight">
                                    {restaurant_name}
                                </h4>
                                <p id="sim-slogan" class="text-[11px] font-semibold text-slate-600 italic">
                                    {restaurant_slogan}
                                </p>
                                
                                <div class="text-[10px] text-slate-600 space-y-0.5 pt-1 border-t border-dashed border-slate-200 mt-1">
                                    <div>RIF: <span id="sim-rif" class="font-mono font-bold">{restaurant_rif}</span></div>
                                    <div id="sim-address" class="leading-tight">{restaurant_address}</div>
                                    <div>Tel: <span id="sim-phone">{restaurant_phone}</span> &bull; <span id="sim-instagram">{restaurant_instagram}</span></div>
                                </div>
                            </div>

                            <!-- Línea de corte -->
                            <div class="border-t-2 border-dashed border-slate-800 my-1"></div>

                            <!-- Meta de orden -->
                            <div class="space-y-0.5 text-[11px]">
                                <div class="flex justify-between items-center">
                                    <span class="font-bold text-slate-500 uppercase text-[9px]">COMPROBANTE DE PAGO</span>
                                    <span class="font-mono font-black text-slate-900">TICKET #00042</span>
                                </div>
                                <div class="flex justify-between text-slate-700">
                                    <span>Fecha:</span>
                                    <span class="font-mono" id="sim-date">Hoy, 02:45 PM</span>
                                </div>
                                <div class="flex justify-between text-slate-700">
                                    <span>Ubicación:</span>
                                    <span class="font-bold text-purple-900">Mesa 3 (🍽️ Servicio en Mesa)</span>
                                </div>
                                <div class="flex justify-between items-center pt-1">
                                    <span class="text-slate-600 font-bold">Estado:</span>
                                    <span class="px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-full font-black text-[9px] uppercase">✓ PAGADO</span>
                                </div>
                            </div>

                            <!-- Tabla Items de Muestra -->
                            <div class="border-t border-dashed border-slate-300 pt-1.5">
                                <table class="w-full text-left text-[11px]">
                                    <thead>
                                        <tr class="border-b-2 border-slate-800 font-black text-[10px] uppercase">
                                            <th class="pb-1 pr-1">Cant</th>
                                            <th class="pb-1 pr-1">Descripción</th>
                                            <th class="pb-1 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-dashed divide-slate-200">
                                        <tr>
                                            <td class="py-1.5 pr-1 font-mono font-bold">2x</td>
                                            <td class="py-1.5 pr-1">
                                                <div class="font-bold text-slate-900 leading-tight">Pabellón Criollo Especial</div>
                                                <div class="text-[9px] text-slate-500 font-mono">$8.50 c/u</div>
                                            </td>
                                            <td class="py-1.5 text-right font-mono font-bold whitespace-nowrap">
                                                <div>$17.00</div>
                                                <div class="text-[9px] text-purple-700">{(17.0 * exchange_rate):.2f} Bs</div>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td class="py-1.5 pr-1 font-mono font-bold">2x</td>
                                            <td class="py-1.5 pr-1">
                                                <div class="font-bold text-slate-900 leading-tight">Papelón con Limón 500ml</div>
                                                <div class="text-[9px] text-slate-500 font-mono">$2.00 c/u</div>
                                            </td>
                                            <td class="py-1.5 text-right font-mono font-bold whitespace-nowrap">
                                                <div>$4.00</div>
                                                <div class="text-[9px] text-purple-700">{(4.0 * exchange_rate):.2f} Bs</div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <!-- Totales -->
                            <div class="space-y-1 pt-1.5 border-t-2 border-slate-800 font-mono text-[11px]">
                                <div class="flex justify-between text-slate-700">
                                    <span>SUBTOTAL USD:</span>
                                    <span class="font-bold">$21.00</span>
                                </div>
                                <div class="flex justify-between text-slate-500 text-[10px]">
                                    <span>Tasa Oficial BCV:</span>
                                    <span class="font-bold">{exchange_rate:.2f} Bs/$</span>
                                </div>
                                <div class="flex justify-between text-purple-900 font-bold">
                                    <span>SUBTOTAL EN BS:</span>
                                    <span>{(21.0 * exchange_rate):.2f} Bs</span>
                                </div>
                                
                                <div class="p-2.5 bg-slate-950 text-white rounded-xl mt-1 space-y-0.5">
                                    <div class="flex justify-between items-center">
                                        <span class="text-[10px] font-bold text-slate-300">TOTAL PAGADO:</span>
                                        <span class="text-base font-black text-emerald-400">$21.00 USD</span>
                                    </div>
                                    <div class="flex justify-between items-center border-t border-slate-800 pt-0.5">
                                        <span class="text-[9px] font-bold text-slate-400">EN BOLÍVARES:</span>
                                        <span class="text-xs font-black text-purple-300">{(21.0 * exchange_rate):.2f} Bs</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Forma de Pago -->
                            <div class="pt-1.5 border-t border-dashed border-slate-300 text-[11px]">
                                <div class="flex justify-between items-center">
                                    <span class="text-slate-600 font-bold">Forma de Pago:</span>
                                    <span class="font-black text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">Pago Móvil</span>
                                </div>
                                <div class="mt-1 p-1.5 bg-purple-50 rounded-lg text-[9px] font-mono text-purple-950">
                                    <div>Banco: Banesco &bull; Ref: #984124</div>
                                </div>
                            </div>

                            <!-- QR Code Muestra -->
                            <div class="pt-2 border-t border-dashed border-slate-300 text-center space-y-1">
                                <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&margin=2&data=GastroLocalTicketSample" alt="QR" class="w-16 h-16 mx-auto border border-slate-900 rounded-lg p-0.5 bg-white">
                                <p class="text-[9px] text-slate-500 font-mono">Consulte este ticket escaneando el código QR</p>
                            </div>

                            <!-- Footer -->
                            <div class="pt-1.5 border-t-2 border-dashed border-slate-800 text-center">
                                <p id="sim-footer" class="text-[10px] font-bold text-slate-900 italic leading-snug">
                                    {ticket_footer.replace(chr(10), '<br>')}
                                </p>
                                <p class="text-[8px] text-slate-400 font-mono mt-1">
                                    Comprobante Digital emitido por GastroLocal POS
                                </p>
                            </div>

                        </div>
                    </div>
                </div>

            </div>
        </div>
    </main>

    <!-- Modal de Cobranza Multidivisa y Mixta -->
    <div id="payment-modal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center hidden p-2">
        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-4 border border-slate-200 flex flex-col my-auto">
            <div class="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                <div>
                    <h3 class="text-base font-black text-slate-900 flex items-center gap-1.5">
                        <span class="material-icons text-purple-600 text-lg">point_of_sale</span> Cobrar Pedido <span id="payment-order-id">#0</span>
                    </h3>
                    <p class="text-[11px] text-slate-500">Ubicación: <span id="payment-order-location" class="font-bold text-slate-700">Mesa 0</span></p>
                </div>
                <button onclick="closePaymentModal()" class="text-slate-400 hover:text-slate-600 transition">
                    <span class="material-icons text-xl">close</span>
                </button>
            </div>

            <!-- Resumen de cuenta -->
            <div class="bg-purple-50 border border-purple-100 rounded-2xl p-2.5 mb-2 grid grid-cols-2 gap-2 text-center">
                <div>
                    <span class="text-[10px] text-slate-500 font-extrabold block">TOTAL A COBRAR ($)</span>
                    <span id="pay-total-usd" class="text-xl font-black text-purple-700">$0.00</span>
                </div>
                <div>
                    <span class="text-[10px] text-slate-500 font-extrabold block">TOTAL EN BS</span>
                    <span id="pay-total-bs" class="text-xl font-black text-purple-700">0.00 Bs</span>
                </div>
            </div>

            <!-- Botones de Cobro Rápido 1-Clic -->
            <div class="mb-2.5 p-2 bg-slate-50 border border-slate-200 rounded-2xl">
                <span class="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1 text-center">⚡ Rápido (Llenado Automático 1-Clic):</span>
                <div class="grid grid-cols-3 gap-1.5">
                    <button type="button" onclick="quickFillPayment('CASH_USD')" class="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold py-1.5 px-1 rounded-xl transition flex items-center justify-center gap-1 active:scale-95 shadow-sm">
                        <span class="material-icons text-xs">attach_money</span> Efectivo $
                    </button>
                    <button type="button" onclick="quickFillPayment('PAGOMOVIL')" class="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-extrabold py-1.5 px-1 rounded-xl transition flex items-center justify-center gap-1 active:scale-95 shadow-sm">
                        <span class="material-icons text-xs">smartphone</span> Pago Móvil
                    </button>
                    <button type="button" onclick="quickFillPayment('PUNTO')" class="bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-extrabold py-1.5 px-1 rounded-xl transition flex items-center justify-center gap-1 active:scale-95 shadow-sm">
                        <span class="material-icons text-xs">credit_card</span> Punto
                    </button>
                </div>
            </div>

            <!-- Entradas de Métodos de Pago en Grid ultra-compacto -->
            <div class="space-y-2 mb-2">
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="block text-[10px] font-extrabold text-purple-700 mb-0.5">Efectivo $</label>
                        <div class="relative">
                            <span class="absolute left-2.5 top-1.5 text-xs text-slate-400 font-bold">$</span>
                            <input type="number" id="pay-cash-usd" oninput="calculatePayment()" step="0.01" min="0" placeholder="0.00" class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-6 pr-2 py-1 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-600/20">
                        </div>
                    </div>
                    <div>
                        <label class="block text-[10px] font-extrabold text-purple-700 mb-0.5">Zelle $</label>
                        <div class="relative">
                            <span class="absolute left-2.5 top-1.5 text-xs text-slate-400 font-bold">$</span>
                            <input type="number" id="pay-zelle-usd" oninput="calculatePayment()" step="0.01" min="0" placeholder="0.00" class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-6 pr-2 py-1 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-600/20">
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-3 gap-2">
                    <div>
                        <div class="flex items-center justify-between">
                            <label class="block text-[10px] font-extrabold text-purple-700 mb-0.5">Pago Móvil</label>
                            <span id="pay-pagomovil-usd" class="text-[8px] font-bold text-slate-400">$0</span>
                        </div>
                        <div class="relative">
                            <span class="absolute left-2 top-1.5 text-[10px] text-slate-400 font-bold">Bs</span>
                            <input type="number" id="pay-pagomovil-bs" oninput="calculatePayment()" step="0.01" min="0" placeholder="0.00" class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-6 pr-1 py-1 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-600/20">
                        </div>
                    </div>
                    <div>
                        <div class="flex items-center justify-between">
                            <label class="block text-[10px] font-extrabold text-purple-700 mb-0.5">Punto</label>
                            <span id="pay-punto-usd" class="text-[8px] font-bold text-slate-400">$0</span>
                        </div>
                        <div class="relative">
                            <span class="absolute left-2 top-1.5 text-[10px] text-slate-400 font-bold">Bs</span>
                            <input type="number" id="pay-punto-bs" oninput="calculatePayment()" step="0.01" min="0" placeholder="0.00" class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-6 pr-1 py-1 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-600/20">
                        </div>
                    </div>
                    <div>
                        <div class="flex items-center justify-between">
                            <label class="block text-[10px] font-extrabold text-purple-700 mb-0.5">Efectivo Bs</label>
                            <span id="pay-cashbs-usd" class="text-[8px] font-bold text-slate-400">$0</span>
                        </div>
                        <div class="relative">
                            <span class="absolute left-2 top-1.5 text-[10px] text-slate-400 font-bold">Bs</span>
                            <input type="number" id="pay-cash-bs" oninput="calculatePayment()" step="0.01" min="0" placeholder="0.00" class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-6 pr-1 py-1 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-600/20">
                        </div>
                    </div>
                </div>
            </div>

            <!-- Indicadores de Saldo en vivo -->
            <div class="border-t border-slate-100 pt-2 space-y-1.5">
                <div class="flex justify-between text-[11px] font-bold text-slate-600">
                    <span>Monto ingresado:</span>
                    <span id="pay-entered-summary">$0.00 / 0.00 Bs</span>
                </div>
                <div id="pay-status-row" class="flex justify-between items-center text-xs font-black text-rose-500 bg-rose-50 border border-rose-100 p-2 rounded-xl">
                    <span id="pay-status-label">Pendiente:</span>
                    <span id="pay-status-val">$0.00 / 0.00 Bs</span>
                </div>
            </div>

            <!-- Botón de confirmar -->
            <div class="grid grid-cols-2 gap-2 pt-2.5">
                <button type="button" onclick="closePaymentModal()" class="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold transition">
                    Cancelar
                </button>
                <button id="btn-confirm-payment" disabled onclick="confirmPaymentSubmit()" class="bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-extrabold transition shadow-md flex items-center justify-center gap-1">
                    <span class="material-icons text-sm">payment</span> Confirmar Pago
                </button>
            </div>
        </div>
    </div>

    <!-- Modal de Cierre de Caja & Balance de Turno (Reporte Z) -->
    <div id="cash-register-modal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center hidden">
        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-6 border border-slate-200 m-4 flex flex-col max-h-[90vh]">
            <div class="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <div>
                    <h3 class="text-xl font-black text-slate-900 flex items-center gap-2">
                        <span class="material-icons text-emerald-600">point_of_sale</span> Cierre de Caja & Balance de Turno (Reporte Z)
                    </h3>
                    <p class="text-xs text-slate-500 mt-0.5" id="z-report-date">Fecha: --</p>
                </div>
                <button onclick="closeCashRegisterModal()" class="text-slate-400 hover:text-slate-600 transition">
                    <span class="material-icons">close</span>
                </button>
            </div>

            <div id="z-report-content" class="flex-1 overflow-y-auto space-y-6 pr-1">
                <!-- Carga Dinámica -->
            </div>

            <div class="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 mt-4">
                <button onclick="printZReport()" class="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-5 py-3 rounded-2xl flex items-center gap-2 transition active:scale-95">
                    <span class="material-icons text-sm">print</span> Imprimir Reporte
                </button>
                <button onclick="confirmCloseCashRegister()" class="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-6 py-3 rounded-2xl shadow-lg transition flex items-center gap-2 active:scale-95">
                    <span class="material-icons text-sm">lock</span> Guardar Cierre de Caja
                </button>
            </div>
        </div>
    </div>

    <!-- Modal de Ticket Brutal / Comprobante de Pago Digital y PDF -->
    <div id="ticket-modal" class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center hidden p-3 overflow-y-auto">
        <div class="bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg p-5 border border-slate-800 text-white my-auto max-h-[92vh] flex flex-col">
            
            <!-- Barra Superior del Modal -->
            <div class="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 shrink-0">
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-400">
                        <span class="material-icons text-base">receipt_long</span>
                    </div>
                    <div>
                        <h3 class="text-sm font-black text-white" id="ticket-modal-title">Ticket de Pago</h3>
                        <p class="text-[10px] text-slate-400">Comprobante y Factura Digital</p>
                    </div>
                </div>
                <div class="flex items-center gap-1.5">
                    <button onclick="openTicketInNewTab()" class="p-1.5 hover:bg-white/10 rounded-xl transition text-slate-300 hover:text-white" title="Abrir en pestaña completa">
                        <span class="material-icons text-base">open_in_new</span>
                    </button>
                    <button onclick="closeTicketModal()" class="p-1.5 hover:bg-white/10 rounded-xl transition text-slate-400 hover:text-white">
                        <span class="material-icons text-base">close</span>
                    </button>
                </div>
            </div>

            <!-- Botones de Acción Rápida -->
            <div class="grid grid-cols-3 gap-2 pb-3 mb-3 border-b border-slate-800 shrink-0">
                <button onclick="downloadAdminTicketPDF()" class="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs py-2 px-2.5 rounded-xl shadow-md flex items-center justify-center gap-1 transition active:scale-95">
                    <span class="material-icons text-xs">picture_as_pdf</span> Descargar PDF
                </button>
                <button onclick="printAdminTicket()" class="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-2 px-2.5 rounded-xl border border-slate-700 flex items-center justify-center gap-1 transition active:scale-95">
                    <span class="material-icons text-xs">print</span> Imprimir
                </button>
                <button onclick="shareAdminTicketWhatsApp()" class="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-2 px-2.5 rounded-xl shadow-md flex items-center justify-center gap-1 transition active:scale-95">
                    <span class="material-icons text-xs">share</span> WhatsApp
                </button>
            </div>

            <!-- Contenedor del Ticket Imprimible (Scrollable) -->
            <div class="flex-1 overflow-y-auto flex justify-center p-1 scrollbar-none">
                <div id="admin-ticket-content-wrapper" class="w-full max-w-[380px] bg-white rounded-2xl p-6 text-slate-900 shadow-xl space-y-3 font-sans">
                    <!-- Contenido renderizado dinámicamente -->
                </div>
            </div>

            <!-- Pie de Modal -->
            <div class="pt-3 border-t border-slate-800 mt-2 flex justify-end shrink-0">
                <button onclick="closeTicketModal()" class="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold px-4 py-2 rounded-xl transition">
                    Cerrar
                </button>
            </div>

        </div>
    </div>
    <div id="product-modal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center hidden">
        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 border border-slate-200 m-4">
            <div class="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <h3 id="modal-title" class="text-base font-bold text-slate-900">Agregar Producto</h3>
                <button onclick="closeProductModal()" class="text-slate-400 hover:text-slate-600 transition">
                    <span class="material-icons">close</span>
                </button>
            </div>
            
            <form id="product-form" onsubmit="saveProduct(event)" class="space-y-4">
                <input type="hidden" id="form-product-id">
                
                <div>
                    <label class="block text-xs font-bold text-slate-500 mb-1">Nombre del Producto</label>
                    <input type="text" id="form-product-name" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600">
                </div>
                
                <div>
                    <label class="block text-xs font-bold text-slate-500 mb-1">Descripción</label>
                    <textarea id="form-product-desc" rows="3" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600" placeholder="Ingredientes, acompañantes..."></textarea>
                </div>
                
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-slate-500 mb-1">Precio (USD)</label>
                        <input type="number" id="form-product-price" step="0.01" required min="0" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-500 mb-1">Stock Inicial</label>
                        <input type="number" id="form-product-stock" required min="0" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600">
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-slate-500 mb-1">Categoría</label>
                        <select id="form-product-category" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600">
                            <!-- Categorías dinámicas -->
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-500 mb-1">Ilustración</label>
                        <select id="form-product-image" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600">
                            <option value="plato">Plato General</option>
                            <option value="pabellon">Pabellón Criollo</option>
                            <option value="asado">Asado Negro</option>
                            <option value="arepa">Arepa</option>
                            <option value="tequenos">Tequeños</option>
                            <option value="empanadas">Empanadas</option>
                            <option value="chicha">Chicha</option>
                            <option value="papelon">Papelón</option>
                            <option value="quesillo">Quesillo</option>
                            <option value="tresleches">Tres Leches</option>
                            <option value="burger">Hamburguesa</option>
                            <option value="pizza">Pizza</option>
                            <option value="cafe">Café</option>
                            <option value="bebida">Bebida Refrescante</option>
                        </select>
                    </div>
                </div>
                
                                <!-- Sección de Modificadores y Extras del Producto -->
                <div class="bg-purple-50/50 border border-purple-100 rounded-2xl p-3.5 space-y-2.5">
                    <div class="flex items-center justify-between">
                        <div>
                            <label class="block text-xs font-black text-purple-950">🧀 Opciones y Modificadores (Extras / Términos)</label>
                            <p class="text-[10px] text-purple-700">Agrega toppings o variantes con precio adicional (ej: Queso Extra +$1.00, Sin Cebolla $0.00)</p>
                        </div>
                        <button type="button" onclick="addFormModifierRow()" class="bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] px-2.5 py-1 rounded-xl transition flex items-center gap-1 active:scale-95 shadow-sm">
                            <span class="material-icons text-xs">add</span> Agregar
                        </button>
                    </div>
                    <div id="form-modifiers-container" class="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        <!-- Filas de modificadores dinámicas -->
                    </div>
                </div>
                <div class="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
                    <div class="flex items-center justify-between">
                        <label class="block text-xs font-bold text-slate-500">📸 Opcional: Subir Foto Real</label>
                        <button type="button" onclick="clearCustomImage()" id="btn-clear-image" class="text-xs text-rose-500 font-bold hover:underline hidden">Quitar Foto</button>
                    </div>
                    <div class="flex items-center gap-3">
                        <div id="custom-image-preview" class="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 font-bold shrink-0 overflow-hidden">
                            <span class="material-icons text-xl" id="preview-icon">image</span>
                            <img id="preview-img" class="w-full h-full object-cover hidden">
                        </div>
                        <div class="flex-1">
                            <input type="file" id="form-image-file" accept="image/*" onchange="handleImageUpload(event)" class="hidden">
                            <button type="button" onclick="document.getElementById('form-image-file').click()" class="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5">
                                <span class="material-icons text-sm">photo_camera</span> Seleccionar Foto
                            </button>
                            <p class="text-[9px] text-slate-400 mt-1">¡Cualquier tamaño! Se optimiza automáticamente.</p>
                        </div>
                    </div>
                </div>
                
                <div class="flex gap-3 pt-2">
                    <button type="button" onclick="closeProductModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-bold transition">
                        Cancelar
                    </button>
                    <button type="submit" class="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-xl text-sm font-bold transition">
                        Guardar
                    </button>
                </div>
            </form>
        </div>
    </div>
    </div>

    <!-- Modal de Categoría (Agregar/Editar) -->
    <div id="category-modal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center hidden">
        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 border border-slate-200 m-4">
            <div class="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <h3 id="category-modal-title" class="text-base font-bold text-slate-900">Agregar Categoría</h3>
                <button onclick="closeCategoryModal()" class="text-slate-400 hover:text-slate-600 transition">
                    <span class="material-icons">close</span>
                </button>
            </div>
            
            <form id="category-form" onsubmit="saveCategory(event)" class="space-y-4">
                <input type="hidden" id="form-category-id">
                
                <div>
                    <label class="block text-xs font-bold text-slate-500 mb-1">Nombre de la Categoría</label>
                    <input type="text" id="form-category-name" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600" placeholder="Ej. Hamburguesas, Pizzas...">
                </div>
                
                <div>
                    <label class="block text-xs font-bold text-slate-500 mb-1">Icono de Material Design</label>
                    <select id="form-category-icon" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600">
                        <option value="restaurant">Plato / Restaurante (restaurant)</option>
                        <option value="fastfood">Comida Rápida (fastfood)</option>
                        <option value="wine_bar">Bebidas / Bar (wine_bar)</option>
                        <option value="cake">Postres / Torta (cake)</option>
                        <option value="local_pizza">Pizza (local_pizza)</option>
                        <option value="lunch_dining">Hamburguesa (lunch_dining)</option>
                        <option value="local_cafe">Café / Desayuno (local_cafe)</option>
                        <option value="icecream">Helados (icecream)</option>
                        <option value="bakery_dining">Panadería (bakery_dining)</option>
                        <option value="soup_kitchen">Sopas / Bowls (soup_kitchen)</option>
                        <option value="emoji_food_beverage">Té / Infusiones (emoji_food_beverage)</option>
                        <option value="star">Estrella / Destacados (star)</option>
                    </select>
                </div>
                
                <div class="flex gap-3 pt-2">
                    <button type="button" onclick="closeCategoryModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-bold transition">
                        Cancelar
                    </button>
                    <button type="submit" class="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-xl text-sm font-bold transition">
                        Guardar
                    </button>
                </div>
            </form>
        </div>
    </div>
    </div>

    <!-- Admin Toast Container -->
    <div id="toast" class="hidden fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs font-bold px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-2 transition-all duration-300 z-[100] border border-slate-700">
        <span class="material-icons text-emerald-400 text-base" id="toast-icon">check_circle</span>
        <span id="toast-text">Notificación</span>
    </div>

    <script>
        function showToast(text, isError = false) {{
            const toast = document.getElementById('toast');
            const icon = document.getElementById('toast-icon');
            const textEl = document.getElementById('toast-text');
            if (!toast || !textEl) {{
                alert(text);
                return;
            }}
            toast.className = `fixed bottom-6 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-2 transition-all duration-300 z-[100] border ` + 
                (isError ? "bg-rose-900/90 border-rose-500 text-rose-100" : "bg-slate-900/90 border-slate-700 text-white");
            if (icon) {{
                icon.textContent = isError ? "error" : "check_circle";
                icon.className = isError ? "material-icons text-rose-400 text-base" : "material-icons text-emerald-400 text-base";
            }}
            textEl.textContent = text;
            toast.classList.remove('hidden');
            setTimeout(() => {{
                toast.classList.add('hidden');
            }}, 3000);
        }}

        const serverSessionToken = '{session_token}';

        // Interceptor de seguridad: Inyecta automáticamente el token de administración en todas las peticiones a /api/admin/
        const _nativeFetch = window.fetch;
        window.fetch = function(url, options) {{
            options = options || {{}};
            if (typeof url === 'string' && url.startsWith('/api/admin/')) {{
                options.headers = options.headers || {{}};
                const currentToken = sessionStorage.getItem('admin_verified') || serverSessionToken;
                if (currentToken) {{
                    if (options.headers instanceof Headers) {{
                        options.headers.set('X-Admin-Token', currentToken);
                    }} else {{
                        options.headers['X-Admin-Token'] = currentToken;
                    }}
                }}
            }}
            return _nativeFetch(url, options).then(response => {{
                if ((response.status === 401 || response.status === 403) && typeof url === 'string' && url.startsWith('/api/admin/')) {{
                    sessionStorage.removeItem('admin_verified');
                    const overlay = document.getElementById('pin-overlay');
                    if (overlay) overlay.classList.remove('hidden');
                    const content = document.getElementById('admin-main-content');
                    if (content) content.classList.add('hidden');
                }}
                return response;
            }});
        }};
        let orders = {orders_json};
        let products = {products_json};
        let categories = {categories_json};
        let tableStates = {table_states_json};
        let exchangeRate = {exchange_rate};
        let totalTablesConfig = {total_tables};
        let currentTab = 'pedidos';
        let orderFilter = 'PENDING';
        let tableFilter = 'ALL';
        let activePaymentOrderId = null;
        let knownPreparingOrderIds = new Set();

        function playKitchenAlert() {{
            try {{
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                
                // Sound 1
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
                gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.4);

                // Sound 2 (double beep effect)
                setTimeout(() => {{
                    try {{
                        const osc2 = audioCtx.createOscillator();
                        const gain2 = audioCtx.createGain();
                        osc2.type = 'sine';
                        osc2.frequency.setValueAtTime(1000, audioCtx.currentTime); // C6
                        gain2.gain.setValueAtTime(0.3, audioCtx.currentTime);
                        gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
                        osc2.connect(gain2);
                        gain2.connect(audioCtx.destination);
                        osc2.start();
                        osc2.stop(audioCtx.currentTime + 0.4);
                    }} catch (err) {{}}
                }}, 180);

                // Visual effect: flash body background
                const flash = document.createElement('div');
                flash.className = "fixed inset-0 bg-purple-600/20 backdrop-blur-sm z-[9999] pointer-events-none transition-all duration-300 animate-pulse";
                document.body.appendChild(flash);
                
                setTimeout(() => {{
                    flash.classList.add('opacity-0');
                    setTimeout(() => flash.remove(), 300);
                }}, 2000);

            }} catch (e) {{
                console.warn("Audio alert blocked or unsupported:", e);
            }}
        }}

        // --- SISTEMA DE PIN DE SEGURIDAD PARA ADMIN ---
        let currentPinInput = "";
        
        function updatePinDots() {{
            for (let i = 1; i <= 4; i++) {{
                const dot = document.getElementById(`dot-${{i}}`);
                if (dot) {{
                    if (currentPinInput.length >= i) {{
                        dot.className = "w-4.5 h-4.5 rounded-full bg-gradient-to-r from-purple-400 to-indigo-400 shadow-lg shadow-purple-500/50 scale-125 transition-all duration-150";
                    }} else {{
                        dot.className = "w-4.5 h-4.5 rounded-full border-2 border-white/20 bg-white/5 transition-all duration-150";
                    }}
                }}
            }}
            const directInput = document.getElementById('pin-direct-input');
            if (directInput && document.activeElement !== directInput && directInput.value !== currentPinInput) {{
                directInput.value = currentPinInput;
            }}
        }}
        
        function handleDirectPinInput(val) {{
            currentPinInput = (val || '').replace(/[^0-9]/g, '');
            const directInput = document.getElementById('pin-direct-input');
            if (directInput && directInput.value !== currentPinInput) {{
                directInput.value = currentPinInput;
            }}
            updatePinDots();
            const errMsg = document.getElementById('pin-error-msg');
            if (errMsg) errMsg.classList.add('hidden');
            if (currentPinInput.length >= 4) {{
                submitPin();
            }}
        }}
        
        function pressPin(num) {{
            if (currentPinInput.length < 8) {{
                currentPinInput += num;
                const directInput = document.getElementById('pin-direct-input');
                if (directInput) directInput.value = currentPinInput;
                updatePinDots();
                const errMsg = document.getElementById('pin-error-msg');
                if (errMsg) errMsg.classList.add('hidden');
                if (currentPinInput.length === 4) {{
                    setTimeout(submitPin, 150);
                }}
            }}
        }}
        
        function clearPin() {{
            currentPinInput = "";
            const directInput = document.getElementById('pin-direct-input');
            if (directInput) directInput.value = "";
            updatePinDots();
            const errMsg = document.getElementById('pin-error-msg');
            if (errMsg) errMsg.classList.add('hidden');
        }}
        
        function deleteLast() {{
            if (currentPinInput.length > 0) {{
                currentPinInput = currentPinInput.slice(0, -1);
                const directInput = document.getElementById('pin-direct-input');
                if (directInput) directInput.value = currentPinInput;
                updatePinDots();
            }}
        }}
        
        function submitPin() {{
            const directInput = document.getElementById('pin-direct-input');
            if (directInput && directInput.value) {{
                currentPinInput = directInput.value.replace(/[^0-9]/g, '');
            }}
            
            if (!currentPinInput) {{
                return;
            }}

            const errMsg = document.getElementById('pin-error-msg');
            if (errMsg) errMsg.classList.add('hidden');

            const btn = document.getElementById('btn-submit-pin');
            if (btn) {{
                btn.disabled = true;
                btn.innerHTML = `<span class="material-icons text-sm animate-spin">sync</span>`;
            }}

            fetch('/api/verify-pin', {{
                method: 'POST',
                headers: {{ 'Content-Type': 'application/json' }},
                body: JSON.stringify({{ pin: currentPinInput }})
            }})
            .then(res => res.json())
            .then(data => {{
                if (btn) {{
                    btn.disabled = false;
                    btn.innerHTML = `<span>ENTRAR</span><span class="material-icons text-sm">arrow_forward</span>`;
                }}
                if (data.status === 'success') {{
                    const tokenToStore = data.token || serverSessionToken;
                    try {{
                        sessionStorage.setItem('admin_verified', tokenToStore);
                    }} catch(e) {{}}
                    document.getElementById('pin-overlay').classList.add('hidden');
                    document.getElementById('admin-main-content').classList.remove('hidden');
                }} else {{
                    if (errMsg) {{
                        errMsg.textContent = "❌ PIN incorrecto. (PIN por defecto: 1234)";
                        errMsg.classList.remove('hidden');
                    }}
                    const overlay = document.getElementById('pin-overlay');
                    if (overlay) overlay.classList.add('animate-shake');
                    
                    for (let i = 1; i <= 4; i++) {{
                        const dot = document.getElementById(`dot-${{i}}`);
                        if (dot) {{
                            dot.classList.add('bg-rose-500', 'border-rose-500');
                        }}
                    }}
                    
                    setTimeout(() => {{
                        if (overlay) overlay.classList.remove('animate-shake');
                        for (let i = 1; i <= 4; i++) {{
                            const dot = document.getElementById(`dot-${{i}}`);
                            if (dot) {{
                                dot.classList.remove('bg-rose-500', 'border-rose-500');
                            }}
                        }}
                        currentPinInput = "";
                        if (directInput) directInput.value = "";
                        updatePinDots();
                    }}, 600);
                }}
            }})
            .catch(err => {{
                if (btn) {{
                    btn.disabled = false;
                    btn.innerHTML = `<span>ENTRAR</span><span class="material-icons text-sm">arrow_forward</span>`;
                }}
                console.error("Error al verificar PIN:", err);
                if (errMsg) {{
                    errMsg.textContent = "⚠️ Error de conexión con el servidor local";
                    errMsg.classList.remove('hidden');
                }}
            }});
        }}
        
        function lockAdmin() {{
            sessionStorage.removeItem('admin_verified');
            window.location.reload();
        }}
        
        function logoutWithBackup(btn) {{
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = `<span class="material-icons text-sm animate-spin">sync</span> <span class="hidden sm:inline">Respaldando...</span>`;
            
            fetch('/api/admin/run-backup', {{
                method: 'POST',
                headers: {{ 'Content-Type': 'application/json' }}
            }})
            .then(res => res.json())
            .then(data => {{
                if (data.status === 'success') {{
                    let msg = "💾 ¡COPIA DE SEGURIDAD REALIZADA EXITOSAMENTE!\\n\\n";
                    if (data.destinations && data.destinations.length > 0) {{
                        msg += "Se guardó la base de datos en las siguientes rutas:\\n";
                        data.destinations.forEach(dest => {{
                            msg += `• ${{dest}}\\n`;
                        }});
                    }} else {{
                        msg += "No se detectaron unidades. Por favor asegúrate de conectar el pendrive correctamente.\\n";
                    }}
                    msg += "\\nSe cerrará la sesión de administración.";
                    alert(msg);
                }} else {{
                    alert("⚠️ No se pudo realizar la copia de seguridad:\\n" + data.message + "\\n\\nSe cerrará la sesión de todos modos.");
                }}
                lockAdmin();
            }})
            .catch(err => {{
                console.error("Error al respaldar:", err);
                alert("Error de red o del servidor al realizar el respaldo.\\nLa sesión se cerrará.");
                lockAdmin();
            }});
        }}
        
        function updatePin() {{
            const newPin = document.getElementById('input-pin').value.trim();
            if (!newPin) {{
                alert("El PIN no puede estar vacío.");
                return;
            }}
            if (newPin.length < 4) {{
                alert("El PIN debe tener al menos 4 dígitos.");
                return;
            }}
            fetch('/api/admin/update-pin', {{
                method: 'POST',
                headers: {{ 'Content-Type': 'application/json' }},
                body: JSON.stringify({{ pin: newPin }})
            }})
            .then(res => {{
                if (res.ok) {{
                    alert("PIN de administrador actualizado correctamente.");
                }} else {{
                    alert("No se pudo actualizar el PIN.");
                }}
            }});
        }}

        // Escuchar teclado físico para ingresar PIN
        document.addEventListener('keydown', (e) => {{
            const overlay = document.getElementById('pin-overlay');
            if (overlay && !overlay.classList.contains('hidden')) {{
                if (e.target && (e.target.id === 'pin-direct-input' || e.target.tagName === 'INPUT')) {{
                    return;
                }}
                if (e.key >= '0' && e.key <= '9') {{
                    pressPin(e.key);
                }} else if (e.key === 'Backspace') {{
                    deleteLast();
                }} else if (e.key === 'Escape' || e.key === 'Delete') {{
                    clearPin();
                }}
            }}
        }});

        document.addEventListener('DOMContentLoaded', () => {{
            // Verificar si el administrador ya está autenticado en esta sesión con un token
            if (sessionStorage.getItem('admin_verified')) {{
                document.getElementById('pin-overlay').classList.add('hidden');
                document.getElementById('admin-main-content').classList.remove('hidden');
            }} else {{
                document.getElementById('pin-overlay').classList.remove('hidden');
                document.getElementById('admin-main-content').classList.add('hidden');
            }}

            renderOrders();
            renderTableStatus();
            renderPaymentReferences();
            renderProducts();
            renderCategories();
            updateCategoryDropdowns();
            
            // Inicializar base URL del generador de QR con el origen actual o IP local
            const detectedIp = "{server_ip}";
            const hostIp = (window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') ? window.location.hostname : detectedIp;
            const serverPort = window.location.port || "{PORT}";
            const qrInput = document.getElementById('qr-base-url');
            if (qrInput) {{
                qrInput.value = `http://${{hostIp}}:${{serverPort}}`;
            }}
            generateQRCards();

            // Polling: Buscar nuevos pedidos cada 3 segundos en segundo plano
            setInterval(fetchUpdates, 3000);
        }});

        // --- GESTIÓN DE CATEGORÍAS (AÑADIDO) ---
        function renderCategories() {{
            const listContainer = document.getElementById('admin-categories-list');
            if (!listContainer) return;
            
            if (categories.length === 0) {{
                listContainer.innerHTML = `
                    <div class="col-span-full text-center py-6 text-slate-400">
                        <span class="material-icons text-4xl block mb-2">category</span>
                        No hay categorías creadas.
                    </div>
                `;
                return;
            }}
            
            listContainer.innerHTML = categories.map(c => {{
                return `
                    <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 shadow-sm hover:shadow-md transition">
                        <div class="flex items-center gap-3 min-w-0">
                            <div class="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold shrink-0">
                                <span class="material-icons text-lg">${{c.iconName || 'restaurant'}}</span>
                            </div>
                            <div class="min-w-0">
                                <h4 class="font-bold text-sm text-slate-800 truncate">${{c.name}}</h4>
                                <p class="text-[10px] text-slate-400">ID: ${{c.id}}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-1 shrink-0">
                            <button onclick="openEditCategoryModal(${{c.id}})" class="text-slate-500 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-200 transition" title="Editar">
                                <span class="material-icons text-sm block">edit</span>
                            </button>
                            <button onclick="deleteCategory(${{c.id}})" class="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition" title="Eliminar">
                                <span class="material-icons text-sm block">delete</span>
                            </button>
                        </div>
                    </div>
                `;
            }}).join('');
        }}
        
        function updateCategoryDropdowns() {{
            const catSelect = document.getElementById('form-product-category');
            if (catSelect) {{
                const prevVal = catSelect.value;
                catSelect.innerHTML = categories.map(c => `<option value="${{c.id}}">${{c.name}}</option>`).join('');
                if (prevVal) catSelect.value = prevVal;
            }}
        }}
        
        function openAddCategoryModal() {{
            document.getElementById('category-modal-title').textContent = "Crear Categoría";
            document.getElementById('form-category-id').value = "";
            document.getElementById('form-category-name').value = "";
            document.getElementById('form-category-icon').value = "restaurant";
            document.getElementById('category-modal').classList.remove('hidden');
        }}
        
        function openEditCategoryModal(catId) {{
            const cat = categories.find(c => c.id === catId);
            if (!cat) return;
            
            document.getElementById('category-modal-title').textContent = "Editar Categoría";
            document.getElementById('form-category-id').value = cat.id;
            document.getElementById('form-category-name').value = cat.name;
            document.getElementById('form-category-icon').value = cat.iconName || "restaurant";
            document.getElementById('category-modal').classList.remove('hidden');
        }}
        
        function closeCategoryModal() {{
            document.getElementById('category-modal').classList.add('hidden');
        }}
        
        function saveCategory(e) {{
            e.preventDefault();
            const id = document.getElementById('form-category-id').value;
            const name = document.getElementById('form-category-name').value.trim();
            const iconName = document.getElementById('form-category-icon').value;
            
            if (!name) return;
            
            const url = id ? '/api/admin/edit-category' : '/api/admin/add-category';
            const payload = id ? {{ categoryId: parseInt(id), name, iconName }} : {{ name, iconName }};
            
            fetch(url, {{
                method: 'POST',
                headers: {{ 'Content-Type': 'application/json' }},
                body: JSON.stringify(payload)
            }})
            .then(res => res.json())
            .then(data => {{
                if (data.status === 'success') {{
                    closeCategoryModal();
                    fetchUpdates();
                }} else {{
                    alert("Error al guardar la categoría: " + (data.message || "error desconocido"));
                }}
            }})
            .catch(err => {{
                console.error("Error guardando categoría:", err);
                alert("Error de red.");
            }});
        }}
        
        function deleteCategory(catId) {{
            const cat = categories.find(c => c.id === catId);
            if (!cat) return;
            
            const productsInCat = products.filter(p => p.categoryId === catId);
            let msg = `¿Está seguro de que desea eliminar la categoría "${{cat.name}}"?`;
            if (productsInCat.length > 0) {{
                msg += `\\n\\n⚠️ ¡ATENCIÓN! Hay ${{productsInCat.length}} productos asociados a esta categoría. Al eliminarla, estos productos se reasignarán automáticamente a la primera categoría disponible.`;
            }}
            
            if (!confirm(msg)) return;
            
            fetch('/api/admin/delete-category', {{
                method: 'POST',
                headers: {{ 'Content-Type': 'application/json' }},
                body: JSON.stringify({{ categoryId: catId }})
            }})
            .then(res => res.json())
            .then(data => {{
                if (data.status === 'success') {{
                    fetchUpdates();
                }} else {{
                    alert("Error al eliminar la categoría: " + (data.message || "error desconocido"));
                }}
            }})
            .catch(err => {{
                console.error("Error al eliminar categoría:", err);
                alert("Error de red.");
            }});
        }}

        function switchTab(tabId) {{
            currentTab = tabId;
            const viewIds = ['view-pedidos', 'view-pagos', 'view-mesas', 'view-inventario', 'view-ventas', 'view-qr', 'view-config'];
            const tabBtnIds = ['tab-pedidos', 'tab-pagos', 'tab-mesas', 'tab-inventario', 'tab-reportes', 'tab-ventas', 'tab-qr', 'tab-config'];

            viewIds.forEach(id => {{
                const el = document.getElementById(id);
                if (el) el.classList.add('hidden');
            }});

            tabBtnIds.forEach(id => {{
                const btn = document.getElementById(id);
                if (btn) {{
                    btn.className = "flex-1 min-w-[130px] py-3 px-3 rounded-xl font-bold text-xs sm:text-sm text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-all relative";
                }}
            }});

            const targetView = document.getElementById(`view-${{tabId}}`);
            const targetTab = document.getElementById(`tab-${{tabId}}`);
            if (targetView) targetView.classList.remove('hidden');
            if (targetTab) {{
                targetTab.className = "flex-1 min-w-[130px] py-3 px-3 rounded-xl font-bold text-xs sm:text-sm text-purple-700 bg-purple-50 flex items-center justify-center gap-1.5 transition-all relative";
            }}

            if (tabId === 'pedidos') {{
                renderOrders();
            }} else if (tabId === 'pagos') {{
                renderPaymentReferences();
            }} else if (tabId === 'mesas') {{
                renderTableStatus();
            }} else if (tabId === 'inventario') {{
                renderProducts();
            }} else if (tabId === 'ventas') {{
                renderVentas();
            }} else if (tabId === 'qr') {{
                generateQRCards();
            }}
        }}

        function renderPaymentReferences() {{
            const tbody = document.getElementById('payment-refs-table');
            if (!tbody) return;
            tbody.innerHTML = "";

            const pmOrders = orders.filter(o => {{
                const pm = String(o.paymentMethod || "").toLowerCase();
                return (
                    (pm.includes("pago") || pm.includes("movil") || o.paymentReference || o.paymentVerificationStatus === 'PENDING' || o.paymentVerificationStatus === 'VERIFIED' || o.paymentVerificationStatus === 'REJECTED') &&
                    o.status !== 'CANCELLED'
                );
            }});

            // Actualizar badge en la pestaña
            const pendingCount = orders.filter(o => o.paymentVerificationStatus === 'PENDING' && o.paymentStatus !== 'PAID' && o.status !== 'CANCELLED').length;
            const badge = document.getElementById('badge-pagos-pendientes');
            if (badge) {{
                badge.textContent = `${{pendingCount}}`;
                if (pendingCount > 0) {{
                    badge.classList.remove('hidden');
                }} else {{
                    badge.classList.add('hidden');
                }}
            }}

            if (pmOrders.length === 0) {{
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center py-10 text-slate-400">
                            <span class="material-icons text-4xl block mb-2 text-slate-300">receipt_long</span>
                            No hay reportes de Pago Móvil registrados todavía.
                        </td>
                    </tr>
                `;
                return;
            }}

            // Ordenar: PENDING primero, luego por id descendente
            pmOrders.sort((a, b) => {{
                if (a.paymentVerificationStatus === 'PENDING' && b.paymentVerificationStatus !== 'PENDING') return -1;
                if (a.paymentVerificationStatus !== 'PENDING' && b.paymentVerificationStatus === 'PENDING') return 1;
                return (b.id || 0) - (a.id || 0);
            }});

            pmOrders.forEach(o => {{
                const tr = document.createElement('tr');
                tr.className = o.paymentVerificationStatus === 'PENDING' ? "bg-amber-50/60 hover:bg-amber-50 transition border-b border-slate-100" : "hover:bg-slate-50 transition border-b border-slate-100";

                let statusBadge = "";
                if (o.paymentVerificationStatus === 'VERIFIED' || o.paymentStatus === 'PAID') {{
                    statusBadge = `<span class="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black px-2.5 py-1 rounded-full inline-flex items-center gap-1"><span class="material-icons text-xs">check_circle</span> APROBADO</span>`;
                }} else if (o.paymentVerificationStatus === 'REJECTED') {{
                    statusBadge = `<span class="bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-black px-2.5 py-1 rounded-full inline-flex items-center gap-1"><span class="material-icons text-xs">cancel</span> RECHAZADO</span>`;
                }} else if (o.paymentVerificationStatus === 'PENDING') {{
                    statusBadge = `<span class="bg-amber-200 text-amber-950 border border-amber-400 text-[10px] font-black px-2.5 py-1 rounded-full inline-flex items-center gap-1 animate-pulse"><span class="material-icons text-xs">hourglass_top</span> POR APROBAR</span>`;
                }} else {{
                    statusBadge = `<span class="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-black px-2.5 py-1 rounded-full">Sin referencia</span>`;
                }}

                const totalBs = (o.totalUsd * exchangeRate).toFixed(2);
                const refText = o.paymentReference 
                    ? `<span class="font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 text-xs">${{o.paymentReference}}</span>` 
                    : `<span class="text-slate-400 italic">Pendiente de envío</span>`;
                const bankInfo = (o.paymentOriginBank || o.paymentPhone) 
                    ? `<span class="font-bold text-slate-700">${{o.paymentOriginBank || '-'}}</span><br><span class="text-[10px] text-slate-500">${{o.paymentPhone || ''}}</span>` 
                    : `<span class="text-slate-400">-</span>`;

                let actionHtml = "";
                if (o.paymentVerificationStatus === 'PENDING' || (o.paymentStatus !== 'PAID' && o.paymentReference)) {{
                    actionHtml = `
                        <div class="flex items-center justify-end gap-1.5">
                            <button onclick="verifyPaymentRef(${{o.id}}, 'VERIFIED')" class="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl shadow-sm transition flex items-center gap-1 active:scale-95">
                                <span class="material-icons text-xs">check</span> Aprobar
                            </button>
                            <button onclick="verifyPaymentRef(${{o.id}}, 'REJECTED')" class="bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs px-2.5 py-1.5 rounded-xl border border-rose-200 transition active:scale-95">
                                <span class="material-icons text-xs">close</span> Rechazar
                            </button>
                        </div>
                    `;
                }} else if (o.paymentStatus === 'PAID') {{
                    actionHtml = `
                        <div class="flex items-center justify-end gap-1.5">
                            <span class="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5"><span class="material-icons text-xs">verified</span> Cobrado</span>
                            <button onclick="openAdminTicketModal(${{o.id}})" class="bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs px-2 py-1 rounded-lg border border-purple-200 transition flex items-center gap-1">
                                <span class="material-icons text-xs">receipt_long</span> Ticket
                            </button>
                        </div>
                    `;
                }} else {{
                    actionHtml = `
                        <div class="flex items-center justify-end gap-1">
                            <button onclick="openPaymentModal(${{o.id}})" class="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-2.5 py-1 rounded-lg transition flex items-center gap-1">
                                <span class="material-icons text-xs">point_of_sale</span> Cobrar
                            </button>
                        </div>
                    `;
                }}

                tr.innerHTML = `
                    <td class="p-3">
                        <span class="font-black bg-slate-900 text-white text-xs px-2 py-0.5 rounded-md">#${{o.id}}</span>
                        <span class="text-[10px] text-slate-400 block mt-0.5">${{o.timestamp || ''}}</span>
                    </td>
                    <td class="p-3 font-bold text-slate-800">
                        ${{o.tableNumber}}
                        <span class="block text-[10px] text-slate-400 font-normal">${{o.orderType === 'TAKEAWAY' ? 'Para Llevar' : 'En Salón'}}</span>
                    </td>
                    <td class="p-3 font-bold text-slate-900">
                        <span class="text-emerald-700">${{totalBs}} Bs</span>
                        <span class="text-[10px] text-slate-500 block">($${{o.totalUsd.toFixed(2)}})</span>
                    </td>
                    <td class="p-3">${{refText}}</td>
                    <td class="p-3">${{bankInfo}}</td>
                    <td class="p-3">${{statusBadge}}</td>
                    <td class="p-3 text-right">${{actionHtml}}</td>
                `;

                tbody.appendChild(tr);
            }});
        }}

        function verifyPaymentRef(orderId, status) {{
            const actionName = status === 'VERIFIED' ? "aprobar y registrar como PAGADO" : "RECHAZAR";
            if (!confirm(`¿Está seguro de que desea ${{actionName}} el pago del pedido #${{orderId}}?`)) return;

            fetch('/api/admin/verify-payment-ref', {{
                method: 'POST',
                headers: {{ 'Content-Type': 'application/json' }},
                body: JSON.stringify({{ orderId: orderId, status: status }})
            }})
            .then(res => res.json())
            .then(data => {{
                if (data.status === 'success') {{
                    showToast(status === 'VERIFIED' ? `¡Pago del Pedido #${{orderId}} APROBADO exitosamente!` : `Pago del Pedido #${{orderId}} Rechazado.`, status === 'REJECTED');
                    fetchUpdates();
                }} else {{
                    alert("Error: " + (data.message || "No se pudo actualizar el estado del pago."));
                }}
            }})
            .catch(err => {{
                console.error("Error verificando pago:", err);
                alert("Error de conexión al procesar la verificación.");
            }});
        }}

        function saveBusinessConfig() {{
            const name = document.getElementById('cfg-restaurant-name').value.trim();
            const slogan = document.getElementById('cfg-restaurant-slogan').value.trim();
            const logo = document.getElementById('cfg-restaurant-logo').value.trim();
            const rif = (document.getElementById('cfg-restaurant-rif') ? document.getElementById('cfg-restaurant-rif').value.trim() : "");
            const address = (document.getElementById('cfg-restaurant-address') ? document.getElementById('cfg-restaurant-address').value.trim() : "");
            const resPhone = (document.getElementById('cfg-restaurant-phone') ? document.getElementById('cfg-restaurant-phone').value.trim() : "");
            const instagram = (document.getElementById('cfg-restaurant-instagram') ? document.getElementById('cfg-restaurant-instagram').value.trim() : "");
            const ticketFooter = (document.getElementById('cfg-ticket-footer') ? document.getElementById('cfg-ticket-footer').value.trim() : "");

            const bank = document.getElementById('cfg-pm-bank').value.trim();
            const phone = document.getElementById('cfg-pm-phone').value.trim();
            const idNumber = document.getElementById('cfg-pm-id').value.trim();
            const accountName = document.getElementById('cfg-pm-name').value.trim();

            if (!name) {{
                alert("El nombre del restaurante no puede estar vacío.");
                return;
            }}

            const payload = {{
                restaurantName: name,
                restaurantSlogan: slogan,
                restaurantLogo: logo,
                restaurantRif: rif,
                restaurantAddress: address,
                restaurantPhone: resPhone,
                restaurantInstagram: instagram,
                ticketFooter: ticketFooter,
                pagoMovil: {{
                    bank: bank,
                    phone: phone,
                    idNumber: idNumber,
                    accountName: accountName
                }}
            }};

            fetch('/api/admin/update-business-config', {{
                method: 'POST',
                headers: {{ 'Content-Type': 'application/json' }},
                body: JSON.stringify(payload)
            }})
            .then(res => res.json())
            .then(data => {{
                if (data.status === 'success') {{
                    showToast("✅ ¡Configuración de negocio y diseño de Tickets guardados con éxito!", false);
                    const prev = document.getElementById('cfg-logo-preview');
                    const placeholder = document.getElementById('cfg-logo-placeholder');
                    if (logo) {{
                        if (prev) {{ prev.src = logo; prev.classList.remove('hidden'); }}
                        if (placeholder) placeholder.classList.add('hidden');
                    }} else {{
                        if (prev) prev.classList.add('hidden');
                        if (placeholder) placeholder.classList.remove('hidden');
                    }}
                    updateLiveTicketPreview();
                }} else {{
                    alert("Error: " + (data.message || "No se pudo guardar la configuración."));
                }}
            }})
            .catch(err => {{
                console.error("Error guardando config:", err);
                alert("Error de conexión al guardar.");
            }});
        }}

        function handleLogoUpload(input) {{
            if (input.files && input.files[0]) {{
                const file = input.files[0];
                if (file.size > 2 * 1024 * 1024) {{
                    alert("La imagen es demasiado pesada. Por favor selecciona una imagen menor a 2MB.");
                    return;
                }}
                const reader = new FileReader();
                reader.onload = function(e) {{
                    const base64 = e.target.result;
                    document.getElementById('cfg-restaurant-logo').value = base64;
                    const prev = document.getElementById('cfg-logo-preview');
                    const placeholder = document.getElementById('cfg-logo-placeholder');
                    if (prev) {{ prev.src = base64; prev.classList.remove('hidden'); }}
                    if (placeholder) placeholder.classList.add('hidden');
                }};
                reader.readAsDataURL(file);
            }}
        }}

        function generateQRCards() {{
            const baseUrl = document.getElementById('qr-base-url').value.trim();
            const startTable = parseInt(document.getElementById('qr-start-table').value) || 1;
            const endTable = parseInt(document.getElementById('qr-end-table').value) || 10;
            const includeKitchen = document.getElementById('qr-include-kitchen').checked;
            const container = document.getElementById('qr-cards-container');
            
            container.innerHTML = "";
            
            if (!baseUrl) {{
                container.innerHTML = `
                    <div class="col-span-full text-center py-8 bg-amber-50 rounded-2xl border border-dashed border-amber-200">
                        <span class="material-icons text-amber-500 text-4xl mb-2">warning</span>
                        <p class="text-amber-700 text-sm font-bold">Por favor ingresa un enlace base válido</p>
                    </div>
                `;
                return;
            }}
            
            let baseDomain = baseUrl;
            if (baseDomain.endsWith('/')) {{
                baseDomain = baseDomain.slice(0, -1);
            }}

            // 1. Si se solicita, añadir primero la tarjeta del modo cocina
            if (includeKitchen) {{
                const kitchenUrl = `${{baseDomain}}/kitchen`;
                const card = document.createElement('div');
                card.className = "bg-white border-2 border-emerald-200 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-between text-center relative overflow-hidden max-w-sm mx-auto aspect-[3/4] hover:shadow-md transition page-break-inside-avoid";
                card.innerHTML = `
                    <div class="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 to-teal-600"></div>
                    
                    <div class="mt-2">
                        <h4 class="text-lg font-black text-slate-900 tracking-tight">PANTALLA DE COCINA</h4>
                        <p class="text-[9px] text-emerald-600 font-extrabold uppercase tracking-widest mt-0.5">Control de Comandas (KDS)</p>
                    </div>

                    <div class="my-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner flex items-center justify-center">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${{encodeURIComponent(kitchenUrl)}}" class="w-36 h-36 object-contain rounded-lg" alt="QR Pantalla Cocina">
                    </div>

                    <div class="space-y-1">
                        <span class="text-[11px] text-slate-400 font-semibold block">Escanear con tablet o celular en</span>
                        <span class="text-2xl font-black text-emerald-700 tracking-tight block">ÁREA DE COCINA</span>
                    </div>

                    <div class="mt-3 border-t border-slate-100 pt-3 w-full grid grid-cols-3 gap-1.5 text-[8px] text-slate-500 font-medium">
                        <div class="flex flex-col items-center">
                            <span class="w-4 h-4 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center font-bold mb-1">1</span>
                            <span>Abre Cocina</span>
                        </div>
                        <div class="flex flex-col items-center">
                            <span class="w-4 h-4 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center font-bold mb-1">2</span>
                            <span>Recibe Pedido</span>
                        </div>
                        <div class="flex flex-col items-center">
                            <span class="w-4 h-4 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center font-bold mb-1">3</span>
                            <span>Despacha</span>
                        </div>
                    </div>
                `;
                container.appendChild(card);
            }}
            
            // 2. Generar tarjetas de mesas
            for (let i = startTable; i <= endTable; i++) {{
                const targetUrl = `${{baseDomain}}/?mesa=${{i}}`;
                
                const card = document.createElement('div');
                card.className = "bg-white border-2 border-purple-200 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-between text-center relative overflow-hidden max-w-sm mx-auto aspect-[3/4] hover:shadow-md transition page-break-inside-avoid";
                card.innerHTML = `
                    <div class="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-500 to-indigo-600"></div>
                    
                    <div class="mt-2">
                        <h4 class="text-lg font-black text-slate-900 tracking-tight">GastroLocal</h4>
                        <p class="text-[9px] text-purple-600 font-extrabold uppercase tracking-widest mt-0.5">Menú Digital Autogestionado</p>
                    </div>

                    <div class="my-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner flex items-center justify-center">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${{encodeURIComponent(targetUrl)}}" class="w-36 h-36 object-contain rounded-lg" alt="QR Mesa ${{i}}">
                    </div>

                    <div class="space-y-1">
                        <span class="text-[11px] text-slate-400 font-semibold block">Escanea y pide directo de tu</span>
                        <span class="text-2xl font-black text-purple-700 tracking-tight block">MESA ${{i}}</span>
                    </div>

                    <div class="mt-3 border-t border-slate-100 pt-3 w-full grid grid-cols-3 gap-1.5 text-[8px] text-slate-500 font-medium">
                        <div class="flex flex-col items-center">
                            <span class="w-4 h-4 bg-purple-50 text-purple-700 rounded-full flex items-center justify-center font-bold mb-1">1</span>
                            <span>Escanea QR</span>
                        </div>
                        <div class="flex flex-col items-center">
                            <span class="w-4 h-4 bg-purple-50 text-purple-700 rounded-full flex items-center justify-center font-bold mb-1">2</span>
                            <span>Elige plato</span>
                        </div>
                        <div class="flex flex-col items-center">
                            <span class="w-4 h-4 bg-purple-50 text-purple-700 rounded-full flex items-center justify-center font-bold mb-1">3</span>
                            <span>Recibe orden</span>
                        </div>
                    </div>
                `;
                container.appendChild(card);
            }}
        }}

        function setOrderFilter(filterId) {{
            orderFilter = filterId;
            
            // Actualizar clases de botones
            document.getElementById('btn-filter-pending').className = "px-4 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-white/50 transition";
            document.getElementById('btn-filter-preparing').className = "px-4 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-white/50 transition";
            document.getElementById('btn-filter-historial').className = "px-4 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-white/50 transition";

            if (filterId === 'PENDING') {{
                document.getElementById('btn-filter-pending').className = "px-4 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-800 shadow-sm transition";
            }} else if (filterId === 'PREPARING') {{
                document.getElementById('btn-filter-preparing').className = "px-4 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-800 shadow-sm transition";
            }} else if (filterId === 'HISTORIAL') {{
                document.getElementById('btn-filter-historial').className = "px-4 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-800 shadow-sm transition";
            }}

            renderOrders();
        }}

        function parseTableNum(tableStr) {{
            if (!tableStr) return null;
            const str = String(tableStr).trim();
            if (str.toLowerCase().includes("llevar")) return null;
            const match = str.match(/\\d+/);
            return match ? parseInt(match[0], 10) : null;
        }}

        function setTableFilter(filter) {{
            tableFilter = filter;
            renderTableStatus();
        }}

        function updateTableStateServer(tableNum, params) {{
            params.tableNum = tableNum;
            fetch('/api/admin/update-table-state', {{
                method: 'POST',
                headers: {{ 'Content-Type': 'application/json' }},
                body: JSON.stringify(params)
            }})
            .then(res => res.json())
            .then(data => {{
                if (data.status === 'success') {{
                    tableStates = data.tableStates || {{}};
                    renderTableStatus();
                }} else {{
                    alert("Error al actualizar estado de la mesa.");
                }}
            }})
            .catch(err => {{
                console.error("Error al actualizar mesa:", err);
            }});
        }}

        function setTableStatusManual(tableNum, newStatus) {{
            const current = tableStates[String(tableNum)] || {{ status: 'FREE', pax: 0, capacity: 4 }};
            let pax = current.pax || 0;
            if (newStatus === 'FREE' || newStatus === 'CLEANING') {{
                pax = 0;
            }} else if (newStatus === 'OCCUPIED_DECIDING' && pax === 0) {{
                pax = 2; // Por defecto asigna 2 comensales al ocupar mesa decidiendo
            }}
            updateTableStateServer(tableNum, {{ status: newStatus, pax: pax }});
        }}

        function changeTablePax(tableNum, delta) {{
            const current = tableStates[String(tableNum)] || {{ status: 'FREE', pax: 0, capacity: 4 }};
            const cap = current.capacity || 4;
            let newPax = (current.pax || 0) + delta;
            if (newPax < 0) newPax = 0;
            if (newPax > cap) newPax = cap;
            
            let status = current.status || 'FREE';
            if (newPax > 0 && status === 'FREE') {{
                status = 'OCCUPIED_DECIDING';
            }} else if (newPax === 0 && status === 'OCCUPIED_DECIDING') {{
                status = 'FREE';
            }}

            updateTableStateServer(tableNum, {{ pax: newPax, status: status }});
        }}

        function promptChangeTableCapacity(tableNum) {{
            const current = tableStates[String(tableNum)] || {{ capacity: 4 }};
            const val = prompt(`Ingrese la cantidad total de SILLAS / Capacidad de la Mesa ${{tableNum}}:`, current.capacity || 4);
            if (val !== null) {{
                const num = parseInt(val.trim(), 10);
                if (!isNaN(num) && num > 0) {{
                    updateTableStateServer(tableNum, {{ capacity: num }});
                }} else {{
                    alert("Por favor ingrese un número entero de sillas válido.");
                }}
            }}
        }}

        function calcElapsedMinutes(timestampStr) {{
            if (!timestampStr) return 0;
            try {{
                const now = new Date();
                const parts = timestampStr.match(/(\\d+):(\\d+)\\s*(AM|PM)?/i);
                if (parts) {{
                    let hours = parseInt(parts[1], 10);
                    const minutes = parseInt(parts[2], 10);
                    const ampm = parts[3];
                    if (ampm) {{
                        if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
                        if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
                    }}
                    const orderTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
                    const diffMs = now - orderTime;
                    const diffMins = Math.floor(diffMs / 60000);
                    return diffMins > 0 ? diffMins : 0;
                }}
            }} catch(e) {{}}
            return 0;
        }}

        function clearTableCall(tableNum) {{
            fetch('/api/admin/clear-table-call', {{
                method: 'POST',
                headers: {{ 'Content-Type': 'application/json' }},
                body: JSON.stringify({{ tableNum: String(tableNum) }})
            }})
            .then(res => res.json())
            .then(data => {{
                if (data.status === 'success') {{
                    tableStates = data.tableStates || {{}};
                    renderTableStatus();
                }}
            }});
        }}

        function openTransferTableModal(fromTable) {{
            const toTable = prompt(`Mover pedido de Mesa ${{fromTable}} a otra Mesa.\n\nIngrese el NÚMERO de la Mesa Destino:`);
            if (toTable) {{
                const cleanTo = parseInt(toTable.trim(), 10);
                if (!isNaN(cleanTo) && cleanTo > 0 && cleanTo !== fromTable) {{
                    fetch('/api/admin/transfer-table', {{
                        method: 'POST',
                        headers: {{ 'Content-Type': 'application/json' }},
                        body: JSON.stringify({{ fromTable: String(fromTable), toTable: String(cleanTo) }})
                    }})
                    .then(res => res.json())
                    .then(data => {{
                        if (data.status === 'success') {{
                            orders = data.orders || orders;
                            tableStates = data.tableStates || tableStates;
                            renderOrders();
                            renderTableStatus();
                            showToast(`Mesa ${{fromTable}} transferida exitosamente a Mesa ${{cleanTo}}`, false);
                        }} else {{
                            alert("Error: " + (data.message || "No se pudo transferir"));
                        }}
                    }});
                }}
            }}
        }}

        function openMergeTablesModal(mainTable) {{
            const secTable = prompt(`Unir / Fusionar otra mesa con Mesa ${{mainTable}}.\n\nIngrese el NÚMERO de la Mesa Secundaria a fusionar con Mesa ${{mainTable}}:`);
            if (secTable) {{
                const cleanSec = parseInt(secTable.trim(), 10);
                if (!isNaN(cleanSec) && cleanSec > 0 && cleanSec !== mainTable) {{
                    fetch('/api/admin/merge-tables', {{
                        method: 'POST',
                        headers: {{ 'Content-Type': 'application/json' }},
                        body: JSON.stringify({{ mainTable: String(mainTable), secondaryTable: String(cleanSec) }})
                    }})
                    .then(res => res.json())
                    .then(data => {{
                        if (data.status === 'success') {{
                            orders = data.orders || orders;
                            tableStates = data.tableStates || tableStates;
                            renderOrders();
                            renderTableStatus();
                            showToast(`Mesa ${{cleanSec}} unida a Mesa ${{mainTable}}`, false);
                        }} else {{
                            alert("Error: " + (data.message || "No se pudo fusionar"));
                        }}
                    }});
                }}
            }}
        }}

        function openCashRegisterModal() {{
            fetch('/api/admin/close-cash-register', {{
                method: 'POST',
                headers: {{ 'Content-Type': 'application/json' }},
                body: JSON.stringify({{ notes: 'Cierre de Turno Administrador' }})
            }})
            .then(res => res.json())
            .then(data => {{
                if (data.status === 'success') {{
                    const r = data.report;
                    document.getElementById('z-report-date').textContent = `Fecha: ${{r.timestamp}} • Tasa Cambiaria: ${{r.exchangeRate}} Bs/$`;
                    
                    const content = document.getElementById('z-report-content');
                    content.innerHTML = `
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div class="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
                                <span class="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block">Ventas Totales ($)</span>
                                <span class="text-2xl font-black text-emerald-700 block mt-0.5">$${{r.totalUsd.toFixed(2)}}</span>
                            </div>
                            <div class="bg-teal-50 border border-teal-100 p-4 rounded-2xl">
                                <span class="text-[10px] font-extrabold text-teal-800 uppercase tracking-wider block">Ventas en Bs</span>
                                <span class="text-2xl font-black text-teal-700 block mt-0.5">${{r.totalBs.toFixed(2)}} Bs</span>
                            </div>
                            <div class="bg-purple-50 border border-purple-100 p-4 rounded-2xl">
                                <span class="text-[10px] font-extrabold text-purple-800 uppercase tracking-wider block">Pedidos Cobrados</span>
                                <span class="text-2xl font-black text-purple-700 block mt-0.5">${{r.totalOrdersPaid}}</span>
                            </div>
                            <div class="bg-blue-50 border border-blue-100 p-4 rounded-2xl">
                                <span class="text-[10px] font-extrabold text-blue-800 uppercase tracking-wider block">Ticket Promedio</span>
                                <span class="text-2xl font-black text-blue-700 block mt-0.5">$${{r.avgPerTableUsd.toFixed(2)}}</span>
                            </div>
                        </div>

                        <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                            <h4 class="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                <span class="material-icons text-sm text-purple-600">account_balance_wallet</span> Arqueo por Método de Pago
                            </h4>
                            <div class="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                                <div class="bg-white p-3 rounded-xl border border-slate-200">
                                    <span class="text-slate-400 font-medium block">Efectivo USD</span>
                                    <span class="font-extrabold text-slate-900 text-sm">$${{r.methodBreakdownUsd.CASH_USD.toFixed(2)}}</span>
                                </div>
                                <div class="bg-white p-3 rounded-xl border border-slate-200">
                                    <span class="text-slate-400 font-medium block">Efectivo Bs</span>
                                    <span class="font-extrabold text-slate-900 text-sm">${{r.methodBreakdownBs.CASH_BS.toFixed(2)}} Bs</span>
                                </div>
                                <div class="bg-white p-3 rounded-xl border border-slate-200">
                                    <span class="text-slate-400 font-medium block">Pago Móvil</span>
                                    <span class="font-extrabold text-slate-900 text-sm">${{r.methodBreakdownBs.PAGO_MOVIL.toFixed(2)}} Bs</span>
                                </div>
                                <div class="bg-white p-3 rounded-xl border border-slate-200">
                                    <span class="text-slate-400 font-medium block">Punto de Venta</span>
                                    <span class="font-extrabold text-slate-900 text-sm">${{r.methodBreakdownBs.PUNTO.toFixed(2)}} Bs</span>
                                </div>
                                <div class="bg-white p-3 rounded-xl border border-slate-200">
                                    <span class="text-slate-400 font-medium block">Zelle</span>
                                    <span class="font-extrabold text-slate-900 text-sm">$${{r.methodBreakdownUsd.ZELLE.toFixed(2)}}</span>
                                </div>
                                <div class="bg-white p-3 rounded-xl border border-slate-200">
                                    <span class="text-slate-400 font-medium block">Otros</span>
                                    <span class="font-extrabold text-slate-900 text-sm">$${{r.methodBreakdownUsd.OTROS.toFixed(2)}}</span>
                                </div>
                            </div>
                        </div>
                    `;
                    
                    document.getElementById('cash-register-modal').classList.remove('hidden');
                }}
            }});
        }}

        function closeCashRegisterModal() {{
            document.getElementById('cash-register-modal').classList.add('hidden');
        }}

        function printZReport() {{
            document.body.classList.add('printing-z-report');
            window.print();
            setTimeout(() => {{
                document.body.classList.remove('printing-z-report');
            }}, 1000);
        }}

        window.addEventListener('afterprint', () => {{
            document.body.classList.remove('printing-z-report');
        }});

        function confirmCloseCashRegister() {{
            fetch('/api/admin/close-cash-register', {{
                method: 'POST',
                headers: {{ 'Content-Type': 'application/json' }},
                body: JSON.stringify({{ action: 'confirm', notes: 'Cierre de Turno Administrador' }})
            }})
            .then(res => res.json())
            .then(data => {{
                if (data.status === 'success') {{
                    if (data.orders) {{
                        orders = data.orders;
                    }}
                    closeCashRegisterModal();
                    if (typeof renderVentas === 'function') renderVentas();
                    if (typeof renderOrders === 'function') renderOrders();
                    if (typeof renderTableStatus === 'function') renderTableStatus();
                    showToast("🔒 ¡Cierre de Caja registrado y archivado exitosamente! El nuevo turno inicia en $0.00.", false);
                }} else {{
                    alert("Error al registrar Cierre de Caja: " + (data.message || "Desconocido"));
                }}
            }})
            .catch(err => {{
                alert("Error de comunicación al registrar Cierre de Caja: " + err.message);
            }});
        }}

        function renderTableStatus() {{
            const totalTables = totalTablesConfig || 10;
            
            // Map table number -> list of active unpaid dine-in orders
            const tableOrders = {{}};
            orders.forEach(o => {{
                const isCancelled = o.status === "CANCELLED";
                const isPaid = o.paymentStatus === "PAID";
                if (!isCancelled && !isPaid) {{
                    const tableNum = parseTableNum(o.tableNumber);
                    if (tableNum) {{
                        if (!tableOrders[tableNum]) {{
                            tableOrders[tableNum] = [];
                        }}
                        tableOrders[tableNum].push(o);
                    }}
                }}
            }});

            let occupiedTablesCount = 0;
            let totalSalonChairs = 0;
            let occupiedChairsCount = 0;

            for (let t = 1; t <= totalTables; t++) {{
                const activeOrders = tableOrders[t] || [];
                const saved = tableStates[String(t)] || {{ status: 'FREE', pax: 0, capacity: 4, notes: '' }};
                const capacity = saved.capacity || 4;
                totalSalonChairs += capacity;

                let effectiveStatus = saved.status || 'FREE';
                if (activeOrders.length > 0) {{
                    effectiveStatus = 'OCCUPIED_ORDER';
                }}

                const isOccupied = (effectiveStatus !== 'FREE' && effectiveStatus !== 'CLEANING');
                if (isOccupied) {{
                    occupiedTablesCount++;
                    let paxVal = saved.pax > 0 ? saved.pax : 2;
                    occupiedChairsCount += paxVal;
                }}
            }}

            const freeTablesCount = Math.max(0, totalTables - occupiedTablesCount);
            const freeChairsCount = Math.max(0, totalSalonChairs - occupiedChairsCount);
            const occupancyPercent = totalTables > 0 ? Math.round((occupiedTablesCount / totalTables) * 100) : 0;

            // Actualizar elementos KPI
            const elTotal = document.getElementById('kpi-total-tables');
            if (elTotal) elTotal.textContent = totalTables;
            
            const elBtnLabel = document.getElementById('label-total-tables-btn');
            if (elBtnLabel) elBtnLabel.textContent = totalTables + " Mesas";

            const elOccupied = document.getElementById('kpi-occupied-tables');
            if (elOccupied) elOccupied.textContent = occupiedTablesCount;

            const elFree = document.getElementById('kpi-free-tables');
            if (elFree) elFree.textContent = freeTablesCount;

            const elTotalChairs = document.getElementById('kpi-total-chairs');
            if (elTotalChairs) elTotalChairs.textContent = totalSalonChairs;

            const elOccChairs = document.getElementById('kpi-occupied-chairs');
            if (elOccChairs) elOccChairs.textContent = occupiedChairsCount;

            const elFreeChairs = document.getElementById('kpi-free-chairs');
            if (elFreeChairs) elFreeChairs.textContent = freeChairsCount;

            const elPercent = document.getElementById('kpi-occupancy-percent');
            if (elPercent) elPercent.textContent = occupancyPercent + "%";

            const elBar = document.getElementById('kpi-occupancy-bar');
            if (elBar) elBar.style.width = occupancyPercent + "%";

            const elLabelOcc = document.getElementById('kpi-occupancy-label');
            if (elLabelOcc) {{
                if (occupancyPercent >= 90) {{
                    elLabelOcc.textContent = "🔥 Salón Casi Lleno";
                }} else if (occupancyPercent >= 50) {{
                    elLabelOcc.textContent = "⚡ Ocupación Media";
                }} else {{
                    elLabelOcc.textContent = "✨ Salón Con Capacidad Libre";
                }}
            }}

            const elCountsAll = document.getElementById('count-tables-all');
            if (elCountsAll) elCountsAll.textContent = totalTables;

            const elCountsOcc = document.getElementById('count-tables-occupied');
            if (elCountsOcc) elCountsOcc.textContent = occupiedTablesCount;

            const elCountsFree = document.getElementById('count-tables-free');
            if (elCountsFree) elCountsFree.textContent = freeTablesCount;

            // Header Pill
            const elHeaderPill = document.getElementById('orders-header-table-status');
            if (elHeaderPill) {{
                elHeaderPill.textContent = `Salón: ${{occupiedTablesCount}}/${{totalTables}} Mesas (${{occupiedChairsCount}}/${{totalSalonChairs}} Sillas)`;
            }}

            const badgeOccupied = document.getElementById('badge-mesas-ocupadas');
            if (badgeOccupied) {{
                badgeOccupied.textContent = occupiedTablesCount + " Ocupadas";
                if (occupiedTablesCount > 0) {{
                    badgeOccupied.className = "bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse";
                }} else {{
                    badgeOccupied.className = "bg-slate-200 text-slate-600 text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm";
                }}
            }}

            // Actualizar botones de filtro
            const btnAll = document.getElementById('btn-table-filter-all');
            const btnOcc = document.getElementById('btn-table-filter-occupied');
            const btnFree = document.getElementById('btn-table-filter-free');

            if (btnAll) btnAll.className = tableFilter === 'ALL' ? "px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-800 shadow-sm transition" : "px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-white/50 transition";
            if (btnOcc) btnOcc.className = tableFilter === 'OCCUPIED' ? "px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-800 shadow-sm transition" : "px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-white/50 transition";
            if (btnFree) btnFree.className = tableFilter === 'FREE' ? "px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-800 shadow-sm transition" : "px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-white/50 transition";

            // Renderizar Grid de Mesas
            const container = document.getElementById('tables-grid');
            if (!container) return;
            container.innerHTML = "";

            for (let t = 1; t <= totalTables; t++) {{
                const activeOrders = tableOrders[t] || [];
                const saved = tableStates[String(t)] || {{ status: 'FREE', pax: 0, capacity: 4, notes: '' }};
                const capacity = saved.capacity || 4;
                
                let effectiveStatus = saved.status || 'FREE';
                if (activeOrders.length > 0) {{
                    effectiveStatus = 'OCCUPIED_ORDER';
                }}

                if (tableFilter === 'OCCUPIED' && effectiveStatus === 'FREE') continue;
                if (tableFilter === 'FREE' && effectiveStatus !== 'FREE') continue;

                let pax = saved.pax || 0;
                if (effectiveStatus === 'OCCUPIED_ORDER' && pax === 0) pax = 2;

                let chairsHtml = "";
                for (let i = 1; i <= capacity; i++) {{
                    const isChairOccupied = (i <= pax) && (effectiveStatus !== 'FREE' && effectiveStatus !== 'CLEANING');
                    chairsHtml += `
                        <span class="material-icons text-base ${{isChairOccupied ? 'text-amber-600 drop-shadow-sm scale-110' : 'text-slate-300 opacity-60'}}" title="Silla ${{i}} (${{isChairOccupied ? 'Ocupada' : 'Libre'}})">
                            event_seat
                        </span>
                    `;
                }}

                // Banner de Llamada de Mesero / Cuenta
                let callBannerHtml = "";
                if (saved.call) {{
                    const isWaiter = saved.call.type === 'WAITER';
                    callBannerHtml = `
                        <div class="${{isWaiter ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-slate-950'}} p-2.5 rounded-2xl flex items-center justify-between shadow-md animate-bounce my-2">
                            <div class="flex items-center gap-1.5 font-black text-xs">
                                <span class="material-icons text-base">${{isWaiter ? 'notifications_active' : 'receipt_long'}}</span>
                                <span>${{isWaiter ? '¡PIDE MESERO!' : '¡SOLICITA CUENTA!'}}</span>
                                <span class="opacity-75 text-[10px]">(${{saved.call.time || ''}})</span>
                            </div>
                            <button onclick="clearTableCall(${{t}})" class="bg-slate-950 text-white hover:bg-slate-800 font-bold text-[10px] px-2.5 py-1 rounded-xl transition active:scale-95 shadow">
                                Atendido ✓
                            </button>
                        </div>
                    `;
                }}

                const card = document.createElement('div');

                if (effectiveStatus === 'OCCUPIED_ORDER') {{
                    const primaryOrder = activeOrders[0];
                    const ordersCount = activeOrders.length;
                    const tableTotalUsd = activeOrders.reduce((sum, o) => sum + o.totalUsd, 0);
                    const tableTotalBs = (tableTotalUsd * exchangeRate).toFixed(2);
                    const totalItemsCount = activeOrders.reduce((sum, o) => sum + (o.items ? o.items.reduce((iSum, item) => iSum + item.quantity, 0) : 0), 0);
                    const orderIdsStr = activeOrders.map(o => '#' + String(o.id).padStart(3, '0')).join(', ');

                    const statusLabelMap = {{
                        "PENDING": "En Espera",
                        "CONFIRMED": "Preparando",
                        "PREPARING": "En Cocina",
                        "READY": "Servido",
                        "DELIVERED": "Consumiendo"
                    }};
                    const currentStatusText = statusLabelMap[primaryOrder.status] || primaryOrder.status;

                    // Semáforo de Tiempo máximo de la mesa
                    const maxElapsed = Math.max(...activeOrders.map(o => calcElapsedMinutes(o.timestamp)));
                    let semaforoBadge = `<span class="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> ${{maxElapsed}} min</span>`;
                    if (maxElapsed >= 10 && maxElapsed <= 20) {{
                        semaforoBadge = `<span class="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse"><span class="w-2 h-2 rounded-full bg-amber-500"></span> ${{maxElapsed}} min</span>`;
                    }} else if (maxElapsed > 20) {{
                        semaforoBadge = `<span class="bg-rose-600 text-white shadow-sm text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-bounce"><span class="material-icons text-xs">warning</span> ${{maxElapsed}} min CRÍTICO</span>`;
                    }}

                    const ordersBadgeText = ordersCount > 1 ? `${{ordersCount}} PEDIDOS UNIFICADOS` : `CON PEDIDO`;

                    card.className = "bg-gradient-to-br from-purple-50/90 via-white to-amber-50/50 border-2 border-purple-400 rounded-3xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4 relative overflow-hidden";
                    card.innerHTML = `
                        <div class="flex items-center justify-between border-b border-purple-100 pb-3">
                            <div class="flex items-center gap-2.5">
                                <div class="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-purple-500/30">
                                    ${{t}}
                                </div>
                                <div>
                                    <h4 class="font-black text-slate-900 text-sm">Mesa ${{t}}</h4>
                                    <span class="text-[10px] text-purple-700 font-bold block">${{orderIdsStr}}</span>
                                </div>
                            </div>
                            <div class="flex flex-col items-end gap-1">
                                <span class="bg-purple-100 text-purple-900 border border-purple-200 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                                    <span class="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse"></span> ${{ordersBadgeText}}
                                </span>
                                ${{semaforoBadge}}
                            </div>
                        </div>

                        ${{callBannerHtml}}

                        <div class="bg-white/80 p-3 rounded-2xl border border-purple-100 space-y-2">
                            <div class="flex items-center justify-between text-xs">
                                <span class="font-bold text-slate-500 text-[11px]">Sillas / Pax:</span>
                                <div class="flex items-center gap-1">
                                    <button onclick="changeTablePax(${{t}}, -1)" class="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center border border-slate-200 transition active:scale-95">-</button>
                                    <span class="font-black text-slate-800 text-xs px-1">${{pax}}/${{capacity}} Sentados</span>
                                    <button onclick="changeTablePax(${{t}}, 1)" class="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center border border-slate-200 transition active:scale-95">+</button>
                                    <button onclick="promptChangeTableCapacity(${{t}})" class="ml-1 text-slate-400 hover:text-purple-600 transition" title="Editar cantidad de sillas">
                                        <span class="material-icons text-xs">settings</span>
                                    </button>
                                </div>
                            </div>
                            <div class="flex items-center justify-center gap-1 pt-1 border-t border-slate-100">
                                ${{chairsHtml}}
                            </div>
                        </div>

                        <div class="space-y-1.5 text-xs">
                            <div class="flex justify-between items-center text-slate-600">
                                <span class="text-slate-400 font-medium">Estado Cocina:</span>
                                <span class="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">${{currentStatusText}}</span>
                            </div>
                            <div class="flex justify-between items-center text-slate-600">
                                <span class="text-slate-400 font-medium">Consumo Mesa:</span>
                                <span class="font-bold text-slate-800">${{totalItemsCount}} productos (${{ordersCount}} ${{ordersCount === 1 ? 'pedido' : 'pedidos'}})</span>
                            </div>
                            <div class="pt-2 border-t border-slate-100 flex justify-between items-baseline">
                                <span class="font-black text-purple-900 text-xs">TOTAL MESA COMPLETA:</span>
                                <div class="text-right">
                                    <span class="font-black text-emerald-700 text-base block">$${{tableTotalUsd.toFixed(2)}}</span>
                                    <span class="text-[11px] text-purple-800 font-bold">${{tableTotalBs}} Bs</span>
                                </div>
                            </div>
                        </div>

                        <div class="pt-2 border-t border-slate-100 space-y-2">
                            <button onclick="openTablePaymentModal(${{t}})" class="w-full bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-xs py-2.5 rounded-xl transition shadow-md flex items-center justify-center gap-1.5 active:scale-95">
                                <span class="material-icons text-sm">payments</span> Cobrar Mesa Completa ($${{tableTotalUsd.toFixed(2)}})
                            </button>

                            <div class="grid grid-cols-2 gap-1.5">
                                <button onclick="goToOrderDetails(${{primaryOrder.id}})" class="bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold text-[10px] py-1.5 rounded-xl transition flex items-center justify-center gap-1">
                                    <span class="material-icons text-xs">visibility</span> Ver Detalle
                                </button>
                                <button onclick="openTableIndividualPayModal(${{t}})" class="bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[10px] py-1.5 rounded-xl transition flex items-center justify-center gap-1">
                                    <span class="material-icons text-xs">call_split</span> Cobrar Separado
                                </button>
                            </div>

                            <div class="grid grid-cols-2 gap-1.5">
                                <button onclick="openTransferTableModal(${{t}})" class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] py-1.5 rounded-xl transition flex items-center justify-center gap-1" title="Cambiar pedido a otra mesa">
                                    <span class="material-icons text-xs">swap_horiz</span> Mover Mesa
                                </button>
                                <button onclick="openMergeTablesModal(${{t}})" class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] py-1.5 rounded-xl transition flex items-center justify-center gap-1" title="Unir cuenta con otra mesa">
                                    <span class="material-icons text-xs">call_merge</span> Unir Mesas
                                </button>
                            </div>
                        </div>
                    `;

                }} else if (effectiveStatus === 'OCCUPIED_DECIDING' || effectiveStatus === 'OCCUPIED') {{
                    card.className = "bg-amber-50/70 border-2 border-amber-300 rounded-3xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4";
                    card.innerHTML = `
                        <div class="flex items-center justify-between border-b border-amber-200 pb-3">
                            <div class="flex items-center gap-2.5">
                                <div class="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black text-sm shadow-md shadow-amber-500/20">
                                    ${{t}}
                                </div>
                                <div>
                                    <h4 class="font-black text-slate-900 text-sm">Mesa ${{t}}</h4>
                                    <span class="text-[10px] text-amber-800 font-semibold block">Clientes Sentados</span>
                                </div>
                            </div>
                            <span class="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1">
                                <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span> DECIDIENDO MENÚ
                            </span>
                        </div>

                        ${{callBannerHtml}}

                        <div class="bg-white p-3 rounded-2xl border border-amber-200/80 space-y-2">
                            <div class="flex items-center justify-between text-xs">
                                <span class="font-bold text-slate-600 text-[11px]">Sillas Ocupadas:</span>
                                <div class="flex items-center gap-1">
                                    <button onclick="changeTablePax(${{t}}, -1)" class="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center border border-slate-200 transition active:scale-95">-</button>
                                    <span class="font-black text-amber-950 text-xs px-1">${{pax}}/${{capacity}} Personas</span>
                                    <button onclick="changeTablePax(${{t}}, 1)" class="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center border border-slate-200 transition active:scale-95">+</button>
                                    <button onclick="promptChangeTableCapacity(${{t}})" class="ml-1 text-slate-400 hover:text-amber-600 transition" title="Editar cantidad de sillas">
                                        <span class="material-icons text-xs">settings</span>
                                    </button>
                                </div>
                            </div>
                            <div class="flex items-center justify-center gap-1 pt-1 border-t border-slate-100">
                                ${{chairsHtml}}
                            </div>
                        </div>

                        <div class="py-1 text-center space-y-1">
                            <p class="text-xs font-bold text-amber-900 flex items-center justify-center gap-1">
                                <span class="material-icons text-sm text-amber-600">menu_book</span> Decidiendo pedido por QR
                            </p>
                            <p class="text-[10px] text-slate-500">Los clientes están revisando la carta digital.</p>
                        </div>

                        <div class="pt-2 border-t border-amber-200 grid grid-cols-2 gap-2">
                            <button onclick="setTableStatusManual(${{t}}, 'FREE')" class="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[11px] py-2 rounded-xl transition flex items-center justify-center gap-1">
                                <span class="material-icons text-xs">check_circle</span> Liberar Mesa
                            </button>
                            <button onclick="copyQrForTable(${{t}})" class="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-[11px] py-2 rounded-xl transition flex items-center justify-center gap-1">
                                <span class="material-icons text-xs text-purple-600">qr_code</span> Copiar QR
                            </button>
                        </div>
                    `;

                }} else if (effectiveStatus === 'RESERVED') {{
                    card.className = "bg-sky-50/70 border-2 border-sky-300 rounded-3xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4";
                    card.innerHTML = `
                        <div class="flex items-center justify-between border-b border-sky-200 pb-3">
                            <div class="flex items-center gap-2.5">
                                <div class="w-10 h-10 rounded-2xl bg-sky-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-sky-500/20">
                                    ${{t}}
                                </div>
                                <div>
                                    <h4 class="font-black text-slate-900 text-sm">Mesa ${{t}}</h4>
                                    <span class="text-[10px] text-sky-800 font-semibold block">Reservación Especial</span>
                                </div>
                            </div>
                            <span class="bg-sky-100 text-sky-900 border border-sky-300 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1">
                                <span class="material-icons text-xs">bookmark</span> RESERVADA
                            </span>
                        </div>

                        ${{callBannerHtml}}

                        <div class="bg-white p-3 rounded-2xl border border-sky-200/80 space-y-2 text-center">
                            <span class="material-icons text-2xl text-sky-500">event_available</span>
                            <p class="text-xs font-bold text-sky-950">Mesa Reservada (${{capacity}} Sillas)</p>
                            <div class="flex items-center justify-center gap-1 pt-1 border-t border-slate-100">
                                ${{chairsHtml}}
                            </div>
                        </div>

                        <div class="pt-2 border-t border-sky-200 grid grid-cols-2 gap-2">
                            <button onclick="setTableStatusManual(${{t}}, 'OCCUPIED_DECIDING')" class="bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] py-2 rounded-xl transition flex items-center justify-center gap-1">
                                <span class="material-icons text-xs">group</span> Ocupar Mesa
                            </button>
                            <button onclick="setTableStatusManual(${{t}}, 'FREE')" class="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-[11px] py-2 rounded-xl transition flex items-center justify-center gap-1">
                                <span class="material-icons text-xs text-emerald-600">check</span> Liberar
                            </button>
                        </div>
                    `;

                }} else if (effectiveStatus === 'CLEANING') {{
                    card.className = "bg-slate-50 border-2 border-slate-300 rounded-3xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4 opacity-80";
                    card.innerHTML = `
                        <div class="flex items-center justify-between border-b border-slate-200 pb-3">
                            <div class="flex items-center gap-2.5">
                                <div class="w-10 h-10 rounded-2xl bg-slate-400 text-white flex items-center justify-center font-black text-sm">
                                    ${{t}}
                                </div>
                                <div>
                                    <h4 class="font-black text-slate-900 text-sm">Mesa ${{t}}</h4>
                                    <span class="text-[10px] text-slate-500 font-semibold block">Mantenimiento</span>
                                </div>
                            </div>
                            <span class="bg-slate-200 text-slate-800 border border-slate-300 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1">
                                <span class="material-icons text-xs">cleaning_services</span> EN LIMPIEZA
                            </span>
                        </div>

                        ${{callBannerHtml}}

                        <div class="py-2 text-center space-y-1">
                            <span class="material-icons text-2xl text-slate-400">sanitizer</span>
                            <p class="text-xs font-bold text-slate-700">Por Sanitizar / Limpiar</p>
                        </div>

                        <div class="pt-2 border-t border-slate-200">
                            <button onclick="setTableStatusManual(${{t}}, 'FREE')" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] py-2 rounded-xl transition flex items-center justify-center gap-1">
                                <span class="material-icons text-xs">check_circle</span> Marcar Lista y Libre
                            </button>
                        </div>
                    `;

                }} else {{
                    card.className = "bg-white border-2 border-slate-200 hover:border-emerald-400 rounded-3xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4";
                    card.innerHTML = `
                        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div class="flex items-center gap-2.5">
                                <div class="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-sm">
                                    ${{t}}
                                </div>
                                <div>
                                    <h4 class="font-black text-slate-900 text-sm">Mesa ${{t}}</h4>
                                    <span class="text-[10px] text-slate-400 font-medium block">Salón</span>
                                </div>
                            </div>
                            <span class="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1">
                                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> LIBRE
                            </span>
                        </div>

                        ${{callBannerHtml}}

                        <div class="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-2">
                            <div class="flex items-center justify-between text-xs">
                                <span class="font-bold text-slate-500 text-[11px]">Capacidad Mesa:</span>
                                <div class="flex items-center gap-1">
                                    <span class="font-bold text-slate-800 text-xs">${{capacity}} Sillas</span>
                                    <button onclick="promptChangeTableCapacity(${{t}})" class="ml-1 text-slate-400 hover:text-purple-600 transition" title="Editar cantidad de sillas">
                                        <span class="material-icons text-xs">settings</span>
                                    </button>
                                </div>
                            </div>
                            <div class="flex items-center justify-center gap-1 pt-1 border-t border-slate-100">
                                ${{chairsHtml}}
                            </div>
                        </div>

                        <div class="pt-2 border-t border-slate-100 space-y-2">
                            <div class="grid grid-cols-2 gap-2">
                                <button onclick="setTableStatusManual(${{t}}, 'OCCUPIED_DECIDING')" class="bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] py-2 rounded-xl transition flex items-center justify-center gap-1 shadow-sm active:scale-95">
                                    <span class="material-icons text-xs">menu_book</span> Decidiendo
                                </button>
                                <button onclick="setTableStatusManual(${{t}}, 'RESERVED')" class="bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-bold text-[11px] py-2 rounded-xl transition flex items-center justify-center gap-1">
                                    <span class="material-icons text-xs">bookmark</span> Reservar
                                </button>
                            </div>
                            <button onclick="copyQrForTable(${{t}})" class="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-[11px] py-2 rounded-xl border border-slate-200 transition flex items-center justify-center gap-1">
                                <span class="material-icons text-xs text-purple-600">qr_code</span> Copiar Enlace QR
                            </button>
                        </div>
                    `;
                }}

                container.appendChild(card);
            }}
        }}

        function promptUpdateTotalTables() {{
            const current = totalTablesConfig || 10;
            const input = prompt("Ingrese la cantidad total de mesas de su establecimiento:", current);
            if (input !== null) {{
                const val = parseInt(input.trim(), 10);
                if (!isNaN(val) && val > 0) {{
                    fetch('/api/admin/update-total-tables', {{
                        method: 'POST',
                        headers: {{ 'Content-Type': 'application/json' }},
                        body: JSON.stringify({{ totalTables: val }})
                    }})
                    .then(res => res.json())
                    .then(data => {{
                        if (data.status === 'success') {{
                            totalTablesConfig = data.totalTables;
                            renderTableStatus();
                            alert(`Capacidad de mesas actualizada correctamente a ${{data.totalTables}} mesas.`);
                        }} else {{
                            alert("Error al actualizar la capacidad de mesas.");
                        }}
                    }})
                    .catch(err => {{
                        console.error("Error al actualizar totalTables:", err);
                        alert("Error de conexión al guardar mesas.");
                    }});
                }} else {{
                    alert("Por favor ingrese un número entero válido mayor a 0.");
                }}
            }}
        }}

        function copyQrForTable(tableNum) {{
            const detectedIp = "{server_ip}";
            const hostIp = (window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') ? window.location.hostname : detectedIp;
            const serverPort = window.location.port || "{PORT}";
            const baseUrl = (document.getElementById('qr-base-url') && document.getElementById('qr-base-url').value.trim()) ? document.getElementById('qr-base-url').value.trim().replace(/\/+$/, '') : `http://${{hostIp}}:${{serverPort}}`;
            const tableUrl = `${{baseUrl}}/?table=${{tableNum}}`;
            if (navigator.clipboard && navigator.clipboard.writeText) {{
                navigator.clipboard.writeText(tableUrl).then(() => {{
                    alert(`¡Enlace directo para Mesa ${{tableNum}} copiado al portapapeles!\n\n${{tableUrl}}`);
                }}).catch(() => {{
                    prompt(`Enlace directo para Mesa ${{tableNum}}:`, tableUrl);
                }});
            }} else {{
                prompt(`Enlace directo para Mesa ${{tableNum}}:`, tableUrl);
            }}
        }}

        function goToOrderDetails(orderId) {{
            switchTab('pedidos');
            setOrderFilter('PREPARING');
            setTimeout(() => {{
                const el = document.getElementById(`order-card-${{orderId}}`);
                if (el) {{
                    el.scrollIntoView({{ behavior: 'smooth', block: 'center' }});
                    el.classList.add('ring-4', 'ring-purple-500');
                    setTimeout(() => el.classList.remove('ring-4', 'ring-purple-500'), 3000);
                }}
            }}, 150);
        }}

        function renderOrders() {{
            const container = document.getElementById('orders-monitor');
            container.innerHTML = "";

            let filteredOrders = [];
            if (orderFilter === "PENDING") {{
                filteredOrders = orders.filter(o => o.status === "PENDING");
            }} else if (orderFilter === "PREPARING") {{
                // Cocina: pedidos CONFIRMED (preparando) o READY (listo) o DELIVERED que NO estén pagados aún
                filteredOrders = orders.filter(o => o.status === "CONFIRMED" || o.status === "PREPARING" || o.status === "READY" || (o.status === "DELIVERED" && o.paymentStatus !== "PAID"));
            }} else {{
                // Historial: pedidos DELIVERED y pagados, o CANCELLED
                filteredOrders = orders.filter(o => (o.status === "DELIVERED" && o.paymentStatus === "PAID") || o.status === "CANCELLED");
            }}

            if (filteredOrders.length === 0) {{
                container.innerHTML = `
                    <div class="col-span-full text-center py-12 text-slate-400">
                        <span class="material-icons text-5xl mb-2">dinner_dining</span>
                        <p class="text-sm">No hay pedidos registrados en este filtro.</p>
                    </div>
                `;
                return;
            }}

            filteredOrders.forEach(o => {{
                const statusColors = {{
                    "PENDING": "bg-yellow-100 text-yellow-800 border-yellow-200",
                    "CONFIRMED": "bg-blue-100 text-blue-800 border-blue-200",
                    "PREPARING": "bg-blue-100 text-blue-800 border-blue-200",
                    "READY": "bg-indigo-100 text-indigo-800 border-indigo-200",
                    "DELIVERED": "bg-emerald-100 text-emerald-800 border-emerald-200",
                    "CANCELLED": "bg-rose-100 text-rose-800 border-rose-200"
                }};

                const statusLabel = {{
                    "PENDING": "Pendiente",
                    "CONFIRMED": "Preparando",
                    "PREPARING": "Preparando",
                    "READY": "Listo",
                    "DELIVERED": "Entregado",
                    "CANCELLED": "Cancelado"
                }};

                const totalBs = (o.totalUsd * exchangeRate).toFixed(2);
                const itemsHtml = o.items.map(it => `
                    <div class="flex justify-between items-center text-sm py-1 border-b border-slate-100">
                        <span class="font-medium"><span class="text-purple-600 font-bold">${{it.quantity}}x</span> ${{it.productName}}</span>
                        <span class="text-slate-500">$${{it.priceUsd.toFixed(2)}} ud</span>
                    </div>
                `).join("");

                let actionButtons = "";
                if (o.status === "PENDING") {{
                    actionButtons = `
                        <button onclick="updateOrderStatus(${{o.id}}, 'CONFIRMED')" class="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1">
                            <span class="material-icons text-sm">check</span> Confirmar Pedido
                        </button>
                        <button onclick="updateOrderStatus(${{o.id}}, 'CANCELLED')" class="bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs px-3 py-1.5 rounded-lg font-bold transition">
                            Rechazar
                        </button>
                    `;
                }} else if (o.status === "CONFIRMED" || o.status === "PREPARING") {{
                    actionButtons = `
                        <button onclick="updateOrderStatus(${{o.id}}, 'READY')" class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1">
                            <span class="material-icons text-sm">restaurant</span> Marcar Listo
                        </button>
                    `;
                }} else if (o.status === "READY") {{
                    if (o.orderType === "TAKEAWAY") {{
                        if (o.paymentStatus !== "PAID") {{
                            actionButtons = `
                                <button onclick="openPaymentModal(${{o.id}})" class="bg-orange-600 hover:bg-orange-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1">
                                    <span class="material-icons text-sm">point_of_sale</span> Cobrar (Para Llevar)
                                </button>
                            `;
                        }} else {{
                            actionButtons = `
                                <button onclick="updateOrderStatus(${{o.id}}, 'DELIVERED')" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1">
                                    <span class="material-icons text-sm">local_mall</span> Entregar Pedido
                                </button>
                            `;
                        }}
                    }} else {{
                        // DINE_IN
                        actionButtons = `
                            <button onclick="deliverAndCollect(${{o.id}})" class="bg-teal-600 hover:bg-teal-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1">
                                <span class="material-icons text-sm">room_service</span> Entregar a Mesa
                            </button>
                        `;
                    }}
                }} else if (o.status === "DELIVERED" && o.paymentStatus !== "PAID") {{
                    actionButtons = `
                        <button onclick="openPaymentModal(${{o.id}})" class="bg-orange-600 hover:bg-orange-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1">
                            <span class="material-icons text-sm">point_of_sale</span> Cobrar Cuenta (Mesa)
                        </button>
                    `;
                }} else {{
                    // Pagados o cancelados
                    actionButtons = `
                        <button onclick="openAdminTicketModal(${{o.id}})" class="bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs px-2.5 py-1.5 rounded-lg border border-purple-200 transition flex items-center gap-1">
                            <span class="material-icons text-xs">receipt_long</span> Ver Ticket
                        </button>
                    `;
                }}

                // If not finalized but paid, also give quick ticket access
                const ticketQuickBtn = (o.paymentStatus === 'PAID' || o.status === 'READY' || o.status === 'DELIVERED') ? `
                    <button onclick="openAdminTicketModal(${{o.id}})" class="bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-800 font-bold text-xs p-1.5 rounded-lg transition" title="Ver / Imprimir Ticket">
                        <span class="material-icons text-sm">receipt_long</span>
                    </button>
                ` : '';

                const orderCard = document.createElement('div');
                orderCard.id = `order-card-${{o.id}}`;
                orderCard.className = `p-5 bg-white border rounded-2xl shadow-sm space-y-4 transition-all ${{o.status === 'PENDING' ? 'ring-2 ring-yellow-400' : ''}}`;
                
                let paymentLabel = "";
                if (o.paymentStatus === "PAID") {{
                    paymentLabel = `<span class="text-xs font-bold text-green-600 flex items-center gap-1"><span class="material-icons text-xs">check_circle</span> PAGADO</span>`;
                }} else {{
                    paymentLabel = `<span class="text-xs font-bold text-rose-600 flex items-center gap-1"><span class="material-icons text-xs">pending</span> Por Cobrar</span>`;
                }}

                const displayPaymentMethod = o.paymentMethod.includes(":") ? "Pago Mixto" : o.paymentMethod;

                orderCard.innerHTML = `
                    <div class="flex flex-wrap items-center justify-between gap-2">
                        <div class="flex items-center gap-2">
                            <span class="text-sm font-black bg-slate-900 text-white px-2.5 py-1 rounded-lg">#${{o.id}}</span>
                            <span class="font-bold text-slate-800 text-sm">${{o.tableNumber}}</span>
                            <span class="text-xs text-slate-400">• ${{o.timestamp}}</span>
                        </div>
                        <div class="flex items-center gap-2">
                            ${{ticketQuickBtn}}
                            <span class="text-xs font-semibold px-2.5 py-1 rounded-full border ${{statusColors[o.status] || 'bg-slate-100 text-slate-800'}}">
                                ${{statusLabel[o.status] || o.status}}
                            </span>
                        </div>
                    </div>
 
                    <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        ${{itemsHtml}}
                        ${{o.notes ? `<p class="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg mt-2 border border-amber-200 font-medium">Nota: ${{o.notes}}</p>` : ''}}
                    </div>
 
                    <div class="flex justify-between items-center border-t border-slate-100 pt-3">
                        <div>
                            <span class="text-xs text-slate-400 block">${{o.orderType === 'TAKEAWAY' ? '🚚 PARA LLEVAR' : '🍽️ EN MESA'}} • ${{displayPaymentMethod}}</span>
                            <span class="text-sm font-extrabold text-slate-800">$${{o.totalUsd.toFixed(2)}} / <span class="text-purple-600">${{totalBs}} Bs</span></span>
                            <div class="mt-1">${{paymentLabel}}</div>
                        </div>
                        <div class="flex items-center gap-2">${{actionButtons}}</div>
                    </div>
                `;
                container.appendChild(orderCard);
            }});
        }}

        function renderProducts() {{
            const container = document.getElementById('products-list');
            container.innerHTML = "";

            products.forEach(p => {{
                const statusBtn = p.isAvailable 
                    ? `<button onclick="toggleProduct(${{p.id}})" class="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] px-2 py-1 rounded font-bold transition">Habilitado</button>`
                    : `<button onclick="toggleProduct(${{p.id}})" class="bg-rose-100 hover:bg-rose-200 text-rose-800 text-[10px] px-2 py-1 rounded font-bold transition">Deshabilitado</button>`;

                const imgIsBase64 = p.imageUri && p.imageUri.startsWith('data:image');
                const imgHtml = imgIsBase64
                    ? `<img src="${{p.imageUri}}" class="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0">`
                    : `<div class="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-200">${{p.name.charAt(0).toUpperCase()}}</div>`;

                const prodCard = document.createElement('div');
                prodCard.className = `p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3 ${{!p.isAvailable ? 'opacity-60 bg-slate-50' : ''}}`;
                prodCard.innerHTML = `
                    <div class="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer" onclick="openEditProductModal(${{p.id}})" title="Haga clic para editar">
                        ${{imgHtml}}
                        <div class="flex-1 min-w-0">
                            <h4 class="font-bold text-xs truncate">${{p.name}}</h4>
                            <p class="text-[9px] text-slate-500 truncate mt-0.5">${{p.description || 'Sin descripción.'}}</p>
                            <p class="text-[10px] text-purple-600 font-extrabold mt-0.5">$${{p.priceUsd.toFixed(2)}} / ${{ (p.priceUsd * exchangeRate).toFixed(2) }} Bs</p>
                        </div>
                    </div>
                    
                    <div class="flex flex-col items-end gap-1.5">
                        <div class="flex items-center gap-1">
                            <!-- Control de Stock -->
                            <div class="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded p-0.5">
                                <span class="text-[9px] font-bold text-slate-500 px-1">Stock:</span>
                                <input type="number" value="${{p.stock}}" onchange="updateStock(${{p.id}}, this.value)" class="w-10 text-center text-xs font-bold bg-transparent focus:outline-none">
                            </div>
                            ${{statusBtn}}
                        </div>
                        <div class="flex gap-1">
                            <button onclick="openEditProductModal(${{p.id}})" class="bg-slate-100 hover:bg-slate-200 text-slate-700 p-1 rounded flex items-center justify-center transition" title="Editar">
                                <span class="material-icons text-xs">edit</span>
                            </button>
                            <button onclick="deleteProduct(${{p.id}})" class="bg-rose-50 hover:bg-rose-100 text-rose-600 p-1 rounded flex items-center justify-center transition" title="Eliminar">
                                <span class="material-icons text-xs">delete</span>
                            </button>
                        </div>
                    </div>
                `;
                container.appendChild(prodCard);
            }});
        }}

        // COBRANZA MULTIDIVISA & MIXTA (MESA COMPLETA O INDIVIDUAL)
        let activePaymentOrdersList = [];
        let activePaymentTotalAmountUsd = 0;

        function openPaymentModal(orderId) {{
            const order = orders.find(o => o.id === orderId);
            if (!order) return;

            activePaymentOrdersList = [order];
            activePaymentTotalAmountUsd = order.totalUsd;
            activePaymentOrderId = orderId;

            document.getElementById('payment-order-id').textContent = `#${{order.id}}`;
            document.getElementById('payment-order-location').textContent = order.tableNumber;
            document.getElementById('pay-total-usd').textContent = `$${{order.totalUsd.toFixed(2)}}`;
            document.getElementById('pay-total-bs').textContent = `${{(order.totalUsd * exchangeRate).toFixed(2)}} Bs`;
            
            // Reset inputs
            document.getElementById('pay-cash-usd').value = "";
            document.getElementById('pay-zelle-usd').value = "";
            document.getElementById('pay-pagomovil-bs').value = "";
            document.getElementById('pay-punto-bs').value = "";
            document.getElementById('pay-cash-bs').value = "";

            calculatePayment();
            document.getElementById('payment-modal').classList.remove('hidden');
        }}

        function openTablePaymentModal(tableNum) {{
            const tableOrdersList = orders.filter(o => o.status !== "CANCELLED" && o.paymentStatus !== "PAID" && parseTableNum(o.tableNumber) === tableNum);
            if (tableOrdersList.length === 0) {{
                alert("No hay pedidos activos por cobrar en Mesa " + tableNum);
                return;
            }}

            activePaymentOrdersList = tableOrdersList;
            activePaymentTotalAmountUsd = tableOrdersList.reduce((sum, o) => sum + o.totalUsd, 0);
            activePaymentOrderId = tableOrdersList[0].id; // Referencia primaria

            const orderIdsStr = tableOrdersList.map(o => '#' + String(o.id).padStart(3, '0')).join(', ');

            document.getElementById('payment-order-id').textContent = `Mesa ${{tableNum}} (${{orderIdsStr}})`;
            document.getElementById('payment-order-location').textContent = `Mesa ${{tableNum}} (Mesa Completa - ${{tableOrdersList.length}} ${{tableOrdersList.length === 1 ? 'Pedido' : 'Pedidos'}})`;
            document.getElementById('pay-total-usd').textContent = `$${{activePaymentTotalAmountUsd.toFixed(2)}}`;
            document.getElementById('pay-total-bs').textContent = `${{(activePaymentTotalAmountUsd * exchangeRate).toFixed(2)}} Bs`;

            // Reset inputs
            document.getElementById('pay-cash-usd').value = "";
            document.getElementById('pay-zelle-usd').value = "";
            document.getElementById('pay-pagomovil-bs').value = "";
            document.getElementById('pay-punto-bs').value = "";
            document.getElementById('pay-cash-bs').value = "";

            calculatePayment();
            document.getElementById('payment-modal').classList.remove('hidden');
        }}

        function quickFillPayment(type) {{
            if (activePaymentTotalAmountUsd <= 0) return;
            document.getElementById('pay-cash-usd').value = "";
            document.getElementById('pay-zelle-usd').value = "";
            document.getElementById('pay-pagomovil-bs').value = "";
            document.getElementById('pay-punto-bs').value = "";
            document.getElementById('pay-cash-bs').value = "";

            if (type === 'CASH_USD') {{
                document.getElementById('pay-cash-usd').value = activePaymentTotalAmountUsd.toFixed(2);
            }} else if (type === 'PAGOMOVIL') {{
                document.getElementById('pay-pagomovil-bs').value = (activePaymentTotalAmountUsd * exchangeRate).toFixed(2);
            }} else if (type === 'PUNTO') {{
                document.getElementById('pay-punto-bs').value = (activePaymentTotalAmountUsd * exchangeRate).toFixed(2);
            }}
            calculatePayment();
        }}

        function openTableIndividualPayModal(tableNum) {{
            const tableOrdersList = orders.filter(o => o.status !== "CANCELLED" && o.paymentStatus !== "PAID" && parseTableNum(o.tableNumber) === tableNum);
            if (tableOrdersList.length === 0) {{
                alert("No hay pedidos activos en Mesa " + tableNum);
                return;
            }}

            if (tableOrdersList.length === 1) {{
                openPaymentModal(tableOrdersList[0].id);
                return;
            }}

            let promptMsg = `MESA ${{tableNum}} tiene ${{tableOrdersList.length}} pedidos independientes.\n`;
            promptMsg += `Ingresa el número de opción para cobrar por separado:\n\n`;
            tableOrdersList.forEach((o, index) => {{
                promptMsg += `${{index + 1}}. Pedido #${{o.id}} - $${{o.totalUsd.toFixed(2)}} (${{(o.totalUsd * exchangeRate).toFixed(2)}} Bs)\n`;
            }});

            const choiceStr = prompt(promptMsg, "1");
            if (!choiceStr) return;
            const choiceIdx = parseInt(choiceStr, 10) - 1;

            if (choiceIdx >= 0 && choiceIdx < tableOrdersList.length) {{
                openPaymentModal(tableOrdersList[choiceIdx].id);
            }} else {{
                alert("Opción no válida.");
            }}
        }}

        function closePaymentModal() {{
            document.getElementById('payment-modal').classList.add('hidden');
            activePaymentOrderId = null;
            activePaymentOrdersList = [];
            activePaymentTotalAmountUsd = 0;
        }}

        function calculatePayment() {{
            if (activePaymentOrdersList.length === 0) return;

            const totalUsdToPay = activePaymentTotalAmountUsd;

            // Read inputs
            const cashUsd = parseFloat(document.getElementById('pay-cash-usd').value) || 0;
            const zelleUsd = parseFloat(document.getElementById('pay-zelle-usd').value) || 0;
            const pagomovilBs = parseFloat(document.getElementById('pay-pagomovil-bs').value) || 0;
            const puntoBs = parseFloat(document.getElementById('pay-punto-bs').value) || 0;
            const cashBs = parseFloat(document.getElementById('pay-cash-bs').value) || 0;

            // Convert Bs to USD equivalents
            const pagomovilUsd = pagomovilBs / exchangeRate;
            const puntoUsd = puntoBs / exchangeRate;
            const cashBsUsd = cashBs / exchangeRate;

            // Update equivalent labels
            document.getElementById('pay-pagomovil-usd').textContent = `Equiv. $${{pagomovilUsd.toFixed(2)}}`;
            document.getElementById('pay-punto-usd').textContent = `Equiv. $${{puntoUsd.toFixed(2)}}`;
            document.getElementById('pay-cashbs-usd').textContent = `Equiv. $${{cashBsUsd.toFixed(2)}}`;

            // Total entered in USD
            const totalEnteredUsd = cashUsd + zelleUsd + pagomovilUsd + puntoUsd + cashBsUsd;
            const totalEnteredBs = totalEnteredUsd * exchangeRate;

            document.getElementById('pay-entered-summary').textContent = `$${{totalEnteredUsd.toFixed(2)}} / ${{totalEnteredBs.toFixed(2)}} Bs`;

            const statusRow = document.getElementById('pay-status-row');
            const statusLabel = document.getElementById('pay-status-label');
            const statusVal = document.getElementById('pay-status-val');
            const confirmBtn = document.getElementById('btn-confirm-payment');

            const diff = totalEnteredUsd - totalUsdToPay;

            if (diff < -0.01) {{
                // Pendiente (Falta dinero)
                const remainingUsd = totalUsdToPay - totalEnteredUsd;
                const remainingBs = remainingUsd * exchangeRate;

                statusLabel.textContent = "Pendiente:";
                statusVal.textContent = `$${{remainingUsd.toFixed(2)}} / ${{remainingBs.toFixed(2)}} Bs`;

                statusRow.className = "flex justify-between text-sm font-black text-rose-600 bg-rose-50 border border-rose-100 p-3 rounded-2xl";
                confirmBtn.disabled = true;
            }} else {{
                // Cubierto (Pago completo o con cambio)
                statusRow.className = "flex justify-between text-sm font-black text-emerald-600 bg-emerald-50 border border-emerald-100 p-3 rounded-2xl";
                confirmBtn.disabled = false;

                if (diff > 0.01) {{
                    const changeUsd = diff;
                    const changeBs = changeUsd * exchangeRate;
                    statusLabel.textContent = "Cambio / Vuelto:";
                    statusVal.textContent = `$${{changeUsd.toFixed(2)}} / ${{changeBs.toFixed(2)}} Bs`;
                }} else {{
                    statusLabel.textContent = "Estado:";
                    statusVal.textContent = "Pago Exacto Completado";
                }}
            }}
        }}

        function confirmPaymentSubmit() {{
            if (activePaymentOrdersList.length === 0) return;

            const cashUsd = parseFloat(document.getElementById('pay-cash-usd').value) || 0;
            const zelleUsd = parseFloat(document.getElementById('pay-zelle-usd').value) || 0;
            const pagomovilBs = parseFloat(document.getElementById('pay-pagomovil-bs').value) || 0;
            const puntoBs = parseFloat(document.getElementById('pay-punto-bs').value) || 0;
            const cashBs = parseFloat(document.getElementById('pay-cash-bs').value) || 0;

            const pagomovilUsd = pagomovilBs / exchangeRate;
            const puntoUsd = puntoBs / exchangeRate;
            const cashBsUsd = cashBs / exchangeRate;

            let parts = [];
            if (cashUsd > 0) parts.push(`Efectivo $: $${{cashUsd.toFixed(2)}}`);
            if (zelleUsd > 0) parts.push(`Zelle: $${{zelleUsd.toFixed(2)}}`);
            if (pagomovilBs > 0) parts.push(`Pago Móvil: $${{pagomovilUsd.toFixed(2)}}`);
            if (puntoBs > 0) parts.push(`Punto de Venta: $${{puntoUsd.toFixed(2)}}`);
            if (cashBs > 0) parts.push(`Efectivo Bs: $${{cashBsUsd.toFixed(2)}}`);

            let finalMethodString = parts.join(", ");
            if (finalMethodString === "") {{
                finalMethodString = activePaymentOrdersList[0].paymentMethod || "EFECTIVO";
            }}

            const amountCollected = activePaymentTotalAmountUsd;
            const orderIds = activePaymentOrdersList.map(o => o.id);

            fetch('/api/admin/collect-payment', {{
                method: 'POST',
                headers: {{ 'Content-Type': 'application/json' }},
                body: JSON.stringify({{
                    orderIds: orderIds,
                    paymentMethod: finalMethodString,
                    newStatus: "DELIVERED"
                }})
            }})
            .then(res => {{
                if (!res.ok) throw new Error("HTTP " + res.status);
                return res.json();
            }})
            .then(data => {{
                if (data && data.status === 'success') {{
                    closePaymentModal();
                    fetchUpdates();
                    showToast(`✅ ¡Cobro de $${{amountCollected.toFixed(2)}} registrado exitosamente!`, false);
                }} else {{
                    alert("Error al registrar pago: " + (data ? data.message : "Desconocido"));
                }}
            }})
            .catch(err => {{
                console.error("Error al cobrar pago:", err);
                alert("Detalle de comunicación: el pago fue procesado o verifique red (" + err.message + ")");
            }});
        }}

        // BUSINESS INTELLIGENCE - RESUMEN DE VENTAS
        function getSalesBreakdown(order) {{
            let breakdown = {{
                cashUsd: 0,
                zelle: 0,
                pagomovil: 0,
                punto: 0,
                cashBs: 0
            }};

            const method = String(order.paymentMethod || "").trim();
            const total = parseFloat(order.totalUsd) || 0;

            if (method.includes(":")) {{
                const parts = method.split(",");
                parts.forEach(part => {{
                    const cleanPart = part.trim();
                    if (cleanPart.includes(":")) {{
                        const subParts = cleanPart.split(":");
                        const name = subParts[0].trim().toUpperCase();
                        const amountValStr = subParts[1].trim().replace("$", "").replace("Bs", "").trim();
                        const amount = parseFloat(amountValStr) || 0;

                        if (name.includes("EFECTIVO $") || name.includes("CASH $")) {{
                            breakdown.cashUsd += amount;
                        }} else if (name.includes("ZELLE")) {{
                            breakdown.zelle += amount;
                        }} else if (name.includes("PAGO MÓVIL") || name.includes("PAGO MOVIL") || name.includes("PAGOMOVIL")) {{
                            breakdown.pagomovil += amount;
                        }} else if (name.includes("PUNTO")) {{
                            breakdown.punto += amount;
                        }} else if (name.includes("EFECTIVO BS") || name.includes("CASH BS")) {{
                            breakdown.cashBs += amount;
                        }}
                    }}
                }});
            }} else {{
                const mUpper = method.toUpperCase();
                if (mUpper.includes("PAGO_MOVIL") || mUpper.includes("PAGOMOVIL") || mUpper.includes("PAGO MOVIL")) {{
                    breakdown.pagomovil = total;
                }} else if (mUpper.includes("PUNTO")) {{
                    breakdown.punto = total;
                }} else if (mUpper.includes("ZELLE")) {{
                    breakdown.zelle = total;
                }} else if (mUpper.includes("CASH_BS") || mUpper.includes("EFECTIVO BS") || mUpper.includes("EFECTIVO_BS")) {{
                    breakdown.cashBs = total;
                }} else {{
                    breakdown.cashUsd = total;
                }}
            }}
            return breakdown;
        }}

        function renderVentas() {{
            const paidOrders = orders.filter(o => o.paymentStatus === 'PAID' && o.status === 'DELIVERED' && !o.archived);
            
            let totalSalesUsd = 0;
            let totalSalesBs = 0;
            let transactionCount = paidOrders.length;

            let methodTotals = {{
                cashUsd: 0,
                zelle: 0,
                pagomovil: 0,
                punto: 0,
                cashBs: 0
            }};

            paidOrders.forEach(o => {{
                totalSalesUsd += o.totalUsd;
                totalSalesBs += o.totalUsd * exchangeRate;

                const breakdown = getSalesBreakdown(o);
                methodTotals.cashUsd += breakdown.cashUsd;
                methodTotals.zelle += breakdown.zelle;
                methodTotals.pagomovil += breakdown.pagomovil;
                methodTotals.punto += breakdown.punto;
                methodTotals.cashBs += breakdown.cashBs;
            }});

            // Actualizar KPIs
            document.getElementById('kpi-total-usd').textContent = `$${{totalSalesUsd.toFixed(2)}}`;
            document.getElementById('kpi-total-bs').textContent = `${{totalSalesBs.toFixed(2)}} Bs`;
            document.getElementById('kpi-exchange-rate').textContent = `Calculado a tasa: ${{exchangeRate.toFixed(2)}} Bs/$`;
            document.getElementById('kpi-trans-count').textContent = transactionCount;

            // Render progress bars por método
            const totalCollected = methodTotals.cashUsd + methodTotals.zelle + methodTotals.pagomovil + methodTotals.punto + methodTotals.cashBs || 1;
            
            const methodMetadata = [
                {{ key: 'cashUsd', label: 'Efectivo $', color: 'bg-green-500', text: 'text-green-500' }},
                {{ key: 'zelle', label: 'Zelle', color: 'bg-blue-500', text: 'text-blue-500' }},
                {{ key: 'pagomovil', label: 'Pago Móvil (Bs)', color: 'bg-purple-500', text: 'text-purple-500' }},
                {{ key: 'punto', label: 'Punto de Venta (Bs)', color: 'bg-indigo-500', text: 'text-indigo-500' }},
                {{ key: 'cashBs', label: 'Efectivo Bs', color: 'bg-amber-500', text: 'text-amber-500' }}
            ];

            const methodsContainer = document.getElementById('sales-by-method-container');
            methodsContainer.innerHTML = "";

            methodMetadata.forEach(m => {{
                const amount = methodTotals[m.key];
                const pct = ((amount / totalCollected) * 100).toFixed(1);

                methodsContainer.innerHTML += `
                    <div class="space-y-1">
                        <div class="flex justify-between text-xs font-bold text-slate-700">
                            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full ${{m.color}}"></span> ${{m.label}}</span>
                            <span>$${{amount.toFixed(2)}} (${{pct}}%)</span>
                        </div>
                        <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/50">
                            <div class="${{m.color}} h-full rounded-full transition-all duration-500" style="width: ${{pct}}%"></div>
                        </div>
                    </div>
                `;
            }});

            // Render log de transacciones
            const tbody = document.getElementById('transactions-log-tbody');
            tbody.innerHTML = "";

            if (paidOrders.length === 0) {{
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center py-8 text-slate-400">No hay ventas registradas aún hoy.</td>
                    </tr>
                `;
                return;
            }}

            paidOrders.forEach(o => {{
                const cleanPaymentText = o.paymentMethod.includes(":") ? "Mixto: " + o.paymentMethod : o.paymentMethod;
                tbody.innerHTML += `
                    <tr class="border-b border-slate-100 hover:bg-slate-50/50 transition">
                        <td class="py-3 pr-2 font-black text-slate-900">#${{o.id}}</td>
                        <td class="py-3 px-2 text-xs text-slate-500">${{o.timestamp}}</td>
                        <td class="py-3 px-2 text-xs font-bold text-slate-700">${{o.orderType === 'TAKEAWAY' ? '🚚 Llevar' : '🍽️ ' + o.tableNumber}}</td>
                        <td class="py-3 px-2 text-xs text-slate-600 max-w-xs truncate" title="${{o.paymentMethod}}">${{cleanPaymentText}}</td>
                        <td class="py-3 px-2 font-bold text-slate-900 text-right">$${{o.totalUsd.toFixed(2)}}</td>
                        <td class="py-3 px-2 font-bold text-purple-600 text-right">${{(o.totalUsd * exchangeRate).toFixed(2)}} Bs</td>
                        <td class="py-3 pl-2 text-right">
                            <button onclick="openAdminTicketModal(${{o.id}})" class="bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs px-2.5 py-1.5 rounded-lg border border-purple-200 transition inline-flex items-center gap-1">
                                <span class="material-icons text-xs">receipt_long</span> Ticket
                            </button>
                        </td>
                    </tr>
                `;
            }});
        }}

        function updateOrderStatus(orderId, status) {{
            fetch('/api/admin/update-order-status', {{
                method: 'POST',
                headers: {{ 'Content-Type': 'application/json' }},
                body: JSON.stringify({{ orderId, status }})
            }})
            .then(res => {{
                if (res.ok) {{
                    fetchUpdates();
                }}
            }});
        }}

        function deliverAndCollect(orderId) {{
            fetch('/api/admin/update-order-status', {{
                method: 'POST',
                headers: {{ 'Content-Type': 'application/json' }},
                body: JSON.stringify({{ orderId: orderId, status: 'DELIVERED' }})
            }})
            .then(res => res.json())
            .then(data => {{
                if (data.status === 'success') {{
                    fetchUpdates().then(() => {{
                        openPaymentModal(orderId);
                    }});
                }}
            }});
        }}

        function updateRate() {{
            const rate = parseFloat(document.getElementById('input-rate').value);
            if (isNaN(rate) || rate <= 0) return;

            fetch('/api/admin/update-exchange-rate', {{
                method: 'POST',
                headers: {{ 'Content-Type': 'application/json' }},
                body: JSON.stringify({{ exchangeRateBs: rate }})
            }})
            .then(res => {{
                if (res.ok) {{
                    exchangeRate = rate;
                    fetchUpdates();
                    alert("Tasa del dólar actualizada correctamente.");
                }}
            }});
        }}

        function sincronizarTasaDolarApi(btn) {{
            const originalHTML = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = `<span class="material-icons text-sm animate-spin block">sync</span>`;
            
            // Intentamos obtener la tasa oficial de DolarApi
            fetch('https://ve.dolarapi.com/v1/dolares/oficial')
            .then(res => {{
                if (!res.ok) throw new Error("No se pudo obtener la tasa oficial");
                return res.json();
            }})
            .then(data => {{
                const rate = parseFloat(data.promedio || data.venta || data.compra);
                if (rate && rate > 0) {{
                    document.getElementById('input-rate').value = rate.toFixed(2);
                    
                    fetch('/api/admin/update-exchange-rate', {{
                        method: 'POST',
                        headers: {{ 'Content-Type': 'application/json' }},
                        body: JSON.stringify({{ exchangeRateBs: rate }})
                    }})
                    .then(r => {{
                        if (r.ok) {{
                            exchangeRate = rate;
                            fetchUpdates();
                            alert(`📈 Tasa sincronizada con éxito desde DolarApi (BCV): Bs. ${{rate.toFixed(2)}}`);
                        }} else {{
                            alert(`Tasa obtenida (Bs. ${{rate.toFixed(2)}}) pero no se pudo guardar en el servidor.`);
                        }}
                    }});
                }} else {{
                    throw new Error("Formato de respuesta inválido");
                }}
            }})
            .catch(err => {{
                console.error("Error sincronizando con DolarApi oficial, intentando fallback:", err);
                // Si la oficial falla, intentamos con la lista general
                fetch('https://ve.dolarapi.com/v1/dolares')
                .then(res => res.json())
                .then(list => {{
                    const oficial = list.find(d => d.fuente === 'oficial' || d.fuente === 'bcv' || d.nombre.toLowerCase().includes('oficial') || d.nombre.toLowerCase().includes('bcv'));
                    const rateObj = oficial || list[0];
                    const rate = parseFloat(rateObj.promedio || rateObj.venta || rateObj.compra);
                    if (rate && rate > 0) {{
                        document.getElementById('input-rate').value = rate.toFixed(2);
                        fetch('/api/admin/update-exchange-rate', {{
                            method: 'POST',
                            headers: {{ 'Content-Type': 'application/json' }},
                            body: JSON.stringify({{ exchangeRateBs: rate }})
                        }})
                        .then(r => {{
                            if (r.ok) {{
                                exchangeRate = rate;
                                fetchUpdates();
                                alert(`📈 Tasa sincronizada con éxito (Fallback): Bs. ${{rate.toFixed(2)}}`);
                            }}
                        }});
                    }} else {{
                        alert("⚠️ No se encontró una tasa de cambio válida.");
                    }}
                }})
                .catch(err2 => {{
                    alert("❌ Error de conexión al sincronizar con DolarApi.\\nVerifica tu conexión a internet o ingresa la tasa manualmente.");
                }});
            }})
            .finally(() => {{
                btn.disabled = false;
                btn.innerHTML = originalHTML;
            }});
        }}

        function toggleProduct(productId) {{
            fetch('/api/admin/toggle-product', {{
                method: 'POST',
                headers: {{ 'Content-Type': 'application/json' }},
                body: JSON.stringify({{ productId }})
            }})
            .then(res => res.json())
            .then(data => {{
                if (data.status === 'success') {{
                    fetchUpdates();
                }}
            }});
        }}

        function updateStock(productId, stock) {{
            const parsedStock = parseInt(stock);
            if (isNaN(parsedStock) || parsedStock < 0) return;

            fetch('/api/admin/update-stock', {{
                method: 'POST',
                headers: {{ 'Content-Type': 'application/json' }},
                body: JSON.stringify({{ productId, stock: parsedStock }})
            }})
            .then(res => {{
                if (res.ok) {{
                    fetchUpdates();
                }}
            }});
        }}

        let uploadedImageBase64 = "";

        function handleImageUpload(event) {{
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {{
                const img = new Image();
                img.onload = function() {{
                    const canvas = document.createElement('canvas');
                    const max_size = 320;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {{
                        if (width > max_size) {{
                            height *= max_size / width;
                            width = max_size;
                        }}
                    }} else {{
                        if (height > max_size) {{
                            width *= max_size / height;
                            height = max_size;
                        }}
                    }}

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    uploadedImageBase64 = canvas.toDataURL('image/jpeg', 0.7);
                    
                    // Show preview
                    document.getElementById('preview-icon').classList.add('hidden');
                    const previewImg = document.getElementById('preview-img');
                    previewImg.src = uploadedImageBase64;
                    previewImg.classList.remove('hidden');
                    document.getElementById('btn-clear-image').classList.remove('hidden');
                }};
                img.src = e.target.result;
            }};
            reader.readAsDataURL(file);
        }}

        function clearCustomImage() {{
            uploadedImageBase64 = "";
            document.getElementById('form-image-file').value = "";
            document.getElementById('preview-img').src = "";
            document.getElementById('preview-img').classList.add('hidden');
            document.getElementById('preview-icon').classList.remove('hidden');
            document.getElementById('btn-clear-image').classList.add('hidden');
        }}

        function openAddProductModal() {{
            document.getElementById('modal-title').textContent = "Agregar Producto";
            document.getElementById('form-product-id').value = "";
            document.getElementById('form-product-name').value = "";
            document.getElementById('form-product-desc').value = "";
            document.getElementById('form-product-price').value = "";
            document.getElementById('form-product-stock').value = "10";
            document.getElementById('form-product-image').value = "plato";
            clearCustomImage();
            
            // Llenar categorías
            const catSelect = document.getElementById('form-product-category');
            catSelect.innerHTML = categories.map(c => `<option value="${{c.id}}">${{c.name}}</option>`).join('');
            
            document.getElementById('product-modal').classList.remove('hidden');
        }}

        function openEditProductModal(productId) {{
            const p = products.find(prod => prod.id === productId);
            if (!p) return;
            
            document.getElementById('modal-title').textContent = "Editar Producto";
            document.getElementById('form-product-id').value = p.id;
            document.getElementById('form-product-name').value = p.name;
            document.getElementById('form-product-desc').value = p.description || "";
            document.getElementById('form-product-price').value = p.priceUsd;
            document.getElementById('form-product-stock').value = p.stock;
            
            clearCustomImage();
            
            if (p.imageUri && p.imageUri.startsWith('data:image')) {{
                uploadedImageBase64 = p.imageUri;
                document.getElementById('preview-icon').classList.add('hidden');
                const previewImg = document.getElementById('preview-img');
                previewImg.src = uploadedImageBase64;
                previewImg.classList.remove('hidden');
                document.getElementById('btn-clear-image').classList.remove('hidden');
                document.getElementById('form-product-image').value = "plato";
            }} else {{
                document.getElementById('form-product-image').value = p.imageUri || "plato";
            }}
            
            // Llenar categorías
            const catSelect = document.getElementById('form-product-category');
            catSelect.innerHTML = categories.map(c => `<option value="${{c.id}}" ${{c.id === p.categoryId ? 'selected' : ''}}>${{c.name}}</option>`).join('');
            
            document.getElementById('product-modal').classList.remove('hidden');
        }}

        function closeProductModal() {{
            document.getElementById('product-modal').classList.add('hidden');
        }}

        function saveProduct(event) {{
            event.preventDefault();
            const id = document.getElementById('form-product-id').value;
            const name = document.getElementById('form-product-name').value;
            const desc = document.getElementById('form-product-desc').value;
            const price = parseFloat(document.getElementById('form-product-price').value);
            const stock = parseInt(document.getElementById('form-product-stock').value);
            const categoryId = parseInt(document.getElementById('form-product-category').value);
            
            const imageUri = uploadedImageBase64 !== "" ? uploadedImageBase64 : document.getElementById('form-product-image').value;
            
            const isEdit = id !== "";
            const url = isEdit ? '/api/admin/edit-product' : '/api/admin/add-product';
            const payload = {{
                name: name,
                description: desc,
                priceUsd: price,
                stock: stock,
                categoryId: categoryId,
                imageUri: imageUri
            }};
            if (isEdit) {{
                payload.productId = parseInt(id);
            }}
            
            fetch(url, {{
                method: 'POST',
                headers: {{ 'Content-Type': 'application/json' }},
                body: JSON.stringify(payload)
            }})
            .then(res => res.json())
            .then(data => {{
                if (data.status === 'success') {{
                    closeProductModal();
                    fetchUpdates();
                }} else {{
                    alert("Error: " + (data.message || "No se pudo guardar el producto."));
                }}
            }})
            .catch(err => {{
                console.error("Error al guardar producto:", err);
                alert("Ocurrió un error al intentar guardar el producto.");
            }});
        }}

        function deleteProduct(productId) {{
            const p = products.find(prod => prod.id === productId);
            if (!p) return;
            if (!confirm(`¿Está seguro de que desea eliminar el producto "${{p.name}}"?`)) return;
            
            fetch('/api/admin/delete-product', {{
                method: 'POST',
                headers: {{ 'Content-Type': 'application/json' }},
                body: JSON.stringify({{ productId: productId }})
            }})
            .then(res => res.json())
            .then(data => {{
                if (data.status === 'success') {{
                    fetchUpdates();
                }} else {{
                    alert("Error al eliminar el producto.");
                }}
            }});
        }}

        function fetchUpdates() {{
            // Buscar pedidos
            const p1 = fetch('/api/orders')
            .then(res => res.json())
            .then(newOrders => {{
                // Detectar nuevos pedidos en cocina (status CONFIRMED o PREPARING)
                let currentPreparingIds = new Set();
                let hasNewKitchenOrder = false;

                newOrders.forEach(o => {{
                    if (o.status === "CONFIRMED" || o.status === "PREPARING") {{
                        currentPreparingIds.add(o.id);
                        if (!knownPreparingOrderIds.has(o.id)) {{
                            hasNewKitchenOrder = true;
                        }}
                    }}
                }});

                if (hasNewKitchenOrder && knownPreparingOrderIds.size > 0) {{
                    playKitchenAlert();
                }}
                knownPreparingOrderIds = currentPreparingIds;

                orders = newOrders;
                renderOrders();
                renderTableStatus();
                renderPaymentReferences();
                if (currentTab === 'ventas') {{
                    renderVentas();
                }}
                document.getElementById('last-update').textContent = "Actualizado: " + new Date().toLocaleTimeString();
            }});

            // Buscar productos
            const p2 = fetch('/api/products')
            .then(res => res.json())
            .then(newProds => {{
                products = newProds;
                renderProducts();
            }});

            // Buscar categorías
            const p3 = fetch('/api/categories')
            .then(res => res.json())
            .then(newCats => {{
                categories = newCats;
                renderCategories();
                updateCategoryDropdowns();
            }});

            // Buscar estados de mesas
            const p4 = fetch('/api/table-states')
            .then(res => res.json())
            .then(states => {{
                tableStates = states || {{}};
            }})
            .catch(e => console.error("Error obteniendo tableStates:", e));

            return Promise.all([p1, p2, p3, p4]);
        }}

        // ==========================================
        // GESTIÓN Y RENDERIZADO DE TICKETS BRUTALES
        // ==========================================
        let currentTicketOrderId = null;

        function updateLiveTicketPreview() {{
            const name = (document.getElementById('cfg-restaurant-name')?.value || "GastroLocal Criollo").trim();
            const slogan = (document.getElementById('cfg-restaurant-slogan')?.value || "").trim();
            const logo = (document.getElementById('cfg-restaurant-logo')?.value || "").trim();
            const rif = (document.getElementById('cfg-restaurant-rif')?.value || "J-00000000-0").trim();
            const address = (document.getElementById('cfg-restaurant-address')?.value || "").trim();
            const phone = (document.getElementById('cfg-restaurant-phone')?.value || "").trim();
            const instagram = (document.getElementById('cfg-restaurant-instagram')?.value || "").trim();
            const footer = (document.getElementById('cfg-ticket-footer')?.value || "¡Gracias por preferirnos!").trim();

            const simName = document.getElementById('sim-name');
            if (simName) simName.textContent = name;
            
            const simSlogan = document.getElementById('sim-slogan');
            if (simSlogan) simSlogan.textContent = slogan;

            const simRif = document.getElementById('sim-rif');
            if (simRif) simRif.textContent = rif;

            const simAddress = document.getElementById('sim-address');
            if (simAddress) simAddress.textContent = address;

            const simPhone = document.getElementById('sim-phone');
            if (simPhone) simPhone.textContent = phone;

            const simInstagram = document.getElementById('sim-instagram');
            if (simInstagram) simInstagram.textContent = instagram;

            const simFooter = document.getElementById('sim-footer');
            if (simFooter) simFooter.innerHTML = footer.split(String.fromCharCode(10)).join('<br>');

            const logoWrapper = document.getElementById('sim-logo-wrapper');
            const simLogo = document.getElementById('sim-logo');
            if (logoWrapper && simLogo) {{
                if (logo) {{
                    simLogo.src = logo;
                    logoWrapper.classList.remove('hidden');
                }} else {{
                    logoWrapper.classList.add('hidden');
                }}
            }}
        }}

        function openAdminTicketModal(orderId) {{
            currentTicketOrderId = orderId;
            const order = orders.find(o => o.id === orderId);
            if (!order) {{
                alert("Pedido no encontrado");
                return;
            }}

            const titleEl = document.getElementById('ticket-modal-title');
            if (titleEl) titleEl.textContent = `Ticket de Pago #${{order.id}}`;

            const wrapper = document.getElementById('admin-ticket-content-wrapper');
            if (!wrapper) return;

            const name = (document.getElementById('cfg-restaurant-name')?.value || "GastroLocal").trim();
            const slogan = (document.getElementById('cfg-restaurant-slogan')?.value || "").trim();
            const logo = (document.getElementById('cfg-restaurant-logo')?.value || "").trim();
            const rif = (document.getElementById('cfg-restaurant-rif')?.value || "").trim();
            const address = (document.getElementById('cfg-restaurant-address')?.value || "").trim();
            const phone = (document.getElementById('cfg-restaurant-phone')?.value || "").trim();
            const instagram = (document.getElementById('cfg-restaurant-instagram')?.value || "").trim();
            const footer = (document.getElementById('cfg-ticket-footer')?.value || "").trim();

            const totalBs = (order.totalUsd * exchangeRate).toFixed(2);
            const isPaid = order.paymentStatus === 'PAID';
            const orderTypeLabel = order.orderType === 'TAKEAWAY' ? '🚚 PARA LLEVAR' : `🍽️ MESA ${{order.tableNumber}}`;

            const itemsRows = order.items.map(it => {{
                const itTotalUsd = (it.priceUsd * it.quantity).toFixed(2);
                const itTotalBs = (it.priceUsd * it.quantity * exchangeRate).toFixed(2);
                return `
                    <tr>
                        <td class="py-1.5 pr-1 font-mono font-bold text-slate-900">${{it.quantity}}x</td>
                        <td class="py-1.5 pr-1">
                            <div class="font-bold text-slate-900 leading-tight">${{it.productName}}</div>
                            <div class="text-[9px] text-slate-500 font-mono">$${{it.priceUsd.toFixed(2)}} c/u</div>
                        </td>
                        <td class="py-1.5 text-right font-mono font-bold whitespace-nowrap">
                            <div>$${{itTotalUsd}}</div>
                            <div class="text-[9px] text-purple-700 font-medium">${{itTotalBs}} Bs</div>
                        </td>
                    </tr>
                `;
            }}).join('');

            const qrData = encodeURIComponent(`${{window.location.origin}}/ticket?id=${{order.id}}`);

            wrapper.innerHTML = `
                <div class="text-center space-y-1">
                    ${{logo ? `<div class="mb-2 flex justify-center"><img src="${{logo}}" alt="Logo" class="max-h-12 max-w-[140px] object-contain rounded-md"></div>` : ''}}
                    <h4 class="text-lg font-black uppercase tracking-tight text-slate-950 leading-tight">${{name}}</h4>
                    ${{slogan ? `<p class="text-[11px] font-semibold text-slate-600 italic">${{slogan}}</p>` : ''}}
                    <div class="text-[10px] text-slate-600 space-y-0.5 pt-1 border-t border-dashed border-slate-200 mt-1">
                        ${{rif ? `<div>RIF: <span class="font-mono font-bold">${{rif}}</span></div>` : ''}}
                        ${{address ? `<div class="leading-tight">${{address}}</div>` : ''}}
                        ${{phone || instagram ? `<div>${{phone ? `Tel: <span>${{phone}}</span>` : ''}} ${{phone && instagram ? '&bull;' : ''}} ${{instagram ? `<span>${{instagram}}</span>` : ''}}</div>` : ''}}
                    </div>
                </div>

                <div class="border-t-2 border-dashed border-slate-800 my-1"></div>

                <div class="space-y-0.5 text-[11px]">
                    <div class="flex justify-between items-center">
                        <span class="font-bold text-slate-500 uppercase text-[9px]">COMPROBANTE DE PAGO</span>
                        <span class="font-mono font-black text-slate-900">#${{String(order.id).padStart(5, '0')}}</span>
                    </div>
                    <div class="flex justify-between text-slate-700">
                        <span>Fecha y Hora:</span>
                        <span class="font-mono">${{order.timestamp || ''}}</span>
                    </div>
                    <div class="flex justify-between text-slate-700">
                        <span>Servicio:</span>
                        <span class="font-bold text-purple-900">${{orderTypeLabel}}</span>
                    </div>
                    <div class="flex justify-between items-center pt-1">
                        <span class="text-slate-600 font-bold">Estado:</span>
                        <span class="px-2 py-0.5 ${{isPaid ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-amber-100 text-amber-900 border-amber-300'}} border rounded-full font-black text-[9px] uppercase">
                            ${{isPaid ? '✓ PAGADO' : '⏳ PENDIENTE'}}
                        </span>
                    </div>
                </div>

                <div class="border-t border-dashed border-slate-300 pt-1.5">
                    <table class="w-full text-left text-[11px]">
                        <thead>
                            <tr class="border-b-2 border-slate-800 font-black text-[10px] uppercase">
                                <th class="pb-1 pr-1">Cant</th>
                                <th class="pb-1 pr-1">Descripción</th>
                                <th class="pb-1 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-dashed divide-slate-200">
                            ${{itemsRows}}
                        </tbody>
                    </table>
                </div>

                <div class="space-y-1 pt-1.5 border-t-2 border-slate-800 font-mono text-[11px]">
                    <div class="flex justify-between text-slate-700">
                        <span>SUBTOTAL USD:</span>
                        <span class="font-bold">$${{order.totalUsd.toFixed(2)}}</span>
                    </div>
                    <div class="flex justify-between text-slate-500 text-[10px]">
                        <span>Tasa Oficial BCV:</span>
                        <span class="font-bold">${{exchangeRate.toFixed(2)}} Bs/$</span>
                    </div>
                    <div class="flex justify-between text-purple-900 font-bold">
                        <span>SUBTOTAL EN BS:</span>
                        <span>${{totalBs}} Bs</span>
                    </div>
                    
                    <div class="p-2.5 bg-slate-950 text-white rounded-xl mt-1 space-y-0.5">
                        <div class="flex justify-between items-center">
                            <span class="text-[10px] font-bold text-slate-300">TOTAL ${{isPaid ? 'PAGADO' : 'A PAGAR'}}:</span>
                            <span class="text-base font-black text-emerald-400">$${{order.totalUsd.toFixed(2)}} USD</span>
                        </div>
                        <div class="flex justify-between items-center border-t border-slate-800 pt-0.5">
                            <span class="text-[9px] font-bold text-slate-400">EN BOLÍVARES:</span>
                            <span class="text-xs font-black text-purple-300">${{totalBs}} Bs</span>
                        </div>
                    </div>
                </div>

                <div class="pt-1.5 border-t border-dashed border-slate-300 text-[11px] space-y-1">
                    <div class="flex justify-between items-center">
                        <span class="text-slate-600 font-bold">Forma de Pago:</span>
                        <span class="font-black text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">${{order.paymentMethod || 'EFECTIVO'}}</span>
                    </div>
                    ${{order.paymentReference ? `<div class="text-[10px] text-purple-900 bg-purple-50 p-1.5 rounded font-mono">Ref / Transacción: #${{order.paymentReference}}</div>` : ''}}
                </div>

                <div class="pt-2 border-t border-dashed border-slate-300 text-center space-y-1">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&margin=2&data=${{qrData}}" alt="QR" class="w-16 h-16 mx-auto border border-slate-900 rounded-lg p-0.5 bg-white">
                    <p class="text-[9px] text-slate-500 font-mono">Escanea para consultar o validar este ticket digital</p>
                </div>

                <div class="pt-1.5 border-t-2 border-slate-800 text-center">
                    <p class="text-[10px] font-bold text-slate-900 italic leading-snug">
                        ${{footer.split(String.fromCharCode(10)).join('<br>')}}
                    </p>
                    <p class="text-[8px] text-slate-400 font-mono mt-1">
                        Comprobante Digital emitido por GastroLocal POS
                    </p>
                </div>
            `;

            document.getElementById('ticket-modal').classList.remove('hidden');
        }}

        function closeTicketModal() {{
            document.getElementById('ticket-modal').classList.add('hidden');
        }}

        function downloadAdminTicketPDF() {{
            const el = document.getElementById('admin-ticket-content-wrapper');
            if (!el) return;
            const opt = {{
                margin: [4, 4, 4, 4],
                filename: `Ticket_GastroLocal_${{currentTicketOrderId || '001'}}.pdf`,
                image: {{ type: 'jpeg', quality: 0.98 }},
                html2canvas: {{ scale: 3, useCORS: true }},
                jsPDF: {{ unit: 'mm', format: [80, 220], orientation: 'portrait' }}
            }};
            html2pdf().set(opt).from(el).save();
        }}

        function printAdminTicket() {{
            if (!currentTicketOrderId) return;
            window.open(`/ticket?id=${{currentTicketOrderId}}`, '_blank');
        }}

        function shareAdminTicketWhatsApp() {{
            if (!currentTicketOrderId) return;
            const order = orders.find(o => o.id === currentTicketOrderId);
            if (!order) return;
            const ticketUrl = `${{window.location.origin}}/ticket?id=${{order.id}}`;
            const restaurantTitle = document.getElementById('cfg-restaurant-name')?.value || 'GastroLocal';
            const msg = `🧾 *¡Hola! Aquí tienes el Comprobante Digital de tu consumo en ${{restaurantTitle}}*:\n\n*Pedido:* #${{order.id}}\n*Total:* $${{order.totalUsd.toFixed(2)}} (${{(order.totalUsd * exchangeRate).toFixed(2)}} Bs)\n\nPuedes ver o descargar tu ticket en PDF haciendo clic aquí:\n${{ticketUrl}}\n\n¡Muchas gracias por su preferencia! ✨`;
            const waUrl = `https://wa.me/?text=${{encodeURIComponent(msg)}}`;
            window.open(waUrl, '_blank');
        }}

        function openTicketInNewTab() {{
            if (!currentTicketOrderId) return;
            window.open(`/ticket?id=${{currentTicketOrderId}}`, '_blank');
        }}

        function downloadLivePreviewPDF() {{
            const el = document.getElementById('live-ticket-preview-container');
            if (!el) return;
            const opt = {{
                margin: [4, 4, 4, 4],
                filename: `Muestra_Ticket_${{(document.getElementById('cfg-restaurant-name')?.value || 'GastroLocal').replace(/\\s+/g, '_')}}.pdf`,
                image: {{ type: 'jpeg', quality: 0.98 }},
                html2canvas: {{ scale: 3, useCORS: true }},
                jsPDF: {{ unit: 'mm', format: [80, 220], orientation: 'portrait' }}
            }};
            html2pdf().set(opt).from(el).save();
        }}

        function printLivePreviewTicket() {{
            const el = document.getElementById('live-ticket-preview-container');
            if (!el) return;
            const printWin = window.open('', '', 'width=450,height=700');
            printWin.document.write(
                '<html><head><title>Ticket Muestra</title>' +
                '<' + 'script src="https://cdn.tailwindcss.com"><' + '/script>' +
                '<style>@page {{ size: 80mm auto; margin: 2mm; }}</style>' +
                '</head><body class="p-3 bg-white text-slate-900" onload="window.print(); window.close();">' +
                el.outerHTML +
                '</body></html>'
            );
            printWin.document.close();
        }}
            // ==========================================
        // GESTIÓN DE MODIFICADORES EN FORMULARIO ADMIN
        // ==========================================
        function addFormModifierRow(name = "", priceUsd = 0.0) {{
            const container = document.getElementById('form-modifiers-container');
            if (!container) return;
            const row = document.createElement('div');
            row.className = "flex items-center gap-2 bg-white p-2 rounded-xl border border-purple-200 shadow-sm modifier-form-row";
            row.innerHTML = `
                <input type="text" placeholder="Nombre (ej: Queso Extra)" value="${{name}}" class="mod-name flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-purple-600">
                <div class="flex items-center gap-1 w-24">
                    <span class="text-xs text-slate-500 font-bold">$</span>
                    <input type="number" step="0.01" min="0" placeholder="0.00" value="${{priceUsd}}" class="mod-price w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono focus:outline-none focus:border-purple-600">
                </div>
                <button type="button" onclick="this.parentElement.remove()" class="text-rose-500 hover:text-rose-700 p-1">
                    <span class="material-icons text-sm">delete</span>
                </button>
            `;
            container.appendChild(row);
        }}

        function getFormModifiers() {{
            const rows = document.querySelectorAll('.modifier-form-row');
            const result = [];
            rows.forEach(r => {{
                const nameInput = r.querySelector('.mod-name');
                const priceInput = r.querySelector('.mod-price');
                if (nameInput && nameInput.value.trim()) {{
                    result.push({{
                        name: nameInput.value.trim(),
                        priceUsd: parseFloat(priceInput.value || 0)
                    }});
                }}
            }});
            return result;
        }}

        // ==========================================
        // ANALÍTICA, GRÁFICOS Y EXPORTACIÓN A EXCEL
        // ==========================================
        function renderReports() {{
            const paidOrders = orders.filter(o => o.paymentStatus === 'PAID');
            const totalUsd = paidOrders.reduce((sum, o) => sum + (o.totalUsd || 0), 0);
            const totalBs = totalUsd * exchangeRate;
            const avgTicket = paidOrders.length > 0 ? (totalUsd / paidOrders.length) : 0;

            document.getElementById('rep-kpi-total-usd').textContent = `$${{totalUsd.toFixed(2)}}`;
            document.getElementById('rep-kpi-total-bs').textContent = `${{totalBs.toFixed(2)}} Bs`;
            document.getElementById('rep-kpi-avg-ticket').textContent = `$${{avgTicket.toFixed(2)}}`;
            document.getElementById('rep-kpi-orders-count').textContent = paidOrders.length;

            // Calcular ventas por producto
            const prodCounts = {{}};
            const prodRevenue = {{}};
            paidOrders.forEach(o => {{
                (o.items || []).forEach(it => {{
                    const name = it.productName || 'Producto';
                    prodCounts[name] = (prodCounts[name] || 0) + it.quantity;
                    prodRevenue[name] = (prodRevenue[name] || 0) + (it.unitTotalUsd || it.priceUsd || 0) * it.quantity;
                }});
            }});

            // Top Producto
            let topName = "Sin ventas aún";
            let topQty = 0;
            for (const name in prodCounts) {{
                if (prodCounts[name] > topQty) {{
                    topQty = prodCounts[name];
                    topName = name;
                }}
            }}
            document.getElementById('rep-kpi-top-product').textContent = topName;
            document.getElementById('rep-kpi-top-qty').textContent = `${{topQty}} unidades vendidas`;

            // Gráfico 1: Ventas por Hora (08:00 a 23:00)
            const hourTotals = new Array(24).fill(0);
            paidOrders.forEach(o => {{
                if (o.timestamp) {{
                    // Extraer hora si es formato "YYYY-MM-DD HH:MM PM" o similar
                    let hour = 12;
                    if (o.timestamp.includes(':')) {{
                        const parts = o.timestamp.split(' ');
                        const timePart = parts[1] || '';
                        let h = parseInt(timePart.split(':')[0] || '12');
                        const isPm = o.timestamp.toUpperCase().includes('PM');
                        const isAm = o.timestamp.toUpperCase().includes('AM');
                        if (isPm && h < 12) h += 12;
                        if (isAm && h === 12) h = 0;
                        hour = Math.min(23, Math.max(0, h));
                    }}
                    hourTotals[hour] += (o.totalUsd || 0);
                }}
            }});

            const relevantHours = [8, 10, 12, 14, 16, 18, 20, 22];
            const maxHourVal = Math.max(...hourTotals.slice(8, 23), 10);
            const chartHourly = document.getElementById('chart-hourly-sales');
            chartHourly.innerHTML = "";

            for (let h = 8; h <= 22; h++) {{
                const val = hourTotals[h];
                const pct = Math.min(100, Math.max(8, (val / maxHourVal) * 100));
                const bar = document.createElement('div');
                bar.className = "flex-1 flex flex-col items-center gap-1 group relative h-full justify-end";
                bar.innerHTML = `
                    <div class="text-[9px] font-mono text-purple-700 font-bold opacity-0 group-hover:opacity-100 transition absolute -top-5">$${{val.toFixed(0)}}</div>
                    <div class="w-full bg-gradient-to-t from-purple-700 to-indigo-500 rounded-t-lg transition-all duration-500 hover:brightness-110 shadow-sm" style="height: ${{pct}}%;"></div>
                    <span class="text-[9px] text-slate-400 font-mono">${{h}}h</span>
                `;
                chartHourly.appendChild(bar);
            }}

            // Gráfico 2: Top 5 Platos
            const sortedProds = Object.keys(prodCounts).sort((a, b) => prodCounts[b] - prodCounts[a]).slice(0, 5);
            const topProductsCont = document.getElementById('chart-top-products');
            topProductsCont.innerHTML = "";

            if (sortedProds.length === 0) {{
                topProductsCont.innerHTML = '<div class="text-center py-6 text-slate-400 text-xs">No hay ventas registradas aún.</div>';
            }} else {{
                const maxProdQty = prodCounts[sortedProds[0]] || 1;
                sortedProds.forEach(name => {{
                    const qty = prodCounts[name];
                    const rev = prodRevenue[name] || 0;
                    const pct = Math.min(100, Math.max(15, (qty / maxProdQty) * 100));
                    const row = document.createElement('div');
                    row.className = "space-y-1";
                    row.innerHTML = `
                        <div class="flex justify-between text-xs">
                            <span class="font-bold text-slate-800">${{name}}</span>
                            <span class="font-mono text-slate-600 font-bold">${{qty}} uds • <strong class="text-purple-700">$${{rev.toFixed(2)}}</strong></span>
                        </div>
                        <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div class="bg-gradient-to-r from-purple-600 to-indigo-500 h-full rounded-full transition-all duration-500" style="width: ${{pct}}%;"></div>
                        </div>
                    `;
                    topProductsCont.appendChild(row);
                }});
            }}

            // Desglose Métodos de Pago
            const methodTotals = {{ "Efectivo $": 0, "Pago Móvil": 0, "Punto": 0, "Zelle": 0, "Efectivo Bs": 0, "Otros": 0 }};
            paidOrders.forEach(o => {{
                const m = (o.paymentMethod || '').toUpperCase();
                const t = o.totalUsd || 0;
                if (m.includes('PAGO')) methodTotals["Pago Móvil"] += t;
                else if (m.includes('PUNTO')) methodTotals["Punto"] += t;
                else if (m.includes('ZELLE')) methodTotals["Zelle"] += t;
                else if (m.includes('BS')) methodTotals["Efectivo Bs"] += t;
                else if (m.includes('EFECTIVO') || m.includes('USD')) methodTotals["Efectivo $"] += t;
                else methodTotals["Otros"] += t;
            }});

            const methodContainer = document.getElementById('chart-payment-methods');
            methodContainer.innerHTML = Object.entries(methodTotals).map(([method, amt]) => `
                <div class="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center space-y-0.5">
                    <span class="text-[10px] text-slate-500 font-bold block truncate uppercase">${{method}}</span>
                    <span class="text-sm font-black text-slate-900 font-mono block">$${{amt.toFixed(2)}}</span>
                    <span class="text-[10px] text-purple-700 font-bold font-mono block">${{(amt * exchangeRate).toFixed(2)}} Bs</span>
                </div>
            `).join("");
        }}

        // ==========================================
        // EXPORTACIÓN DE DATOS A EXCEL (.CSV UTF-8 BOM)
        // ==========================================
        function exportSalesToExcelCSV() {{
            if (orders.length === 0) {{
                alert("No hay ventas para exportar.");
                return;
            }}

            let csv = "\uFEFF"; // UTF-8 Byte Order Mark para compatibilidad perfecta con Microsoft Excel
            csv += `ID Pedido;Fecha y Hora;Mesa;Mozo;Productos y Extras;Metodo de Pago;Estado Pago;Total USD;Total Bs\n`;

            orders.forEach(o => {{
                const id = o.id || "";
                const fecha = (o.timestamp || "").replace(/;/g, ',');
                const mesa = (o.tableNumber || "").replace(/;/g, ',');
                const mozo = (o.waiterName || "N/A").replace(/;/g, ',');
                
                const itemsStr = (o.items || []).map(it => {{
                    let text = `${{it.quantity}}x ${{it.productName}}`;
                    if (it.selectedModifiers && it.selectedModifiers.length > 0) {{
                        text += " (" + it.selectedModifiers.map(m => m.name).join(', ') + ")";
                    }}
                    return text;
                }}).join(" + ").replace(/;/g, ',');

                const metodo = (o.paymentMethod || "").replace(/;/g, ',');
                const estado = o.paymentStatus === 'PAID' ? 'PAGADO' : 'PENDIENTE';
                const totalUsd = (o.totalUsd || 0).toFixed(2);
                const totalBs = ((o.totalUsd || 0) * exchangeRate).toFixed(2);

                csv += `${{id}};${{fecha}};${{mesa}};${{mozo}};"${{itemsStr}}";${{metodo}};${{estado}};${{totalUsd}};${{totalBs}}\n`;
            }});

            const blob = new Blob([csv], {{ type: 'text/csv;charset=utf-8;' }});
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `Ventas_GastroLocal_${{new Date().toISOString().slice(0,10)}}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }}

        function exportInventoryToExcelCSV() {{
            if (products.length === 0) {{
                alert("No hay productos en inventario para exportar.");
                return;
            }}

            let csv = "\uFEFF";
            csv += `ID;Nombre Producto;Categoria;Estacion;Precio USD;Precio Bs;Stock Actual;Modificadores / Extras;Estado\n`;

            products.forEach(p => {{
                const id = p.id;
                const name = (p.name || "").replace(/;/g, ',');
                const cat = categories.find(c => c.id === p.categoryId);
                const catName = cat ? cat.name.replace(/;/g, ',') : "General";
                const station = cat ? (cat.station || "kitchen").toUpperCase() : "KITCHEN";
                const priceUsd = (p.priceUsd || 0).toFixed(2);
                const priceBs = ((p.priceUsd || 0) * exchangeRate).toFixed(2);
                const stock = p.stock || 0;
                
                const modsStr = (p.modifiers || []).map(m => `${{m.name}} (+$${{m.priceUsd}})`).join(', ').replace(/;/g, ',');
                const estado = p.isAvailable ? "DISPONIBLE" : "NO DISPONIBLE";

                csv += `${{id}};"${{name}}";${{catName}};${{station}};${{priceUsd}};${{priceBs}};${{stock}};"${{modsStr}}";${{estado}}\n`;
            }});

            const blob = new Blob([csv], {{ type: 'text/csv;charset=utf-8;' }});
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `Inventario_GastroLocal_${{new Date().toISOString().slice(0,10)}}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }}
    </script>
</body>
</html>
"""

def perform_backup_on_shutdown():
    import shutil
    import glob
    import string
    from datetime import datetime
    
    print("\n" + "="*65)
    print("      INICIANDO COPIA DE SEGURIDAD AUTOMÁTICA GASTROLOCAL 💾")
    print("="*65)
    
    # 1. Definir los destinos posibles (Pendrives en Windows / Linux / macOS)
    backup_destinations = []
    
    # En Windows, buscar letras de unidad desde D: hasta Z:
    if os.name == 'nt':
        for letter in string.ascii_uppercase:
            if letter in ['C', 'A', 'B']:
                continue
            drive_path = f"{letter}:\\"
            try:
                # Intentamos crear la carpeta directamente para forzar el montaje de la unidad
                target_dir = os.path.join(drive_path, "gastro_backups")
                os.makedirs(target_dir, exist_ok=True)
                backup_destinations.append(target_dir)
            except Exception:
                pass
    else:
        # En Linux/macOS, buscar en /media, /mnt, /Volumes
        for parent in ["/media", "/mnt", "/Volumes"]:
            if os.path.exists(parent):
                try:
                    for item in os.listdir(parent):
                        full_path = os.path.join(parent, item)
                        if os.path.isdir(full_path):
                            target_dir = os.path.join(full_path, "gastro_backups")
                            os.makedirs(target_dir, exist_ok=True)
                            backup_destinations.append(target_dir)
                except Exception:
                    pass

    # Siempre tener una carpeta local "respaldos_locales" como fallback
    local_backup_dir = os.path.join(os.getcwd(), "respaldos_locales")
    try:
        os.makedirs(local_backup_dir, exist_ok=True)
        backup_destinations.append(local_backup_dir)
    except Exception as e:
        print(f"  No se pudo crear el directorio de respaldos locales: {e}")

    # 2. Copiar base de datos actual a todos los destinos detectados
    if not os.path.exists(DB_FILE):
        print(f"❌ Archivo de base de datos {DB_FILE} no encontrado. No hay nada que respaldar.")
        return []

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"gastro_db_respaldo_{timestamp}.json"
    
    saved_paths = []
    for dest in backup_destinations:
        try:
            dest_file = os.path.join(dest, backup_filename)
            shutil.copy2(DB_FILE, dest_file)
            saved_paths.append(dest)
            
            # Limpiar para mantener solo los últimos 15 respaldos en esta carpeta
            backups = glob.glob(os.path.join(dest, "gastro_db_respaldo_*.json"))
            # Ordenar por fecha de modificación (los más antiguos primero)
            backups.sort(key=os.path.getmtime)
            while len(backups) > 15:
                oldest = backups.pop(0)
                try:
                    os.remove(oldest)
                    print(f"  [Rotación] Respaldo antiguo eliminado en {os.path.basename(dest)}: {os.path.basename(oldest)}")
                except Exception as e:
                    print(f"  No se pudo eliminar el respaldo antiguo {oldest}: {e}")
        except Exception as e:
            print(f"  No se pudo escribir en el destino {dest}: {e}")
            
    if saved_paths:
        print(f"✅ ¡Copia de seguridad realizada exitosamente! Guardada en:")
        for p in saved_paths:
            print(f"   - {p}")
    else:
        print("❌ No se pudo realizar la copia de seguridad en ningún destino.")
    print("="*65 + "\n")
    return saved_paths

if __name__ == '__main__':
    try:
        # Registrar respaldo automático al apagar el servidor
        import atexit
        atexit.register(perform_backup_on_shutdown)
        
        # Cargar base de datos local
        load_db()
        
        local_ip = get_ip_address()
        
        print("=" * 65)
        print("      GASTROLOCAL - SERVIDOR DE ESCRITORIO PARA TU PC 🚀")
        print("=" * 65)
        print("  ¡Felicidades! Tu servidor GastroLocal está corriendo perfectamente.")
        print("  No necesitas emuladores ni teléfonos de prueba en esta computadora.")
        print("  Funciona de forma completamente local usando tu red Wi-Fi.")
        print("-" * 65)
        print(f"  👉 PANEL DE ADMINISTRACIÓN (En esta PC):")
        print(f"     http://localhost:{PORT}/admin")
        print("-" * 65)
        print(f"  👉 MENÚ DIGITAL PARA CLIENTES (Para tablets y teléfonos):")
        print(f"     Abra este enlace en los dispositivos conectados a tu Wi-Fi:")
        print(f"     http://{local_ip}:{PORT}/")
        print("=" * 65)
        print("Presione Ctrl+C en cualquier momento para detener el servidor.\n")
        
        # Intentar iniciar el servidor HTTP
        try:
            server = GastroServer(('0.0.0.0', PORT), GastroRequestHandler)
        except OSError as e:
            if getattr(e, 'errno', None) in [98, 48] or getattr(e, 'winerror', None) == 10048:
                err_msg = (
                    f"El puerto {PORT} ya está ocupado por otra instancia de GastroLocal o por otro programa.\n\n"
                    f"Solución:\n"
                    f"1. Cierre cualquier ventana o proceso previo de GastroLocal (o use el Administrador de Tareas).\n"
                    f"2. O ejecute 'apagar_sistema.bat' para liberar el puerto."
                )
                show_native_error("GastroLocal - Puerto Ocupado", err_msg)
                sys.exit(1)
            else:
                raise
        
        # Abrir el panel de administración automáticamente en el navegador predeterminado de la PC
        import webbrowser
        import threading
        import time
        
        def abrir_navegador_auto():
            time.sleep(0.8)
            url = f"http://localhost:{PORT}/admin"
            if os.name == 'nt':
                try:
                    os.startfile(url)
                    return
                except Exception:
                    pass
            try:
                webbrowser.open(url)
            except Exception:
                pass
                
        threading.Thread(target=abrir_navegador_auto, daemon=True).start()
        
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nDeteniendo servidor GastroLocal... ¡Hasta luego!")
            server.server_close()

    except Exception as e:
        err_detail = traceback.format_exc()
        show_native_error(
            "Error al iniciar GastroLocal", 
            f"Ocurrió un error inesperado al iniciar el servidor:\n\n{str(e)}\n\nConsulte gastro_error.log para más detalles."
        )
        try:
            with open(os.path.join(APP_DIR, "gastro_error.log"), "a", encoding="utf-8") as f:
                f.write(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] CRASH FATAL:\n{err_detail}\n")
        except Exception:
            pass
        sys.exit(1)
