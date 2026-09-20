/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Printer, X, FileText, Check, ArrowRight, Layers } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { TrasladoInterno } from "../types";

interface ThermalTransferInternalModalProps {
  traslado: TrasladoInterno | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ThermalTransferInternalModal({
  traslado,
  isOpen,
  onClose
}: ThermalTransferInternalModalProps) {
  const [anchoPapel, setAnchoPapel] = useState<"58" | "80">("80");

  if (!isOpen || !traslado) return null;

  const handlePrint = () => {
    window.print();
  };

  const esAlmacenATienda = traslado.tipo === "ALMACEN_A_TIENDA";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header del Modal */}
          <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-600/30 text-indigo-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">
                  Guía de Traslado Interno
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  {traslado.numero_guia}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="bg-slate-800 p-1 rounded-xl flex items-center text-xs">
                <button
                  type="button"
                  onClick={() => setAnchoPapel("58")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    anchoPapel === "58"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  58mm
                </button>
                <button
                  type="button"
                  onClick={() => setAnchoPapel("80")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    anchoPapel === "80"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  80mm
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Vista Previa del Ticket Térmico / Documento */}
          <div className="p-6 overflow-y-auto bg-slate-100/80 flex-1 flex justify-center">
            <div
              id="ticket-impresion-interno"
              style={{ width: anchoPapel === "58" ? "58mm" : "80mm" }}
              className="bg-white p-4 shadow-md rounded-lg font-mono text-[11px] leading-tight text-slate-900 border border-slate-200"
            >
              {/* Encabezado */}
              <div className="text-center pb-3 border-b border-dashed border-slate-400 space-y-1">
                <h4 className="font-black text-xs uppercase tracking-wider">
                  ELENA PRO ERP
                </h4>
                <p className="text-[10px] text-slate-600 font-sans font-bold">
                  CONTROL LOGÍSTICO Y TRASLADOS
                </p>
                <p className="text-[10px] font-bold text-indigo-700 bg-indigo-50 py-0.5 px-2 rounded-md inline-block mt-1 font-sans">
                  {esAlmacenATienda
                    ? "📦 ALMACÉN ➡️ TIENDA (PISO DE VENTA)"
                    : "🏪 TIENDA ➡️ ALMACÉN (DEVOLUCIÓN)"}
                </p>
              </div>

              {/* Metadatos */}
              <div className="py-2.5 border-b border-dashed border-slate-400 text-[10px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nº Guía:</span>
                  <span className="font-bold">{traslado.numero_guia}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Fecha / Hora:</span>
                  <span>{new Date(traslado.fecha).toLocaleString("es-VE")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Responsable:</span>
                  <span className="font-bold uppercase">{traslado.usuario}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Motivo:</span>
                  <span className="font-semibold">{traslado.motivo}</span>
                </div>
              </div>

              {/* Tabla de Artículos */}
              <div className="py-2.5 border-b border-dashed border-slate-400">
                <div className="flex justify-between font-bold text-[10px] pb-1 border-b border-slate-300">
                  <span className="w-7/12">DESCRIPCIÓN</span>
                  <span className="w-2/12 text-center">UND</span>
                  <span className="w-3/12 text-right">CANT</span>
                </div>

                <div className="divide-y divide-slate-200 mt-1">
                  {traslado.items.map((item, idx) => (
                    <div key={idx} className="py-1.5 space-y-0.5">
                      <div className="flex justify-between font-bold text-slate-800">
                        <span className="w-7/12 truncate" title={item.nombre}>
                          {item.nombre}
                        </span>
                        <span className="w-2/12 text-center text-slate-500 text-[9px]">
                          {item.unidad_medida || "UND"}
                        </span>
                        <span className="w-3/12 text-right font-black text-indigo-700">
                          {item.cantidad}
                        </span>
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-500">
                        <span>Cód: {item.codigo}</span>
                        {item.lote && <span>Lote: {item.lote}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totales */}
              <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-600">Total Renglones:</span>
                  <span className="font-bold">{traslado.total_items}</span>
                </div>
                <div className="flex justify-between font-black text-xs">
                  <span>Total Unidades:</span>
                  <span className="text-indigo-700">{traslado.total_unidades}</span>
                </div>
              </div>

              {/* Observaciones */}
              {traslado.observaciones && (
                <div className="py-2 border-b border-dashed border-slate-400 text-[9px] text-slate-600">
                  <span className="font-bold">Observaciones:</span> {traslado.observaciones}
                </div>
              )}

              {/* Espacio para Firmas */}
              <div className="pt-8 pb-3 grid grid-cols-2 gap-4 text-center text-[9px] font-sans text-slate-600">
                <div>
                  <div className="border-t border-slate-400 pt-1 font-bold">
                    Despachado por (Almacén)
                  </div>
                </div>
                <div>
                  <div className="border-t border-slate-400 pt-1 font-bold">
                    Recibido en Tienda
                  </div>
                </div>
              </div>

              <div className="text-center pt-2 text-[9px] text-slate-400 font-sans">
                Sistema Elena Pro - Verificación de Stock
              </div>
            </div>
          </div>

          {/* Footer del Modal */}
          <div className="px-6 py-4 bg-white border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cerrar
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Imprimir Guía de Traslado
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
