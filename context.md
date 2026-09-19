# 📜 CONTEXTO ARQUITECTÓNICO Y GUÍA DE DESARROLLO - GASTROLOCAL

> ⚠️ **REGLA DE ORO OBLIGATORIA PARA CUALQUIER IA O DESARROLLADOR:**
> 1. **LEER ESTE ARCHIVO PRIMERO** antes de inspeccionar, modificar o refactorizar cualquier parte del código.
> 2. **PROHIBIDO ELIMINAR O DEGRADAR** los mecanismos de seguridad, concurrencia, bloqueo de hilos (`DB_LOCK`), escritura atómica en disco y autenticación por tokens implementados en el sistema.
> 3. **ACTUALIZAR ESTE ARCHIVO** obligatoriamente al finalizar cualquier modificación arquitectónica, adición de endpoints o cambio de flujo de negocio.

---

## 🎯 1. Visión General del Proyecto

**GastroLocal** es una plataforma integral de gestión gastronómica y punto de venta (POS/TPV) diseñada para operar de forma 100% autónoma en redes locales (LAN/Wi-Fi), con o sin acceso a Internet.

### Componentes Principales:
1. **Servidor de Escritorio PC (`gastro_local_pc_server.py`)**:
   - Servidor HTTP multi-hilo en Python estándar (sin dependencias externas pesadas).
   - Base de datos local persistente en formato JSON (`data.json`).
   - Distribución de interfaces Web responsivas en tiempo real:
     - **Menú Digital Cliente** (`/`): Autoservicio para tablets y smartphones vía Wi-Fi.
     - **Panel de Administración y Caja POS** (`/admin`): Gestión de comandas, cobros, inventario, mesas y cierre de caja.
     - **Pantalla de Cocina KDS** (`/kitchen`): Visualización de comandas en tiempo real con timbres acústicos sintetizados por Web Audio API.
     - **Comprobantes Térmicos** (`/ticket`): Generación de tickets de comanda y recibos para clientes.
2. **Aplicación Móvil Android Nativa (`app/`)**:
   - Desarrollada en Kotlin con **Jetpack Compose**.
   - Base de datos SQLite local mediante **Room**.
   - Servidor web interno embebido (`LocalWebServer.kt`) para operación autónoma en dispositivos portátiles.
3. **Módulo de Licenciamiento y Recuperación (`gastro_license_generator.py`)**:
   - Sistema de activación mensual offline con algoritmo SHA-256 + Salt y protección anti-retroceso de reloj.

---

## 🛡️ 2. Pilares Arquitectónicos Inviolables (No Negociables)

Cualquier cambio propuesto por una IA o desarrollador DEBE respetar estrictamente estos 4 pilares:

### Pilar I: Escritura Atómica en Disco (`Atomic Persistence`)
* **Regla**: `save_db(data)` **NUNCA** debe abrir directamente `data.json` con `open("data.json", "w")`.
* **Razón**: Si la computadora sufre un corte de energía o fallo repentino durante la escritura, el archivo `data.json` se corrompería y quedaría en 0 bytes.
* **Mecanismo Obligatorio**:
  1. Escribir en un archivo temporal único: `data.json.tmp_<pid>_<timestamp>`.
  2. Forzar el vaciado de buffers al disco con `f.flush()` y `os.fsync(f.fileno())`.
  3. Reemplazar el archivo de forma atómica con `os.replace(tmp_file, DB_FILE)`.

### Pilar II: Bloqueo de Hilos Reentrante (`threading.RLock`) y Transacciones ACID
* **Regla**: Todo ciclo de **lectura $ightarrow$ validación $ightarrow$ modificación $ightarrow$ guardado** de base de datos DEBE ejecutarse dentro del cerrojo `with DB_LOCK:`.
* **Razón**: El servidor HTTP es multi-hilo (`ThreadingHTTPServer`). Si 10 clientes envían pedidos simultáneos en el mismo milisegundo, la falta de bloqueo causará inconsistencias y pérdida de stock (*Race Conditions*).
* **Mecanismo Obligatorio**: Mantener el cerrojo global `DB_LOCK` activo en `do_POST`, `load_db` y `save_db`.

