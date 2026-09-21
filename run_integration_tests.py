import sys
import os
import json
import time
import threading
import urllib.request
import urllib.parse

import gastro_local_pc_server as server_module

# Run server on test port 8999
PORT = 8999
server_module.PORT = PORT

server = server_module.GastroServer(('127.0.0.1', PORT), server_module.GastroRequestHandler)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
time.sleep(0.5)

base_url = f"http://127.0.0.1:{PORT}"

def get_req(path, headers=None):
    req = urllib.request.Request(f"{base_url}{path}", headers=headers or {})
    with urllib.request.urlopen(req) as resp:
        return resp.getcode(), json.loads(resp.read().decode('utf-8'))

def post_req(path, data, headers=None):
    req_headers = {"Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)
    req = urllib.request.Request(f"{base_url}{path}", data=json.dumps(data).encode('utf-8'), headers=req_headers)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.getcode(), json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode('utf-8')) if e.headers.get_content_type() == 'application/json' else (e.code, str(e))

passed = 0
failed = 0

def test(name, condition):
    global passed, failed
    if condition:
        print(f"  [PASS] {name}")
        passed += 1
    else:
        print(f"  [FAIL] {name}")
        failed += 1

print("--- INICIANDO BATERIA DE PRUEBAS DE INTEGRACION GASTROLOCAL ---")

# 1. Test Config
code, config = get_req("/api/config")
test("GET /api/config responde 200 con config", code == 200 and "exchangeRateBs" in config)

# 2. Test Products & Categories
code, prods = get_req("/api/products")
test("GET /api/products responde 200 con catalogo", code == 200 and len(prods) > 0)

code, cats = get_req("/api/categories")
test("GET /api/categories responde 200 con categorias", code == 200 and len(cats) > 0)

# 3. Test Verify PIN
code, res = post_req("/api/verify-pin", {"pin": "9999"})
test("POST /api/verify-pin con PIN incorrecto falla", res.get("status") == "error")

code, res = post_req("/api/verify-pin", {"pin": "1234"})
admin_token = res.get("token")
test("POST /api/verify-pin con PIN 1234 genera token admin", res.get("status") == "success" and bool(admin_token))

# 4. Test Token Protection on Admin Routes
code, res = post_req("/api/admin/update-exchange-rate", {"exchangeRateBs": 60.0})
test("Ruta admin sin token rechaza con 401", code == 401)

code, res = post_req("/api/admin/update-exchange-rate", {"exchangeRateBs": 60.0}, headers={"X-Admin-Token": admin_token})
test("Ruta admin con token valido actualiza tasa", code == 200 and res.get("status") == "success")

# 5. Test Creating an Order
initial_stock = prods[0]["stock"]
order_data = {
    "tableNumber": "Mesa 1",
    "items": [{"productId": prods[0]["id"], "quantity": 2, "priceUsd": prods[0]["priceUsd"]}],
    "orderType": "DINE_IN",
    "paymentMethod": "CASH_USD",
    "notes": "Prueba de integracion"
}
code, res = post_req("/api/order", order_data)
order_id = res.get("orderId") if isinstance(res, dict) else None
test("POST /api/order crea pedido exitosamente", code == 200 and order_id is not None)

# Check stock deduction
code, prods_after = get_req("/api/products")
stock_after = next(p["stock"] for p in prods_after if p["id"] == prods[0]["id"])
test("Descuento de inventario atomico verificado", stock_after == initial_stock - 2)

# 6. Test Kitchen Status Updates
code, res = post_req("/api/admin/update-order-status", {"orderId": order_id, "status": "PREPARING"})
test("KDS actualiza comanda a PREPARING", code == 200 and res.get("status") == "success")

code, res = post_req("/api/admin/update-order-status", {"orderId": order_id, "status": "READY"})
test("KDS actualiza comanda a READY", code == 200 and res.get("status") == "success")

# 7. Test Admin Collect Payment
code, res = post_req("/api/admin/collect-payment", {"orderId": order_id, "paymentMethod": "CASH_USD"}, headers={"X-Admin-Token": admin_token})
test("Admin cobra comanda con exito", code == 200 and res.get("status") == "success")

# 8. Restore Exchange Rate
post_req("/api/admin/update-exchange-rate", {"exchangeRateBs": 55.0}, headers={"X-Admin-Token": admin_token})

print("-" * 65)
print(f"TOTAL PRUEBAS: {passed + failed} | EXITOSAS: {passed} | FALLIDAS: {failed}")
if failed == 0:
    print("TODAS LAS PRUEBAS DE INTEGRACION SUPERADAS AL 100%")
    sys.exit(0)
else:
    print("FALLO EN AL MENOS UNA PRUEBA")
    sys.exit(1)
