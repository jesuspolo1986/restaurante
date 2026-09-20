/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { FileText, Search, Trash2, Plus, RefreshCw, Barcode, Calendar, DollarSign, ArchiveRestore } from "lucide-react";
import { Producto, Proveedor } from "../types";
import { apiFetch } from "../utils/api";

export default function Compras() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [buscarProducto, setBuscarProducto] = useState("");
  const [productos, setProductos] = useState<Producto[]>([]);
  const [mostrarResultados, setMostrarResultados] = useState(false);

  // Datos de la Factura de Entrada
  const [proveedorId, setProveedorId] = useState("");
  const [numeroFactura, setNumeroFactura] = useState("");
  const [numeroControl, setNumeroControl] = useState("");
  const [fechaEmision, setFechaEmision] = useState(new Date().toISOString().split("T")[0]);
  const [tipoPago, setTipoPago] = useState<"CONTADO" | "CREDITO">("CONTADO");
  const [fechaVencimiento, setFechaVencimiento] = useState(new Date().toISOString().split("T")[0]);
  const [destinoIngreso, setDestinoIngreso] = useState<"ALMACEN" | "TIENDA">("ALMACEN");

  // Carrito de Entrada de Mercancía
  const [carritoCompra, setCarritoCompra] = useState<{
    producto_id: string;
    codigo: string;
    nombre: string;
    cantidad: number;
    costo_unitario: number;
  }[]>([]);

  useEffect(() => {
    cargarDatos();
  }, []);

  // Calcular la fecha de vencimiento en base a la condición y los días de crédito del proveedor
  useEffect(() => {
    if (!fechaEmision) return;
    const date = new Date(fechaEmision + "T00:00:00");
    const prov = proveedores.find(p => p.id === proveedorId);
    if (tipoPago === "CREDITO" && prov && prov.dias_credito > 0) {
      date.setDate(date.getDate() + prov.dias_credito);
    }
    setFechaVencimiento(date.toISOString().split("T")[0]);
  }, [fechaEmision, proveedorId, tipoPago, proveedores]);

  const cargarDatos = async () => {
    try {
      const [resProv, resProd] = await Promise.all([
        apiFetch("/api/proveedores").then(r => r.json()),
        apiFetch("/api/productos").then(r => r.json())
      ]);
      setProveedores(resProv);
      setProductos(resProd);
    } catch (err) {
      console.error(err);
    }
  };

  const buscarProductosLista = async (q: string) => {
    setBuscarProducto(q);
    if (q.trim().length < 2) {
      setMostrarResultados(false);
      return;
    }
    setMostrarResultados(true);
  };

  const agregarAlCarrito = (p: Producto) => {
    const existe = carritoCompra.find(item => item.producto_id === p.id);
    if (existe) return;

    setCarritoCompra(prev => [...prev, {
      producto_id: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      cantidad: 1,
      costo_unitario: p.precio_compra
    }]);

    setBuscarProducto("");
    setMostrarResultados(false);
  };

  const cambiarCantidad = (idx: number, valor: number) => {
    setCarritoCompra(prev => {
      const copia = [...prev];
      copia[idx].cantidad = Math.max(1, valor);
      return copia;
    });
  };

  const cambiarCosto = (idx: number, valor: number) => {
    setCarritoCompra(prev => {
      const copia = [...prev];
      copia[idx].costo_unitario = Math.max(0, valor);
      return copia;
    });
  };

  const removerDelCarrito = (idx: number) => {
    setCarritoCompra(prev => prev.filter((_, i) => i !== idx));
  };

  // --- CÁLCULOS MATEMÁTICOS ---
  const subtotal = carritoCompra.reduce((sum, item) => sum + (item.cantidad * item.costo_unitario), 0);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;

  const procesarEntrada = async () => {
    if (!proveedorId) return alert("Seleccione un proveedor");
    if (!numeroFactura) return alert("Ingrese el número de la factura física");
    if (carritoCompra.length === 0) return alert("El detalle de compra está vacío");

    const payload = {
      proveedor_id: proveedorId,
      numero_factura: numeroFactura,
      numero_control: numeroControl || undefined,
      fecha_emision: fechaEmision,
      fecha_vencimiento: fechaVencimiento,
      tipo_pago: tipoPago,
      destino_ingreso: destinoIngreso,
      items: carritoCompra,
      subtotal,
      iva,
      total
    };

    try {
      const res = await apiFetch("/api/compras/procesar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert("¡Entrada de mercancía procesada con éxito! Inventario actualizado.");
        setCarritoCompra([]);
        setNumeroFactura("");
        setNumeroControl("");
        cargarDatos();
      }
    } catch (err) {
      console.error(err);
      alert("Error procesando la transacción de compra");
    }
  };

  const productosFiltrados = productos.filter(p => 
    p.nombre.toLowerCase().includes(buscarProducto.toLowerCase()) || 
    p.codigo.includes(buscarProducto)
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Panel Izquierdo: Configuración Factura */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white border border-slate-100 p-6 rounded-[2.5rem] shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-2 border-b border-slate-50 pb-3">
            <FileText className="w-5 h-5 text-indigo-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">Factura de Compra</h2>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Proveedor / Laboratorio</label>
            <select
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-3 text-xs font-semibold mt-1 outline-none"
              value={proveedorId}
              onChange={(e) => setProveedorId(e.target.value)}
            >
              <option value="">-- Seleccione Proveedor --</option>
              {proveedores.map(p => (
                <option key={p.id} value={p.id}>{p.razon_social} ({p.rif})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 ml-1">N° Factura</label>
              <input
                type="text"
                placeholder="Ej: 002341"
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-xs font-semibold mt-1 outline-none"
                value={numeroFactura}
                onChange={(e) => setNumeroFactura(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 ml-1">N° Control</label>
              <input
                type="text"
                placeholder="Ej: 00-141"
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-xs font-semibold mt-1 outline-none"
                value={numeroControl}
                onChange={(e) => setNumeroControl(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Fecha Emisión</label>
            <input
              type="date"
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-xs font-semibold mt-1 outline-none"
              value={fechaEmision}
              onChange={(e) => setFechaEmision(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Condición</label>
              <select
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-3 text-xs font-semibold mt-1 outline-none"
                value={tipoPago}
                onChange={(e) => setTipoPago(e.target.value as any)}
              >
                <option value="CONTADO">Contado</option>
                <option value="CREDITO">Crédito</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Vencimiento</label>
              <input
                type="date"
                readOnly
                className="w-full bg-slate-100 text-slate-400 border border-slate-100 rounded-2xl py-3 px-4 text-xs font-semibold mt-1 outline-none cursor-not-allowed"
                value={fechaVencimiento}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Destino de la Mercancía</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                onClick={() => setDestinoIngreso("ALMACEN")}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  destinoIngreso === "ALMACEN"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100"
                }`}
              >
                📦 Almacén / Depósito
              </button>
              <button
                type="button"
                onClick={() => setDestinoIngreso("TIENDA")}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  destinoIngreso === "TIENDA"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100"
                }`}
              >
                🏪 Piso de Venta
              </button>
            </div>
          </div>
        </div>

        {/* Pizarra de Totales de Compra */}
        <div className="bg-slate-900 text-white p-6 rounded-[2.5rem] shadow-md space-y-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 leading-none">Pizarra de Gastos</p>
          <div className="space-y-2 text-xs font-medium text-slate-400">
            <div className="flex justify-between">
              <span>Subtotal Costo:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>IVA Soportado (16%):</span>
              <span>${iva.toFixed(2)}</span>
            </div>
            <hr className="border-slate-800 my-2" />
            <div className="flex justify-between items-end">
              <span className="font-bold text-sm text-indigo-400">Total Factura:</span>
              <span className="text-3xl font-black text-white">${total.toFixed(2)}</span>
            </div>
          </div>
          <button
            onClick={procesarEntrada}
            disabled={carritoCompra.length === 0}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-wider transition shadow-md shadow-indigo-950 mt-2"
          >
            Procesar Entrada
          </button>
        </div>
      </div>

      {/* Panel Derecho: Carrito de Entrada de Mercancía */}
      <div className="lg:col-span-8 space-y-4">
        {/* Buscador de Insumos */}
        <div className="bg-white border border-slate-100 p-4 rounded-3xl flex items-center gap-4 relative shadow-sm">
          <Search className="w-5 h-5 text-slate-400 ml-2" />
          <input
            type="text"
            className="w-full bg-transparent border-none p-1 font-semibold text-xs text-slate-700 outline-none"
            placeholder="Escriba nombre o código de barra para ingresar al lote..."
            value={buscarProducto}
            onChange={(e) => buscarProductosLista(e.target.value)}
          />

          {mostrarResultados && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-slate-50 pr-1 scrollbar-thin">
              {productosFiltrados.length === 0 ? (
                <p className="p-4 text-xs text-slate-400 text-center font-semibold">No coincide ningún producto.</p>
              ) : (
                productosFiltrados.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => agregarAlCarrito(p)}
                    className="p-3.5 hover:bg-slate-50 cursor-pointer flex justify-between items-center transition"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-800">{p.nombre}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{p.codigo}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-black text-slate-400 uppercase block">Existencia</span>
                      <span className="text-xs font-bold text-slate-600">{p.stock} u.</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Tabla Detalle */}
        <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden min-h-[350px] flex flex-col justify-between">
          <div className="overflow-x-auto flex-grow">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="p-4 pl-6">Insumo / Medicamento</th>
                  <th className="p-4 text-center">Cantidad Recibida</th>
                  <th className="p-4 text-right">Costo Unitario ($)</th>
                  <th className="p-4 text-right">Subtotal</th>
                  <th className="p-4 text-center pr-6"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {carritoCompra.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-16 text-center text-slate-400">
                      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <ArchiveRestore className="w-6 h-6 text-slate-300" />
                      </div>
                      <p className="text-xs font-bold text-slate-700">Ningún insumo cargado.</p>
                      <p className="text-[10px] mt-0.5">Use la barra superior para buscar e ingresar mercancía al lote.</p>
                    </td>
                  </tr>
                ) : (
                  carritoCompra.map((item, idx) => (
                    <tr key={item.producto_id} className="hover:bg-slate-50/30 transition">
                      <td className="p-4 pl-6">
                        <div className="font-bold text-slate-800">{item.nombre}</div>
                        <span className="text-[9px] text-slate-400 font-mono block mt-0.5">{item.codigo}</span>
                      </td>
                      <td className="p-4 text-center">
                        <input
                          type="number"
                          className="w-20 p-2 text-center bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:bg-white"
                          value={item.cantidad}
                          onChange={(e) => cambiarCantidad(idx, parseInt(e.target.value) || 1)}
                        />
                      </td>
                      <td className="p-4 text-right">
                        <input
                          type="number"
                          step="0.0001"
                          className="w-28 p-2 text-right bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:bg-white"
                          value={item.costo_unitario}
                          onChange={(e) => cambiarCosto(idx, parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td className="p-4 text-right font-black text-slate-800 text-sm">
                        ${(item.cantidad * item.costo_unitario).toFixed(2)}
                      </td>
                      <td className="p-4 pr-6 text-center">
                        <button
                          onClick={() => removerDelCarrito(idx)}
                          className="text-slate-300 hover:text-rose-500 p-1.5 hover:bg-rose-50 rounded-xl transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