### Pilar III: Seguridad y Autenticación por Token en Backend (`X-Admin-Token` / `Bearer`)
* **Regla**: Las rutas administrativas (`/api/admin/*`) **NUNCA** deben quedar abiertas o depender únicamente de una validación visual en JavaScript.
* **Razón**: Cualquier cliente en la red Wi-Fi con conocimientos técnicos podría enviar peticiones POST directas para alterar precios, borrar productos o cerrar la caja.
* **Mecanismo Obligatorio**:
  1. El backend valida la existencia de un token de sesión activo mediante `is_authorized_admin()`.
  2. El token se genera al validar el PIN en `/api/verify-pin` y se almacena en `ACTIVE_ADMIN_SESSIONS`.
  3. El frontend de `/admin` usa un interceptor en `window.fetch` para inyectar automáticamente `X-Admin-Token` en cada llamada.
  4. Excepción controlada: La pantalla de cocina (`/kitchen`) tiene autorización para cambiar estados a `PREPARING` y `READY` sin exigir token de administrador.

### Pilar IV: Conciliación Multimoneda y Cierre de Caja (Reporte Z)
* **Regla**: El sistema opera de forma nativa con **Doble Moneda (USD y Bolívares)**.
* **Razón**: Adaptación al mercado venezolano y multimoneda.
* **Mecanismo Obligatorio**:
  1. Los precios base se guardan en USD (`priceUsd`).
  2. La tasa de cambio (`exchangeRateBs`) se aplica dinámicamente para calcular los importes en Bs.
  3. El Cierre de Caja (`/api/admin/close-cash-register`) debe discriminar los totales por método de pago (`CASH_USD`, `CASH_BS`, `PAGO_MOVIL`, `PUNTO`, `ZELLE`, `OTROS`) y archivar las órdenes cobradas.

---

## 📁 3. Mapa de Archivos del Proyecto

```plaintext
restaurante-local/
│
├── context.md                     # [ESTE ARCHIVO] Especificación arquitectónica y reglas obligatorias
├── gastro_local_pc_server.py      # Servidor HTTP principal en Python (Core del sistema PC)
├── data.json                      # Base de datos JSON (Productos, Categorías, Pedidos, Config)
├── gastro_license_generator.py    # Generador offline de licencias mensuales por terminal
├── diagnostico_lanzador.py        # Script de comprobación de puertos, red y permisos
│
├── iniciar_sistema.bat            # Lanzador en consola visible
├── iniciar_invisible.vbs          # Lanzador silencioso en segundo plano
├── apagar_sistema.bat             # Detención segura del servidor con respaldo previo
├── compilar_todo_a_instalador.bat # Compilador PyInstaller + Inno Setup (.exe)
├── setup_gastrolocal.iss          # Script de instalación para Inno Setup
│
├── respaldos_locales/             # Almacén de copias de seguridad locales (Rotación: máx. 15)
│
└── app/                           # Código fuente de la App Móvil Android (Kotlin / Compose)
    ├── src/main/java/com/example/
    │   ├── data/                  # Room Database, Daos y Entidades (Product, Order, Category)
    │   ├── network/               # LocalWebServer.kt (Servidor web Android embebido)
    │   └── ui/                    # Views (AdminView, KitchenView, ClientView, AuthView)
    └── build.gradle.kts           # Configuración Gradle de la app Android
```

---

## 📡 4. Especificación de Endpoints de la API

