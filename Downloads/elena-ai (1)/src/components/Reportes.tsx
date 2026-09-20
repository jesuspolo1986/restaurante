/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  DollarSign, 
  Download, 
  RefreshCw, 
  Search, 
  Layers, 
  CreditCard, 
  ShoppingBag, 
  ChevronDown, 
  ChevronUp, 
  Filter, 
  Info,
  CheckCircle2,
  BookOpen,
  Printer,
  Undo,
  Briefcase,
  UserCheck,
  Wrench,
  Tag,
  Clock,
  BarChart2,
  X,
  Sliders
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Venta, Producto, PagoMetodo, Pedido } from "../types";
import ThermalTicketModal from "./ThermalTicketModal";
import { apiFetch } from "../utils/api";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  Cell, 
  PieChart, 
  Pie, 
  Legend 
} from "recharts";

type RangoPeriodo = "hoy" | "ayer" | "semana" | "mes_30" | "mes_actual" | "todos" | "personalizado";

export default function Reportes() {
  const [seccionReporte, setSeccionReporte] = useState<"VENTAS" | "TRABAJOS">("VENTAS");
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [tasa, setTasa] = useState(36.50);

  // Filtros adicionales para Reporte de Trabajos
  const [filtroDepReporte, setFiltroDepReporte] = useState("");
  const [filtroOperadorReporte, setFiltroOperadorReporte] = useState("");

  // Impresión Térmica
  const [ventaParaImprimir, setVentaParaImprimir] = useState<Venta | null>(null);
  const [mostrarTicketModal, setMostrarTicketModal] = useState(false);

  // Filtros
  const [periodo, setPeriodo] = useState<RangoPeriodo>("mes_30");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [filtroPago, setFiltroPago] = useState<string>("TODOS");
  const [filtroTipoVenta, setFiltroTipoVenta] = useState<"TODAS" | "FISCAL" | "NO_FISCAL">("TODAS");
  const [buscarProducto, setBuscarProducto] = useState("");
  const [busquedaVenta, setBusquedaVenta] = useState("");
  const [filtroMontoMinUSD, setFiltroMontoMinUSD] = useState("");
  const [filtroMontoMaxUSD, setFiltroMontoMaxUSD] = useState("");
  const [filtroDescuento, setFiltroDescuento] = useState<"todos" | "con_descuento" | "sin_descuento">("todos");
  const [filtroCategoriaItems, setFiltroCategoriaItems] = useState<string>("TODAS");
  const [ordenarVentasPor, setOrdenarVentasPor] = useState<"fecha_desc" | "fecha_asc" | "monto_desc" | "monto_asc" | "items_desc">("fecha_desc");
  const [mostrarFiltrosAvanzadosVentas, setMostrarFiltrosAvanzadosVentas] = useState(false);

  // Filtros Trabajos
  const [filtroEstadoTrabajo, setFiltroEstadoTrabajo] = useState<string>("");
  const [filtroSaldoTrabajo, setFiltroSaldoTrabajo] = useState<"todos" | "con_saldo" | "pagados">("todos");
  const [busquedaTrabajo, setBusquedaTrabajo] = useState("");

  const limpiarFiltrosVentas = () => {
    setPeriodo("mes_30");
    setFechaInicio("");
    setFechaFin("");
    setFiltroPago("TODOS");
    setFiltroTipoVenta("TODAS");
    setBuscarProducto("");
    setBusquedaVenta("");
    setFiltroMontoMinUSD("");
    setFiltroMontoMaxUSD("");
    setFiltroDescuento("todos");
    setFiltroCategoriaItems("TODAS");
    setOrdenarVentasPor("fecha_desc");
  };

  const limpiarFiltrosTrabajos = () => {
    setPeriodo("mes_30");
    setFiltroDepReporte("");
    setFiltroOperadorReporte("");
    setFiltroEstadoTrabajo("");
    setFiltroSaldoTrabajo("todos");
    setBusquedaTrabajo("");
  };

  // UI States
  const [ventaExpandida, setVentaExpandida] = useState<string | null>(null);

  // Devoluciones
  const [ventaParaDevolver, setVentaParaDevolver] = useState<Venta | null>(null);
  const [cantidadesDevolver, setCantidadesDevolver] = useState<Record<string, number>>({});
  const [motivoDevolucion, setMotivoDevolucion] = useState("");
  const [procesandoDevolucion, setProcesandoDevolucion] = useState(false);
  const [errorDevolucion, setErrorDevolucion] = useState<string | null>(null);
  const [confirmandoDevolucion, setConfirmandoDevolucion] = useState(false);
  const [pinSupervisor, setPinSupervisor] = useState("");
  const [devolucionExitosaInfo, setDevolucionExitosaInfo] = useState<{
    mensaje: string;
    totalReembolsoUSD: number;
    fueAjustadoCredito: boolean;
    saldoRestanteDeudor?: number;
  } | null>(null);

  const iniciarDevolucion = (v: Venta) => {
    setVentaParaDevolver(v);
    const iniciales: Record<string, number> = {};
    v.items.forEach(it => {
      iniciales[it.producto_id] = 0;
    });
    setCantidadesDevolver(iniciales);
    setMotivoDevolucion("");
    setPinSupervisor("");
    setDevolucionExitosaInfo(null);
    setErrorDevolucion(null);
    setConfirmandoDevolucion(false);
  };

  const prepararDevolucion = () => {
    setErrorDevolucion(null);
    if (!ventaParaDevolver) return;
    
    // Filtrar items que tienen cantidad > 0 para devolver
    const itemsADevolver = Object.entries(cantidadesDevolver)
      .map(([producto_id, cantidad]) => ({ producto_id, cantidad }))
      .filter(it => it.cantidad > 0);

    if (itemsADevolver.length === 0) {
      setErrorDevolucion("Por favor ingrese la cantidad a devolver para al menos un medicamento");
      return;
    }

    if (!motivoDevolucion.trim()) {
      setErrorDevolucion("Por favor escriba o seleccione el motivo de la devolución");
      return;
    }

    setConfirmandoDevolucion(true);
  };

  const ejecutarDevolucion = async () => {
    if (!ventaParaDevolver) return;
    
    if (!pinSupervisor.trim()) {
      setErrorDevolucion("Por favor ingrese el PIN de Supervisor para autorizar la devolución");
      return;
    }

    setProcesandoDevolucion(true);
    setErrorDevolucion(null);

    try {
      // 1. Verificar PIN de Supervisor en el Servidor
      const pinRes = await apiFetch("/api/usuarios/verificar-pin-supervisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinSupervisor })
      });
      const pinData = await pinRes.json();
      if (!pinRes.ok || !pinData.valido) {
        setErrorDevolucion(pinData.error || "PIN de Supervisor incorrecto. Autorización denegada.");
        setProcesandoDevolucion(false);
        return;
      }

      // 2. Si el PIN es correcto, ejecutar la devolución real
      const itemsADevolver = Object.entries(cantidadesDevolver)
        .map(([producto_id, cantidad]) => ({ producto_id, cantidad }))
        .filter(it => it.cantidad > 0);

      const res = await apiFetch("/api/ventas/devolver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venta_id: ventaParaDevolver.id,
          items: itemsADevolver,
          motivo: `${motivoDevolucion} (Autorizado por Supervisor)`
        })
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        setDevolucionExitosaInfo({
          mensaje: data.mensaje || "Devolución procesada con éxito",
          totalReembolsoUSD: data.totalReembolsoUSD,
          fueAjustadoCredito: data.fueAjustadoCredito,
          saldoRestanteDeudor: data.saldoRestanteDeudor
        });
        cargarDatos();
      } else {
        setErrorDevolucion(data.error || "Ocurrió un error al procesar la devolución");
        setConfirmandoDevolucion(false);
      }
    } catch (err) {
      console.error(err);
      setErrorDevolucion("Error de conexión al procesar la devolución");
      setConfirmandoDevolucion(false);
    } finally {
      setProcesandoDevolucion(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [resVentas, resProductos, resTasa, resPedidos] = await Promise.all([
        apiFetch("/api/ventas").then(r => r.json()).catch(() => []),
        apiFetch("/api/productos").then(r => r.json()).catch(() => []),
        apiFetch("/api/dolar").then(r => r.json()).catch(() => ({ tasa: 36.5 })),
        apiFetch("/api/pedidos").then(r => r.json()).catch(() => [])
      ]);
      setVentas(Array.isArray(resVentas) ? resVentas : []);
      setProductos(Array.isArray(resProductos) ? resProductos : []);
      setPedidos(Array.isArray(resPedidos) ? resPedidos : []);
      if (resTasa && resTasa.tasa) {
        setTasa(resTasa.tasa);
      }
    } catch (err) {
      console.error("Error cargando datos de reportes:", err);
    } finally {
      setCargando(false);
    }
  };

  // Crear mapa de costos para lookup ultra-rápido
  const costosMap = new Map<string, number>();
  productos.forEach(p => {
    costosMap.set(p.id, p.precio_compra);
  });

  // Filtro de fecha
  const cumpleFiltroFecha = (ventaFechaStr: string) => {
    const vFecha = new Date(ventaFechaStr);
    const hoy = new Date();
    
    // Resetear horas para comparación exacta de días
    const hoyReset = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const vReset = new Date(vFecha.getFullYear(), vFecha.getMonth(), vFecha.getDate());

    if (periodo === "hoy") {
      return vReset.getTime() === hoyReset.getTime();
    }
    if (periodo === "ayer") {
      const ayerReset = new Date(hoyReset);
      ayerReset.setDate(ayerReset.getDate() - 1);
      return vReset.getTime() === ayerReset.getTime();
    }
    if (periodo === "semana") {
      const hace7Dias = new Date(hoyReset);
      hace7Dias.setDate(hace7Dias.getDate() - 7);
      return vReset >= hace7Dias && vReset <= hoyReset;
    }
    if (periodo === "mes_30") {
      const hace30Dias = new Date(hoyReset);
      hace30Dias.setDate(hace30Dias.getDate() - 30);
      return vReset >= hace30Dias && vReset <= hoyReset;
    }
    if (periodo === "mes_actual") {
      return vFecha.getMonth() === hoy.getMonth() && vFecha.getFullYear() === hoy.getFullYear();
    }
    if (periodo === "personalizado") {
      if (!fechaInicio && !fechaFin) return true;
      let cumple = true;
      if (fechaInicio) {
        const fIni = new Date(fechaInicio + "T00:00:00");
        cumple = cumple && vReset >= fIni;
      }
      if (fechaFin) {
        const fFin = new Date(fechaFin + "T23:59:59");
        cumple = cumple && vReset <= fFin;
      }
      return cumple;
    }
    return true; // "todos"
  };

  // Filtrar Ventas
  const ventasFiltradas = ventas.filter(v => {
    // 1. Filtro de fecha
    if (!cumpleFiltroFecha(v.fecha)) return false;

    // 2. Filtro de tipo de venta (Fiscal vs Nota de Entrega)
    if (filtroTipoVenta === "FISCAL" && v.sin_factura) return false;
    if (filtroTipoVenta === "NO_FISCAL" && !v.sin_factura) return false;

    // 3. Filtro de tipo de pago
    if (filtroPago !== "TODOS") {
      const tieneMetodo = v.pagos.some(p => p.metodo === filtroPago);
      if (!tieneMetodo) return false;
    }

    // 4. Búsqueda por texto (Factura, Cliente, CI/RIF, o Producto)
    if (busquedaVenta.trim()) {
      const term = busquedaVenta.trim().toLowerCase();
      const matchFactura = (v.factura_numero || v.id || "").toLowerCase().includes(term);
      const matchCliente = (v.cliente_nombre || "").toLowerCase().includes(term);
      const matchDoc = (v.cliente_id || "").toLowerCase().includes(term);
      const matchItems = v.items.some(it => it.nombre.toLowerCase().includes(term));
      if (!matchFactura && !matchCliente && !matchDoc && !matchItems) return false;
    }

    // 5. Filtro por Rango de Monto USD
    if (filtroMontoMinUSD !== "") {
      const min = parseFloat(filtroMontoMinUSD);
      if (!isNaN(min) && v.total_usd < min) return false;
    }
    if (filtroMontoMaxUSD !== "") {
      const max = parseFloat(filtroMontoMaxUSD);
      if (!isNaN(max) && v.total_usd > max) return false;
    }

    // 6. Filtro por Descuento
    if (filtroDescuento === "con_descuento" && (!v.descuento_usd || v.descuento_usd <= 0)) return false;
    if (filtroDescuento === "sin_descuento" && (v.descuento_usd && v.descuento_usd > 0)) return false;

    // 7. Filtro por Categoría de Ítems en la venta
    if (filtroCategoriaItems !== "TODAS") {
      const tieneCategoria = v.items.some(it => (it.categoria || "MEDICAMENTO") === filtroCategoriaItems);
      if (!tieneCategoria) return false;
    }

    return true;
  });

  // Ordenamiento de Ventas
  const ventasOrdenadas = [...ventasFiltradas].sort((a, b) => {
    if (ordenarVentasPor === "fecha_desc") return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
    if (ordenarVentasPor === "fecha_asc") return new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
    if (ordenarVentasPor === "monto_desc") return b.total_usd - a.total_usd;
    if (ordenarVentasPor === "monto_asc") return a.total_usd - b.total_usd;
    if (ordenarVentasPor === "items_desc") return b.items.reduce((s, i) => s + i.cantidad, 0) - a.items.reduce((s, i) => s + i.cantidad, 0);
    return 0;
  });

  // --- CALCULOS METRICOS CONSOLIDADOS ---
  let totalFacturadoConImpuestosUSD = 0; // Incluye IVA + IGTF
  let totalVentasNetasUSD = 0;          // Ventas netas de productos, descontando rebajas
  let totalCostosUSD = 0;               // Costo de compra de los productos vendidos
  let totalImpuestosUSD = 0;            // IVA + IGTF recaudado
  let totalDescuentosUSD = 0;           // Rebajas por incentivo de efectivo divisas
  let totalIgtfRecaudadoUSD = 0;

  // Mapa de métodos de pago consolidado
  const consolidadoPagos: Record<string, { totalUSD: number; totalBS: number; count: number }> = {
    PUNTO: { totalUSD: 0, totalBS: 0, count: 0 },
    PAGO_MOVIL: { totalUSD: 0, totalBS: 0, count: 0 },
    EFECTIVO_BS: { totalUSD: 0, totalBS: 0, count: 0 },
    EFECTIVO_USD: { totalUSD: 0, totalBS: 0, count: 0 },
    ZELLE: { totalUSD: 0, totalBS: 0, count: 0 },
    CREDITO: { totalUSD: 0, totalBS: 0, count: 0 }
  };

  // Mapa de categorías de productos vendido
  const consolidadoCategorias: Record<string, { totalUSD: number; cantidad: number }> = {
    MEDICAMENTO: { totalUSD: 0, cantidad: 0 },
    EXENTO: { totalUSD: 0, cantidad: 0 },
    GRAVADO_16: { totalUSD: 0, cantidad: 0 }
  };

  // Mapa de productos individuales vendidos
  const productosVendidosMap = new Map<string, {
    id: string;
    nombre: string;
    categoria: string;
    cantidad: number;
    ingresoUSD: number;
    costoTotalUSD: number;
  }>();

  ventasFiltradas.forEach(v => {
    totalFacturadoConImpuestosUSD += v.total_usd;
    totalImpuestosUSD += (v.monto_iva + v.monto_igtf);
    totalDescuentosUSD += (v.descuento_usd || 0);
    totalIgtfRecaudadoUSD += v.monto_igtf;

    // Venta Neta = Exento + Base Imponible - Descuento
    const ventaNeta = v.monto_exento + v.base_imponible - (v.descuento_usd || 0);
    totalVentasNetasUSD += ventaNeta;

    // Calcular costo de productos de esta venta
    let costoVentaUSD = 0;
    v.items.forEach(it => {
      const costoUnitario = costosMap.get(it.producto_id) ?? (it.precio_unitario * 0.7); // Fallback del 30% ganancia
      const costoItemTotal = costoUnitario * it.cantidad;
      costoVentaUSD += costoItemTotal;

      // Consolidar categorías
      const cat = it.categoria || "MEDICAMENTO";
      if (consolidadoCategorias[cat]) {
        consolidadoCategorias[cat].totalUSD += it.precio_unitario * it.cantidad;
        consolidadoCategorias[cat].cantidad += it.cantidad;
      }

      // Consolidar producto individual
      const key = it.producto_id;
      const exist = productosVendidosMap.get(key);
      if (exist) {
        exist.cantidad += it.cantidad;
        exist.ingresoUSD += (it.precio_unitario * it.cantidad);
        exist.costoTotalUSD += costoItemTotal;
      } else {
        productosVendidosMap.set(key, {
          id: it.producto_id,
          nombre: it.nombre,
          categoria: cat,
          cantidad: it.cantidad,
          ingresoUSD: it.precio_unitario * it.cantidad,
          costoTotalUSD: costoItemTotal
        });
      }
    });

    totalCostosUSD += costoVentaUSD;

    // Consolidar métodos de pago
    v.pagos.forEach(p => {
      const met = p.metodo;
      if (consolidadoPagos[met]) {
        consolidadoPagos[met].totalUSD += p.montoUSD;
        consolidadoPagos[met].totalBS += p.montoBS;
        consolidadoPagos[met].count += 1;
      }
    });
  });

  const totalGananciaNetaUSD = Math.max(0, totalVentasNetasUSD - totalCostosUSD);
  const margenGananciaNeta = totalVentasNetasUSD > 0 ? (totalGananciaNetaUSD / totalVentasNetasUSD) * 100 : 0;

  // --- DATOS PARA GRÁFICOS ---
  
  // 1. Tendencia de Ventas (Agrupado por Día)
  const ventasPorDia: Record<string, { fechaLabel: string; Netas: number; Ganancias: number; Transacciones: number }> = {};
  
  ventasFiltradas.forEach(v => {
    const fStr = v.fecha.split("T")[0]; // YYYY-MM-DD
    // Formatear fecha para el eje X
    const [y, m, d] = fStr.split("-");
    const label = `${d}/${m}`;

    let costoVentaUSD = 0;
    v.items.forEach(it => {
      const costoUnitario = costosMap.get(it.producto_id) ?? (it.precio_unitario * 0.7);
      costoVentaUSD += costoUnitario * it.cantidad;
    });

    const ventaNeta = v.monto_exento + v.base_imponible - (v.descuento_usd || 0);
    const gananciaVenta = Math.max(0, ventaNeta - costoVentaUSD);

    if (ventasPorDia[fStr]) {
      ventasPorDia[fStr].Netas += ventaNeta;
      ventasPorDia[fStr].Ganancias += gananciaVenta;
      ventasPorDia[fStr].Transacciones += 1;
    } else {
      ventasPorDia[fStr] = {
        fechaLabel: label,
        Netas: ventaNeta,
        Ganancias: gananciaVenta,
        Transacciones: 1
      };
    }
  });

  // Ordenar días cronológicamente
  const datosTendencia = Object.keys(ventasPorDia)
    .sort()
    .map(key => ({
      fecha: ventasPorDia[key].fechaLabel,
      "Ventas Netas ($)": Number(ventasPorDia[key].Netas.toFixed(2)),
      "Ganancia Neta ($)": Number(ventasPorDia[key].Ganancias.toFixed(2)),
      Transacciones: ventasPorDia[key].Transacciones
    }));

  // 2. Distribución de Métodos de Pago (para Gráfico Circular / Torta)
  const COLORES_PAGO: Record<string, string> = {
    PUNTO: "#4f46e5",       // Indigo
    PAGO_MOVIL: "#06b6d4",   // Cyan
    EFECTIVO_BS: "#f59e0b",  // Amber
    EFECTIVO_USD: "#10b981", // Emerald
    ZELLE: "#8b5cf6",        // Purple
    CREDITO: "#ef4444"       // Red
  };

  const datosPagosChart = Object.keys(consolidadoPagos)
    .map(k => ({
      name: k.replace("_", " "),
      value: Number(consolidadoPagos[k].totalUSD.toFixed(2)),
      color: COLORES_PAGO[k] || "#64748b"
    }))
    .filter(d => d.value > 0);

  // 3. Distribución de Categorías
  const datosCategoriasChart = Object.keys(consolidadoCategorias).map(k => ({
    name: k,
    "Ventas ($)": Number(consolidadoCategorias[k].totalUSD.toFixed(2)),
    Unidades: consolidadoCategorias[k].cantidad
  }));

  // --- TABLA DE MEDICAMENTOS VENDIDOS (BÚSQUEDA Y ORDEN) ---
  const productosVendidosLista = Array.from(productosVendidosMap.values())
    .map(p => {
      const ganancia = Math.max(0, p.ingresoUSD - p.costoTotalUSD);
      const margen = p.ingresoUSD > 0 ? (ganancia / p.ingresoUSD) * 100 : 0;
      return {
        ...p,
        gananciaUSD: Number(ganancia.toFixed(2)),
        margen: Number(margen.toFixed(1))
      };
    })
    .filter(p => p.nombre.toLowerCase().includes(buscarProducto.toLowerCase()))
    .sort((a, b) => b.cantidad - a.cantidad); // Ordenar por más vendido por defecto

  // --- EXPORTAR REPORTES CSV ---
  const exportarReporteCompletoCSV = () => {
    if (ventasFiltradas.length === 0) {
      alert("No hay ventas en este período para exportar.");
      return;
    }

    const headers = [
      "ID Venta",
      "Factura/Nota",
      "Fecha",
      "Cliente ID/Rif",
      "Cliente Nombre",
      "Tasa BCV (Bs)",
      "Monto Exento ($)",
      "Base Imponible ($)",
      "Descuento divisa ($)",
      "Venta Neta ($)",
      "Monto IVA ($)",
      "Monto IGTF ($)",
      "Total Recaudado ($)",
      "Total Recaudado (Bs)",
      "Costo Mercancia ($)",
      "Ganancia Neta ($)"
    ];

    const dataRows = ventasFiltradas.map(v => {
      const ventaNeta = v.monto_exento + v.base_imponible - (v.descuento_usd || 0);
      let costoVentaUSD = 0;
      v.items.forEach(it => {
        const costoUnitario = costosMap.get(it.producto_id) ?? (it.precio_unitario * 0.7);
        costoVentaUSD += costoUnitario * it.cantidad;
      });
      const ganancia = Math.max(0, ventaNeta - costoVentaUSD);

      return [
        v.id,
        v.factura_numero,
        new Date(v.fecha).toLocaleDateString("es-VE") + " " + new Date(v.fecha).toLocaleTimeString("es-VE"),
        v.cliente_id,
        v.cliente_nombre,
        v.tasa.toFixed(2),
        v.monto_exento.toFixed(2),
        v.base_imponible.toFixed(2),
        (v.descuento_usd || 0).toFixed(2),
        ventaNeta.toFixed(2),
        v.monto_iva.toFixed(2),
        v.monto_igtf.toFixed(2),
        v.total_usd.toFixed(2),
        v.total_bs.toFixed(2),
        costoVentaUSD.toFixed(2),
        ganancia.toFixed(2)
      ];
    });

    const csvContent = [
      headers.join(","),
      ...dataRows.map(row => 
        row.map((val: any) => {
          let text = String(val === null || val === undefined ? "" : val);
          text = text.replace(/"/g, '""');
          if (text.includes(",") || text.includes("\n") || text.includes("\r") || text.includes('"')) {
            text = `"${text}"`;
          }
          return text;
        }).join(",")
      )
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Reporte_Financiero_Elena_${periodo}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportarMedicamentosVendidosCSV = () => {
    if (productosVendidosLista.length === 0) {
      alert("No hay productos vendidos en este período para exportar.");
      return;
    }

    const headers = [
      "ID Medicamento",
      "Nombre",
      "Categoría",
      "Cantidad Vendida (Unidades)",
      "Ingresos Totales ($)",
      "Costos Totales ($)",
      "Ganancia Neta ($)",
      "Margen de Ganancia (%)"
    ];

    const dataRows = productosVendidosLista.map(p => [
      p.id,
      p.nombre,
      p.categoria,
      p.cantidad,
      p.ingresoUSD.toFixed(2),
      p.costoTotalUSD.toFixed(2),
      p.gananciaUSD.toFixed(2),
      p.margen.toFixed(1)
    ]);

    const csvContent = [
      headers.join(","),
      ...dataRows.map(row => 
        row.map((val: any) => {
          let text = String(val === null || val === undefined ? "" : val);
          text = text.replace(/"/g, '""');
          if (text.includes(",") || text.includes("\n") || text.includes("\r") || text.includes('"')) {
            text = `"${text}"`;
          }
          return text;
        }).join(",")
      )
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Medicamentos_Mas_Vendidos_Elena_${periodo}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- CALCULOS METRICOS DE TRABAJOS Y PEDIDOS ---
  const pedidosFiltrados = pedidos.filter(p => {
    // 1. Filtro de fecha
    if (!cumpleFiltroFecha(p.fecha_pedido)) return false;
    // 2. Filtro departamento
    if (filtroDepReporte && p.departamento_servicio !== filtroDepReporte) return false;
    // 3. Filtro operador / asignado
    if (filtroOperadorReporte && (!p.asignado_a || !p.asignado_a.toLowerCase().includes(filtroOperadorReporte.toLowerCase()))) return false;
    // 4. Filtro estado
    if (filtroEstadoTrabajo && p.estado !== filtroEstadoTrabajo) return false;
    // 5. Filtro saldo
    const saldo = (p.monto_total || 0) - (p.anticipo || 0);
    if (filtroSaldoTrabajo === "con_saldo" && saldo <= 0) return false;
    if (filtroSaldoTrabajo === "pagados" && saldo > 0) return false;
    // 6. Búsqueda por texto
    if (busquedaTrabajo.trim()) {
      const term = busquedaTrabajo.trim().toLowerCase();
      const matchCliente = `${p.nombres} ${p.apellidos || ''}`.toLowerCase().includes(term);
      const matchCedula = (p.cedula || '').toLowerCase().includes(term);
      const matchDesc = (p.descripcion || '').toLowerCase().includes(term);
      const matchNotas = (p.notas_operativas || '').toLowerCase().includes(term);
      if (!matchCliente && !matchCedula && !matchDesc && !matchNotas) return false;
    }
    return true;
  });

  let totalTrabajosMontoUSD = 0;
  let totalTrabajosAnticipoUSD = 0;
  let totalTrabajosPendienteUSD = 0;

  const estadoContadores = {
    Pendiente: 0,
    "En Proceso": 0,
    Terminado: 0,
    Entregado: 0
  };

  const departamentoConsolidado: Record<string, { cantidad: number; montoUSD: number; completados: number }> = {};
  const operadorConsolidado: Record<string, { cantidad: number; montoUSD: number; completados: number }> = {};

  pedidosFiltrados.forEach(p => {
    totalTrabajosMontoUSD += p.monto_total || 0;
    totalTrabajosAnticipoUSD += p.anticipo || 0;
    const saldo = (p.monto_total || 0) - (p.anticipo || 0);
    if (saldo > 0) totalTrabajosPendienteUSD += saldo;

    if (estadoContadores[p.estado] !== undefined) {
      estadoContadores[p.estado]++;
    }

    const dep = p.departamento_servicio || "General";
    if (!departamentoConsolidado[dep]) {
      departamentoConsolidado[dep] = { cantidad: 0, montoUSD: 0, completados: 0 };
    }
    departamentoConsolidado[dep].cantidad++;
    departamentoConsolidado[dep].montoUSD += (p.monto_total || 0);
    if (p.estado === "Terminado" || p.estado === "Entregado") {
      departamentoConsolidado[dep].completados++;
    }

    const op = p.asignado_a || "Sin Asignar";
    if (!operadorConsolidado[op]) {
      operadorConsolidado[op] = { cantidad: 0, montoUSD: 0, completados: 0 };
    }
    operadorConsolidado[op].cantidad++;
    operadorConsolidado[op].montoUSD += (p.monto_total || 0);
    if (p.estado === "Terminado" || p.estado === "Entregado") {
      operadorConsolidado[op].completados++;
    }
  });

  const exportarTrabajosCSV = () => {
    if (pedidosFiltrados.length === 0) {
      alert("No hay registros de trabajos/pedidos para exportar.");
      return;
    }

    const headers = [
      "ID Pedido",
      "Cliente",
      "Cédula",
      "Teléfono",
      "Área / Departamento",
      "Asignado a (Operador)",
      "Descripción del Trabajo",
      "Notas Operativas",
      "Estado",
      "Fecha Pedido",
      "Entrega Estimada",
      "Presupuesto Total ($)",
      "Anticipo ($)",
      "Pendiente ($)"
    ];

    const dataRows = pedidosFiltrados.map(p => [
      p.id,
      `${p.nombres} ${p.apellidos || ""}`.trim(),
      p.cedula,
      p.telefono,
      p.departamento_servicio || "General",
      p.asignado_a || "Sin Asignar",
      p.descripcion,
      p.notas_operativas || "",
      p.estado,
      p.fecha_pedido,
      p.fecha_entrega_estimada || "",
      (p.monto_total || 0).toFixed(2),
      (p.anticipo || 0).toFixed(2),
      ((p.monto_total || 0) - (p.anticipo || 0)).toFixed(2)
    ]);

    const csvContent = [
      headers.join(","),
      ...dataRows.map(row => 
        row.map((val: any) => {
          let text = String(val === null || val === undefined ? "" : val);
          text = text.replace(/"/g, '""');
          if (text.includes(",") || text.includes("\n") || text.includes("\r") || text.includes('"')) {
            text = `"${text}"`;
          }
          return text;
        }).join(",")
      )
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Reporte_Trabajos_Realizados_${periodo}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. HEADER & SECTION SWITCHER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {seccionReporte === "VENTAS" ? "Análisis y Reportes Financieros" : "Reporte de Trabajos Realizados y Pedidos"}
          </h1>
          <p className="text-sm text-slate-500">
            {seccionReporte === "VENTAS" 
              ? "Métricas avanzadas de ventas netas, costos, rebajas y márgenes de ganancia."
              : "Desglose operativo de trabajos por departamento, operador asignado y estado."}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-2xl shrink-0 border border-slate-200/60 self-start md:self-auto">
          <button
            onClick={() => setSeccionReporte("VENTAS")}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-2 cursor-pointer ${
              seccionReporte === "VENTAS"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <DollarSign className="w-4 h-4" /> Ventas y Finanzas
          </button>
          <button
            onClick={() => setSeccionReporte("TRABAJOS")}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-2 cursor-pointer ${
              seccionReporte === "TRABAJOS"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Briefcase className="w-4 h-4" /> Trabajos y Pedidos
          </button>
        </div>

        <div className="flex gap-2 shrink-0">
          <button
            onClick={cargarDatos}
            className="bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 p-3 rounded-2xl transition flex items-center gap-2 text-xs font-black uppercase tracking-wider cursor-pointer"
            title="Recargar datos de la base de datos"
          >
            <RefreshCw className="w-4 h-4" /> <span>Actualizar</span>
          </button>
          <button
            onClick={seccionReporte === "VENTAS" ? exportarReporteCompletoCSV : exportarTrabajosCSV}
            className="bg-emerald-600 hover:bg-emerald-500 text-white p-3 px-4.5 rounded-2xl transition flex items-center gap-2 text-xs font-black uppercase tracking-wider cursor-pointer shadow-sm"
            title="Exportar reporte filtrado a CSV"
          >
            <Download className="w-4 h-4" /> <span>Exportar Reporte</span>
          </button>
        </div>
      </div>

      {seccionReporte === "TRABAJOS" ? (
        <div className="space-y-6">
          {/* Panel de Filtros para Trabajos */}
          <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Filtros Operativos de Trabajos & Pedidos</h3>
              </div>
              {(filtroDepReporte || filtroOperadorReporte || filtroEstadoTrabajo || filtroSaldoTrabajo !== "todos" || busquedaTrabajo || periodo !== "mes_30") && (
                <button
                  type="button"
                  onClick={limpiarFiltrosTrabajos}
                  className="text-[10px] font-black text-rose-600 hover:text-rose-800 bg-rose-50 px-2.5 py-1 rounded-xl transition cursor-pointer flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Limpiar Filtros
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Buscador de Trabajos */}
              <div className="lg:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Buscar Cliente o Detalle</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Cliente, cédula, trabajo, requerimiento..."
                    value={busquedaTrabajo}
                    onChange={(e) => setBusquedaTrabajo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                  />
                  {busquedaTrabajo && (
                    <button
                      type="button"
                      onClick={() => setBusquedaTrabajo("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Período */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Período de Fecha</label>
                <select
                  value={periodo}
                  onChange={(e) => setPeriodo(e.target.value as RangoPeriodo)}
                  className="w-full bg-slate-50 border border-slate-100 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                >
                  <option value="hoy">Hoy (Día en Curso)</option>
                  <option value="ayer">Ayer</option>
                  <option value="semana">Últimos 7 días</option>
                  <option value="mes_30">Últimos 30 días</option>
                  <option value="mes_actual">Este Mes (Calendario)</option>
                  <option value="todos">Todo el Historial</option>
                </select>
              </div>

              {/* Área / Departamento */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Área / Depto.</label>
                <select
                  value={filtroDepReporte}
                  onChange={(e) => setFiltroDepReporte(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                >
                  <option value="">Todas las Áreas</option>
                  <option value="General">General</option>
                  <option value="Bordado">Bordado</option>
                  <option value="Diseño Gráfico">Diseño Gráfico</option>
                  <option value="Imprenta">Imprenta</option>
                  <option value="Costura">Costura</option>
                  <option value="Sublimación">Sublimación</option>
                  <option value="Corte y Confección">Corte y Confección</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>

              {/* Estado del Trabajo */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Estado de Producción</label>
                <select
                  value={filtroEstadoTrabajo}
                  onChange={(e) => setFiltroEstadoTrabajo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                >
                  <option value="">Todos los Estados</option>
                  <option value="Pendiente">⏳ Pendiente</option>
                  <option value="En Proceso">⚙️ En Proceso</option>
                  <option value="Terminado">✅ Terminado</option>
                  <option value="Entregado">📦 Entregado</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-50">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Operador / Empleado Asignado</label>
                <input
                  type="text"
                  placeholder="Filtrar por empleado asignado (ej: Carlos, María)..."
                  value={filtroOperadorReporte}
                  onChange={(e) => setFiltroOperadorReporte(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Estado Financiero</label>
                <select
                  value={filtroSaldoTrabajo}
                  onChange={(e) => setFiltroSaldoTrabajo(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-100 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                >
                  <option value="todos">Todos los Balances</option>
                  <option value="con_saldo">💳 Con Saldo Pendiente por Cobrar</option>
                  <option value="pagados">✅ Pagados / Saldados al 100%</option>
                </select>
              </div>
            </div>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 text-white rounded-[2rem] p-6 shadow-sm relative overflow-hidden">
              <Briefcase className="w-16 h-16 absolute -right-3 -bottom-3 opacity-10" />
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Total Trabajos / Pedidos</p>
              <h3 className="text-3xl font-black mt-2">{pedidosFiltrados.length}</h3>
              <p className="text-[10px] text-slate-400 mt-2 font-semibold">Registrados en el período seleccionado</p>
            </div>

            <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Presupuesto Generado</p>
              <h3 className="text-3xl font-black text-slate-900 mt-2">${totalTrabajosMontoUSD.toFixed(2)}</h3>
              <p className="text-[10px] text-slate-400 mt-2 font-semibold">Bs. {(totalTrabajosMontoUSD * tasa).toFixed(2)}</p>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 rounded-[2rem] p-6 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-800">Anticipos Recibidos</p>
              <h3 className="text-3xl font-black text-emerald-900 mt-2">${totalTrabajosAnticipoUSD.toFixed(2)}</h3>
              <p className="text-[10px] text-emerald-700 mt-2 font-bold">Ingresos cobrados en caja</p>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-[2rem] p-6 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-800">Por Cobrar / Pendiente</p>
              <h3 className="text-3xl font-black text-amber-900 mt-2">${totalTrabajosPendienteUSD.toFixed(2)}</h3>
              <p className="text-[10px] text-amber-700 mt-2 font-bold">Saldo restante contra entrega</p>
            </div>
          </div>

          {/* Desglose por Estado */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-amber-500/10 border border-amber-200 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-amber-800">Pendientes</p>
                <h4 className="text-xl font-black text-amber-900">{estadoContadores.Pendiente}</h4>
              </div>
              <Clock className="w-8 h-8 text-amber-500 opacity-60" />
            </div>

            <div className="bg-indigo-500/10 border border-indigo-200 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-indigo-800">En Proceso</p>
                <h4 className="text-xl font-black text-indigo-900">{estadoContadores["En Proceso"]}</h4>
              </div>
              <Wrench className="w-8 h-8 text-indigo-500 opacity-60" />
            </div>

            <div className="bg-emerald-500/10 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-emerald-800">Terminados</p>
                <h4 className="text-xl font-black text-emerald-900">{estadoContadores.Terminado}</h4>
              </div>
              <CheckCircle2 className="w-8 h-8 text-emerald-500 opacity-60" />
            </div>

            <div className="bg-slate-500/10 border border-slate-200 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-800">Entregados</p>
                <h4 className="text-xl font-black text-slate-900">{estadoContadores.Entregado}</h4>
              </div>
              <UserCheck className="w-8 h-8 text-slate-500 opacity-60" />
            </div>
          </div>

          {/* Tablas Consolidadas: Por Empleado y Por Departamento */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Rendimiento por Operador / Empleado */}
            <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
                <UserCheck className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Rendimiento por Operador / Empleado</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="pb-2">Operador / Empleado</th>
                      <th className="pb-2 text-center">Asignados</th>
                      <th className="pb-2 text-center">Completados</th>
                      <th className="pb-2 text-right">Valor Total ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs">
                    {Object.keys(operadorConsolidado).length === 0 ? (
                      <tr><td colSpan={4} className="py-6 text-center text-slate-400">Sin datos de asignación</td></tr>
                    ) : (
                      Object.entries(operadorConsolidado).map(([op, data]) => (
                        <tr key={op} className="hover:bg-slate-50/50 transition">
                          <td className="py-2.5 font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>
                            {op}
                          </td>
                          <td className="py-2.5 text-center font-bold text-slate-600">{data.cantidad}</td>
                          <td className="py-2.5 text-center font-bold text-emerald-600">{data.completados}</td>
                          <td className="py-2.5 text-right font-black text-slate-900">${data.montoUSD.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Consolidado por Área / Departamento */}
            <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
                <Tag className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Consolidado por Área / Departamento</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="pb-2">Área / Departamento</th>
                      <th className="pb-2 text-center">Trabajos</th>
                      <th className="pb-2 text-center">Listos</th>
                      <th className="pb-2 text-right">Monto Total ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs">
                    {Object.keys(departamentoConsolidado).length === 0 ? (
                      <tr><td colSpan={4} className="py-6 text-center text-slate-400">Sin datos de departamento</td></tr>
                    ) : (
                      Object.entries(departamentoConsolidado).map(([dep, data]) => (
                        <tr key={dep} className="hover:bg-slate-50/50 transition">
                          <td className="py-2.5 font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                            {dep}
                          </td>
                          <td className="py-2.5 text-center font-bold text-slate-600">{data.cantidad}</td>
                          <td className="py-2.5 text-center font-bold text-emerald-600">{data.completados}</td>
                          <td className="py-2.5 text-right font-black text-slate-900">${data.montoUSD.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Tabla Detallada de Trabajos Registrados */}
          <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-50 pb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-600" /> Detalle Individual de Trabajos
              </h3>
              <span className="text-[10px] font-black bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full uppercase">
                {pedidosFiltrados.length} Registros
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-2">Cliente</th>
                    <th className="py-2.5 px-2">Trabajo / Requerimiento</th>
                    <th className="py-2.5 px-2">Área</th>
                    <th className="py-2.5 px-2">Asignado a</th>
                    <th className="py-2.5 px-2 text-center">Estado</th>
                    <th className="py-2.5 px-2 text-right">Presupuesto ($)</th>
                    <th className="py-2.5 px-2 text-right">Pendiente ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                  {pedidosFiltrados.length === 0 ? (
                    <tr><td colSpan={7} className="py-8 text-center text-slate-400 font-medium">No se encontraron trabajos con los filtros actuales.</td></tr>
                  ) : (
                    pedidosFiltrados.map(p => {
                      const saldo = (p.monto_total || 0) - (p.anticipo || 0);
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-2 font-bold text-slate-900">
                            {p.nombres} {p.apellidos || ""}
                            <span className="block text-[9px] font-mono font-normal text-slate-400">CI: {p.cedula}</span>
                          </td>
                          <td className="py-3 px-2 font-medium text-slate-700 max-w-xs">
                            <p className="line-clamp-2">{p.descripcion}</p>
                            {p.notas_operativas && (
                              <p className="text-[10px] text-amber-800 font-semibold mt-0.5">Nota: {p.notas_operativas}</p>
                            )}
                          </td>
                          <td className="py-3 px-2">
                            <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded text-[10px]">
                              {p.departamento_servicio || "General"}
                            </span>
                          </td>
                          <td className="py-3 px-2 font-bold text-emerald-800">
                            {p.asignado_a || "Sin Asignar"}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                              p.estado === "Pendiente" ? "bg-amber-100 text-amber-800" :
                              p.estado === "En Proceso" ? "bg-indigo-100 text-indigo-800" :
                              p.estado === "Terminado" ? "bg-emerald-100 text-emerald-800" :
                              "bg-slate-100 text-slate-600"
                            }`}>
                              {p.estado}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right font-black text-slate-900">
                            ${(p.monto_total || 0).toFixed(2)}
                          </td>
                          <td className="py-3 px-2 text-right font-black text-rose-600">
                            ${saldo.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* 2. PANEL DE FILTROS EN BENTO STYLE */}
          <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Panel de Control de Filtros y Búsqueda</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMostrarFiltrosAvanzadosVentas(!mostrarFiltrosAvanzadosVentas)}
                  className={`text-[10px] font-black uppercase tracking-wider py-1.5 px-3 rounded-xl transition flex items-center gap-1.5 ${
                    mostrarFiltrosAvanzadosVentas || filtroMontoMinUSD || filtroMontoMaxUSD || filtroDescuento !== "todos" || filtroCategoriaItems !== "TODAS" || ordenarVentasPor !== "fecha_desc"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <Sliders className="w-3 h-3" />
                  <span>Filtros Detallados</span>
                </button>
                {(busquedaVenta || filtroPago !== "TODOS" || filtroTipoVenta !== "TODAS" || periodo !== "mes_30" || filtroMontoMinUSD || filtroMontoMaxUSD || filtroDescuento !== "todos" || filtroCategoriaItems !== "TODAS" || ordenarVentasPor !== "fecha_desc") && (
                  <button
                    type="button"
                    onClick={limpiarFiltrosVentas}
                    className="text-[10px] font-black text-rose-600 hover:text-rose-800 bg-rose-50 px-2.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Limpiar
                  </button>
                )}
              </div>
            </div>

            {/* Buscador de Ventas */}
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar venta por N° Factura, Nombre de Cliente, Cédula/RIF, Cajero o Producto vendido..."
                value={busquedaVenta}
                onChange={(e) => setBusquedaVenta(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 focus:border-indigo-500 rounded-2xl py-2.5 pl-4 pr-10 text-xs font-bold text-slate-700 outline-none"
              />
              {busquedaVenta && (
                <button
                  type="button"
                  onClick={() => setBusquedaVenta("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Períodos */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Período de Análisis</label>
                <select
                  value={periodo}
                  onChange={(e) => setPeriodo(e.target.value as RangoPeriodo)}
                  className="w-full bg-slate-50 border border-slate-100 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 outline-none"
                >
                  <option value="hoy">Hoy (Día en Curso)</option>
                  <option value="ayer">Ayer</option>
                  <option value="semana">Últimos 7 días</option>
                  <option value="mes_30">Últimos 30 días</option>
                  <option value="mes_actual">Este Mes (Calendario)</option>
                  <option value="todos">Todo el Historial</option>
                  <option value="personalizado">Rango Personalizado</option>
                </select>
              </div>

              {/* Rango Personalizado */}
              {periodo === "personalizado" ? (
                <>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Fecha de Inicio</label>
                    <div className="relative">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="date"
                        value={fechaInicio}
                        onChange={(e) => setFechaInicio(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 focus:border-indigo-500 rounded-xl pl-9 pr-3.5 py-2 text-xs font-bold text-slate-700 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Fecha de Fin</label>
                    <div className="relative">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="date"
                        value={fechaFin}
                        onChange={(e) => setFechaFin(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 focus:border-indigo-500 rounded-xl pl-9 pr-3.5 py-2 text-xs font-bold text-slate-700 outline-none"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="md:col-span-2 flex items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 p-4 text-[10px] font-medium text-slate-400">
                  <Info className="w-3.5 h-3.5 text-indigo-400 mr-1.5 shrink-0" />
                  <span>Período predefinido activo. Seleccione "Rango Personalizado" para definir fechas exactas.</span>
                </div>
              )}

              {/* Filtro Tipo de Pago */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Forma de Pago</label>
                <select
                  value={filtroPago}
                  onChange={(e) => setFiltroPago(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 outline-none"
                >
                  <option value="TODOS">Todas las Formas de Pago</option>
                  <option value="PUNTO">Punto de Venta (Bs)</option>
                  <option value="PAGO_MOVIL">Pago Móvil (Bs)</option>
                  <option value="EFECTIVO_BS">Efectivo Bolívares (Bs)</option>
                  <option value="EFECTIVO_USD">Efectivo Dólares ($)</option>
                  <option value="ZELLE">Zelle ($)</option>
                  <option value="CREDITO">Créditos Pendientes</option>
                </select>
              </div>
            </div>

            {/* Panel de Filtros Detallados Desplegable */}
            <AnimatePresence>
              {mostrarFiltrosAvanzadosVentas && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-slate-100 pt-3 space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                    {/* Rango de Importe Facturado */}
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider ml-1">Monto Total ($)</label>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <input
                          type="number"
                          placeholder="Mín $"
                          value={filtroMontoMinUSD}
                          onChange={(e) => setFiltroMontoMinUSD(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-2.5 text-[11px] font-bold text-slate-700 outline-none"
                        />
                        <span className="text-slate-400 font-bold text-xs">-</span>
                        <input
                          type="number"
                          placeholder="Máx $"
                          value={filtroMontoMaxUSD}
                          onChange={(e) => setFiltroMontoMaxUSD(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-2.5 text-[11px] font-bold text-slate-700 outline-none"
                        />
                      </div>
                    </div>

                    {/* Descuentos e Incentivos */}
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider ml-1">Rebajas / Descuentos</label>
                      <select
                        className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-[11px] font-bold text-slate-700 outline-none mt-0.5"
                        value={filtroDescuento}
                        onChange={(e) => setFiltroDescuento(e.target.value as any)}
                      >
                        <option value="todos">Todas las Ventas</option>
                        <option value="con_descuento">🏷️ Con Rebaja/Descuento Aplicado</option>
                        <option value="sin_descuento">Sin Descuentos</option>
                      </select>
                    </div>

                    {/* Categoría de Ítems */}
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider ml-1">Rubro de Productos</label>
                      <select
                        className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-[11px] font-bold text-slate-700 outline-none mt-0.5"
                        value={filtroCategoriaItems}
                        onChange={(e) => setFiltroCategoriaItems(e.target.value)}
                      >
                        <option value="TODAS">Todos los Artículos</option>
                        <option value="MEDICAMENTO">Medicamentos (Exento)</option>
                        <option value="GRAVADO_16">Gravados (16% IVA)</option>
                        <option value="EXENTO">Exento Otros</option>
                      </select>
                    </div>

                    {/* Ordenar Por */}
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider ml-1">Ordenar Registros Por</label>
                      <select
                        className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-[11px] font-bold text-indigo-700 outline-none mt-0.5"
                        value={ordenarVentasPor}
                        onChange={(e) => setOrdenarVentasPor(e.target.value as any)}
                      >
                        <option value="fecha_desc">Más Recientes Primero</option>
                        <option value="fecha_asc">Más Antiguos Primero</option>
                        <option value="monto_desc">Mayor Monto Total ($)</option>
                        <option value="monto_asc">Menor Monto Total ($)</option>
                        <option value="items_desc">Mayor Cantidad de Ítems</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-wrap gap-4 pt-2 justify-between items-center text-xs">
              <div className="flex gap-4">
                <span className="text-slate-500 font-medium">Filtro de Emisión:</span>
                <label className="inline-flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
                  <input
                    type="radio"
                    name="tipoVenta"
                    checked={filtroTipoVenta === "TODAS"}
                    onChange={() => setFiltroTipoVenta("TODAS")}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  Todas
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
                  <input
                    type="radio"
                    name="tipoVenta"
                    checked={filtroTipoVenta === "FISCAL"}
                    onChange={() => setFiltroTipoVenta("FISCAL")}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  Facturas Fiscales
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
                  <input
                    type="radio"
                    name="tipoVenta"
                    checked={filtroTipoVenta === "NO_FISCAL"}
                    onChange={() => setFiltroTipoVenta("NO_FISCAL")}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  Notas de Entrega (Exento IGTF)
                </label>
              </div>
              <span className="bg-indigo-50 text-indigo-700 font-extrabold text-[10px] px-2.5 py-1 rounded-xl uppercase tracking-wider">
                {ventasOrdenadas.length} Ventas en el filtro
              </span>
            </div>
          </div>

      {/* 3. DYNAMIC METRIC CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Ventas Brutas Totales */}
        <div className="bg-slate-900 text-white rounded-[2rem] p-6 relative overflow-hidden shadow-sm">
          <div className="absolute -right-6 -bottom-6 opacity-10">
            <DollarSign className="w-24 h-24" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Ventas Brutas (+Taxes)</p>
          <h3 className="text-2xl font-black mt-2">${totalFacturadoConImpuestosUSD.toFixed(2)}</h3>
          <p className="text-[10px] text-slate-400 mt-2 font-semibold">
            Equivalente BCV: Bs. {(totalFacturadoConImpuestosUSD * tasa).toFixed(2)}
          </p>
          <span className="mt-3.5 inline-block bg-slate-800 text-[9px] font-black text-indigo-300 px-2 py-0.5 rounded-full uppercase">
            Total en Caja Registradora
          </span>
        </div>

        {/* Ventas Netas */}
        <div className="bg-white border border-slate-100 rounded-[2rem] p-6 relative overflow-hidden shadow-sm">
          <div className="absolute -right-6 -bottom-6 opacity-5 text-indigo-600">
            <TrendingUp className="w-24 h-24" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ventas Netas de Caja</p>
          <h3 className="text-2xl font-black text-slate-800 mt-2">${totalVentasNetasUSD.toFixed(2)}</h3>
          <p className="text-[10px] text-slate-500 mt-2 font-semibold">
            Excluye impuestos, neto de descuentos.
          </p>
          <div className="mt-3.5 flex items-center justify-between text-[9px]">
            <span className="text-slate-400 font-bold uppercase">Rebajas Divisas:</span>
            <span className="text-amber-600 font-black">-${totalDescuentosUSD.toFixed(2)}</span>
          </div>
        </div>

        {/* Costo de Mercancía */}
        <div className="bg-white border border-slate-100 rounded-[2rem] p-6 relative overflow-hidden shadow-sm">
          <div className="absolute -right-6 -bottom-6 opacity-5 text-slate-900">
            <Layers className="w-24 h-24" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Costo de Medicamentos</p>
          <h3 className="text-2xl font-black text-slate-800 mt-2">${totalCostosUSD.toFixed(2)}</h3>
          <p className="text-[10px] text-slate-500 mt-2 font-semibold">
            Inversión en los productos vendidos.
          </p>
          <div className="mt-3.5 flex items-center justify-between text-[9px]">
            <span className="text-slate-400 font-bold uppercase">Impuestos Recaudados:</span>
            <span className="text-indigo-600 font-black">${totalImpuestosUSD.toFixed(2)}</span>
          </div>
        </div>

        {/* Ganancia Neta */}
        <div className="bg-white border border-emerald-100 rounded-[2rem] p-6 relative overflow-hidden shadow-sm bg-gradient-to-br from-white to-emerald-50/20">
          <div className="absolute -right-6 -bottom-6 opacity-10 text-emerald-600">
            <CheckCircle2 className="w-24 h-24" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Ganancia Neta Real</p>
          <h3 className="text-2xl font-black text-emerald-700 mt-2">${totalGananciaNetaUSD.toFixed(2)}</h3>
          <p className="text-[10px] text-emerald-800 mt-2 font-bold">
            Equivalente: Bs. {(totalGananciaNetaUSD * tasa).toFixed(2)}
          </p>
          <div className="mt-3.5 flex items-center justify-between text-[9px] bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-xl">
            <span className="font-extrabold uppercase">Margen de Rentabilidad:</span>
            <span className="font-black">{margenGananciaNeta.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* 4. CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gráfico 1: Tendencia Histórica de Ventas y Ganancias */}
        <div className="lg:col-span-8 bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-50">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Tendencia de Ventas y Rentabilidad</h3>
              <p className="text-[10px] text-slate-400">Evolución de ingresos netos vs margen de beneficio real.</p>
            </div>
            <span className="text-[9px] font-black uppercase bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg">Filtro Activo</span>
          </div>

          <div className="h-[280px] w-full">
            {datosTendencia.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                <span>No hay transacciones registradas en el rango de fechas seleccionado.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={datosTendencia} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorNetas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorGanancias" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="fecha" stroke="#94a3b8" fontSize={9} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#0f172a", borderRadius: "1rem", border: "none", color: "#fff", fontSize: "11px" }} 
                    itemStyle={{ color: "#fff" }}
                  />
                  <Area type="monotone" dataKey="Ventas Netas ($)" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorNetas)" />
                  <Area type="monotone" dataKey="Ganancia Neta ($)" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorGanancias)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Gráfico 2: Distribución de Métodos de Pago */}
        <div className="lg:col-span-4 bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm flex flex-col">
          <div className="mb-4 pb-2 border-b border-slate-50">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Mix de Formas de Pago</h3>
            <p className="text-[10px] text-slate-400">Distribución de ingresos por tipo de moneda y plataforma.</p>
          </div>

          <div className="h-[200px] w-full flex-1 flex items-center justify-center relative">
            {datosPagosChart.length === 0 ? (
              <span className="text-xs text-slate-400">Sin datos de recaudación.</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={datosPagosChart}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {datosPagosChart.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#0f172a", borderRadius: "0.5rem", border: "none", color: "#fff", fontSize: "10px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
            
            {/* Leyenda central flotante si se prefiere */}
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none">Total Pagos</span>
              <span className="text-base font-black text-slate-800 mt-1">${totalFacturadoConImpuestosUSD.toFixed(1)}</span>
            </div>
          </div>

          {/* Leyenda Detallada */}
          <div className="mt-2 space-y-2 max-h-[140px] overflow-y-auto pr-1">
            {datosPagosChart.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-[10px] bg-slate-50 p-1.5 rounded-xl">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="font-extrabold text-slate-600 uppercase">{item.name}</span>
                </div>
                <span className="font-black text-slate-800">${item.value.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. SECCIÓN "TODO LO QUE SE VENDIÓ": PRODUCTOS MÁS VENDIDOS */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-50 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Rendimiento de Inventario y Ventas</h3>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Detalle de medicamentos vendidos, volúmenes de facturación y rentabilidad individual.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            {/* Buscador de producto en el listado vendido */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar medicamento..."
                value={buscarProducto}
                onChange={(e) => setBuscarProducto(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 focus:border-indigo-500 rounded-xl pl-9 pr-3.5 py-2 text-xs font-bold text-slate-700 outline-none"
              />
            </div>
            <button
              onClick={exportarMedicamentosVendidosCSV}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wider py-2 px-3.5 rounded-xl transition flex items-center justify-center gap-1.5 shrink-0"
              title="Exportar medicamentos vendidos en el período a CSV"
            >
              <Download className="w-3.5 h-3.5" /> Exportar Ventas de Medicinas
            </button>
          </div>
        </div>

        {/* Tabla de Medicamentos */}
        <div className="overflow-x-auto rounded-2xl border border-slate-50 bg-slate-50/10">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[9px] font-black uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-4">Medicamento / Sustancia</th>
                <th className="py-3.5 px-4 text-center">Clasificación</th>
                <th className="py-3.5 px-4 text-center">Cant. Vendida</th>
                <th className="py-3.5 px-4 text-right">Ingresos ($)</th>
                <th className="py-3.5 px-4 text-right">Costo Total ($)</th>
                <th className="py-3.5 px-4 text-right">Ganancia Neta ($)</th>
                <th className="py-3.5 px-4 text-right">Margen (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs">
              {productosVendidosLista.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 font-medium">
                    No se registraron ventas de medicamentos en este período que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                productosVendidosLista.map((p, idx) => (
                  <tr key={p.id || idx} className="hover:bg-indigo-50/20 transition-all">
                    <td className="py-3 px-4">
                      <div>
                        <span className="font-extrabold text-slate-800">{p.nombre}</span>
                        <p className="text-[9px] text-slate-400 font-mono mt-0.5">{p.id}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black ${
                        p.categoria === "GRAVADO_16" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"
                      }`}>
                        {p.categoria}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-black text-slate-900 bg-slate-100/50 px-2.5 py-1 rounded-lg">
                        {p.cantidad} u.
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-800">${p.ingresoUSD.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-medium text-slate-500">${p.costoTotalUSD.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-black text-emerald-600">${p.gananciaUSD.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold ${
                        p.margen >= 30 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                      }`}>
                        {p.margen}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. LOG HISTÓRICO DE TRANSACCIONES DETALLADO */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-50 pb-4">
          <BookOpen className="w-5 h-5 text-indigo-600" />
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Libro de Transacciones Recientes</h3>
            <p className="text-[10px] text-slate-400 mt-1">Visualización de facturas, métodos de cobro, descuentos de incentivo de efectivo divisas y utilidades netas por venta.</p>
          </div>
        </div>

        <div className="space-y-3">
          {ventasOrdenadas.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-100 rounded-[2rem] text-slate-400 font-medium text-xs">
              No hay facturas o recibos en este período que cumplan con los filtros de búsqueda.
            </div>
          ) : (
            ventasOrdenadas.map((v) => {
              const esExpandido = ventaExpandida === v.id;
              
              // Calcular rentabilidad de esta venta concreta
              let costoVentaUSD = 0;
              v.items.forEach(it => {
                const costoUnitario = costosMap.get(it.producto_id) ?? (it.precio_unitario * 0.7);
                costoVentaUSD += costoUnitario * it.cantidad;
              });
              const ventaNeta = v.monto_exento + v.base_imponible - (v.descuento_usd || 0);
              const gananciaVenta = Math.max(0, ventaNeta - costoVentaUSD);

              return (
                <div key={v.id} className="border border-slate-100 rounded-3xl p-4 hover:border-slate-200 transition-all bg-slate-50/10">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    {/* ID & Cliente */}
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-2xl ${
                        v.sin_factura ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                      }`}>
                        <span className="text-[10px] font-black tracking-tighter uppercase">
                          {v.sin_factura ? "N/E" : "FAC"}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-800 text-xs">{v.factura_numero}</span>
                          <span className="text-[9px] text-slate-400 font-mono">({new Date(v.fecha).toLocaleDateString("es-VE")})</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
                          Cliente: {v.cliente_nombre} <span className="font-mono text-slate-400">({v.cliente_id})</span>
                        </p>
                      </div>
                    </div>

                    {/* Formas de Pago */}
                    <div className="flex flex-wrap gap-1">
                      {v.pagos.map((p, idx) => (
                        <span key={idx} className="bg-white border border-slate-200 text-slate-700 font-bold text-[9px] px-2 py-0.5 rounded-lg uppercase">
                          {p.metodo.replace("_", " ")}: ${p.montoUSD.toFixed(1)}
                        </span>
                      ))}
                    </div>

                    {/* Desglose de Descuentos/Ahorros */}
                    {v.descuento_usd && v.descuento_usd > 0 ? (
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 text-[9px] font-extrabold px-2 py-0.5 rounded-lg">
                        Incentivo divisas: -${v.descuento_usd.toFixed(2)}
                      </span>
                    ) : null}

                    {/* Total & Ganancia */}
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Monto Total</p>
                        <p className="text-xs font-extrabold text-slate-800">${v.total_usd.toFixed(2)}</p>
                        <p className="text-[9px] font-bold text-slate-500">Bs. {v.total_bs.toFixed(1)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-wider">Ganancia Neta</p>
                        <p className="text-xs font-black text-emerald-700">${gananciaVenta.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setVentaParaImprimir(v);
                            setMostrarTicketModal(true);
                          }}
                          className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl transition"
                          title="Reimprimir Ticket de Impresora Térmica"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setVentaExpandida(esExpandido ? null : v.id)}
                          className="p-1.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition text-slate-400"
                        >
                          {esExpandido ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Detalle Desplegado de los Productos de la Venta */}
                  <AnimatePresence>
                    {esExpandido && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden mt-4 pt-4 border-t border-slate-100 space-y-2"
                      >
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Medicamentos en esta Venta:</p>
                        <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl">
                          {v.items.map((item, idx) => {
                            const costoUnit = costosMap.get(item.producto_id) ?? (item.precio_unitario * 0.7);
                            const itemProfit = (item.precio_unitario - costoUnit) * item.cantidad;
                            return (
                              <div key={idx} className="flex justify-between items-center text-xs">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded text-[10px]">
                                    {item.cantidad}x
                                  </span>
                                  <span className="font-semibold text-slate-700">{item.nombre}</span>
                                </div>
                                <div className="flex gap-4 items-center">
                                  {item.cant_devuelta && item.cant_devuelta > 0 ? (
                                    <span className="text-rose-600 font-extrabold bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded text-[9px] uppercase">
                                      Devuelto: {item.cant_devuelta}
                                    </span>
                                  ) : null}
                                  <span className="text-slate-400 font-medium">Unit: ${item.precio_unitario.toFixed(2)}</span>
                                  <span className="text-slate-600 font-bold">Subtotal: ${(item.precio_unitario * (item.cantidad - (item.cant_devuelta || 0))).toFixed(2)}</span>
                                  <span className="text-emerald-600 font-bold">Margen: +${itemProfit.toFixed(2)}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Botón para iniciar devolución */}
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => iniciarDevolucion(v)}
                            className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-100 text-rose-700 px-3.5 py-1.5 rounded-2xl font-bold text-[11px] uppercase tracking-wider transition"
                          >
                            <Undo className="w-3.5 h-3.5" />
                            Procesar Devolución / Retorno
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  )}

      {/* Modal de Impresión Térmica */}
      <ThermalTicketModal
        venta={ventaParaImprimir}
        isOpen={mostrarTicketModal}
        onClose={() => {
          setMostrarTicketModal(false);
          setVentaParaImprimir(null);
        }}
        tituloAdicional="Reimpresión de Ticket"
      />

      {/* Modal de Devolución de Productos */}
      <AnimatePresence>
        {ventaParaDevolver && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]"
            >
              <div className="bg-rose-50 border-b border-rose-100 p-6 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="bg-rose-600 text-white p-2.5 rounded-2xl">
                    <Undo className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Devolución de Productos</h3>
                    <p className="text-[10px] text-rose-800 font-medium">Factura: {ventaParaDevolver.factura_numero} • Cliente: {ventaParaDevolver.cliente_nombre}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setVentaParaDevolver(null);
                    setDevolucionExitosaInfo(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 font-extrabold text-xs"
                >
                  Cerrar
                </button>
              </div>

              {devolucionExitosaInfo ? (
                /* Pantalla de Devolución Exitosa */
                <div className="p-8 text-center flex flex-col items-center justify-center space-y-6 overflow-y-auto max-h-[70vh]">
                  <div className="bg-emerald-50 text-emerald-600 p-5 rounded-full border border-emerald-100 animate-bounce mt-4">
                    <CheckCircle2 className="w-16 h-16" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-black text-slate-800 text-lg uppercase tracking-wider">¡Devolución Exitosa!</h4>
                    <p className="text-xs text-slate-500 font-bold px-4">
                      {devolucionExitosaInfo.mensaje}
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100 w-full space-y-3.5 max-w-md">
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                      <span>Monto Reembolsado:</span>
                      <span className="font-black text-emerald-600 text-sm">
                        ${devolucionExitosaInfo.totalReembolsoUSD.toFixed(2)} USD
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                      <span>Equivalente en Bolívares:</span>
                      <span className="font-bold text-slate-700">
                        Bs. {(devolucionExitosaInfo.totalReembolsoUSD * tasa).toFixed(2)}
                      </span>
                    </div>
                    {devolucionExitosaInfo.fueAjustadoCredito && (
                      <div className="pt-2.5 border-t border-slate-200 text-[11px] text-amber-700 font-bold flex flex-col items-center gap-1">
                        <span>💳 Deuda de cliente disminuida con éxito</span>
                        <span className="text-slate-800">
                          Nuevo saldo deudor: ${devolucionExitosaInfo.saldoRestanteDeudor?.toFixed(2)} USD
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setVentaParaDevolver(null);
                      setDevolucionExitosaInfo(null);
                    }}
                    className="w-full max-w-xs bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-xs uppercase py-4 rounded-2xl shadow-md hover:shadow-lg transition duration-200 mb-4"
                  >
                    Entendido / Cerrar
                  </button>
                </div>
              ) : (
                /* Formulario de Devolución */
                <>
                  <div className="p-6 overflow-y-auto space-y-5 flex-1">
                    {/* Nota informativa */}
                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-3xl text-xs text-amber-900 font-medium">
                      Elija los medicamentos y las cantidades que desea retornar al inventario. El sistema recalculará proporcionalmente el reembolso y ajustará los saldos/créditos de forma automática.
                    </div>

                    {/* Items de la factura */}
                    <div className="space-y-3">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Medicamentos Facturados:</span>
                      <div className="divide-y divide-slate-100 bg-slate-50 border border-slate-100 rounded-3xl p-4 space-y-3">
                        {ventaParaDevolver.items.map((item) => {
                          const disponible = item.cantidad - (item.cant_devuelta || 0);
                          const actualSeleccionado = cantidadesDevolver[item.producto_id] || 0;
                          return (
                            <div key={item.producto_id} className="flex flex-wrap items-center justify-between gap-4 pt-3 first:pt-0">
                              <div className="flex-1 min-w-[200px]">
                                <p className="font-bold text-slate-800 text-xs">{item.nombre}</p>
                                <p className="text-[10px] text-slate-500 font-semibold mt-1">
                                  Comprado: {item.cantidad} | Ya Devuelto: {item.cant_devuelta || 0} | <span className="text-emerald-600 font-black">Disponible: {disponible}</span>
                                </p>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-slate-700 font-black text-xs">
                                  ${item.precio_unitario.toFixed(2)} USD
                                </span>
                                
                                {/* Selector de cantidad */}
                                <div className="flex items-center border border-slate-200 bg-white rounded-xl overflow-hidden shadow-sm">
                                  <button
                                    type="button"
                                    disabled={actualSeleccionado <= 0}
                                    onClick={() => {
                                      setCantidadesDevolver(prev => ({
                                        ...prev,
                                        [item.producto_id]: Math.max(0, actualSeleccionado - 1)
                                      }));
                                    }}
                                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 text-slate-600 font-extrabold text-xs transition"
                                  >
                                    -
                                  </button>
                                  <span className="px-4 text-xs font-black text-slate-800 min-w-[24px] text-center">
                                    {actualSeleccionado}
                                  </span>
                                  <button
                                    type="button"
                                    disabled={actualSeleccionado >= disponible}
                                    onClick={() => {
                                      setCantidadesDevolver(prev => ({
                                        ...prev,
                                        [item.producto_id]: Math.min(disponible, actualSeleccionado + 1)
                                      }));
                                    }}
                                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 text-slate-600 font-extrabold text-xs transition"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Formulario de motivo */}
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Motivo de la Devolución:</label>
                      
                      {/* Botones de Selección Rápida de Motivo */}
                      <div className="flex flex-wrap gap-2">
                        {[
                          "Medicamento incorrecto",
                          "Error en facturación o precio",
                          "Daño/Defecto en empaque",
                          "Cliente canceló compra",
                          "Vencido/Próximo a vencer"
                        ].map((motivo) => {
                          const estaSeleccionado = motivoDevolucion === motivo;
                          return (
                            <button
                              type="button"
                              key={motivo}
                              onClick={() => setMotivoDevolucion(motivo)}
                              className={`px-3 py-1.5 rounded-full border text-[11px] font-bold transition-all ${
                                estaSeleccionado 
                                  ? "bg-rose-600 border-rose-600 text-white shadow-sm" 
                                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300"
                              }`}
                            >
                              {motivo}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => setMotivoDevolucion("")}
                          className={`px-3 py-1.5 rounded-full border text-[11px] font-bold transition-all ${
                            ![
                              "Medicamento incorrecto",
                              "Error en facturación o precio",
                              "Daño/Defecto en empaque",
                              "Cliente canceló compra",
                              "Vencido/Próximo a vencer"
                            ].includes(motivoDevolucion) && motivoDevolucion.trim() !== ""
                              ? "bg-rose-600 border-rose-600 text-white shadow-sm"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300"
                          }`}
                        >
                          Otro motivo...
                        </button>
                      </div>

                      <input
                        type="text"
                        placeholder="Escriba aquí el motivo o personalice la opción seleccionada..."
                        value={motivoDevolucion}
                        onChange={(e) => setMotivoDevolucion(e.target.value)}
                        className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 outline-none focus:border-rose-500 shadow-sm transition"
                      />
                    </div>

                    {/* Resumen del Reembolso */}
                    {(() => {
                      // Calcular total del reembolso actual
                      const totalOriginalVenta = ventaParaDevolver.monto_exento + ventaParaDevolver.base_imponible + (ventaParaDevolver.monto_iva || 0);
                      const ratioDescuento = ventaParaDevolver.descuento_usd ? (1 - (ventaParaDevolver.descuento_usd / totalOriginalVenta)) : 1;
                      
                      let reembolsoCalculadoUSD = 0;
                      ventaParaDevolver.items.forEach(item => {
                        const cant = cantidadesDevolver[item.producto_id] || 0;
                        if (cant > 0) {
                          const esMedicamentoOExento = item.categoria === "MEDICAMENTO" || item.categoria === "EXENTO";
                          const tasaIva = esMedicamentoOExento ? 0 : 0.16;
                          const valorItemConIva = item.precio_unitario * (1 + tasaIva);
                          reembolsoCalculadoUSD += valorItemConIva * cant * ratioDescuento;
                        }
                      });

                      const reembolsoCalculadoBs = reembolsoCalculadoUSD * tasa;

                      const tienePagoCredito = ventaParaDevolver.pagos.some(p => p.metodo === "CREDITO");

                      return (
                        <div className="bg-slate-900 text-white rounded-3xl p-5 space-y-2 shrink-0">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black uppercase text-indigo-400 tracking-wider">Monto Reembolso Estimado</span>
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Tasa BCV: Bs. {tasa.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-baseline">
                            <p className="text-xl font-black text-rose-400">
                              ${reembolsoCalculadoUSD.toFixed(2)} <span className="text-xs font-normal text-slate-300">USD</span>
                            </p>
                            <p className="text-sm font-bold text-slate-300">
                              Bs. {reembolsoCalculadoBs.toFixed(2)}
                            </p>
                          </div>

                          {tienePagoCredito && ventaParaDevolver.cliente_id !== "V-99999999" && (
                            <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] text-amber-400 font-bold flex gap-1.5 items-center">
                              <span>🔔</span>
                              <p>Esta venta tiene pagos a CRÉDITO. El reembolso se aplicará como una rebaja a la deuda actual del cliente.</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="bg-slate-50 border-t border-slate-100 p-6 flex flex-col gap-3 shrink-0">
                    {errorDevolucion && (
                      <div className="bg-rose-50 border border-rose-100 text-rose-700 px-4 py-2.5 rounded-2xl text-[11px] font-bold text-center">
                        ⚠️ {errorDevolucion}
                      </div>
                    )}
                    
                    {confirmandoDevolucion ? (
                      <div className="space-y-3 w-full">
                        <div className="bg-amber-50 border border-amber-100 text-amber-900 p-4 rounded-3xl text-xs font-semibold text-center">
                          ¿Está seguro de que desea procesar esta devolución? Se reintegrarán los medicamentos al stock y se reembolsará el monto correspondiente.
                        </div>
                        
                        <div className="space-y-1 bg-indigo-50/50 border border-indigo-100 p-3.5 rounded-3xl">
                          <label className="text-[10px] font-black text-indigo-700 uppercase tracking-wider block text-center mb-1">
                            🔐 Requiere PIN de Autorización de Supervisor
                          </label>
                          <input
                            type="password"
                            maxLength={8}
                            placeholder="••••"
                            value={pinSupervisor}
                            onChange={(e) => setPinSupervisor(e.target.value)}
                            className="w-full text-center tracking-widest text-lg font-black bg-white border border-indigo-200 text-indigo-950 rounded-2xl py-2 px-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none placeholder:text-slate-300"
                          />
                          <p className="text-[9px] text-indigo-500 text-center mt-1">El supervisor debe ingresar su PIN de 4 dígitos para autorizar el reembolso fiscal.</p>
                        </div>

                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => setConfirmandoDevolucion(false)}
                            className="flex-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-extrabold text-xs uppercase py-3.5 rounded-2xl transition"
                          >
                            Volver / Editar
                          </button>
                          <button
                            type="button"
                            disabled={procesandoDevolucion}
                            onClick={ejecutarDevolucion}
                            className="flex-1 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-black text-xs uppercase py-3.5 rounded-2xl transition disabled:opacity-50"
                          >
                            {procesandoDevolucion ? "Procesando..." : "Sí, Procesar Devolución"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-3 w-full">
                        <button
                          type="button"
                          onClick={() => setVentaParaDevolver(null)}
                          className="flex-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-extrabold text-xs uppercase py-3.5 rounded-2xl transition"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={prepararDevolucion}
                          className="flex-1 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-black text-xs uppercase py-3.5 rounded-2xl transition"
                        >
                          Confirmar Devolución
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
