/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Printer, 
  Settings, 
  X, 
  Check, 
  FileText, 
  Sparkles, 
  CreditCard, 
  ChevronRight, 
  RefreshCw, 
  Eye, 
  Percent 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Venta, PagoMetodo } from "../types";

interface ThermalTicketModalProps {
  venta: Venta | null;
  isOpen: boolean;
  onClose: () => void;
  tituloAdicional?: string;
}

export default function ThermalTicketModal({ venta, isOpen, onClose, tituloAdicional }: ThermalTicketModalProps) {
  // Configuración persistida de la impresora en localStorage
  const [anchoPapel, setAnchoPapel] = useState<"58" | "80">(() => {
    return (localStorage.getItem("thermal_papel_ancho") as "58" | "80") || "58";
  });
  const [tituloCabecera, setTituloCabecera] = useState(() => {
    return localStorage.getItem("thermal_cabecera_titulo") || "ELENA FARMA C.A.";
  });
  const [rifCabecera, setRifCabecera] = useState(() => {
    return localStorage.getItem("thermal_cabecera_rif") || "J-50148729-3";
  });
  const [telefonoCabecera, setTelefonoCabecera] = useState(() => {
    return localStorage.getItem("thermal_cabecera_telefono") || "+58 (212) 993-8412";
  });
  const [direccionCabecera, setDireccionCabecera] = useState(() => {
    return localStorage.getItem("thermal_cabecera_direccion") || "Av. Principal S. Grande, Edf. Farmacia, Caracas";
  });
  const [mensajePie, setMensajePie] = useState(() => {
    return localStorage.getItem("thermal_pie_mensaje") || "¡Gracias por su compra!\nConserve este ticket como garantía.";
  });
  const [autoImprimir, setAutoImprimir] = useState<boolean>(() => {
    return localStorage.getItem("thermal_auto_imprimir") !== "false";
  });
  const [mostrarLogotipo, setMostrarLogotipo] = useState<boolean>(() => {
    return localStorage.getItem("thermal_mostrar_logo") !== "false";
  });

  const [mostrarConfig, setMostrarConfig] = useState(false);

  // Guardar configuraciones en localStorage
  useEffect(() => {
    localStorage.setItem("thermal_papel_ancho", anchoPapel);
    localStorage.setItem("thermal_cabecera_titulo", tituloCabecera);
    localStorage.setItem("thermal_cabecera_rif", rifCabecera);
    localStorage.setItem("thermal_cabecera_telefono", telefonoCabecera);
    localStorage.setItem("thermal_cabecera_direccion", direccionCabecera);
    localStorage.setItem("thermal_pie_mensaje", mensajePie);
    localStorage.setItem("thermal_auto_imprimir", String(autoImprimir));
    localStorage.setItem("thermal_mostrar_logo", String(mostrarLogotipo));
  }, [anchoPapel, tituloCabecera, rifCabecera, telefonoCabecera, direccionCabecera, mensajePie, autoImprimir, mostrarLogotipo]);

  // Gatillo automático de impresión
  useEffect(() => {
    if (isOpen && venta && autoImprimir) {
      const timer = setTimeout(() => {
        ejecutarImpresion();
      }, 650);
      return () => clearTimeout(timer);
    }
  }, [isOpen, venta]);

  // Escuchar teclas para cerrar rápido y continuar vendiendo
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
      if (e.key === "Escape" || (e.key === "Enter" && !isInput)) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !venta) return null;

  const ejecutarImpresion = () => {
    window.print();
  };

  // Imprimir un ticket de prueba
  const imprimirTicketPrueba = () => {
    // Al hacer click, guardamos momentáneamente para llamar a print
    window.print();
  };

  // Formateador de fechas
  const formatearFecha = (fechaStr: string) => {
    const f = new Date(fechaStr);
    return f.toLocaleDateString("es-VE") + " " + f.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" });
  };

  // Calcular la cantidad de caracteres por línea según ancho del papel (58mm aprox. 32 char, 80mm aprox. 48 char)
  const charLimit = anchoPapel === "58" ? 32 : 42;
  const separatorLine = "-".repeat(charLimit);

  // Función para rellenar texto con espacios
  const centrarTexto = (texto: string) => {
    const lineas = texto.split("\n");
    return lineas.map(linea => {
      if (linea.length >= charLimit) return linea.substring(0, charLimit);
      const espaciosLeft = Math.floor((charLimit - linea.length) / 2);
      return " ".repeat(espaciosLeft) + linea;
    }).join("\n");
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Estilos CSS dinámicos e inyectados para impresión física impecable */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Ocultar interfaz web */
          body * {
            visibility: hidden !important;
          }
          /* Mostrar únicamente el área de impresión térmica */
          #thermal-print-area, #thermal-print-area * {
            visibility: visible !important;
          }
          #thermal-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: ${anchoPapel === "58" ? "58mm" : "80mm"} !important;
            max-width: ${anchoPapel === "58" ? "58mm" : "80mm"} !important;
            margin: 0 !important;
            padding: 4mm !important;
            background: #fff !important;
            color: #000 !important;
            font-family: 'Courier New', Courier, monospace !important;
            font-size: 11px !important;
            line-height: 1.3 !important;
          }
          @page {
            size: ${anchoPapel === "58" ? "58mm" : "80mm"} auto;
            margin: 0 !important;
          }
        }
      `}} />

      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-slate-100 dark:bg-slate-900 rounded-[2.5rem] w-full max-w-4xl h-[85vh] flex flex-col md:flex-row overflow-hidden shadow-2xl border border-slate-200"
      >
        
        {/* PANEL IZQUIERDO: DETALLE DE CONFIGURACIÓN */}
        <div className="w-full md:w-[45%] bg-white p-6 border-b md:border-b-0 md:border-r border-slate-100 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-indigo-600 animate-pulse" />
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">
                  {tituloAdicional || "Ticketera Térmica"}
                </h3>
              </div>
              <button 
                onClick={() => setMostrarConfig(!mostrarConfig)}
                className="p-2 bg-slate-50 hover:bg-indigo-50 rounded-xl transition text-slate-500 hover:text-indigo-600 flex items-center gap-1 text-[10px] font-bold"
              >
                <Settings className="w-4 h-4" />
                {mostrarConfig ? "Ocultar Ajustes" : "Ajustes"}
              </button>
            </div>

            {/* Alerta de Éxito de Cobro */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex gap-3 items-start">
              <div className="bg-emerald-600 text-white rounded-xl p-1.5 shrink-0">
                <Check className="w-4 h-4" />
              </div>
              <div className="text-xs text-emerald-800">
                <p className="font-extrabold uppercase text-[10px] tracking-wider text-emerald-950">Venta Procesada Exitosamente</p>
                <p className="mt-1 font-medium">El recibo ha sido generado en el sistema. Puede imprimir el ticket térmico ahora o exportar.</p>
              </div>
            </div>

            {/* SECCIÓN CONFIGURACIÓN */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Ajustes de Impresora</h4>
                <span className="bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase px-2 py-0.5 rounded">Local</span>
              </div>

              {/* Ancho de papel */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Ancho del Papel de Rollo</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setAnchoPapel("58")}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      anchoPapel === "58" 
                        ? "bg-slate-900 border-slate-900 text-white" 
                        : "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    58mm (Estándar)
                  </button>
                  <button
                    onClick={() => setAnchoPapel("80")}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      anchoPapel === "80" 
                        ? "bg-slate-900 border-slate-900 text-white" 
                        : "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    80mm (Ancho)
                  </button>
                </div>
              </div>

              {/* Toggles Rápidos */}
              <div className="space-y-2.5 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={autoImprimir}
                    onChange={(e) => setAutoImprimir(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Imprimir automáticamente al cobrar</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={mostrarLogotipo}
                    onChange={(e) => setMostrarLogotipo(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Mostrar Logo Cruz de Farmacia (+)</span>
                </label>
              </div>

              {/* Campos personalizables de Cabecera si mostrarConfig es activo */}
              <AnimatePresence>
                {mostrarConfig && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 pt-3 border-t border-slate-50 overflow-hidden"
                  >
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase">Nombre Establecimiento</label>
                      <input
                        type="text"
                        value={tituloCabecera}
                        onChange={(e) => setTituloCabecera(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-bold outline-none mt-1"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase">RIF Fiscal</label>
                        <input
                          type="text"
                          value={rifCabecera}
                          onChange={(e) => setRifCabecera(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-100 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-bold outline-none mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase">Teléfono</label>
                        <input
                          type="text"
                          value={telefonoCabecera}
                          onChange={(e) => setTelefonoCabecera(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-100 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-bold outline-none mt-1"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase">Dirección Comercial</label>
                      <input
                        type="text"
                        value={direccionCabecera}
                        onChange={(e) => setDireccionCabecera(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-bold outline-none mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase">Mensaje de Pie (Ticket)</label>
                      <textarea
                        rows={2}
                        value={mensajePie}
                        onChange={(e) => setMensajePie(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-bold outline-none mt-1 resize-none"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Botones de acción del panel */}
          <div className="pt-6 border-t border-slate-50 space-y-2 shrink-0">
            <button
              onClick={ejecutarImpresion}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-[1.8rem] transition flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-100"
            >
              <Printer className="w-4 h-4" />
              Imprimir Ticket Físico
            </button>
            <button
              onClick={onClose}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-3.5 rounded-[1.8rem] transition flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider"
            >
              Cerrar y Continuar
            </button>
          </div>
        </div>

        {/* PANEL DERECHO: VISTA PREVIA SIMULADA DE PAPEL TÉRMICO */}
        <div className="flex-1 bg-slate-800 p-6 flex flex-col items-center justify-center relative overflow-y-auto scrollbar-thin">
          <div className="absolute top-4 left-4 text-white/55 text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1.5">
            <Eye className="w-4 h-4" /> Vista Previa Real en Pantalla
          </div>
          
          {/* Tarjeta de Ticketera Térmica Física */}
          <div 
            className="bg-white text-slate-900 p-6 shadow-2xl relative select-none font-mono"
            style={{ 
              width: anchoPapel === "58" ? "320px" : "420px",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
              borderTop: "8px solid #4f46e5"
            }}
          >
            {/* Efecto de borde dentado de papel térmico abajo */}
            <div className="absolute -bottom-3 left-0 right-0 h-3 bg-white" style={{
              backgroundImage: "radial-gradient(circle, transparent, transparent 50%, #1e293b 50%, #1e293b 100%)",
              backgroundSize: "8px 16px",
              backgroundPosition: "bottom center"
            }} />

            {/* ÁREA COPIADA EXACTAMENTE PARA LA IMPRESIÓN DEL NAVEGADOR */}
            <div id="thermal-print-area" className="text-black leading-tight text-xs">
              
              {/* Cruz farmacia opcional */}
              {mostrarLogotipo && (
                <div className="text-center mb-1 text-base font-black">
                  [ + ]
                </div>
              )}

              {/* CABECERA */}
              <div className="text-center font-bold">
                <div className="uppercase font-black tracking-wide text-sm">{tituloCabecera}</div>
                <div className="text-[10px] mt-0.5">RIF: {rifCabecera}</div>
                <div className="text-[10px]">{telefonoCabecera}</div>
                <div className="text-[10px] max-w-xs mx-auto truncate text-slate-600">{direccionCabecera}</div>
              </div>

              {/* DIVISOR */}
              <div className="text-center text-slate-400 my-1 font-bold">{separatorLine}</div>

              {/* TIPO DE DOCUMENTO */}
              <div className="text-center font-black uppercase text-xs tracking-wider">
                {venta.sin_factura ? "NOTA DE ENTREGA" : "FACTURA FISCAL"}
              </div>
              <div className="text-center font-bold mt-0.5 text-[10px]">
                Nº: {venta.factura_numero}
              </div>
              <div className="text-center text-[10px] text-slate-500">
                Fecha: {formatearFecha(venta.fecha)}
              </div>

              <div className="text-center text-slate-400 my-1 font-bold">{separatorLine}</div>

              {/* CLIENTE */}
              <div className="space-y-0.5 text-[10px]">
                <div><span className="font-bold">CLIENTE:</span> {venta.cliente_nombre || "CONSUMIDOR FINAL"}</div>
                <div><span className="font-bold">C.I./RIF:</span> {venta.cliente_id || "V-99999999-9"}</div>
                {venta.tasa && (
                  <div><span className="font-bold">TASA BCV:</span> Bs. {venta.tasa.toFixed(2)}</div>
                )}
              </div>

              <div className="text-center text-slate-400 my-1 font-bold">{separatorLine}</div>

              {/* COLUMNAS HEADER */}
              <div className="grid grid-cols-12 font-bold text-[10px] text-slate-500 pb-1">
                <div className="col-span-2 text-center">CANT</div>
                <div className="col-span-6">DESCRIPCION</div>
                <div className="col-span-4 text-right">TOTAL ($)</div>
              </div>

              {/* ITEMS */}
              <div className="space-y-1 text-[10px]">
                {venta.items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 items-start border-b border-slate-50 pb-0.5">
                    <div className="col-span-2 text-center font-bold">
                      {it.cantidad % 1 !== 0 ? it.cantidad.toFixed(3) : it.cantidad}
                    </div>
                    <div className="col-span-6 font-semibold uppercase">
                      <div>{it.nombre}</div>
                      {it.atributos && Object.keys(it.atributos).length > 0 && (
                        <div className="text-[8px] text-slate-500 font-medium normal-case">
                          {Object.entries(it.atributos).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                        </div>
                      )}
                    </div>
                    <div className="col-span-4 text-right font-bold">
                      ${(it.precio_unitario * it.cantidad).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center text-slate-400 my-1 font-bold">{separatorLine}</div>

              {/* DESGLOSE DE TOTALES */}
              <div className="space-y-0.5 text-[10px] pl-4">
                {venta.monto_exento > 0 && (
                  <div className="flex justify-between">
                    <span>BI. EXENTO ($):</span>
                    <span className="font-bold">${venta.monto_exento.toFixed(2)}</span>
                  </div>
                )}
                {venta.base_imponible > 0 && (
                  <div className="flex justify-between">
                    <span>BI. GRAVADO 16% ($):</span>
                    <span className="font-bold">${venta.base_imponible.toFixed(2)}</span>
                  </div>
                )}
                {venta.monto_iva > 0 && (
                  <div className="flex justify-between">
                    <span>I.V.A. 16% ($):</span>
                    <span className="font-bold">${venta.monto_iva.toFixed(2)}</span>
                  </div>
                )}
                {venta.monto_igtf > 0 && (
                  <div className="flex justify-between text-amber-700">
                    <span>I.G.T.F. 3% ($):</span>
                    <span className="font-bold">+${venta.monto_igtf.toFixed(2)}</span>
                  </div>
                )}
                {venta.descuento_usd && venta.descuento_usd > 0 ? (
                  <div className="flex justify-between text-emerald-700">
                    <span>REBAJA EFECTIVO ($):</span>
                    <span className="font-black">-${venta.descuento_usd.toFixed(2)}</span>
                  </div>
                ) : null}

                <div className="border-t border-dashed border-slate-300 my-1" />

                {/* Gran Total */}
                <div className="flex justify-between text-xs font-black">
                  <span>TOTAL USD ($):</span>
                  <span>${venta.total_usd.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs font-black mt-0.5">
                  <span>TOTAL REF BS (Bs):</span>
                  <span>Bs. {venta.total_bs.toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center text-slate-400 my-1 font-bold">{separatorLine}</div>

              {/* MÉTODOS DE PAGO */}
              <div className="text-[10px]">
                <div className="font-bold mb-0.5">DETALLE DE PAGOS:</div>
                <div className="space-y-0.5 pl-2 text-slate-600">
                  {venta.pagos.map((p, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span className="uppercase">{p.metodo.replace("_", " ")}:</span>
                      <span className="font-bold">
                        {p.moneda === "BS" 
                          ? `Bs. ${p.monto_original.toFixed(2)}` 
                          : `$${p.monto_original.toFixed(2)}`
                        }
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-center text-slate-400 my-1.5 font-bold">{separatorLine}</div>

              {/* MENSAJE PIE */}
              <div className="text-center text-[9px] whitespace-pre-line text-slate-600 italic">
                {mensajePie}
              </div>

              {/* CÓDIGO DE CONTROL FISCAL Y CÓDIGO DE BARRA SIMULADO */}
              <div className="mt-4 flex flex-col items-center justify-center space-y-1">
                <div className="w-40 h-8 bg-slate-900 flex items-center justify-between px-2 text-white overflow-hidden rounded">
                  <span className="text-[6px] font-mono tracking-widest leading-none">||||| | ||||| || ||| || |||</span>
                  <span className="text-[6px] font-mono tracking-widest leading-none">||||| ||| || | |||| |||</span>
                </div>
                <span className="text-[7px] text-slate-500 font-bold uppercase">SISTEMA HOMOLOGADO ELENA FARMA</span>
              </div>

            </div>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