| Método | Ruta | Acceso Requerido | Descripción |
| :--- | :--- | :---: | :--- |
| `GET` | `/` | Público | Menú Digital autoservicio para clientes. |
| `GET` | `/admin` | PIN / Token | Panel interactivo de administración y caja POS. |
| `GET` | `/kitchen` | Pantalla Cocina | KDS para visualización de comandas con Pacing, cronómetros y estaciones (Cocina/Bar). |
| `GET` | `/waiter` | Mozo / Salón | Módulo Web Móvil para camareros con toma ágil y alerta acústica de plato listo. |
| `GET` | `/ticket?id={id}` | Público / Caja | Comprobante térmico imprimible en PDF o papel con modificadores y mozo. |
| `GET` | `/api/config` | Público | Obtener configuración comercial y tasa de cambio. |
| `GET` | `/api/products` | Público | Catálogo de productos disponibles. |
| `GET` | `/api/categories` | Público | Lista de categorías de menú. |
| `GET` | `/api/orders` | Público / KDS | Lista de comandas activas para actualización en vivo. |
| `GET` | `/api/table-states` | Público / Mozo | Estado y ocupación de mesas. |
| `POST` | `/api/order` | Público | Crear comanda y descontar stock automáticamente. |
| `POST` | `/api/client/table-call` | Cliente | Notificar llamado de mozo o solicitud de cuenta. |
| `POST` | `/api/client/submit-payment-ref`| Cliente | Enviar número de referencia de Pago Móvil. |
| `POST` | `/api/verify-pin` | Público | Validar PIN administrativo y obtener token de sesión. |
| `POST` | `/api/license/activate` | Público | Activar licencia mensual offline con código SHA-256. |
| `POST` | `/api/admin/update-order-status`| Cocina / Admin | Cambiar estado de orden (`PREPARING`, `READY`, `DELIVERED`, `CANCELLED`). |
| `POST` | `/api/admin/collect-payment` | **Token Admin** | Cobrar pedido (Efectivo, Pago Móvil, Punto, Mixto) y liberar mesa. |
| `POST` | `/api/admin/verify-payment-ref` | **Token Admin** | Aprobar (`APPROVE`) o Rechazar (`REJECT`) Pago Móvil. |
| `POST` | `/api/admin/update-exchange-rate`| **Token Admin** | Actualizar la tasa oficial de cambio (Bs/$). |
| `POST` | `/api/admin/update-stock` | **Token Admin** | Modificar inventario/stock de un producto. |
| `POST` | `/api/admin/add-product` | **Token Admin** | Registrar un nuevo producto en el catálogo. |
| `POST` | `/api/admin/edit-product` | **Token Admin** | Editar nombre, precio, stock o categoría de un producto. |
| `POST` | `/api/admin/delete-product` | **Token Admin** | Eliminar un producto del catálogo. |
| `POST` | `/api/admin/add-category` | **Token Admin** | Crear una nueva categoría de menú. |
| `POST` | `/api/admin/edit-category` | **Token Admin** | Modificar nombre o ícono de categoría. |
| `POST` | `/api/admin/delete-category` | **Token Admin** | Eliminar categoría reasignando productos a la principal. |
| `POST` | `/api/admin/transfer-table` | **Token Admin** | Transferir pedido activo de una mesa a otra. |
| `POST` | `/api/admin/merge-tables` | **Token Admin** | Fusionar dos mesas unificando cuentas. |
| `POST` | `/api/admin/clear-table-call` | **Token Admin** | Despejar notificación de mozo en una mesa. |
| `POST` | `/api/admin/close-cash-register`| **Token Admin** | Generar vista previa o confirmar Reporte Z de cierre de turno. |
| `POST` | `/api/admin/update-pin` | **Token Admin** | Cambiar el PIN de acceso administrativo. |
| `POST` | `/api/admin/update-business-config`| **Token Admin** | Actualizar nombre, RIF, teléfono y datos de Pago Móvil. |
| `POST` | `/api/admin/run-backup` | **Token Admin** | Forzar copia de seguridad inmediata en disco y USB. |

---

## 🧪 5. Protocolo Obligatorio de Verificación

Antes de dar por concluida cualquier modificación en el código, se DEBE ejecutar la batería completa de pruebas:

```bash
python scratch/test_suite_gastro.py
```

### Criterio de Aceptación:
- **100% de pruebas pasadas (42 / 42)** con 0 fallos.
- Comprobación de que la prueba de concurrencia masiva (10 hilos simultáneos) descuente el stock con precisión atómica.
- Comprobación de que las rutas `/api/admin/*` rechacen peticiones sin token con código `401 Unauthorized`.

---

## 📝 6. Historial de Cambios Arquitectónicos (Changelog)

| Fecha | Autor / Asistente | Descripción de la Modificación |
| :--- | :--- | :--- |
| **2026-08-30** | Antigravity AI | Creación inicial de la arquitectura híbrida PC Server + Android App con KDS, TPV y Menú Digital. |
| **2026-08-31** | Antigravity AI | Ejecución de la primera batería de 38 pruebas integrales de negocio (Pedidos, Inventario, Pagos, Licencia). |
| **2026-09-01** | Antigravity AI | **Endurecimiento para Producción**: Implementación de Escritura Atómica (`os.replace`), Bloqueo Reentrante (`DB_LOCK`), Autenticación por Token en Backend (`X-Admin-Token`) e Interceptor en Frontend. 42/42 pruebas superadas. |
| **2026-09-01** | Antigravity AI | Creación del documento normativo `context.md` para blindar la arquitectura ante futuras IAs. |
| **2026-09-01** | Antigravity AI | **Mejora UX Cliente**: Visor interactivo y zoom ampliado de fotos de platos con Lightbox modal, detalles, precios y botón de agregar directo. |
| **2026-09-01** | Antigravity AI | **Lanzamiento Módulos Comerciales Pro**: (1) Modificadores y Extras en Platos con cálculo compuesto, (2) KDS Cocina Avanzado con Cronómetros Semáforo, Estaciones Cocina/Bar y Deshacer, (3) Módulo Web Móvil de Mozo (`/waiter`) con alerta acústica de plato listo, y (4) Dashboard de Reportes & Gráficos SVG con Exportación a Excel (.csv con UTF-8 BOM). 25/25 pruebas V2 y 42/42 pruebas base superadas con 0 fallos. |
