/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Truck, Plus, RefreshCw, Search, DollarSign, Edit2, ShieldAlert, X, CheckSquare, Coins } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Proveedor, FacturaCompra } from "../types";
import { apiFetch } from "../utils/api";

export default function Proveedores() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [buscar, setBuscar] = useState("");
  const [filtroSaldo, setFiltroSaldo] = useState<"todos" | "con_deuda" | "al_dia">("todos");
  const [ordenProveedores, setOrdenProveedores] = useState<"saldo_desc" | "nombre_asc" | "credito_desc">("saldo_desc");

  // Estado del Formulario Proveedor (Crear/Editar)
  const [mostrarForm, setMostrarForm] = useState(false);
  const [id, setId] = useState("");
  const [rif, setRif] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [direccion, setDireccion] = useState("");
  const [diasCredito, setDiasCredito] = useState(0);

  // Estado del Modal de Cuentas por Pagar (Deudas Proveedor)
  const [proveedorDeudas, setProveedorDeudas] = useState<Proveedor | null>(null);
  const [facturasPendientes, setFacturasPendientes] = useState<FacturaCompra[]>([]);
  const [facturaAbonar, setFacturaAbonar] = useState<FacturaCompra | null>(null);
  const [montoAbono, setMontoAbono] = useState("");
  const [refAbono, setRefAbono] = useState("");

  useEffect(() => {
    cargarProveedores();
  }, []);

  const cargarProveedores = async () => {
    try {
      const res = await apiFetch("/api/proveedores");
      const data = await res.json();
      setProveedores(data);
    } catch (err) {
      console.error(err);
    }
  };

  const abrirDeudas = async (p: Proveedor) => {
    setProveedorDeudas(p);
    setFacturaAbonar(null);
    try {
      const res = await apiFetch(`/api/compras/pendientes?proveedor_id=${p.id}`);
      const data = await res.json();
      setFacturasPendientes(data);
    } catch (err) {
      console.error(err);
    }
  };

  const guardarProveedor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rif || !razonSocial) return alert("RIF y Razón Social son requeridos");

    const payload = {
      id: id || undefined,
      rif,
      razon_social: razonSocial,
      telefono,
      correo,
      direccion,
      dias_credito: Number(diasCredito)
    };

    try {
      const res = await apiFetch("/api/proveedores/guardar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert("Proveedor guardado con éxito.");
        setMostrarForm(false);
        limpiarForm();
        cargarProveedores();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const iniciarEdicion = (p: Proveedor) => {
    setId(p.id);
    setRif(p.rif);
    setRazonSocial(p.razon_social);
    setTelefono(p.telefono);
    setCorreo(p.correo);
    setDireccion(p.direccion);
    setDiasCredito(p.dias_credito);
    setMostrarForm(true);
  };

  const limpiarForm = () => {
    setId("");
    setRif("");
    setRazonSocial("");
    setTelefono("");
    setCorreo("");
    setDireccion("");
    setDiasCredito(0);
  };

  const iniciarAbono = (f: FacturaCompra) => {
    setFacturaAbonar(f);
    setMontoAbono(f.monto_pendiente.toFixed(2));
    setRefAbono("");
  };

  const registrarAbonoCompra = async () => {
    if (!facturaAbonar) return;
    const monto = parseFloat(montoAbono);
    if (isNaN(monto) || monto <= 0 || monto > facturaAbonar.monto_pendiente + 0.01) {
      return alert("Monto de pago inválido");
    }
    if (!refAbono) return alert("Introduzca la referencia de pago");

    const payload = {
      factura_compra_id: facturaAbonar.id,
      monto,
      referencia: refAbono
    };

    try {
      const res = await apiFetch("/api/compras/abonar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert("Pago registrado, saldo amortizado.");
        setFacturaAbonar(null);
        if (proveedorDeudas) {
          abrirDeudas(proveedorDeudas);
        }
        cargarProveedores();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const totalCuentasPorPagar = proveedores.reduce((sum, p) => sum + p.saldo, 0);

  const proveedoresFiltrados = proveedores
    .filter(p => {
      const term = buscar.trim().toLowerCase();
      const coincideBusqueda = 
        p.razon_social.toLowerCase().includes(term) || 
        p.rif.toLowerCase().includes(term);

      if (!coincideBusqueda) return false;

      if (filtroSaldo === "con_deuda" && p.saldo <= 0) return false;
      if (filtroSaldo === "al_dia" && p.saldo > 0) return false;

      return true;
    })
    .sort((a, b) => {
      if (ordenProveedores === "saldo_desc") return b.saldo - a.saldo;
      if (ordenProveedores === "nombre_asc") return a.razon_social.localeCompare(b.razon_social);
      if (ordenProveedores === "credito_desc") return (b.dias_credito || 0) - (a.dias_credito || 0);
      return 0;
    });

  return (
    <div className="space-y-6">
      {/* Cabecera y Resúmenes */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Módulo de Proveedores</h1>
          <p className="text-sm text-slate-500">Cuentas por pagar, condiciones de crédito y directorio de mayoristas/distribuidores.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { limpiarForm(); setMostrarForm(true); }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-4 py-2.5 rounded-2xl text-xs uppercase tracking-wider transition flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-900/20"
          >
            <Plus className="w-4 h-4" /> Agregar Proveedor
          </button>
          <button 
            onClick={cargarProveedores}
            className="bg-white border border-slate-200 p-2.5 rounded-xl hover:bg-slate-50 text-slate-600 transition cursor-pointer"
          >
            <RefreshCw className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Compromisos Totales ($)</p>
          <h2 className="text-3xl font-black text-rose-500 mt-2">${totalCuentasPorPagar.toFixed(2)}</h2>
          <p className="text-xs text-slate-500 mt-2 font-medium">Pasivos a Crédito</p>
        </div>
        <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Proveedores Activos</p>
          <h2 className="text-3xl font-black text-slate-800 mt-2">{proveedores.length}</h2>
          <p className="text-xs text-slate-500 mt-2 font-medium">Socios y distribuidores</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-[2rem] shadow-sm">
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Límite Comercial</p>
          <h2 className="text-3xl font-black text-emerald-700 mt-2">ACTIVO</h2>
          <p className="text-xs text-emerald-600 mt-2 font-medium">Canales de abastecimiento directos</p>
        </div>
      </div>

      {/* Listado de Proveedores */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-50 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Directorio de Proveedores</h3>
            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              {proveedoresFiltrados.length} Registros
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro Saldo */}
            <select
              value={filtroSaldo}
              onChange={(e) => setFiltroSaldo(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-2.5 text-xs font-bold text-slate-600 outline-none"
            >
              <option value="todos">Todos los Estados</option>
              <option value="con_deuda">💳 Con Cuentas por Pagar</option>
              <option value="al_dia">✅ Al Día (Sin Deuda)</option>
            </select>

            {/* Orden */}
            <select
              value={ordenProveedores}
              onChange={(e) => setOrdenProveedores(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-2.5 text-xs font-bold text-indigo-700 outline-none"
            >
              <option value="saldo_desc">Mayor Saldo Deudor</option>
              <option value="nombre_asc">Razón Social (A - Z)</option>
              <option value="credito_desc">Mayor Plazo de Crédito</option>
            </select>

            <div className="relative w-56">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por RIF o Nombre..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 pl-9 pr-4 text-xs font-semibold outline-none focus:bg-white"
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
                <th className="p-4 pl-6">Droguería / RIF</th>
                <th className="p-4">Contacto / Teléfono</th>
                <th className="p-4 text-center">Condición de Crédito</th>
                <th className="p-4 text-right">Saldo Pendiente ($)</th>
                <th className="p-4 text-center pr-6">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs">
              {proveedoresFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-slate-400 py-12 font-medium">Ningún proveedor en la base de datos.</td>
                </tr>
              ) : (
                proveedoresFiltrados.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition">
                    <td className="p-4 pl-6">
                      <div className="font-bold text-slate-800 text-xs">{p.razon_social}</div>
                      <span className="text-[9px] text-indigo-600 font-black mt-1 inline-block">{p.rif}</span>
                    </td>
                    <td className="p-4 text-slate-500">
                      <div>{p.telefono || "N/A"}</div>
                      <div className="text-[10px] text-slate-400 font-medium">{p.correo || ""}</div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold ${
                        p.dias_credito > 0 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                      }`}>
                        {p.dias_credito > 0 ? `Crédito ${p.dias_credito} días` : "Contado"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className={`font-black text-sm px-2.5 py-1 rounded-xl ${
                        p.saldo > 0 ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-400"
                      }`}>
                        ${p.saldo.toFixed(2)}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => abrirDeudas(p)}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-black px-3.5 py-2 rounded-xl text-[10px] uppercase tracking-wider transition"
                        >
                          Cuentas
                        </button>
                        <button
                          onClick={() => iniciarEdicion(p)}
                          className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-2 rounded-xl transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Formulario Proveedor */}
      <AnimatePresence>
        {mostrarForm && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white p-6 rounded-[2.5rem] w-full max-w-md shadow-2xl space-y-5"
            >
              <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                <h3 className="font-black text-slate-800 text-base">{id ? "Editar Droguería" : "Agregar Nueva Droguería"}</h3>
                <button 
                  onClick={() => setMostrarForm(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 bg-slate-50 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={guardarProveedor} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500">RIF del Proveedor</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: J-12345678-9"
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-xs font-semibold mt-1 outline-none"
                    value={rif}
                    onChange={(e) => setRif(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500">Razón Social</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Droguería Nena Guanare"
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-xs font-semibold mt-1 outline-none"
                    value={razonSocial}
                    onChange={(e) => setRazonSocial(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500">Teléfono</label>
                    <input
                      type="text"
                      placeholder="Ej: 04141234567"
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-xs font-semibold mt-1 outline-none"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500">Días Crédito</label>
                    <input
                      type="number"
                      placeholder="0"
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-xs font-semibold mt-1 outline-none"
                      value={diasCredito}
                      onChange={(e) => setDiasCredito(parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500">Correo Electrónico</label>
                  <input
                    type="email"
                    placeholder="Ej: farmacia@nena.com"
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-xs font-semibold mt-1 outline-none"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500">Dirección Despacho</label>
                  <textarea
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-xs font-semibold mt-1 outline-none resize-none"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setMostrarForm(false)}
                    className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold py-3 rounded-xl text-xs uppercase"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Deudas del Proveedor */}
      <AnimatePresence>
        {proveedorDeudas && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white p-6 rounded-[2.5rem] w-full max-w-2xl shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                <div>
                  <h3 className="font-black text-slate-800 text-base uppercase">Pasivos: {proveedorDeudas.razon_social}</h3>
                  <p className="text-[10px] text-slate-400">Facturas de compras pendientes por liquidar.</p>
                </div>
                <button 
                  onClick={() => setProveedorDeudas(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 bg-slate-50 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Facturas */}
              <div className="overflow-y-auto max-h-60 border border-slate-100 rounded-2xl bg-slate-50/50">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black uppercase text-slate-400">
                      <th className="p-3 pl-4">N° Factura</th>
                      <th className="p-3">Emisión</th>
                      <th className="p-3">Vencimiento</th>
                      <th className="p-3 text-right">Pendiente</th>
                      <th className="p-3 text-center pr-4">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-semibold text-slate-600">
                    {facturasPendientes.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-emerald-600 font-bold"><i className="fas fa-circle-check mr-2"></i>¡Al día! No tiene compromisos de pago vigentes.</td>
                      </tr>
                    ) : (
                      facturasPendientes.map((f) => (
                        <tr key={f.id} className="hover:bg-slate-100/50 transition">
                          <td className="p-3 pl-4 font-bold text-slate-800">#{f.numero_factura}</td>
                          <td className="p-3 font-medium text-[10px]">{f.fecha_emision}</td>
                          <td className="p-3 text-rose-500 font-bold text-[10px]">{f.fecha_vencimiento}</td>
                          <td className="p-3 text-right font-black text-slate-700">-${f.monto_pendiente.toFixed(2)}</td>
                          <td className="p-3 text-center pr-4">
                            <button
                              onClick={() => iniciarAbono(f)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-3.5 py-1.5 rounded-xl text-[9px] uppercase tracking-wider transition"
                            >
                              Pagar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Sub-Formulario de Pago */}
              {facturaAbonar && (
                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-[2rem] space-y-3">
                  <h4 className="text-[10px] font-black uppercase text-indigo-700 flex items-center gap-1">
                    <Coins className="w-4 h-4" /> Registrar Amortización a Factura #{facturaAbonar.numero_factura}
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400">Monto del Pago ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-black outline-none text-slate-800"
                        value={montoAbono}
                        onChange={(e) => setMontoAbono(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400">Referencia de Pago</label>
                      <input
                        type="text"
                        placeholder="Ej: Transf. Nena - 1243"
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-semibold outline-none text-slate-800"
                        value={refAbono}
                        onChange={(e) => setRefAbono(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2 justify-end">
                    <button
                      onClick={() => setFacturaAbonar(null)}
                      className="bg-white hover:bg-slate-100 text-slate-600 font-bold px-4 py-2 rounded-xl text-[10px] border border-slate-200"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={registrarAbonoCompra}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 py-2 rounded-xl text-[10px] uppercase"
                    >
                      Confirmar
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-slate-900 text-white p-4 rounded-2xl flex justify-between items-center text-xs">
                <span className="font-black uppercase tracking-wider text-rose-400">Total Pasivo Acumulado:</span>
                <span className="text-xl font-black">${proveedorDeudas.saldo.toFixed(2)}</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
