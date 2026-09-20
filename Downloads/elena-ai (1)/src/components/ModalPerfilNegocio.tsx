/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Building2, 
  Sparkles, 
  Check, 
  Store, 
  Hammer, 
  ShoppingCart, 
  Shirt, 
  Briefcase, 
  Settings2, 
  Layers, 
  Scale, 
  Calendar, 
  MapPin, 
  DollarSign, 
  Percent, 
  Info,
  X,
  RefreshCw,
  Sliders,
  CheckCircle2,
  PackagePlus
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PerfilNegocio, TipoRubroNegocio } from "../types";
import { apiFetch } from "../utils/api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPerfilActualizado?: (perfil: PerfilNegocio) => void;
}

const RUBROS_METADATA: Record<TipoRubroNegocio, {
  nombre: string;
  subtitulo: string;
  icon: any;
  color: string;
  bgLight: string;
  borderColor: string;
  destacados: string[];
}> = {
  FARMACIA: {
    nombre: "Farmacia & Salud",
    subtitulo: "Droguerías, Botiquerías y Material Médico",
    icon: Store,
    color: "text-emerald-600",
    bgLight: "bg-emerald-50 hover:bg-emerald-100/70",
    borderColor: "border-emerald-500",
    destacados: ["Lotes & Caducidad", "Principio Activo", "Receta Médica", "Ubicación en Gavetas"]
  },
  FERRETERIA: {
    nombre: "Ferretería & Repuestos",
    subtitulo: "Materiales, Electricidad, Pinturas y Tuberías",
    icon: Hammer,
    color: "text-amber-600",
    bgLight: "bg-amber-50 hover:bg-amber-100/70",
    borderColor: "border-amber-500",
    destacados: ["Venta por Metros/Kilos", "Tarifa Detal/Mayor/Técnico", "Ubicación en Pasillos", "Marcas & Modelos"]
  },
  SUPERMERCADO: {
    nombre: "Supermercado & Bodegón",
    subtitulo: "Víveres, Charcutería, Carnicería y Bebidas",
    icon: ShoppingCart,
    color: "text-blue-600",
    bgLight: "bg-blue-50 hover:bg-blue-100/70",
    borderColor: "border-blue-500",
    destacados: ["Decodificador Balanza (20/21)", "Bultos & Fracciones", "Charcutería por Peso", "Góndolas & Pasillos"]
  },
  ROPA_CALZADO: {
    nombre: "Boutique, Ropa & Calzados",
    subtitulo: "Tiendas de Moda, Calzado y Accesorios",
    icon: Shirt,
    color: "text-purple-600",
    bgLight: "bg-purple-50 hover:bg-purple-100/70",
    borderColor: "border-purple-500",
    destacados: ["Matriz Talla x Color", "Stock por Variante", "PVP Detal y Mayor", "Etiquetas con Talla"]
  },
  GENERAL: {
    nombre: "Comercio General & Multi-Rubro",
    subtitulo: "Papelerías, Electrónica, Servicios y Variedades",
    icon: Briefcase,
    color: "text-indigo-600",
    bgLight: "bg-indigo-50 hover:bg-indigo-100/70",
    borderColor: "border-indigo-500",
    destacados: ["Universal & Flexible", "Todos los módulos activos", "Múltiples Precios", "Unidades Dinámicas"]
  }
};

