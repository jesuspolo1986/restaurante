/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Printer, 
  FileText, 
  X, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  DollarSign, 
  ShieldAlert, 
  Layers, 
  Coins, 
  WalletCards,
  Building2
} from "lucide-react";
import { jsPDF } from "jspdf";
import { apiFetch } from "../utils/api";

interface ModalCorteXProps {
  isOpen: boolean;
  onClose: () => void;
  datosExternos?: any;
}

export default function ModalCorteX({ isOpen, onClose, datosExternos }: ModalCorteXProps) {
  const [datosArqueo, setDatosArqueo] = useState<any>(datosExternos || null);
  const [cargando, setCargando] = useState(false);
  const [tasaBcv, setTasaBcv] = useState<number>(36.5);
  const [anchoPapel, setAnchoPapel] = useState<"58" | "80">(() => {
    return (localStorage.getItem("thermal_papel_ancho") as "58" | "80") || "58";
  });

  // Configuración de Cabecera Térmica Persistida
  const tituloCabecera = localStorage.getItem("thermal_cabecera_titulo") || "ELENA FARMA C.A.";
  const rifCabecera = localStorage.getItem("thermal_cabecera_rif") || "J-50148729-3";
  const telefonoCabecera = localStorage.getItem("thermal_cabecera_telefono") || "+58 (212) 993-8412";
  const direccionCabecera = localStorage.getItem("thermal_cabecera_direccion") || "Av. Principal S. Grande, Edf. Farmacia, Caracas";
  const mensajePie = localStorage.getItem("thermal_pie_mensaje") || "Reporte de Auditoría Interna";

  const sucursalActiva = localStorage.getItem("sucursal_activa_nombre") || localStorage.getItem("sucursal_activa_id") || "Sede Principal";
  const cajaActiva = localStorage.getItem("caja_activa_id") || "CAJA-01";
  const usuarioSesion = localStorage.getItem("elena_sesion") ? JSON.parse(localStorage.getItem("elena_sesion") || "{}")?.nombre || "Cajero" : "Cajero";

  const [fechaHoraActual, setFechaHoraActual] = useState({
    fecha: new Date().toLocaleDateString("es-VE"),
    hora: new Date().toLocaleTimeString("es-VE")
  });

  useEffect(() => {
    if (isOpen) {
      setFechaHoraActual({
        fecha: new Date().toLocaleDateString("es-VE"),
        hora: new Date().toLocaleTimeString("es-VE")
      });
      cargarDatos();
    }
  }, [isOpen]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [resArqueo, resDolar] = await Promise.all([
        apiFetch("/api/informes/cierre-caja-datos"),
        apiFetch("/api/dolar")
      ]);

      if (resArqueo.ok) {
        const dataArqueo = await resArqueo.json();
        if (dataArqueo.status === "success") {
          setDatosArqueo(dataArqueo.datos);
        }
      }

      if (resDolar.ok) {
        const dataDolar = await resDolar.json();
        if (dataDolar.tasa) {
          setTasaBcv(dataDolar.tasa);
        }
      }
    } catch (err) {
      console.error("Error al cargar datos de Corte X:", err);
    } finally {
      setCargando(false);
    }
  };

  if (!isOpen) return null;

  const arqueo = datosArqueo?.arqueo_pagos || {
    efectivo_usd: 0,
    zelle_usd: 0,
    binance_usd: 0,
    efectivo_bs: 0,
    punto_bs: 0,
    pago_movil_bs: 0,
    credito_usd: 0,
    gastos_usd: 0,
    gastos_bs: 0
  };

  const fiscal = datosArqueo?.resumen_fiscal || {
    cantidad_facturas: 0,
    monto_exento_usd: 0,
    base_imponible_usd: 0,
    monto_iva_usd: 0,
    monto_igtf_usd: 0,
    gran_total_usd: 0,
    gran_total_bs: 0
  };

  const noFiscal = datosArqueo?.resumen_no_fiscal || {
    cantidad_notas: 0,
    gran_total_usd: 0,
    gran_total_bs: 0
  };

  const totalOperaciones = fiscal.cantidad_facturas + noFiscal.cantidad_notas;
  const granTotalUSD = fiscal.gran_total_usd + noFiscal.gran_total_usd;
  const granTotalBS = fiscal.gran_total_bs + noFiscal.gran_total_bs;

  const efectivoNetoUSD = Math.max(0, arqueo.efectivo_usd - (arqueo.gastos_usd || 0));
  const efectivoNetoBS = Math.max(0, arqueo.efectivo_bs - (arqueo.gastos_bs || 0));

  // --- GENERACIÓN DE PDF PROFESIONAL PARA CORTE X ---
  const descargarPDF = () => {
    const is58 = anchoPapel === "58";
    const pageWidth = is58 ? 58 : 80;
    const pageHeight = is58 ? 260 : 280;

    const doc = new jsPDF({
      unit: "mm",
      format: [pageWidth, pageHeight]
    });

    const centerX = pageWidth / 2;
    let currentY = 8;

    // Encabezado Negocio
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(is58 ? 10 : 12);
    doc.text(tituloCabecera.toUpperCase(), centerX, currentY, { align: "center" });
    currentY += 4;

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(is58 ? 7 : 8);
    doc.text(`RIF: ${rifCabecera}`, centerX, currentY, { align: "center" });
    currentY += 3.5;
    if (telefonoCabecera) {
      doc.text(`TELF: ${telefonoCabecera}`, centerX, currentY, { align: "center" });
      currentY += 3.5;
    }
    if (direccionCabecera) {
      const splitDir = doc.splitTextToSize(direccionCabecera, pageWidth - 10);
      doc.text(splitDir, centerX, currentY, { align: "center" });
      currentY += splitDir.length * 3.5;
    }

    doc.text("-".repeat(is58 ? 32 : 44), centerX, currentY, { align: "center" });
    currentY += 4;

    // Título Corte X
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(is58 ? 8.5 : 10);
    doc.text("*** REPORTE CORTE X ***", centerX, currentY, { align: "center" });
    currentY += 3.5;
    doc.setFontSize(is58 ? 6.5 : 7.5);
    doc.text("(LECTURA PARCIAL DE TURNO / CAJA ABIERTA)", centerX, currentY, { align: "center" });
    currentY += 4;

    doc.setFont("Helvetica", "normal");
    doc.text(`Fecha: ${fechaHoraActual.fecha}  Hora: ${fechaHoraActual.hora}`, 5, currentY);
    currentY += 3.5;
    doc.text(`Cajero/Usuario: ${usuarioSesion}`, 5, currentY);
    currentY += 3.5;
    doc.text(`Sede: ${sucursalActiva} | Caja: ${cajaActiva}`, 5, currentY);
    currentY += 3.5;
    doc.text(`Tasa Oficial BCV: Bs. ${tasaBcv.toFixed(2)}`, 5, currentY);
    currentY += 4;

    doc.text("-".repeat(is58 ? 32 : 44), centerX, currentY, { align: "center" });
    currentY += 4;

    // Resumen de Operaciones
    doc.setFont("Helvetica", "bold");
    doc.text("RESUMEN DE OPERACIONES", 5, currentY);
    currentY += 3.5;
    doc.setFont("Helvetica", "normal");
    doc.text(`Facturas Fiscales:`, 5, currentY);
    doc.text(`${fiscal.cantidad_facturas} ops`, pageWidth - 5, currentY, { align: "right" });
    currentY += 3.5;
    doc.text(`Notas de Entrega:`, 5, currentY);
    doc.text(`${noFiscal.cantidad_notas} ops`, pageWidth - 5, currentY, { align: "right" });
    currentY += 3.5;
    doc.setFont("Helvetica", "bold");
    doc.text(`Total Transacciones:`, 5, currentY);
    doc.text(`${totalOperaciones} ops`, pageWidth - 5, currentY, { align: "right" });
    currentY += 4;

    doc.text("-".repeat(is58 ? 32 : 44), centerX, currentY, { align: "center" });
    currentY += 4;

    // Desglose Fiscal
    doc.setFont("Helvetica", "bold");
    doc.text("DESGLOSE FISCAL (SENIAT)", 5, currentY);
    currentY += 3.5;
    doc.setFont("Helvetica", "normal");
    doc.text(`Ventas Exentas ($):`, 5, currentY);
    doc.text(`$${fiscal.monto_exento_usd.toFixed(2)}`, pageWidth - 5, currentY, { align: "right" });
    currentY += 3.5;
    doc.text(`Base Imponible 16% ($):`, 5, currentY);
    doc.text(`$${fiscal.base_imponible_usd.toFixed(2)}`, pageWidth - 5, currentY, { align: "right" });
    currentY += 3.5;
    doc.text(`IVA Recaudado 16% ($):`, 5, currentY);
    doc.text(`$${fiscal.monto_iva_usd.toFixed(2)}`, pageWidth - 5, currentY, { align: "right" });
    currentY += 3.5;
    if (fiscal.monto_igtf_usd > 0) {
      doc.text(`IGTF 3% ($):`, 5, currentY);
      doc.text(`$${fiscal.monto_igtf_usd.toFixed(2)}`, pageWidth - 5, currentY, { align: "right" });
      currentY += 3.5;
    }
    doc.setFont("Helvetica", "bold");
    doc.text(`Subtotal Fiscal USD:`, 5, currentY);
    doc.text(`$${fiscal.gran_total_usd.toFixed(2)}`, pageWidth - 5, currentY, { align: "right" });
    currentY += 4;

    // Lote No Fiscal si existe
    if (noFiscal.cantidad_notas > 0) {
      doc.setFont("Helvetica", "bold");
      doc.text(`Subtotal No Fiscal USD:`, 5, currentY);
      doc.text(`$${noFiscal.gran_total_usd.toFixed(2)}`, pageWidth - 5, currentY, { align: "right" });
      currentY += 4;
    }

    // Gran Total General
    doc.text("=".repeat(is58 ? 32 : 44), centerX, currentY, { align: "center" });
    currentY += 4;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(is58 ? 8.5 : 9.5);
    doc.text(`GRAN TOTAL TURNO USD:`, 5, currentY);
    doc.text(`$${granTotalUSD.toFixed(2)}`, pageWidth - 5, currentY, { align: "right" });
    currentY += 4;
    doc.setFontSize(is58 ? 7 : 8);
    doc.text(`Total en Bolívares:`, 5, currentY);
    doc.text(`Bs. ${granTotalBS.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - 5, currentY, { align: "right" });
    currentY += 4;
    doc.text("=".repeat(is58 ? 32 : 44), centerX, currentY, { align: "center" });
    currentY += 4;

    // Arqueo por Formas de Pago
    doc.setFont("Helvetica", "bold");
    doc.text("ARQUEO POR FORMA DE PAGO", 5, currentY);
    currentY += 3.5;
    doc.setFont("Helvetica", "normal");
    doc.text(`Efectivo USD ($):`, 5, currentY);
    doc.text(`$${arqueo.efectivo_usd.toFixed(2)}`, pageWidth - 5, currentY, { align: "right" });
    currentY += 3.5;
    doc.text(`Zelle / Transf ($):`, 5, currentY);
    doc.text(`$${arqueo.zelle_usd.toFixed(2)}`, pageWidth - 5, currentY, { align: "right" });
    currentY += 3.5;
    if (arqueo.binance_usd > 0) {
      doc.text(`Binance Pay ($):`, 5, currentY);
      doc.text(`$${arqueo.binance_usd.toFixed(2)}`, pageWidth - 5, currentY, { align: "right" });
      currentY += 3.5;
    }
    doc.text(`Efectivo Bolívares:`, 5, currentY);
    doc.text(`Bs. ${arqueo.efectivo_bs.toFixed(2)}`, pageWidth - 5, currentY, { align: "right" });
    currentY += 3.5;
    doc.text(`Punto de Venta / Tarjetas:`, 5, currentY);
    doc.text(`Bs. ${arqueo.punto_bs.toFixed(2)}`, pageWidth - 5, currentY, { align: "right" });
    currentY += 3.5;
    doc.text(`Pago Móvil:`, 5, currentY);
    doc.text(`Bs. ${arqueo.pago_movil_bs.toFixed(2)}`, pageWidth - 5, currentY, { align: "right" });
    currentY += 3.5;
    if (arqueo.credito_usd > 0) {
      doc.text(`Créditos Otorgados:`, 5, currentY);
      doc.text(`$${arqueo.credito_usd.toFixed(2)}`, pageWidth - 5, currentY, { align: "right" });
      currentY += 3.5;
    }

    if (arqueo.gastos_usd > 0 || arqueo.gastos_bs > 0) {
      doc.text(`Egresos / Caja Chica (-):`, 5, currentY);
      doc.text(`-$${(arqueo.gastos_usd || 0).toFixed(2)}`, pageWidth - 5, currentY, { align: "right" });
      currentY += 3.5;
    }

    doc.text("-".repeat(is58 ? 32 : 44), centerX, currentY, { align: "center" });
    currentY += 4;

    // Efectivo Neto en Gaveta
    doc.setFont("Helvetica", "bold");
    doc.text(`EFECTIVO NETO ESPERADO:`, 5, currentY);
    currentY += 3.5;
    doc.text(`Gaveta USD: $${efectivoNetoUSD.toFixed(2)}`, 5, currentY);
    currentY += 3.5;
    doc.text(`Gaveta Bs: Bs. ${efectivoNetoBS.toFixed(2)}`, 5, currentY);
    currentY += 5;

    // Pie Informativo
    doc.setFont("Helvetica", "italic");
    doc.setFontSize(is58 ? 6 : 7);
    doc.text("ESTE DOCUMENTO ES UNA LECTURA PARCIAL.", centerX, currentY, { align: "center" });
    currentY += 3;
    doc.text("NO REEMPLAZA EL CIERRE FISCAL CORTE Z DIARIO.", centerX, currentY, { align: "center" });

    doc.save(`Corte_X_${fechaHoraActual.fecha.replace(/\//g, "-")}_${cajaActiva}.pdf`);
  };

  // --- IMPRESIÓN DIRECTA POR NAVEGADOR / ESC-POS ---
  const ejecutarImpresion = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Encabezado del Modal */}
        <div className="p-5 px-6 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shadow-inner">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black uppercase tracking-wider">Reporte Corte X</h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Lectura Parcial (Turno Abierto)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Auditoría instantánea de ventas y formas de pago acumuladas en el turno activo.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Controles y Formato */}
        <div className="p-3 px-6 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600">Formato Térmico:</span>
            <div className="flex bg-white border border-slate-200 p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => setAnchoPapel("58")}
                className={`px-3 py-1 rounded-lg font-black transition ${
                  anchoPapel === "58" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                58 mm
              </button>
              <button
                type="button"
                onClick={() => setAnchoPapel("80")}
                className={`px-3 py-1 rounded-lg font-black transition ${
                  anchoPapel === "80" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                80 mm (Ancho)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={cargarDatos}
              disabled={cargando}
              className="p-1.5 px-2.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-700 font-bold flex items-center gap-1.5 transition cursor-pointer text-xs"
              title="Recargar datos del turno"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${cargando ? "animate-spin" : ""}`} />
              <span>Actualizar</span>
            </button>
          </div>
        </div>

        {/* Cuerpo del Modal con Vista Previa del Ticket */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-100/70 flex justify-center">
          <div 
            id="ticket-termico-cortex"
            style={{ width: anchoPapel === "58" ? "300px" : "380px" }}
            className="bg-white p-5 rounded-2xl shadow-md border border-slate-200/80 font-mono text-xs text-slate-800 space-y-4 transition-all"
          >
            {/* Cabecera Comercial */}
            <div className="text-center space-y-1 border-b border-dashed border-slate-300 pb-3">
              <h3 className="font-black text-sm uppercase text-slate-900 tracking-wider">
                {tituloCabecera}
              </h3>
              <p className="text-[11px] text-slate-600 font-semibold">RIF: {rifCabecera}</p>
              {telefonoCabecera && <p className="text-[10px] text-slate-500">TELF: {telefonoCabecera}</p>}
              {direccionCabecera && <p className="text-[10px] text-slate-500 leading-tight">{direccionCabecera}</p>}
            </div>

            {/* Título de Lectura X */}
            <div className="text-center space-y-0.5 bg-indigo-50/70 p-2 rounded-xl border border-indigo-100">
              <h4 className="font-black text-xs text-indigo-950 uppercase tracking-wider">
                *** REPORTE CORTE X ***
              </h4>
              <p className="text-[9px] font-bold text-indigo-700 uppercase">
                (LECTURA PARCIAL • CAJA ABIERTA)
              </p>
            </div>

            {/* Metadatos de la Estación */}
            <div className="text-[10px] space-y-1 border-b border-dashed border-slate-300 pb-3">
              <div className="flex justify-between">
                <span className="text-slate-500">Fecha / Hora:</span>
                <span className="font-bold text-slate-900">{fechaHoraActual.fecha} {fechaHoraActual.hora}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cajero / Operador:</span>
                <span className="font-bold text-slate-900">{usuarioSesion}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Estación:</span>
                <span className="font-bold text-slate-900">{sucursalActiva} • {cajaActiva}</span>
              </div>
              <div className="flex justify-between text-indigo-700 font-bold">
                <span>Tasa Oficial BCV:</span>
                <span>Bs. {tasaBcv.toFixed(2)}</span>
              </div>
            </div>

            {/* Resumen de Operaciones */}
            <div className="space-y-1 border-b border-dashed border-slate-300 pb-3 text-[11px]">
              <div className="font-black text-[10px] uppercase text-slate-700 tracking-wider mb-1">
                1. RESUMEN DE OPERACIONES
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Facturas Fiscales:</span>
                <span className="font-bold">{fiscal.cantidad_facturas}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Notas de Entrega:</span>
                <span className="font-bold">{noFiscal.cantidad_notas}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-100 font-bold text-slate-900">
                <span>Total Operaciones:</span>
                <span>{totalOperaciones}</span>
              </div>
            </div>

            {/* Desglose Fiscal (SENIAT) */}
            <div className="space-y-1 border-b border-dashed border-slate-300 pb-3 text-[11px]">
              <div className="font-black text-[10px] uppercase text-slate-700 tracking-wider mb-1">
                2. DESGLOSE FISCAL (SENIAT)
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Ventas Exentas:</span>
                <span className="font-bold">${fiscal.monto_exento_usd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Base Imponible (16%):</span>
                <span className="font-bold">${fiscal.base_imponible_usd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">IVA 16%:</span>
                <span className="font-bold">${fiscal.monto_iva_usd.toFixed(2)}</span>
              </div>
              {fiscal.monto_igtf_usd > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>IGTF 3%:</span>
                  <span className="font-bold">${fiscal.monto_igtf_usd.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-slate-100 font-black text-indigo-950">
                <span>Subtotal Fiscal:</span>
                <span>${fiscal.gran_total_usd.toFixed(2)}</span>
              </div>
            </div>

            {/* Desglose No Fiscal */}
            {noFiscal.cantidad_notas > 0 && (
              <div className="space-y-1 border-b border-dashed border-slate-300 pb-3 text-[11px]">
                <div className="font-black text-[10px] uppercase text-amber-800 tracking-wider mb-1">
                  3. DESGLOSE NO FISCAL
                </div>
                <div className="flex justify-between text-amber-950 font-bold">
                  <span>Notas de Entrega:</span>
                  <span>${noFiscal.gran_total_usd.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Gran Total Vendido en el Turno */}
            <div className="bg-slate-900 text-white p-3 rounded-xl space-y-1 text-center">
              <div className="text-[9px] uppercase tracking-widest text-slate-300 font-bold">
                GRAN TOTAL VENDIDO (TURNO)
              </div>
              <div className="text-lg font-black text-emerald-400">
                ${granTotalUSD.toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-300">
                Bs. {granTotalBS.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            {/* Arqueo de Medios de Pago */}
            <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-3 text-[11px]">
              <div className="font-black text-[10px] uppercase text-slate-700 tracking-wider mb-1">
                4. VALORES RECIBIDOS EN CAJA
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Efectivo USD ($):</span>
                <span className="font-bold text-slate-900">${arqueo.efectivo_usd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Zelle / Transferencias ($):</span>
                <span className="font-bold text-slate-900">${arqueo.zelle_usd.toFixed(2)}</span>
              </div>
              {arqueo.binance_usd > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Binance Pay ($):</span>
                  <span className="font-bold text-amber-600">${arqueo.binance_usd.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-600">Efectivo Bolívares:</span>
                <span className="font-bold text-slate-900">Bs. {arqueo.efectivo_bs.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Punto de Venta (Tarjetas):</span>
                <span className="font-bold text-slate-900">Bs. {arqueo.punto_bs.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Pago Móvil:</span>
                <span className="font-bold text-slate-900">Bs. {arqueo.pago_movil_bs.toFixed(2)}</span>
              </div>
              {arqueo.credito_usd > 0 && (
                <div className="flex justify-between text-indigo-700">
                  <span>Créditos Otorgados:</span>
                  <span className="font-bold">${arqueo.credito_usd.toFixed(2)}</span>
                </div>
              )}
              {(arqueo.gastos_usd > 0 || arqueo.gastos_bs > 0) && (
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>Egresos Caja Chica (-):</span>
                  <span>-${(arqueo.gastos_usd || 0).toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Efectivo Neto Esperado */}
            <div className="bg-slate-50 p-2.5 rounded-xl space-y-1 text-[11px] border border-slate-200">
              <div className="font-black text-[9px] uppercase text-slate-600">
                EFECTIVO NETO EN GAVETA (DISPONIBLE):
              </div>
              <div className="flex justify-between font-black text-slate-900">
                <span>Efectivo USD:</span>
                <span className="text-emerald-700 font-black">${efectivoNetoUSD.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-black text-slate-900">
                <span>Efectivo Bs:</span>
                <span className="text-emerald-700 font-black">Bs. {efectivoNetoBS.toFixed(2)}</span>
              </div>
            </div>

            {/* Pie Legal / Advertencia */}
            <div className="text-center text-[9px] text-slate-400 space-y-0.5 pt-2">
              <p className="font-bold text-slate-600">DOCUMENTO DE CONTROL INTERNO</p>
              <p>El turno permanece abierto. No altera correlativos fiscales.</p>
              {mensajePie && <p className="italic mt-1">{mensajePie}</p>}
            </div>
          </div>
        </div>

        {/* Pie de Acciones del Modal */}
        <div className="p-4 px-6 border-t border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Datos en tiempo real listos para auditar o imprimir.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={descargarPDF}
              className="p-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs uppercase tracking-wider flex items-center gap-2 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>PDF</span>
            </button>
            <button
              onClick={ejecutarImpresion}
              className="p-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 transition cursor-pointer shadow-md"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Ticket Térmico</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
