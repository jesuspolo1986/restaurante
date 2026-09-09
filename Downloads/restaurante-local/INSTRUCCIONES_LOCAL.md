# Guía de Ejecución Local para GastroLocal 🚀

Esta guía te explicará detalladamente cómo descargar, abrir, compilar y ejecutar **GastroLocal** de forma local en tu computadora (PC o Mac) **con o sin emuladores de Android**, y cómo solucionar los problemas de red para que tus tablets y clientes se conecten sin problemas.

---

## 💻 Método 1: Ejecutar Directamente en la PC (¡RECOMENDADO - Sin Emuladores!) 🌟

Hemos creado un **Servidor de Escritorio de Alta Velocidad** (`gastro_local_pc_server.py`) escrito en Python estándar (sin dependencias adicionales). Este servidor te permite correr el sistema completo directamente en tu computadora Windows, Mac o Linux de forma nativa.

### Ventajas:
*   **Cero Emuladores**: Consume 95% menos recursos que un emulador de Android.
*   **Doble Pantalla**: Administras todo desde tu PC mediante un navegador web, mientras las tablets de los clientes se conectan a través de Wi-Fi al menú.
*   **Persistencia Local**: Guarda categorías, productos, stock y pedidos recibidos en un archivo local ultra-rápido `data.json`.

### Cómo usarlo:
1.  **Descarga el ZIP** del proyecto desde Google AI Studio (botón superior de exportación).
2.  Descomprime el archivo ZIP en tu PC (por ejemplo, en `C:\ElenaPRO` o cualquier otra carpeta de tu preferencia).
3.  Tienes tres formas de ejecutarlo en Windows:
    *   **Opción A (Recomendada para producción):** Haz doble clic en **`iniciar_invisible.vbs`**. Esto iniciará el servidor en segundo plano de forma totalmente invisible, evitando que los cajeros o administradores cierren la ventana negra de la consola por error.
    *   **Opción B (Lanzador Estándar):** Haz doble clic en **`iniciar_sistema.bat`**. Abrirá una ventana de consola visible con la información de estado.
    *   **Opción C (Manual):** Abre una terminal en esa carpeta y ejecuta: `python gastro_local_pc_server.py`
4.  **Acceso Directo en el Escritorio:**
    *   Haz clic derecho sobre **`iniciar_invisible.vbs`** (para inicio silencioso) o **`iniciar_sistema.bat`** (para ver la consola).
    *   Selecciona **Enviar a** -> **Escritorio (crear acceso directo)**.
    *   En el escritorio, puedes hacer clic derecho sobre el nuevo acceso directo, seleccionar **Propiedades** -> **Cambiar icono...** y elegir un icono personalizado (como el de tu farmacia o restaurante) para darle un acabado profesional.