export default function ModalPerfilNegocio({ isOpen, onClose, onPerfilActualizado }: Props) {
  const [tabActiva, setTabActiva] = useState<"presets" | "personalizar">("presets");
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);

  const [perfilActual, setPerfilActual] = useState<PerfilNegocio | null>(null);
  const [rubroSeleccionado, setRubroSeleccionado] = useState<TipoRubroNegocio>("FARMACIA");
  const [cargarDemo, setCargarDemo] = useState(false);

  // Formulario granular
  const [formPerfil, setFormPerfil] = useState<PerfilNegocio>({
    rubro: "FARMACIA",
    nombreComercio: "Elena Farma",
    slogan: "Salud, Bienestar y Confianza",
    habilitarPreciosMayor: false,
    habilitarDecimales: false,
    habilitarBalanzas: false,
    habilitarVariantes: false,
    habilitarLotesVencimiento: true,
    habilitarUbicaciones: true,
    monedaSimbolo: "$",
    tarifaDefault: "detal"
  });

  useEffect(() => {
    if (isOpen) {
      cargarPerfil();
    }
  }, [isOpen]);

  const cargarPerfil = async () => {
    setCargando(true);
    try {
      const res = await apiFetch("/api/perfil-negocio");
      const data = await res.json();
      if (data.perfil) {
        setPerfilActual(data.perfil);
        setRubroSeleccionado(data.perfil.rubro || "FARMACIA");
        setFormPerfil(data.perfil);
      }
    } catch (err) {
      console.error("Error al cargar perfil de negocio:", err);
    } finally {
      setCargando(false);
    }
  };

  const aplicarPreset = async (rubro: TipoRubroNegocio) => {
    setGuardando(true);
    setMensaje(null);
    try {
      const res = await apiFetch("/api/perfil-negocio/cambiar-rubro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rubro,
          cargarCatalogoDemo: cargarDemo
        })
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        setPerfilActual(data.perfil);
        setFormPerfil(data.perfil);
        setRubroSeleccionado(rubro);
        setMensaje({
          tipo: "exito",
          texto: `¡Giro comercial configurado con éxito a ${RUBROS_METADATA[rubro].nombre}! ${cargarDemo ? "Se agregaron artículos modelo de ejemplo." : ""}`
        });
        if (onPerfilActualizado) onPerfilActualizado(data.perfil);
      } else {
        setMensaje({ tipo: "error", texto: data.error || "No se pudo actualizar el perfil" });
      }
    } catch (err) {
      console.error(err);
      setMensaje({ tipo: "error", texto: "Error de red al aplicar el giro comercial" });
    } finally {
      setGuardando(false);
    }
  };

  const guardarPersonalizacion = async () => {
    setGuardando(true);
    setMensaje(null);
    try {
      const res = await apiFetch("/api/perfil-negocio/actualizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ perfil: formPerfil })
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        setPerfilActual(data.perfil);
        setMensaje({ tipo: "exito", texto: "¡Configuración avanzada guardada exitosamente!" });
        if (onPerfilActualizado) onPerfilActualizado(data.perfil);
      } else {
        setMensaje({ tipo: "error", texto: data.error || "Error al guardar personalización" });
      }
    } catch (err) {
      console.error(err);
      setMensaje({ tipo: "error", texto: "Error de conexión con el servidor" });
    } finally {
      setGuardando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Cabecera del Modal */}
        <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black uppercase tracking-wider">Adaptador de Giro Comercial & Escalabilidad</h2>
                <span className="bg-indigo-500/30 text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-400/30">
                  Multi-Rubro PRO
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Configura Elena para cualquier tipo de negocio con 1 clic o personaliza cada módulo a tu medida.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-6 pt-3 gap-3 shrink-0">
          <button
            onClick={() => setTabActiva("presets")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-t-xl border-b-2 transition-all ${
              tabActiva === "presets"
                ? "bg-white text-indigo-600 border-indigo-600 shadow-sm"
                : "text-slate-500 hover:text-slate-800 border-transparent"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>1. Giros Comerciales Pre-Diseñados</span>
          </button>
          <button
            onClick={() => setTabActiva("personalizar")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-t-xl border-b-2 transition-all ${
              tabActiva === "personalizar"
                ? "bg-white text-indigo-600 border-indigo-600 shadow-sm"
                : "text-slate-500 hover:text-slate-800 border-transparent"
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>2. Ajustes Granulares y Módulos</span>
          </button>
        </div>

        {/* Mensaje de Notificación */}
        {mensaje && (
          <div className={`px-6 py-3 text-xs font-bold flex items-center gap-2 border-b ${
            mensaje.tipo === "exito" 
              ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}>
            {mensaje.tipo === "exito" ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <Info className="w-4 h-4 text-rose-600 shrink-0" />}
            <span>{mensaje.texto}</span>
          </div>
        )}

        {/* Contenido Principal */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {tabActiva === "presets" && (
            <div className="space-y-6">
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs text-indigo-900">
                  <span className="font-bold">Selecciona el perfil ideal para tu empresa.</span> Al seleccionar un giro comercial, Elena activará automáticamente los campos, unidades de medida, métodos de venta y comportamiento óptimo para ese mercado.
                </div>
              </div>

              {/* Grid de Rubros */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(Object.keys(RUBROS_METADATA) as TipoRubroNegocio[]).map((key) => {
                  const item = RUBROS_METADATA[key];
                  const Icon = item.icon;
                  const esActivo = perfilActual?.rubro === key;

                  return (
                    <div
                      key={key}
                      className={`relative border-2 rounded-2xl p-4 transition-all flex flex-col justify-between cursor-pointer ${
                        esActivo
                          ? `${item.borderColor} bg-white shadow-md ring-2 ring-indigo-500/20`
                          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                      }`}
                      onClick={() => setRubroSeleccionado(key)}
                    >
                      {esActivo && (
                        <div className="absolute top-3 right-3 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                          <Check className="w-3 h-3" />
                          <span>Activo</span>
                        </div>
                      )}

                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl ${item.bgLight} ${item.color}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-black text-slate-800 leading-snug">{item.nombre}</h3>
                            <p className="text-[11px] text-slate-400">{item.subtitulo}</p>
                          </div>
                        </div>

                        <div className="space-y-1.5 pt-2 border-t border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Capacidades Clave:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {item.destacados.map((d, i) => (
                              <span key={i} className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                                {d}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <button
                          type="button"
                          disabled={guardando}
                          onClick={(e) => {
                            e.stopPropagation();
                            aplicarPreset(key);
                          }}
                          className={`w-full py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                            esActivo
                              ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                              : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                          }`}
                        >
                          {guardando ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : esActivo ? (
                            <span>Re-Aplicar Configuración</span>
                          ) : (
                            <span>Activar este Rubro</span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Opciones de Carga */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <PackagePlus className="w-5 h-5 text-indigo-600 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Cargar Catálogo y Categorías Modelo al Cambiar</h4>
                    <p className="text-[11px] text-slate-500">
                      Agrega productos y departamentos de demostración del rubro seleccionado para comenzar a facturar de inmediato.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={cargarDemo} 
                    onChange={(e) => setCargarDemo(e.target.checked)}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>
          )}

          {tabActiva === "personalizar" && (
            <div className="space-y-6">
              {/* Información Básica */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  Identidad Comercial
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Nombre Comercial de la Empresa</label>
                    <input 
                      type="text" 
                      value={formPerfil.nombreComercio} 
                      onChange={(e) => setFormPerfil({ ...formPerfil, nombreComercio: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Slogan / Actividad Principal</label>
                    <input 
                      type="text" 
                      value={formPerfil.slogan || ""} 
                      onChange={(e) => setFormPerfil({ ...formPerfil, slogan: e.target.value })}
                      placeholder="Ej: Materiales, Repuestos y Construcción"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Interruptores de Módulos y Funcionalidades */}
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-indigo-600" />
                  Módulos y Capacidades del Sistema
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Precios Mayor */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-800">Precios Múltiples (Detal, Mayor, Técnico)</div>
                      <div className="text-[11px] text-slate-500">Permite definir 3 listas de precios por artículo.</div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={formPerfil.habilitarPreciosMayor} 
                      onChange={(e) => setFormPerfil({ ...formPerfil, habilitarPreciosMayor: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                    />
                  </div>

                  {/* Decimales / Unidades fraccionadas */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-800">Fracciones y Decimales (Metros, Kilos, Litros)</div>
                      <div className="text-[11px] text-slate-500">Permite vender cantidades como 1.50 Mts o 0.450 Kg.</div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={formPerfil.habilitarDecimales} 
                      onChange={(e) => setFormPerfil({ ...formPerfil, habilitarDecimales: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                    />
                  </div>

                  {/* Decodificador Balanzas */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-800">Decodificador de Balanzas (Prefijo 20 / 21)</div>
                      <div className="text-[11px] text-slate-500">Lee tickets de balanzas con peso o monto incrustado.</div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={formPerfil.habilitarBalanzas} 
                      onChange={(e) => setFormPerfil({ ...formPerfil, habilitarBalanzas: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                    />
                  </div>

                  {/* Variantes Talla x Color */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-800">Matriz de Variantes (Talla x Color)</div>
                      <div className="text-[11px] text-slate-500">Gestión de stock individual para calzado y ropa.</div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={formPerfil.habilitarVariantes} 
                      onChange={(e) => setFormPerfil({ ...formPerfil, habilitarVariantes: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                    />
                  </div>

                  {/* Lotes y Vencimiento */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-800">Control de Lotes y Vencimiento</div>
                      <div className="text-[11px] text-slate-500">Alerta de medicamentos y perecederos próximos a caducar.</div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={formPerfil.habilitarLotesVencimiento} 
                      onChange={(e) => setFormPerfil({ ...formPerfil, habilitarLotesVencimiento: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                    />
                  </div>

                  {/* Ubicaciones de Almacén */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-800">Ubicaciones (Pasillo, Estante, Gaveta)</div>
                      <div className="text-[11px] text-slate-500">Localización exacta de cada producto en la tienda.</div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={formPerfil.habilitarUbicaciones} 
                      onChange={(e) => setFormPerfil({ ...formPerfil, habilitarUbicaciones: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Botón de Guardado */}
              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  disabled={guardando}
                  onClick={guardarPersonalizacion}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md transition-all flex items-center gap-2"
                >
                  {guardando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Guardar Parámetros de Negocio</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Pie del Modal */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex items-center justify-between shrink-0 text-xs text-slate-500">
          <span>Giro Activo: <strong className="text-slate-800">{RUBROS_METADATA[perfilActual?.rubro || "FARMACIA"].nombre}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </div>
  );
}
