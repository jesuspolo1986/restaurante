# ELENA PRO - Arquitectura del Sistema, Estructura y Manual Operativo

> ⚠️ **REGLA OBLIGATORIA DE ACTUALIZACIÓN CONTINUA:**
> **Cada vez que se realice cualquier modificación, corrección o nueva funcionalidad en el código fuente (Frontend, Backend, Base de Datos, Respaldos, Scripts o Despliegues), es ESTRICTAMENTE OBLIGATORIO actualizar este archivo (`context.md` / `contexto.md`) documentando el cambio realizado, los componentes afectados y el estado arquitectónico actual del proyecto.**

---

## 1. Visión General del Sistema

**Elena PRO** es una solución integral de punto de venta (POS), facturación, inventario multirrubro (Farmacias, Ferreterías, Supermercados, Ropa y Calzado, y Comercio General), cuentas por cobrar/pagar, control de caja chica, notas de crédito/devoluciones, sincronización multi-sucursal y respaldos en la nube.

### Tecnologías Principales:
* **Frontend:** React 18, TypeScript, Tailwind CSS, Lucide Icons, Motion (Framer Motion).
* **Backend:** Node.js, Express, ESBuild / TSX, CJS Bundler.
* **Motor de Datos de Alto Rendimiento:** Arquitectura In-Memory RAM con persistencia asíncrona en disco (FIFO Mutex) que elimina la latencia de I/O en disco (respuestas < 1 ms).
* **Persistencia Multi-Tenant:** Base de datos JSON modular y aislada por empresa (`data/db_<empresa_id>.json`) y motor opcional sincronizable con **MariaDB / MySQL**.
* **Respaldos & Nube Híbridos:** Integración nativa con **Supabase Storage**, copias locales rotadas y herramienta de carga/restauración de archivos `.json` desde PC/USB.
* **Disponibilidad 24/7 en Render:** Endpoint de latencia ultrabaja `/api/health` con monitoreo activo (UptimeRobot / Cron-Job) para evitar el modo de suspensión (*Cold Start*).
* **Instalador & Despliegue:** **Inno Setup 6.x** compilado para Windows 10/11 con inicio silencioso (VBScript).

---

## 2. Estructura de Directorios Clave

```text
elena-ai/
├── dist/                          # Archivos de producción generados tras "npm run build"
│   ├── assets/                    # Bundles optimizados de CSS y JS
│   ├── index.html                 # Punto de entrada de la UI
│   └── server.cjs                 # Servidor backend empaquetado en CommonJS
├── data/                          # Directorio de bases de datos locales
│   ├── companies.json             # Registro maestro de empresas clientes
│   ├── db_default.json            # Base de datos de la empresa principal
│   ├── superadmin.json            # Credenciales seguras del Super Administrador
│   └── *.db / *.json              # Bases de datos aisladas por empresa
├── src/                           # Código fuente del Frontend React
│   ├── components/                # Componentes modulares del sistema
│   │   ├── POS.tsx                # Módulo de Punto de Venta, facturación y pagos
│   │   ├── Inventario.tsx         # Gestión de inventario, departamentos y Kardex
│   │   ├── Compras.tsx            # Recepción de mercancía de proveedores
│   │   ├── Proveedores.tsx        # Cuentas por pagar y catálogo de proveedores
│   │   ├── Creditos.tsx           # Cuentas por cobrar y deudores
│   │   ├── CierreCaja.tsx         # Reportes X / Z y cuadre de caja
│   │   ├── ModalCajaChica.tsx     # Egresos y gastos menores de caja
│   │   ├── ModalDevoluciones.tsx  # Notas de crédito y garantías
│   │   ├── ModalCotizaciones.tsx  # Presupuestos para clientes
│   │   ├── ModalKardex.tsx        # Trazabilidad y auditoría de stock
│   │   ├── Respaldos.tsx          # Panel de respaldos locales, USB y nube
│   │   ├── SupabaseBackupPanel.tsx# Panel de respaldos y restauración en Supabase
│   │   ├── SuperAdminPanel.tsx    # Panel maestro para crear empresas y licencias
│   │   ├── Usuarios.tsx           # Control de roles y permisos por módulo para cajeros
│   │   └── ModalRedConexion.tsx   # Códigos QR y conexión en red para celulares
│   ├── types.ts                   # Definición de interfaces TypeScript
│   ├── App.tsx                    # Enrutador principal y barra de navegación
│   └── main.tsx                   # Entrada de React
├── server.ts                      # Servidor backend Express completo (~5000 líneas)
├── db_memory_manager.ts           # Motor en RAM de alto rendimiento con Mutex FIFO
├── supabase_backup_service.ts     # Servicio de sincronización y storage con Supabase
├── Iniciar_Silencioso.vbs         # Lanzador silencioso de Windows sin consola negra
├── Abrir_Elena.bat                # Lanzador por consola para diagnóstico y desarrollo
├── Cerrar_ElenaPRO.bat            # Detenedor de procesos de Node.js
├── fijar_ip_estatica.bat          # Asistente de configuración de IP para red local
├── inno_setup_script.iss          # Script de compilación para generar el .exe instalador
└── package.json                   # Dependencias y scripts de construcción
```

