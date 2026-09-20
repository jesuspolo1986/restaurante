/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Boxes,
  Store,
  ArrowRightLeft,
  ArrowRight,
  Plus,
  Trash2,
  Search,
  RefreshCw,
  Printer,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  DollarSign,
  Package,
  Layers,
  Sparkles,
  Barcode,
  Clock,
  FileText,
  Filter,
  TrendingDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Producto, TrasladoInterno, ResumenAlmacen, TipoMovimientoAlmacen } from "../types";
import { apiFetch } from "../utils/api";
import ThermalTransferInternalModal from "./ThermalTransferInternalModal";

interface CarritoTrasladoItem {
  producto: Producto;
  cantidad: number;
}

export default function Almacen() {
  const [tabActiva, setTabActiva] = useState<"existencias" | "traslado" | "reposicion" | "guias">("existencias");
  const [productos, setProductos] = useState<Producto[]>([]);
  const [resumen, setResumen] = useState<ResumenAlmacen | null>(null);
  const [traslados, setTraslados] = useState<TrasladoInterno[]>([]);
  const [cargando, setCargando] = useState(false);
  const [tasaBCV, setTasaBCV] = useState(36.50);

  // Filtros de tabla de existencias
  const [busqueda, setBusqueda] = useState("");
  const [filtroUbicacion, setFiltroUbicacion] = useState<"todos" | "solo_almacen" | "solo_tienda" | "agotados_tienda">("todos");
  const [filtroCategoria, setFiltroCategoria] = useState("");

  // Estado del Formulario de Nuevo Traslado
  const [tipoTraslado, setTipoTraslado] = useState<TipoMovimientoAlmacen>("ALMACEN_A_TIENDA");
  const [motivoTraslado, setMotivoTraslado] = useState("Reposición de mostrador");
  const [observacionesTraslado, setObservacionesTraslado] = useState("");
  const [carritoTraslado, setCarritoTraslado] = useState<CarritoTrasladoItem[]>([]);
  const [busquedaProductoTraslado, setBusquedaProductoTraslado] = useState("");
  const [categoriaFiltroTraslado, setCategoriaFiltroTraslado] = useState("");
  const [filtroDisponibilidadTraslado, setFiltroDisponibilidadTraslado] = useState<"con_stock" | "agotados_tienda" | "todos">("con_stock");

  // Filtros de la pestaña de reposición urgente
  const [busquedaReposicion, setBusquedaReposicion] = useState("");
  const [categoriaFiltroReposicion, setCategoriaFiltroReposicion] = useState("");

  // Modal de Impresión de Guía
  const [guiaSeleccionada, setGuiaSeleccionada] = useState<TrasladoInterno | null>(null);
  const [mostrarModalGuia, setMostrarModalGuia] = useState(false);

  // Modal de Ajuste Rápido
  const [productoAjuste, setProductoAjuste] = useState<Producto | null>(null);
  const [ubicacionAjuste, setUbicacionAjuste] = useState<"ALMACEN" | "TIENDA">("ALMACEN");
  const [nuevoStockAjuste, setNuevoStockAjuste] = useState<string>("");
  const [motivoAjuste, setMotivoAjuste] = useState("Conteo físico de inventario");
  const [guardandoAjuste, setGuardandoAjuste] = useState(false);

  useEffect(() => {
    cargarTodo();
  }, []);

  const cargarTodo = async () => {
    setCargando(true);
    try {
      const [resProd, resResumen, resTraslados, resTasa] = await Promise.all([
        apiFetch("/api/productos").then(r => r.json()),
        apiFetch("/api/almacen/resumen").then(r => r.json()),
        apiFetch("/api/almacen/traslados").then(r => r.json()),
        apiFetch("/api/tasa").then(r => r.json()).catch(() => ({ tasa: 36.50 }))
      ]);

      setProductos(Array.isArray(resProd) ? resProd : []);
      setResumen(resResumen);
      setTraslados(Array.isArray(resTraslados) ? resTraslados : []);
      if (resTasa?.tasa) setTasaBCV(Number(resTasa.tasa));
    } catch (err) {
      console.error("Error al cargar datos de almacén:", err);
    } finally {
      setCargando(false);
    }
  };

  // Agregar producto al carrito de traslado
  const agregarAlCarrito = (prod: Producto, cantidadDefault = 1) => {
    const existe = carritoTraslado.find(c => c.producto.id === prod.id);
    if (existe) {
      setCarritoTraslado(prev =>
        prev.map(item =>
          item.producto.id === prod.id
            ? { ...item, cantidad: item.cantidad + cantidadDefault }
            : item
        )
      );
    } else {
      setCarritoTraslado(prev => [...prev, { producto: prod, cantidad: cantidadDefault }]);
    }
    setBusquedaProductoTraslado("");
  };

  const modificarCantidadCarrito = (id: string, nuevaCant: number) => {
    if (nuevaCant <= 0) {
      setCarritoTraslado(prev => prev.filter(c => c.producto.id !== id));
    } else {
      setCarritoTraslado(prev =>
        prev.map(c => (c.producto.id === id ? { ...c, cantidad: nuevaCant } : c))
      );
    }
  };

  const eliminarDelCarrito = (id: string) => {
    setCarritoTraslado(prev => prev.filter(c => c.producto.id !== id));
  };

  // Reabastecer artículo desde sugerencia urgente
  const reabastecerUrgente = (prod: Producto) => {
    const stAlmacen = typeof prod.stock_almacen === "number" ? prod.stock_almacen : 0;
    const stTienda = typeof prod.stock_tienda === "number" ? prod.stock_tienda : (prod.stock || 0);
    const min = typeof prod.stock_minimo === "number" ? prod.stock_minimo : 5;
    
    // Sugerir la cantidad necesaria para llegar al stock mínimo más un margen o todo el almacén si es menor
    const cantidadSugerida = Math.min(stAlmacen, Math.max(1, (min * 2) - stTienda));
    
    setTipoTraslado("ALMACEN_A_TIENDA");
    setMotivoTraslado("Reabastecimiento urgente de mostrador");
    setCarritoTraslado([{ producto: prod, cantidad: cantidadSugerida }]);
    setTabActiva("traslado");
  };

  // Reabastecer todas las sugerencias urgentes en un solo clic
  const reabastecerTodoUrgente = () => {
    if (!resumen?.articulos_reposicion_urgente?.length) return;

    const nuevosItems: CarritoTrasladoItem[] = resumen.articulos_reposicion_urgente.map(prod => {
      const stAlmacen = typeof prod.stock_almacen === "number" ? prod.stock_almacen : 0;
      const stTienda = typeof prod.stock_tienda === "number" ? prod.stock_tienda : (prod.stock || 0);
      const min = typeof prod.stock_minimo === "number" ? prod.stock_minimo : 5;
      const cant = Math.min(stAlmacen, Math.max(1, (min * 2) - stTienda));
      return { producto: prod, cantidad: cant };
    });

    setTipoTraslado("ALMACEN_A_TIENDA");
    setMotivoTraslado("Reposición masiva de productos agotados en mostrador");
    setCarritoTraslado(nuevosItems);
    setTabActiva("traslado");
  };

  // Procesar traslado
  const procesarTraslado = async () => {
    if (carritoTraslado.length === 0) {
      alert("Agregue al menos un producto a la lista de traslado.");
      return;
    }

    const payload = {
      tipo: tipoTraslado,
      origen: tipoTraslado === "ALMACEN_A_TIENDA" ? "ALMACEN" : "TIENDA",
      destino: tipoTraslado === "ALMACEN_A_TIENDA" ? "TIENDA" : "ALMACEN",
      motivo: motivoTraslado,
      observaciones: observacionesTraslado,
      usuario: localStorage.getItem("usuario_activo") || "admin",
      items: carritoTraslado.map(c => ({
        producto_id: c.producto.id,
        cantidad: Number(c.cantidad)
      }))
    };

    try {
      const res = await apiFetch("/api/almacen/traslados/procesar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Error al procesar el traslado");
        return;
      }

      // Éxito: limpiar formulario y abrir comprobante para imprimir
      setCarritoTraslado([]);
      setObservacionesTraslado("");
      setGuiaSeleccionada(data.traslado);
      setMostrarModalGuia(true);
      cargarTodo();
    } catch (err) {
      console.error(err);
      alert("Ocurrió un error al enviar el traslado al servidor");
    }
  };

  // Procesar Ajuste Rápido de Stock
  const guardarAjusteRapido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productoAjuste) return;

    setGuardandoAjuste(true);
    try {
      const res = await apiFetch("/api/almacen/ajuste-rapido", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          producto_id: productoAjuste.id,
          ubicacion: ubicacionAjuste,
          nuevo_stock: Number(nuevoStockAjuste),
          motivo: motivoAjuste,
          usuario: localStorage.getItem("usuario_activo") || "admin"
        })
      });

      if (res.ok) {
        setProductoAjuste(null);
        cargarTodo();
      } else {
        const d = await res.json();
        alert(d.error || "Error al aplicar ajuste");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGuardandoAjuste(false);
    }
  };

  // Categorías disponibles ordenadas
  const categoriasDisponibles = Array.from(
    new Set(productos.map(p => p.categoria_comercial || p.categoria).filter(Boolean))
  ).sort() as string[];

  // Filtrar productos para la tabla de existencias
  const productosFiltrados = productos.filter(p => {
    const term = busqueda.trim().toLowerCase();
    const stTienda = typeof p.stock_tienda === "number" ? p.stock_tienda : (p.stock || 0);
    const stAlmacen = typeof p.stock_almacen === "number" ? p.stock_almacen : 0;

    const coincideTexto =
      !term ||
      p.nombre.toLowerCase().includes(term) ||
      p.codigo.toLowerCase().includes(term) ||
      (p.marca && p.marca.toLowerCase().includes(term)) ||
      (p.ubicacion_tienda && p.ubicacion_tienda.toLowerCase().includes(term)) ||
      (p.ubicacion_almacen && p.ubicacion_almacen.toLowerCase().includes(term));

    if (!coincideTexto) return false;

    if (filtroCategoria && (p.categoria_comercial !== filtroCategoria && p.categoria !== filtroCategoria)) {
      return false;
    }

    if (filtroUbicacion === "solo_almacen" && stAlmacen <= 0) return false;
    if (filtroUbicacion === "solo_tienda" && stTienda <= 0) return false;
    if (filtroUbicacion === "agotados_tienda" && (stTienda > 0 || stAlmacen <= 0)) return false;

    return true;
  });

  // Filtrar productos para el módulo de traslado a tienda / almacén
  const productosParaTraslado = productos.filter(prod => {
    const term = busquedaProductoTraslado.trim().toLowerCase();
    const stAlmacen = typeof prod.stock_almacen === "number" ? prod.stock_almacen : 0;
    const stTienda = typeof prod.stock_tienda === "number" ? prod.stock_tienda : (prod.stock || 0);
    const maxOrigen = tipoTraslado === "ALMACEN_A_TIENDA" ? stAlmacen : stTienda;

    // Filtro por texto de búsqueda
    if (term) {
      const coincide =
        prod.nombre.toLowerCase().includes(term) ||
        prod.codigo.toLowerCase().includes(term) ||
        (prod.marca && prod.marca.toLowerCase().includes(term)) ||
        (prod.modelo && prod.modelo.toLowerCase().includes(term)) ||
        (prod.lote && prod.lote.toLowerCase().includes(term)) ||
        (prod.ubicacion_almacen && prod.ubicacion_almacen.toLowerCase().includes(term)) ||
        (prod.ubicacion_tienda && prod.ubicacion_tienda.toLowerCase().includes(term));
      if (!coincide) return false;
    }

    // Filtro por categoría
    if (categoriaFiltroTraslado) {
      const catProd = prod.categoria_comercial || prod.categoria;
      if (catProd !== categoriaFiltroTraslado) return false;
    }

    // Filtro por disponibilidad
    if (filtroDisponibilidadTraslado === "con_stock" && maxOrigen <= 0) {
      return false;
    }
    if (filtroDisponibilidadTraslado === "agotados_tienda" && (stTienda > 0 || stAlmacen <= 0)) {
      return false;
    }

    return true;
  });

  // Conteo de artículos listos para mover por categoría
  const conteoPorCategoria = (cat: string) => {
    return productos.filter(p => {
      const matchCat = (p.categoria_comercial || p.categoria) === cat;
      const stAlm = typeof p.stock_almacen === "number" ? p.stock_almacen : 0;
      return matchCat && stAlm > 0;
    }).length;
  };

  // Filtrar productos para la pestaña de reposición urgente
  const articulosReposicionFiltrados = (resumen?.articulos_reposicion_urgente || []).filter(prod => {
    const term = busquedaReposicion.trim().toLowerCase();
    if (term) {
      const coincide =
        prod.nombre.toLowerCase().includes(term) ||
        prod.codigo.toLowerCase().includes(term) ||
        (prod.ubicacion_almacen && prod.ubicacion_almacen.toLowerCase().includes(term));
      if (!coincide) return false;
    }
    if (categoriaFiltroReposicion) {
      const catProd = prod.categoria_comercial || prod.categoria;
      if (catProd !== categoriaFiltroReposicion) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                Almacén & Traslados a Tienda
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Control logístico multi-depósito, reserva en almacén central y reposición a piso de venta.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={cargarTodo}
            className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-2xl transition shadow-sm cursor-pointer"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-4 h-4 ${cargando ? "animate-spin text-indigo-600" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              setTipoTraslado("ALMACEN_A_TIENDA");
              setTabActiva("traslado");
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-2xl text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition cursor-pointer"
          >
            <ArrowRightLeft className="w-4 h-4" />
            Nuevo Traslado
          </button>
        </div>
      </div>

      {/* KPI Cards de Resumen Logístico */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stock en Almacén */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Almacén / Depósito
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-slate-800 mt-2">
            {resumen?.total_stock_almacen || 0}{" "}
            <span className="text-xs font-bold text-slate-400">unidades</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-1 font-semibold">
            Valor Costo: ${resumen?.valor_almacen_costo_usd?.toFixed(2) || "0.00"}
          </p>
        </div>

        {/* Stock en Tienda / Piso de Venta */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Piso de Venta / Tienda
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-slate-800 mt-2">
            {resumen?.total_stock_tienda || 0}{" "}
            <span className="text-xs font-bold text-slate-400">unidades</span>
          </h3>
          <p className="text-[11px] text-indigo-600 mt-1 font-semibold">
            Valor PVP: ${resumen?.valor_tienda_pvp_usd?.toFixed(2) || "0.00"}
          </p>
        </div>

        {/* Total Stock Global */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Inventario Total Combinado
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-emerald-600 mt-2">
            {resumen?.total_stock_global || 0}{" "}
            <span className="text-xs font-bold text-slate-400">unidades</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-1 font-semibold">
            Equivalente: Bs. {(((resumen?.total_stock_global || 0) > 0 ? (resumen?.valor_tienda_costo_usd || 0) + (resumen?.valor_almacen_costo_usd || 0) : 0) * tasaBCV).toFixed(2)}
          </p>
        </div>

        {/* Alerta de Reposición Urgente */}
        <div
          onClick={() => setTabActiva("reposicion")}
          className={`p-5 rounded-3xl border shadow-sm relative overflow-hidden cursor-pointer transition ${
            (resumen?.articulos_reposicion_urgente?.length || 0) > 0
              ? "bg-rose-50/80 border-rose-200 hover:bg-rose-100/80"
              : "bg-white border-slate-100"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[10px] font-black uppercase tracking-wider ${
                (resumen?.articulos_reposicion_urgente?.length || 0) > 0
                  ? "text-rose-600"
                  : "text-slate-400"
              }`}
            >
              Reposición Urgente
            </span>
            <div
              className={`p-2 rounded-xl ${
                (resumen?.articulos_reposicion_urgente?.length || 0) > 0
                  ? "bg-rose-200 text-rose-700 animate-pulse"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <h3
            className={`text-2xl font-black mt-2 ${
              (resumen?.articulos_reposicion_urgente?.length || 0) > 0
                ? "text-rose-600"
                : "text-slate-800"
            }`}
          >
            {resumen?.articulos_reposicion_urgente?.length || 0}{" "}
            <span className="text-xs font-bold text-slate-400">artículos</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-1 font-semibold">
            Agotados en mostrador con stock en almacén
          </p>
        </div>
      </div>

      {/* Selector de Pestañas */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setTabActiva("existencias")}
          className={`px-4 py-2 rounded-2xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
            tabActiva === "existencias"
              ? "bg-slate-900 text-white shadow-md"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Layers className="w-4 h-4" />
          Existencias Almacén vs Tienda
        </button>

        <button
          type="button"
          onClick={() => setTabActiva("traslado")}
          className={`px-4 py-2 rounded-2xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
            tabActiva === "traslado"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          Ejecutar Traslado Interno
          {carritoTraslado.length > 0 && (
            <span className="bg-white text-indigo-700 text-[10px] px-1.5 py-0.5 rounded-full font-black">
              {carritoTraslado.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setTabActiva("reposicion")}
          className={`px-4 py-2 rounded-2xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
            tabActiva === "reposicion"
              ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Sugerencias de Reposición
          {(resumen?.articulos_reposicion_urgente?.length || 0) > 0 && (
            <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black">
              {resumen?.articulos_reposicion_urgente?.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setTabActiva("guias")}
          className={`px-4 py-2 rounded-2xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
            tabActiva === "guias"
              ? "bg-slate-900 text-white shadow-md"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <FileText className="w-4 h-4" />
          Bitácora de Guías ({traslados.length})
        </button>
      </div>

      {/* PESTAÑA 1: EXISTENCIAS DETALLADAS */}
      {tabActiva === "existencias" && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden space-y-4 p-5">
          {/* Barra de Filtros */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por código, nombre, ubicación o lote..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2 pl-10 pr-4 text-xs font-semibold outline-none focus:bg-white focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filtroUbicacion}
                onChange={e => setFiltroUbicacion(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 outline-none"
              >
                <option value="todos">Todos los Estados</option>
                <option value="solo_almacen">📦 Con Stock en Almacén</option>
                <option value="solo_tienda">🏪 Con Stock en Tienda</option>
                <option value="agotados_tienda">🚨 Agotados en Tienda (Con Almacén)</option>
              </select>

              {categoriasDisponibles.length > 0 && (
                <select
                  value={filtroCategoria}
                  onChange={e => setFiltroCategoria(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 outline-none"
                >
                  <option value="">Todas las Categorías</option>
                  {categoriasDisponibles.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Tabla de Productos */}
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="p-3 pl-4">Código / Producto</th>
                  <th className="p-3">Ubicación Física</th>
                  <th className="p-3 text-center">Stock Tienda (Piso)</th>
                  <th className="p-3 text-center">Stock Almacén (Reserva)</th>
                  <th className="p-3 text-center">Total Global</th>
                  <th className="p-3 text-right">PVP Unitario</th>
                  <th className="p-3 text-center pr-4">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {productosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400 font-medium">
                      No se encontraron productos con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  productosFiltrados.map(prod => {
                    const stTienda = typeof prod.stock_tienda === "number" ? prod.stock_tienda : (prod.stock || 0);
                    const stAlmacen = typeof prod.stock_almacen === "number" ? prod.stock_almacen : 0;
                    const total = Number(((stTienda || 0) + (stAlmacen || 0)).toFixed(3));
                    const min = typeof prod.stock_minimo === "number" ? prod.stock_minimo : 5;
                    const necesitaReposicion = stTienda <= min && stAlmacen > 0;

                    return (
                      <tr key={prod.id} className="hover:bg-slate-50/70 transition">
                        <td className="p-3 pl-4">
                          <div className="font-bold text-slate-800">{prod.nombre}</div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                            <span>{prod.codigo}</span>
                            {prod.marca && <span className="text-slate-500">| {prod.marca}</span>}
                            {prod.lote && <span className="text-indigo-600 font-semibold">Lote: {prod.lote}</span>}
                          </div>
                        </td>

                        <td className="p-3 text-[11px]">
                          <div className="text-slate-600">
                            <span className="font-bold text-indigo-700">Tienda:</span>{" "}
                            {prod.ubicacion_tienda || prod.ubicacion || "Mostrador general"}
                          </div>
                          <div className="text-slate-500 text-[10px] mt-0.5">
                            <span className="font-bold text-amber-700">Almacén:</span>{" "}
                            {prod.ubicacion_almacen || "Depósito Central"}
                          </div>
                        </td>

                        <td className="p-3 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <span
                              className={`font-black px-2.5 py-1 rounded-xl text-xs ${
                                stTienda === 0
                                  ? "bg-rose-100 text-rose-700"
                                  : stTienda <= min
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-emerald-50 text-emerald-700"
                              }`}
                            >
                              {stTienda} {prod.unidad_medida || "UND"}
                            </span>
                          </div>
                          {necesitaReposicion && (
                            <span className="block text-[9px] text-rose-600 font-bold mt-1 animate-pulse">
                              ¡Reponer a Tienda!
                            </span>
                          )}
                        </td>

                        <td className="p-3 text-center">
                          <span
                            className={`font-black px-2.5 py-1 rounded-xl text-xs ${
                              stAlmacen > 0 ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            {stAlmacen} {prod.unidad_medida || "UND"}
                          </span>
                        </td>

                        <td className="p-3 text-center font-bold text-slate-800">
                          {total}
                        </td>

                        <td className="p-3 text-right font-black text-slate-800">
                          ${prod.precio_venta.toFixed(2)}
                        </td>

                        <td className="p-3 pr-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {stAlmacen > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setTipoTraslado("ALMACEN_A_TIENDA");
                                  agregarAlCarrito(prod, Math.min(stAlmacen, 5));
                                  setTabActiva("traslado");
                                }}
                                className="p-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded-xl transition cursor-pointer"
                                title="Trasladar del Almacén a la Tienda"
                              >
                                <ArrowRight className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setProductoAjuste(prod);
                                setUbicacionAjuste("ALMACEN");
                                setNuevoStockAjuste(String(stAlmacen));
                              }}
                              className="p-1.5 bg-slate-100 hover:bg-slate-800 text-slate-600 hover:text-white rounded-xl transition cursor-pointer"
                              title="Ajuste de Conteo Físico"
                            >
                              <Sliders className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: EJECUTAR TRASLADO INTERNO */}
      {tabActiva === "traslado" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Columna Izquierda: Búsqueda y Selección de Productos */}
          <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Search className="w-4 h-4 text-indigo-600" />
                1. Localizar y Seleccionar Artículos
              </h3>
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-xl">
                {productosParaTraslado.length} productos listos
              </span>
            </div>

            {/* Dirección del Traslado */}
            <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setTipoTraslado("ALMACEN_A_TIENDA")}
                className={`py-2.5 px-3 rounded-xl font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer ${
                  tipoTraslado === "ALMACEN_A_TIENDA"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "text-slate-600 hover:bg-white/60"
                }`}
              >
                <Boxes className="w-4 h-4" />
                📦 Almacén ➡️ 🏪 Tienda
              </button>

              <button
                type="button"
                onClick={() => setTipoTraslado("TIENDA_A_ALMACEN")}
                className={`py-2.5 px-3 rounded-xl font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer ${
                  tipoTraslado === "TIENDA_A_ALMACEN"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "text-slate-600 hover:bg-white/60"
                }`}
              >
                <Store className="w-4 h-4" />
                🏪 Tienda ➡️ 📦 Almacén
              </button>
            </div>

            {/* Barra de Búsqueda y Selector de Categoría Principal */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Barcode className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={
                    tipoTraslado === "ALMACEN_A_TIENDA"
                      ? "Buscar por código, nombre, marca o rack de almacén..."
                      : "Buscar artículos en tienda para devolver al depósito..."
                  }
                  value={busquedaProductoTraslado}
                  onChange={e => setBusquedaProductoTraslado(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 pl-10 pr-9 text-xs font-bold outline-none focus:bg-white focus:border-indigo-500 transition"
                />
                {busquedaProductoTraslado && (
                  <button
                    type="button"
                    onClick={() => setBusquedaProductoTraslado("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-black cursor-pointer"
                    title="Limpiar búsqueda"
                  >
                    ✕
                  </button>
                )}
              </div>

              {categoriasDisponibles.length > 0 && (
                <div className="sm:w-48">
                  <select
                    value={categoriaFiltroTraslado}
                    onChange={e => setCategoriaFiltroTraslado(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 px-3 text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-indigo-500"
                  >
                    <option value="">📂 Todas las categorías</option>
                    {categoriasDisponibles.map(cat => (
                      <option key={cat} value={cat}>
                        {cat} ({conteoPorCategoria(cat)})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Chips Rápidos de Categoría (Scroll horizontal) */}
            {categoriasDisponibles.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                <button
                  type="button"
                  onClick={() => setCategoriaFiltroTraslado("")}
                  className={`px-3 py-1.5 rounded-xl font-black whitespace-nowrap transition cursor-pointer text-[11px] flex items-center gap-1 ${
                    !categoriaFiltroTraslado
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <Filter className="w-3 h-3" />
                  Todas ({productos.length})
                </button>
                {categoriasDisponibles.map(cat => {
                  const cant = conteoPorCategoria(cat);
                  const isSelected = categoriaFiltroTraslado === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoriaFiltroTraslado(isSelected ? "" : cat)}
                      className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer text-[11px] flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      <span>{cat}</span>
                      {cant > 0 && (
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded-full font-black ${
                            isSelected ? "bg-indigo-700 text-white" : "bg-amber-100 text-amber-800"
                          }`}
                          title={`${cant} con stock en almacén`}
                        >
                          {cant}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Filtros de Disponibilidad y Estado */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setFiltroDisponibilidadTraslado("con_stock")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    filtroDisponibilidadTraslado === "con_stock"
                      ? "bg-amber-100 text-amber-900 border border-amber-300"
                      : "bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  📦 Con existencia en {tipoTraslado === "ALMACEN_A_TIENDA" ? "Almacén" : "Tienda"}
                </button>

                <button
                  type="button"
                  onClick={() => setFiltroDisponibilidadTraslado("agotados_tienda")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    filtroDisponibilidadTraslado === "agotados_tienda"
                      ? "bg-rose-100 text-rose-900 border border-rose-300"
                      : "bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  🚨 Agotados en Piso
                </button>

                <button
                  type="button"
                  onClick={() => setFiltroDisponibilidadTraslado("todos")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    filtroDisponibilidadTraslado === "todos"
                      ? "bg-indigo-100 text-indigo-900 border border-indigo-300"
                      : "bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  📋 Todo el Catálogo
                </button>
              </div>

              {(busquedaProductoTraslado || categoriaFiltroTraslado || filtroDisponibilidadTraslado !== "con_stock") && (
                <button
                  type="button"
                  onClick={() => {
                    setBusquedaProductoTraslado("");
                    setCategoriaFiltroTraslado("");
                    setFiltroDisponibilidadTraslado("con_stock");
                  }}
                  className="text-[10px] font-black text-indigo-600 hover:underline cursor-pointer"
                >
                  Restablecer filtros
                </button>
              )}
            </div>

            {/* Listado de Productos Disponibles con Acciones Rápidas */}
            <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 max-h-96 overflow-y-auto bg-slate-50/50">
              {productosParaTraslado.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <Package className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">No se encontraron artículos con los filtros actuales.</p>
                  <p className="text-[11px] text-slate-400">
                    Prueba cambiando la búsqueda, la categoría o seleccionando &quot;Todo el Catálogo&quot;.
                  </p>
                </div>
              ) : (
                productosParaTraslado.slice(0, 50).map(prod => {
                  const stAlmacen = typeof prod.stock_almacen === "number" ? prod.stock_almacen : 0;
                  const stTienda = typeof prod.stock_tienda === "number" ? prod.stock_tienda : (prod.stock || 0);
                  const maxDisponible = tipoTraslado === "ALMACEN_A_TIENDA" ? stAlmacen : stTienda;
                  const enCarrito = carritoTraslado.find(c => c.producto.id === prod.id);
                  const cat = prod.categoria_comercial || prod.categoria;

                  return (
                    <div
                      key={prod.id}
                      className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white transition"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-slate-800">{prod.nombre}</span>
                          {cat && (
                            <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                              {cat}
                            </span>
                          )}
                          {enCarrito && (
                            <span className="text-[9px] font-black bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                              ✓ En lista: {enCarrito.cantidad}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[10px] text-slate-500 font-medium mt-1 flex-wrap">
                          <span className="font-mono bg-slate-200/70 text-slate-700 px-1.5 py-0.2 rounded text-[9px]">
                            {prod.codigo}
                          </span>
                          <span>
                            🏪 Tienda: <b className={`${stTienda === 0 ? "text-rose-600" : "text-slate-800"}`}>{stTienda} {prod.unidad_medida || "u."}</b>
                            {prod.ubicacion_tienda && ` (${prod.ubicacion_tienda})`}
                          </span>
                          <span>
                            📦 Almacén: <b className="text-amber-700">{stAlmacen} {prod.unidad_medida || "u."}</b>
                            {prod.ubicacion_almacen && ` [${prod.ubicacion_almacen}]`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {maxDisponible > 0 ? (
                          <>
                            <button
                              type="button"
                              onClick={() => agregarAlCarrito(prod, 1)}
                              className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1"
                              title="Agregar 1 unidad"
                            >
                              <Plus className="w-3.5 h-3.5" /> +1
                            </button>

                            {maxDisponible >= 5 && (
                              <button
                                type="button"
                                onClick={() => agregarAlCarrito(prod, 5)}
                                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded-xl text-xs font-black transition cursor-pointer"
                                title="Agregar 5 unidades"
                              >
                                +5
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => agregarAlCarrito(prod, maxDisponible)}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1 shadow-sm shadow-indigo-600/20"
                              title={`Agregar todo el stock disponible (${maxDisponible})`}
                            >
                              +Todo ({maxDisponible})
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-xl">
                            Sin existencias en origen
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Sugerencias Rápidas de Artículos Agotados */}
            {(resumen?.articulos_reposicion_urgente?.length || 0) > 0 && (
              <div className="bg-rose-50/60 border border-rose-100 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-rose-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    Artículos agotados en piso de venta que puedes reponer ahora:
                  </span>
                  <button
                    type="button"
                    onClick={reabastecerTodoUrgente}
                    className="text-[10px] font-black text-rose-700 hover:underline cursor-pointer"
                  >
                    Agregar Todos ({resumen?.articulos_reposicion_urgente?.length})
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {resumen?.articulos_reposicion_urgente?.slice(0, 6).map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => agregarAlCarrito(p, Math.min(typeof p.stock_almacen === "number" ? p.stock_almacen : 5, 5))}
                      className="bg-white border border-rose-200 hover:border-rose-400 px-2.5 py-1.5 rounded-xl text-[10px] font-bold text-slate-800 flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-rose-600" />
                      {p.nombre.slice(0, 22)}... (Alm: {p.stock_almacen})
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Columna Derecha: Resumen de Guía de Traslado y Confirmación */}
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  2. Lista de Carga ({carritoTraslado.length})
                </h3>
                {carritoTraslado.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCarritoTraslado([])}
                    className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                  >
                    Vaciar lista
                  </button>
                )}
              </div>

              {/* Items en la lista */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {carritoTraslado.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs font-medium space-y-2">
                    <Package className="w-8 h-8 text-slate-300 mx-auto" />
                    <p>No ha seleccionado ningún producto para trasladar.</p>
                  </div>
                ) : (
                  carritoTraslado.map((item, idx) => {
                    const stAlmacen = typeof item.producto.stock_almacen === "number" ? item.producto.stock_almacen : 0;
                    const stTienda = typeof item.producto.stock_tienda === "number" ? item.producto.stock_tienda : (item.producto.stock || 0);
                    const max = tipoTraslado === "ALMACEN_A_TIENDA" ? stAlmacen : stTienda;

                    return (
                      <div
                        key={item.producto.id}
                        className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between gap-3 text-xs border border-slate-100"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 truncate">{item.producto.nombre}</p>
                          <p className="text-[10px] text-slate-400">
                            Max disp.: <b className="text-indigo-600">{max}</b> {item.producto.unidad_medida || "UND"}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            max={max}
                            value={item.cantidad}
                            onChange={e =>
                              modificarCantidadCarrito(item.producto.id, Math.min(max, Math.max(1, Number(e.target.value))))
                            }
                            className="w-16 bg-white border border-slate-200 rounded-xl py-1 px-2 text-center font-black text-xs text-indigo-700 outline-none"
                          />

                          <button
                            type="button"
                            onClick={() => eliminarDelCarrito(item.producto.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Parámetros del Traslado */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100 text-xs">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Motivo del Movimiento
                  </label>
                  <select
                    value={motivoTraslado}
                    onChange={e => setMotivoTraslado(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 outline-none"
                  >
                    <option value="Reposición de mostrador">Reposición de mostrador / piso de venta</option>
                    <option value="Reabastecimiento urgente">Reabastecimiento urgente por demanda</option>
                    <option value="Devolución por sobrestock">Devolución a depósito por sobrestock</option>
                    <option value="Avería o producto dañado">Apartado para revisión técnica / merma</option>
                    <option value="Ajuste por conteo">Ajuste de reorganización de pasillo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Observaciones (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Recibido por cajero turno tarde..."
                    value={observacionesTraslado}
                    onChange={e => setObservacionesTraslado(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 outline-none focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Botón de Procesar y Generar Guía */}
            <div className="pt-4 border-t border-slate-100">
              <button
                type="button"
                disabled={carritoTraslado.length === 0}
                onClick={procesarTraslado}
                className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition cursor-pointer ${
                  carritoTraslado.length > 0
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/25"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirmar Traslado e Imprimir Guía
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: SUGERENCIAS DE REPOSICIÓN URGENTE */}
      {tabActiva === "reposicion" && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                Matriz de Reposición Urgente a Mostrador
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Artículos con existencia en almacén que están por agotarse o ya se agotaron en el piso de venta.
              </p>
            </div>

            {(resumen?.articulos_reposicion_urgente?.length || 0) > 0 && (
              <button
                type="button"
                onClick={reabastecerTodoUrgente}
                className="bg-rose-600 hover:bg-rose-700 text-white font-black px-4 py-2.5 rounded-2xl text-xs flex items-center gap-2 shadow-lg shadow-rose-600/20 transition cursor-pointer"
              >
                <ArrowRightLeft className="w-4 h-4" />
                Cargar Todos al Traslado ({resumen?.articulos_reposicion_urgente?.length})
              </button>
            )}
          </div>

          {/* Filtros y Buscador para Artículos de Reposición */}
          {(resumen?.articulos_reposicion_urgente?.length || 0) > 0 && (
            <div className="flex flex-col sm:flex-row gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar en artículos urgentes por nombre, código o rack..."
                  value={busquedaReposicion}
                  onChange={e => setBusquedaReposicion(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-10 pr-8 text-xs font-semibold outline-none focus:border-rose-500"
                />
                {busquedaReposicion && (
                  <button
                    type="button"
                    onClick={() => setBusquedaReposicion("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              {categoriasDisponibles.length > 0 && (
                <div className="sm:w-56">
                  <select
                    value={categoriaFiltroReposicion}
                    onChange={e => setCategoriaFiltroReposicion(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 outline-none focus:border-rose-500"
                  >
                    <option value="">📂 Todas las categorías urgentes</option>
                    {categoriasDisponibles.map(cat => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {!resumen?.articulos_reposicion_urgente?.length ? (
            <div className="text-center py-16 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h4 className="font-bold text-slate-800 text-sm">
                ¡Piso de venta completamente abastecido!
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No hay productos en tienda con nivel crítico que tengan existencias pendientes en el almacén central.
              </p>
            </div>
          ) : articulosReposicionFiltrados.length === 0 ? (
            <div className="text-center py-12 space-y-2 text-slate-400">
              <p className="text-xs font-bold text-slate-600">No hay artículos urgentes que coincidan con la búsqueda o categoría seleccionada.</p>
              <button
                type="button"
                onClick={() => {
                  setBusquedaReposicion("");
                  setCategoriaFiltroReposicion("");
                }}
                className="text-xs text-rose-600 font-bold hover:underline"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {articulosReposicionFiltrados.map(prod => {
                const stTienda = typeof prod.stock_tienda === "number" ? prod.stock_tienda : (prod.stock || 0);
                const stAlmacen = typeof prod.stock_almacen === "number" ? prod.stock_almacen : 0;
                const cat = prod.categoria_comercial || prod.categoria;

                return (
                  <div
                    key={prod.id}
                    className="p-4 rounded-2xl border border-rose-100 bg-rose-50/40 hover:bg-rose-50/80 transition flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9px] font-mono text-slate-400 uppercase">
                            {prod.codigo}
                          </span>
                          {cat && (
                            <span className="text-[8.5px] font-bold bg-white text-slate-600 px-1.5 py-0.2 rounded border border-rose-100">
                              {cat}
                            </span>
                          )}
                        </div>
                        <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-2 py-0.5 rounded-md">
                          {stTienda === 0 ? "AGOTADO EN TIENDA" : "CRÍTICO"}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-slate-800 mt-1">{prod.nombre}</h4>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Ubicación Almacén: <b className="text-slate-700">{prod.ubicacion_almacen || "Rack Central"}</b>
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-rose-100 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">En Almacén</span>
                        <span className="font-black text-amber-700">
                          {stAlmacen} {prod.unidad_medida || "UND"}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => reabastecerUrgente(prod)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        Trasladar a Tienda
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 4: BITÁCORA DE GUÍAS DE TRASLADO */}
      {tabActiva === "guias" && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Historial de Movimientos y Guías Generadas
            </h3>
            <span className="text-xs font-bold text-slate-400">
              {traslados.length} guías emitidas
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="p-3 pl-4">Nº Guía</th>
                  <th className="p-3">Fecha y Hora</th>
                  <th className="p-3">Tipo de Traslado</th>
                  <th className="p-3">Responsable</th>
                  <th className="p-3">Motivo</th>
                  <th className="p-3 text-center">Unidades</th>
                  <th className="p-3 text-center pr-4">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {traslados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400 font-medium">
                      No hay registros de traslados internos.
                    </td>
                  </tr>
                ) : (
                  traslados.map(tr => (
                    <tr key={tr.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3 pl-4 font-mono font-bold text-indigo-700">
                        {tr.numero_guia}
                      </td>
                      <td className="p-3 text-slate-600">
                        {new Date(tr.fecha).toLocaleString("es-VE")}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                            tr.tipo === "ALMACEN_A_TIENDA"
                              ? "bg-indigo-50 text-indigo-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {tr.tipo === "ALMACEN_A_TIENDA"
                            ? "📦 Almacén ➡️ Tienda"
                            : "🏪 Tienda ➡️ Almacén"}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-700 uppercase text-[11px]">
                        {tr.usuario}
                      </td>
                      <td className="p-3 text-slate-600 text-[11px]">{tr.motivo}</td>
                      <td className="p-3 text-center font-black text-slate-800">
                        {tr.total_unidades}
                      </td>
                      <td className="p-3 pr-4 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setGuiaSeleccionada(tr);
                            setMostrarModalGuia(true);
                          }}
                          className="bg-slate-100 hover:bg-slate-800 text-slate-700 hover:text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 mx-auto transition cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Imprimir
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Impresión de Guía de Traslado */}
      {mostrarModalGuia && guiaSeleccionada && (
        <ThermalTransferInternalModal
          traslado={guiaSeleccionada}
          isOpen={mostrarModalGuia}
          onClose={() => setMostrarModalGuia(false)}
        />
      )}

      {/* Modal de Ajuste Rápido de Stock Físico */}
      {productoAjuste && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md p-6 space-y-4">
            <h3 className="font-black text-sm uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600" />
              Ajuste de Conteo Físico
            </h3>

            <div>
              <p className="font-bold text-xs text-slate-900">{productoAjuste.nombre}</p>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{productoAjuste.codigo}</p>
            </div>

            <form onSubmit={guardarAjusteRapido} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Ubicación a Ajustar
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setUbicacionAjuste("ALMACEN");
                      setNuevoStockAjuste(String(productoAjuste.stock_almacen || 0));
                    }}
                    className={`py-2 px-3 rounded-xl font-bold transition ${
                      ubicacionAjuste === "ALMACEN"
                        ? "bg-amber-500 text-white shadow-md"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    📦 En Almacén
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUbicacionAjuste("TIENDA");
                      setNuevoStockAjuste(String(productoAjuste.stock_tienda || 0));
                    }}
                    className={`py-2 px-3 rounded-xl font-bold transition ${
                      ubicacionAjuste === "TIENDA"
                        ? "bg-indigo-600 text-white shadow-md"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    🏪 En Tienda
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Nuevo Stock Verificado ({productoAjuste.unidad_medida || "UND"})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={nuevoStockAjuste}
                  onChange={e => setNuevoStockAjuste(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm font-black text-indigo-700 outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Motivo de la Corrección
                </label>
                <select
                  value={motivoAjuste}
                  onChange={e => setMotivoAjuste(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 outline-none"
                >
                  <option value="Conteo físico de inventario">Conteo físico de inventario / Auditoría</option>
                  <option value="Mercancía vencida o dañada">Baja por merma / vencimiento</option>
                  <option value="Ajuste por ingreso manual">Ajuste por ingreso manual no facturado</option>
                  <option value="Corrección de descuadre">Corrección de descuadre operativo</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setProductoAjuste(null)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={guardandoAjuste}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl transition shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  {guardandoAjuste ? "Guardando..." : "Guardar Ajuste"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
