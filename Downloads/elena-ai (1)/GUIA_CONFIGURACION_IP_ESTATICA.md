# Guía de Implementación: IP Estática y Conectividad Estable para Elena PRO

Esta guía está diseñada para técnicos, instaladores y propietarios de farmacias o comercios que utilizan **Elena PRO**.

---

## 🎯 ¿Por qué es importante fijar una IP Estática en la PC Servidor?

En una farmacia o comercio con múltiples puntos de venta (cajas secundarias, celulares para inventario, tablets para auditoría o comandas), todos los dispositivos se conectan a la **PC Servidor** a través de su dirección IP local (por ejemplo `http://192.168.1.15:3000`).

Si la PC Servidor tiene una IP dinámica (DHCP):
- Cada vez que se reinicie el router o se corte la luz, el router podría cambiarle la IP a la computadora (por ejemplo de `192.168.1.15` a `192.168.1.42`).
- Esto ocasionaría que los celulares, tablets y cajas secundarias pierdan la conexión y haya que volver a escanear los códigos QR o cambiar los accesos directos.

**Solución definitiva:** Fijar la IP del Servidor con el script automático `fijar_ip_estatica.bat`.

---

## 🚀 Método 1: Ejecución Automática con `fijar_ip_estatica.bat` (Recomendado)

Elena PRO incluye el script interactivo **`fijar_ip_estatica.bat`** en su carpeta raíz y en el modal de red del sistema.

### Pasos de ejecución:
1. Dirígete a la carpeta principal donde está instalado **Elena PRO** (o descárgalo desde el botón *"Script IP Estática (.bat)"* dentro del modal de conexión en el sistema).
2. Haz **clic derecho** sobre el archivo `fijar_ip_estatica.bat`.
3. Selecciona **"Ejecutar como administrador"**. *(Si Windows solicita confirmación de control de cuentas de usuario UAC, presiona **Sí**)*.
4. El asistente detectará automáticamente tu adaptador de red activo (Wi-Fi o Cable Ethernet) y te mostrará el menú principal:

```text
=======================================================================
             ELENA PRO - GESTOR DE IP ESTÁTICA PARA SERVIDOR
=======================================================================
 - Adaptador Activo   : Wi-Fi (o Ethernet)
 - IP Actual Asignada : 192.168.1.15
 - Mascara de Subred  : 255.255.255.0
 - Puerta de Enlace   : 192.168.1.1 (Router)
 - Puerto del Sistema : 3000
-----------------------------------------------------------------------

 [1] FIJAR AUTOMÁTICAMENTE LA IP ACTUAL (192.168.1.15) [RECOMENDADO]
 [2] ASIGNAR UNA IP ESTÁTICA PERSONALIZADA (Ej: 192.168.1.200)
 [3] RESTAURAR A DHCP (IP DINÁMICA / AUTOMÁTICA)
 [4] SOLO ABRIR PUERTO 3000 EN EL FIREWALL DE WINDOWS
 [5] SALIR
```

5. Presiona la tecla **`1`** y luego **Enter**.
6. **¡Listo!** El script:
   - Congelará la IP actual para que nunca más cambie.
   - Configurará los servidores DNS confiables de Google (`8.8.8.8`) y Cloudflare (`1.1.1.1`).
   - Creará automáticamente las reglas en el Firewall de Windows para los puertos `3000` (Elena PRO) y `5353` (mDNS Bonjour).

---

## 🛠️ Método 2: Configuración Manual en Windows (Alternativa)

Si prefieres realizar la configuración manualmente desde Windows:

1. Presiona `Windows + R`, escribe `ncpa.cpl` y presiona **Enter**.
2. Haz clic derecho sobre tu adaptador de red activo (Ethernet o Wi-Fi) y selecciona **Propiedades**.
3. Selecciona **"Protocolo de Internet versión 4 (TCP/IPv4)"** y haz clic en **Propiedades**.
4. Marca la opción **"Usar la siguiente dirección IP"**:
   - **Dirección IP**: `192.168.1.150` (o la IP actual de tu equipo).
   - **Máscara de subred**: `255.255.255.0`.
   - **Puerta de enlace predeterminada**: `192.168.1.1` (la IP de tu router).
5. Marca **"Usar las siguientes direcciones de servidor DNS"**:
   - **Servidor DNS preferido**: `8.8.8.8`
   - **Servidor DNS alternativo**: `1.1.1.1`
6. Haz clic en **Aceptar** y luego en **Cerrar**.

---

## 🛡️ Apertura del Puerto 3000 en el Firewall de Windows

Si otros equipos dan error *"No se puede acceder al sitio / Error -118"*, ejecuta una consola de comandos (**CMD**) como Administrador y pega el siguiente comando:

```cmd
netsh advfirewall firewall add rule name="Elena PRO Servidor (Puerto 3000)" dir=in action=allow protocol=TCP localport=3000 profile=any
```

---

## 🌐 Reserva de IP en el Router (Mejor Práctica Adicional)

Para una estabilidad de nivel empresarial:
1. Accede al panel de administración del Router (`192.168.1.1` o `192.168.0.1`).
2. Entra en la sección **DHCP / Address Reservation / IP-MAC Binding**.
3. Añade la dirección física (MAC) de la computadora servidora y asígnale su IP fija.
4. Con esto, tanto Windows como el Router estarán 100% coordinados.
