import React, { useState, useEffect } from "react";
import {
  Cloud,
  CloudUpload,
  CloudDownload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileJson,
  ShieldCheck,
  HardDrive,
  Database,
  ExternalLink,
  Lock,
  Calendar,
  Layers,
  ArrowUpRight,
  Download
} from "lucide-react";
import { apiFetch } from "../utils/api";

interface CloudBackup {
  name: string;
  id?: string;
  created_at?: string;
  updated_at?: string;
  sizeBytes?: number;
  empresa_id: string;
  tipo: string;
  storagePath: string;
}

interface SupabaseSettings {
  url: string;
  key: string;
  bucket: string;
  autoUploadOnBackup: boolean;
  retentionDays: number;
}

export default function SupabaseBackupPanel() {
  const [settings, setSettings] = useState<SupabaseSettings>({
    url: "https://nhbdegzkbjvesccthlxg.supabase.co",
    key: "",
    bucket: "backups-elena",
    autoUploadOnBackup: true,
    retentionDays: 30
  });

  const [cloudBackups, setCloudBackups] = useState<CloudBackup[]>([]);
  const [cargandoLista, setCargandoLista] = useState(false);
  const [subiendoNube, setSubiendoNube] = useState(false);
  const [probandoConexion, setProbandoConexion] = useState(false);
  const [guardandoConfig, setGuardandoConfig] = useState(false);
  const [restaurandoPath, setRestaurandoPath] = useState<string | null>(null);

  const [mensaje, setMensaje] = useState<{
    tipo: "exito" | "error" | "info";
    texto: string;
  } | null>(null);

  const cargarDatosSupabase = async () => {
    setCargandoLista(true);
    try {
      // 1. Cargar Configuración
      const resConfig = await apiFetch("/api/supabase/settings");
      if (resConfig.ok) {
        const data = await resConfig.json();
        setSettings(data);
      }

      // 2. Cargar Lista de Respaldos en la Nube
      const resBackups = await apiFetch("/api/supabase/backups");
      if (resBackups.ok) {
        const list = await resBackups.json();
        setCloudBackups(list);
      }
    } catch (err) {
      console.error("Error cargando datos de Supabase:", err);
    } finally {
      setCargandoLista(false);
    }
  };

  useEffect(() => {
    cargarDatosSupabase();
  }, []);

  const probarConexion = async () => {
    setProbandoConexion(true);
    setMensaje(null);
    try {
      const res = await apiFetch("/api/supabase/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.success) {
        setMensaje({ tipo: "exito", texto: data.message });
      } else {
        setMensaje({ tipo: "error", texto: data.message || "Error al conectar con Supabase." });
      }
    } catch (err) {
      setMensaje({ tipo: "error", texto: "Error de conexión con el servidor local." });
    } finally {
      setProbandoConexion(false);
    }
  };

  const guardarConfiguracion = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoConfig(true);
    setMensaje(null);
    try {
      const res = await apiFetch("/api/supabase/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        setMensaje({ tipo: "exito", texto: "Configuración de Supabase actualizada exitosamente." });
        cargarDatosSupabase();
      } else {
        const data = await res.json();
        setMensaje({ tipo: "error", texto: data.error || "No se pudo guardar la configuración." });
      }
    } catch (err) {
      setMensaje({ tipo: "error", texto: "Error de red al guardar." });
    } finally {
      setGuardandoConfig(false);
    }
  };

  const subirRespaldoInmediato = async () => {
    setSubiendoNube(true);
    setMensaje(null);
    try {
      const res = await apiFetch("/api/supabase/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "MANUAL", usuario: "Admin" })
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        setMensaje({
          tipo: "exito",
          texto: `¡Respaldo subido exitosamente a Supabase Storage! Ubicación: ${data.path}`
        });
        cargarDatosSupabase();
      } else {
        setMensaje({ tipo: "error", texto: data.error || "Error al subir respaldo a Supabase." });
      }
    } catch (err: any) {
      setMensaje({ tipo: "error", texto: "Error de conexión: " + err.message });
    } finally {
      setSubiendoNube(false);
    }
  };

  const restaurarDesdeNube = async (storagePath: string, filename: string) => {
    const confirmacion = window.confirm(
      `⚠️ ¿Estás seguro de restaurar la base de datos desde la nube?\n\n` +
      `Archivo: ${filename}\n` +
      `Ruta en Supabase: ${storagePath}\n\n` +
      `El sistema reemplazará los datos actuales por los datos de este respaldo y creará una copia preventiva local antes de aplicar los cambios.\n\n` +
      `¿Deseas continuar?`
    );

    if (!confirmacion) return;

    setRestaurandoPath(storagePath);
    setMensaje(null);
    try {
      const res = await apiFetch("/api/supabase/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storagePath })
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        setMensaje({ tipo: "exito", texto: data.message });
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setMensaje({ tipo: "error", texto: data.error || "Error al restaurar desde la nube." });
      }
    } catch (err: any) {
      setMensaje({ tipo: "error", texto: "Error de conexión: " + err.message });
    } finally {
      setRestaurandoPath(null);
    }
  };

  const formatearTamano = (bytes?: number) => {
    if (!bytes || bytes === 0) return "Desconocido";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const formatearFecha = (iso?: string) => {
    if (!iso) return "Fecha no disponible";
    try {
      const d = new Date(iso);
      return d.toLocaleString("es-VE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
    } catch (e) {
      return iso;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Alertas */}
      {mensaje && (
        <div
          className={`p-4 rounded-2xl border flex gap-3 text-xs font-medium leading-relaxed ${
            mensaje.tipo === "exito"
              ? "bg-emerald-50 border-emerald-100 text-emerald-800"
              : mensaje.tipo === "error"
              ? "bg-rose-50 border-rose-100 text-rose-800"
              : "bg-amber-50 border-amber-100 text-amber-800"
          }`}
        >
          {mensaje.tipo === "exito" && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
          {mensaje.tipo === "error" && <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />}
          <div>
            <p className="font-bold">{mensaje.tipo === "exito" ? "Éxito" : "Atención"}</p>
            <p className="mt-0.5">{mensaje.texto}</p>
          </div>
        </div>
      )}

      {/* Banner Superior Supabase Cloud */}
      <div className="bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-[11px] font-bold tracking-wide border border-emerald-400/20">
            <Cloud className="w-3.5 h-3.5" />
            ALMACENAMIENTO EN LA NUBE SUPABASE & POSTGRESQL
          </div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
            Bóveda de Respaldos Multi-Empresa
          </h2>
          <p className="text-emerald-100/80 text-xs leading-relaxed">
            Tus datos se guardan de forma aislada y ordenada por carpeta de empresa en <strong>Supabase Storage</strong> con redundancia geográfica. Si la computadora del local se daña, puedes restaurar todo en 1 clic.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 shrink-0 relative z-10">
          <button
            onClick={subirRespaldoInmediato}
            disabled={subiendoNube}
            className="px-5 py-3.5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {subiendoNube ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Subiendo a Supabase...
              </>
            ) : (
              <>
                <CloudUpload className="w-4 h-4" />
                Subir Respaldo Ahora
              </>
            )}
          </button>
          <button
            onClick={cargarDatosSupabase}
            disabled={cargandoLista}
            className="px-4 py-3.5 bg-white/10 hover:bg-white/20 active:bg-white/5 text-white font-bold text-xs rounded-2xl border border-white/10 transition flex items-center justify-center gap-2 cursor-pointer"
            title="Refrescar lista de la nube"
          >
            <RefreshCw className={`w-4 h-4 ${cargandoLista ? "animate-spin" : ""}`} />
            Sincronizar
          </button>
        </div>
      </div>

      {/* Grid Principal: Configuración y Lista de Respaldos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Panel Izquierdo: Configuración de Credenciales */}
        <div className="lg:col-span-5 space-y-6">
          <form
            onSubmit={guardarConfiguracion}
            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                  Credenciales de Supabase
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100">
                Conectado
              </span>
            </div>

            {/* Supabase Project URL */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Project URL (SUPABASE_URL)</label>
              <input
                type="text"
                required
                placeholder="https://xyz.supabase.co"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs outline-none focus:bg-white focus:border-emerald-500 font-mono"
                value={settings.url}
                onChange={(e) => setSettings({ ...settings, url: e.target.value })}
              />
            </div>

            {/* Supabase API Key */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">
                  API Key de Supabase
                </label>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  Usar service_role (Recomendado)
                </span>
              </div>
              <input
                type="password"
                required
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs outline-none focus:bg-white focus:border-emerald-500 font-mono"
                value={settings.key}
                onChange={(e) => setSettings({ ...settings, key: e.target.value })}
              />
              <p className="text-[10px] text-slate-500">
                💡 <strong>Solución a RLS:</strong> Ve a tu panel en <strong>Project Settings &gt; API</strong> y copia la clave <strong><code>service_role (secret)</code></strong> para tener permisos completos de escritura en Storage sin bloquearte por RLS.
              </p>
            </div>

            {/* Bucket Name */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">Nombre del Bucket en Supabase</label>
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold inline-flex items-center gap-1"
                >
                  Abrir Supabase <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
              <input
                type="text"
                required
                placeholder="backups-elena"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs outline-none focus:bg-white focus:border-emerald-500 font-mono"
                value={settings.bucket}
                onChange={(e) => setSettings({ ...settings, bucket: e.target.value })}
              />
              <p className="text-[10px] text-slate-400">
                Asegúrate de crear este bucket en tu panel de Supabase: <strong>Storage &gt; New bucket &gt; {settings.bucket || "backups-elena"}</strong>.
              </p>
            </div>

            {/* Auto Upload Checkbox */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  checked={settings.autoUploadOnBackup}
                  onChange={(e) => setSettings({ ...settings, autoUploadOnBackup: e.target.checked })}
                />
                <div>
                  <span className="text-xs font-bold text-slate-800">
                    Sincronización Automática a la Nube
                  </span>
                  <p className="text-[10px] text-slate-500">
                    Sube automáticamente una copia a Supabase cada vez que se genera un respaldo local (al salir o por botón).
                  </p>
                </div>
              </label>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={probarConexion}
                disabled={probandoConexion}
                className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {probandoConexion ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}
                Probar Conexión
              </button>
              <button
                type="submit"
                disabled={guardandoConfig}
                className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20"
              >
                {guardandoConfig ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Cloud className="w-3.5 h-3.5" />}
                Guardar Ajustes
              </button>
            </div>
          </form>

          {/* Información de Jerarquía Multi-Tenant */}
          <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200/80 space-y-3">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
              <Layers className="w-4 h-4 text-emerald-600" />
              Estructura Organizada en Supabase
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200 font-mono text-[10px] text-slate-600 space-y-1">
              <div className="text-emerald-700 font-bold">📦 {settings.bucket}/</div>
              <div className="pl-3 text-slate-500">├── 📁 [empresa_id]/</div>
              <div className="pl-6 text-slate-500">├── 📁 manual/</div>
              <div className="pl-9 text-slate-400">└── backup_db_*.json</div>
              <div className="pl-6 text-slate-500">└── 📁 automatico/</div>
              <div className="pl-9 text-slate-400">└── backup_db_*.json</div>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Cada empresa tiene su propia carpeta aislada. Ninguna sucursal puede sobreescribir ni acceder a los respaldos de otra empresa.
            </p>
          </div>

          {/* Guía RLS / Permisos */}
          <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/80 space-y-2 text-[11px] text-amber-900">
            <div className="flex items-center gap-1.5 font-bold text-amber-800">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              ¿Error "row-level security policy"?
            </div>
            <p className="text-amber-800/80 leading-relaxed text-[10px]">
              Tienes 2 opciones para permitir la subida:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-[10px] text-amber-950 font-medium">
              <li>
                <strong>Opción A (Fácil):</strong> Usa la clave <code>service_role</code> en lugar de la clave <code>anon</code>.
              </li>
              <li>
                <strong>Opción B:</strong> En Supabase &gt; Storage &gt; Policies en el bucket <code>{settings.bucket || "backups-elena"}</code>, agrega una política que permita <code>INSERT</code>, <code>SELECT</code> y <code>UPDATE</code> a <code>anon/public</code>.
              </li>
            </ol>
          </div>
        </div>

        {/* Panel Derecho: Lista de Respaldos en la Nube */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col min-h-[520px]">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Cloud className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                Copias Disponibles en Supabase Storage
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-xl">
              {cloudBackups.length} {cloudBackups.length === 1 ? "Copia" : "Copias"}
            </span>
          </div>

          {/* Lista Scrollable */}
          <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-3 scrollbar-thin">
            {cargandoLista && cloudBackups.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                <p className="text-xs font-medium">Consultando Supabase Storage...</p>
              </div>
            ) : cloudBackups.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3 text-center p-6">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                  <CloudUpload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700">No hay copias en la nube aún</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                    Haz clic en el botón superior <strong>"Subir Respaldo Ahora"</strong> para almacenar tu primera copia en Supabase.
                  </p>
                </div>
              </div>
            ) : (
              cloudBackups.map((item, idx) => (
                <div
                  key={`${item.storagePath}-${idx}`}
                  className="p-4 rounded-2xl border border-slate-100 hover:border-emerald-200 bg-slate-50/50 hover:bg-emerald-50/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                        item.tipo === "MANUAL"
                          ? "bg-indigo-100 text-indigo-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}>
                        {item.tipo}
                      </span>
                      <h4 className="text-xs font-bold text-slate-800 truncate" title={item.name}>
                        {item.name}
                      </h4>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 font-mono">
                      <span>📁 {item.storagePath}</span>
                      <span>•</span>
                      <span>{formatearTamano(item.sizeBytes)}</span>
                      <span>•</span>
                      <span>{formatearFecha(item.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <a
                      href={`/api/supabase/download-file?path=${encodeURIComponent(item.storagePath)}`}
                      download={item.name}
                      title="Descargar este archivo JSON a tu computadora"
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-[10px] uppercase tracking-wider transition flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-600" />
                      Descargar
                    </a>
                    <button
                      onClick={() => restaurarDesdeNube(item.storagePath, item.name)}
                      disabled={restaurandoPath === item.storagePath}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 shadow-sm shadow-emerald-600/20"
                    >
                      {restaurandoPath === item.storagePath ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Restaurando...
                        </>
                      ) : (
                        <>
                          <CloudDownload className="w-3.5 h-3.5" />
                          Restaurar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