---

## 3. Jerarquía de Roles y Seguridad

### A. Super Administrador (`superadmin`)
* **Acceso:** Login universal seleccionando cualquier empresa.
* **Credenciales por defecto:** `superadmin` / `superadmin123`.
* **Capacidades:**
  * Crear nuevas empresas / clientes comerciales.
  * Suspender, reactivar o asignar planes de licencia (Demo, Mensual, Vitalicia).
  * Cada empresa recibe su propio archivo de base de datos (`data/db_<empresa_id>.json`), garantizando privacidad total.

### B. Administrador de Empresa (`admin`)
* **Acceso:** Dueño o encargado del negocio.
* **Capacidades:**
  * Configurar perfil de negocio, tasa de dólar BCV y datos fiscales (RIF, nombre, dirección).
  * Crear usuarios para cajeros y supervisores.
  * Asignar permisos específicos por módulo (ej: restringir ver costos, modificar precios, anular ventas o ver reportes).
  * Configurar impresoras térmicas (58mm / 80mm).

### C. Cajeros y Vendedores
* **Acceso:** Usuarios individuales (ej: `caja1`, `maria.ventas`).
* **Permisos granulares configurables:**
  * `pos`: Permitido vender.
  * `inventario`: Solo lectura o desactivado.
  * `compras`, `creditos`, `reportes`, `caja_chica`, `devoluciones`, `cotizaciones`: Activables según la confianza del negocio.

---

## 4. Gestión de Departamentos e Inventario

* **Departamentos Dinámicos:** Accesibles directamente desde el módulo **Inventario** mediante el botón **"Departamentos"** o el enlace **"+ Gestionar"** en el formulario de producto.
* **Endpoints API:**
  * `GET /api/categorias-comerciales` -> Listar departamentos.
  * `POST /api/categorias-comerciales` -> Crear nuevo departamento `{ nombre, rubro }`.
  * `DELETE /api/categorias-comerciales/:id` -> Eliminar departamento.
* **Multirrubro:**
  * **Farmacias:** Principio activo, laboratorio, número de lote y fecha de vencimiento.
  * **Ferreterías & General:** Precios detal, mayorista y especial/técnico.
  * **Ropa & Calzado:** Matriz de variantes por Talla y Color con control de stock individual.
  * **Supermercados:** Integración con balanzas electrónicas (códigos PLU) y venta fraccionada/por peso.

---

## 5. Procedimiento para Actualizaciones y Nuevas Versiones

Para aplicar cambios y generar el instalador en Windows:

```bash
# 1. Instalar dependencias si se agregaron paquetes nuevos
npm install

# 2. Compilar la aplicación Frontend y Backend
npm run build
```

Una vez que la compilación termine con `Done in ...`:
1. Abrir **Inno Setup Compiler**.
2. Abrir `inno_setup_script.iss`.
3. Presionar **`F9`**.
4. En la carpeta `Output\` se generará `Instalador_SistemaPOS_v2.5.0.exe`.

---

## 6. Configuración de Red Local y Dispositivos Móviles

1. **Servidor en la PC Principal:** Iniciar el sistema en la máquina que servirá como servidor local.
2. **Conexión de Celulares / Tablets:**
   * Conectar los dispositivos a la misma red WiFi.
   * Abrir en Elena PRO el botón **"Conectar Celulares"**.
   * Escanear el código QR con la cámara del celular.
   * Abrirá automáticamente `http://<IP_DE_LA_PC>:3000` con el punto de venta listo para facturar o tomar inventario.

---

## 7. Módulo de Respaldos, Restauración y Recuperación de Desastres

1. **Respaldos en la Nube (Supabase Storage):**
   * Cada empresa sincroniza automáticamente sus respaldos en formato comprimido/JSON en `elena-backups/{empresa_id}/automatico/`.
   * Permite restauración con 1 clic desde cualquier equipo nuevo con acceso a internet.
