# Manual Definitivo de Instalación, Configuración e Importación - Elena PRO 💊

Este manual contiene de forma **100% detallada e instructiva** los pasos necesarios para instalar, configurar y desplegar **Elena PRO** en las computadoras de tus clientes (farmacias, botiquerías y locales de salud). 

Está diseñado para que puedas ejecutar implementaciones de forma profesional tanto en **una sola computadora (Servicio Local Único)** como en **redes de varias computadoras (Servidor + Terminales en Red Local)**, además de cómo migrar e importar inventarios desde Excel/CSV directamente a la base de datos local.

---

## ÍNDICE
1. **La Persistencia Local vs. Nube (Resolución de Dudas y Pérdida de Datos en AI Studio)**
2. **Instalación y Configuración en 1 Sola Computadora (Punto de Venta Local Único)**
3. **Instalación en 2 o más Computadoras en Red Local (Servidor de Caja + Terminal de Pasillo/Administrador)**
4. **Guía de Configuración del Firewall de Windows (Paso Crítico para Redes)**
5. **Importación Masiva de Inventarios desde Excel o Sistemas Anteriores (CSV)**
6. **Respaldo de Datos (Backups) y Restauración ante Fallos**

---

## 1. La Persistencia Local vs. Nube 🗄️

### ¿Por qué desaparecieron ayer las empresas creadas en el Panel Administrativo?
En la plataforma de desarrollo de **AI Studio**, cuando hacemos modificaciones al código o compilamos el programa, el servidor de desarrollo se reinicia y, en ocasiones, **el contenedor virtual de la nube se reconstruye a partir de la plantilla original de tu código**. Esto causa que cualquier archivo de datos creado en la vista previa del navegador durante las pruebas (como nuevas empresas guardadas en `data/companies.json` o bases de datos de prueba en `data/db_*.json`) se borren o se reinicien al estado de la plantilla original.

### ¿Pasará esto en la computadora del cliente?
**¡Rotundamente NO!** Al correr el sistema de manera local en la computadora física de tu cliente, **nunca se borrarán los datos**. El sistema operativo de la computadora de tu cliente no reinicia los archivos del disco duro al apagarla o reiniciar el equipo. Las empresas que agregues en el Panel Administrativo y las ventas del día a día se guardan de forma **permanente y segura** dentro de la carpeta `data/` del disco de la PC.

---

## 2. Instalación en 1 Sola Computadora (Punto de Venta Local Único) 💻

Este es el escenario más común: una farmacia que realiza facturación, gestión de caja y administración en la misma computadora principal de la tienda.

### Requisitos Previos en la Computadora del Cliente:
- **Sistema Operativo:** Windows 10 o Windows 11 (preferido), macOS, o Linux.
- **Node.js (Indispensable):** El entorno de ejecución para el sistema.

