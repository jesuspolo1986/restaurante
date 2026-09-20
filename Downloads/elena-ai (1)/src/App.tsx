/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Boxes, 
  FileText,
  Users, 
  Truck, 
  ClipboardCheck, 
  Sparkles, 
  TrendingUp, 
  Coins, 
  RefreshCw,
  Lock,
  User,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  BarChart3,
  Printer,
  Maximize2,
  Minimize2,
  HeartPulse,
  Wifi,
  Smartphone,
  QrCode,
  Building2,
  Layers,
  Wrench,
  ArrowLeft,
  Shield
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Importación de componentes modulares
import Dashboard from "./components/Dashboard";
import POS from "./components/POS";
import Inventario from "./components/Inventario";
import Pedidos from "./components/Pedidos";
import Creditos from "./components/Creditos";
import Proveedores from "./components/Proveedores";
import Compras from "./components/Compras";
import CierreCaja from "./components/CierreCaja";
import Reportes from "./components/Reportes";
import MultiSucursal from "./components/MultiSucursal";
import Almacen from "./components/Almacen";
import ElenaAI from "./components/ElenaAI";
import Login from "./components/Login";
import SuperAdminPanel from "./components/SuperAdminPanel";
import { Usuario } from "./types";
import ConfiguracionImpresion from "./components/ConfiguracionImpresion";
import Respaldos from "./components/Respaldos";
import Usuarios from "./components/Usuarios";
import ModalRedConexion from "./components/ModalRedConexion";
import ModalPerfilNegocio from "./components/ModalPerfilNegocio";
import LockScreen from "./components/LockScreen";
import { PerfilNegocio, TipoRubroNegocio } from "./types";

import { apiFetch } from "./utils/api";

type Tab = "dashboard" | "pos" | "inventario" | "almacen" | "sucursales" | "pedidos" | "creditos" | "proveedores" | "compras" | "cierre" | "reportes" | "elena" | "config_impresion" | "respaldos" | "usuarios";