2. **Carga y Restauración de Archivo Externo (.JSON) desde PC o USB:**
   * En caso de daño físico del equipo, cualquier archivo `.json` de respaldo guardado en un pendrive o correo se puede restaurar directamente desde la interfaz con el botón **"Cargar Archivo .JSON (PC / USB)"**.
   * El sistema valida la integridad estructural de las colecciones (`productos`, `ventas`, `clientes`, `usuarios`) antes de restaurar.
   * Crea automáticamente un *pre-respaldo preventivo* antes de sobreescribir.
   * Invalida y sincroniza inmediatamente la memoria RAM (`invalidateTenantCache`) sin necesidad de reiniciar el servidor.
3. **Persistencia In-Memory y Mutex:**
   * Las lecturas se sirven en < 1 ms desde la memoria RAM.
   * Las escrituras se encolan con `db_memory_manager.ts` para garantizar consistencia ACID y cero bloqueos entre múltiples cajas concurrentes.

---

## 8. Protocolo de Modificación del Código y Registro de Cambios

> 📌 **Cualquier desarrollador o asistente de IA DEBE registrar aquí cada modificación que realice:**

* **[2026-08-20] Optimización de Respaldos, Carga USB y Sincronización In-Memory:**
  * Implementado endpoint `/api/backups/upload-and-restore` para subir y restaurar archivos `.json` directamente desde el navegador/USB.
  * Añadida validación de integridad estructural en respaldos antes de aplicar la restauración.
  * Sincronizada la invalidación de memoria RAM (`invalidateTenantCache` + `writeDB({immediate: true})`) en todas las vías de restauración.
  * Añadida regla de actualización obligatoria de `context.md` en `AGENTS.md`.
* **[2026-08-20] Prevención de Sleep / Cold Starts en Render:**
  * Implementado endpoint ultraligero `/api/health`.
  * Integrado monitoreo con UptimeRobot / Cron-Job cada 5 minutos para disponibilidad 24/7 sin latencia de inicio.
* **[2026-08-23] Personalización de Tickets Térmicos (58mm / 80mm / Comunes) y Control de Visibilidad por Departamento:**
  * **Personalización de Comprobante Térmico de Pedidos:** Integrado el componente `ThermalPedidoModal.tsx` y la descarga PDF adaptativa con las configuraciones de cabecera de "Impresión Térmica" (`thermal_cabecera_titulo`, `thermal_cabecera_rif`, `thermal_cabecera_telefono`, `thermal_cabecera_direccion`, `thermal_pie_mensaje`, `thermal_papel_ancho`).
  * **Soporte para Formatos de 58 mm, 80 mm e Impresoras Comunes:** Vista previa interactiva, selector de tamaño de papel, soporte de impresión directa por navegador/controlador ESC/POS y PDF.
  * **Desglose Financiero en Dólares (USD $):** Formato limpio y conciso mostrando únicamente Total Presupuestado, Anticipo Recibido y Saldo Restante en USD ($) para evitar discrepancias por volatilidad cambiaria.
  * **Control de Acceso y Visibilidad por Departamento/Área Asignada:**
    * Añadido el campo `departamento` a la interfaz `Usuario` en `src/types.ts` y al esquema de persistencia en `server.ts` (`/api/usuarios`, `/api/usuarios/guardar` y `/api/login`).
    * Implementado selector de departamento con sugerencias predefinidas y badges visuales en la gestión de usuarios (`src/components/Usuarios.tsx`).
    * Configurada la restricción automática de visualización en `src/components/Pedidos.tsx`: Cuando un usuario de área técnica/operativa (ej: "Bordado", "Costura", "Diseño Gráfico") inicia sesión, visualiza de forma exclusiva las órdenes y trabajos correspondientes a su departamento o asignados a su nombre, con indicador visual y bloqueo de filtros no autorizados.
    * Los administradores y superadministradores conservan la vista global y el cambio libre entre todos los departamentos.
* **[2026-08-24] Auto-Recuperación y Sincronización Transparente con Supabase Storage (Render Free Plan Zero Data Loss):**
  * Implementado `uploadGlobalMasterToSupabase` para sincronizar en tiempo real `companies.json` y `superadmin_config.json` al bucket `_global_master_/` de Supabase Storage.
  * Implementado `autoRestoreAllFromSupabaseCloud` que se ejecuta al arrancar el servidor en `server.ts`: si tras un nuevo commit o deploy en Render el almacenamiento efímero se limpia, el servidor auto-restaura el catálogo maestro de empresas, las claves del SuperAdmin y las bases de datos de cada cliente (`db_<empresa_id>.json`) en menos de 2 segundos desde la nube.
  * Sincronizadas las modificaciones, cobros, renovaciones y creación de empresas para que se respalden automáticamente en Supabase al momento de ser ejecutadas.
  * Resuelve de forma 100% gratuita y transparente la persistencia permanente sin requerir planes de pago de disco en Render.
