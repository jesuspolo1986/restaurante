/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Lock, 
  User, 
  Sparkles, 
  ShieldAlert, 
  Building, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  Clock, 
  SlidersHorizontal,
  ChevronDown,
  Layers,
  Store
} from "lucide-react";
import { Usuario } from "../types";
import { apiFetch } from "../utils/api";

interface LoginProps {
  onLoginSuccess: (user: Usuario) => void;
}

interface EmpresaPublica {
  id: string;
  nombre: string;
  rubro?: string;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState(() => localStorage.getItem("elena_saved_user") || "");
  const [contrasena, setContrasena] = useState("");
  const [empresaId, setEmpresaId] = useState(() => localStorage.getItem("tenant_id") || "default");
  const [recordarDatos, setRecordarDatos] = useState(true);
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Lista de empresas disponibles
  const [empresas, setEmpresas] = useState<EmpresaPublica[]>([]);
  
  // Modo de visualización: "PRODUCCION" (Limpio corporativo) vs "DEMO" (con accesos rápidos)
  const [mostrarCuentasDemo, setMostrarCuentasDemo] = useState(false);

  // Control de Bloqueo por Fuerza Bruta (Cuenta regresiva)
  const [bloqueadoHastaSec, setBloqueadoHastaSec] = useState<number | null>(null);

  useEffect(() => {
    cargarEmpresas();
  }, []);

  useEffect(() => {
    let interval: any = null;
    if (bloqueadoHastaSec && bloqueadoHastaSec > 0) {
      interval = setInterval(() => {
        setBloqueadoHastaSec((prev) => (prev && prev > 1 ? prev - 1 : null));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [bloqueadoHastaSec]);

  const cargarEmpresas = async () => {
    try {
      const res = await apiFetch("/api/empresas-publicas");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setEmpresas(data);
        }
      }
    } catch (e) {
      console.error("Error al cargar empresas públicas:", e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !contrasena) {
      setError("Por favor, introduzca su usuario y contraseña.");
      return;
    }

    if (bloqueadoHastaSec && bloqueadoHastaSec > 0) {
      setError(`Acceso bloqueado temporalmente. Espere ${bloqueadoHastaSec}s.`);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await apiFetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), contrasena, empresaId })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.bloqueado && data.segundosRestantes) {
          setBloqueadoHastaSec(data.segundosRestantes);
        }
        throw new Error(data.error || "Error al iniciar sesión");
      }

