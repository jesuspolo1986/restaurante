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
  User, 
  Phone, 
  Calendar, 
  Tag, 
  Coins, 
  Hash, 
  Download,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Pedido } from "../types";
import { jsPDF } from "jspdf";

interface ThermalPedidoModalProps {
  pedido: Pedido | null;
  isOpen: boolean;
  onClose: () => void;
  tasaBcv?: number;
}

export default function ThermalPedidoModal({ pedido, isOpen, onClose, tasaBcv = 36.50 }: ThermalPedidoModalProps) {
  // Configuración persistida de la impresora en localStorage
  const [anchoPapel, setAnchoPapel] = useState<"58" | "80">(() => {
    return (localStorage.getItem("thermal_papel_ancho") as "58" | "80") || "58";
  });
  const [tituloCabecera, setTituloCabecera] = useState(() => {
    return localStorage.getItem("thermal_cabecera_titulo") || "CONFECCIONES & TRABAJOS PRO";
  });
  const [rifCabecera, setRifCabecera] = useState(() => {
    return localStorage.getItem("thermal_cabecera_rif") || "J-50148729-3";
  });
  const [telefonoCabecera, setTelefonoCabecera] = useState(() => {
    return localStorage.getItem("thermal_cabecera_telefono") || "+58 (212) 993-8412";
  });
  const [direccionCabecera, setDireccionCabecera] = useState(() => {
    return localStorage.getItem("thermal_cabecera_direccion") || "Av. Principal, Edificio Comercial, Caracas";
  });
  const [mensajePie, setMensajePie] = useState(() => {
    return localStorage.getItem("thermal_pie_mensaje") || "¡Gracias por su preferencia!\nConserve este ticket para retirar su trabajo.";
  });
  const [autoImprimir, setAutoImprimir] = useState<boolean>(() => {
    return localStorage.getItem("thermal_auto_imprimir") === "true";
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

  // Gatillo automático de impresión si está habilitado
  useEffect(() => {
    if (isOpen && pedido && autoImprimir) {
      const timer = setTimeout(() => {
        ejecutarImpresion();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isOpen, pedido, autoImprimir]);

  // Escuchar teclas para cerrar rápido
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

  if (!isOpen || !pedido) return null;

  const ejecutarImpresion = () => {
    window.print();
  };

  const descargarTicketPDF = () => {
    const is58 = anchoPapel === "58";
    const pageWidth = is58 ? 58 : 80;
    const centerX = pageWidth / 2;
    
    const doc = new jsPDF({
      unit: "mm",
      format: [pageWidth, 180]
    });

    let currentY = 8;

    // Encabezado Empresa Personalizado
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(is58 ? 9 : 11);
    doc.text(tituloCabecera || "COMPROBANTE DE PEDIDO", centerX, currentY, { align: "center" });
    currentY += 4;

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(is58 ? 6 : 7);
    if (rifCabecera) {
      doc.text(`RIF: ${rifCabecera}`, centerX, currentY, { align: "center" });
      currentY += 3.5;
    }
    if (telefonoCabecera) {
      doc.text(`Telf: ${telefonoCabecera}`, centerX, currentY, { align: "center" });
      currentY += 3.5;
    }
    if (direccionCabecera) {
      const dirLines = doc.splitTextToSize(direccionCabecera, pageWidth - 10);
      dirLines.forEach((l: string) => {
        doc.text(l, centerX, currentY, { align: "center" });
        currentY += 3.5;
      });
    }

    doc.text("-".repeat(is58 ? 32 : 44), centerX, currentY, { align: "center" });
    currentY += 4;

    // Código de Retiro
    const codigo = pedido.codigo_pedido || pedido.id.slice(-6).toUpperCase();
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(is58 ? 8.5 : 10);
    doc.text(`CÓDIGO DE RETIRO: ${codigo}`, centerX, currentY, { align: "center" });
    currentY += 4.5;

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(is58 ? 6.5 : 7.5);
    doc.text(`Fecha Emisión: ${pedido.fecha_pedido}`, 5, currentY);
    currentY += 3.5;
    if (pedido.fecha_entrega_estimada) {
      doc.text(`Entrega Estimada: ${pedido.fecha_entrega_estimada}`, 5, currentY);
      currentY += 3.5;
    }
    doc.text(`Cliente: ${pedido.nombres} ${pedido.apellidos || ""}`, 5, currentY);
    currentY += 3.5;
    doc.text(`Cédula/RIF: ${pedido.cedula}`, 5, currentY);
    currentY += 3.5;
    doc.text(`Teléfono: ${pedido.telefono}`, 5, currentY);
    currentY += 3.5;
    if (pedido.departamento_servicio) {
      doc.text(`Área/Depto: ${pedido.departamento_servicio}`, 5, currentY);
      currentY += 3.5;
    }
    if (pedido.asignado_a) {
      doc.text(`Asignado a: ${pedido.asignado_a}`, 5, currentY);
      currentY += 3.5;
    }

    doc.text("-".repeat(is58 ? 32 : 44), centerX, currentY, { align: "center" });
    currentY += 4;

    // Descripción del Trabajo
    doc.setFont("Helvetica", "bold");
    doc.text("DESCRIPCIÓN DEL TRABAJO:", 5, currentY);
    currentY += 3.5;
    doc.setFont("Helvetica", "normal");
    const descLines = doc.splitTextToSize(pedido.descripcion, pageWidth - 10);
    descLines.forEach((l: string) => {
      doc.text(l, 5, currentY);
      currentY += 3.5;
    });

    currentY += 1.5;
    doc.text("-".repeat(is58 ? 32 : 44), centerX, currentY, { align: "center" });
    currentY += 4;

    // Desglose Financiero (Únicamente en USD $)
    const saldo = pedido.monto_total - pedido.anticipo;

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(is58 ? 7 : 8);
    doc.text(`Estado: ${pedido.estado.toUpperCase()}`, 5, currentY);
    currentY += 4;
    doc.text(`Total Presupuestado: $${pedido.monto_total.toFixed(2)}`, 5, currentY);
    currentY += 4;
    doc.text(`Anticipo Recibido: $${pedido.anticipo.toFixed(2)}`, 5, currentY);
    currentY += 4;
    doc.text(`Saldo Restante: $${saldo.toFixed(2)}`, 5, currentY);
    currentY += 5;

    doc.text("-".repeat(is58 ? 32 : 44), centerX, currentY, { align: "center" });
    currentY += 4;

    // Pie de página
    doc.setFont("Helvetica", "italic");
    doc.setFontSize(is58 ? 5.5 : 6.5);
    const pieLines = doc.splitTextToSize(mensajePie || "Presente este ticket para retirar su trabajo.", pageWidth - 10);
    pieLines.forEach((l: string) => {
      doc.text(l, centerX, currentY, { align: "center" });
      currentY += 3.2;
    });

    doc.save(`ticket_pedido_${codigo}.pdf`);
  };

  const codigo = pedido.codigo_pedido || pedido.id.slice(-6).toUpperCase();
  const saldo = pedido.monto_total - pedido.anticipo;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      
      {/* Estilos para impresión térmica directa por CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden !important;
          }
          #thermal-pedido-paper, #thermal-pedido-paper * {
            visibility: visible !important;
          }
          #thermal-pedido-paper {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: ${anchoPapel === "58" ? "58mm" : "80mm"} !important;
            max-width: ${anchoPapel === "58" ? "58mm" : "80mm"} !important;
            margin: 0 !important;
            padding: 4mm !important;
            font-family: 'Courier New', Courier, monospace !important;
            font-size: ${anchoPapel === "58" ? "10px" : "12px"} !important;
            color: #000 !important;
            background: #fff !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}} />

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Cabecera del Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                  Ticket de Pedido / Trabajo
                </h3>
                <span className="bg-indigo-600 text-white font-mono font-black text-xs px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-xs">
                  <Hash className="w-3.5 h-3.5" />
                  {codigo}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Impresión Térmica 58mm / 80mm o Descarga en PDF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMostrarConfig(!mostrarConfig)}
              className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                mostrarConfig 
                  ? "bg-indigo-600 text-white shadow-sm" 
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
              title="Personalizar Cabecera y Papel"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Configurar Cabecera</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Panel de Configuración Rápida de Cabecera y Formato */}
        <AnimatePresence>
          {mostrarConfig && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-indigo-50/50 border-b border-indigo-100 p-4 overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[10px] font-black uppercase text-indigo-900 block mb-1">
                    Razón Social / Nombre Comercial
                  </label>
                  <input
                    type="text"
                    value={tituloCabecera}
                    onChange={(e) => setTituloCabecera(e.target.value)}
                    placeholder="Nombre de la Empresa"
                    className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-indigo-900 block mb-1">
                    RIF / Identificación Fiscal
                  </label>
                  <input
                    type="text"
                    value={rifCabecera}
                    onChange={(e) => setRifCabecera(e.target.value)}
                    placeholder="J-12345678-9"
                    className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-indigo-900 block mb-1">
                    Teléfono de Contacto
                  </label>
                  <input
                    type="text"
                    value={telefonoCabecera}
                    onChange={(e) => setTelefonoCabecera(e.target.value)}
                    placeholder="+58 (412) 123-4567"
                    className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-indigo-900 block mb-1">
                    Formato de Papel Térmico
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAnchoPapel("58")}
                      className={`flex-1 py-1.5 rounded-xl font-bold text-xs border transition cursor-pointer ${
                        anchoPapel === "58" 
                          ? "bg-indigo-600 text-white border-indigo-600" 
                          : "bg-white text-slate-600 border-slate-200"
                      }`}
                    >
                      58 mm (Estándar POS)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnchoPapel("80")}
                      className={`flex-1 py-1.5 rounded-xl font-bold text-xs border transition cursor-pointer ${
                        anchoPapel === "80" 
                          ? "bg-indigo-600 text-white border-indigo-600" 
                          : "bg-white text-slate-600 border-slate-200"
                      }`}
                    >
                      80 mm (Ancho)
                    </button>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-black uppercase text-indigo-900 block mb-1">
                    Dirección Comercial
                  </label>
                  <input
                    type="text"
                    value={direccionCabecera}
                    onChange={(e) => setDireccionCabecera(e.target.value)}
                    placeholder="Dirección física o sede"
                    className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Visualizador del Ticket Térmico en Pantalla */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex justify-center items-start">
          <div 
            id="thermal-pedido-paper"
            style={{ width: anchoPapel === "58" ? "290px" : "380px" }}
            className="bg-white p-5 rounded-2xl shadow-md border border-slate-200/80 font-mono text-[11px] leading-tight text-slate-900 space-y-3"
          >
            {/* Cabecera */}
            <div className="text-center space-y-1">
              <h2 className="font-black text-xs uppercase tracking-wider text-slate-900">
                {tituloCabecera || "EMPRESA PRO"}
              </h2>
              {rifCabecera && <p className="text-[10px] text-slate-600">RIF: {rifCabecera}</p>}
              {telefonoCabecera && <p className="text-[10px] text-slate-600">Telf: {telefonoCabecera}</p>}
              {direccionCabecera && <p className="text-[10px] text-slate-500 leading-none">{direccionCabecera}</p>}
              <div className="border-b border-dashed border-slate-300 my-2"></div>
            </div>

            {/* Código de Retiro */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
              <span className="text-[9px] font-black uppercase text-slate-400 block tracking-widest">
                CÓDIGO DE RETIRO
              </span>
              <span className="text-base font-black text-indigo-700 tracking-wider">
                #{codigo}
              </span>
            </div>

            {/* Datos del Cliente y Fechas */}
            <div className="space-y-1 text-[10px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Fecha Emisión:</span>
                <span className="font-bold">{pedido.fecha_pedido}</span>
              </div>
              {pedido.fecha_entrega_estimada && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Entrega Estimada:</span>
                  <span className="font-bold text-indigo-900">{pedido.fecha_entrega_estimada}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Cliente:</span>
                <span className="font-bold">{pedido.nombres} {pedido.apellidos || ""}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cédula/RIF:</span>
                <span className="font-bold">{pedido.cedula}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Teléfono:</span>
                <span className="font-bold">{pedido.telefono}</span>
              </div>
              {pedido.departamento_servicio && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Área/Depto:</span>
                  <span className="font-bold text-slate-800">{pedido.departamento_servicio}</span>
                </div>
              )}
              {pedido.asignado_a && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Operador:</span>
                  <span className="font-bold text-slate-800">{pedido.asignado_a}</span>
                </div>
              )}
            </div>

            <div className="border-b border-dashed border-slate-300"></div>

            {/* Requerimiento / Descripción */}
            <div>
              <span className="text-[10px] font-black uppercase text-slate-700 block mb-1">
                Descripción del Trabajo:
              </span>
              <p className="text-[11px] text-slate-800 bg-slate-50 p-2 rounded-lg whitespace-pre-line border border-slate-100 font-sans">
                {pedido.descripcion}
              </p>
            </div>

            <div className="border-b border-dashed border-slate-300"></div>

            {/* Desglose Financiero (Solo USD $) */}
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Total Presupuestado:</span>
                <span className="font-bold text-slate-900 text-xs">${pedido.monto_total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-emerald-700">
                <span>Anticipo Abonado:</span>
                <span className="font-bold text-xs">-${pedido.anticipo.toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-200 pt-1.5 flex justify-between items-center font-black text-xs text-rose-600">
                <span>Saldo por Cancelar:</span>
                <span className="text-sm font-black">${saldo.toFixed(2)}</span>
              </div>
            </div>

            <div className="border-b border-dashed border-slate-300"></div>

            {/* Pie de Ticket */}
            <div className="text-center space-y-1 pt-1 text-[10px] text-slate-500">
              <p className="whitespace-pre-line">{mensajePie}</p>
              <p className="text-[9px] font-bold text-slate-700">
                Indispensable presentar este comprobante o su código para el retiro.
              </p>
            </div>
          </div>
        </div>

        {/* Barra de Acciones / Botones Inferiores */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">
              Formato seleccionado: <strong className="text-slate-800">{anchoPapel} mm</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={descargarTicketPDF}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition flex items-center gap-1.5 cursor-pointer"
              title="Descargar comprobante en formato PDF"
            >
              <Download className="w-4 h-4" />
              <span>Descargar PDF</span>
            </button>

            <button
              onClick={ejecutarImpresion}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5 cursor-pointer"
              title="Imprimir directamente en impresora térmica o común"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Ticket</span>
            </button>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
