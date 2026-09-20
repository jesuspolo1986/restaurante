/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { DollarSign, AlertTriangle, Activity, TrendingUp, Users, CheckCircle } from "lucide-react";
import { motion } from "motion/react";
import { Producto, Cliente, LogActividad } from "../types";
import { apiFetch } from "../utils/api";

export default function Dashboard() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [logs, setLogs] = useState<LogActividad[]>([]);
  const [tasa, setTasa] = useState<number>(36.50);
  const [ventasHoy, setVentasHoy] = useState<number>(0);
  const [ventasCantidad, setVentasCantidad] = useState<number>(0);

  // Umbral de stock mínimo configurable manualmente (por defecto 5)
  const [umbralStock, setUmbralStock] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("dashboard_umbral_stock");
      return saved ? parseInt(saved, 10) : 5;
    } catch {
      return 5;
    }
  });

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Auto-update
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [resProd, resCli, resLogs, resTasa, resCaja] = await Promise.all([
        apiFetch("/api/productos").then(r => r.json()),
        apiFetch("/api/clientes").then(r => r.json()),
        apiFetch("/api/auditoria").then(r => r.json()),
        apiFetch("/api/dolar").then(r => r.json()),
        apiFetch("/api/informes/cierre-caja-datos").then(r => r.json())
      ]);

      setProductos(resProd);
      setClientes(resCli);
      setLogs(resLogs);
      setTasa(resTasa.tasa);
      if (resCaja && resCaja.datos) {
        setVentasHoy(resCaja.datos.resumen_fiscal.gran_total_usd);
        setVentasCantidad(resCaja.datos.resumen_fiscal.cantidad_facturas);
      }
    } catch (err) {
      console.error("Error cargando dashboard:", err);
    }
  };

  const deudores = clientes.filter(c => c.saldo_pendiente > 0);
  const totalCobrar = deudores.reduce((sum, c) => sum + c.saldo_pendiente, 0);
  const stockCritico = productos.filter(p => p.stock <= umbralStock);

  return (
    <div className="space-y-6">
      {/* Saludo y Tasa */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Pizarra de Control / Elena PRO</h1>
          <p className="text-sm text-slate-500">Métricas consolidadas del negocio y auditoría del día.</p>
        </div>
        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-2xl">
          <TrendingUp className="w-4 h-4 text-indigo-600 animate-pulse" />
          <span className="text-xs font-semibold text-indigo-800">Tasa Oficial BCV:</span>
          <span className="text-sm font-black text-indigo-900">Bs. {tasa.toFixed(2)}</span>
        </div>
      </div>

      {/* Alerta Visual de Stock Crítico */}
      {stockCritico.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-rose-50 border border-rose-100 p-4 rounded-[2rem] flex items-start gap-3.5 shadow-sm"
        >
          <div className="p-2.5 bg-rose-100 text-rose-700 rounded-2xl shrink-0">
            <AlertTriangle className="w-5 h-5 animate-bounce" />
          </div>
          <div className="flex-1 space-y-1">
            <h4 className="text-xs font-black text-rose-950 uppercase tracking-wider">Productos con Stock Crítico Detectados</h4>
            <p className="text-[11px] text-rose-700 font-semibold leading-relaxed">
              Hay <span className="font-extrabold text-rose-950">{stockCritico.length} artículo(s)</span> que están por debajo o igual del límite de reposición configurado (<span className="font-extrabold text-rose-950">{umbralStock} unidades</span>). Por favor, revise la sección de reposición urgente para programar el reabastecimiento.
            </p>
          </div>
        </motion.div>
      )}

      {/* Bento Grid - Indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ventas */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-sm relative overflow-hidden"
        >
          <div className="absolute -right-6 -bottom-6 opacity-10">
            <DollarSign className="w-28 h-28" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Ventas de Hoy</p>
          <h3 className="text-3xl font-black mt-2">${ventasHoy.toFixed(2)}</h3>
          <p className="text-xs text-slate-400 mt-3 font-medium">
            En Bolívares: <span className="font-bold text-white">Bs. {(ventasHoy * tasa).toFixed(2)}</span>
          </p>
          <div className="mt-4 inline-block bg-slate-800 text-[9px] font-bold text-teal-400 px-2 py-1 rounded-full uppercase">
            {ventasCantidad} Facturas Emitidas
          </div>
        </motion.div>

        {/* Cuentas por Cobrar */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm relative overflow-hidden"
        >
          <div className="absolute -right-6 -bottom-6 opacity-5 text-indigo-600">
            <Users className="w-28 h-28" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Créditos por Cobrar</p>
          <h3 className="text-3xl font-black text-slate-800 mt-2">${totalCobrar.toFixed(2)}</h3>
          <p className="text-xs text-slate-500 mt-3 font-medium">
            Capital Otorgado a Clientes
          </p>
          <div className="mt-4 inline-block bg-indigo-50 text-[9px] font-bold text-indigo-600 px-2 py-1 rounded-full uppercase">
            {deudores.length} Clientes deudores
          </div>
        </motion.div>

        {/* Stock Crítico */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm relative overflow-hidden"
        >
          <div className="absolute -right-6 -bottom-6 opacity-5 text-amber-500">
            <AlertTriangle className="w-28 h-28" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Alertas de Stock</p>
          <h3 className={`text-3xl font-black mt-2 ${stockCritico.length > 0 ? "text-amber-600 animate-pulse" : "text-indigo-600"}`}>
            {stockCritico.length} <span className="text-sm font-bold text-slate-400">artículos</span>
          </h3>
          <p className="text-xs text-slate-500 mt-3 font-medium">
            Con stock de <span className="font-bold text-slate-950">{umbralStock}</span> unidades o menos
          </p>
          <div className={`mt-4 inline-block text-[9px] font-bold px-2 py-1 rounded-full uppercase ${
            stockCritico.length > 0 ? "bg-amber-50 text-amber-600 animate-pulse" : "bg-indigo-50 text-indigo-600"
          }`}>
            {stockCritico.length > 0 ? "Requiere Reposición" : "Inventario al día"}
          </div>
        </motion.div>

        {/* Estado Operativo */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm relative overflow-hidden"
        >
          <div className="absolute -right-6 -bottom-6 opacity-5 text-indigo-505">
            <Activity className="w-28 h-28" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estado de Caja</p>
          <h3 className="text-3xl font-black text-indigo-600 mt-2">ABIERTA</h3>
          <p className="text-xs text-slate-500 mt-3 font-medium">
            Sistema listo para facturación
          </p>
          <div className="mt-4 inline-block bg-indigo-50 text-[9px] font-bold text-indigo-600 px-2 py-1 rounded-full uppercase">
            Listo para Impresión Fiscal / Notas
          </div>
        </motion.div>
      </div>

      {/* Auditoría y Stock Bajo */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Registro de Auditoría */}
        <div className="lg:col-span-8 bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-50 pb-3">
            <Activity className="w-5 h-5 text-slate-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Auditoría de Actividad Reciente</h3>
          </div>
          <div className="overflow-y-auto max-h-[380px] space-y-3 pr-2 scrollbar-thin">
            {logs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No hay registros de actividad todavía.</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex gap-4 p-3 bg-slate-50 rounded-xl text-xs hover:bg-slate-100/50 transition">
                  <span className="text-slate-400 font-mono self-start whitespace-nowrap">
                    {new Date(log.fecha).toLocaleTimeString("es-VE")}
                  </span>
                  <div>
                    <span className={`font-black px-2 py-0.5 rounded text-[9px] uppercase mr-2 inline-block ${
                      log.accion.includes("VENTA") ? "bg-indigo-100 text-indigo-800" :
                      log.accion.includes("ABONO") ? "bg-emerald-100 text-emerald-800" :
                      log.accion.includes("STOCK") || log.accion.includes("INICIALIZACIÓN") ? "bg-blue-100 text-blue-800" :
                      "bg-amber-100 text-amber-800"
                    }`}>
                      {log.accion}
                    </span>
                    <p className="text-slate-600 font-medium mt-1 leading-relaxed">{log.detalle}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Artículos con Alerta */}
        <div className="lg:col-span-4 bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500 animate-pulse" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Reposición Urgente</h3>
            </div>
          </div>

          <div className="overflow-y-auto max-h-[350px] flex-1 space-y-3 pr-2 scrollbar-thin">
            {stockCritico.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8 text-slate-400 space-y-2">
                <CheckCircle className="w-10 h-10 text-emerald-500" />
                <p className="text-xs font-bold text-slate-700">¡Inventario Excelente!</p>
                <p className="text-[10px]">No hay productos con stock menor o igual a {umbralStock}.</p>
              </div>
            ) : (
              stockCritico.map((p) => {
                const porcentaje = p.stock === 0 ? 0 : Math.round((p.stock / umbralStock) * 100);
                return (
                  <div key={p.id} className="p-3 bg-amber-50/50 border border-amber-100 rounded-2xl flex justify-between items-center text-xs hover:bg-amber-100/50 transition">
                    <div>
                      <h4 className="font-bold text-slate-800 leading-tight">{p.nombre}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] text-slate-400 font-mono">{p.codigo}</span>
                        {p.stock === 0 ? (
                          <span className="text-[8px] font-black text-rose-600 bg-rose-50 px-1 py-0.2 rounded uppercase tracking-wider">Agotado</span>
                        ) : (
                          <span className="text-[9px] font-bold text-slate-400">({porcentaje}% del mín.)</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`font-black px-2.5 py-1 rounded-xl text-xs ${
                        p.stock === 0 
                          ? "text-rose-700 bg-rose-100 animate-pulse" 
                          : p.stock <= Math.ceil(umbralStock / 2)
                          ? "text-rose-600 bg-rose-50"
                          : "text-amber-600 bg-amber-50"
                      }`}>
                        {p.stock} u.
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