      if (data.status === "success" && data.user) {
        // Recordar estación / usuario si está marcado
        if (recordarDatos) {
          localStorage.setItem("elena_saved_user", username.trim());
          localStorage.setItem("tenant_id", data.user.empresaId || "default");
        } else {
          localStorage.removeItem("elena_saved_user");
        }

        localStorage.setItem("tenant_id", data.user.empresaId || "default");
        onLoginSuccess(data.user);
      }
    } catch (err: any) {
      setError(err.message || "Error de conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const setTestCredentials = (user: string, pass: string, company: string = "default") => {
    setUsername(user);
    setContrasena(pass);
    setEmpresaId(company);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans text-slate-100">
      {/* Luces de fondo decorativas sutiles */}
      <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] bg-indigo-800/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Cabecera de Marca */}
        <div className="text-center space-y-2">
          <div className="inline-flex bg-gradient-to-br from-indigo-500 to-indigo-700 p-3.5 rounded-2xl shadow-xl shadow-indigo-950/60 ring-4 ring-indigo-500/10">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase flex items-center justify-center gap-1.5">
              Elena<span className="text-indigo-400 font-bold font-sans">PRO</span>
            </h1>
            <p className="text-[11px] text-slate-400 font-semibold tracking-wider uppercase mt-1">
              Sistema de Gestión Comercial, Farmacéutica & POS
            </p>
          </div>
        </div>

        {/* Tarjeta Principal de Login */}
        <motion.div
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-tight">
                Acceso al Sistema
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Ingresa tus credenciales autorizadas
              </p>
            </div>
            <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full text-[10px] font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Conexión Cifrada</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Alerta de Error o Bloqueo */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3.5 rounded-2xl flex items-start gap-3 text-xs font-medium ${
                  bloqueadoHastaSec
                    ? "bg-amber-950/60 border border-amber-800 text-amber-200"
                    : "bg-rose-950/50 border border-rose-800 text-rose-200"
                }`}
              >
                {bloqueadoHastaSec ? (
                  <Clock className="w-4 h-4 shrink-0 text-amber-400 mt-0.5 animate-pulse" />
                ) : (
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                )}
                <div className="flex-1">
                  <span>{error}</span>
                  {bloqueadoHastaSec && (
                    <div className="font-mono font-black mt-1 text-amber-300">
                      Reintentar en: {bloqueadoHastaSec} segundos
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Selector de Empresa / Sucursal */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 pl-1">
                Empresa / Sucursal
              </label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                {empresas.length > 0 ? (
                  <select
                    value={empresaId}
                    onChange={(e) => setEmpresaId(e.target.value)}
                    disabled={loading}
                    className="w-full bg-slate-950 border border-slate-700/80 focus:border-indigo-500 rounded-2xl py-3 pl-10 pr-8 text-white outline-none transition-all text-xs font-bold appearance-none cursor-pointer"
                  >
                    {empresas.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.nombre} {emp.rubro ? `(${emp.rubro})` : ""}
                      </option>
                    ))}
                    <option value="custom">-- Otra Empresa / ID Técnico --</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Código de empresa (ej: default)"
                    className="w-full bg-slate-950 border border-slate-700/80 focus:border-indigo-500 rounded-2xl py-3 pl-10 pr-4 text-white placeholder-slate-600 outline-none transition-all text-xs font-bold uppercase"
                    value={empresaId}
                    onChange={(e) => setEmpresaId(e.target.value)}
                    disabled={loading}
                  />
                )}
              </div>
            </div>

            {/* Usuario */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 pl-1">
                Usuario / Identificación
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Ej: admin, cajero"
                  className="w-full bg-slate-950 border border-slate-700/80 focus:border-indigo-500 rounded-2xl py-3 pl-10 pr-4 text-white placeholder-slate-600 outline-none transition-all text-xs font-bold uppercase tracking-wider"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Contraseña con Show/Hide */}
            <div>
              <div className="flex justify-between items-center mb-1.5 pl-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Contraseña
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={mostrarContrasena ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-700/80 focus:border-indigo-500 rounded-2xl py-3 pl-10 pr-10 text-white placeholder-slate-600 outline-none transition-all text-xs font-bold"
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setMostrarContrasena(!mostrarContrasena)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                >
                  {mostrarContrasena ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Recordar en este equipo */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={recordarDatos}
                  onChange={(e) => setRecordarDatos(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                />
                <span>Recordar usuario en esta terminal</span>
              </label>
            </div>

            {/* Botón de Ingreso */}
            <button
              type="submit"
              disabled={loading || (bloqueadoHastaSec !== null && bloqueadoHastaSec > 0)}
              className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-black py-3.5 rounded-2xl transition shadow-lg shadow-indigo-900/40 uppercase tracking-wider text-xs flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Ingresar al Sistema</span>
                </>
              )}
            </button>
          </form>

          {/* Sección de Cuentas Demo Desplegable (Modo Asistente / Pruebas) */}
          <div className="pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setMostrarCuentasDemo(!mostrarCuentasDemo)}
              className="w-full flex items-center justify-between text-[11px] font-bold text-slate-500 hover:text-indigo-400 transition cursor-pointer py-1"
            >
              <span>{mostrarCuentasDemo ? "Ocultar Cuentas de Demostración" : "Ver Cuentas de Demostración"}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${mostrarCuentasDemo ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {mostrarCuentasDemo && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-2 mt-3"
                >
                  <div className="grid grid-cols-2 gap-2 text-left">
                    <button
                      type="button"
                      onClick={() => setTestCredentials("admin", "admin", "default")}
                      className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 rounded-xl transition group text-left"
                    >
                      <div className="text-[10px] font-black text-indigo-400 uppercase">
                        Administrador
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono">
                        admin / admin
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTestCredentials("cajero", "123", "default")}
                      className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 rounded-xl transition group text-left"
                    >
                      <div className="text-[10px] font-black text-emerald-400 uppercase">
                        Cajero POS
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono">
                        cajero / 123
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTestCredentials("trabajo", "trabajo123", "default")}
                      className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 rounded-xl transition group text-left col-span-2"
                    >
                      <div className="text-[10px] font-black text-amber-400 uppercase">
                        Área de Trabajo
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono">
                        trabajo / trabajo123
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setUsername("superadmin");
                        setContrasena("super123");
                        setEmpresaId("");
                        setError(null);
                      }}
                      className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-amber-800/40 hover:border-amber-500/50 rounded-xl transition group text-left col-span-2"
                    >
                      <div className="text-[10px] font-black text-purple-400 uppercase">
                        Super Administrador Global
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono">
                        superadmin / super123 (Panel Maestro)
                      </div>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Pie de Página */}
        <p className="text-center text-[10px] text-slate-600 font-mono">
          Elena PRO • Seguridad Empresarial • Multi-Tenant Activo
        </p>
      </div>
    </div>
  );
}
