/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  FileSpreadsheet, 
  Plus, 
  Search, 
  ShoppingCart, 
  Printer, 
  Calendar, 
  Clock, 
  User, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  ExternalLink,
  ChevronRight,
  Download
} from "lucide-react";
import { CotizacionPresupuesto, ItemCotizacion, Producto, Cliente } from "../types";
import { apiFetch } from "../utils/api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tasa: number;
  usuarioActual?: string;
  onCargarAlPOS?: (cotizacion: CotizacionPresupuesto) => void;
}

export default function ModalCotizaciones({
  isOpen,
  onClose,
  tasa,
  usuarioActual,
  onCargarAlPOS
}: Props) {
  const [tab, setTab] = useState<"LISTA" | "NUEVA" | "VER">("LISTA");
  const [cotizaciones, setCotizaciones] = useState<CotizacionPresupuesto[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(false);
  const [buscar, setBuscar] = useState("");

  // Cotización seleccionada para ver/imprimir
  const [cotSeleccionada, setCotSeleccionada] = useState<CotizacionPresupuesto | null>(null);

  // Formulario nueva cotización
  const [clienteId, setClienteId] = useState("V-99999999");
  const [clienteNombre, setClienteNombre] = useState("Cliente Particular");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [clienteDireccion, setClienteDireccion] = useState("");
  const [diasValidez, setDiasValidez] = useState(5);
  const [items, setItems] = useState<ItemCotizacion[]>([]);
  const [descuentoUSD, setDescuentoUSD] = useState(0);
  const [notasCondiciones, setNotasCondiciones] = useState("Precios sujetos a disponibilidad física de inventario. Tasa de cambio oficial BCV.");
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Búsqueda de producto para agregar a la cotización
  const [prodSearch, setProdSearch] = useState("");

  useEffect(() => {
    if (isOpen) {
      cargarDatos();
    }
  }, [isOpen]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [resCot, resProd, resCli] = await Promise.all([
        apiFetch("/api/cotizaciones"),
        apiFetch("/api/productos"),
        apiFetch("/api/clientes")
      ]);
      if (resCot.ok) setCotizaciones(await resCot.json());
      if (resProd.ok) setProductos(await resProd.json());
      if (resCli.ok) setClientes(await resCli.json());
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  const handleSeleccionarCliente = (cedula: string) => {
    setClienteId(cedula);
    const cli = clientes.find(c => c.cedula === cedula);
    if (cli) {
      setClienteNombre(`${cli.nombre} ${cli.apellido}`);
      setClienteTelefono(cli.telefono || "");
      setClienteDireccion(cli.direccion || "");
    }
  };

  const handleAgregarProducto = (p: Producto) => {
    const existe = items.find(it => it.producto_id === p.id);
    if (existe) {
      setItems(items.map(it => it.producto_id === p.id ? { ...it, cantidad: it.cantidad + 1, subtotal: Number(((it.cantidad + 1) * it.precio_unitario).toFixed(2)) } : it));
    } else {
      setItems([...items, {
        producto_id: p.id,
        codigo: p.codigo,
        nombre: p.nombre,
        cantidad: 1,
        precio_unitario: p.precio_venta,
        unidad_medida: p.unidad_medida || "UND",
        tarifa_aplicada: "detal",
        subtotal: p.precio_venta
      }]);
    }
    setProdSearch("");
  };

  const handleActualizarCantidad = (prodId: string, cant: number) => {
    if (cant <= 0) {
      setItems(items.filter(it => it.producto_id !== prodId));
    } else {
      setItems(items.map(it => it.producto_id === prodId ? { ...it, cantidad: cant, subtotal: Number((cant * it.precio_unitario).toFixed(2)) } : it));
    }
  };

  const handleActualizarPrecio = (prodId: string, precio: number) => {
    if (precio < 0) return;
    setItems(items.map(it => it.producto_id === prodId ? { ...it, precio_unitario: precio, subtotal: Number((it.cantidad * precio).toFixed(2)) } : it));
  };

  const calcularTotales = () => {
    let subtotal = 0;
    let baseImponible = 0;

    items.forEach(it => {
      const prod = productos.find(p => p.id === it.producto_id);
      subtotal += it.subtotal;
      if (prod && (prod.categoria === "MEDICAMENTO" || prod.categoria === "EXENTO")) {
        // Exento
      } else {
        baseImponible += it.subtotal;
      }
    });

    const iva = Number((baseImponible * 0.16).toFixed(2));
    const totalUSD = Number((Math.max(0, subtotal - descuentoUSD) + iva).toFixed(2));
    const totalBS = Number((totalUSD * tasa).toFixed(2));

    return { subtotal, iva, totalUSD, totalBS };
  };

  const handleGuardarCotizacion = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (items.length === 0) {
      setErrorMsg("Debe incluir al menos un producto en el presupuesto.");
      return;
    }

    setGuardando(true);
    try {
      const res = await apiFetch("/api/cotizaciones/guardar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente_id: clienteId,
          cliente_nombre: clienteNombre,
          cliente_telefono: clienteTelefono,
          cliente_direccion: clienteDireccion,
          dias_validez: diasValidez,
          items,
          descuento_usd: descuentoUSD,
          notas_condiciones: notasCondiciones,
          usuario_creador: usuarioActual || "cajero"
        })
      });

      const data = await res.json();
      if (res.ok && data.status === "success") {
        setCotSeleccionada(data.cotizacion);
        setTab("VER");
        await cargarDatos();
      } else {
        setErrorMsg(data.error || "No se pudo guardar la cotización.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Error de conexión al guardar presupuesto.");
    } finally {
      setGuardando(false);
    }
  };

  const handleCargarAlPOSClick = (cot: CotizacionPresupuesto) => {
    if (onCargarAlPOS) {
      onCargarAlPOS(cot);
      onClose();
    }
  };

  const prodsFiltrados = productos.filter(p => {
    if (!prodSearch) return false;
    const s = prodSearch.toLowerCase();
    return p.nombre.toLowerCase().includes(s) || p.codigo.toLowerCase().includes(s);
  }).slice(0, 5);

  const cotizacionesFiltradas = cotizaciones.filter(c => {
    if (!buscar) return true;
    const b = buscar.toLowerCase();
    return c.numero_presupuesto.toLowerCase().includes(b) || c.cliente_nombre.toLowerCase().includes(b);
  });

  const { subtotal, iva, totalUSD, totalBS } = calcularTotales();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Cabecera */}
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200/80 text-indigo-600 flex items-center justify-center shadow-sm">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                Cotizaciones & Presupuestos Formales
                <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                  1-Clic a Venta
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Genera presupuestos con vigencia y conviértelos a venta directa en el POS cuando el cliente regrese.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-200/70 p-1 rounded-2xl">
              <button
                onClick={() => setTab("LISTA")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${tab === "LISTA" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                Listado ({cotizaciones.length})
              </button>
              <button
                onClick={() => {
                  setTab("NUEVA");
                  setItems([]);
                  setDescuentoUSD(0);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${tab === "NUEVA" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                + Nueva Cotización
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
          {tab === "LISTA" ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por Nº Cotización o cliente..."
                    value={buscar}
                    onChange={(e) => setBuscar(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  onClick={() => setTab("NUEVA")}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-2xl flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-indigo-600/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Crear Presupuesto</span>
                </button>
              </div>

              {cotizacionesFiltradas.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50 text-slate-400 text-xs">
                  No hay cotizaciones registradas. Crea una cotización formal para entregar al cliente.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        <th className="py-3 px-4">Nº Presupuesto</th>
                        <th className="py-3 px-4">Emisión & Vence</th>
                        <th className="py-3 px-4">Cliente</th>
                        <th className="py-3 px-4 text-center">Items</th>
                        <th className="py-3 px-4 text-right">Total ($)</th>
                        <th className="py-3 px-4 text-center">Estado</th>
                        <th className="py-3 px-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {cotizacionesFiltradas.map((cot) => {
                        const vencida = new Date(cot.fecha_vencimiento) < new Date() && cot.estado === "PENDIENTE";
                        return (
                          <tr key={cot.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-mono font-black text-indigo-600">
                              {cot.numero_presupuesto}
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                              <div>{new Date(cot.fecha_emision).toLocaleDateString("es-VE")}</div>
                              <div className="text-[9px] text-slate-400">Vence: {new Date(cot.fecha_vencimiento).toLocaleDateString("es-VE")}</div>
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-800">
                              {cot.cliente_nombre}
                              {cot.cliente_telefono && (
                                <div className="text-[10px] text-slate-400 font-normal font-mono">{cot.cliente_telefono}</div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">
                              {cot.items.length}
                            </td>
                            <td className="py-3 px-4 text-right font-black text-slate-900 font-mono">
                              ${cot.total_usd.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {cot.estado === "CONVERTIDA_A_VENTA" ? (
                                <span className="bg-emerald-100 text-emerald-800 font-black text-[9px] px-2 py-0.5 rounded-full">
                                  CONVERTIDA EN VENTA
                                </span>
                              ) : vencida ? (
                                <span className="bg-rose-100 text-rose-800 font-black text-[9px] px-2 py-0.5 rounded-full">
                                  VENCIDA
                                </span>
                              ) : (
                                <span className="bg-amber-100 text-amber-800 font-black text-[9px] px-2 py-0.5 rounded-full">
                                  VIGENTE ({cot.dias_validez}d)
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right space-x-2">
                              <button
                                onClick={() => {
                                  setCotSeleccionada(cot);
                                  setTab("VER");
                                }}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] rounded-lg transition cursor-pointer"
                              >
                                Ver / Imprimir
                              </button>
                              {cot.estado === "PENDIENTE" && (
                                <button
                                  onClick={() => handleCargarAlPOSClick(cot)}
                                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase tracking-wider rounded-lg transition cursor-pointer shadow-sm"
                                >
                                  Cargar al POS
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : tab === "VER" && cotSeleccionada ? (
            /* Vista de Impresión / Ficha Formal de Presupuesto */
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6 font-sans">
                <div className="flex justify-between items-start border-b border-slate-100 pb-5">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Presupuesto Formal</h3>
                    <span className="font-mono text-xs font-bold text-indigo-600">{cotSeleccionada.numero_presupuesto}</span>
                  </div>
                  <div className="text-right text-xs text-slate-500 space-y-0.5">
                    <div><strong>Fecha Emisión:</strong> {new Date(cotSeleccionada.fecha_emision).toLocaleDateString("es-VE")}</div>
                    <div><strong>Válido Hasta:</strong> {new Date(cotSeleccionada.fecha_vencimiento).toLocaleDateString("es-VE")}</div>
                    <div><strong>Tasa BCV Ref:</strong> Bs. {cotSeleccionada.tasa_bcv.toFixed(2)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl text-xs">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 block">Cliente</span>
                    <p className="font-bold text-slate-800">{cotSeleccionada.cliente_nombre}</p>
                    <p className="text-slate-500 font-mono">{cotSeleccionada.cliente_id}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 block">Contacto</span>
                    <p className="text-slate-700">{cotSeleccionada.cliente_telefono || "Sin teléfono"}</p>
                    <p className="text-slate-500">{cotSeleccionada.cliente_direccion || "Sin dirección"}</p>
                  </div>
                </div>

                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-black uppercase text-slate-400">
                      <th className="py-2">Producto</th>
                      <th className="py-2 text-center">Cant</th>
                      <th className="py-2 text-right">Precio Unit ($)</th>
                      <th className="py-2 text-right">Subtotal ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cotSeleccionada.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 font-bold text-slate-800">{it.nombre}</td>
                        <td className="py-2.5 text-center font-bold text-slate-700">{it.cantidad} {it.unidad_medida}</td>
                        <td className="py-2.5 text-right font-mono text-slate-600">${it.precio_unitario.toFixed(2)}</td>
                        <td className="py-2.5 text-right font-mono font-bold text-slate-900">${it.subtotal.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="border-t border-slate-200 pt-4 flex justify-between items-start">
                  <div className="max-w-xs text-[11px] text-slate-500 italic">
                    {cotSeleccionada.notas_condiciones}
                  </div>
                  <div className="text-right space-y-1 font-mono text-xs">
                    <div>Subtotal: <span className="font-bold">${cotSeleccionada.subtotal_usd.toFixed(2)}</span></div>
                    {cotSeleccionada.iva_usd > 0 && (
                      <div>IVA (16%): <span className="font-bold">${cotSeleccionada.iva_usd.toFixed(2)}</span></div>
                    )}
                    <div className="text-base font-black text-slate-900 border-t border-slate-200 pt-1 font-sans">
                      Total: ${cotSeleccionada.total_usd.toFixed(2)} USD
                    </div>
                    <div className="text-xs text-slate-600 font-bold">
                      Bs. {cotSeleccionada.total_bs.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <button
                  onClick={() => setTab("LISTA")}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  ← Volver al Listado
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimir Presupuesto</span>
                  </button>
                  {cotSeleccionada.estado === "PENDIENTE" && (
                    <button
                      onClick={() => handleCargarAlPOSClick(cotSeleccionada)}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-600/30"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>Cargar al POS (Facturar Ahora)</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Formulario Nueva Cotización */
            <form onSubmit={handleGuardarCotizacion} className="space-y-6">
              {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-2xl text-xs flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Datos Cliente y Validez */}
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                    Cliente Registrado
                  </label>
                  <select
                    value={clienteId}
                    onChange={(e) => handleSeleccionarCliente(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                  >
                    <option value="V-99999999">Cliente Particular (Mostrador)</option>
                    {clientes.map(c => (
                      <option key={c.cedula} value={c.cedula}>{c.nombre} {c.apellido} ({c.cedula})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={clienteNombre}
                    onChange={(e) => setClienteNombre(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                    Teléfono Contacto
                  </label>
                  <input
                    type="text"
                    value={clienteTelefono}
                    onChange={(e) => setClienteTelefono(e.target.value)}
                    placeholder="0414-1234567"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                    Días de Vigencia
                  </label>
                  <select
                    value={diasValidez}
                    onChange={(e) => setDiasValidez(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                  >
                    <option value={1}>1 Día (24 Horas)</option>
                    <option value={3}>3 Días</option>
                    <option value={5}>5 Días (Recomendado)</option>
                    <option value={7}>7 Días (1 Semana)</option>
                    <option value={15}>15 Días</option>
                  </select>
                </div>
              </div>

              {/* Agregar Artículos */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black uppercase text-slate-700">Artículos a Presupuestar</h3>
                  <div className="relative w-80">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar producto para añadir..."
                      value={prodSearch}
                      onChange={(e) => setProdSearch(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {prodSearch && prodsFiltrados.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 overflow-hidden">
                        {prodsFiltrados.map(p => (
                          <div
                            key={p.id}
                            onClick={() => handleAgregarProducto(p)}
                            className="p-2.5 hover:bg-indigo-50 cursor-pointer flex justify-between items-center text-xs border-b border-slate-100 last:border-0"
                          >
                            <div>
                              <div className="font-bold text-slate-900">{p.nombre}</div>
                              <div className="text-[10px] text-slate-400 font-mono">Stock: {p.stock} | Ref: {p.codigo}</div>
                            </div>
                            <span className="font-black text-indigo-600 font-mono">${p.precio_venta.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tabla de Items */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        <th className="py-2.5 px-4">Producto</th>
                        <th className="py-2.5 px-4 text-center">Cantidad</th>
                        <th className="py-2.5 px-4 text-right">Precio Unit ($)</th>
                        <th className="py-2.5 px-4 text-right">Subtotal ($)</th>
                        <th className="py-2.5 px-4 text-center">Eliminar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400">
                            Escribe en el buscador arriba para añadir productos al presupuesto.
                          </td>
                        </tr>
                      ) : (
                        items.map((it) => (
                          <tr key={it.producto_id}>
                            <td className="py-2.5 px-4 font-bold text-slate-800">{it.nombre}</td>
                            <td className="py-2.5 px-4 text-center">
                              <input
                                type="number"
                                min="1"
                                value={it.cantidad}
                                onChange={(e) => handleActualizarCantidad(it.producto_id, parseInt(e.target.value) || 0)}
                                className="w-16 text-center bg-slate-50 border border-slate-200 rounded-lg py-1 font-bold text-slate-900 outline-none"
                              />
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <input
                                type="number"
                                step="0.01"
                                value={it.precio_unitario}
                                onChange={(e) => handleActualizarPrecio(it.producto_id, parseFloat(e.target.value) || 0)}
                                className="w-20 text-right bg-slate-50 border border-slate-200 rounded-lg py-1 px-2 font-mono font-bold text-slate-900 outline-none"
                              />
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-black text-slate-900">
                              ${it.subtotal.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => handleActualizarCantidad(it.producto_id, 0)}
                                className="text-slate-400 hover:text-rose-600 font-bold text-sm"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pie con totales y botón de guardar */}
              <div className="bg-slate-900 text-white rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block">
                    Total Presupuesto ({items.length} artículos)
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-indigo-300">${totalUSD.toFixed(2)} USD</span>
                    <span className="text-xs text-slate-400 font-mono">(Bs. {totalBS.toFixed(2)})</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setTab("LISTA")}
                    className="px-4 py-2.5 rounded-xl border border-slate-700 font-bold text-xs text-slate-300 hover:bg-slate-800 transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={items.length === 0 || guardando}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider transition cursor-pointer shadow-md disabled:opacity-40"
                  >
                    {guardando ? "Guardando..." : "Guardar & Emitir Cotización"}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