### Paso 1: Descargar e Instalar Node.js
1. Entra a la página oficial de Node.js: [https://nodejs.org/](https://nodejs.org/) desde la computadora del cliente.
2. Descarga la versión que dice **LTS** (Long Term Support), que es la versión más estable y recomendada para entornos de producción.
3. Abre el instalador descargado y haz clic en **Siguiente, Siguiente, Instalar**. Asegúrate de dejar marcadas todas las casillas por defecto.
4. Para comprobar que se instaló correctamente:
   - Presiona las teclas `Windows + R` en el teclado, escribe `cmd` y presiona Enter.
   - En la consola de comandos, escribe: `node -v` y presiona Enter. Debería mostrarte la versión (por ejemplo: `v20.11.0`).
   - Escribe: `npm -v` y presiona Enter. Debería mostrarte la versión de npm.

### Paso 2: Copiar la Carpeta del Sistema
1. Copia la carpeta completa del código fuente de **Elena PRO** a la computadora de tu cliente.
2. Coloca la carpeta preferiblemente en la raíz del disco local para evitar rutas extremadamente largas.
   - **Ruta recomendada en Windows:** `C:\ElenaPRO`
   - **Ruta recomendada en macOS/Linux:** `/Users/[nombre_usuario]/ElenaPRO`

### Paso 3: Configurar el Archivo de Entorno `.env`
El archivo `.env` controla el acceso a la Inteligencia Artificial de **Elena AI**.
1. En la raíz de la carpeta `C:\ElenaPRO`, revisa si ya existe un archivo llamado `.env`.
2. Si no existe, copia el archivo `.env.example` y cámbiale el nombre a `.env`.
3. Abre el archivo `.env` con el Bloc de notas.
4. Si tu cliente contrató el servicio de Inteligencia Artificial (Elena AI), coloca su clave de API de Gemini:
   ```env
   GEMINI_API_KEY="AIzaSyA1..."
   ```
5. Si el cliente **no** desea usar la IA de Elena AI, puedes dejar ese campo en blanco o colocar una clave genérica. El sistema seguirá operando al 100% de forma offline en sus módulos de inventario, clientes, cierres y ventas sin emitir fallos de inicio.

### Paso 4: Ejecutar el Sistema por Primera Vez
1. Entra a la carpeta `C:\ElenaPRO`.
2. Busca el archivo automatizado llamado `iniciar_sistema.bat`.
3. Haz doble clic sobre él.
4. Se abrirá una ventana negra de comandos que ejecutará de forma autónoma:
   - La instalación de las dependencias (`npm install`). (Esto tarda entre 1 a 3 minutos la primera vez según la velocidad del internet).
   - La compilación optimizada del sistema (`npm run build`).
   - El inicio del servidor de producción local (`npm start`).
5. El script abrirá de manera automática el navegador predeterminado (Chrome/Edge) en la dirección local del sistema: **`http://localhost:3000`**.
6. **Credenciales por defecto para iniciar sesión:**
   - **Administrador:** Usuario: `admin` | Contraseña: `admin`
   - **Cajero:** Usuario: `cajero` | Contraseña: `123`

### Paso 5: Crear Acceso Directo de Escritorio (Modo Estándar o Modo Invisible) 🚀

Para que tu cliente no tenga que navegar en las carpetas para abrir el sistema, puedes crear un acceso directo en el escritorio. Tienes dos opciones de inicio de acuerdo a la preferencia de tu cliente:

#### Opción A: Inicio con Ventana de Consola Visible (Modo Estándar)
Útil durante auditorías técnicas o si deseas visualizar de manera explícita los logs en tiempo real.
1. Haz clic derecho sobre el archivo `iniciar_sistema.bat` en `C:\ElenaPRO`.
2. Selecciona **Enviar a** -> **Escritorio (crear acceso directo)**.

#### Opción B: Inicio Silencioso en Segundo Plano (Modo Invisible - ¡Altamente Recomendado!) 🕵️‍♂️
Para evitar que el cajero, operario o administrador cierre accidentalmente la consola de comandos de Node.js interrumpiendo el servicio de la farmacia.
1. Haz clic derecho sobre el archivo **`iniciar_invisible.vbs`** (ubicado en la raíz de la carpeta `C:\ElenaPRO`).
2. Selecciona **Enviar a** -> **Escritorio (crear acceso directo)**.
3. Al hacer doble clic sobre este acceso directo, el sistema se iniciará silenciosamente de fondo, el servidor web local se levantará de forma autónoma y el navegador se abrirá de inmediato para operar al 100%.

#### Personalizar el Acceso Directo (Icono y Nombre):
1. Ve al escritorio, haz clic derecho sobre el acceso directo que acabas de crear (sea el `.bat` de la Opción A o el `.vbs` de la Opción B) y selecciona **Propiedades**.
2. En la pestaña de **Acceso Directo**, haz clic en el botón **Cambiar icono...**.
3. Busca o selecciona un icono personalizado relacionado con farmacia o medicina (`.ico`) para darle un acabado de marca corporativa.
4. Cambia el nombre de tu acceso directo a **"Elena PRO - Farmacia"**.

### Paso 5.1: Cómo Apagar o Detener el Sistema de Forma Segura (Especialmente en Modo Invisible) 🛑
Si iniciaste el sistema usando el **Modo Invisible (Opción B)**, el servidor web de Elena PRO estará corriendo en segundo plano de forma invisible. Para apagar el servidor de forma limpia (por ejemplo, al finalizar la jornada o antes de reiniciar la computadora), hemos creado un script dedicado:
1. Dirígete a la raíz de la carpeta `C:\ElenaPRO`.
2. Haz clic derecho sobre el archivo **`detener_sistema.bat`** y selecciona **Enviar a** -> **Escritorio (crear acceso directo)**.
3. En el escritorio, cámbiale el nombre a **"Elena PRO - Apagar"** y ponle un icono rojo de apagado o stop (`.ico`) para identificarlo rápidamente.
4. Al hacer doble clic en este acceso directo, el script buscará el proceso exacto que escucha en el puerto `3000` y lo detendrá limpiamente en segundos, liberando todos los recursos de la computadora de forma segura.

---

## 3. Instalación en 2 o más Computadoras en Red Local (Servidor + Terminales) 🔌🌐

Este escenario es ideal cuando la farmacia tiene:
1. **Computadora A (Servidor/Caja Principal):** Ubicada en la caja, donde se procesan los pagos y se conecta la impresora térmica. Alberga físicamente la base de datos de la farmacia.
2. **Computadora B (Terminal Administrativo/Caja Secundaria/Pasillo):** Una o más terminales que permiten a los farmacéuticos o cajeros vender, cargar compras, ajustar stock, dar de alta clientes y visualizar reportes en tiempo real simultáneamente mientras la Computadora A está vendiendo.

### 🛑 EL GRAN PROBLEMA DE RED LOCAL: "Se va la luz, el router se reinicia y cambia la IP"

Cuando el router se apaga por cortes de luz y vuelve a encender, reasigna direcciones IP de forma dinámica (DHCP). Si tu Computadora B (Caja cliente) se conectaba usando la dirección IP de la Computadora A (Servidor), por ejemplo: `http://192.168.1.5:3000`, y el router se reinicia, la IP del Servidor podría cambiar a `192.168.1.12`. Esto causa que **la caja secundaria deje de conectarse porque busca la IP vieja**.

Incluso si configuras una IP estática manualmente en la tarjeta de red del Servidor dentro de Windows, esto puede provocar un **conflicto de IP** si el router, al encenderse, le entrega esa misma IP a un teléfono celular o a otra computadora antes de que el Servidor se conecte.

Aquí tienes las **dos soluciones definitivas y profesionales** para este problema:

---

### SOLUCIÓN 1: Conexión por Nombre de Equipo (mDNS / Local Hostname) 🚀 (¡La más fácil e infalible!)

En lugar de utilizar la IP numérica del Servidor en las computadoras clientes, conéctate usando el **Nombre de Red** de la Computadora Principal. Windows y los routers modernos admiten resolución de nombres mDNS de forma nativa. 

**No importa si la IP del Servidor cambia mil veces al día por cortes de luz, las cajas clientes siempre encontrarán al servidor por su nombre único.**

#### Paso A: Obtener el Nombre de Red del Servidor
1. En la **Computadora Principal (Servidor)**, presiona las teclas `Windows + R`, escribe `cmd` y presiona Enter.
2. En la consola negra escribe: `hostname` y presiona Enter.
3. Te devolverá el nombre exacto de la computadora (ejemplo: `DESKTOP-FARMACIA` o `PC-SERVIDOR`). Anótalo tal como aparece.

#### Paso B: Conectarse desde las Cajas Clientes
1. En la **Computadora Secundaria (Caja Cliente)**, abre el navegador web.
2. En la barra de direcciones superior, escribe la dirección usando el nombre del servidor seguido de `:3000`:
   - **`http://DESKTOP-FARMACIA:3000`** (Reemplaza `DESKTOP-FARMACIA` por el nombre real de tu servidor).
3. ¡Listo! El sistema cargará instantáneamente. Para simplificarlo al máximo, crea un acceso directo en el escritorio de la caja cliente con esta dirección web para que los cajeros ingresen con un solo clic.

---

### SOLUCIÓN 2: Reserva de IP por Dirección MAC en el Router (DHCP IP Reservation) 🛰️ (La regla de oro de redes)

Si prefieres seguir usando una dirección IP numérica estable, la forma correcta no es forzarla desde Windows, sino **decirle al router que siempre le asigne la misma IP a la tarjeta de red del Servidor**.

#### Paso A: Obtener la Dirección MAC del Servidor
1. En la **Computadora Servidor**, abre la consola de comandos (`cmd`).
2. Escribe: `getmac /v /fo list` y presiona Enter.
3. Busca tu adaptador de red activo (Ethernet o Wi-Fi) y anota la **Dirección física** (MAC Address) que tiene un formato como: `AB-CD-EF-01-23-45`.

#### Paso B: Reservar la IP en el Router
1. Entra al panel de configuración de tu router (habitualmente accediendo a `http://192.168.1.1` o `http://192.168.0.1` desde tu navegador).
2. Ve a la sección de **DHCP**, **LAN Setup** o **IP Reservation** (Reserva de IP/DHCP Estático).
3. Haz clic en "Agregar nueva reserva" (Add New).
4. Ingresa la **Dirección MAC** de tu servidor y la dirección IP fija que quieres asignarle (ejemplo: `192.168.1.100`).
5. Guarda los cambios. ¡Listo! El router recordará físicamente la computadora y, aunque se vaya la luz, al encenderse siempre le otorgará la IP `192.168.1.100` al Servidor de forma exclusiva, evitando conflictos y pérdidas de conexión.

---

### GUÍA DE INSTALACIÓN PASO A PASO EN RED LOCAL (RESUMEN):

#### Paso 1: Configurar el Servidor (Equipo Principal)
1. Instala el sistema en la computadora principal usando el instalador de un solo clic: **`instalar.bat`** (esto creará de forma automática los directorios de datos y configurará el puerto local).
2. Abre el puerto `3000` en el Firewall de Windows en la Computadora Servidor (ver sección 4).
3. Inicia el sistema en el Servidor (puedes usar el acceso directo invisible `iniciar_invisible.vbs`). El sistema ya está diseñado para escuchar en la dirección `0.0.0.0`, lo que significa que de forma nativa acepta tráfico de toda la red local.

#### Paso 2: Configurar las Cajas / Clientes (Equipos Secundarios)
⚠️ **¡MUY IMPORTANTE!**: En las computadoras de las cajas secundarias **NO necesitas instalar nada de software, ni Node.js, ni bases de datos**. Se conectan directamente de manera inalámbrica o cableada.
1. Conecta la Caja Secundaria al mismo router.
2. Abre el navegador e ingresa usando la **Solución 1** o **Solución 2**:
   - `http://NOMBRE-DEL-SERVIDOR:3000`
3. En el escritorio de la Caja Secundaria, haz clic derecho -> **Nuevo** -> **Acceso directo**, pega la dirección web de arriba, nómbralo **"Elena PRO - Caja"**, cámbiale el icono por uno médico y haz clic en finalizar. ¡Tus cajeros facturarán simultáneamente y toda la información viajará al servidor de forma segura!

---

## 4. Guía de Configuración del Firewall de Windows (Paso a Paso) 🛡️

Este paso es **obligatorio** en la Computadora Servidor para permitir el acceso a otras terminales en la red local.

1. En la Computadora Servidor, presiona la tecla de Windows en tu teclado y escribe **Firewall**.
2. Haz clic en **Windows Defender Firewall con Seguridad Avanzada** (Windows Defender Firewall with Advanced Security).
3. En la columna de la izquierda, haz clic en **Reglas de entrada** (Inbound Rules).
4. En la columna de la derecha (Acciones), haz clic en **Nueva regla...** (New Rule...).
5. En la ventana que aparece:
   - Selecciona **Puerto** (Port) y haz clic en Siguiente.
   - Selecciona **TCP**.
   - En **Puertos locales específicos** (Specific local ports), escribe: `3000`. Haz clic en Siguiente.
   - Selecciona **Permitir la conexión** (Allow the connection). Haz clic en Siguiente.
   - Deja marcadas las tres opciones: **Dominio**, **Privada** y **Público** (Domain, Private, Public). Haz clic en Siguiente.
   - Asígnale un nombre descriptivo a la regla, por ejemplo: **"Elena PRO - Puerto 3000"**.
   - Haz clic en **Finalizar**.
6. ¡Listo! El puerto de red ya está abierto exclusivamente para el sistema dentro de la red del comercio.

---

## 5. Importación Masiva de Inventarios desde Excel/Sistemas Anteriores 📊📥

Cuando vendes el sistema, tus clientes ya tendrán su inventario en una hoja de Excel, una libreta o exportada desde su sistema de software antiguo. Cargar producto por producto a mano puede tomar días. Hemos diseñado un script de importación automática (`importar_inventario.cjs`) de alto rendimiento para agilizar esto a 1 clic.

### Paso 1: Organizar el Inventario en Excel
Crea una hoja de Excel nueva y organiza los productos de tu cliente en las siguientes columnas exactamente (respeta las minúsculas y sin acentos en los encabezados):

| codigo | nombre | categoria | precio_compra | precio_venta | stock |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 750100200300 | Atamel Forte 650mg | MEDICAMENTO | 1.20 | 1.80 | 50 |
| 750400500600 | Gatorade 500ml | EXENTO | 1.00 | 1.50 | 120 |
| 750700800900 | Crema Dental Colgate | GRAVADO_16 | 2.10 | 3.20 | 35 |

#### 💡 Reglas Importantes para rellenar el Excel:
- **`codigo`**: Es el código de barra del producto (EAN/UPC) o un código interno alfanumérico único creado por ti si el producto no tiene código físico.
- **`nombre`**: Nombre del medicamento o producto con su presentación (ej: "Ibuprofeno 400mg Alivax 10 Tabletas"). Evita usar comas (`,`) dentro del nombre para evitar desalineación del CSV.
- **`categoria`**: Especifica a qué grupo pertenece para efectos impositivos en Venezuela/Latinoamérica:
  - `MEDICAMENTO` (Para fármacos tradicionales).
  - `EXENTO` (Para productos alimenticios o de primera necesidad exentos de IVA).
  - `GRAVADO_16` (Para productos generales con IVA del 16% como cosméticos, bebidas, etc.).
- **`precio_compra`**: El precio al que el cliente le compra al distribuidor (en USD). Si no lo tiene, pon `0`.
- **`precio_venta`**: El precio de venta al público en la estantería (en USD).
- **`stock`**: Cantidad física actual en el estante o almacén.

### Paso 2: Exportar el Excel a Formato CSV
1. En Excel, haz clic en **Archivo** -> **Guardar como**.
2. En la casilla de "Tipo" de archivo, selecciona **CSV (delimitado por comas) (*.csv)**.
3. Nombra el archivo exactamente como: `inventario.csv`.
4. Guarda el archivo directamente en la raíz de la carpeta del sistema (por ejemplo, en `C:\ElenaPRO\inventario.csv`).

### Paso 3: Ejecutar la Importación Masiva
1. Abre la consola de comandos de Windows (`cmd`).
2. Entra a la carpeta del sistema ejecutando:
   ```cmd
   cd C:\ElenaPRO
   ```
3. Ejecuta el importador de la siguiente forma según la empresa a la que desees cargar el inventario:
   - **Para la farmacia principal ("Elena Farma C.A." / Empresa default):**
     ```cmd
     node importar_inventario.cjs default
     ```
   - **Para otra empresa registrada (usando su ID del panel, por ejemplo "farma_vida"):**
     ```cmd
     node importar_inventario.cjs farma_vida
     ```
4. El script analizará el archivo, validará los campos y te dará un reporte en pantalla en segundos:
   - Cuántos productos nuevos fueron agregados.
   - Cuántos productos existentes fueron actualizados (si el código de barras ya existía, **el sistema suma de forma inteligente el stock nuevo al stock existente** para no perder ventas previas).
   - Filas que contenían errores.

### 5.2 Importación Directa desde Bases de Datos MySQL 🐬🔌

Si tu cliente viene de un software administrativo anterior que guarda su catálogo en una base de datos local **MySQL** (como Saint, Valery, Premium, etc.), no necesitas exportar a Excel. **Elena PRO** cuenta con un importador nativo inteligente directo de base de datos a base de datos.

#### Paso 1: Instalar el Conector de MySQL en Elena PRO
Abre la consola en la carpeta de tu instalación (`C:\ElenaPRO`) y ejecuta:
```cmd
npm install mysql2
```

#### Paso 2: Configurar las Credenciales y el Mapeo de Columnas
Abre el archivo `importar_mysql.cjs` en la raíz de tu proyecto con el Bloc de notas o cualquier editor de código, y ajusta las siguientes secciones según corresponda:

1. **Credenciales de Conexión (`CONFIG_MYSQL`):**
   - `host`: Dirección IP de la computadora donde corre MySQL (usa `'localhost'` si es la misma máquina).
   - `user`: Usuario de la base de datos (por ejemplo, `'root'`).
   - `password`: Contraseña del servidor MySQL.
   - `database`: El nombre exacto de la base de datos de tu antiguo sistema.

2. **Mapeo de Nombres de Columnas:**
   Ajusta los nombres de las columnas para indicarle al script dónde está guardada cada información. Por ejemplo, si en tu sistema anterior el costo se llama `costo_real` y la existencia se llama `cant_disponible`, cámbialos en la sección de mapeo:
   ```javascript
   mapeo_columnas: {
     codigo: 'codigo_barras',   // Tu columna real en MySQL
     nombre: 'descripcion',     // Tu columna real en MySQL
     categoria: 'categoria',    // Tu columna real en MySQL
     precio_compra: 'costo_real',  // Tu columna real en MySQL
     precio_venta: 'precio_venta', // Tu columna real en MySQL
     stock: 'cant_disponible'   // Tu columna real en MySQL
   }
   ```

3. **Consulta Avanzada (Opcional):**
   Si la base de datos de origen es compleja o requiere cruzar datos con `JOIN`, puedes activar la opción `consulta_personalizada` ingresando tu sentencia SQL directa de selección.

#### Paso 3: Ejecutar el Importador MySQL
1. Abre tu consola de comandos (`cmd`) en la carpeta del proyecto.
2. Corre el script especificando la empresa destino:
   - **Para la farmacia principal:**
     ```cmd
     node importar_mysql.cjs default
     ```
   - **Para otra sucursal o empresa registrada:**
     ```cmd
     node importar_mysql.cjs [id_empresa]
     ```
3. El script se conectará automáticamente, validará los registros, calculará el margen de ganancia de cada artículo, y los agregará o sumará al inventario existente en menos de 2 segundos.

### 5.3 Gestión de Usuarios y Control de Accesos Multi-Rol 👥🔐

Para garantizar la seguridad de la facturación y el resguardo de la información, **Elena PRO** cuenta con un módulo profesional de administración de usuarios locales, accesible desde la nueva pestaña **"Usuarios & Accesos"** del menú lateral (disponible exclusivamente para usuarios con rol de **Administrador**).

#### Características del Módulo de Usuarios:
1. **Roles Predefinidos:**
   * **Administrador Local:** Tiene control total del sistema. Puede agregar medicamentos al inventario, cambiar precios, actualizar la tasa cambiaria del dólar, ver los reportes detallados de ventas, descargar respaldos físicos, reinstalar bases de datos y gestionar las cuentas de otros cajeros.
   * **Cajero POS:** Diseñado para operarios de caja. Su interfaz de usuario está simplificada para evitar errores y distracciones: solo tienen acceso al módulo de **Ventas (POS)**, **Clientes / Cobros**, configuración de su propia ticketera térmica y el asistente de **Elena AI** para consultas de stock de medicamentos. Tienen bloqueados los módulos administrativos (inventario, costos de bultos, cierres de caja, reportes de ganancia y copias de seguridad).

2. **Registro y Edición:**
   * El nombre de usuario (login) se convierte en la credencial única para iniciar sesión y se registra en letras minúsculas, sin espacios ni caracteres especiales.
   * Puedes cambiar el nombre en pantalla y el rol de cualquier usuario en cualquier momento.
   * **Actualización de Contraseña Segura:** Si necesitas cambiar la contraseña de un usuario o de la cuenta maestra `admin`, solo debes presionar el botón de editar, escribir la nueva contraseña en el formulario y guardar. El servidor aplicará automáticamente el algoritmo criptográfico **bcrypt** para hashear y cifrar la clave antes de guardarla en el archivo JSON.

3. **Restricción de Seguridad del Administrador Principal (`admin`):**
   * El usuario principal de acceso inicial **`admin`** es la cuenta maestra de la sucursal. Por razones de seguridad extrema, **este usuario no puede ser eliminado ni se le puede rebajar el rol** a cajero.

---

### 5.4 Asistente de Migración Gráfica desde SQL / SQLite Externo 🗄️⚡ (¡Nueva Función!)

Para simplificar las migraciones desde sistemas antiguos que exportan un respaldo plano en formato `.sql` o un archivo de base de datos `.db` o `.sqlite` (ej. Saint, Premium, Valery, o bases de datos móviles), **Elena PRO** ahora integra un potente **Asistente de Migración Gráfica** interactivo de 3 pasos dentro de la sección **"Seguridad & Copias" -> "Migrar de SQL / SQLite Externo"**.

#### ¿Cómo Funciona el Asistente Gráfico de Migración?

1. **Subida del Archivo de Origen:**
   - Haz clic en el botón de carga del panel izquierdo o arrastra tu archivo `.sql`, `.db` o `.sqlite`.
   - El sistema cargará el archivo y su motor inteligente lo analizará en tiempo real, identificando todas las tablas existentes, el número de columnas y la cantidad exacta de filas de datos.

2. **Mapeo Visual de Tablas y Campos (Wizard):**
   - El sistema empareja automáticamente (por algoritmos de similitud de nombres) tus tablas de origen con las de **Elena PRO** (ej. si tienes una tabla llamada `articulos`, `items` o `inventario`, se asociará automáticamente con el catálogo de `productos` de Elena PRO).
   - Para cada tabla que actives, verás una lista desplegable con las columnas de Elena PRO y podrás seleccionar qué campo del origen corresponde a cada dato. El sistema te mostrará una **vista previa en tiempo real de los datos reales de tu archivo** para evitar errores de selección.
   - Podrás configurar opciones generales, como la casilla **"Limpiar registros destino antes de migrar"** para borrar de forma segura únicamente los productos/clientes actuales y evitar duplicados o errores de integridad al insertar.

3. **Ejecución y Logs en Tiempo Real:**
   - Haz clic en **"Iniciar Migración a MariaDB Ahora"**.
   - El sistema iniciará una transacción optimizada en MariaDB, desactivando temporalmente llaves foráneas para mayor velocidad, e insertando los datos en lotes ordenados de 100 registros.
   - Verás una consola con los reportes de transacciones detallando exactamente cuántas filas se procesaron y si hubo algún fallo de consistencia de datos en el origen.

---

### 5.5 Script de Migración Directa de MariaDB a MariaDB 🐬➡️🐬 (Clonación de Servidores)

Si tu farmacia está expandiéndose a una nueva sucursal, si deseas migrar de un servidor local viejo a una nueva computadora servidor local, o si estás migrando toda tu base de datos de producción local de MariaDB a una instancia MariaDB en la nube (ej. AWS, Cloud SQL o VPS privada), puedes realizar una clonación directa con el nuevo script corporativo de alto rendimiento: `migrar_mariadb_a_mariadb.cjs`.

#### Ventajas del Script de Migración Directa:
* **Integridad Referencial Garantizada:** Migra todas las tablas de Elena PRO en el orden jerárquico correcto (de padres a hijos: empresas -> usuarios -> rubros -> productos/clientes -> compras/ventas/cierres) desactivando de manera segura las restricciones de clave foránea durante la carga.
* **Procesamiento por Lotes (Batch Insert):** Lee del servidor origen e inserta en el servidor destino en ráfagas de 100 filas, maximizando la velocidad y previniendo el consumo excesivo de memoria RAM del servidor.
* **Auto-Creación de Estructura:** No necesitas crear las tablas previamente. El script creará la base de datos destino si no existe, definirá la codificación ideal de caracteres (`utf8mb4_unicode_ci`) y montará las tablas con sus índices exactos antes de copiar el contenido.

#### Instrucciones de Configuración y Uso:

1. **Instalar Dependencias de Base de Datos:**
   Asegúrate de estar en la carpeta de tu instalación de Elena PRO en la consola de comandos de Windows (`cmd`):
   ```cmd
   npm install mysql2
   ```

2. **Configurar Datos de Conexión:**
   Abre el archivo `migrar_mariadb_a_mariadb.cjs` en la raíz de tu proyecto con el Bloc de notas. Modifica las credenciales de conexión de tus servidores:
   ```javascript
   const CONFIG_ORIGEN = {
     host: 'localhost',          // IP del servidor viejo
     port: 3306,                 // Puerto de origen
     user: 'root',               // Usuario de origen
     password: 'tu_password',    // Contraseña de origen
     database: 'elena_pro',      // Nombre de la base de datos origen
   };

   const CONFIG_DESTINO = {
     host: '192.168.1.100',      // IP del servidor nuevo o URL de nube
     port: 3306,                 // Puerto de destino
     user: 'root',               // Usuario de destino
     password: 'tu_password',    // Contraseña de destino
     database: 'elena_pro',      // Nombre de la base de datos destino
   };
   ```

3. **Ejecutar el Script de Clonación:**
   Desde la terminal o consola de comandos, ejecuta:
   ```cmd
   node migrar_mariadb_a_mariadb.cjs
   ```
   El script reportará paso a paso la conexión, la estructura creada y la cantidad de filas copiadas con éxito por cada tabla. Al finalizar, tu nuevo servidor estará operativo al 100%.

---

## 6. Respaldo de Datos (Backups) y Recuperación ante Fallos 💾🔄

La principal preocupación de un dueño de farmacia es: *"¿Qué pasa si la computadora se daña, se quema o me la roban? ¿Pierdo toda mi contabilidad, inventario y ventas?"*

Con la arquitectura local de **Elena PRO**, tienes el sistema de respaldo integrado más robusto y amigable del mercado, que puedes operar directamente desde la nueva pestaña **"Seguridad & Copias"** en el panel lateral (exclusivo para usuarios Administradores):

### A. Respaldos Físicos e Instantáneos desde el Sistema:
1. Dirígete al menú lateral y haz clic en **"Seguridad & Copias"**.
2. Presiona el botón **"Respaldar Base de Datos Ahora"**.
3. El sistema creará una copia exacta de tu base de datos actual en la carpeta local `/data/backups/`.
4. El respaldo se listará en el historial del panel con su fecha exacta y tamaño de archivo.

### B. Cómo respaldar automáticamente en un Pendrive (USB):
¡El sistema puede guardar copias en tu pendrive automáticamente cada vez que se realice una venta!
1. Inserta el pendrive en la computadora servidor (por ejemplo, el pendrive se reconoce como la unidad `E:` o `F:`).
2. En el panel **"Seguridad & Copias"**, localiza el campo **"Ruta Secundaria Externa"**.
3. Coloca la ruta de tu pendrive, por ejemplo: `E:\RespaldosElena` o simplemente `F:\`.
4. Activa la casilla **"Auto-respaldo por Venta Procesada"**.
5. Haz clic en **"Guardar Configuración"**.
6. ¡Listo! Cada vez que el cajero finalice una venta en el POS, el servidor Express copiará silenciosamente el archivo de respaldo actualizado directamente al pendrive en segundo plano. Si remueves el pendrive, el sistema seguirá vendiendo con total normalidad sin interrumpir al cajero, y te alertará si intentas hacer una copia manual sin el USB conectado.

### C. Cómo realizar Respaldos Automáticos en la Nube (Gratis)
Puedes configurar respaldos en internet sin pagar nada instalando un servicio de almacenamiento oficial gratuito como **Google Drive para Ordenadores**, **Dropbox** o **OneDrive** en la computadora principal del cliente:
1. Instala Google Drive en la computadora de la farmacia.
2. Al configurarlo, selecciona la opción para **"Sincronizar carpetas de tu PC"** o pon la ruta local de tu Google Drive en el panel de **Seguridad & Copias** (ejemplo: `C:\Users\Nombre\Google Drive\ElenaRespaldos`).
3. ¡Listo! Cada vez que se genere un respaldo o se haga una venta, Google Drive lo subirá automáticamente a la nube en segundos de forma invisible.

### D. Cómo Restaurar el Sistema ante Pérdida Total de la Computadora o Errores Operativos
* **Opción 1 (Desde el Historial del Sistema):** Si un administrador cometió un error grave de inventario o borró algo por accidente, puede ir a **Seguridad & Copias**, buscar el respaldo de la hora anterior en el listado y hacer clic en **"Restaurar"**. El sistema reemplazará la base de datos actual al instante de forma segura (creando un pre-respaldo automático del estado corrupto antes de sobreescribir).
* **Opción 2 (Pérdida física de la PC):**
  1. Instala Node.js versión LTS en la nueva computadora.
  2. Descarga tu carpeta del software **Elena PRO** (`C:\ElenaPRO`).
  3. Recupera tu archivo de respaldo más reciente de tu Pendrive o de Google Drive.
  4. Nómbralo como `db_default.json` (o `db_[id_empresa].json`) y pégalo directamente dentro de la carpeta `C:\ElenaPRO\data\`, reemplazando el archivo limpio.
  5. ¡La farmacia estará operativa nuevamente en menos de 5 minutos, con todos sus productos, cuentas por cobrar, registros de ventas y cierres de caja intactos!

---

Este manual te dota de una metodología robusta e infalible para comercializar, instalar y dar mantenimiento a **Elena PRO** con estándares de la más alta calidad y confiabilidad técnica. 🚀
