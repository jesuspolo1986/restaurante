import React, { useState, useEffect } from "react";
import { QrCode, Smartphone, Wifi, Copy, Check, ShieldAlert, Monitor, RefreshCw, X, HelpCircle, Globe, AlertTriangle, Edit3, Download, Terminal, Lock, FileText, Zap } from "lucide-react";
import { apiFetch } from "../utils/api";
import { generarManualInstalacionPDF } from "../utils/generarManualPDF";

interface RedInfo {
  hostname: string;
  primaryIp: string;
  ips: string[];
  port: number;
  isCloud: boolean;
  cloudUrl: string | null;
  urls: {
    byIp: string;
    byName: string;
    byLocal: string;
    cloud: string | null;
  };
  qrDataUrlPrimary: string;
  qrDataUrlHostname: string;
  qrDataUrlCloud: string | null;
}

interface Props {
  onClose: () => void;
}

export default function ModalRedConexion({ onClose }: Props) {
  const [info, setInfo] = useState<RedInfo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [pestanaGuia, setPestanaGuia] = useState<"qr" | "cloudflare" | "tailscale" | "instrucciones" | "script-ip" | "router" | "firewall">("qr");
  const [modoQr, setModoQr] = useState<"cloud" | "local">("cloud");
  const [ipPersonalizada, setIpPersonalizada] = useState<string>("");
  const [urlTunelCustom, setUrlTunelCustom] = useState<string>("");
  const [qrTunelCustom, setQrTunelCustom] = useState<string | null>(null);

  useEffect(() => {
    cargarInfoRed();
  }, []);

  const cargarInfoRed = async (ipTarget?: string) => {
    setCargando(true);
    try {
      const url = ipTarget ? `/api/red-info?customIp=${encodeURIComponent(ipTarget)}` : "/api/red-info";
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        setInfo(data);
        if (!ipPersonalizada && data.primaryIp) {
          setIpPersonalizada(data.primaryIp);
        }
        if (data.isCloud && data.cloudUrl) {
          setModoQr("cloud");
        } else {
          setModoQr("local");
        }
      }
    } catch (err) {
      console.error("Error al obtener información de red local:", err);
    } finally {
      setCargando(false);
    }
  };

  const aplicarIpPersonalizada = () => {
    if (ipPersonalizada.trim()) {
      cargarInfoRed(ipPersonalizada.trim());
    }
  };

  const copiarAlPortapapeles = (texto: string, clave: string) => {
    navigator.clipboard.writeText(texto);
    setCopiado(clave);
    setTimeout(() => setCopiado(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden relative flex flex-col max-h-[92vh]">
        
        {/* Cabecera */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-5 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2.5 rounded-2xl backdrop-blur-md">
              <Wifi className="w-6 h-6 text-indigo-300 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">Conexión de Celulares, Tablets y PCs</h3>
              <p className="text-xs text-indigo-200/80 font-medium">
                Conecte sus dispositivos en tiempo real al servidor <span className="font-bold text-white bg-indigo-700/60 px-1.5 py-0.5 rounded uppercase tracking-wider">{info?.hostname || "Servidor"}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={generarManualInstalacionPDF}
              className="hidden sm:flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer border border-indigo-400/30"
              title="Descargar Manual Completo de Instalación y Multi-Sucursal en PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Manual PDF</span>
            </button>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Pestañas de Navegación del Modal */}
        <div className="flex border-b border-slate-100 bg-slate-50/80 p-1.5 gap-1 shrink-0 overflow-x-auto">
          <button
            onClick={() => setPestanaGuia("qr")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
              pestanaGuia === "qr"
                ? "bg-white text-indigo-900 shadow-xs border border-slate-200"
                : "text-slate-600 hover:bg-slate-200/60"
            }`}
          >
            <QrCode className="w-4 h-4 text-indigo-600" />
            <span>Código QR y Enlaces</span>
          </button>
          <button
            onClick={() => setPestanaGuia("cloudflare")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
              pestanaGuia === "cloudflare"
                ? "bg-white text-amber-900 shadow-xs border border-amber-200"
                : "text-slate-600 hover:bg-slate-200/60"
            }`}
          >
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Túnel Web (QR Directo)</span>
          </button>
          <button
            onClick={() => setPestanaGuia("tailscale")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
              pestanaGuia === "tailscale"
                ? "bg-white text-indigo-900 shadow-xs border border-slate-200"
                : "text-slate-600 hover:bg-slate-200/60"
            }`}
          >
            <Globe className="w-4 h-4 text-sky-600" />
            <span>Tailscale</span>
          </button>
          <button
            onClick={() => setPestanaGuia("script-ip")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
              pestanaGuia === "script-ip"
                ? "bg-white text-indigo-900 shadow-xs border border-slate-200"
                : "text-slate-600 hover:bg-slate-200/60"
            }`}
          >
            <Terminal className="w-4 h-4 text-indigo-600" />
            <span>Script IP Estática (.bat)</span>
          </button>
          <button
            onClick={() => setPestanaGuia("instrucciones")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
              pestanaGuia === "instrucciones"
                ? "bg-white text-indigo-900 shadow-xs border border-slate-200"
                : "text-slate-600 hover:bg-slate-200/60"
            }`}
          >
            <Smartphone className="w-4 h-4 text-emerald-600" />
            <span>Guía Celulares</span>
          </button>
          <button
            onClick={() => setPestanaGuia("router")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
              pestanaGuia === "router"
                ? "bg-white text-indigo-900 shadow-xs border border-slate-200"
                : "text-slate-600 hover:bg-slate-200/60"
            }`}
          >
            <Wifi className="w-4 h-4 text-amber-600" />
            <span>Reserva en Router</span>
          </button>
          <button
            onClick={() => setPestanaGuia("firewall")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
              pestanaGuia === "firewall"
                ? "bg-white text-indigo-900 shadow-xs border border-slate-200"
                : "text-slate-600 hover:bg-slate-200/60"
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>Firewall / Puerto 3000</span>
          </button>
        </div>

        {/* Cuerpo del Modal con scroll */}
        <div className="p-6 overflow-y-auto space-y-5">
          {cargando ? (
            <div className="py-12 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-500">Detectando red local y generando código QR...</p>
            </div>
          ) : !info ? (
            <p className="text-center text-xs text-rose-600 py-6 font-bold">Error al cargar datos de la red local.</p>
          ) : pestanaGuia === "qr" ? (
            <div className="space-y-5">

              {/* Selector si existe URL Cloud, o Vista Directa Local */}
              {info.cloudUrl ? (
                <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
                  <button
                    type="button"
                    onClick={() => setModoQr("cloud")}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                      modoQr === "cloud"
                        ? "bg-emerald-600 text-white shadow-md"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Globe className="w-4 h-4" />
                    <span>1. QR Web / Nube (Prueba Celular Ahora)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoQr("local")}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                      modoQr === "local"
                        ? "bg-indigo-900 text-white shadow-md"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Monitor className="w-4 h-4" />
                    <span>2. QR Servidor Local PC ({info.hostname})</span>
                  </button>
                </div>
              ) : null}

              {modoQr === "cloud" && info.cloudUrl ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-5 space-y-4">
                  <div className="flex items-center gap-2 text-emerald-900">
                    <Globe className="w-5 h-5 text-emerald-600" />
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider">Acceso Directo desde tu Celular AHORA MISMO</h4>
                      <p className="text-[11px] text-emerald-700 font-medium">
                        Usa este código QR para ingresar inmediatamente desde tu celular o tablet (3G, 4G, 5G o Wi-Fi) sin errores de red.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row items-center gap-5 bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs">
                    {info.qrDataUrlCloud ? (
                      <img
                        src={info.qrDataUrlCloud}
                        alt="Código QR de Acceso Web Nube"
                        className="w-44 h-44 rounded-xl border-2 border-emerald-200 shadow-sm shrink-0"
                      />
                    ) : null}
                    <div className="space-y-3 w-full">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">URL Pública Completa:</span>
                        <div className="flex items-center gap-2 bg-slate-900 text-emerald-400 p-2.5 rounded-xl font-mono text-xs font-bold overflow-x-auto select-all">
                          <span className="shrink-0">{info.cloudUrl}</span>
                          <button
                            onClick={() => copiarAlPortapapeles(info.cloudUrl!, "cloud")}
                            className="ml-auto bg-emerald-600 hover:bg-emerald-500 text-white p-1.5 rounded-lg text-[10px] font-sans font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
                          >
                            {copiado === "cloud" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiado === "cloud" ? "¡Copiado!" : "Copiar"}</span>
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                        💡 <strong>Escanea con la cámara de tu teléfono</strong>. Esta URL funciona desde cualquier lugar sin depender de la red local del router.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  {/* Código QR Local */}
                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 text-center space-y-3 flex flex-col items-center justify-center">
                    <span className="bg-indigo-100 text-indigo-900 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                      QR Red Local Wi-Fi
                    </span>
                    {info.qrDataUrlPrimary ? (
                      <img
                        src={info.qrDataUrlPrimary}
                        alt="Código QR de Acceso Red Local"
                        className="w-48 h-48 rounded-2xl border-4 border-white shadow-md"
                      />
                    ) : (
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(info.urls.byIp)}`}
                        alt="Código QR de Acceso Red Local"
                        className="w-48 h-48 rounded-2xl border-4 border-white shadow-md"
                      />
                    )}
                    <p className="text-[11px] text-slate-600 font-bold font-mono bg-white px-3 py-1 rounded-lg border border-slate-200">
                      {info.urls.byIp}
                    </p>
                  </div>

                  {/* Configuración IP Local */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                        Dirección IP de la PC Servidor ({info.hostname})
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Si la PC Polo tiene una IP distinta en la red Wi-Fi (ej. 192.168.1.15), escríbala aquí para actualizar el Código QR:
                      </p>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={ipPersonalizada}
                          onChange={(e) => setIpPersonalizada(e.target.value)}
                          placeholder="Ej: 192.168.1.15"
                          className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          onClick={aplicarIpPersonalizada}
                          className="bg-indigo-900 hover:bg-indigo-800 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Actualizar QR</span>
                        </button>
                      </div>
                    </div>

                    {/* Direcciones alternativas */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Otras URLs Locales:</span>
                      
                      <div className="bg-indigo-50 border border-indigo-200 p-2.5 rounded-xl flex justify-between items-center text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-indigo-900 uppercase block">Nombre mDNS:</span>
                          <span className="font-mono font-bold text-indigo-950">{info.urls.byLocal}</span>
                        </div>
                        <button
                          onClick={() => copiarAlPortapapeles(info.urls.byLocal, "local")}
                          className="bg-indigo-600 text-white p-1.5 rounded-lg text-[10px] font-bold"
                        >
                          {copiado === "local" ? "¡Copiado!" : "Copiar"}
                        </button>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl flex justify-between items-center text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-slate-600 uppercase block">Nombre Windows NetBIOS:</span>
                          <span className="font-mono font-bold text-slate-800">{info.urls.byName}</span>
                        </div>
                        <button
                          onClick={() => copiarAlPortapapeles(info.urls.byName, "name")}
                          className="bg-slate-200 text-slate-800 p-1.5 rounded-lg text-[10px] font-bold"
                        >
                          {copiado === "name" ? "¡Copiado!" : "Copiar"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Nota Explicativa sobre Error -118 */}
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block">¿Por qué dio Error "-118" (No responde) al escanear?</span>
                  <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                    Ocurre por 2 razones: 1) Si estás probando la vista previa desde Internet/Nube, la IP local <code className="bg-amber-100 px-1 rounded font-mono font-bold">10.x.x.x</code> es interna de la nube. Usa la opción verde <strong>"1. QR Web / Nube"</strong> arriba. 2) Si estás en tu taller físico, el <strong>Firewall de Windows</strong> en la PC Polo debe tener el puerto 3000 habilitado (mira la pestaña <i>"Error -118 / Firewall"</i>).
                  </p>
                </div>
              </div>

            </div>
          ) : pestanaGuia === "cloudflare" ? (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white p-4 rounded-2xl space-y-1.5 shadow-md">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-200" />
                  <h4 className="text-xs font-black uppercase tracking-wider">Túnel Web 100% Automático (Sin Apps ni Cuentas)</h4>
                </div>
                <p className="text-xs text-amber-50 leading-relaxed font-medium">
                  Crea un enlace web cifrado y seguro en <strong>HTTPS</strong> que abre el sistema en cualquier celular, tablet o PC escaneando un Código QR con la cámara normal del teléfono.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4 shadow-xs">
                <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-amber-600" />
                  Paso 1: Iniciar el Túnel en tu PC Servidor
                </h5>
                <p className="text-xs text-slate-600">
                  En la carpeta de tu sistema POS, simplemente haz doble clic en el archivo:
                </p>
                <div className="bg-slate-900 text-amber-400 p-3 rounded-xl font-mono text-xs font-bold flex justify-between items-center">
                  <span>Activar_Tunel_Web_Celulares.bat</span>
                  <span className="text-[10px] text-slate-400 font-sans font-normal">Incluido en la carpeta</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Aparecerá una ventana que mostrará tu enlace seguro de Cloudflare (ejemplo: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-800">https://mi-tienda-123.trycloudflare.com</code>).
                </p>
              </div>

              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-3">
                <h5 className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-amber-700" />
                  Paso 2: Pegar tu enlace aquí para generar el Código QR
                </h5>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Pega aquí el enlace: https://....trycloudflare.com"
                    value={urlTunelCustom}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      setUrlTunelCustom(val);
                      if (val.startsWith("http")) {
                        setQrTunelCustom(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(val)}`);
                      } else {
                        setQrTunelCustom(null);
                      }
                    }}
                    className="flex-1 bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {qrTunelCustom && (
                  <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-xl border border-amber-200 shadow-xs animate-in fade-in duration-300">
                    <img
                      src={qrTunelCustom}
                      alt="QR Cloudflare Tunnel"
                      className="w-36 h-36 rounded-lg border border-amber-300 shadow-xs"
                    />
                    <div className="space-y-2 text-xs">
                      <span className="font-black text-emerald-700 uppercase block">¡Código QR Listo para Escanear!</span>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        Cualquier persona en la tienda puede escanear este código con su celular para facturar o consultar inventario al instante.
                      </p>
                      <button
                        onClick={() => copiarAlPortapapeles(urlTunelCustom, "tunel")}
                        className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        {copiado === "tunel" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiado === "tunel" ? "¡Enlace Copiado!" : "Copiar Enlace"}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : pestanaGuia === "tailscale" ? (
            <div className="space-y-4">
              <div className="bg-sky-50 border border-sky-200 p-4 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-sky-950">
                  <Globe className="w-5 h-5 text-sky-600" />
                  <h4 className="text-xs font-black uppercase tracking-wider">¿Por qué Tailscale es la solución definitiva "Cero Trabas"?</h4>
                </div>
                <p className="text-xs text-sky-900 leading-relaxed font-medium">
                  Tailscale crea una <strong>red privada cifrada directa</strong> entre tu PC Servidor, las cajas registradoras y tus celulares. Se salta automáticamente firewalls de Windows, antivirus, routers bloqueados y permite que el dueño vea las ventas en tiempo real <strong>incluso fuera del negocio o desde su casa</strong>.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">Pasos de Configuración Rápida (3 Minutos):</h5>
                
                <div className="space-y-3 text-xs text-slate-600">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-800 font-black flex items-center justify-center text-[11px] shrink-0 mt-0.5">1</span>
                    <div>
                      <strong className="text-slate-800">En la PC Servidor:</strong>
                      <p>Descarga e instala Tailscale gratis desde <a href="https://tailscale.com/download" target="_blank" rel="noreferrer" className="text-sky-600 font-bold underline">tailscale.com/download</a> e inicia sesión con Google/Gmail.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-800 font-black flex items-center justify-center text-[11px] shrink-0 mt-0.5">2</span>
                    <div>
                      <strong className="text-slate-800">Copia la IP Fija de Tailscale:</strong>
                      <p>Tailscale le asignará a tu servidor una IP que empieza por <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold text-slate-900">100.x.y.z</code> (esta IP <strong>nunca cambia</strong>).</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-800 font-black flex items-center justify-center text-[11px] shrink-0 mt-0.5">3</span>
                    <div>
                      <strong className="text-slate-800">En las otras PCs o Celulares:</strong>
                      <p>Instala la App de Tailscale, inicia sesión con la <strong>misma cuenta</strong>, y abre en el navegador la dirección:</p>
                      <div className="mt-1 bg-slate-900 text-emerald-400 p-2 rounded-xl font-mono text-xs font-bold">
                        http://100.x.y.z:3000
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl text-xs text-emerald-900 space-y-1">
                <span className="font-bold block flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  Ventaja Insuperable:
                </span>
                <p className="text-[11px] text-emerald-800 font-medium">
                  No necesitas abrir puertos en el router del cliente, no importa si el Wi-Fi tiene aislamiento, ni si Windows está en red pública. ¡Conecta siempre a la primera!
                </p>
              </div>
            </div>
          ) : pestanaGuia === "instrucciones" ? (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl space-y-2">
                <h4 className="text-xs font-black text-amber-900 uppercase flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-amber-600" />
                  ¿Por qué los teléfonos Android no encuentran el nombre "Polo"?
                </h4>
                <p className="text-xs text-amber-800 leading-relaxed font-medium">
                  Por diseño de Google, Android busca los nombres como <code className="bg-amber-100 px-1 rounded font-bold">http://Polo</code> o <code className="bg-amber-100 px-1 rounded font-bold">http://Polo.local</code> directamente en Google DNS (<code className="bg-amber-100 px-1 rounded font-bold">8.8.8.8</code>) en lugar de consultar la red Wi-Fi local.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Pasos para activar el acceso por Nombre en tu Celular Android:</h4>
                
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5 text-xs text-slate-700">
                  <p className="font-bold text-indigo-900 flex items-center gap-1">
                    <span className="bg-indigo-600 text-white rounded-full w-5 h-5 inline-flex items-center justify-center text-[10px]">1</span>
                    Abre Chrome en tu teléfono celular
                  </p>
                  <p className="text-slate-600 pl-6">Ve a <strong>Ajustes / Configuración</strong> (los tres puntos arriba a la derecha).</p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5 text-xs text-slate-700">
                  <p className="font-bold text-indigo-900 flex items-center gap-1">
                    <span className="bg-indigo-600 text-white rounded-full w-5 h-5 inline-flex items-center justify-center text-[10px]">2</span>
                    Entra en "Privacidad y Seguridad"
                  </p>
                  <p className="text-slate-600 pl-6">Busca la opción llamada <strong>"Usar DNS seguro"</strong> o <strong>"DNS Privado"</strong>.</p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5 text-xs text-slate-700">
                  <p className="font-bold text-indigo-900 flex items-center gap-1">
                    <span className="bg-indigo-600 text-white rounded-full w-5 h-5 inline-flex items-center justify-center text-[10px]">3</span>
                    Cámbiala a "Desactivado" o "Usar proveedor actual"
                  </p>
                  <p className="text-slate-600 pl-6">Esto obliga al navegador a consultar el nombre local <code className="bg-slate-200 px-1 rounded font-bold text-indigo-900">http://Polo.local:3000</code> en tu router en lugar de enviarlo a Internet.</p>
                </div>
              </div>
            </div>
          ) : pestanaGuia === "script-ip" ? (
            <div className="space-y-4">
              {/* Tarjeta Destacada de Descarga */}
              <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white p-5 rounded-3xl space-y-3 shadow-md">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="bg-indigo-500/40 text-indigo-200 text-[10px] font-black uppercase px-2 py-0.5 rounded-md font-mono">
                      Automatización Windows (.BAT)
                    </span>
                    <h4 className="text-sm font-black uppercase tracking-tight">
                      Fijador Automático de IP Estática y Firewall
                    </h4>
                    <p className="text-xs text-indigo-200/90 leading-relaxed">
                      Ejecuta este archivo en la computadora servidor para que nunca cambie de IP al reiniciar el router o la PC.
                    </p>
                  </div>
                  <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md shrink-0">
                    <Terminal className="w-6 h-6 text-indigo-300" />
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <a
                    href="/api/descargar-script-ip"
                    download="fijar_ip_estatica.bat"
                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs px-4 py-2.5 rounded-2xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-slate-950" />
                    <span>Descargar Script fijar_ip_estatica.bat</span>
                  </a>

                  <button
                    onClick={() => copiarAlPortapapeles("fijar_ip_estatica.bat", "archivo_bat")}
                    className="bg-white/15 hover:bg-white/25 text-white font-bold text-xs px-3 py-2 rounded-2xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copiado === "archivo_bat" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiado === "archivo_bat" ? "¡Nombre Copiado!" : "Copiar Nombre"}</span>
                  </button>
                </div>
              </div>

              {/* Guía de 3 pasos */}
              <div className="space-y-2.5 text-xs text-slate-700">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1">
                  <p className="font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black">1</span>
                    Descargar o Ubicar el Archivo
                  </p>
                  <p className="text-slate-600 pl-7">
                    Descarga el archivo con el botón verde superior o ubícalo en la carpeta principal de Elena PRO con el nombre <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono font-bold text-slate-800">fijar_ip_estatica.bat</code>.
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1">
                  <p className="font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black">2</span>
                    Ejecutar como Administrador
                  </p>
                  <p className="text-slate-600 pl-7">
                    Haz clic derecho sobre <code className="bg-slate-200 px-1 rounded font-mono font-bold text-slate-800">fijar_ip_estatica.bat</code> y selecciona <strong>"Ejecutar como Administrador"</strong>. El script detectará tu tarjeta de red (Wi-Fi o Cable Ethernet).
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1">
                  <p className="font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black">3</span>
                    Seleccionar Opción [1] y Listo
                  </p>
                  <p className="text-slate-600 pl-7">
                    Presiona el número <strong>1</strong> en tu teclado. El asistente convertirá tu IP actual en estática, configurará los DNS de Google (<code className="bg-slate-200 px-1 rounded font-mono">8.8.8.8</code>) y abrirá el puerto 3000 en el Firewall de Windows automáticamente.
                  </p>
                </div>
              </div>

              {/* Comando de Respaldo */}
              <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl space-y-2 font-mono text-xs">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="text-[10px] text-slate-400 uppercase font-sans font-bold">Comando Rápido por Consola (CMD como Admin)</span>
                  <button
                    onClick={() => copiarAlPortapapeles(`netsh interface ipv4 set address name="Ethernet" static ${info?.primaryIp || "192.168.1.100"} 255.255.255.0 192.168.1.1 1 & netsh advfirewall firewall add rule name="ElenaPRO_Port3000" dir=in action=allow protocol=TCP localport=3000`, "cmd_full")}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-md text-[10px] font-sans font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    {copiado === "cmd_full" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiado === "cmd_full" ? "¡Copiado!" : "Copiar Comando"}</span>
                  </button>
                </div>
                <p className="text-emerald-400 select-all break-all text-[11px]">
                  netsh interface ipv4 set address name="Ethernet" static {info?.primaryIp || "192.168.1.100"} 255.255.255.0 192.168.1.1 1 & netsh advfirewall firewall add rule name="ElenaPRO_Port3000" dir=in action=allow protocol=TCP localport=3000
                </p>
              </div>
            </div>
          ) : pestanaGuia === "router" ? (
            <div className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-2xl space-y-2">
                <h4 className="text-xs font-black text-indigo-950 uppercase flex items-center gap-1.5">
                  <Wifi className="w-4 h-4 text-indigo-600" />
                  Solución Definitiva para Clientes: Reserva DHCP en Router
                </h4>
                <p className="text-xs text-indigo-900 leading-relaxed font-medium">
                  Para no tener problemas cuando cambia la IP del equipo ni tocar la configuración de red de Windows en la PC del cliente, la mejor práctica en redes comerciales es la <strong>Reserva de IP por MAC en el Router</strong>.
                </p>
              </div>

              <div className="space-y-3 text-xs text-slate-700">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-900">¿Cómo funciona?</span>
                  <p className="text-slate-600">
                    El router seguirá asignando la IP automáticamente (DHCP), pero reconoce la tarjeta de red de la PC <strong className="text-indigo-900">{info?.hostname || "Servidor"}</strong> y siempre le entrega la misma IP (ej: <code className="bg-slate-200 px-1 rounded font-bold">192.168.1.15</code>), sin importar cuántas veces se corte la luz o se reinicie el router.
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-900">Pasos breves para el técnico o cliente:</span>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1">
                    <li>Entrar a la administración del Router (generalmente <code className="bg-slate-200 px-1 rounded">192.168.1.1</code> o <code className="bg-slate-200 px-1 rounded">192.168.0.1</code>).</li>
                    <li>Ir al menú <strong>DHCP Server / Address Reservation (Reserva de Direcciones)</strong>.</li>
                    <li>Seleccionar el equipo <strong className="text-indigo-900">{info?.hostname || "Polo"}</strong> o ingresar su dirección MAC.</li>
                    <li>Guardar cambios. ¡La IP quedará congelada para siempre en ese router sin fallas!</li>
                  </ol>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl space-y-2">
                <h4 className="text-xs font-black text-rose-950 uppercase flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  Solución al Error -118: Apertura del Puerto 3000 en Windows Firewall
                </h4>
                <p className="text-xs text-rose-900 leading-relaxed font-medium">
                  El mensaje <strong>"Error -118 / No responde"</strong> al intentar ingresar desde un celular o tablet en la red local ocurre cuando el Firewall de la PC <strong className="text-rose-950">{info?.hostname || "Polo"}</strong> bloquea las conexiones entrantes al puerto 3000.
                </p>
              </div>

              <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl space-y-2 font-mono text-xs">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="text-[10px] text-slate-400 uppercase font-sans font-bold">Comando de 1 Clic para CMD (Administrador)</span>
                  <button
                    onClick={() => copiarAlPortapapeles('netsh advfirewall firewall add rule name="ElenaPRO_Port3000" dir=in action=allow protocol=TCP localport=3000', "cmd")}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-md text-[10px] font-sans font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    {copiado === "cmd" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiado === "cmd" ? "¡Copiado!" : "Copiar Comando"}</span>
                  </button>
                </div>
                <p className="text-emerald-400 select-all break-all">
                  netsh advfirewall firewall add rule name="ElenaPRO_Port3000" dir=in action=allow protocol=TCP localport=3000
                </p>
              </div>

              <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-800">¿Cómo ejecutarlo en la PC {info?.hostname}?</p>
                <p>1. En la PC Polo, presione la tecla <kbd className="bg-slate-200 px-1 rounded font-bold">Inicio</kbd>, escriba <strong>cmd</strong>, haga clic derecho y seleccione <strong>"Ejecutar como Administrador"</strong>.</p>
                <p>2. Pegue el comando anterior y presione <kbd className="bg-slate-200 px-1 rounded font-bold">Enter</kbd>.</p>
                <p>3. ¡Refresque la pantalla en su celular y el error -118 desaparecerá al instante!</p>
              </div>
            </div>
          )}
        </div>

        {/* Pie de modal */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0">
          <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Servidor escuchando en puerto <strong className="text-slate-800">3000</strong></span>
          </div>
          <button
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
