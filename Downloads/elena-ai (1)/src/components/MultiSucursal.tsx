/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  Building2,
  Truck,
  ArrowRightLeft,
  Boxes,
  TrendingUp,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  Ban,
  Printer,
  FileText,
  MapPin,
  Phone,
  Store,
  Layers,
  AlertTriangle,
  RefreshCw,
  X,
  UserCheck,
  Hash,
  ShieldCheck,
  Check,
  Share2,
  Calendar,
  DollarSign,
  ChevronRight,
  PackageCheck,
  QrCode,
  Sparkles,
  Download
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Sucursal, Traslado, TrasladoItem, Producto, StockSucursalItem, Usuario } from "../types";
import { apiFetch } from "../utils/api";
import { generarManualInstalacionPDF } from "../utils/generarManualPDF";

type TabMultiSucursal = "traslados" | "consolidado" | "sucursales";

export default function MultiSucursal() {
  const [activeTab, setActiveTab] = useState<TabMultiSucursal>("traslados");
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [traslados, setTraslados] = useState<Traslado[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [configActual, setConfigActual] = useState<{ sucursalActualId: string; cajaActual: string } | null>(null);

  // Filtros de traslados
  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS");
  const [filtroBusqueda, setFiltroBusqueda] = useState<string>("");

  // Modales
  const [modalNuevoTraslado, setModalNuevoTraslado] = useState<boolean>(false);
  const [modalImprimirGuia, setModalImprimirGuia] = useState<Traslado | null>(null);
  const [modalNuevaSucursal, setModalNuevaSucursal] = useState<boolean>(false);
  const [sucursalEditar, setSucursalEditar] = useState<Sucursal | null>(null);

  // Formulario Nuevo Traslado
  const [origenId, setOrigenId] = useState<string>("");
  const [destinoId, setDestinoId] = useState<string>("");
  const [conductorNombre, setConductorNombre] = useState<string>("");
  const [vehiculoPlaca, setVehiculoPlaca] = useState<string>("");
  const [motivoTraslado, setMotivoTraslado] = useState<string>("Reabastecimiento de mostrador");
  const [observacionesTraslado, setObservacionesTraslado] = useState<string>("");
  const [itemsTraslado, setItemsTraslado] = useState<TrasladoItem[]>([]);
  
  // Selector de producto para agregar
  const [busquedaProd, setBusquedaProd] = useState<string>("");
  const [prodSeleccionado, setProdSeleccionado] = useState<Producto | null>(null);
  const [cantidadAgregar, setCantidadAgregar] = useState<number>(1);
  const [loteAgregar, setLoteAgregar] = useState<string>("");
  const [vencimientoAgregar, setVencimientoAgregar] = useState<string>("");

  // Formulario Sucursal
  const [formSucursal, setFormSucursal] = useState({
    codigo: "",
    nombre: "",
    direccion: "",
    telefono: "",
    ciudad: "",
    esPrincipal: false,
    cajas: "CAJA-01, CAJA-02"
  });

  // Búsqueda en Stock Global Inter-Sucursales
  const [busquedaStockGlobal, setBusquedaStockGlobal] = useState<string>("");
  const [resultadosStockGlobal, setResultadosStockGlobal] = useState<any[]>([]);
  const [buscandoStock, setBuscandoStock] = useState<boolean>(false);

  // Métricas Consolidadas
  const [metricasConsolidadas, setMetricasConsolidadas] = useState<any>(null);

  // Sesión actual
  const usuarioActual: Usuario | null = useMemo(() => {
    const cached = localStorage.getItem("elena_sesion");
    return cached ? JSON.parse(cached) : null;
  }, []);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [resSuc, resTras, resProd, resConfig, resCons] = await Promise.all([
        apiFetch("/api/sucursales"),
        apiFetch("/api/traslados"),
        apiFetch("/api/productos"),
        apiFetch("/api/sucursales/config-actual"),
        apiFetch("/api/sucursales/consolidado")
      ]);

      if (resSuc.ok) {
        const dataSuc = await resSuc.json();
        setSucursales(dataSuc);
        if (dataSuc.length > 0 && !origenId) {
          setOrigenId(dataSuc[0].id);
          if (dataSuc.length > 1) {
            setDestinoId(dataSuc[1].id);
          }
        }
      }

      if (resTras.ok) {
        setTraslados(await resTras.json());
      }

      if (resProd.ok) {
        setProductos(await resProd.json());
      }

      if (resConfig.ok) {
        const confData = await resConfig.json();
        setConfigActual(confData.config);
      }

      if (resCons.ok) {
        setMetricasConsolidadas(await resCons.json());
      }
    } catch (err) {
      console.error("Error cargando datos de multi-sucursal:", err);
    } finally {
      setCargando(false);
    }
  };

  // Buscar stock en vivo inter-sucursal
  const consultarStockGlobal = async (termino?: string) => {
    const q = termino !== undefined ? termino : busquedaStockGlobal;
    setBuscandoStock(true);
    try {
      const res = await apiFetch(`/api/sucursales/stock-global?search=${encodeURIComponent(q)}`);
      if (res.ok) {
        setResultadosStockGlobal(await res.json());
      }
    } catch (err) {
      console.error("Error consultando stock global:", err);
    } finally {
      setBuscandoStock(false);
    }
  };

  useEffect(() => {
    if (activeTab === "consolidado") {
      consultarStockGlobal();
    }
  }, [activeTab]);

  const agregarItemATraslado = () => {
    if (!prodSeleccionado) return alert("Por favor, seleccione un producto");
    if (cantidadAgregar <= 0) return alert("La cantidad debe ser mayor a 0");
    if (cantidadAgregar > prodSeleccionado.stock) {
      return alert(`La cantidad no puede superar el stock disponible en la sede (${prodSeleccionado.stock} unidades)`);
    }

    const indexExistente = itemsTraslado.findIndex(it => it.producto_id === prodSeleccionado.id);
    if (indexExistente >= 0) {
      const actual = itemsTraslado[indexExistente];
      const nuevaCant = actual.cantidad + cantidadAgregar;
      if (nuevaCant > prodSeleccionado.stock) {
        return alert(`La cantidad acumulada (${nuevaCant}) supera el stock disponible (${prodSeleccionado.stock})`);
      }
      const copia = [...itemsTraslado];
      copia[indexExistente] = {
        ...actual,
        cantidad: nuevaCant,
        lote: loteAgregar || actual.lote,
        fecha_vencimiento: vencimientoAgregar || actual.fecha_vencimiento
      };
      setItemsTraslado(copia);
    } else {
      const nuevoItem: TrasladoItem = {
        producto_id: prodSeleccionado.id,
        codigo: prodSeleccionado.codigo,
        nombre: prodSeleccionado.nombre,
        categoria: prodSeleccionado.categoria,
        cantidad: cantidadAgregar,
        precio_costo: prodSeleccionado.precio_compra,
        precio_venta: prodSeleccionado.precio_venta,
        lote: loteAgregar || "LOT-AUTO",
        fecha_vencimiento: vencimientoAgregar || ""
      };
      setItemsTraslado([...itemsTraslado, nuevoItem]);
    }

    // Reset selección
    setProdSeleccionado(null);
    setBusquedaProd("");
    setCantidadAgregar(1);
    setLoteAgregar("");
    setVencimientoAgregar("");
  };

  const eliminarItemTraslado = (id: string) => {
    setItemsTraslado(itemsTraslado.filter(it => it.producto_id !== id));
  };

  const guardarTraslado = async (enviarInmediato: boolean = true) => {
    if (!origenId || !destinoId) return alert("Seleccione la sucursal de origen y destino");
    if (origenId === destinoId) return alert("La sucursal de destino no puede ser igual a la de origen");
    if (itemsTraslado.length === 0) return alert("Debe agregar al menos un medicamento o producto al traslado");

    try {
      const res = await apiFetch("/api/traslados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sucursal_origen_id: origenId,
          sucursal_destino_id: destinoId,
          conductor_nombre: conductorNombre,
          vehiculo_placa: vehiculoPlaca,
          motivo: motivoTraslado,
          observaciones: observacionesTraslado,
          items: itemsTraslado,
          estado: enviarInmediato ? "EN_TRANSITO" : "BORRADOR",
          usuario: usuarioActual?.nombre || "Admin"
        })
      });

      const data = await res.json();
      if (res.ok) {
        setModalNuevoTraslado(false);
        // Limpiar
        setItemsTraslado([]);
        setConductorNombre("");
        setVehiculoPlaca("");
        setObservacionesTraslado("");
        // Recargar datos
        cargarDatos();
        // Abrir guía para imprimir de inmediato
        if (data.traslado) {
          setModalImprimirGuia(data.traslado);
        }
      } else {
        alert(data.error || "Error al crear el traslado");
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al procesar el traslado");
    }
  };

  const confirmarRecepcionTraslado = async (traslado: Traslado) => {
    if (!confirm(`¿Confirmar recepción de la Guía ${traslado.numero_guia} con ${traslado.total_unidades} unidades en '${traslado.sucursal_destino_nombre}'?\n\nEsto cargará automáticamente las existencias al inventario.`)) {
      return;
    }

    try {
      const res = await apiFetch(`/api/traslados/${traslado.id}/recibir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario: usuarioActual?.nombre || "Admin Recepción"
        })
      });

      if (res.ok) {
        alert(`✓ Guía ${traslado.numero_guia} recepcionada con éxito. Inventario actualizado.`);
        cargarDatos();
      } else {
        const data = await res.json();
        alert(data.error || "Error al recibir traslado");
      }
    } catch (err) {
      console.error(err);
      alert("Error al confirmar recepción");
    }
  };

  const anularTraslado = async (traslado: Traslado) => {
    const motivo = prompt(`Indique el motivo de anulación para la Guía ${traslado.numero_guia}:`);
    if (motivo === null) return;

    try {
      const res = await apiFetch(`/api/traslados/${traslado.id}/anular`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario: usuarioActual?.nombre || "Admin",
          motivoAnulacion: motivo
        })
      });

      if (res.ok) {
        alert(`Guía ${traslado.numero_guia} anulada. Las existencias han sido reincorporadas al origen.`);
        cargarDatos();
      } else {
        const data = await res.json();
        alert(data.error || "Error al anular traslado");
      }
    } catch (err) {
      console.error(err);
      alert("Error al procesar la anulación");
    }
  };

  const guardarSucursal = async () => {
    if (!formSucursal.codigo || !formSucursal.nombre) {
      return alert("El código y nombre de la sucursal son requeridos");
    }

    const cajasArray = formSucursal.cajas.split(",").map(c => c.trim()).filter(Boolean);

    try {
      const payload: any = {
        codigo: formSucursal.codigo,
        nombre: formSucursal.nombre,
        direccion: formSucursal.direccion,
        telefono: formSucursal.telefono,
        ciudad: formSucursal.ciudad,
        esPrincipal: formSucursal.esPrincipal,
        cajas: cajasArray
      };

      if (sucursalEditar) {
        payload.id = sucursalEditar.id;
      }

      const res = await apiFetch("/api/sucursales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setModalNuevaSucursal(false);
        setSucursalEditar(null);
        setFormSucursal({
          codigo: "",
          nombre: "",
          direccion: "",
          telefono: "",
          ciudad: "",
          esPrincipal: false,
          cajas: "CAJA-01, CAJA-02"
        });
        cargarDatos();
      } else {
        const data = await res.json();
        alert(data.error || "Error al guardar sucursal");
      }
    } catch (err) {
      console.error(err);
      alert("Error al comunicarse con el servidor");
    }
  };

  const cambiarConfigEstacion = async (sucId: string, caja: string) => {
    try {
      const res = await apiFetch("/api/sucursales/config-actual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sucursalActualId: sucId,
          cajaActual: caja
        })
      });

      if (res.ok) {
        const data = await res.json();
        setConfigActual(data.config);
        alert(`✓ Esta terminal ahora está identificada como: ${sucursales.find(s => s.id === sucId)?.nombre} [${caja}]`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const trasladosFiltrados = useMemo(() => {
    return traslados.filter(t => {
      const matchEstado = filtroEstado === "TODOS" || t.estado === filtroEstado;
      const matchSearch =
        filtroBusqueda === "" ||
        t.numero_guia.toLowerCase().includes(filtroBusqueda.toLowerCase()) ||
        t.sucursal_origen_nombre.toLowerCase().includes(filtroBusqueda.toLowerCase()) ||
        t.sucursal_destino_nombre.toLowerCase().includes(filtroBusqueda.toLowerCase()) ||
        (t.conductor_nombre && t.conductor_nombre.toLowerCase().includes(filtroBusqueda.toLowerCase()));
      return matchEstado && matchSearch;
    });
  }, [traslados, filtroEstado, filtroBusqueda]);

  const productosFiltradosModal = useMemo(() => {
    if (!busquedaProd) return [];
    const q = busquedaProd.toLowerCase();
    return productos.filter(p => p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q)).slice(0, 5);
  }, [productos, busquedaProd]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Cabecera Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                Multi-Sucursal & Traslados
              </h1>
              <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                Red Farmacéutica
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Gestión centralizada de sucursales, guías de despacho digitales y control de stock entre sedes
            </p>
          </div>
        </div>

        {/* Identificador de esta Terminal y Botón Manual PDF */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={generarManualInstalacionPDF}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition shadow-sm cursor-pointer"
            title="Descargar Guía Completa de Instalación y Multi-Sucursal en PDF"
          >
            <Download className="w-4 h-4" />
            <span>Descargar Manual PDF</span>
          </button>

          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl">
            <Store className="w-4 h-4 text-slate-500" />
            <div className="text-left">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none">
                Terminal Actual
              </p>
              <p className="text-xs font-bold text-slate-800 mt-1">
                {sucursales.find(s => s.id === configActual?.sucursalActualId)?.codigo || "SUC-01"} - {configActual?.cajaActual || "CAJA-01"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs de Navegación */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab("traslados")}
          className={`flex items-center gap-2.5 px-6 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
            activeTab === "traslados"
              ? "border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-2xl"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Traslados & Guías de Despacho</span>
          <span className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
            {traslados.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("consolidado")}
          className={`flex items-center gap-2.5 px-6 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
            activeTab === "consolidado"
              ? "border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-2xl"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Panel Consolidado (Dueño)</span>
        </button>

        <button
          onClick={() => setActiveTab("sucursales")}
          className={`flex items-center gap-2.5 px-6 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
            activeTab === "sucursales"
              ? "border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-2xl"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Directorio de Sedes & Cajas</span>
          <span className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
            {sucursales.length}
          </span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* PESTAÑA 1: TRASLADOS Y GUÍAS DE DESPACHO */}
      {/* ======================================================== */}
      {activeTab === "traslados" && (
        <div className="space-y-6">
          {/* Tarjetas Resumen de Traslados */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-amber-50/60 border border-amber-200/80 p-5 rounded-3xl flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black text-amber-700 uppercase tracking-wider">
                  En Tránsito (En Carretera)
                </p>
                <h3 className="text-2xl font-black text-amber-950 mt-1">
                  {traslados.filter(t => t.estado === "EN_TRANSITO").length} Guías
                </h3>
                <p className="text-xs text-amber-600 mt-0.5">Pendientes por confirmar en destino</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-100/80 text-amber-700 flex items-center justify-center">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
            </div>

            <div className="bg-emerald-50/60 border border-emerald-200/80 p-5 rounded-3xl flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black text-emerald-700 uppercase tracking-wider">
                  Completados & Recibidos
                </p>
                <h3 className="text-2xl font-black text-emerald-950 mt-1">
                  {traslados.filter(t => t.estado === "RECIBIDO").length} Guías
                </h3>
                <p className="text-xs text-emerald-600 mt-0.5">Inventario cargado exitosamente</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center">
                <PackageCheck className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-indigo-50/60 border border-indigo-200/80 p-5 rounded-3xl flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black text-indigo-700 uppercase tracking-wider">
                  Total de Unidades Movidas
                </p>
                <h3 className="text-2xl font-black text-indigo-950 mt-1">
                  {traslados.reduce((acc, t) => acc + (t.total_unidades || 0), 0)} Uds
                </h3>
                <p className="text-xs text-indigo-600 mt-0.5">Flujo inter-farmacéutico</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-100/80 text-indigo-700 flex items-center justify-center">
                <Boxes className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Barra de Acciones y Filtros */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por N° Guía, sucursal, chofer..."
                  value={filtroBusqueda}
                  onChange={(e) => setFiltroBusqueda(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition"
                />
              </div>

              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
              >
                <option value="TODOS">Todos los Estados</option>
                <option value="EN_TRANSITO">🚚 En Tránsito</option>
                <option value="RECIBIDO">✓ Recibidos</option>
                <option value="BORRADOR">📝 Borradores</option>
                <option value="ANULADO">✕ Anulados</option>
              </select>
            </div>

            <button
              onClick={() => {
                setModalNuevoTraslado(true);
                setItemsTraslado([]);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-5 py-2.5 rounded-2xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Traslado de Mercancía</span>
            </button>
          </div>

          {/* Tabla de Traslados */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/80 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3.5">N° Guía</th>
                    <th className="px-5 py-3.5">Origen &rarr; Destino</th>
                    <th className="px-5 py-3.5">Medicamentos / Items</th>
                    <th className="px-5 py-3.5">Transporte & Chofer</th>
                    <th className="px-5 py-3.5">Fecha Despacho</th>
                    <th className="px-5 py-3.5 text-center">Estado</th>
                    <th className="px-5 py-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {trasladosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                        <Truck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                        <p className="font-bold text-sm">No se encontraron traslados de mercancía</p>
                        <p className="text-xs text-slate-400 mt-1">Presione "Nuevo Traslado" para generar una guía de despacho</p>
                      </td>
                    </tr>
                  ) : (
                    trasladosFiltrados.map((tr) => {
                      const esEnTransito = tr.estado === "EN_TRANSITO";
                      const esRecibido = tr.estado === "RECIBIDO";
                      const esAnulado = tr.estado === "ANULADO";

                      return (
                        <tr key={tr.id} className="hover:bg-slate-50/80 transition">
                          <td className="px-5 py-4 font-mono font-black text-slate-900">
                            {tr.numero_guia}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                              <span className="text-slate-600">{tr.sucursal_origen_nombre}</span>
                              <span className="text-indigo-500 font-black">&rarr;</span>
                              <span className="text-indigo-700">{tr.sucursal_destino_nombre}</span>
                            </div>
                            {tr.motivo && (
                              <p className="text-[10px] text-slate-400 mt-0.5">{tr.motivo}</p>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <span className="font-bold text-slate-800">
                              {tr.total_unidades} unidades
                            </span>
                            <span className="text-slate-400 text-[10px] block">
                              ({tr.total_items} productos distintos)
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            {tr.conductor_nombre ? (
                              <div>
                                <p className="font-bold text-slate-700">{tr.conductor_nombre}</p>
                                {tr.vehiculo_placa && (
                                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono">
                                    {tr.vehiculo_placa}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">No especificado</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-medium text-slate-700">
                              {new Date(tr.fecha_despacho).toLocaleDateString("es-VE")}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {new Date(tr.fecha_despacho).toLocaleTimeString("es-VE", { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </td>
                          <td className="px-5 py-4 text-center">
                            {esEnTransito && (
                              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-black uppercase px-2.5 py-1 rounded-full">
                                <Clock className="w-3 h-3 animate-spin" /> En Tránsito
                              </span>
                            )}
                            {esRecibido && (
                              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2.5 py-1 rounded-full">
                                <CheckCircle2 className="w-3 h-3" /> Recibido
                              </span>
                            )}
                            {esAnulado && (
                              <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 text-[10px] font-black uppercase px-2.5 py-1 rounded-full">
                                <Ban className="w-3 h-3" /> Anulado
                              </span>
                            )}
                            {tr.estado === "BORRADOR" && (
                              <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-[10px] font-black uppercase px-2.5 py-1 rounded-full">
                                📝 Borrador
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right space-x-2">
                            {esEnTransito && (
                              <button
                                onClick={() => confirmarRecepcionTraslado(tr)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] px-3 py-1.5 rounded-xl shadow-sm transition inline-flex items-center gap-1 cursor-pointer"
                                title="Confirmar recepción y cargar stock"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Recibir</span>
                              </button>
                            )}

                            <button
                              onClick={() => setModalImprimirGuia(tr)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] px-3 py-1.5 rounded-xl transition inline-flex items-center gap-1 cursor-pointer"
                              title="Imprimir Guía de Despacho"
                            >
                              <Printer className="w-3.5 h-3.5 text-slate-600" />
                              <span>Guía</span>
                            </button>

                            {esEnTransito && (
                              <button
                                onClick={() => anularTraslado(tr)}
                                className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] px-2.5 py-1.5 rounded-xl transition inline-flex items-center gap-1 cursor-pointer"
                                title="Anular traslado y regresar stock al origen"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            )}
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
      )}

      {/* ======================================================== */}
      {/* PESTAÑA 2: PANEL CONSOLIDADO DEL DUEÑO */}
      {/* ======================================================== */}
      {activeTab === "consolidado" && (
        <div className="space-y-6">
          {/* Métricas Globales Consolidadas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-5 rounded-3xl shadow-md space-y-2">
              <div className="flex justify-between items-center text-indigo-200">
                <span className="text-[10px] font-black uppercase tracking-wider">Ventas Globales Red (USD)</span>
                <DollarSign className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="text-2xl font-black font-mono">
                ${metricasConsolidadas?.totalVentasUSD?.toFixed(2) || "0.00"}
              </h3>
              <p className="text-[10px] text-indigo-300">
                Bs. {metricasConsolidadas?.totalVentasBS?.toLocaleString("es-VE", { minimumFractionDigits: 2 }) || "0.00"}
              </p>
            </div>

            <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm space-y-2">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[10px] font-black uppercase tracking-wider">Sedes Activas</span>
                <Store className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 font-mono">
                {metricasConsolidadas?.sucursalesActivas || sucursales.length} / {sucursales.length}
              </h3>
              <p className="text-[10px] text-emerald-600 font-bold">100% de la red operativa</p>
            </div>

            <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm space-y-2">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[10px] font-black uppercase tracking-wider">Stock Total Cadena</span>
                <Boxes className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 font-mono">
                {metricasConsolidadas?.totalUnidadesInventario || 0} Uds
              </h3>
              <p className="text-[10px] text-slate-500">Unidades en todas las sucursales</p>
            </div>

            <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm space-y-2">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[10px] font-black uppercase tracking-wider">Despachos en Carretera</span>
                <Truck className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 font-mono">
                {metricasConsolidadas?.trasladosEnTransito || 0} Guías
              </h3>
              <p className="text-[10px] text-amber-600 font-bold">Mercancía en traslado</p>
            </div>
          </div>

          {/* Comparativa de Rendimiento por Sucursal */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Rendimiento y Ventas por Sucursal
                </h3>
                <p className="text-xs text-slate-500">Desglose individual de facturación y volumen transaccional</p>
              </div>
              <span className="text-xs bg-slate-100 text-slate-600 font-mono px-3 py-1 rounded-xl font-bold">
                Tasa: Bs. {metricasConsolidadas?.tasaBCV || "36.50"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {(metricasConsolidadas?.sucursales || sucursales).map((suc: any) => (
                <div key={suc.id} className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-mono bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-black">
                        {suc.codigo}
                      </span>
                      <h4 className="text-sm font-bold text-slate-800 mt-1">{suc.nombre}</h4>
                      <p className="text-[11px] text-slate-500">{suc.ciudad || "Sede Comercial"}</p>
                    </div>
                    {suc.esPrincipal && (
                      <span className="text-[9px] bg-amber-100 text-amber-800 font-black px-2 py-0.5 rounded-full uppercase">
                        Principal
                      </span>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-[10px] text-slate-400 font-black uppercase">Ventas USD</p>
                      <p className="font-black text-slate-800">${suc.ventasUSD?.toFixed(2) || "0.00"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-black uppercase">Ventas Bs</p>
                      <p className="font-black text-slate-800">Bs. {suc.ventasBS?.toLocaleString("es-VE") || "0.00"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-black uppercase">Transacciones</p>
                      <p className="font-bold text-slate-700">{suc.transaccionesCount || 0} tickets</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-black uppercase">Stock Local</p>
                      <p className="font-bold text-indigo-600">{suc.stockUnidades || 0} uds</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Consulta de Stock Inter-Sucursales en Vivo */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Buscador de Existencias en Todas las Sucursales
                </h3>
                <p className="text-xs text-slate-500">
                  Consulta de disponibilidad en tiempo real para reabastecimiento o atención a pacientes
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Escriba medicamento (ej. Atamel, Ibuprofeno)..."
                    value={busquedaStockGlobal}
                    onChange={(e) => {
                      setBusquedaStockGlobal(e.target.value);
                      consultarStockGlobal(e.target.value);
                    }}
                    className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs outline-none focus:border-indigo-500 w-72"
                  />
                </div>
                <button
                  onClick={() => consultarStockGlobal()}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition cursor-pointer"
                  title="Actualizar"
                >
                  <RefreshCw className={`w-4 h-4 ${buscandoStock ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {/* Resultados de stock inter-sucursal */}
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
              {resultadosStockGlobal.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <p className="text-xs">No hay productos que coincidan con la búsqueda.</p>
                </div>
              ) : (
                resultadosStockGlobal.map((item) => (
                  <div key={item.producto.id} className="p-4 hover:bg-slate-50/60 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                          {item.producto.codigo}
                        </span>
                        <h4 className="text-sm font-black text-slate-900">{item.producto.nombre}</h4>
                      </div>
                      <p className="text-xs text-slate-500">
                        Precio Venta: <span className="font-bold text-slate-800">${item.producto.precio_venta.toFixed(2)}</span> | Total Red: <span className="font-black text-indigo-600">{item.stock_total_red} unidades</span>
                      </p>
                    </div>

                    {/* Desglose de pastillas/chips por sede */}
                    <div className="flex flex-wrap items-center gap-2">
                      {item.sucursales.map((suc: any) => (
                        <div
                          key={suc.sucursal_id}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                            suc.stock > 0
                              ? suc.es_actual
                                ? "bg-indigo-50 border-indigo-200 text-indigo-900"
                                : "bg-emerald-50 border-emerald-200 text-emerald-900"
                              : "bg-rose-50 border-rose-200 text-rose-800"
                          }`}
                        >
                          <span className="text-[10px] font-black opacity-75">{suc.sucursal_codigo}:</span>
                          <span>{suc.stock} uds</span>
                          {suc.stock > 0 && !suc.es_actual && (
                            <button
                              onClick={() => {
                                setOrigenId(suc.sucursal_id);
                                setDestinoId(configActual?.sucursalActualId || sucursales[0]?.id);
                                setProdSeleccionado(item.producto);
                                setCantidadAgregar(Math.min(5, suc.stock));
                                setModalNuevoTraslado(true);
                              }}
                              className="text-[9px] bg-white hover:bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded shadow-sm border border-slate-200 font-bold transition ml-1"
                              title="Pedir traslado desde esta sucursal"
                            >
                              Pedir
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* PESTAÑA 3: DIRECTORIO DE SUCURSALES Y TERMINALES */}
      {/* ======================================================== */}
      {activeTab === "sucursales" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Directorio Oficial de Sedes
              </h3>
              <p className="text-xs text-slate-500">
                Puntos de venta, depósitos centrales y cajas autorizadas de la cadena
              </p>
            </div>

            <button
              onClick={() => {
                setSucursalEditar(null);
                setFormSucursal({
                  codigo: `SUC-0${sucursales.length + 1}`,
                  nombre: "",
                  direccion: "",
                  telefono: "",
                  ciudad: "",
                  esPrincipal: false,
                  cajas: "CAJA-01, CAJA-02"
                });
                setModalNuevaSucursal(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-4 py-2.5 rounded-2xl shadow-sm flex items-center gap-2 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Nueva Sucursal</span>
            </button>
          </div>

          {/* Cuadrícula de Sedes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sucursales.map((suc) => {
              const esEstaEstacion = configActual?.sucursalActualId === suc.id;

              return (
                <div
                  key={suc.id}
                  className={`bg-white rounded-3xl border transition-all p-6 space-y-4 relative ${
                    esEstaEstacion
                      ? "border-indigo-500 ring-2 ring-indigo-500/10 shadow-md"
                      : "border-slate-200/80 shadow-sm hover:border-slate-300"
                  }`}
                >
                  {/* Encabezado de la Tarjeta */}
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-900 text-white font-mono font-black text-xs px-2.5 py-0.5 rounded-lg">
                          {suc.codigo}
                        </span>
                        {suc.esPrincipal && (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-md">
                            Sede Matriz
                          </span>
                        )}
                        {esEstaEstacion && (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-md">
                            Este Equipo
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-black text-slate-900 pt-1">{suc.nombre}</h4>
                    </div>

                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Store className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Datos de Contacto */}
                  <div className="space-y-2 text-xs text-slate-600">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <span>{suc.direccion || "Dirección no registrada"}</span>
                    </div>
                    {suc.telefono && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>{suc.telefono}</span>
                      </div>
                    )}
                  </div>

                  {/* Cajas Registradas */}
                  <div className="bg-slate-50 p-3 rounded-2xl space-y-1.5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      Cajas Habilitadas
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {(suc.cajas || ["CAJA-01"]).map((cj) => (
                        <span
                          key={cj}
                          className="bg-white border border-slate-200 text-slate-700 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md"
                        >
                          {cj}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => cambiarConfigEstacion(suc.id, (suc.cajas && suc.cajas[0]) || "CAJA-01")}
                      disabled={esEstaEstacion}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl transition ${
                        esEstaEstacion
                          ? "bg-slate-100 text-slate-400 cursor-default"
                          : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 cursor-pointer"
                      }`}
                    >
                      {esEstaEstacion ? "✓ Estación Activa" : "Asignar Esta PC"}
                    </button>

                    <button
                      onClick={() => {
                        setSucursalEditar(suc);
                        setFormSucursal({
                          codigo: suc.codigo,
                          nombre: suc.nombre,
                          direccion: suc.direccion,
                          telefono: suc.telefono,
                          ciudad: suc.ciudad || "",
                          esPrincipal: suc.esPrincipal,
                          cajas: (suc.cajas || []).join(", ")
                        });
                        setModalNuevaSucursal(true);
                      }}
                      className="text-xs font-bold text-slate-500 hover:text-slate-900 px-2 py-1 transition cursor-pointer"
                    >
                      Editar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: NUEVO TRASLADO / GUÍA DE DESPACHO */}
      {/* ======================================================== */}
      <AnimatePresence>
        {modalNuevoTraslado && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8"
            >
              {/* Cabecera */}
              <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-600 rounded-2xl">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black uppercase tracking-tight">
                      Nueva Guía de Traslado Digital
                    </h3>
                    <p className="text-xs text-slate-400">
                      Despacho seguro de medicamentos entre sedes de la cadena
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setModalNuevoTraslado(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Contenido del Formulario */}
              <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                {/* Selección Origen y Destino */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                      Sucursal Origen (De donde sale la mercancía) *
                    </label>
                    <select
                      value={origenId}
                      onChange={(e) => setOrigenId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                    >
                      {sucursales.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.codigo} - {s.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                      Sucursal Destino (A donde llega) *
                    </label>
                    <select
                      value={destinoId}
                      onChange={(e) => setDestinoId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                    >
                      {sucursales.map(s => (
                        <option key={s.id} value={s.id} disabled={s.id === origenId}>
                          {s.codigo} - {s.nombre} {s.id === origenId ? "(No permitido)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Datos del Transporte / Chofer */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                      Conductor / Repartidor
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Carlos Mendoza"
                      value={conductorNombre}
                      onChange={(e) => setConductorNombre(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                      Placa / Vehículo
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. AB12CD (Moto Exprés)"
                      value={vehiculoPlaca}
                      onChange={(e) => setVehiculoPlaca(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                      Motivo del Traslado
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Reabastecimiento"
                      value={motivoTraslado}
                      onChange={(e) => setMotivoTraslado(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Agregar Medicamentos a la Guía */}
                <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-3">
                  <h4 className="text-xs font-black uppercase text-indigo-950 tracking-wider">
                    Seleccionar Medicamentos a Despachar
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    <div className="sm:col-span-6 relative">
                      <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                        Buscar Medicamento
                      </label>
                      <input
                        type="text"
                        placeholder="Escriba nombre o código de barra..."
                        value={prodSeleccionado ? prodSeleccionado.nombre : busquedaProd}
                        onChange={(e) => {
                          setProdSeleccionado(null);
                          setBusquedaProd(e.target.value);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs outline-none focus:border-indigo-500 font-bold"
                      />
                      {productosFiltradosModal.length > 0 && !prodSeleccionado && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden divide-y divide-slate-100">
                          {productosFiltradosModal.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setProdSeleccionado(p);
                                setBusquedaProd("");
                              }}
                              className="w-full p-2.5 text-left text-xs hover:bg-indigo-50 flex justify-between items-center cursor-pointer"
                            >
                              <span className="font-bold text-slate-800">{p.nombre}</span>
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                                Stock: {p.stock}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                        Cantidad
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={prodSeleccionado?.stock || 999}
                        value={cantidadAgregar}
                        onChange={(e) => setCantidadAgregar(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold text-center outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                        Lote (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="LOT-2026"
                        value={loteAgregar}
                        onChange={(e) => setLoteAgregar(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-mono outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <button
                        type="button"
                        onClick={agregarItemATraslado}
                        disabled={!prodSeleccionado}
                        className={`w-full py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                          prodSeleccionado
                            ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm cursor-pointer"
                            : "bg-slate-200 text-slate-400 cursor-not-allowed"
                        }`}
                      >
                        + Agregar
                      </button>
                    </div>
                  </div>
                </div>

                {/* Lista de Items Cargados */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-black uppercase text-slate-700 tracking-wider">
                      Detalle de Mercancía en la Guía ({itemsTraslado.length} productos)
                    </span>
                    <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      Total: {itemsTraslado.reduce((acc, it) => acc + it.cantidad, 0)} unidades
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                    {itemsTraslado.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-xs">
                        No has agregado ningún producto a esta guía todavía.
                      </div>
                    ) : (
                      itemsTraslado.map((it) => (
                        <div key={it.producto_id} className="p-3 bg-white flex items-center justify-between text-xs">
                          <div>
                            <p className="font-bold text-slate-800">{it.nombre}</p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              Código: {it.codigo || "N/A"} {it.lote ? `| Lote: ${it.lote}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-black text-indigo-700 text-sm">
                              {it.cantidad} uds
                            </span>
                            <button
                              type="button"
                              onClick={() => eliminarItemTraslado(it.producto_id)}
                              className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                              title="Eliminar"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Observaciones */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                    Observaciones o Notas
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Instrucciones especiales para el traslado..."
                    value={observacionesTraslado}
                    onChange={(e) => setObservacionesTraslado(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Pie de Modal con Botones */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setModalNuevoTraslado(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition cursor-pointer"
                >
                  Cancelar
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => guardarTraslado(false)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Guardar Borrador
                  </button>

                  <button
                    type="button"
                    onClick={() => guardarTraslado(true)}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Truck className="w-4 h-4" />
                    <span>Despachar y Generar Guía</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL: IMPRESIÓN GUÍA DE TRASLADO OFICIAL */}
      {/* ======================================================== */}
      <AnimatePresence>
        {modalImprimirGuia && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8"
            >
              {/* Barra superior de control */}
              <div className="p-4 bg-slate-900 text-white flex justify-between items-center print:hidden">
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-black uppercase tracking-wider">
                    Vista Previa de Guía de Despacho
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir</span>
                  </button>
                  <button
                    onClick={() => setModalImprimirGuia(null)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Formato de la Guía Oficial (Apta para imprimir en térmico u hoja bond) */}
              <div className="p-8 space-y-6 text-slate-900 font-sans" id="area-impresion-guia">
                {/* Encabezado */}
                <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight">Elena PRO Farmacias</h2>
                    <p className="text-[10px] text-slate-500 font-mono">RIF: J-50148729-3 | Cadena Farmacéutica</p>
                    <p className="text-xs font-bold text-indigo-600 mt-1 uppercase">
                      GUÍA DE DESPACHO & TRASLADO INTER-SUCURSAL
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-lg border border-slate-300">
                      {modalImprimirGuia.numero_guia}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1 font-mono">
                      Fecha: {new Date(modalImprimirGuia.fecha_despacho).toLocaleString("es-VE")}
                    </p>
                  </div>
                </div>

                {/* Cuadro Origen / Destino */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <p className="text-[10px] font-black uppercase text-slate-400">ORIGEN (Remitente)</p>
                    <p className="font-black text-slate-900">{modalImprimirGuia.sucursal_origen_nombre}</p>
                    <p className="text-[10px] text-slate-500">Despachado por: {modalImprimirGuia.usuario_despacho}</p>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <p className="text-[10px] font-black uppercase text-indigo-500">DESTINO (Receptor)</p>
                    <p className="font-black text-slate-900">{modalImprimirGuia.sucursal_destino_nombre}</p>
                    <p className="text-[10px] text-slate-500">
                      Estado: <span className="font-bold">{modalImprimirGuia.estado}</span>
                    </p>
                  </div>
                </div>

                {/* Transporte */}
                {(modalImprimirGuia.conductor_nombre || modalImprimirGuia.vehiculo_placa) && (
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 mr-2">Conductor:</span>
                      <span className="font-bold">{modalImprimirGuia.conductor_nombre || "No especificado"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 mr-2">Vehículo / Placa:</span>
                      <span className="font-mono font-bold">{modalImprimirGuia.vehiculo_placa || "N/A"}</span>
                    </div>
                  </div>
                )}

                {/* Tabla de Medicamentos */}
                <div>
                  <table className="w-full text-left text-xs border border-slate-300">
                    <thead className="bg-slate-100 text-[10px] font-black uppercase text-slate-700 border-b border-slate-300">
                      <tr>
                        <th className="p-2 border-r border-slate-300">Código</th>
                        <th className="p-2 border-r border-slate-300">Descripción / Medicamento</th>
                        <th className="p-2 border-r border-slate-300">Lote</th>
                        <th className="p-2 text-right">Cant.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {modalImprimirGuia.items.map((it, idx) => (
                        <tr key={idx}>
                          <td className="p-2 font-mono text-[10px] border-r border-slate-200">{it.codigo || "N/A"}</td>
                          <td className="p-2 font-bold border-r border-slate-200">{it.nombre}</td>
                          <td className="p-2 font-mono text-[10px] border-r border-slate-200">{it.lote || "-"}</td>
                          <td className="p-2 font-black text-right font-mono">{it.cantidad}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-100 font-bold border-t border-slate-300">
                      <tr>
                        <td colSpan={3} className="p-2 text-right uppercase text-[10px]">
                          Total Unidades Despachadas:
                        </td>
                        <td className="p-2 text-right font-black font-mono">
                          {modalImprimirGuia.total_unidades}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Observaciones */}
                {modalImprimirGuia.observaciones && (
                  <div className="text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-700">Observaciones: </span>
                    <span className="text-slate-600">{modalImprimirGuia.observaciones}</span>
                  </div>
                )}

                {/* Cuadros de Firmas */}
                <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-200 text-center text-xs">
                  <div className="space-y-1">
                    <div className="border-b border-slate-400 w-40 mx-auto mb-2"></div>
                    <p className="font-bold text-slate-800">Firma y Sello Despacho</p>
                    <p className="text-[10px] text-slate-400">{modalImprimirGuia.sucursal_origen_nombre}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="border-b border-slate-400 w-40 mx-auto mb-2"></div>
                    <p className="font-bold text-slate-800">Firma y Sello Recepción</p>
                    <p className="text-[10px] text-slate-400">{modalImprimirGuia.sucursal_destino_nombre}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL: NUEVA / EDITAR SUCURSAL */}
      {/* ======================================================== */}
      <AnimatePresence>
        {modalNuevaSucursal && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-600 rounded-2xl">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black uppercase tracking-tight">
                      {sucursalEditar ? "Editar Sucursal" : "Nueva Sucursal"}
                    </h3>
                    <p className="text-xs text-slate-400">Identificación de punto de venta y terminales</p>
                  </div>
                </div>
                <button
                  onClick={() => setModalNuevaSucursal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                      Código Identificador *
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. SUC-04"
                      value={formSucursal.codigo}
                      onChange={(e) => setFormSucursal({ ...formSucursal, codigo: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono font-bold outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                      Ciudad / Estado
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Caracas"
                      value={formSucursal.ciudad}
                      onChange={(e) => setFormSucursal({ ...formSucursal, ciudad: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                    Nombre de la Sucursal *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Sede Sur (C.C. Metrópolis)"
                    value={formSucursal.nombre}
                    onChange={(e) => setFormSucursal({ ...formSucursal, nombre: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                    Dirección Física
                  </label>
                  <input
                    type="text"
                    placeholder="Av. Principal, Local 12..."
                    value={formSucursal.direccion}
                    onChange={(e) => setFormSucursal({ ...formSucursal, direccion: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                    Teléfono de Contacto
                  </label>
                  <input
                    type="text"
                    placeholder="0212-9938412"
                    value={formSucursal.telefono}
                    onChange={(e) => setFormSucursal({ ...formSucursal, telefono: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                    Cajas Habilitadas (Separadas por coma)
                  </label>
                  <input
                    type="text"
                    placeholder="CAJA-01, CAJA-02, CAJA-03"
                    value={formSucursal.cajas}
                    onChange={(e) => setFormSucursal({ ...formSucursal, cajas: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="esPrincipalCheck"
                    checked={formSucursal.esPrincipal}
                    onChange={(e) => setFormSucursal({ ...formSucursal, esPrincipal: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <label htmlFor="esPrincipalCheck" className="text-xs font-bold text-slate-700 cursor-pointer">
                    Designar como Sede Matriz / Principal
                  </label>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalNuevaSucursal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={guardarSucursal}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md transition cursor-pointer"
                >
                  Guardar Sucursal
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
