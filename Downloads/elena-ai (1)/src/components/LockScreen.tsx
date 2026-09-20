/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Lock, Unlock, LogOut, ShieldCheck, Eye, EyeOff, Building2, User } from "lucide-react";
import { Usuario } from "../types";
import { apiFetch } from "../utils/api";

interface LockScreenProps {
  isLocked: boolean;
  usuario: Usuario;
  onUnlock: () => void;
  onLogout: () => void;
}

export default function LockScreen({ isLocked, usuario, onUnlock, onLogout }: LockScreenProps) {
  const [contrasena, setContrasena] = useState("");
  const [mostrarPass, setMostrarPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [horaActual, setHoraActual] = useState(new Date());

  useEffect(() => {
    if (isLocked) {
      setContrasena("");
      setError(null);
    }
  }, [isLocked]);

  useEffect(() => {
    const timer = setInterval(() => setHoraActual(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!isLocked) return null;

  const handleDesbloquear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contrasena) {
      setError("Introduce tu contraseña para desbloquear.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch("/api/auth/unlock-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: usuario.username,
          contrasena,
          empresaId: usuario.empresaId || "default"
        })
      });

      const data = await response.json();
      if (response.ok && data.unlocked) {
        onUnlock();
      } else {
        setError(data.error || "Contraseña incorrecta.");
      }
    } catch (err: any) {
      setError("Error de conexión al verificar desbloqueo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-between p-6 sm:p-12 text-slate-100 font-sans select-none animate-in fade-in duration-300">
      {/* Encabezado Superior: Estado de Seguridad */}
      <div className="w-full max-w-4xl flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-slate-200 block">
              Terminal Bloqueada
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              Sesión protegida / Bloqueo manual de seguridad
            </span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-black font-mono tracking-tight text-white">
            {horaActual.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
          <div className="text-[11px] text-slate-400 capitalize">
            {horaActual.toLocaleDateString("es-VE", { weekday: "long", day: "numeric", month: "long" })}
          </div>
        </div>
      </div>

      {/* Centro: Tarjeta de Desbloqueo */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-black/80 flex flex-col items-center text-center space-y-6">
        {/* Avatar del Usuario */}
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-indigo-500/20">
            {usuario.nombre ? usuario.nombre.charAt(0).toUpperCase() : "U"}
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-slate-950">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
        </div>

        <div>
          <h2 className="text-lg font-black text-white">{usuario.nombre}</h2>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {usuario.rol}
            </span>
            <span className="text-xs font-mono text-slate-400">@{usuario.username}</span>
          </div>
        </div>

        {/* Formulario de Contraseña */}
        <form onSubmit={handleDesbloquear} className="w-full space-y-4">
          <div className="relative">
            <input
              type={mostrarPass ? "text" : "password"}
              autoFocus
              value={contrasena}
              onChange={(e) => {
                setContrasena(e.target.value);
                setError(null);
              }}
              placeholder="Introduce tu contraseña..."
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-center font-medium"
            />
            <button
              type="button"
              onClick={() => setMostrarPass(!mostrarPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs p-1"
            >
              {mostrarPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium animate-in fade-in">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !contrasena}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition cursor-pointer shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {loading ? (
              <span>Verificando...</span>
            ) : (
              <>
                <Unlock className="w-4 h-4" />
                <span>Desbloquear Terminal</span>
              </>
            )}
          </button>
        </form>

        <div className="w-full pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span className="text-[11px]">¿No eres tú?</span>
          <button
            type="button"
            onClick={onLogout}
            className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 hover:underline cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar Sesión / Cambiar Usuario</span>
          </button>
        </div>
      </div>

      {/* Pie de Pantalla */}
      <div className="text-center text-slate-600 text-[11px] font-medium">
        Elena PRO • Seguridad & Protección de Punto de Venta • Sesión Cifrada
      </div>
    </div>
  );
}
