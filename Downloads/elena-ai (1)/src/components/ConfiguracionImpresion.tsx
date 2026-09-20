/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Printer, 
  Settings, 
  Save, 
  Check, 
  FileText, 
  RefreshCw, 
  Eye, 
  Trash2,
  FileCheck2,
  AlertTriangle,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function ConfiguracionImpresion() {
  // Configuración de la impresora en localStorage
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
  const [impresoraFiscalActiva, setImpresoraFiscalActiva] = useState<boolean>(() => {
    return localStorage.getItem("thermal_impresora_fiscal_activa") !== "false";
  });

  const [guardadoExitoso, setGuardadoExitoso] = useState(false);

  // Guardar configuraciones en localStorage en tiempo real
  const guardarAjustes = () => {
    localStorage.setItem("thermal_papel_ancho", anchoPapel);
    localStorage.setItem("thermal_cabecera_titulo", tituloCabecera);
    localStorage.setItem("thermal_cabecera_rif", rifCabecera);
    localStorage.setItem("thermal_cabecera_telefono", telefonoCabecera);
    localStorage.setItem("thermal_cabecera_direccion", direccionCabecera);
    localStorage.setItem("thermal_pie_mensaje", mensajePie);
    localStorage.setItem("thermal_auto_imprimir", String(autoImprimir));
    localStorage.setItem("thermal_mostrar_logo", String(mostrarLogotipo));
    localStorage.setItem("thermal_impresora_fiscal_activa", String(impresoraFiscalActiva));

    setGuardadoExitoso(true);
    setTimeout(() => {
      setGuardadoExitoso(false);
    }, 2000);
  };

  const restablecerValores = () => {
    if (window.confirm("¿Está seguro de restablecer los valores de impresión predeterminados?")) {
      setAnchoPapel("58");
      setTituloCabecera("ELENA FARMA C.A.");
      setRifCabecera("J-50148729-3");
      setTelefonoCabecera("+58 (212) 993-8412");
      setDireccionCabecera("Av. Principal S. Grande, Edf. Farmacia, Caracas");
      setMensajePie("¡Gracias por su compra!\nConserve este ticket como garantía.");
      setAutoImprimir(true);
      setMostrarLogotipo(true);
      setImpresoraFiscalActiva(true);
    }
  };

  // Simular impresión de ticket de prueba
  const imprimirTicketPrueba = () => {
    // Guardar temporalmente para que la impresión use los datos actuales
    localStorage.setItem("thermal_papel_ancho", anchoPapel);
    localStorage.setItem("thermal_cabecera_titulo", tituloCabecera);
    localStorage.setItem("thermal_cabecera_rif", rifCabecera);
    localStorage.setItem("thermal_cabecera_telefono", telefonoCabecera);
    localStorage.setItem("thermal_cabecera_direccion", direccionCabecera);
    localStorage.setItem("thermal_pie_mensaje", mensajePie);
    localStorage.setItem("thermal_mostrar_logo", String(mostrarLogotipo));

    window.print();
  };

  const charLimit = anchoPapel === "58" ? 32 : 42;
  const separatorLine = "-".repeat(charLimit);

  return (
    <div className="flex flex-col gap-6">
      {/* Estilos CSS de impresión local para ticket de prueba */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden !important;
          }
          #thermal-preview-paper, #thermal-preview-paper * {
            visibility: visible !important;
          }
          #thermal-preview-paper {
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
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Configuración de Impresión</h2>
          <p className="text-xs text-slate-500 mt-1">Gestione la información fiscal de la empresa, el diseño del ticket térmico y el comportamiento de la impresora fiscal.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={restablecerValores}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl text-xs uppercase tracking-wider transition cursor-pointer"
          >
            Restablecer
          </button>
          <button
            onClick={guardarAjustes}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl text-xs uppercase tracking-wider transition flex items-center gap-1.5 shadow-md shadow-indigo-100 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Configuración</span>
          </button>
        </div>
      </div>

      {/* Alerta de guardado exitoso */}
      <AnimatePresence>
        {guardadoExitoso && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex gap-3 items-center"
          >
            <div className="bg-emerald-600 text-white rounded-xl p-1.5 shrink-0">
              <Check className="w-4 h-4" />
            </div>
            <p className="text-xs font-black text-emerald-950 uppercase tracking-wide">
              ¡Ajustes de impresión guardados y persistidos exitosamente!
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* PANEL IZQUIERDO: CONFIGURACIONES */}
        <div className="lg:col-span-7 bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm space-y-6">
          
          {/* SECCIÓN PRINCIPAL: IMPRESORA FISCAL */}
          <div className="p-4 bg-slate-900 text-white rounded-[2rem] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Printer className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">Impresora Fiscal Integrada</h3>
                  <p className="text-[10px] text-slate-400">Habilite o deshabilite la emisión automatizada de facturas impresas</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={impresoraFiscalActiva} 
                  onChange={(e) => setImpresoraFiscalActiva(e.target.checked)} 
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
              </label>
            </div>

            <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-[10px]">
              <span className="text-slate-400 font-bold">Estado actual:</span>
              <span className={`font-black uppercase tracking-widest px-2.5 py-0.5 rounded ${
                impresoraFiscalActiva 
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
              }`}>
                {impresoraFiscalActiva ? "IMPRESORA HABILITADA" : "SOLO FACTURACIÓN DIGITAL"}
              </span>
            </div>
          </div>

          {/* AJUSTES DE FORMATO DE TICKET */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Formato y Comportamiento</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Ancho papel */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Ancho de Rollo de Papel</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAnchoPapel("58")}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition text-center cursor-pointer ${
                      anchoPapel === "58" 
                        ? "bg-indigo-600 border-indigo-600 text-white font-extrabold" 
                        : "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    58 mm (Estándar)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnchoPapel("80")}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition text-center cursor-pointer ${
                      anchoPapel === "80" 
                        ? "bg-indigo-600 border-indigo-600 text-white font-extrabold" 
                        : "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    80 mm (Ancho)
                  </button>
                </div>
              </div>

              {/* Toggles de comportamiento */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-700 uppercase">Mostrar Logotipo Cruz</span>
                    <span className="text-[8px] text-slate-400 font-medium">Imprime cruz médica en la parte superior</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={mostrarLogotipo} 
                      onChange={(e) => setMostrarLogotipo(e.target.checked)} 
                      className="sr-only peer" 
                    />
                    <div className="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-700 uppercase">Disparar Impresión Automática</span>
                    <span className="text-[8px] text-slate-400 font-medium">Abre cuadro de diálogo de impresión al cobrar</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={autoImprimir} 
                      onChange={(e) => setAutoImprimir(e.target.checked)} 
                      className="sr-only peer" 
                    />
                    <div className="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* DATOS DE LA CABECERA FISCAL */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Información de la Cabecera</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Razón Social / Nombre Comercial</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3.5 text-xs font-semibold mt-1 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                  value={tituloCabecera}
                  onChange={(e) => setTituloCabecera(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Registro de Información Fiscal (RIF)</label>
                <input
                  type="text"
                  placeholder="Ej: J-12345678-9"
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3.5 text-xs font-semibold mt-1 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                  value={rifCabecera}
                  onChange={(e) => setRifCabecera(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Teléfono de Atención</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3.5 text-xs font-semibold mt-1 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                  value={telefonoCabecera}
                  onChange={(e) => setTelefonoCabecera(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Dirección del Establecimiento</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3.5 text-xs font-semibold mt-1 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                  value={direccionCabecera}
                  onChange={(e) => setDireccionCabecera(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* DATOS DEL PIE DE FACTURA */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Mensaje del Pie de Página</h3>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Leyenda / Garantía (Soporta múltiples líneas)</label>
              <textarea
                rows={3}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3.5 text-xs font-semibold mt-1 outline-none resize-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                value={mensajePie}
                onChange={(e) => setMensajePie(e.target.value)}
              />
            </div>
          </div>

        </div>

        {/* PANEL DERECHO: PREVIEW EN TIEMPO REAL */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 text-white flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">Vista Previa Fiscal</h3>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
              Este panel muestra exactamente cómo lucirá el ticket impreso según el ancho de papel seleccionado (<strong>{anchoPapel}mm</strong>). Modifique los campos del formulario izquierdo y vea los cambios en tiempo real.
            </p>

            <button
              onClick={imprimirTicketPrueba}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-black rounded-2xl text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Recibo de Prueba</span>
            </button>
          </div>

          {/* DISEÑO DEL ROLLO DE PAPEL TÉRMICO */}
          <div className="flex justify-center bg-slate-200 p-6 rounded-[2.5rem] border border-slate-300 shadow-inner overflow-hidden">
            <div 
              id="thermal-preview-paper"
              className="bg-white text-black p-4 shadow-xl border border-slate-300 font-mono text-[10px] leading-relaxed relative"
              style={{
                width: anchoPapel === "58" ? "220px" : "300px",
                minHeight: "450px"
              }}
            >
              {/* Logotipo Opcional */}
              {mostrarLogotipo && (
                <div className="text-center font-bold text-sm mb-2 text-slate-800">
                  + + + + + + +<br />
                  +  {tituloCabecera.slice(0, 5).toUpperCase()}  +<br />
                  + + + + + + +
                </div>
              )}

              {/* Título */}
              <div className="text-center font-bold text-xs uppercase mb-1">
                {tituloCabecera}
              </div>

              {/* Información General */}
              <div className="text-center text-[8px] uppercase space-y-0.5 text-slate-600">
                <p>RIF: {rifCabecera}</p>
                <p>TLF: {telefonoCabecera}</p>
                <p className="line-clamp-2 leading-tight">{direccionCabecera}</p>
              </div>

              <div className="my-2">{separatorLine}</div>

              {/* Metadatos Ticket */}
              <div className="text-[8px] uppercase space-y-0.5 text-slate-600">
                <div className="flex justify-between">
                  <span>FECHA: 03/07/2026</span>
                  <span>HORA: 12:00</span>
                </div>
                <div className="flex justify-between">
                  <span>FACTURA: NRO 00014298</span>
                  <span>CAJA: 01</span>
                </div>
                <div className="flex justify-between">
                  <span>CLIENTE: V-99999999</span>
                </div>
                <div>RIF/CI: CONSUMIDOR FINAL</div>
              </div>

              <div className="my-2">{separatorLine}</div>

              {/* Columnas de Productos */}
              <div className="text-[8px] font-bold uppercase mb-1 flex justify-between">
                <span>MEDICAMENTO / CANT</span>
                <span>TOTAL</span>
              </div>
              <div className="space-y-1.5 text-[8px] uppercase text-slate-700">
                <div>
                  <div className="flex justify-between font-bold text-black">
                    <span>ACETAMINOFEN 500MG (BLISTER)</span>
                    <span>$3.50</span>
                  </div>
                  <div className="flex justify-between">
                    <span>2.00 x $1.75</span>
                    <span>Bs. 127.75</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-bold text-black">
                    <span>LOSARTAN POTASICO 50MG</span>
                    <span>$6.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>1.00 x $6.00</span>
                    <span>Bs. 219.00</span>
                  </div>
                </div>
              </div>

              <div className="my-2">{separatorLine}</div>

              {/* Totales */}
              <div className="space-y-1 text-[8px] uppercase">
                <div className="flex justify-between">
                  <span>SUBTOTAL EXENTO:</span>
                  <span>$3.50</span>
                </div>
                <div className="flex justify-between">
                  <span>SUBTOTAL BI (16%):</span>
                  <span>$5.17</span>
                </div>
                <div className="flex justify-between">
                  <span>IVA RECAUDADO (16%):</span>
                  <span>$0.83</span>
                </div>
                <div className="flex justify-between font-bold text-black text-[9px] border-t border-dashed border-slate-300 pt-1 mt-1">
                  <span>TOTAL USD:</span>
                  <span>$9.50</span>
                </div>
                <div className="flex justify-between font-bold text-indigo-700">
                  <span>TOTAL BS (TASA 36.50):</span>
                  <span>Bs. 346.75</span>
                </div>
              </div>

              <div className="my-2">{separatorLine}</div>

              {/* Pie de factura */}
              <div className="text-center text-[7px] text-slate-500 whitespace-pre-line leading-tight">
                {mensajePie}
              </div>

              <div className="text-center text-[6px] text-slate-400 font-bold uppercase mt-3">
                SISTEMA ELENA FARMA PRO v2.1<br />
                CONTROL FISCAL AUTORIZADO
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