5.  El servidor iniciará inmediatamente e indicará las direcciones URL:
    *   👉 **Panel de Administración en tu PC**: [http://localhost:8080/admin](http://localhost:8080/admin)
    *   👉 **Pantalla de Cocina (KDS) Simplificada**: [http://localhost:8080/kitchen](http://localhost:8080/kitchen) *(¡Muestra pedidos en tiempo real con timbres sonoros y tachado de ingredientes con un solo clic!)*
    *   👉 **Menú Digital para tus Clientes (Tablets)**: `http://<IP_DE_TU_PC>:8080` (por ejemplo: `http://192.168.1.19:8080`).

6.  **Cómo Apagar / Detener el Sistema:**
    *   **Si usaste `iniciar_invisible.vbs` (Modo Invisible):** Haz doble clic sobre el nuevo archivo **`apagar_sistema.bat`** que se incluye en la carpeta. Esto buscará el proceso de segundo plano, guardará los datos y respaldos de forma segura y apagará el servidor de inmediato.
    *   **Si usaste `iniciar_sistema.bat` (Modo Consola Visible):** Simplemente presiona **`Ctrl + C`** en la ventana de la consola, o cierra la ventana negra haciendo clic en la **`X`**.
    *   **Método Manual Alternativo:** Presiona `Ctrl + Shift + Esc` para abrir el *Administrador de Tareas* de Windows, busca el proceso `python.exe` o `Python` y selecciona *Finalizar tarea*.

---

## 📱 Método 2: Usar la App en un Emulador de Android o Teléfono Físico

Si de todas formas quieres ejecutar la aplicación móvil nativa de Android:

### 📋 Requisitos Previos
1. Descarga e instala **Android Studio** desde el sitio oficial: [developer.android.com/studio](https://developer.android.com/studio)
2. Abre la carpeta del proyecto en Android Studio y deja que sincronice con Gradle.

### Opción A: En el Emulador (PC)
1. Abre **Device Manager** en Android Studio y crea un dispositivo virtual (API 33 recomendada, como Android 13/14).
2. Haz clic en el botón verde de **Run** (Play ▶️) para compilar e instalar la app.
3. En la app Android, ve a la pestaña **Admin** y presiona **Activar Servidor**.
4. **Redirección de Puertos**: Como el emulador está en una red virtual aislada, para que tu PC lo vea, debes ejecutar el siguiente comando en la terminal de tu PC:
   ```bash
   adb forward tcp:8080 tcp:8080
   ```
5. Abre el navegador en tu PC e ingresa a:
   👉 **[http://localhost:8080](http://localhost:8080)**

---

## 🛠️ Solución de Errores Comunes de Red

### ❌ Error: "192.168.1.19 rechazó la conexión" (ERR_CONNECTION_REFUSED)

Si te apareció este error al intentar conectarte desde tu navegador, se debe a una de las siguientes razones:

1.  **Olvidaste especificar el puerto `:8080`**:
    Por defecto, las páginas web asumen el puerto `80`. GastroLocal corre en el puerto `8080` para evitar conflictos del sistema.
    *   ❌ **Incorrecto**: `http://192.168.1.19`
    *   ✅ **Correcto**: `http://192.168.1.19:8080`

2.  **Intentaste acceder a la IP de la PC sin tener el servidor corriendo en la PC**:
    Si estás corriendo el servidor *dentro del emulador de Android*, la PC no sabe de forma automática que el emulador tiene una web corriendo. Tienes dos soluciones:
    *   **Solución 1**: Ejecuta el comando `adb forward tcp:8080 tcp:8080` en tu PC, y entra a [http://localhost:8080](http://localhost:8080) desde el navegador de la PC.
    *   **Solución 2**: Ejecuta el **Método 1 (gastro_local_pc_server.py)** directamente en tu PC. Así el puerto `8080` estará abierto oficialmente en tu PC y las tablets podrán entrar escribiendo `http://192.168.1.19:8080`.

3.  **Firewall de Windows / Mac bloqueando la conexión**:
    Al arrancar por primera vez el servidor Android en tu celular o el script de Python en tu PC, tu sistema operativo te preguntará: *"¿Desea permitir que Python/Android Studio acceda a redes públicas y privadas?"*.
    *   Asegúrate de **marcar ambas casillas (Redes Privadas y Redes Públicas)** y haz clic en **Permitir**.
    *   Si no lo hiciste, ve al Panel de Control de Windows > Firewall > Permitir una aplicación a través de Firewall, busca "Python" o "Android Studio" y dale permisos de red.

4.  **No están en la misma red Wi-Fi**:
    Tanto tu PC que corre el servidor, como las tablets de tus clientes, deben estar conectadas al **mismo enrutador/router Wi-Fi**. Si la tablet de tu cliente usa datos móviles o está en otra red (por ejemplo, una red Wi-Fi de invitados o un repetidor aislado), no se podrán ver entre sí.

---

## 💾 Persistencia de Datos
*   **En la PC (Python)**: Los datos se guardan en el archivo local `data.json`. Puedes abrir este archivo con el Bloc de Notas para modificar productos o categorías directamente si lo deseas.
*   **En Android (App)**: Los datos se guardan en la base de datos interna **Room** (SQLite) de alta velocidad integrada en el propio dispositivo Android. Categorías, productos o pedidos se guardan de forma persistente y segura en el dispositivo que actúa como servidor.

---

## 📦 Cómo Generar el Instalador de Windows (.exe con Inno Setup)

Para distribuir e instalar GastroLocal en cualquier PC sin necesidad de instalar Python ni abrir consolas:

1. **Método Automático (1 Clic):**
   * Haz doble clic en el archivo **`compilar_todo_a_instalador.bat`**.
   * Este script compilará automáticamente el `.exe` con PyInstaller y generará el instalador `GastroLocal_Instalador_v1.0.exe` en la carpeta `Instalador_Salida\`.

2. **Método Manual con Inno Setup:**
   * Abre una terminal y compila el ejecutable:
     ```bash
     pip install pyinstaller
     pyinstaller --onefile --noconsole --name=GastroLocal --clean gastro_local_pc_server.py
     ```
   * Descarga e instala [Inno Setup](https://jrsoftware.org/isdl.php).
   * Abre el archivo **`setup_gastrolocal.iss`** en Inno Setup.
   * Haz clic en **Compile** (o presiona `F9`). El instalador listo para clientes quedará en `Instalador_Salida/`.

