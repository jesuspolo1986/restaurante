/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  RotateCcw, 
  Search, 
  AlertTriangle, 
  FileText, 
  CheckCircle2, 
  ArrowRight, 
  Plus, 
  Minus, 
  DollarSign, 
  Coins, 
  Warehouse, 
  Store, 
  Trash, 
  Printer, 
  Clock, 
  ShieldAlert,
  UserCheck
} from "lucide-react";
import { motion } from "motion/react";
import { Venta, DevolucionNotaCredito, ItemDevolucion } from "../types";
import { apiFetch } from "../utils/api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tasa: number;
  usuarioActual?: string;
  onDevolucionProcesada?: () => void;
}

export default function ModalDevoluciones({ 
  isOpen, 
  onClose, 
  tasa, 
  usuarioActual,
  onDevolucionProcesada 
}: Props) {
  const [tab, setTab] = useState<"NUEVA" | "HISTORIAL">("NUEVA");
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [devoluciones, setDevoluciones] = useState<DevolucionNotaCredito[]>([]);
  const [cargando, setCargando] = useState(false);

  // Búsqueda de factura a devolver
  const [terminoBusqueda, setTerminoBusqueda] = useState("");
  const [ventaSeleccionada, setVentaSeleccionada] = useState<Venta | null>(null);

  // Selección de items y configuración de nota de crédito
  const [cantidadesDevolver, setCantidadesDevolver] = useState<Record<string, number>>({});
  const [destinosReingreso, setDestinosReingreso] = useState<Record<string, "TIENDA" | "ALMACEN" | "MERMA_DEFECTUOSO">>({});
  const [motivosItem, setMotivosItem] = useState<Record<string, string>>({});
  
  const [motivoGeneral, setMotivoGeneral] = useState("Garantía / Defecto del producto");
  const [metodoReembolso, setMetodoReembolso] = useState<DevolucionNotaCredito["metodo_reembolso"]>("EFECTIVO_USD");
  const [observaciones, setObservaciones] = useState("");

  const [procesando, setProcesando] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [devolucionExitosa, setDevolucionExitosa] = useState<DevolucionNotaCredito | null>(null);

  useEffect(() => {
    if (isOpen) {
      cargarDatos();
    }
  }, [isOpen]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [resVentas, resDevs] = await Promise.all([
        apiFetch("/api/ventas"),
        apiFetch("/api/devoluciones")
      ]);
      if (resVentas.ok) setVentas(await resVentas.json());
      if (resDevs.ok) setDevoluciones(await resDevs.json());
    } catch (err) {
      console.error("Error cargando datos de devoluciones:", err);
    } finally {
      setCargando(false);
    }
  };

  const seleccionarVenta = (v: Venta) => {
    setVentaSeleccionada(v);
    setErrorMsg("");
    setDevolucionExitosa(null);

    // Inicializar cantidades
    const cants: Record<string, number> = {};
    const dests: Record<string, "TIENDA" | "ALMACEN" | "MERMA_DEFECTUOSO"> = {};
    const mots: Record<string, string> = {};

    v.items.forEach(it => {
      const disponible = it.cantidad - (it.cant_devuelta || 0);
      cants[it.producto_id] = 0; // Por defecto 0
      dests[it.producto_id] = "TIENDA";
      mots[it.producto_id] = "";
    });

    setCantidadesDevolver(cants);
    setDestinosReingreso(dests);
    setMotivosItem(mots);
  };

  const calcularTotalReembolso = () => {
    if (!ventaSeleccionada) return { totalUSD: 0, totalBS: 0 };
    let total = 0;

    ventaSeleccionada.items.forEach(it => {
      const cant = cantidadesDevolver[it.producto_id] || 0;
      if (cant > 0) {
        const esMedicamentoOExento = it.categoria === "MEDICAMENTO" || it.categoria === "EXENTO";
        const tasaIva = esMedicamentoOExento ? 0 : 0.16;
        const precioConIva = it.precio_unitario * (1 + tasaIva);
        total += precioConIva * cant;
      }
    });

    const totalUSD = Number(total.toFixed(2));
    const totalBS = Number((totalUSD * tasa).toFixed(2));
    return { totalUSD, totalBS };
  };

  const handleProcesarDevolucion = async () => {
    if (!ventaSeleccionada) return;
    setErrorMsg("");

    const itemsAEnviar = Object.entries(cantidadesDevolver)
      .filter(([_, cant]) => cant > 0)
      .map(([prodId, cant]) => ({
        producto_id: prodId,
        cantidad: cant,
        destino_reingreso: destinosReingreso[prodId] || "TIENDA",
        motivo_item: motivosItem[prodId] || motivoGeneral
      }));

    if (itemsAEnviar.length === 0) {
      setErrorMsg("Debe seleccionar al menos 1 unidad de producto a devolver.");
      return;
    }

    setProcesando(true);
    try {
      const res = await apiFetch("/api/devoluciones/procesar-completa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venta_id: ventaSeleccionada.id,
          tipo_operacion: itemsAEnviar.length === ventaSeleccionada.items.length ? "ANULACION_TOTAL" : "DEVOLUCION_PARCIAL",
          metodo_reembolso: metodoReembolso,
          motivo_general: motivoGeneral,
          items: itemsAEnviar,
          usuario: usuarioActual || "admin",
          observaciones
        })
      });

      const data = await res.json();
      if (res.ok && data.status === "success") {
        setDevolucionExitosa(data.devolucion);
        await cargarDatos();
        if (onDevolucionProcesada) onDevolucionProcesada();
      } else {
        setErrorMsg(data.error || "No se pudo procesar la nota de crédito.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Error de comunicación con el servidor.");
    } finally {
      setProcesando(false);
    }
  };

  const ventasFiltradas = ventas.filter(v => {
    if (!terminoBusqueda) return true;
    const term = terminoBusqueda.toLowerCase();
    return (
      v.factura_numero.toLowerCase().includes(term) ||
      (v.cliente_nombre && v.cliente_nombre.toLowerCase().includes(term)) ||
      (v.cliente_id && v.cliente_id.toLowerCase().includes(term))
    );
  }).slice(0, 10);

  const { totalUSD, totalBS } = calcularTotalReembolso();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Cabecera */}
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center shadow-sm">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                Devoluciones, Anulaciones & Notas de Crédito
                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                  Reingreso de Inventario
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Garantías, cambios de producto y emisión de Notas de Crédito con retorno automático al stock.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-200/70 p-1 rounded-2xl">
              <button
                onClick={() => { setTab("NUEVA"); setDevolucionExitosa(null); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${tab === "NUEVA" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                Nueva Devolución
              </button>
              <button
                onClick={() => setTab("HISTORIAL")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${tab === "HISTORIAL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                Historial ({devoluciones.length})
              </button>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center font-black transition cursor-pointer text-sm ml-2"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === "HISTORIAL" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase text-slate-700">Notas de Crédito Emitidas</h3>
                <span className="text-xs text-slate-400 font-mono">Total Registros: {devoluciones.length}</span>
              </div>

              {devoluciones.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50 text-slate-400 text-xs">
                  No hay Notas de Crédito o devoluciones emitidas en el sistema.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        <th className="py-3 px-4">Nota Crédito</th>
                        <th className="py-3 px-4">Factura Origen</th>
                        <th className="py-3 px-4">Fecha</th>
                        <th className="py-3 px-4">Cliente</th>
                        <th className="py-3 px-4">Motivo General</th>
                        <th className="py-3 px-4">Método Reembolso</th>
                        <th className="py-3 px-4 text-right">Total Devuelto ($)</th>
                        <th className="py-3 px-4 text-right">Total Devuelto (Bs.)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {devoluciones.map((dev) => (
                        <tr key={dev.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-black font-mono text-amber-700">{dev.numero_nota_credito}</td>
                          <td className="py-3 px-4 font-mono text-slate-600">{dev.factura_numero_original}</td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                            {new Date(dev.fecha).toLocaleDateString("es-VE")}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800">{dev.cliente_nombre}</td>
                          <td className="py-3 px-4 text-slate-600">{dev.motivo_general}</td>
                          <td className="py-3 px-4">
                            <span className="text-[9px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                              {dev.metodo_reembolso}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-black text-rose-600 font-mono">
                            -${dev.total_reembolso_usd.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-600 font-mono text-[11px]">
                            Bs. {dev.total_reembolso_bs.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : devolucionExitosa ? (
            /* Vista de Éxito / Comprobante de Nota de Crédito */
            <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-8 text-center max-w-xl mx-auto space-y-5">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                  Nota de Crédito {devolucionExitosa.numero_nota_credito} Generada
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Se ha reingresado el stock al inventario y se ha registrado el asiento contable de devolución.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-emerald-200 p-4 text-left space-y-2 font-mono text-xs">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500 font-sans">Factura Afectada:</span>
                  <span className="font-bold text-slate-800">{devolucionExitosa.factura_numero_original}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500 font-sans">Cliente:</span>
                  <span className="font-bold text-slate-800">{devolucionExitosa.cliente_nombre}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500 font-sans">Reembolso Total:</span>
                  <span className="font-bold text-rose-600 font-sans">${devolucionExitosa.total_reembolso_usd.toFixed(2)} USD (Bs. {devolucionExitosa.total_reembolso_bs.toFixed(2)})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Modalidad:</span>
                  <span className="font-bold text-slate-800">{devolucionExitosa.metodo_reembolso}</span>
                </div>
              </div>

              <div className="flex gap-3 justify-center pt-2">
                <button
                  onClick={() => {
                    setDevolucionExitosa(null);
                    setVentaSeleccionada(null);
                  }}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-2xl transition cursor-pointer"
                >
                  Procesar Otra Devolución
                </button>
              </div>
            </div>
          ) : (
            /* Flujo de Creación de Devolución */
            <div className="space-y-6">
              {!ventaSeleccionada ? (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar venta por Nº Factura (ej: FAC-000001), nombre o cédula del cliente..."
                      value={terminoBusqueda}
                      onChange={(e) => setTerminoBusqueda(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
                    />
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                          <th className="py-3 px-4">Nº Comprobante</th>
                          <th className="py-3 px-4">Fecha & Hora</th>
                          <th className="py-3 px-4">Cliente</th>
                          <th className="py-3 px-4">Items</th>
                          <th className="py-3 px-4 text-right">Total ($)</th>
                          <th className="py-3 px-4 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {ventasFiltradas.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400">
                              No se encontraron ventas con los criterios de búsqueda.
                            </td>
                          </tr>
                        ) : (
                          ventasFiltradas.map((v) => (
                            <tr key={v.id} className="hover:bg-slate-50/80 transition">
                              <td className="py-3 px-4 font-mono font-bold text-slate-900">{v.factura_numero}</td>
                              <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                                {new Date(v.fecha).toLocaleDateString("es-VE")}
                              </td>
                              <td className="py-3 px-4 font-bold text-slate-800">
                                {v.cliente_nombre}
                                <span className="text-[10px] text-slate-400 block font-normal font-mono">{v.cliente_id}</span>
                              </td>
                              <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                                {v.items.length} productos
                              </td>
                              <td className="py-3 px-4 text-right font-black text-slate-900 font-mono">
                                ${v.total_usd.toFixed(2)}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <button
                                  onClick={() => seleccionarVenta(v)}
                                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition cursor-pointer shadow-sm"
                                >
                                  Seleccionar
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* Detalle de la Venta Seleccionada y Selección de Artículos a Devolver */
                <div className="space-y-6">
                  <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-amber-900 text-sm">{ventaSeleccionada.factura_numero}</span>
                        <span className="text-[10px] font-bold bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded-full">
                          Fecha: {new Date(ventaSeleccionada.fecha).toLocaleDateString("es-VE")}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 mt-1 font-medium">
                        Cliente: <span className="font-bold">{ventaSeleccionada.cliente_nombre}</span> ({ventaSeleccionada.cliente_id})
                      </p>
                    </div>
                    <button
                      onClick={() => setVentaSeleccionada(null)}
                      className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-100 transition cursor-pointer"
                    >
                      ← Cambiar Factura
                    </button>
                  </div>

                  {errorMsg && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-2xl text-xs flex items-center gap-2 font-medium">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* Tabla de Productos de la Venta */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                          <th className="py-3 px-4">Producto</th>
                          <th className="py-3 px-4 text-center">Comprado</th>
                          <th className="py-3 px-4 text-center">Ya Devuelto</th>
                          <th className="py-3 px-4 text-center">Cant. a Devolver</th>
                          <th className="py-3 px-4">Destino de Reingreso</th>
                          <th className="py-3 px-4 text-right">Subtotal Reembolso</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {ventaSeleccionada.items.map((it) => {
                          const yaDev = it.cant_devuelta || 0;
                          const disponible = it.cantidad - yaDev;
                          const cantActual = cantidadesDevolver[it.producto_id] || 0;
                          const destinoActual = destinosReingreso[it.producto_id] || "TIENDA";

                          const esMedicamentoOExento = it.categoria === "MEDICAMENTO" || it.categoria === "EXENTO";
                          const tasaIva = esMedicamentoOExento ? 0 : 0.16;
                          const precioConIva = it.precio_unitario * (1 + tasaIva);
                          const subtotalItem = Number((precioConIva * cantActual).toFixed(2));

                          return (
                            <tr key={it.producto_id} className={cantActual > 0 ? "bg-amber-50/40" : ""}>
                              <td className="py-3 px-4">
                                <div className="font-bold text-slate-900">{it.nombre}</div>
                                <div className="text-[10px] text-slate-400 font-mono">${it.precio_unitario.toFixed(2)} c/u</div>
                              </td>
                              <td className="py-3 px-4 text-center font-bold text-slate-700">{it.cantidad}</td>
                              <td className="py-3 px-4 text-center text-slate-400 font-mono">{yaDev}</td>
                              <td className="py-3 px-4 text-center">
                                <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                                  <button
                                    type="button"
                                    disabled={cantActual <= 0}
                                    onClick={() => setCantidadesDevolver({
                                      ...cantidadesDevolver,
                                      [it.producto_id]: Math.max(0, cantActual - 1)
                                    })}
                                    className="w-6 h-6 rounded-lg bg-white text-slate-700 font-bold flex items-center justify-center disabled:opacity-30 cursor-pointer shadow-sm"
                                  >
                                    -
                                  </button>
                                  <span className="w-8 text-center font-black text-slate-900">{cantActual}</span>
                                  <button
                                    type="button"
                                    disabled={cantActual >= disponible}
                                    onClick={() => setCantidadesDevolver({
                                      ...cantidadesDevolver,
                                      [it.producto_id]: Math.min(disponible, cantActual + 1)
                                    })}
                                    className="w-6 h-6 rounded-lg bg-white text-slate-700 font-bold flex items-center justify-center disabled:opacity-30 cursor-pointer shadow-sm"
                                  >
                                    +
                                  </button>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <select
                                  disabled={cantActual === 0}
                                  value={destinoActual}
                                  onChange={(e) => setDestinosReingreso({
                                    ...destinosReingreso,
                                    [it.producto_id]: e.target.value as any
                                  })}
                                  className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-40 outline-none"
                                >
                                  <option value="TIENDA">Reingresar a Tienda / Mostrador</option>
                                  <option value="ALMACEN">Reingresar a Depósito / Almacén</option>
                                  <option value="MERMA_DEFECTUOSO">Merma / Desecho (No vender)</option>
                                </select>
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-black text-rose-600">
                                ${subtotalItem.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Parámetros de la Nota de Crédito */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                        Motivo de la Devolución
                      </label>
                      <input
                        type="text"
                        value={motivoGeneral}
                        onChange={(e) => setMotivoGeneral(e.target.value)}
                        placeholder="Ej: Medicamento con empaque dañado, cambio por otro..."
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                        Forma de Devolución / Reembolso
                      </label>
                      <select
                        value={metodoReembolso}
                        onChange={(e) => setMetodoReembolso(e.target.value as any)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                      >
                        <option value="EFECTIVO_USD">Devolución en Efectivo USD ($)</option>
                        <option value="EFECTIVO_BS">Devolución en Efectivo Bs. (VES)</option>
                        <option value="PAGO_MOVIL">Transferencia / Pago Móvil</option>
                        <option value="SALDO_A_FAVOR_CLIENTE">Abonar como Saldo a Favor del Cliente</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                        Observaciones de Auditoría
                      </label>
                      <input
                        type="text"
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        placeholder="Opcional: Aprobado por supervisor..."
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none"
                      />
                    </div>
                  </div>

                  {/* Resumen Final y Botón de Emisión */}
                  <div className="bg-slate-900 text-white rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block">
                        Total Reembolso por Nota de Crédito
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-rose-400">-${totalUSD.toFixed(2)} USD</span>
                        <span className="text-xs text-slate-400 font-mono">(Bs. {totalBS.toFixed(2)})</span>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setVentaSeleccionada(null)}
                        className="px-4 py-2.5 rounded-xl border border-slate-700 font-bold text-xs text-slate-300 hover:bg-slate-800 transition cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={totalUSD <= 0 || procesando}
                        onClick={handleProcesarDevolucion}
                        className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition cursor-pointer shadow-md disabled:opacity-40"
                      >
                        {procesando ? "Procesando Nota..." : "Emitir Nota de Crédito & Reingresar Stock"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
