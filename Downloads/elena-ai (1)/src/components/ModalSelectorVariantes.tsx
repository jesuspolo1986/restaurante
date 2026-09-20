/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { X, Check, Shirt, Layers, ShoppingCart, Tag, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Producto, VarianteProducto } from "../types";

interface Props {
  isOpen: boolean;
  producto: Producto | null;
  tarifaActiva: "detal" | "mayor" | "especial";
  tasa: number;
  onClose: () => void;
  onSelectVariante: (producto: Producto, variante: VarianteProducto, cantidad: number) => void;
}

export default function ModalSelectorVariantes({
  isOpen,
  producto,
  tarifaActiva,
  tasa,
  onClose,
  onSelectVariante
}: Props) {
  const [varianteSeleccionada, setVarianteSeleccionada] = useState<VarianteProducto | null>(null);
  const [cantidad, setCantidad] = useState(1);

  if (!isOpen || !producto) return null;

  const variantes = producto.variantes || [];

  // Calcular precio según tarifa activa
  let precioUnitario = producto.precio_venta;
  if (tarifaActiva === "mayor" && producto.precio_mayor) {
    precioUnitario = producto.precio_mayor;
  } else if (tarifaActiva === "especial" && producto.precio_especial) {
    precioUnitario = producto.precio_especial;
  }

  const handleConfirmar = () => {
    if (!varianteSeleccionada) {
      alert("Seleccione una talla o color");
      return;
    }
    if (cantidad > varianteSeleccionada.stock) {
      alert(`Existencia insuficiente para esta variante (Disponible: ${varianteSeleccionada.stock})`);
      return;
    }
    onSelectVariante(producto, varianteSeleccionada, cantidad);
    setVarianteSeleccionada(null);
    setCantidad(1);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 pb-4 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-purple-50/60 to-white">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-600 text-white rounded-2xl shadow-md shadow-purple-200">
                <Shirt className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[9px] font-black uppercase text-purple-700 tracking-wider">
                  Selección de Talla y Color
                </span>
                <h3 className="text-base font-black text-slate-800 leading-tight">
                  {producto.nombre}
                </h3>
                <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                  SKU Base: {producto.codigo}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body: Grid de Variantes */}
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Variantes Disponibles ({variantes.length})
                </label>
                <span className="text-[10px] font-bold text-slate-600">
                  Precio: <strong className="text-purple-600 font-black">${precioUnitario.toFixed(2)}</strong> (Bs. {(precioUnitario * tasa).toFixed(2)})
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {variantes.map((v) => {
                  const seleccionada = varianteSeleccionada?.id === v.id;
                  const agotada = v.stock <= 0;
                  return (
                    <button
                      key={v.id}
                      disabled={agotada}
                      onClick={() => {
                        setVarianteSeleccionada(v);
                        setCantidad(1);
                      }}
                      className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between min-h-[5.5rem] relative ${
                        agotada 
                          ? "bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed" 
                          : seleccionada 
                            ? "bg-purple-50 border-purple-500 ring-2 ring-purple-200 shadow-sm" 
                            : "bg-white border-slate-200/80 hover:border-purple-300 hover:bg-purple-50/20"
                      }`}
                    >
                      {seleccionada && (
                        <div className="absolute top-2 right-2 w-4 h-4 bg-purple-600 rounded-full flex items-center justify-center text-white">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}
                      <div>
                        {v.talla && (
                          <span className="text-xs font-black text-slate-800 block">
                            Talla: {v.talla}
                          </span>
                        )}
                        {v.color && (
                          <span className="text-[10px] font-bold text-slate-500 block">
                            Color: {v.color}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 pt-1 border-t border-slate-100 flex items-center justify-between">
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                          agotada ? "bg-rose-100 text-rose-700" : "bg-purple-100 text-purple-800"
                        }`}>
                          {agotada ? "Agotado" : `${v.stock} u.`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cantidad */}
            {varianteSeleccionada && (
              <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-500 block">
                    Cantidad a Facturar
                  </span>
                  <span className="text-[10px] font-bold text-purple-600">
                    Máx: {varianteSeleccionada.stock} u.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                    className="w-8 h-8 rounded-xl bg-white border border-slate-200 font-black text-slate-700 hover:bg-slate-100 flex items-center justify-center shadow-sm"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={varianteSeleccionada.stock}
                    value={cantidad}
                    onChange={(e) => setCantidad(Math.min(varianteSeleccionada.stock, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-14 text-center font-black text-xs bg-white border border-slate-200 py-1.5 rounded-xl outline-none"
                  />
                  <button
                    onClick={() => setCantidad(Math.min(varianteSeleccionada.stock, cantidad + 1))}
                    className="w-8 h-8 rounded-xl bg-white border border-slate-200 font-black text-slate-700 hover:bg-slate-100 flex items-center justify-center shadow-sm"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 pt-4 border-t border-slate-100 bg-slate-50/50 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-2xl text-xs uppercase tracking-wider transition"
            >
              Cancelar
            </button>
            <button
              disabled={!varianteSeleccionada}
              onClick={handleConfirmar}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-3.5 rounded-2xl text-xs uppercase tracking-wider shadow-md shadow-purple-200 transition flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Agregar al Carrito</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