export default function App() {
  const [usuario, setUsuario] = useState<Usuario | null>(() => {
    const cached = localStorage.getItem("elena_sesion");
    return cached ? JSON.parse(cached) : null;
  });

  const [perfilNegocio, setPerfilNegocio] = useState<PerfilNegocio | null>(null);
  const [mostrarModalPerfil, setMostrarModalPerfil] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const cachedTab = localStorage.getItem("elena_active_tab") as Tab;
    const cached = localStorage.getItem("elena_sesion");
    if (cached) {
      const u = JSON.parse(cached) as Usuario;
      if (u.rol === "trabajo") return "pedidos";
      if (cachedTab) return cachedTab;
      return u.rol === "cajero" ? "pos" : "dashboard";
    }
    return "dashboard";
  });
  const [tasa, setTasa] = useState<number>(36.50);
  const [tasaInput, setTasaInput] = useState<string>("36.50");
  const [editandoTasa, setEditandoTasa] = useState(false);
  const [respaldandoAlSalir, setRespaldandoAlSalir] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mostrarModalRed, setMostrarModalRed] = useState(false);
  const [isLocked, setIsLocked] = useState<boolean>(() => localStorage.getItem("elena_terminal_locked") === "true");

  // Atajo de Teclado Rápido: Alt + L para bloquear terminal manualmente
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "l" || e.key === "L")) {
        e.preventDefault();
        setIsLocked(true);
        localStorage.setItem("elena_terminal_locked", "true");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.error("Error al cambiar pantalla completa:", err);
    }
  };

  useEffect(() => {
    cargarTasa();
    cargarPerfilNegocio();
  }, []);

  const cargarPerfilNegocio = async () => {
    try {
      const res = await apiFetch("/api/perfil-negocio");
      if (res.ok) {
        const data = await res.json();
        if (data.perfil) {
          setPerfilNegocio(data.perfil);
        }
      }
    } catch (err) {
      console.error("Error al cargar perfil de negocio:", err);
    }
  };

  useEffect(() => {
    if (usuario) {
      localStorage.setItem("elena_active_tab", activeTab);
    }
  }, [activeTab, usuario]);

  const cargarTasa = async () => {
    try {
      const res = await apiFetch("/api/dolar");
      const data = await res.json();
      setTasa(data.tasa);
      setTasaInput(data.tasa.toString());
    } catch (err) {
      console.error(err);
    }
  };

  const guardarTasa = async () => {
    const num = parseFloat(tasaInput);
    if (isNaN(num) || num <= 0) return alert("Ingrese un valor numérico de tasa de cambio válido");
    try {
      const res = await apiFetch("/api/dolar/actualizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasa: num })
      });
      if (res.ok) {
        setTasa(num);
        setEditandoTasa(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const sincronizarTasaDolarApi = async () => {
    try {
      const res = await apiFetch("/api/dolar/sincronizar", {
        method: "POST"
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        setTasa(data.tasa);
        setTasaInput(data.tasa.toString());
        alert(`Tasa oficial del BCV sincronizada desde DolarApi: Bs. ${data.tasa}`);
      } else {
        alert(data.error || "No se pudo sincronizar la tasa.");
      }
    } catch (err) {
      console.error(err);
      alert("Error de red al sincronizar con DolarApi");
    }
  };

  const menuItems = [
    { id: "dashboard" as Tab, label: "Pizarra / Dashboard", icon: LayoutDashboard },
    { id: "pos" as Tab, label: "POS / Venta", icon: ShoppingCart },
    { id: "inventario" as Tab, label: "Inventario", icon: Boxes },
    { id: "almacen" as Tab, label: "Almacén & Traslados", icon: Layers },
    { id: "sucursales" as Tab, label: "Multi-Sucursal", icon: Building2 },
    { id: "pedidos" as Tab, label: "Trabajos y Pedidos", icon: ClipboardCheck },
    { id: "creditos" as Tab, label: "Clientes / Cobros", icon: Users },
    { id: "proveedores" as Tab, label: "Proveedores", icon: Truck },
    { id: "compras" as Tab, label: "Entrada Mercancía", icon: Coins },
    { id: "cierre" as Tab, label: "Cierres & Libro", icon: ClipboardCheck },
    { id: "reportes" as Tab, label: "Análisis & Ventas", icon: BarChart3 },
    { id: "config_impresion" as Tab, label: "Impresión Térmica", icon: Printer },
    { id: "respaldos" as Tab, label: "Seguridad & Copias", icon: ShieldCheck },
    { id: "usuarios" as Tab, label: "Usuarios & Accesos", icon: User },
    { id: "elena" as Tab, label: "Elena AI", icon: Sparkles, highlight: true }
  ];

  const handleLogout = async () => {
    if (usuario && usuario.rol !== "superadmin" && !usuario.isImpersonating) {
      setRespaldandoAlSalir(true);
      try {
        // Ejecutar backup automático al salir (el servidor copiará a USB y limitará a los últimos 15)
        await apiFetch("/api/backups/create", { method: "POST" });
        // Retraso de cortesía para que se vea el proceso
        await new Promise((resolve) => setTimeout(resolve, 1500));
      } catch (err) {
        console.error("Error al generar respaldo automático al salir:", err);
      }
    }
    localStorage.removeItem("elena_sesion");
    localStorage.removeItem("elena_active_tab");
    localStorage.removeItem("tenant_id");
    setUsuario(null);
    setRespaldandoAlSalir(false);
  };

  if (respaldandoAlSalir) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col items-center justify-center text-white p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(79,70,229,0.12)_0%,transparent_100%)] pointer-events-none" />
        <div className="max-w-md w-full text-center space-y-6 relative z-10">
          <div className="inline-flex p-4 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-3xl animate-pulse">
            <ShieldCheck className="w-12 h-12" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black uppercase tracking-wider text-slate-100">
              Guardando Respaldo de Seguridad
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              El sistema está resguardando de forma automática tu base de datos completa. Copiando archivos en tu almacenamiento local y pendrive USB...
            </p>
          </div>
          <div className="flex items-center justify-center gap-2.5 text-xs text-indigo-400 font-bold uppercase tracking-widest bg-slate-900/60 border border-slate-800/80 rounded-2xl py-3 px-4 w-max mx-auto">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Rotación Activa (Últimos 15)</span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono">
            Por favor, no desconectes tus dispositivos ni cierres la ventana.
          </p>
        </div>
      </div>
    );
  }

  if (!usuario) {
    return <Login onLoginSuccess={(u) => {
      setUsuario(u);
      localStorage.setItem("elena_sesion", JSON.stringify(u));
      let t: Tab = "dashboard";
      if (u.rol === "superadmin" || u.rol === "administrador") {
        t = "dashboard";
      } else if (Array.isArray(u.modulosPermitidos) && u.modulosPermitidos.length > 0) {
        t = u.modulosPermitidos[0] as Tab;
      } else if (u.rol === "trabajo") {
        t = "pedidos";
      } else if (u.rol === "cajero") {
        t = "pos";
      }
      setActiveTab(t);
      localStorage.setItem("elena_active_tab", t);
    }} />;
  }

  const handleVolverSuperAdmin = () => {
    const superAdminUser: Usuario = {
      username: "superadmin",
      nombre: "Super Administrador",
      rol: "superadmin",
      empresaId: ""
    };
    localStorage.removeItem("tenant_id");
    localStorage.setItem("elena_sesion", JSON.stringify(superAdminUser));
    localStorage.setItem("elena_active_tab", "empresas");
    setUsuario(superAdminUser);
  };

  if (usuario.rol === "superadmin") {
    return (
      <SuperAdminPanel 
        usuario={usuario} 
        onLogout={handleLogout} 
        onImpersonate={(impUser, targetTenantId) => {
          setUsuario(impUser);
          setActiveTab("config_impresion");
          cargarPerfilNegocio();
          cargarTasa();
        }}
      />
    );
  }

  const menuFiltrado = menuItems.filter((item) => {
    // El Superadmin y el Administrador tienen acceso a todos los módulos
    if (usuario.rol === "superadmin" || usuario.rol === "administrador") {
      return true;
    }

    // Si el usuario tiene permisos granulares configurados por el administrador:
    if (Array.isArray(usuario.modulosPermitidos) && usuario.modulosPermitidos.length > 0) {
      return usuario.modulosPermitidos.includes(item.id as any);
    }

    // Comportamiento por defecto si no tiene permisos personalizados configurados:
    if (usuario.rol === "trabajo") {
      return ["pedidos"].includes(item.id);
    }
    if (usuario.rol === "cajero") {
      return ["pos", "creditos", "almacen", "sucursales", "elena", "config_impresion", "pedidos"].includes(item.id);
    }
    return true;
  });

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-800">
      {/* Barra Lateral de Navegación (Sidebar) */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col justify-between shrink-0 shadow-xl relative z-20">
        <div className="flex flex-col flex-1 p-6 overflow-y-auto">
          {/* Logo Brand y Selector de Rubro */}
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-lg shadow-indigo-900/50">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-black tracking-tighter uppercase leading-none truncate">
                  {perfilNegocio?.nombreComercio ? perfilNegocio.nombreComercio : (
                    <>Elena<span className="text-indigo-400 font-light">PRO</span></>
                  )}
                </h1>
                <p className="text-[9px] text-slate-400 uppercase tracking-widest font-black mt-1">
                  POS & Gestión Multi-Rubro
                </p>
              </div>
            </div>

            {/* Selector Rápido de Giro / Rubro Comercial */}
            {usuario.rol === "administrador" && (
              <button
                type="button"
                onClick={() => setMostrarModalPerfil(true)}
                className="mt-3.5 w-full bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-500/50 text-slate-300 hover:text-white p-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center justify-between group cursor-pointer"
                title="Configurar Rubro: Farmacia, Ferretería, Supermercado, Ropa/Calzado"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="truncate">Giro: {perfilNegocio?.rubro || "FARMACIA"}</span>
                </div>
                <span className="text-[8px] bg-indigo-600 text-white font-mono px-1.5 py-0.5 rounded group-hover:bg-indigo-500 transition">
                  CAMBIAR
                </span>
              </button>
            )}
          </div>

          {/* Menú de Opciones */}
          <nav className="space-y-1.5 flex-1">
            {menuFiltrado.map((item) => {
              const Icon = item.icon;
              const activo = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all relative group ${
                    activo 
                      ? "text-indigo-400" 
                      : item.highlight 
                        ? "text-indigo-300 bg-indigo-950/40 hover:bg-indigo-950/70"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${activo ? "text-indigo-400" : item.highlight ? "text-indigo-300" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                  {activo && (
                    <motion.div 
                      layoutId="activeIndicator"
                      className="absolute right-0 top-3 bottom-3 w-1 bg-indigo-500 rounded-l-md"
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sección de Configuración de la Tasa BCV y Sesión en el Pie */}
        <div className="p-6 border-t border-slate-800 bg-slate-950/40 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2">
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-black uppercase tracking-wider">
              <span>Tasa Cambiaria (Bs)</span>
              <button 
                onClick={cargarTasa} 
                className="text-slate-500 hover:text-indigo-400 transition"
                title="Sincronizar"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
            
            {editandoTasa ? (
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  className="bg-slate-800 border border-slate-700 text-white font-black text-xs p-1.5 rounded-xl w-full outline-none focus:border-indigo-500 text-center"
                  value={tasaInput}
                  onChange={(e) => setTasaInput(e.target.value)}
                />
                <button 
                  onClick={guardarTasa}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] px-3 rounded-xl transition"
                >
                  Ok
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div 
                  className="flex items-baseline justify-between cursor-pointer hover:bg-slate-800 p-1.5 rounded-xl transition"
                  onClick={() => setEditandoTasa(true)}
                  title="Click para ajustar manualmente"
                >
                  <span className="text-[10px] font-bold text-slate-400 font-mono">1 USD =</span>
                  <span className="text-xs font-black text-white">Bs. {tasa.toFixed(2)}</span>
                </div>
                <button
                  onClick={sincronizarTasaDolarApi}
                  className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Actualizar tasa desde DolarApi"
                >
                  <RefreshCw className="w-3 h-3" /> Sincronizar API
                </button>
              </div>
            )}
          </div>

          {/* Botón Acceso Red / Código QR Celulares */}
          <button
            type="button"
            onClick={() => setMostrarModalRed(true)}
            className="w-full bg-gradient-to-r from-indigo-900 to-slate-900 hover:from-indigo-800 hover:to-slate-800 border border-indigo-700/50 hover:border-indigo-500 text-indigo-200 hover:text-white p-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition shadow-sm flex items-center justify-between cursor-pointer group"
            title="Ver Código QR e información de red para conectar celulares y tablets"
          >
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition" />
              <span>Conectar Celulares</span>
            </div>
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] px-1.5 py-0.5 rounded-md font-mono font-bold">
              QR / Red
            </span>
          </button>

          <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-800/60">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-900/50 flex items-center justify-center font-black text-xs text-indigo-400 uppercase shrink-0">
                {usuario?.username.slice(0, 2).toUpperCase() || "US"}
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                  {usuario?.rol === "administrador" ? "Administrador" : usuario?.rol === "trabajo" ? "Área de Trabajo" : "Cajero POS"}
                </p>
                <h4 className="text-xs font-bold mt-1.5 text-slate-200 truncate max-w-[100px]" title={usuario?.nombre}>
                  {usuario?.nombre}
                </h4>
              </div>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={() => {
                  setIsLocked(true);
                  localStorage.setItem("elena_terminal_locked", "true");
                }}
                className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 text-slate-400 hover:text-indigo-400 rounded-xl transition cursor-pointer"
                title="Bloquear Terminal de Trabajo (Alt+L)"
              >
                <Lock className="w-4 h-4" />
              </button>
              <button
                onClick={toggleFullscreen}
                className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-indigo-400 rounded-xl transition cursor-pointer"
                title={isFullscreen ? "Salir de pantalla completa" : "Modo pantalla completa"}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={handleLogout}
                className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-rose-400 rounded-xl transition cursor-pointer"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Contenedor Principal (Main Frame) */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Banner de Modo Soporte Técnico / Acceso Invisible SuperAdmin */}
        {usuario.isImpersonating && (
          <div className="bg-gradient-to-r from-amber-600 via-indigo-700 to-purple-800 text-white px-6 py-2.5 flex items-center justify-between shadow-md shrink-0 border-b border-indigo-500/40 relative z-30">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-1.5 bg-black/30 backdrop-blur-md rounded-lg text-amber-300">
                <Wrench className="w-4 h-4 animate-bounce" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 px-2 py-0.5 rounded-md">
                    Modo Soporte Técnico
                  </span>
                  <span className="text-xs font-bold text-slate-100 truncate">
                    Navegando en: <strong className="text-white underline">{perfilNegocio?.nombreComercio || usuario.empresaId}</strong>
                  </span>
                </div>
                <p className="text-[10px] text-indigo-200 hidden sm:block">
                  Acceso transparente para configuración de impresoras, cajeros, sucursales y parámetros sin modificar credenciales del cliente.
                </p>
              </div>
            </div>

            <button
              onClick={handleVolverSuperAdmin}
              className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-amber-300 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-2 shrink-0 shadow-lg"
              title="Cerrar modo soporte y regresar al Panel de Control Global de SuperAdmin"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a SuperAdmin</span>
            </button>
          </div>
        )}

        {/* Cuerpo del Módulo */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -8, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {activeTab === "dashboard" && <Dashboard />}
              {activeTab === "pos" && <POS />}
              {activeTab === "inventario" && <Inventario />}
              {activeTab === "almacen" && <Almacen />}
              {activeTab === "sucursales" && <MultiSucursal />}
              {activeTab === "pedidos" && <Pedidos usuario={usuario} />}
              {activeTab === "creditos" && <Creditos />}
              {activeTab === "proveedores" && <Proveedores />}
              {activeTab === "compras" && <Compras />}
              {activeTab === "cierre" && <CierreCaja />}
              {activeTab === "reportes" && <Reportes />}
              {activeTab === "config_impresion" && <ConfiguracionImpresion />}
              {activeTab === "respaldos" && <Respaldos />}
              {activeTab === "usuarios" && <Usuarios />}
              {activeTab === "elena" && <ElenaAI />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Modal de Conexión de Red Local, Código QR y Guía de Dispositivos */}
      {mostrarModalRed && (
        <ModalRedConexion onClose={() => setMostrarModalRed(false)} />
      )}

      {/* Modal de Configuración y Cambio de Perfil de Negocio / Giro Comercial */}
      {mostrarModalPerfil && (
        <ModalPerfilNegocio 
          isOpen={mostrarModalPerfil} 
          onClose={() => setMostrarModalPerfil(false)} 
          onPerfilActualizado={(nuevoPerfil) => {
            setPerfilNegocio(nuevoPerfil);
            cargarPerfilNegocio();
          }}
        />
      )}

      {/* Pantalla de Bloqueo por Inactividad / Manual (LockScreen) */}
      <LockScreen
        isLocked={isLocked}
        usuario={usuario}
        onUnlock={() => {
          setIsLocked(false);
          localStorage.removeItem("elena_terminal_locked");
        }}
        onLogout={handleLogout}
      />
    </div>
  );
}
