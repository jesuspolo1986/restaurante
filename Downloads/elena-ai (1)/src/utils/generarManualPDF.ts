/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from "jspdf";

export function generarManualInstalacionPDF() {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 16;

  // Paleta de colores ejecutivos
  const colorPrimario = [15, 23, 42]; // Slate 900
  const colorAcento = [79, 70, 229];  // Indigo 600
  const colorVerde = [16, 185, 129];  // Emerald 500
  const colorGris = [100, 116, 139];  // Slate 500
  const colorFondo = [248, 250, 252]; // Slate 50

  const agregarEncabezadoPie = (numPagina: number, totalPaginas: number) => {
    // Encabezado
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 4, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("SISTEMA POS ELENA PRO - MANUAL DE ARQUITECTURA E INSTALACIÓN", margin, 10);
    doc.text("VERSIÓN 2.5", pageWidth - margin, 10, { align: "right" });

    // Pie de página
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("Documento Oficial de Despliegue Técnico y Operativo", margin, pageHeight - 8);
    doc.text(`Página ${numPagina} de ${totalPaginas}`, pageWidth - margin, pageHeight - 8, { align: "right" });
  };

  const verificarSaltoPagina = (espacioRequerido: number) => {
    if (y + espacioRequerido > pageHeight - 20) {
      doc.addPage();
      y = 16;
      return true;
    }
    return false;
  };

  // ==========================================
  // PÁGINA 1: PORTADA Y RESUMEN EJECUTIVO
  // ==========================================
  y = 20;

  // Banner Portada
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(margin, y, contentWidth, 38, 3, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text("ELENA PRO - SISTEMA POS Y ERP MULTI-SEDE", margin + 8, y + 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(199, 210, 254);
  doc.text("Manual Maestro de Instalación, Configuración de Red, Multi-Cajas y Multi-Sucursales", margin + 8, y + 24);

  y += 46;

  // Sección 1: Topología de Arquitectura
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text("1. TOPOLOGÍAS DE DESPLIEGUE SOPORTADAS", margin, y);
  y += 6;

  const topologias = [
    {
      titulo: "A. MODO MONOPUESTO (Caja Única / Todo en Uno)",
      desc: "Instalado en una sola computadora que actúa como servidor y punto de venta al mismo tiempo. No requiere conexión de red externa.",
      badge: "Ideal para: Negocios Pequeños / Tiendas Individuales"
    },
    {
      titulo: "B. MODO MULTI-CAJAS EN RED LOCAL (Servidor Principal + Terminales LAN / Wi-Fi)",
      desc: "Una PC central actúa como Servidor Maestro. Las demás computadoras, cajas registradoras, laptops, teléfonos móviles y tablets se conectan de forma simultánea vía IP/Wi-Fi en tiempo real sin cables adicionales.",
      badge: "Ideal para: Supermercados, Farmacias, Ferreterías, Tiendas con múltiples cajeros"
    },
    {
      titulo: "C. MODO MULTI-SUCURSALES (Sedes Distribuidas Geográficamente)",
      desc: "Permite gestionar múltiples tiendas físicas (Ej: Sede Norte, Sede Centro, Sede Este, Almacén Central) sincronizadas con base de datos en la nube (Supabase / MariaDB Cloud) con inventarios y reportes consolidados.",
      badge: "Ideal para: Franquicias, Cadenas comerciales, Grupos empresariales"
    }
  ];

  topologias.forEach(t => {
    verificarSaltoPagina(28);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 24, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(79, 70, 229);
    doc.text(t.titulo, margin + 4, y + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    const descLines = doc.splitTextToSize(t.desc, contentWidth - 8);
    doc.text(descLines, margin + 4, y + 12);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(16, 185, 129);
    doc.text(`[+] ${t.badge}`, margin + 4, y + 21);

    y += 28;
  });

  // Sección 2: Requisitos Previos
  verificarSaltoPagina(35);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text("2. REQUISITOS TÉCNICOS PREVIOS", margin, y);
  y += 6;

  const requisitos = [
    "Servidor Maestro: Windows 10/11 o Windows Server (64 bits), 4 GB RAM (8 GB recomendado), Node.js v18+ o Ejecutable Compilado.",
    "Terminales Clientes: Cualquier dispositivo con navegador web moderno (Chrome, Edge, Safari, Firefox). No requiere instalar nada.",
    "Red: Router Wi-Fi o Switch Ethernet común para conectar las terminales en el mismo rango de red local.",
    "Impresoras Térmicas: Impresoras POS estándar USB/Red de 58mm o 80mm con soporte de corte automático y gaveta de dinero."
  ];

  requisitos.forEach(req => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    const lines = doc.splitTextToSize(`•  ${req}`, contentWidth - 4);
    doc.text(lines, margin + 2, y);
    y += lines.length * 4.5;
  });

  // ==========================================
  // PÁGINA 2: GUÍA DE INSTALACIÓN Y FIJACIÓN DE IP
  // ==========================================
  doc.addPage();
  y = 16;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text("3. PASO A PASO: INSTALACIÓN DEL SERVIDOR PRINCIPAL", margin, y);
  y += 7;

  const pasosInstalacion = [
    {
      num: "PASO 1",
      titulo: "Ejecución del Instalador o Despliegue de Archivos",
      detalles: "Ejecutar el instalador oficial 'Instalador_SistemaPOS_v2.5.0.exe' o copiar la carpeta del proyecto. El instalador creará el acceso directo en el escritorio y registrará el servicio de inicio."
    },
    {
      num: "PASO 2",
      titulo: "Fijación de Dirección IP Estática en el Servidor (CRÍTICO)",
      detalles: "Para garantizar que las cajas no pierdan conexión al reiniciar el router:\n1. Haga clic derecho sobre 'fijar_ip_estatica.bat' y seleccione 'Ejecutar como Administrador'.\n2. Presione la opción [1] (Fijar IP actual). El script fijará la IP y configurará automáticamente el Firewall de Windows para el puerto 3000."
    },
    {
      num: "PASO 3",
      titulo: "Inicio del Servicio Elena PRO",
      detalles: "Ejecutar 'Iniciar_ElenaPRO.bat' (o el acceso directo del escritorio). El sistema iniciará en segundo plano en http://localhost:3000 de forma inmediata y automática."
    },
    {
      num: "PASO 4",
      titulo: "Configuración Inicial de la Empresa / Perfil de Negocio",
      detalles: "Ingresar con el usuario 'admin' (Clave por defecto: admin123). Configurar RIF, Nombre Comercial, Monedas, Tasa Oficial BCV y Dirección Fiscal en el menú superior."
    }
  ];

  pasosInstalacion.forEach(p => {
    verificarSaltoPagina(24);
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, contentWidth, 20, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(79, 70, 229);
    doc.text(`${p.num}: ${p.titulo}`, margin + 4, y + 5.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    const dLines = doc.splitTextToSize(p.detalles, contentWidth - 8);
    doc.text(dLines, margin + 4, y + 10.5);

    y += 24;
  });

  // Sección 4: Conectar Cajas Terminales
  y += 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text("4. CÓMO CONECTAR CAJAS REGISTRADORAS Y TERMINALES MÓVILES", margin, y);
  y += 7;

  const terminalesInfo = [
    {
      tipo: "PC o Laptop Secundaria (Caja 2, Caja 3...):",
      pasos: "Abra Google Chrome o Microsoft Edge en la computadora cliente y escriba en la barra de direcciones: http://[IP_DEL_SERVIDOR]:3000 (Ejemplo: http://192.168.1.50:3000). Cree un acceso directo en el escritorio para acceso instantáneo."
    },
    {
      tipo: "Teléfonos Móviles / Tablets (Cajeros y Vendedores de Pasillo):",
      pasos: "Conecte el teléfono a la misma red Wi-Fi del negocio. En el servidor, haga clic en el botón 'Conectar Móvil / Red LAN' en el encabezado para escanear el Código QR con la cámara del celular. Entrará directamente sin escribir la IP."
    },
    {
      tipo: "Gestión de Permisos por Cajero:",
      pasos: "Cree usuarios con rol 'Cajero' o 'Vendedor'. Los cajeros solo verán la pantalla de facturación (POS) y arqueo de su turno, bloqueando el acceso a costos, compras y reportes financieros."
    }
  ];

  terminalesInfo.forEach(t => {
    verificarSaltoPagina(20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(t.tipo, margin + 2, y);
    y += 4.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    const lines = doc.splitTextToSize(t.pasos, contentWidth - 4);
    doc.text(lines, margin + 2, y);
    y += lines.length * 4.2 + 3;
  });

  // ==========================================
  // PÁGINA 3: CONFIGURACIÓN MULTI-SUCURSAL Y SUPERVISIÓN
  // ==========================================
  doc.addPage();
  y = 16;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text("5. GESTIÓN MULTI-SUCURSALES PARA ADMINISTRADORES", margin, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  const multiIntro = "El módulo Multi-Sucursal de Elena PRO permite a los dueños y directores supervisar todas las sedes físicas desde un único panel centralizado, ya sea en local o de forma remota.";
  const multiLines = doc.splitTextToSize(multiIntro, contentWidth);
  doc.text(multiLines, margin, y);
  y += multiLines.length * 4.5 + 4;

  const caracteristicasMulti = [
    {
      tit: "Creación y Gestión de Sedes / Tiendas:",
      desc: "Desde el módulo 'Sucursales', el administrador puede crear nuevas tiendas (Nombre, RIF, Ciudad, Dirección, Teléfono, Encargado) y asignarles el estado Activo/Inactivo."
    },
    {
      tit: "Visualización de Movimientos y Ventas por Sucursal:",
      desc: "El Super-Administrador dispone de un selector global de sucursal en el panel de control. Puede filtrar el Dashboard, Inventarios, Compras y Reportes para ver el rendimiento de una sede específica o el consolidado global de todas las tiendas juntas."
    },
    {
      tit: "Inventario Separado y Transferencias entre Sedes:",
      desc: "Cada producto registra existencias independientes por sede. El sistema permite realizar transferencias de stock entre sucursales (Ej: trasladar 50 unidades de Sede Principal a Sede Centro) con comprobante de despacho."
    },
    {
      tit: "Cierres de Caja y Arqueos por Sede:",
      desc: "Cada sucursal emite sus propios Cortes Z, Cortes X y arqueos de caja física (Efectivo $, Zelle, Binance, Bolívares, Pago Móvil y Punto de Venta). El administrador puede auditoriar los cierres de cada sede en cualquier momento."
    }
  ];

  caracteristicasMulti.forEach(c => {
    verificarSaltoPagina(22);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 18, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(79, 70, 229);
    doc.text(c.tit, margin + 4, y + 5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    const lines = doc.splitTextToSize(c.desc, contentWidth - 8);
    doc.text(lines, margin + 4, y + 10);

    y += 22;
  });

  // Sección 6: Seguridad y Respaldos
  verificarSaltoPagina(40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text("6. POLÍTICAS DE SEGURIDAD, PIN DE SUPERVISOR Y RESPALDOS", margin, y);
  y += 7;

  const seguridadItems = [
    {
      t: "PIN de Supervisor Obligatorio:",
      d: "Las acciones críticas como Anulación de Facturas, Devolución de Mercancía, Descuentos Superiores al límite y Cierres de Turno requieren la validación en tiempo real del PIN de Supervisor de 4 dígitos."
    },
    {
      t: "Bloqueo Automático por Inactividad (10 min):",
      d: "Si una terminal queda desatendida por más de 10 minutos, la pantalla se bloquea automáticamente exigiendo contraseña para proteger los fondos de la caja."
    },
    {
      t: "Copias de Seguridad Automatizadas:",
      d: "El sistema genera respaldos automáticos de la base de datos cada vez que se cierra la sesión del administrador y permite sincronización en la nube (Supabase Backup)."
    }
  ];

  seguridadItems.forEach(s => {
    verificarSaltoPagina(18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`• ${s.t}`, margin + 2, y);
    y += 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const l = doc.splitTextToSize(s.d, contentWidth - 6);
    doc.text(l, margin + 6, y);
    y += l.length * 3.8 + 3;
  });

  // ==========================================
  // PÁGINA 4: ACTUALIZACIONES Y SOPORTE REMOTO (ANYDESK / RUSTDESK)
  // ==========================================
  doc.addPage();
  y = 16;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text("7. ACTUALIZACIONES Y SOPORTE REMOTO (ANYDESK / RUSTDESK)", margin, y);
  y += 6;

  const soporteInfo = [
    {
      titulo: "¿Cómo actualizar sedes remotas (Guanare, Barinas, etc.) sin viajar?",
      desc: "El soporte y las actualizaciones se realizan en menos de 2 minutos vía software de control remoto AnyDesk o RustDesk. No requiere presencia física en la tienda."
    },
    {
      titulo: "Procedimiento de Conexión Remota:",
      desc: "1. El cliente abre AnyDesk y le suministra el código de 9 dígitos por WhatsApp.\n2. Usted se conecta desde su oficina y transfiere el archivo de actualización 'Actualizacion_vX.X.zip'.\n3. Ejecuta 'Actualizar.bat': el script detiene el sistema, realiza un respaldo automático de seguridad de la base de datos (data/farmacia.db) y reemplaza la carpeta compilada dist/."
    },
    {
      titulo: "Protección Total de Datos e Inventarios:",
      desc: "Las actualizaciones NUNCA tocan la base de datos de ventas, inventarios, compras ni la configuración fiscal (.env). Todo el historial comercial permanece 100% intacto."
    },
    {
      titulo: "Actualización Inmediata de Todas las Cajas:",
      desc: "Al actualizar únicamente el Servidor Maestro de la tienda, todas las terminales secundarias (Caja 2, Caja 3, celulares) quedan automáticamente actualizadas al instante al recargar la página (F5)."
    }
  ];

  soporteInfo.forEach(s => {
    verificarSaltoPagina(24);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 20, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(79, 70, 229);
    doc.text(s.titulo, margin + 4, y + 5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    const lines = doc.splitTextToSize(s.desc, contentWidth - 8);
    doc.text(lines, margin + 4, y + 10);

    y += 24;
  });

  // ==========================================
  // PÁGINA 5: TABLA DE REFERENCIA RÁPIDA DE PUERTOS Y COMANDOS
  // ==========================================
  doc.addPage();
  y = 16;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text("8. RESUMEN DE PUERTOS, RUTAS Y COMANDOS DE MANTENIMIENTO", margin, y);
  y += 7;

  // Tabla
  const tablaComandos = [
    ["Recurso / Comando", "Puerto / Ubicación", "Función"],
    ["Servidor Web POS", "Puerto 3000 (TCP)", "Interfaz de venta, cajas y administración"],
    ["Servicio mDNS Bonjour", "Puerto 5353 (UDP)", "Detección automática de terminales móviles"],
    ["Base de Datos SQLite", "data/farmacia.db", "Almacenamiento transaccional de alta velocidad"],
    ["fijar_ip_estatica.bat", "Raíz del Sistema", "Configura IP fija y reglas en Firewall de Windows"],
    ["Iniciar_ElenaPRO.bat", "Raíz del Sistema", "Inicia el servidor en modo segundo plano"],
    ["Cerrar_ElenaPRO.bat", "Raíz del Sistema", "Detiene los procesos del servidor de forma segura"],
    ["AnyDesk / RustDesk", "Software Remoto", "Soporte y aplicación de parches a distancia en 2 min"],
    ["npm run build", "Consola / CMD", "Compila el código de producción en carpeta dist/"]
  ];

  const col1W = 45;
  const col2W = 45;
  const col3W = contentWidth - col1W - col2W;

  tablaComandos.forEach((fila, idx) => {
    const isHeader = idx === 0;
    const altoFila = isHeader ? 7 : 6.5;

    if (isHeader) {
      doc.setFillColor(15, 23, 42);
      doc.rect(margin, y, contentWidth, altoFila, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
    } else {
      doc.setFillColor(idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 250 : 255, idx % 2 === 0 ? 252 : 255);
      doc.rect(margin, y, contentWidth, altoFila, "F");
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y + altoFila, margin + contentWidth, y + altoFila);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
    }

    doc.text(fila[0], margin + 2, y + 4.5);
    doc.text(fila[1], margin + col1W + 2, y + 4.5);
    doc.text(fila[2], margin + col1W + col2W + 2, y + 4.5);

    y += altoFila;
  });

  y += 12;

  // Cuadro de Soporte y Certificación
  doc.setFillColor(238, 242, 255);
  doc.setDrawColor(199, 210, 254);
  doc.roundedRect(margin, y, contentWidth, 32, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(79, 70, 229);
  doc.text("SOPORTE TÉCNICO Y ACTUALIZACIONES", margin + 6, y + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text("Para asistencia técnica en sitio, configuración avanzada de balanzas electrónicas, gavetas de dinero", margin + 6, y + 15);
  doc.text("o integración de impresoras fiscales personalizadas, contacte al departamento de soporte oficial.", margin + 6, y + 20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(16, 185, 129);
  doc.text("Sistema POS Certificado para Entornos de Alta Demancia y Operación Continua 24/7", margin + 6, y + 26);

  // Agregar números de página a todas las hojas
  const totalHojas = doc.getNumberOfPages();
  for (let i = 1; i <= totalHojas; i++) {
    doc.setPage(i);
    agregarEncabezadoPie(i, totalHojas);
  }

  // Descargar el archivo PDF
  doc.save("Manual_Instalacion_Elena_PRO_MultiSede.pdf");
}
