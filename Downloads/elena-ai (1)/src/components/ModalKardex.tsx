/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  History, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw, 
  Filter, 
  Calendar, 
  Package, 
  FileText, 
  Layers, 
  Download, 
  Warehouse, 
  Store
} from "lucide-react";
import { MovimientoKardex, Producto } from "../types";
import { apiFetch } from "../utils/api";

const TIPOS_KARDEX_LABEL: Record<string, { label: string; color: string }> = {
  VENTA: { label: "Venta Facturada", color: "bg-rose-50 text-rose-700 border-rose-200" },
  COMPRA_RECEPCION: { label: "Compra / Recepción", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  DEVOLUCION_CLIENTE: { label: "Devolución Cliente (NC)", color: "bg-amber-50 text-amber-700 border-amber-200" },
  TRASLADO_SALIDA: { label: "Traslado a Tienda", color: "bg-blue-50 text-blue-700 border-blue-200" },
  TRASLADO_ENTRADA: { label: "Recepción Traslado", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  AJUSTE_POSITIVO: { label: "Ajuste (+) Sobrante", color: "bg-teal-50 text-teal-700 border-teal-200" },
  AJUSTE_NEGATIVO: { label: "Ajuste (-) Faltante", color: "bg-orange-50 text-orange-700 border-orange-200" },
  MERMA_BAJA: { label: "Baja por Merma / Vencimiento", color: "bg-red-50 text-red-700 border-red-200" }
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  productoInicial?: Producto | null;
}

export default function ModalKardex({ isOpen, onClose, productoInicial }: Props) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(productoInicial || null);
  const [movimientos, setMovimientos] = useState<MovimientoKardex[]>([]);
  const [cargando, setCargando] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [searchProd, setSearchProd] = useState("");

  useEffect(() => {
    if (isOpen) {
      cargarProductos();
      if (productoInicial) {
        setProductoSeleccionado(productoInicial);
        cargarKardexProducto(productoInicial.id);
      } else {
        cargarKardexRecientes();
      }
    }
  }, [isOpen, productoInicial]);

  const cargarProductos = async () => {
    try {
      const res = await apiFetch("/api/productos");
      if (res.ok) setProductos(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const cargarKardexRecientes = async () => {
    setCargando(true);
    try {
      const res = await apiFetch("/api/kardex/recientes");
      if (res.ok) {
        const data = await res.json();
        setMovimientos(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  const cargarKardexProducto = async (prodId: string) => {
    setCargando(true);
    try {
      const res = await apiFetch(`/api/kardex/producto/${prodId}`);
      if (res.ok) {
        const data = await res.json();
        setMovimientos(data.movimientos || []);
        if (data.producto) setProductoSeleccionado(data.producto);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  const handleSeleccionarProd = (prod: Producto) => {
    setProductoSeleccionado(prod);
    setSearchProd("");
    cargarKardexProducto(prod.id);
  };

  const handleVerTodos = () => {
    setProductoSeleccionado(null);
    cargarKardexRecientes();
  };

  const movimientosFiltrados = movimientos.filter(m => {
    if (!filtroTipo) return true;
    return m.tipo_movimiento === filtroTipo;
  });

  const exportarKardexCSV = () => {
    if (movimientosFiltrados.length === 0) return;
    const headers = ["Fecha", "Hora", "Producto", "Tipo", "Doc Ref", "Ubicación", "Entrada", "Salida", "Stock Anterior", "Stock Resultante", "Precio USD", "Usuario", "Observaciones"];
    const rows = movimientosFiltrados.map(m => [
      new Date(m.fecha).toLocaleDateString("es-VE"),
      new Date(m.fecha).toLocaleTimeString("es-VE"),
      `"${(m.producto_nombre || '').replace(/"/g, '""')}"`,
      m.tipo_movimiento,
      m.referencia_documento || '',
      m.ubicacion_afectada,
      m.cantidad_entrada || 0,
      m.cantidad_salida || 0,
      m.stock_anterior,
      m.stock_resultante,
      (m.precio_unitario_usd || 0).toFixed(2),
      m.usuario,
      `"${(m.observaciones || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Kardex_${productoSeleccionado ? productoSeleccionado.nombre.replace(/\s+/g, '_') : 'Movimientos'}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const prodsSearchList = productos.filter(p => {
    if (!searchProd) return false;
    const s = searchProd.toLowerCase();
    return p.nombre.toLowerCase().includes(s) || p.codigo.toLowerCase().includes(s);
  }).slice(0, 5);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Cabecera */}
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-50 border border-cyan-200/80 text-cyan-700 flex items-center justify-center shadow-sm">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                Kardex de Movimientos & Auditoría de Stock
                <span className="text-[10px] font-bold bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded-full">
                  Trazabilidad Total
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Historial cronológico de compras, ventas, devoluciones, traslados y ajustes de inventario.
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

        {/* Barra de Filtro y Selección de Producto */}
        <div className="px-6 py-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4 border-b border-slate-800">
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            {productoSeleccionado ? (
              <div className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-2 flex items-center justify-between w-full max-w-md">
                <div>
                  <span className="text-[10px] text-cyan-400 font-mono block">Producto Seleccionado:</span>
                  <span className="text-xs font-bold text-white block truncate">{productoSeleccionado.nombre}</span>
                  <span className="text-[10px] text-slate-400 font-mono">Stock Actual: {productoSeleccionado.stock} (Tienda: {productoSeleccionado.stock_tienda || 0} | Depósito: {productoSeleccionado.stock_almacen || 0})</span>
                </div>
                <button
                  onClick={handleVerTodos}
                  className="text-xs text-slate-400 hover:text-white font-bold ml-3 px-2 py-1 bg-slate-700 rounded-lg"
                >
                  Ver Todos
                </button>
              </div>
            ) : (
              <div className="relative w-full max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar producto para auditar su Kardex..."
                  value={searchProd}
                  onChange={(e) => setSearchProd(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-10 pr-4 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-cyan-500"
                />
                {searchProd && prodsSearchList.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-2xl shadow-xl z-20 overflow-hidden">
                    {prodsSearchList.map(p => (
                      <div
                        key={p.id}
                        onClick={() => handleSeleccionarProd(p)}
                        className="p-2.5 hover:bg-slate-700 cursor-pointer flex justify-between items-center text-xs border-b border-slate-700/50 last:border-0"
                      >
                        <div>
                          <div className="font-bold text-white">{p.nombre}</div>
                          <div className="text-[10px] text-slate-400 font-mono">Ref: {p.codigo} | Stock: {p.stock}</div>
                        </div>
                        <span className="text-[10px] text-cyan-400 font-bold">Ver Kardex →</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 rounded-xl px-3 py-2 outline-none"
            >
              <option value="">Todos los tipos de movimiento</option>
              <option value="VENTA">Ventas</option>
              <option value="COMPRA_RECEPCION">Compras / Recepciones</option>
              <option value="DEVOLUCION_CLIENTE">Devoluciones (Notas de Crédito)</option>
              <option value="TRASLADO_SALIDA">Traslados Internos</option>
              <option value="AJUSTE_POSITIVO">Ajustes Positivos</option>
              <option value="AJUSTE_NEGATIVO">Ajustes Negativos</option>
              <option value="MERMA_BAJA">Mermas / Bajas</option>
            </select>

            {movimientosFiltrados.length > 0 && (
              <button
                onClick={exportarKardexCSV}
                className="bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar CSV</span>
              </button>
            )}
          </div>
        </div>

        {/* Tabla de Movimientos */}
        <div className="flex-1 overflow-y-auto p-6">
          {cargando ? (
            <div className="text-center py-16 text-slate-400 text-xs">Cargando movimientos del Kardex...</div>
          ) : movimientosFiltrados.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50 text-slate-400 text-xs">
              No hay movimientos registrados para este criterio en el Kardex.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="py-3 px-4">Fecha & Hora</th>
                    <th className="py-3 px-4">Producto</th>
                    <th className="py-3 px-4">Tipo Movimiento</th>
                    <th className="py-3 px-4">Referencia Doc</th>
                    <th className="py-3 px-4 text-center">Entrada (+)</th>
                    <th className="py-3 px-4 text-center">Salida (-)</th>
                    <th className="py-3 px-4 text-center">Stock Final</th>
                    <th className="py-3 px-4">Observaciones / Usuario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {movimientosFiltrados.map((m) => {
                    const tipoInfo = TIPOS_KARDEX_LABEL[m.tipo_movimiento] || { label: m.tipo_movimiento, color: "bg-slate-100 text-slate-700" };
                    return (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          <div>{new Date(m.fecha).toLocaleDateString("es-VE")}</div>
                          <div className="text-[9px] text-slate-400">{new Date(m.fecha).toLocaleTimeString("es-VE", { hour: '2-digit', minute: '2-digit' })}</div>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {m.producto_nombre}
                          <span className="text-[10px] text-slate-400 font-mono block">{m.producto_codigo}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${tipoInfo.color}`}>
                            {tipoInfo.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-700">
                          {m.referencia_documento || <span className="text-slate-300">N/A</span>}
                          <div className="text-[9px] text-slate-400 font-normal font-sans">Ubicación: {m.ubicacion_afectada}</div>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-black text-emerald-600">
                          {m.cantidad_entrada > 0 ? `+${m.cantidad_entrada}` : "-"}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-black text-rose-600">
                          {m.cantidad_salida > 0 ? `-${m.cantidad_salida}` : "-"}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-black text-slate-900 bg-slate-50/50">
                          {m.stock_resultante}
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-[11px]">
                          {m.observaciones || "Movimiento estándar"}
                          <div className="text-[9px] text-slate-400 font-mono">Por: {m.usuario}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
