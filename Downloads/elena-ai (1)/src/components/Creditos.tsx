/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { UserX, RefreshCw, Search, DollarSign, Wallet, FileText, ArrowRight, X, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Cliente } from "../types";
import { apiFetch } from "../utils/api";

interface HistorialPago {
  id: string;
  fecha: string;
  cedula_cliente: string;
  monto_usd: number;
  tasa_usada: number;
  referencia: string;
}

export default function Creditos() {
  const [deudores, setDeudores] = useState<Cliente[]>([]);
  const [historial, setHistorial] = useState<HistorialPago[]>([]);
  const [buscar, setBuscar] = useState("");
  const [buscarHistorial, setBuscarHistorial] = useState("");
  const [ordenDeudores, setOrdenDeudores] = useState<"monto_desc" | "monto_asc" | "nombre_asc">("monto_desc");
  const [rangoDeuda, setRangoDeuda] = useState<"todos" | "mas_10" | "mas_50" | "mas_100">("todos");
  const [tasa, setTasa] = useState(36.50);

  // Modal de Abono
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [montoAbono, setMontoAbono] = useState("");
  const [metodoPago, setMetodoMetodo] = useState("Pago Móvil");
  const [referencia, setReferencia] = useState("");

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [resDeudores, resHistorial, resTasa] = await Promise.all([
        apiFetch("/api/creditos/deudores").then(r => r.json()),
        apiFetch("/api/creditos/historial").then(r => r.json()),
        apiFetch("/api/dolar").then(r => r.json())
      ]);
      setDeudores(resDeudores);
      setHistorial(resHistorial);
      setTasa(resTasa.tasa);
    } catch (err) {
      console.error(err);
    }
  };

  const abrirModalAbono = (c: Cliente) => {
    setClienteSeleccionado(c);
    setMontoAbono(c.saldo_pendiente.toFixed(2));
    setReferencia("");
  };

  const confirmarAbono = async () => {
    if (!clienteSeleccionado) return;
    const monto = parseFloat(montoAbono);
    if (isNaN(monto) || monto <= 0 || monto > clienteSeleccionado.saldo_pendiente + 0.01) {
      return alert("Monto de abono inválido");
    }

    const payload = {
      cedula: clienteSeleccionado.cedula,
      monto,
      referencia: `${metodoPago} - ${referencia || "S/R"}`,
      tasa
    };

    try {
      const res = await apiFetch("/api/creditos/abonar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert("¡Abono registrado con éxito en la cuenta!");
        setClienteSeleccionado(null);
        cargarDatos();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const anularPago = async (item: HistorialPago) => {
    if (!confirm(`¿Desea anular el pago de $${item.monto_usd.toFixed(2)} para la cédula ${item.cedula_cliente}?`)) return;
    try {
      const res = await apiFetch("/api/creditos/anular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, cedula: item.cedula_cliente, monto: item.monto_usd })
      });
      if (res.ok) {
        alert("Abono anulado, saldo deudor reestablecido.");
        cargarDatos();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const totalDeudaAcumulada = deudores.reduce((sum, c) => sum + c.saldo_pendiente, 0);

  const deudoresFiltrados = deudores
    .filter(c => {
      const term = buscar.trim().toLowerCase();
      const coincideBusqueda = 
        c.nombre.toLowerCase().includes(term) || 
        c.apellido.toLowerCase().includes(term) ||
        c.cedula.toLowerCase().includes(term);

      if (!coincideBusqueda) return false;

      if (rangoDeuda === "mas_10" && c.saldo_pendiente < 10) return false;
      if (rangoDeuda === "mas_50" && c.saldo_pendiente < 50) return false;
      if (rangoDeuda === "mas_100" && c.saldo_pendiente < 100) return false;

      return true;
    })
    .sort((a, b) => {
      if (ordenDeudores === "monto_desc") return b.saldo_pendiente - a.saldo_pendiente;
      if (ordenDeudores === "monto_asc") return a.saldo_pendiente - b.saldo_pendiente;
      if (ordenDeudores === "nombre_asc") return a.nombre.localeCompare(b.nombre);
      return 0;
    });

  const historialFiltrado = historial.filter(h => {
    const term = buscarHistorial.trim().toLowerCase();
    if (!term) return true;
    return (
      h.cedula_cliente.toLowerCase().includes(term) ||
      (h.referencia && h.referencia.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      {/* Cabecera y Resúmenes */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Cuentas por Cobrar</h1>
          <p className="text-sm text-slate-500">Administración de créditos a clientes y amortizaciones.</p>
        </div>
        <button 
          onClick={cargarDatos}
          className="self-start bg-white border border-slate-200 p-2.5 rounded-xl hover:bg-slate-50 text-slate-600 transition"
        >
          <RefreshCw className="w-4.5 h-4.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total por Cobrar ($)</p>
          <h2 className="text-3xl font-black text-rose-500 mt-2">${totalDeudaAcumulada.toFixed(2)}</h2>
          <p className="text-xs text-slate-500 mt-2 font-medium">Bs. {(totalDeudaAcumulada * tasa).toFixed(2)}</p>
        </div>
        <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Clientes deudores</p>
          <h2 className="text-3xl font-black text-slate-800 mt-2">{deudores.length}</h2>
          <p className="text-xs text-slate-500 mt-2 font-medium">Financiamiento Activo</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-[2rem] shadow-sm">
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Monitoreo de Cobro</p>
          <h2 className="text-3xl font-black text-indigo-700 mt-2">AL DÍA</h2>
          <p className="text-xs text-indigo-600 mt-2 font-medium">Tasa Cambiaria: Bs. {tasa.toFixed(2)}</p>
        </div>
      </div>

      {/* Listado de Deudores */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-50 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Cartera de Crédito</h3>
            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              {deudoresFiltrados.length} Clientes
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Selector Rango Deuda */}
            <select
              value={rangoDeuda}
              onChange={(e) => setRangoDeuda(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-2.5 text-xs font-bold text-slate-600 outline-none"
            >
              <option value="todos">Cualquier Monto</option>
              <option value="mas_10">Deuda &gt; $10</option>
              <option value="mas_50">Deuda &gt; $50</option>
              <option value="mas_100">Deuda &gt; $100</option>
            </select>

            {/* Selector Orden */}
            <select
              value={ordenDeudores}
              onChange={(e) => setOrdenDeudores(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-2.5 text-xs font-bold text-indigo-700 outline-none"
            >
              <option value="monto_desc">Mayor Deuda Primero</option>
              <option value="monto_asc">Menor Deuda Primero</option>
              <option value="nombre_asc">Nombre (A - Z)</option>
            </select>

            <div className="relative w-56">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por cédula o nombre..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 pl-9 pr-3 text-xs font-semibold outline-none focus:bg-white"
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                <th className="p-4 pl-6">Cédula</th>
                <th className="p-4">Cliente / Afiliado</th>
                <th className="p-4">Teléfono</th>
                <th className="p-4 text-right">Monto Deudor ($)</th>
                <th className="p-4 text-right">Equivalente (Bs)</th>
                <th className="p-4 text-center pr-6">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs">
              {deudoresFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-slate-400 py-12 font-medium">Ningún cliente con deudas pendientes que coincida con los filtros.</td>
                </tr>
              ) : (
                deudoresFiltrados.map((c) => (
                  <tr key={c.cedula} className="hover:bg-slate-50/50 transition">
                    <td className="p-4 pl-6 font-mono text-slate-400 text-[10px]">{c.cedula}</td>
                    <td className="p-4 font-bold text-slate-800">{c.nombre} {c.apellido}</td>
                    <td className="p-4 text-slate-500">{c.telefono || "N/A"}</td>
                    <td className="p-4 text-right font-black text-rose-500">${c.saldo_pendiente.toFixed(2)}</td>
                    <td className="p-4 text-right font-semibold text-slate-600">Bs. {(c.saldo_pendiente * tasa).toFixed(2)}</td>
                    <td className="p-4 pr-6 text-center">
                      <button
                        onClick={() => abrirModalAbono(c)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-black px-4 py-2 rounded-xl text-[10px] uppercase tracking-wider transition cursor-pointer"
                      >
                        Abonar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historial de Pagos de Clientes */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-50 pb-3 mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            Bitácora Reciente de Cobros
          </h3>
          <div className="relative w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por cédula o ref..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1 pl-8 pr-3 text-xs font-semibold outline-none focus:bg-white"
              value={buscarHistorial}
              onChange={(e) => setBuscarHistorial(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-y-auto max-h-60 space-y-2 pr-2 scrollbar-thin">
          {historialFiltrado.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">No hay registros de abonos que coincidan.</p>
          ) : (
            historialFiltrado.map((h) => (
              <div key={h.id} className="p-3 bg-slate-50 rounded-2xl flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-slate-800">Cédula: {h.cedula_cliente}</span>
                  <span className="text-[10px] text-slate-400 ml-4 font-mono">
                    {new Date(h.fecha).toLocaleString("es-VE")}
                  </span>
                  <p className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">Ref: {h.referencia}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="font-black text-emerald-600 block">+${h.monto_usd.toFixed(2)}</span>
                    <span className="text-[9px] text-slate-400 font-bold block">Bs. {(h.monto_usd * h.tasa_usada).toFixed(2)}</span>
                  </div>
                  <button 
                    onClick={() => anularPago(h)}
                    className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-xl transition cursor-pointer"
                    title="Anular abono"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal de Abono */}
      <AnimatePresence>
        {clienteSeleccionado && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white p-6 rounded-[2.5rem] w-full max-w-md shadow-2xl space-y-5"
            >
              <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                <div>
                  <h3 className="font-black text-slate-800 text-base">Registrar Amortización</h3>
                  <p className="text-[10px] text-slate-400">Cliente: {clienteSeleccionado.nombre} {clienteSeleccionado.apellido}</p>
                </div>
                <button 
                  onClick={() => setClienteSeleccionado(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 bg-slate-50 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500">Monto del Abono ($)</label>
                  <div className="relative mt-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-600 text-lg">$</span>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 pl-10 pr-4 font-black text-lg text-slate-800 outline-none"
                      value={montoAbono}
                      onChange={(e) => setMontoAbono(e.target.value)}
                    />
                  </div>
                </div>

                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex justify-between items-center">
                  <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider">Monto en Bolívares:</span>
                  <span className="font-black text-indigo-900 text-lg">
                    Bs. {((parseFloat(montoAbono) || 0) * tasa).toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase">Vía de Recepción</label>
                    <select
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-xs mt-1 outline-none font-bold"
                      value={metodoPago}
                      onChange={(e) => setMetodoMetodo(e.target.value)}
                    >
                      <option value="Pago Móvil">📱 Pago Móvil</option>
                      <option value="Efectivo $">💵 Efectivo $</option>
                      <option value="Efectivo Bs">💸 Efectivo Bs</option>
                      <option value="Punto de Venta">💳 Punto de Venta</option>
                      <option value="Zelle">🌀 Zelle</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase">Referencia de Pago</label>
                    <input
                      type="text"
                      placeholder="Ej: 8841"
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-xs font-semibold mt-1 outline-none"
                      value={referencia}
                      onChange={(e) => setReferencia(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setClienteSeleccionado(null)}
                    className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold py-3.5 rounded-2xl text-xs uppercase"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmarAbono}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3.5 rounded-2xl text-xs uppercase tracking-wider shadow-md shadow-indigo-100"
                  >
                    Confirmar Abono
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