* **[2026-08-24] Modo Soporte Técnico / Acceso Invisible SuperAdmin (Ghost Impersonation):**
  * Implementado endpoint `/api/admin/companies/:id/impersonate` para otorgar sesión de soporte técnico con permisos completos de administrador a cualquier empresa del ecosistema SaaS sin solicitar ni alterar la contraseña del cliente.
  * Añadido botón interactivo **"Soporte"** en cada tarjeta de empresa y en la tabla de licencias de `SuperAdminPanel.tsx`.
  * Diseñado banner superior en `App.tsx` que identifica claramente el Modo Soporte Técnico y permite un retorno fluido e inmediato al Panel de SuperAdmin Global con un solo clic (`Volver a SuperAdmin`).
  * Permite al desarrollador/propietario configurar impresoras térmicas, sucursales, cajeros y periféricos de cualquier cliente de forma no invasiva y profesional.
* **[2026-08-24] Reseteo de Contraseñas de Clientes (1-Clic) y Gestión de Tarifas / Paquetes Dinámicos en SuperAdmin:**
  * **Reseteo de Credenciales:** Implementados endpoints `GET /api/admin/companies/:id/users` y `POST /api/admin/companies/:id/reset-password` en `server.ts` con hashing `bcrypt`.
  * **Modal de Gestión de Usuarios y Claves:** Botón directo **"Claves"** en cada empresa de `SuperAdminPanel.tsx` para ver todos los usuarios de la base de datos de esa empresa y restablecer contraseñas con **1 solo clic** (a `admin123`) o establecer una clave personalizada, con botón para copiar formato listo para WhatsApp.
  * **Tarifas y Paquetes Mensuales Dinámicos:** Se eliminó la restricción fija de $25. Ahora el SuperAdmin puede registrar cobros con cualquier monto USD y seleccionar paquetes rápidos ($10 Básico, $15 Estándar, $25 Pro, $35 Plus, $50 Empresarial o monto personalizado), con opción de actualizar la tarifa fija mensual pactada de la empresa.
  * **Edición Integral de Planes:** El modal de Editar Empresa ahora permite modificar el Tipo de Plan (Mensual, Trimestral, Semestral, Anual, Personalizado, Trial, Vitalicia) y la tarifa mensual pactada en USD ($) de cada cliente.
* **[2026-09-20] Optimización Visual y Funcional de la Barra de Búsqueda de Inventario:**
  * **Iconografía y Reconocimiento Visual:** Reemplazado el icono erróneo `<Plus />` por la lupa `<Search />` distintiva de color índigo en `src/components/Inventario.tsx`.
  * **Estilo y Accesibilidad:** Añadido borde delimitador (`border-slate-200`), fondo blanco en foco con anillo de acento (`focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100`), padding ergonómico y botón de limpieza rápida (`X`) accesible con identificadores HTML únicos (`input-buscar-inventario`, `btn-limpiar-busqueda-inventario`).
  * **Filtrado en Tiempo Real Preservado:** Mantiene el filtrado instantáneo por código, nombre, marca, ubicación, lote, principio activo y atributos sin afectar el resto de la interfaz.
  * **Estado de Verificación:** Compilación exitosa verificada al 100% con `compile_applet`.
* **[2026-09-20] Departamentos y Áreas de Trabajo Dinámicos en Módulo de Trabajos y Pedidos:**
  * **Backend API Multi-Tenant:** Implementados endpoints `GET`, `POST` y `DELETE` en `/api/departamentos-pedidos` en `server.ts` con persistencia in-memory RAM y respaldo JSON por empresa (`departamentosPedidos`). Preserva los departamentos predeterminados del sistema e indexa automáticamente áreas existentes.
  * **Gestión Dinámica en UI (`src/components/Pedidos.tsx`):**
    * Sustituido el array estático hardcoded por estado dinámico reactivo `departamentos` sincronizado con el backend.
    * Incorporado botón de acción rápida **"+ Departamentos"** en la cabecera de *Asignación y Trabajo Operativo*.
    * Enlace directo **"+ Gestionar Dptos"**, opción interactiva **"➕ + Agregar nuevo departamento..."** y botón de acceso rápido `[+]` junto al selector de área/departamento.
    * **Modal de Gestión Integral de Departamentos:** Permite dar de alta nuevas áreas (ej. Serigrafía, Ploteo, Grabado Láser, Joyería, etc.), visualizar pedidos asociados a cada área, seleccionar el área activa con 1 clic y eliminar departamentos personalizados no requeridos.
    * Sincronizado automáticamente con el selector de área del modal de empleados y con el filtro superior del historial de pedidos.
  * **Estado de Verificación:** Compilación limpia y exitosa al 100% con `compile_applet` y `lint_applet`.


