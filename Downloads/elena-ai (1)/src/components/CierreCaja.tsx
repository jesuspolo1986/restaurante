/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { ShieldCheck, Printer, RefreshCw, Layers, Calendar, DollarSign, BookOpen, AlertCircle, Download, WalletCards, FileText } from "lucide-react";
import { motion } from "motion/react";
import { CierreZ, Venta } from "../types";
import { apiFetch } from "../utils/api";
import ModalCajaChica from "./ModalCajaChica";
import ModalCorteX from "./ModalCorteX";

export default function CierreCaja() {
  const [arqueo, setArqueo] = useState<any>(null);
  const [cierres, setCierres] = useState<CierreZ[]>([]);
  const [libroVentas, setLibroVentas] = useState<Venta[]>([]);
  const [mes, setMes] = useState(new Date().toISOString().split("-")[1]);
  const [anio, setAnio] = useState(new Date().getFullYear().toString());

  // Modal Caja Chica & Modal Corte X
  const [mostrarModalCajaChica, setMostrarModalCajaChica] = useState(false);
  const [mostrarModalCorteX, setMostrarModalCorteX] = useState(false);

  // Pestaña Interna: "Caja" o "Libro" o "Historial"
  const [pestañaInterna, setPestañaInterna] = useState<"arqueo" | "cierres_turno" | "libro" | "cierres">("arqueo");

  // Estados Arqueo Físico y Conciliación
  const [contadoUsd, setContadoUsd] = useState<string>("");
  const [contadoZelle, setContadoZelle] = useState<string>("");
  const [contadoBinance, setContadoBinance] = useState<string>("");
  const [contadoBs, setContadoBs] = useState<string>("");
  const [contadoPunto, setContadoPunto] = useState<string>("");
  const [contadoPagoMovil, setContadoPagoMovil] = useState<string>("");
  const [observaciones, setObservaciones] = useState<string>("");

  const [cierresCajaList, setCierresCajaList] = useState<any[]>([]);
  const [procesandoCierreCaja, setProcesandoCierreCaja] = useState<boolean>(false);
  const [mostrarPinModalCierre, setMostrarPinModalCierre] = useState<boolean>(false);
  const [pinSupervisorCierre, setPinSupervisorCierre] = useState<string>("");
  const [errorCierreCaja, setErrorCierreCaja] = useState<string>("");

  useEffect(() => {
    cargarDatosArqueo();
    cargarCierresHistorial();
    cargarCierresCaja();
  }, []);

  useEffect(() => {
    cargarLibroVentas();
  }, [mes, anio]);

  const cargarDatosArqueo = async () => {
    try {
      const res = await apiFetch("/api/informes/cierre-caja-datos");
      const data = await res.json();
      if (data.status === "success") {
        setArqueo(data.datos);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const cargarCierresHistorial = async () => {
    try {
      const res = await apiFetch("/api/cierres-z");
      const data = await res.json();
      setCierres(data);
    } catch (err) {
      console.error(err);
    }
  };

  const cargarCierresCaja = async () => {
    try {
      const res = await apiFetch("/api/cierres-caja");
      const data = await res.json();
      if (Array.isArray(data)) {
        setCierresCajaList(data);
      }
    } catch (err) {
      console.error("Error cargando cierres de caja:", err);
    }
  };

  const cargarLibroVentas = async () => {
    try {
      const res = await apiFetch(`/api/informes/libro-ventas?mes=${mes}&anio=${anio}`);
      const data = await res.json();
      if (data && data.ventas) {
        setLibroVentas(data.ventas);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const exportarLibroVentasCSV = () => {
    if (libroVentas.length === 0) {
      alert("No hay ventas en el período actual para exportar.");
      return;
    }
    const headers = [
      "Operación",
      "Fecha",
      "Cédula/RIF",
      "Cliente",
      "Nº Factura",
      "Monto Exento ($)",
      "Base Imponible ($)",
      "Monto IVA ($)",
      "Monto IGTF ($)",
      "Total ($)",
      "Total (Bs)"
    ];

    const dataRows = libroVentas.map((v, idx) => [
      idx + 1,
      new Date(v.fecha).toLocaleDateString("es-VE"),
      v.cliente_id,
      v.cliente_nombre,
      v.factura_numero,
      v.monto_exento.toFixed(2),
      v.base_imponible.toFixed(2),
      v.monto_iva.toFixed(2),
      v.monto_igtf.toFixed(2),
      v.total_usd.toFixed(2),
      v.total_bs.toFixed(2)
    ]);

    const csvContent = [
      headers.join(","),
      ...dataRows.map(row => 
        row.map((val: any) => {
          let text = String(val === null || val === undefined ? "" : val);
          text = text.replace(/"/g, '""');
          if (text.includes(",") || text.includes("\n") || text.includes("\r") || text.includes('"')) {
            text = `"${text}"`;
          }
          return text;
        }).join(",")
      )
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Libro_Ventas_${mes}_${anio}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportarCierresZCSV = () => {
    if (cierres.length === 0) {
      alert("No hay cierres Z fiscales registrados para exportar.");
      return;
    }
    const headers = [
      "Reporte Z",
      "Fecha de Cierre",
      "Hora de Cierre",
      "Cantidad de Ventas",
      "Total IVA ($)",
      "Total IGTF ($)",
      "Gran Total ($)",
      "Gran Total (Bs)"
    ];

    const dataRows = cierres.map(c => [
      `Z-${c.numero_z}`,
      c.fecha,
      c.hora_cierre,
      c.cantidad_ventas,
      c.total_iva_usd.toFixed(2),
      c.total_igtf_usd.toFixed(2),
      c.gran_total_usd.toFixed(2),
      c.gran_total_bs.toFixed(2)
    ]);

    const csvContent = [
      headers.join(","),
      ...dataRows.map(row => 
        row.map((val: any) => {
          let text = String(val === null || val === undefined ? "" : val);
          text = text.replace(/"/g, '""');
          if (text.includes(",") || text.includes("\n") || text.includes("\r") || text.includes('"')) {
            text = `"${text}"`;
          }
          return text;
        }).join(",")
      )
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Cierres_Z_Fiscales.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const procesarCorteZ = async () => {
    if (!arqueo || arqueo.resumen_fiscal.cantidad_facturas === 0) {
      return alert("No hay transacciones pendientes en el lote actual para emitir un Corte Z");
    }

    if (!confirm("¿Desea cerrar el lote de facturas de hoy y emitir el reporte oficial Corte Z? Esta acción es irreversible.")) return;

    try {
      const res = await apiFetch("/api/ventas/corte-z", {
        method: "POST"
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        alert(`¡Corte Z Nº ${data.cierre.numero_z} emitido con éxito! Caja cerrada.`);
        cargarDatosArqueo();
        cargarCierresHistorial();
        cargarLibroVentas();
      } else {
        alert(data.error || "Fallo en la emisión fiscal");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const ejecutarCierreCaja = async () => {
    if (!arqueo) return;
    setErrorCierreCaja("");
    if (!pinSupervisorCierre.trim()) {
      setErrorCierreCaja("El PIN del Supervisor es requerido");
      return;
    }

    setProcesandoCierreCaja(true);

    try {
      // 1. Verificar PIN
      const pinRes = await apiFetch("/api/usuarios/verificar-pin-supervisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinSupervisorCierre })
      });
      const pinData = await pinRes.json();
      if (!pinRes.ok || !pinData.valido) {
        setErrorCierreCaja(pinData.error || "PIN de Supervisor inválido. Autorización denegada.");
        setProcesandoCierreCaja(false);
        return;
      }

      // 2. Registrar cierre
      const esperadoUsd = arqueo.arqueo_pagos.efectivo_usd;
      const esperadoZelle = arqueo.arqueo_pagos.zelle_usd;
      const esperadoBs = arqueo.arqueo_pagos.efectivo_bs;
      const esperadoPunto = arqueo.arqueo_pagos.punto_bs;
      const esperadoPagoMovil = arqueo.arqueo_pagos.pago_movil_bs;
      const esperadoBinance = arqueo.arqueo_pagos.binance_usd || 0;

      const parsedUsd = parseFloat(contadoUsd) || 0;
      const parsedZelle = parseFloat(contadoZelle) || 0;
      const parsedBinance = parseFloat(contadoBinance) || 0;
      const parsedBs = parseFloat(contadoBs) || 0;
      const parsedPunto = parseFloat(contadoPunto) || 0;
      const parsedPagoMovil = parseFloat(contadoPagoMovil) || 0;

      const difUsd = parsedUsd - esperadoUsd;
      const difZelle = parsedZelle - esperadoZelle;
      const difBinance = parsedBinance - esperadoBinance;
      const difBs = parsedBs - esperadoBs;
      const difPunto = parsedPunto - esperadoPunto;
      const difPagoMovil = parsedPagoMovil - esperadoPagoMovil;

      const response = await apiFetch("/api/cierres-caja/registrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sesionCierre: {
            usuario: typeof window !== "undefined" ? (localStorage.getItem("username") || "cajero") : "cajero",
            tasa: arqueo.tasa_bcv,
            esperado: {
              efectivo_usd: esperadoUsd,
              zelle_usd: esperadoZelle,
              binance_usd: esperadoBinance,
              efectivo_bs: esperadoBs,
              punto_bs: esperadoPunto,
              pago_movil_bs: esperadoPagoMovil
            },
            real: {
              efectivo_usd: parsedUsd,
              zelle_usd: parsedZelle,
              binance_usd: parsedBinance,
              efectivo_bs: parsedBs,
              punto_bs: parsedPunto,
              pago_movil_bs: parsedPagoMovil
            },
            diferencia: {
              efectivo_usd: difUsd,
              zelle_usd: difZelle,
              binance_usd: difBinance,
              efectivo_bs: difBs,
              punto_bs: difPunto,
              pago_movil_bs: difPagoMovil,
              total_usd: difUsd + difZelle + difBinance + (difBs + difPunto + difPagoMovil) / (arqueo.tasa_bcv || 36.5)
            },
            observaciones
          }
        })
      });

      const data = await response.json();
      if (response.ok && data.status === "success") {
        alert("¡Cierre de Caja registrado y guardado con éxito!");
        setContadoUsd("");
        setContadoZelle("");
        setContadoBinance("");
        setContadoBs("");
        setContadoPunto("");
        setContadoPagoMovil("");
        setObservaciones("");
        setPinSupervisorCierre("");
        setMostrarPinModalCierre(false);
        cargarCierresCaja();
      } else {
        setErrorCierreCaja(data.error || "Ocurrió un error al registrar el cierre");
      }
    } catch (err) {
      console.error(err);
      setErrorCierreCaja("Error de conexión al servidor");
    } finally {
      setProcesandoCierreCaja(false);
    }
  };

  const gastosUsd = arqueo?.arqueo_pagos?.gastos_usd || 0;
  const gastosBs = arqueo?.arqueo_pagos?.gastos_bs || 0;

  const esperadoUsd = Math.max(0, (arqueo?.arqueo_pagos?.efectivo_usd || 0) - gastosUsd);
  const esperadoZelle = arqueo?.arqueo_pagos?.zelle_usd || 0;
  const esperadoBinance = arqueo?.arqueo_pagos?.binance_usd || 0;
  const esperadoBs = Math.max(0, (arqueo?.arqueo_pagos?.efectivo_bs || 0) - gastosBs);
  const esperadoPunto = arqueo?.arqueo_pagos?.punto_bs || 0;
  const esperadoPagoMovil = arqueo?.arqueo_pagos?.pago_movil_bs || 0;

  const parsedContadoUsd = parseFloat(contadoUsd) || 0;
  const parsedContadoZelle = parseFloat(contadoZelle) || 0;
  const parsedContadoBinance = parseFloat(contadoBinance) || 0;
  const parsedContadoBs = parseFloat(contadoBs) || 0;
  const parsedContadoPunto = parseFloat(contadoPunto) || 0;
  const parsedContadoPagoMovil = parseFloat(contadoPagoMovil) || 0;

  const difUsd = parsedContadoUsd - esperadoUsd;
  const difZelle = parsedContadoZelle - esperadoZelle;
  const difBinance = parsedContadoBinance - esperadoBinance;
  const difBs = parsedContadoBs - esperadoBs;
  const difPunto = parsedContadoPunto - esperadoPunto;
  const difPagoMovil = parsedContadoPagoMovil - esperadoPagoMovil;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fiscalización y Cierres</h1>
          <p className="text-sm text-slate-500">Corte X, Corte Z, Arqueo de Caja Chica y Libro de Ventas.</p>
        </div>
        
        {/* Botón Salidas Caja Chica, Reporte Corte X & Pestañas Internas */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setMostrarModalCorteX(true)}
            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition cursor-pointer shadow-sm"
            title="Ver o imprimir lectura parcial de turno (Corte X)"
          >
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>Reporte Corte X (Parcial)</span>
          </button>

          <button
            type="button"
            onClick={() => setMostrarModalCajaChica(true)}
            className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition cursor-pointer shadow-sm"
          >
            <WalletCards className="w-4 h-4" />
            <span>Salidas de Caja Chica</span>
          </button>

          <div className="flex bg-slate-100 p-1.5 rounded-2xl text-xs font-bold shrink-0">
            <button
              onClick={() => setPestañaInterna("arqueo")}
              className={`px-4 py-2 rounded-xl transition uppercase ${
                pestañaInterna === "arqueo" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Arqueo & Corte Z
            </button>
            <button
              onClick={() => setPestañaInterna("cierres_turno")}
              className={`px-4 py-2 rounded-xl transition uppercase ${
                pestañaInterna === "cierres_turno" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Cierres de Caja
            </button>
            <button
              onClick={() => setPestañaInterna("libro")}
              className={`px-4 py-2 rounded-xl transition uppercase ${
                pestañaInterna === "libro" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Libro de Ventas
            </button>
            <button
              onClick={() => setPestañaInterna("cierres")}
              className={`px-4 py-2 rounded-xl transition uppercase ${
                pestañaInterna === "cierres" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Cierres Emitidos Z
            </button>
          </div>
        </div>
      </div>

      {/* 1. SECCIÓN DE ARQUEO & CORTE Z */}
      {pestañaInterna === "arqueo" && arqueo && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Métodos de Pago Reales Recibidos */}
          <div className="lg:col-span-8 bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-50 pb-3">
              Arqueo de Valores Recibidos en Caja
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-3xl flex justify-between items-center text-xs">
                <div>
                  <h4 className="font-bold text-slate-700">Efectivo Dólares ($)</h4>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">Recibido en caja fuerte física</p>
                </div>
                <span className="font-black text-slate-900 text-sm">${arqueo.arqueo_pagos.efectivo_usd.toFixed(2)}</span>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-3xl flex justify-between items-center text-xs">
                <div>
                  <h4 className="font-bold text-slate-700">Zelle / Transferencias $</h4>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">Cuentas en el exterior</p>
                </div>
                <span className="font-black text-slate-900 text-sm">${arqueo.arqueo_pagos.zelle_usd.toFixed(2)}</span>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-3xl flex justify-between items-center text-xs">
                <div>
                  <h4 className="font-bold text-slate-700">Binance Pay (USDT / $)</h4>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">Billetera Cripto / Pagos Digitales</p>
                </div>
                <span className="font-black text-amber-600 text-sm">${(arqueo.arqueo_pagos.binance_usd || 0).toFixed(2)}</span>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-3xl flex justify-between items-center text-xs">
                <div>
                  <h4 className="font-bold text-slate-700">Efectivo Bolívares (Bs.)</h4>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">Billetes nacionales</p>
                </div>
                <span className="font-black text-slate-900 text-sm">Bs. {arqueo.arqueo_pagos.efectivo_bs.toFixed(2)}</span>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-3xl flex justify-between items-center text-xs">
                <div>
                  <h4 className="font-bold text-slate-700">Punto de Venta (Bs.)</h4>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">Tarjetas de Débito/Crédito</p>
                </div>
                <span className="font-black text-slate-900 text-sm">Bs. {arqueo.arqueo_pagos.punto_bs.toFixed(2)}</span>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-3xl flex justify-between items-center text-xs">
                <div>
                  <h4 className="font-bold text-slate-700">Pago Móvil (Bs.)</h4>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">Interbancario al instante</p>
                </div>
                <span className="font-black text-slate-900 text-sm">Bs. {arqueo.arqueo_pagos.pago_movil_bs.toFixed(2)}</span>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-3xl flex justify-between items-center text-xs">
                <div>
                  <h4 className="font-bold text-slate-700">Créditos Otorgados ($)</h4>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">Cuentas por cobrar a clientes</p>
                </div>
                <span className="font-black text-slate-900 text-sm">${arqueo.arqueo_pagos.credito_usd.toFixed(2)}</span>
              </div>
              <div className="p-4 bg-rose-50/70 border border-rose-100 rounded-3xl flex justify-between items-center text-xs">
                <div>
                  <h4 className="font-bold text-rose-800">Egresos / Caja Chica (-)</h4>
                  <p className="text-[10px] text-rose-500 mt-1 font-medium">Gastos restados del efectivo</p>
                </div>
                <div className="text-right">
                  <span className="font-black text-rose-600 text-sm">-${(arqueo.arqueo_pagos.gastos_usd || 0).toFixed(2)}</span>
                  <div className="text-[10px] font-mono text-rose-400">Bs. {(arqueo.arqueo_pagos.gastos_bs || 0).toFixed(2)}</div>
                </div>
              </div>
            </div>

            {/* Formulario de Conteo Físico y Conciliación */}
            <div className="border-t border-slate-100 pt-6 space-y-4">
              <div className="flex items-center gap-2 text-indigo-900">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-black uppercase tracking-wider">
                  Conciliación y Conteo Físico de Valores
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                Por favor, cuente físicamente el efectivo y los cierres de cuenta bancaria. Ingrese los montos reales para calcular las diferencias del turno.
              </p>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* EFECTIVO USD */}
                  <div className="space-y-2 bg-slate-50/50 border border-slate-100 p-4 rounded-[1.8rem] transition hover:border-indigo-100">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-700">Efectivo USD ($)</span>
                      <span className="font-mono text-[10px] text-slate-400">Esperado: ${esperadoUsd.toFixed(2)}</span>
                    </div>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={contadoUsd}
                      onChange={(e) => setContadoUsd(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <div className="flex justify-between items-center text-[10px] font-black">
                      <span className="text-slate-400 uppercase tracking-wider">Diferencia:</span>
                      <span className={difUsd === 0 ? "text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg" : difUsd > 0 ? "text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg" : "text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg"}>
                        {difUsd === 0 ? "✓ CUADRADO" : `${difUsd > 0 ? "+" : ""}$${difUsd.toFixed(2)}`}
                      </span>
                    </div>
                  </div>

                  {/* EFECTIVO BS */}
                  <div className="space-y-2 bg-slate-50/50 border border-slate-100 p-4 rounded-[1.8rem] transition hover:border-indigo-100">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-700">Efectivo Bs. (Bs.)</span>
                      <span className="font-mono text-[10px] text-slate-400">Esperado: Bs. {esperadoBs.toFixed(2)}</span>
                    </div>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={contadoBs}
                      onChange={(e) => setContadoBs(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <div className="flex justify-between items-center text-[10px] font-black">
                      <span className="text-slate-400 uppercase tracking-wider">Diferencia:</span>
                      <span className={difBs === 0 ? "text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg" : difBs > 0 ? "text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg" : "text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg"}>
                        {difBs === 0 ? "✓ CUADRADO" : `${difBs > 0 ? "+" : ""}Bs. ${difBs.toFixed(2)}`}
                      </span>
                    </div>
                  </div>

                  {/* ZELLE */}
                  <div className="space-y-2 bg-slate-50/50 border border-slate-100 p-4 rounded-[1.8rem] transition hover:border-indigo-100">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-700">Zelle / Transf. $ ($)</span>
                      <span className="font-mono text-[10px] text-slate-400">Esperado: ${esperadoZelle.toFixed(2)}</span>
                    </div>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={contadoZelle}
                      onChange={(e) => setContadoZelle(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <div className="flex justify-between items-center text-[10px] font-black">
                      <span className="text-slate-400 uppercase tracking-wider">Diferencia:</span>
                      <span className={difZelle === 0 ? "text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg" : difZelle > 0 ? "text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg" : "text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg"}>
                        {difZelle === 0 ? "✓ CUADRADO" : `${difZelle > 0 ? "+" : ""}$${difZelle.toFixed(2)}`}
                      </span>
                    </div>
                  </div>

                  {/* BINANCE */}
                  <div className="space-y-2 bg-slate-50/50 border border-slate-100 p-4 rounded-[1.8rem] transition hover:border-indigo-100">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-700">Binance Pay (USDT/$)</span>
                      <span className="font-mono text-[10px] text-slate-400">Esperado: ${esperadoBinance.toFixed(2)}</span>
                    </div>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={contadoBinance}
                      onChange={(e) => setContadoBinance(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <div className="flex justify-between items-center text-[10px] font-black">
                      <span className="text-slate-400 uppercase tracking-wider">Diferencia:</span>
                      <span className={difBinance === 0 ? "text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg" : difBinance > 0 ? "text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg" : "text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg"}>
                        {difBinance === 0 ? "✓ CUADRADO" : `${difBinance > 0 ? "+" : ""}$${difBinance.toFixed(2)}`}
                      </span>
                    </div>
                  </div>

                  {/* PUNTO DE VENTA */}
                  <div className="space-y-2 bg-slate-50/50 border border-slate-100 p-4 rounded-[1.8rem] transition hover:border-indigo-100">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-700">Punto de Venta (Bs.)</span>
                      <span className="font-mono text-[10px] text-slate-400">Esperado: Bs. {esperadoPunto.toFixed(2)}</span>
                    </div>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={contadoPunto}
                      onChange={(e) => setContadoPunto(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <div className="flex justify-between items-center text-[10px] font-black">
                      <span className="text-slate-400 uppercase tracking-wider">Diferencia:</span>
                      <span className={difPunto === 0 ? "text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg" : difPunto > 0 ? "text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg" : "text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg"}>
                        {difPunto === 0 ? "✓ CUADRADO" : `${difPunto > 0 ? "+" : ""}Bs. ${difPunto.toFixed(2)}`}
                      </span>
                    </div>
                  </div>

                  {/* PAGO MOVIL */}
                  <div className="space-y-2 bg-slate-50/50 border border-slate-100 p-4 rounded-[1.8rem] transition hover:border-indigo-100 col-span-1 md:col-span-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-700">Pago Móvil (Bs.)</span>
                      <span className="font-mono text-[10px] text-slate-400">Esperado: Bs. {esperadoPagoMovil.toFixed(2)}</span>
                    </div>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={contadoPagoMovil}
                      onChange={(e) => setContadoPagoMovil(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <div className="flex justify-between items-center text-[10px] font-black">
                      <span className="text-slate-400 uppercase tracking-wider">Diferencia:</span>
                      <span className={difPagoMovil === 0 ? "text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg" : difPagoMovil > 0 ? "text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg" : "text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg"}>
                        {difPagoMovil === 0 ? "✓ CUADRADO" : `${difPagoMovil > 0 ? "+" : ""}Bs. ${difPagoMovil.toFixed(2)}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* OBSERVACIONES */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                    Observaciones o Justificación de Ajustes (Opcional)
                  </label>
                  <textarea
                    placeholder="Detalle los motivos de cualquier faltante o sobrante..."
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-3 text-xs font-semibold outline-none focus:ring-1 focus:ring-indigo-500 h-20 resize-none"
                  />
                </div>

                {/* BOTÓN REGISTRAR CIERRE */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorCierreCaja("");
                      setPinSupervisorCierre("");
                      setMostrarPinModalCierre(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 hover:scale-[1.02] active:scale-[0.98] text-white font-black px-6 py-4 rounded-2xl text-xs uppercase tracking-wider transition flex items-center gap-2 shadow-md"
                  >
                    🔐 Guardar Reporte Cierre de Caja
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Resumen Fiscal y Gatillo de Cierre */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-slate-100 p-6 rounded-[2.5rem] shadow-sm space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-50 pb-3">
                Pre-Cierre Fiscal (Día Activo)
              </h3>

              <div className="space-y-3.5 text-xs font-semibold text-slate-600">
                {/* Bloque Fiscal */}
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black uppercase tracking-wider text-indigo-600 block">Lote Fiscal (SENIAT)</span>
                  <div className="flex justify-between">
                    <span>Facturas Emitidas:</span>
                    <span className="text-slate-900 font-bold">{arqueo.resumen_fiscal.cantidad_facturas} op.</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Monto Exento:</span>
                    <span className="text-slate-900">${arqueo.resumen_fiscal.monto_exento_usd.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Base Imponible 16%:</span>
                    <span className="text-slate-900">${arqueo.resumen_fiscal.base_imponible_usd.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IVA Recaudado:</span>
                    <span className="text-slate-900">${arqueo.resumen_fiscal.monto_iva_usd.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-amber-600">
                    <span>IGTF 3% Recibido:</span>
                    <span>${arqueo.resumen_fiscal.monto_igtf_usd.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-baseline text-indigo-950 font-bold mt-1">
                    <span>Total Fiscal USD:</span>
                    <span>${arqueo.resumen_fiscal.gran_total_usd.toFixed(2)}</span>
                  </div>
                </div>

                {/* Bloque No Fiscal / Desarrollo */}
                {arqueo.resumen_no_fiscal && arqueo.resumen_no_fiscal.cantidad_notas > 0 && (
                  <div className="border-t border-slate-100 pt-3 space-y-1.5">
                    <span className="text-[9px] font-black uppercase tracking-wider text-amber-600 block">Lote No Fiscal (Desarrollo / Notas)</span>
                    <div className="flex justify-between">
                      <span>Notas de Entrega:</span>
                      <span className="text-slate-900 font-bold">{arqueo.resumen_no_fiscal.cantidad_notas} op.</span>
                    </div>
                    <div className="flex justify-between items-baseline text-amber-950 font-bold">
                      <span>Total Notas USD:</span>
                      <span>${arqueo.resumen_no_fiscal.gran_total_usd.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <hr className="border-slate-100" />
                
                {/* Gran Total General en Caja */}
                <div className="bg-slate-50 p-3.5 rounded-[1.8rem] space-y-1">
                  <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block">Gran Total de Caja (Ambos Lotes)</span>
                  <div className="flex justify-between items-baseline text-slate-900">
                    <span className="text-xs font-bold">Total USD:</span>
                    <span className="text-lg font-black">${(arqueo.resumen_fiscal.gran_total_usd + (arqueo.resumen_no_fiscal?.gran_total_usd || 0)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-baseline text-slate-500">
                    <span className="text-[10px] font-bold">Total Bolívares:</span>
                    <span className="text-sm font-black">Bs. {(arqueo.resumen_fiscal.gran_total_bs + (arqueo.resumen_no_fiscal?.gran_total_bs || 0)).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Acciones de Corte X y Corte Z */}
              <div className="pt-4 space-y-3">
                {/* Botón Corte X (Lectura Parcial) */}
                <div className="bg-indigo-50/70 border border-indigo-200/80 p-3.5 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-indigo-600" />
                      Lectura Parcial (Corte X)
                    </span>
                    <span className="text-[8px] font-bold bg-white text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-200 shadow-2xs">
                      No Cierra Turno
                    </span>
                  </div>
                  <p className="text-[9px] text-indigo-900/80 leading-relaxed font-medium">
                    Audita o imprime el ticket térmico con el acumulado actual de ventas y formas de pago sin afectar la caja activa.
                  </p>
                  <button
                    type="button"
                    onClick={() => setMostrarModalCorteX(true)}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-2.5 rounded-xl text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" /> Ver / Imprimir Corte X
                  </button>
                </div>

                {/* Botón Corte Z (Cierre Fiscal Definitivo) */}
                <div className="space-y-1.5 pt-1">
                  <button
                    onClick={procesarCorteZ}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-3.5 rounded-2xl text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400" /> Emitir Corte Z Diario
                  </button>
                  <p className="text-[9px] text-slate-400 text-center leading-relaxed">
                    Emitir el Corte Z consolidará todas las ventas vigentes de hoy. La numeración Z se incrementará correlativamente para el SENIAT.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. SECCIÓN LIBRO DE VENTAS MENSUAL */}
      {pestañaInterna === "libro" && (
        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-50 pb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Libro de Ventas Fiscales</h3>
              </div>
              <button
                onClick={exportarLibroVentasCSV}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wider py-1.5 px-3.5 rounded-xl transition flex items-center gap-1.5"
                title="Exportar Libro de Cierre (Ventas) a CSV"
              >
                <Download className="w-3.5 h-3.5" /> Exportar CSV
              </button>
            </div>

            {/* Filtros Período */}
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <span>Período:</span>
              <select 
                className="bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-xs outline-none"
                value={mes} 
                onChange={(e) => setMes(e.target.value)}
              >
                <option value="01">Enero</option>
                <option value="02">Febrero</option>
                <option value="03">Marzo</option>
                <option value="04">Abril</option>
                <option value="05">Mayo</option>
                <option value="06">Junio</option>
                <option value="07">Julio</option>
                <option value="08">Agosto</option>
                <option value="09">Septiembre</option>
                <option value="10">Octubre</option>
                <option value="11">Noviembre</option>
                <option value="12">Diciembre</option>
              </select>
              <select
                className="bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-xs outline-none"
                value={anio}
                onChange={(e) => setAnio(e.target.value)}
              >
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>
            </div>
          </div>

          {/* Tabla Libro */}
          <div className="overflow-x-auto rounded-2xl border border-slate-50 bg-slate-50/10">
            <table className="w-full text-left border-collapse text-[10px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black uppercase text-slate-500 tracking-wider">
                  <th className="p-3 pl-4">Op.</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Cédula / RIF</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">N° Fact.</th>
                  <th className="p-3 text-right">Exento ($)</th>
                  <th className="p-3 text-right">Base ($)</th>
                  <th className="p-3 text-right">IVA ($)</th>
                  <th className="p-3 text-right">IGTF ($)</th>
                  <th className="p-3 text-right">Total ($)</th>
                  <th className="p-3 text-right pr-4">Total (Bs)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-semibold text-slate-600">
                {libroVentas.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center text-slate-400 py-12 font-medium text-xs">No hay ventas registradas en el período tributario {mes}/{anio}.</td>
                  </tr>
                ) : (
                  libroVentas.map((v, idx) => (
                    <tr key={v.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-3 pl-4 font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-3">{new Date(v.fecha).toLocaleDateString("es-VE")}</td>
                      <td className="p-3 font-mono">{v.cliente_id}</td>
                      <td className="p-3 truncate max-w-[120px] font-bold text-slate-800">{v.cliente_nombre}</td>
                      <td className="p-3 font-bold text-slate-800">{v.factura_numero}</td>
                      <td className="p-3 text-right font-medium">${v.monto_exento.toFixed(2)}</td>
                      <td className="p-3 text-right font-medium">${v.base_imponible.toFixed(2)}</td>
                      <td className="p-3 text-right font-medium">${v.monto_iva.toFixed(2)}</td>
                      <td className="p-3 text-right font-medium text-amber-600">${v.monto_igtf.toFixed(2)}</td>
                      <td className="p-3 text-right font-black text-slate-800">${v.total_usd.toFixed(2)}</td>
                      <td className="p-3 text-right pr-4 font-bold text-indigo-600">Bs. {v.total_bs.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. SECCIÓN HISTORIAL DE CIERRES Z EMITIDOS */}
      {pestañaInterna === "cierres" && (
        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-50 pb-4">
            <div className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Histórico de Cierres Z Oficiales</h3>
            </div>
            <button
              onClick={exportarCierresZCSV}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wider py-1.5 px-3.5 rounded-xl transition flex items-center gap-1.5"
              title="Exportar Historial de Cierres Z a CSV"
            >
              <Download className="w-3.5 h-3.5" /> Exportar CSV
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-50 bg-slate-50/10">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="p-4 pl-6">N° Reporte Z</th>
                  <th className="p-4">Fecha de Cierre</th>
                  <th className="p-4 text-center">Cant. Ventas</th>
                  <th className="p-4 text-right">Total IVA ($)</th>
                  <th className="p-4 text-right">Total IGTF ($)</th>
                  <th className="p-4 text-right">Total Neto ($)</th>
                  <th className="p-4 text-right pr-6">Total Neto (Bs)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-semibold text-slate-600">
                {cierres.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-slate-400 py-12 font-medium">No se han emitido reportes Z fiscales aún.</td>
                  </tr>
                ) : (
                  cierres.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-4 pl-6 font-black text-slate-800">REPORTE Z-Nº {c.numero_z}</td>
                      <td className="p-4 text-slate-500 font-medium">
                        <div>{c.fecha}</div>
                        <div className="text-[10px] text-slate-400 font-normal">Hora: {c.hora_cierre}</div>
                      </td>
                      <td className="p-4 text-center font-bold text-slate-800">{c.cantidad_ventas} op.</td>
                      <td className="p-4 text-right text-slate-700">${c.total_iva_usd.toFixed(2)}</td>
                      <td className="p-4 text-right text-amber-600">${c.total_igtf_usd.toFixed(2)}</td>
                      <td className="p-4 text-right font-black text-slate-900">${c.gran_total_usd.toFixed(2)}</td>
                      <td className="p-4 text-right pr-6 font-bold text-indigo-600">Bs. {c.gran_total_bs.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. SECCIÓN HISTORIAL DE CIERRES DE CAJA (TURNOS) */}
      {pestañaInterna === "cierres_turno" && (
        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-50 pb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Historial de Cierres de Turno (Caja)</h3>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-50 bg-slate-50/10">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="p-4 pl-6">Fecha / Turno</th>
                  <th className="p-4">Cajero</th>
                  <th className="p-4 text-right">Efectivo USD (Esperado vs Real)</th>
                  <th className="p-4 text-right">Efectivo Bs (Esperado vs Real)</th>
                  <th className="p-4 text-right">Zelle (Esperado vs Real)</th>
                  <th className="p-4 text-right">Diferencia Total USD</th>
                  <th className="p-4 pr-6">Observaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-semibold text-slate-600">
                {cierresCajaList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-slate-400 py-12 font-medium">No hay cierres de caja registrados aún en este tenant.</td>
                  </tr>
                ) : (
                  cierresCajaList.map((c) => {
                    const difTotal = c.diferencia?.total_usd || 0;
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/50 transition">
                        <td className="p-4 pl-6">
                          <div className="font-bold text-slate-800">{new Date(c.fecha).toLocaleDateString("es-VE")}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{new Date(c.fecha).toLocaleTimeString("es-VE")}</div>
                        </td>
                        <td className="p-4 text-slate-700 capitalize">{c.usuario}</td>
                        <td className="p-4 text-right">
                          <div className="text-slate-400 font-normal">Sist: ${c.esperado?.efectivo_usd?.toFixed(2)}</div>
                          <div className="font-bold text-slate-900">Real: ${c.real?.efectivo_usd?.toFixed(2)}</div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="text-slate-400 font-normal">Sist: Bs. {c.esperado?.efectivo_bs?.toFixed(2)}</div>
                          <div className="font-bold text-slate-900">Real: Bs. {c.real?.efectivo_bs?.toFixed(2)}</div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="text-slate-400 font-normal">Sist: ${c.esperado?.zelle_usd?.toFixed(2)}</div>
                          <div className="font-bold text-slate-900">Real: ${c.real?.zelle_usd?.toFixed(2)}</div>
                        </td>
                        <td className="p-4 text-right">
                          <span className={`inline-block font-black text-xs px-2.5 py-1 rounded-xl ${difTotal === 0 ? "text-emerald-700 bg-emerald-50" : difTotal > 0 ? "text-indigo-700 bg-indigo-50" : "text-rose-700 bg-rose-50"}`}>
                            {difTotal === 0 ? "Cuadrado" : `${difTotal > 0 ? "+" : ""}$${difTotal.toFixed(2)}`}
                          </span>
                        </td>
                        <td className="p-4 pr-6 text-slate-500 font-medium max-w-[200px] truncate" title={c.observaciones}>
                          {c.observaciones || <span className="text-slate-300 font-normal italic">Sin comentarios</span>}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL AUTORIZACIÓN PIN SUPERVISOR PARA CIERRE DE CAJA */}
      {mostrarPinModalCierre && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2.5rem] p-6 max-w-sm w-full border border-slate-100 shadow-xl space-y-4"
          >
            <div className="text-center space-y-1">
              <span className="text-2xl">🔐</span>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">Autorización de Supervisor</h3>
              <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                Se requiere el PIN de un supervisor o administrador para registrar y firmar oficialmente este cierre de caja.
              </p>
            </div>

            {errorCierreCaja && (
              <div className="bg-rose-50 border border-rose-100 text-rose-700 px-3.5 py-2 rounded-2xl text-[10px] font-bold text-center">
                ⚠️ {errorCierreCaja}
              </div>
            )}

            <div className="space-y-1 bg-indigo-50/50 border border-indigo-100 p-3.5 rounded-3xl">
              <input
                type="password"
                maxLength={8}
                placeholder="••••"
                value={pinSupervisorCierre}
                onChange={(e) => setPinSupervisorCierre(e.target.value)}
                className="w-full text-center tracking-widest text-lg font-black bg-white border border-indigo-200 text-indigo-950 rounded-2xl py-2 px-4 focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-300"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setMostrarPinModalCierre(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-xs uppercase py-3.5 rounded-2xl transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={procesandoCierreCaja}
                onClick={ejecutarCierreCaja}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-black text-xs uppercase py-3.5 rounded-2xl transition disabled:opacity-50"
              >
                {procesandoCierreCaja ? "Autorizando..." : "Autorizar"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal Salidas de Caja Chica */}
      <ModalCajaChica
        isOpen={mostrarModalCajaChica}
        onClose={() => {
          setMostrarModalCajaChica(false);
          cargarDatosArqueo();
        }}
        tasa={arqueo?.tasa_bcv || 36.50}
        onGastoRegistrado={() => {
          cargarDatosArqueo();
        }}
      />

      {/* Modal Reporte Corte X (Lectura Parcial de Turno) */}
      <ModalCorteX
        isOpen={mostrarModalCorteX}
        onClose={() => setMostrarModalCorteX(false)}
        datosExternos={arqueo ? { 
          arqueo_pagos: arqueo.arqueo_pagos, 
          resumen_fiscal: arqueo.resumen_fiscal, 
          resumen_no_fiscal: arqueo.resumen_no_fiscal 
        } : undefined}
      />
    </div>
  );
}
