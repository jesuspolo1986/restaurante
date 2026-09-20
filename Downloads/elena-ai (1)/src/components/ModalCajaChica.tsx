/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  ArrowUpRight, 
  Plus, 
  Trash2, 
  Receipt, 
  DollarSign, 
  Calendar, 
  User, 
  Tag, 
  Search, 
  Filter, 
  AlertCircle,
  FileSpreadsheet,
  Download,
  Coins,
  TrendingDown
} from "lucide-react";
import { motion } from "motion/react";
import { GastoCajaChica } from "../types";
import { apiFetch } from "../utils/api";

const CATEGORIAS_GASTO = [
  { id: "TRANSPORTE_LOGISTICA", label: "Transporte / Logística / Fletes", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "DELIVERY", label: "Delivery / Despacho Moto", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "LIMPIEZA_INSUMOS", label: "Insumos de Limpieza y Aseo", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { id: "ALMUERZOS_REFRIGERIOS", label: "Almuerzos / Refrigerios Personal", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { id: "MANTENIMIENTO", label: "Mantenimiento / Reparación Local", color: "bg-orange-50 text-orange-700 border-orange-200" },
  { id: "SERVICIOS", label: "Servicios / Agua / Recargas", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  { id: "PROVEEDOR_MENOR", label: "Pago Proveedor Menor / Contado", color: "bg-rose-50 text-rose-700 border-rose-200" },
  { id: "OTRO", label: "Otro Gasto Operativo", color: "bg-slate-50 text-slate-700 border-slate-200" }
];

export default function ModalCajaChica({ 
  isOpen, 
  onClose, 
  tasa,
  usuarioActual,
  onGastoRegistrado 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  tasa: number;
  usuarioActual?: string;
  onGastoRegistrado?: () => void;
}) {
  const [gastos, setGastos] = useState<GastoCajaChica[]>([]);
  const [cargando, setCargando] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [buscar, setBuscar] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");

  // Formulario
  const [concepto, setConcepto] = useState("");
  const [categoria, setCategoria] = useState<GastoCajaChica["categoria_gasto"]>("TRANSPORTE_LOGISTICA");
  const [monto, setMonto] = useState("");
  const [moneda, setMoneda] = useState<"USD" | "BS">("USD");
  const [beneficiario, setBeneficiario] = useState("");
  const [comprobanteNro, setComprobanteNro] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (isOpen) {
      cargarGastos();
    }
  }, [isOpen]);

  const cargarGastos = async () => {
    setCargando(true);
    try {
      const res = await apiFetch("/api/caja-chica/gastos");
      if (res.ok) {
        const data = await res.json();
        setGastos(data);
      }
    } catch (err) {
      console.error("Error cargando gastos:", err);
    } finally {
      setCargando(false);
    }
  };

  const handleRegistrarGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      setErrorMsg("Ingrese un monto numérico mayor a cero.");
      return;
    }

    if (!concepto.trim()) {
      setErrorMsg("Especifique el concepto o motivo del gasto.");
      return;
    }

    setGuardando(true);
    try {
      const res = await apiFetch("/api/caja-chica/registrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concepto: concepto.trim(),
          categoria_gasto: categoria,
          monto: montoNum,
          moneda,
          beneficiario: beneficiario.trim(),
          comprobante_nro: comprobanteNro.trim(),
          usuario: usuarioActual || "cajero"
        })
      });

      const data = await res.json();
      if (res.ok && data.status === "success") {
        setConcepto("");
        setMonto("");
        setBeneficiario("");
        setComprobanteNro("");
        setMostrarFormulario(false);
        await cargarGastos();
        if (onGastoRegistrado) onGastoRegistrado();
      } else {
        setErrorMsg(data.error || "No se pudo registrar el gasto.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Error de conexión al registrar egreso.");
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarGasto = async (id: string) => {
    if (!confirm("¿Desea anular este registro de salida de dinero?")) return;
    try {
      const res = await apiFetch(`/api/caja-chica/eliminar/${id}`, { method: "DELETE" });
      if (res.ok) {
        await cargarGastos();
        if (onGastoRegistrado) onGastoRegistrado();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const gastosFiltrados = gastos.filter(g => {
    const cumpleTexto = !buscar || 
      g.concepto.toLowerCase().includes(buscar.toLowerCase()) || 
      (g.beneficiario && g.beneficiario.toLowerCase().includes(buscar.toLowerCase())) ||
      (g.comprobante_nro && g.comprobante_nro.toLowerCase().includes(buscar.toLowerCase()));
    const cumpleCat = !filtroCategoria || g.categoria_gasto === filtroCategoria;
    return cumpleTexto && cumpleCat;
  });

  const totalGastosUSD = gastos.reduce((sum, g) => sum + g.montoUSD, 0);
  const totalGastosBS = gastos.reduce((sum, g) => sum + g.montoBS, 0);

  const exportarCSV = () => {
    if (gastos.length === 0) return;
    const headers = ["Fecha", "Hora", "Concepto", "Categoría", "Beneficiario", "Comprobante", "Monto USD", "Monto BS", "Usuario"];
    const rows = gastos.map(g => [
      new Date(g.fecha).toLocaleDateString("es-VE"),
      new Date(g.fecha).toLocaleTimeString("es-VE"),
      `"${g.concepto.replace(/"/g, '""')}"`,
      g.categoria_gasto,
      `"${(g.beneficiario || '').replace(/"/g, '""')}"`,
      g.comprobante_nro || '',
      g.montoUSD.toFixed(2),
      g.montoBS.toFixed(2),
      g.usuario
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Salidas_Caja_Chica_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Cabecera */}
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-600 flex items-center justify-center shadow-sm">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                Salidas de Caja Chica & Gastos
                <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">
                  Egresos Operativos
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Registra salidas de dinero por fletes, delivery, insumos o almuerzos para cuadrar el arqueo al centavo.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center font-black transition cursor-pointer text-sm"
          >
            ✕
          </button>
        </div>

        {/* Resumen Superior */}
        <div className="px-6 py-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4 border-b border-slate-800">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block">Total Egresos Acumulados</span>
              <span className="text-xl font-black text-rose-400">-${totalGastosUSD.toFixed(2)}</span>
              <span className="text-xs text-slate-400 font-mono ml-2">(Bs. {totalGastosBS.toFixed(2)})</span>
            </div>
            <div className="h-8 w-px bg-slate-800 hidden sm:block" />
            <div>
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block">Tasa BCV Aplicada</span>
              <span className="text-sm font-black text-emerald-400 font-mono">Bs. {tasa.toFixed(2)} / $</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {gastos.length > 0 && (
              <button
                onClick={exportarCSV}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar CSV</span>
              </button>
            )}
            <button
              onClick={() => setMostrarFormulario(!mostrarFormulario)}
              className="bg-rose-600 hover:bg-rose-500 text-white font-black px-4 py-2 rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-rose-600/30"
            >
              <Plus className="w-4 h-4" />
              <span>{mostrarFormulario ? "Ver Historial" : "Nuevo Egreso"}</span>
            </button>
          </div>
        </div>

        {/* Contenido Principal */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {mostrarFormulario ? (
            <motion.form 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleRegistrarGasto} 
              className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-5"
            >
              <div className="border-b border-slate-200/80 pb-3">
                <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                  Formulario de Egreso Rápido de Efectivo
                </h3>
                <p className="text-[11px] text-slate-500">
                  El monto ingresado se restará del efectivo en caja para el arqueo de cierre de turno.
                </p>
              </div>

              {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-2xl text-xs flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-8">
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                    Concepto / Motivo de la Salida *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Pago de flete camión despacho, compra cloro y bolsas..."
                    value={concepto}
                    onChange={(e) => setConcepto(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                    Categoría de Gasto *
                  </label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    {CATEGORIAS_GASTO.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-4">
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                    Monto *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="0.00"
                      value={monto}
                      onChange={(e) => setMonto(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-2xl pl-3.5 pr-14 py-2.5 text-xs font-black text-rose-600 outline-none focus:ring-2 focus:ring-rose-500"
                    />
                    <div className="absolute right-1 top-1 bottom-1 flex items-center">
                      <select
                        value={moneda}
                        onChange={(e) => setMoneda(e.target.value as any)}
                        className="bg-slate-100 border-0 rounded-xl text-[10px] font-black px-2 py-1 text-slate-700 cursor-pointer outline-none"
                      >
                        <option value="USD">$ (USD)</option>
                        <option value="BS">Bs. (VES)</option>
                      </select>
                    </div>
                  </div>
                  {monto && !isNaN(parseFloat(monto)) && (
                    <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                      Equivalente: {moneda === "USD" ? `Bs. ${(parseFloat(monto) * tasa).toFixed(2)}` : `$${(parseFloat(monto) / tasa).toFixed(2)} USD`}
                    </span>
                  )}
                </div>

                <div className="md:col-span-4">
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                    Beneficiario / A quién se le pagó (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Chofer Juan Pérez, Bodega Don José..."
                    value={beneficiario}
                    onChange={(e) => setBeneficiario(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                    Nº Recibo / Vale / Comprobante (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: REC-0042, Factura 1109..."
                    value={comprobanteNro}
                    onChange={(e) => setComprobanteNro(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setMostrarFormulario(false)}
                  className="px-4 py-2.5 rounded-2xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-6 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider transition cursor-pointer shadow-md shadow-rose-600/30 disabled:opacity-50"
                >
                  {guardando ? "Registrando..." : "Registrar Salida de Dinero"}
                </button>
              </div>
            </motion.form>
          ) : (
            <>
              {/* Barra de Búsqueda y Filtros */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por concepto, beneficiario o comprobante..."
                    value={buscar}
                    onChange={(e) => setBuscar(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="w-full sm:w-64">
                  <select
                    value={filtroCategoria}
                    onChange={(e) => setFiltroCategoria(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-700 outline-none"
                  >
                    <option value="">Todas las categorías</option>
                    {CATEGORIAS_GASTO.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tabla de Registros */}
              {cargando ? (
                <div className="text-center py-12 text-slate-400 text-xs">Cargando movimientos...</div>
              ) : gastosFiltrados.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <Receipt className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-black uppercase text-slate-700 mb-1">No hay salidas de caja registradas</h4>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto mb-4">
                    Cuando necesites pagar delivery, transporte o compras menores con dinero de la caja, regístralas aquí.
                  </p>
                  <button
                    onClick={() => setMostrarFormulario(true)}
                    className="bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-xl"
                  >
                    + Registrar Primer Egreso
                  </button>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        <th className="py-3 px-4">Fecha & Hora</th>
                        <th className="py-3 px-4">Concepto / Motivo</th>
                        <th className="py-3 px-4">Categoría</th>
                        <th className="py-3 px-4">Beneficiario / Ref</th>
                        <th className="py-3 px-4 text-right">Monto ($)</th>
                        <th className="py-3 px-4 text-right">Monto (Bs.)</th>
                        <th className="py-3 px-4 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                      {gastosFiltrados.map((g) => {
                        const catInfo = CATEGORIAS_GASTO.find(c => c.id === g.categoria_gasto);
                        return (
                          <tr key={g.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                              <div>{new Date(g.fecha).toLocaleDateString("es-VE")}</div>
                              <div className="text-[9px] text-slate-400">{new Date(g.fecha).toLocaleTimeString("es-VE", { hour: '2-digit', minute: '2-digit' })}</div>
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-900">
                              {g.concepto}
                              <div className="text-[9px] text-slate-400 font-normal">Cajero: {g.usuario}</div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${catInfo?.color || "bg-slate-100 text-slate-700"}`}>
                                {catInfo?.label.split("/")[0] || g.categoria_gasto}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-[11px] text-slate-600">
                              {g.beneficiario || <span className="text-slate-300 italic">No especificado</span>}
                              {g.comprobante_nro && (
                                <div className="text-[9px] font-mono text-slate-400">Doc: {g.comprobante_nro}</div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right font-black text-rose-600 font-mono">
                              -${g.montoUSD.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-slate-500 font-mono text-[11px]">
                              Bs. {g.montoBS.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => handleEliminarGasto(g.id)}
                                title="Anular este gasto"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {/* Pie */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">
            Elena Pro &bull; Cuadre Financiero de Turno
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer"
          >
            Cerrar Ventana
          </button>
        </div>
      </div>
    </div>
  );
}
