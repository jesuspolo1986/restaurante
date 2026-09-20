/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Building2, 
  Plus, 
  Trash2, 
  Power, 
  PowerOff, 
  Edit3, 
  LogOut, 
  TrendingUp, 
  Boxes, 
  DollarSign,
  Briefcase,
  Search,
  ShieldAlert,
  MapPin,
  Phone,
  Calendar,
  X,
  CheckCircle2,
  AlertTriangle,
  Key,
  CreditCard,
  Cloud,
  Clock,
  ExternalLink,
  Receipt,
  FileCheck,
  RefreshCw,
  Sparkles,
  Download,
  Copy,
  ChevronRight,
  Sliders,
  Check,
  Percent,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Bell,
  Lock,
  HardDrive,
  Database,
  Info,
  Server,
  KeyRound,
  UserCheck,
  Wrench,
  Terminal,
  LogIn,
  UserCog,
  RotateCcw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Usuario, Empresa, TipoPlanLicencia, TipoRubroNegocio, PagoLicencia } from "../types";
import { apiFetch } from "../utils/api";

interface SuperAdminPanelProps {
  usuario: Usuario;
  onLogout: () => void;
  onSelectTenant?: (tenantId: string) => void;
  onImpersonate?: (user: Usuario, tenantId: string) => void;
}

export interface AlertaSuperAdmin {
  id: string;
  tipo: string;
  nivel: "CRITICO" | "ADVERTENCIA" | "INFO";
  titulo: string;
  mensaje: string;
  empresaId?: string;
  empresaNombre?: string;
  fecha: string;
  accionRecomendada?: string;
}

export interface SupabaseQuotaStats {
  conectado: boolean;
  bucket: string;
  totalArchivos: number;
  tamanoTotalBytes: number;
  limiteGratisBytes: number;
  porcentajeUso: number;
  totalEmpresasRespaldadas: number;
  ultimoErrorSincronizacion: string | null;
}

type TabVistaAdmin = "empresas" | "licencias" | "cobranzas" | "alertas" | "respaldos_cloud" | "seguridad";

export default function SuperAdminPanel({ usuario, onLogout, onSelectTenant, onImpersonate }: SuperAdminPanelProps) {
  const [activeTab, setActiveTab] = useState<TabVistaAdmin>("empresas");
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoSoporteId, setCargandoSoporteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiadoKey, setCopiadoKey] = useState<string | null>(null);
  
  // Buscador y filtros
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [filtroRubro, setFiltroRubro] = useState<string>("todos");

  // Estado para creación de empresa
  const [mostrarModalCrear, setMostrarModalCrear] = useState(false);
  const [nuevoId, setNuevoId] = useState("");
  const [nuevoRif, setNuevoRif] = useState("");
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoContacto, setNuevoContacto] = useState("");
  const [nuevoTelefono, setNuevoTelefono] = useState("");
  const [nuevoEmail, setNuevoEmail] = useState("");
  const [nuevaCiudad, setNuevaCiudad] = useState("");
  const [nuevaDireccion, setNuevaDireccion] = useState("");
  const [nuevoRubro, setNuevoRubro] = useState<TipoRubroNegocio>("FARMACIA");
  const [nuevoPlan, setNuevoPlan] = useState<TipoPlanLicencia>("MENSUAL");
  const [nuevoPrecioUSD, setNuevoPrecioUSD] = useState<number>(25);
  const [nuevoPassAdmin, setNuevoPassAdmin] = useState("admin");
  const [guardando, setGuardando] = useState(false);

  // Estado para edición de empresa
  const [empresaEdicion, setEmpresaEdicion] = useState<Empresa | null>(null);
  const [editRif, setEditRif] = useState("");
  const [editNombre, setEditNombre] = useState("");
  const [editContacto, setEditContacto] = useState("");
  const [editTelefono, setEditTelefono] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editCiudad, setEditCiudad] = useState("");
  const [editDireccion, setEditDireccion] = useState("");
  const [editRubro, setEditRubro] = useState<TipoRubroNegocio>("FARMACIA");
  const [editPlan, setEditPlan] = useState<TipoPlanLicencia>("MENSUAL");
  const [editPrecioUSD, setEditPrecioUSD] = useState<number>(25);

  // Estado para Modal de Cobranzas / Registrar Pago de Licencia
  const [empresaPago, setEmpresaPago] = useState<Empresa | null>(null);
  const [pagoMontoUSD, setPagoMontoUSD] = useState<string>("25");
  const [pagoMontoBS, setPagoMontoBS] = useState<string>("");
  const [pagoMetodo, setPagoMetodo] = useState<string>("PAGO_MOVIL");
  const [pagoReferencia, setPagoReferencia] = useState<string>("");
  const [pagoPeriodoMeses, setPagoPeriodoMeses] = useState<number>(1);
  const [pagoPlanSeleccionado, setPagoPlanSeleccionado] = useState<TipoPlanLicencia>("MENSUAL");
  const [pagoActualizarTarifa, setPagoActualizarTarifa] = useState<boolean>(false);
  const [pagoNota, setPagoNota] = useState<string>("");

  // Estado para Modal de Gestión de Licencia / Generación de Claves
  const [empresaLicenciaModal, setEmpresaLicenciaModal] = useState<Empresa | null>(null);
  const [generandoKey, setGenerandoKey] = useState(false);

  // Estado para Modal de Gestión de Usuarios y Reset de Claves por Empresa
  const [empresaUsuariosModal, setEmpresaUsuariosModal] = useState<Empresa | null>(null);
  const [usuariosEmpresa, setUsuariosEmpresa] = useState<any[]>([]);
  const [cargandoUsuariosEmpresa, setCargandoUsuariosEmpresa] = useState(false);
  const [usuarioAResetear, setUsuarioAResetear] = useState<string>("");
  const [claveResetManual, setClaveResetManual] = useState<string>("");
  const [resetExito, setResetExito] = useState<{ username: string; nombre: string; nuevaClave: string } | null>(null);
  const [copiadoReset, setCopiadoReset] = useState(false);

  // Estado para eliminar empresa
  const [empresaAEliminar, setEmpresaAEliminar] = useState<Empresa | null>(null);
  const [codigoConfirmacion, setCodigoConfirmacion] = useState("");

  // Estado para Sistema de Alertas Inteligentes y Cuotas Supabase
  const [alertas, setAlertas] = useState<AlertaSuperAdmin[]>([]);
  const [alertasStats, setAlertasStats] = useState({
    total: 0,
    criticas: 0,
    advertencias: 0,
    info: 0
  });
  const [supabaseStats, setSupabaseStats] = useState<SupabaseQuotaStats | null>(null);
  const [cargandoAlertas, setCargandoAlertas] = useState(false);
  const [filtroNivelAlerta, setFiltroNivelAlerta] = useState<string>("todos");

  // Estado para Seguridad y Cambio de Clave SuperAdmin
  const [securityProfile, setSecurityProfile] = useState<{
    username: string;
    nombre: string;
    emailNotificaciones: string;
    actualizadoEn: string;
    hasCustomPassword: boolean;
  } | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [adminNombreEdit, setAdminNombreEdit] = useState("");
  const [adminEmailEdit, setAdminEmailEdit] = useState("");
  const [guardandoSeguridad, setGuardandoSeguridad] = useState(false);

  useEffect(() => {
    cargarEmpresas();
    cargarAlertas();
    cargarPerfilSeguridad();
  }, []);

  const cargarAlertas = async () => {
    setCargandoAlertas(true);
    try {
      const res = await apiFetch("/api/admin/alerts");
      if (res.ok) {
        const data = await res.json();
        setAlertas(data.alertas || []);
        setAlertasStats({
          total: data.totalAlertas || 0,
          criticas: data.criticasCount || 0,
          advertencias: data.advertenciasCount || 0,
          info: data.infoCount || 0
        });
        if (data.supabaseStats) {
          setSupabaseStats(data.supabaseStats);
        }
      }
    } catch (e) {
      console.error("Error cargando alertas:", e);
    } finally {
      setCargandoAlertas(false);
    }
  };

  const cargarPerfilSeguridad = async () => {
    try {
      const res = await apiFetch("/api/admin/security-profile");
      if (res.ok) {
        const data = await res.json();
        setSecurityProfile(data);
        setAdminNombreEdit(data.nombre || "");
        setAdminEmailEdit(data.emailNotificaciones || "");
      }
    } catch (e) {
      console.error("Error cargando perfil de seguridad:", e);
    }
  };

  const handleCambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("La confirmación de la contraseña no coincide.");
      return;
    }

    setGuardandoSeguridad(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await apiFetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
          nombre: adminNombreEdit,
          emailNotificaciones: adminEmailEdit
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo actualizar la contraseña.");
      }

      setSuccess("¡Clave de Super Administrador y perfil de seguridad actualizados con éxito!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      cargarPerfilSeguridad();
    } catch (err: any) {
      setError(err.message || "Error al actualizar la contraseña.");
    } finally {
      setGuardandoSeguridad(false);
    }
  };

  const cargarEmpresas = async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await apiFetch("/api/admin/companies");
      if (!res.ok) {
        throw new Error("No se pudo obtener el listado de empresas.");
      }
      const data = await res.json();
      setEmpresas(data);
    } catch (err: any) {
      setError(err.message || "Error al cargar las empresas.");
    } finally {
      setCargando(false);
    }
  };

  const handleCopiarClave = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiadoKey(key);
    setTimeout(() => setCopiadoKey(null), 2500);
  };

  const handleCrearEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoId || !nuevoRif || !nuevoNombre) {
      setError("Por favor complete los campos obligatorios.");
      return;
    }

    const cleanId = nuevoId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!cleanId) {
      setError("El código de empresa contiene caracteres inválidos. Use solo letras minúsculas, números y guiones.");
      return;
    }

    setGuardando(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await apiFetch("/api/admin/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: cleanId,
          rif: nuevoRif,
          nombre: nuevoNombre,
          contacto: nuevoContacto,
          telefono: nuevoTelefono,
          email: nuevoEmail,
          direccion: nuevaDireccion,
          ciudad: nuevaCiudad,
          rubro: nuevoRubro,
          plan: nuevoPlan,
          precioMensualUSD: nuevoPrecioUSD,
          contrasenaAdmin: nuevoPassAdmin
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo registrar la empresa.");
      }

      setSuccess(`¡Empresa "${nuevoNombre}" creada con éxito! Base de datos inicializada y licencia activa.`);
      setMostrarModalCrear(false);
      
      // Resetear campos
      setNuevoId("");
      setNuevoRif("");
      setNuevoNombre("");
      setNuevoContacto("");
      setNuevoTelefono("");
      setNuevoEmail("");
      setNuevaCiudad("");
      setNuevaDireccion("");
      setNuevoPassAdmin("admin");

      cargarEmpresas();
    } catch (err: any) {
      setError(err.message || "Error al guardar empresa.");
    } finally {
      setGuardando(false);
    }
  };

  const handleEditarEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaEdicion) return;

    setGuardando(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await apiFetch(`/api/admin/companies/${empresaEdicion.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rif: editRif,
          nombre: editNombre,
          contacto: editContacto,
          telefono: editTelefono,
          email: editEmail,
          ciudad: editCiudad,
          direccion: editDireccion,
          rubro: editRubro,
          licencia: {
            plan: editPlan,
            precioMensualUSD: Number(editPrecioUSD) || 25
          }
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo actualizar la empresa.");
      }

      setSuccess(`Empresa "${editNombre}" y su plan (${editPlan} - $${editPrecioUSD}/mes) actualizados exitosamente.`);
      setEmpresaEdicion(null);
      cargarEmpresas();
    } catch (err: any) {
      setError(err.message || "Error al actualizar empresa.");
    } finally {
      setGuardando(false);
    }
  };

  const handleRegistrarCobro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaPago) return;

    if (!pagoMontoUSD || Number(pagoMontoUSD) <= 0) {
      setError("Ingrese un monto válido en USD.");
      return;
    }

    setGuardando(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await apiFetch(`/api/admin/companies/${empresaPago.id}/pagos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          montoUSD: Number(pagoMontoUSD),
          montoBS: Number(pagoMontoBS) || 0,
          metodoPago: pagoMetodo,
          referencia: pagoReferencia,
          periodoMeses: pagoPeriodoMeses,
          plan: pagoPlanSeleccionado,
          nuevoPrecioMensualUSD: pagoActualizarTarifa ? (Number(pagoMontoUSD) / pagoPeriodoMeses) : undefined,
          nota: pagoNota,
          registradoPor: usuario.nombre
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al registrar el pago.");
      }

      setSuccess(`¡Cobro de $${pagoMontoUSD} USD registrado exitosamente! La licencia de ${empresaPago.nombre} se renovó por ${pagoPeriodoMeses} mes(es).`);
      setEmpresaPago(null);
      setPagoReferencia("");
      setPagoNota("");
      cargarEmpresas();
    } catch (err: any) {
      setError(err.message || "Error al registrar cobranza.");
    } finally {
      setGuardando(false);
    }
  };

  const handleAbrirUsuariosEmpresa = async (emp: Empresa) => {
    setEmpresaUsuariosModal(emp);
    setCargandoUsuariosEmpresa(true);
    setUsuariosEmpresa([]);
    setUsuarioAResetear("");
    setClaveResetManual("");
    setResetExito(null);
    setCopiadoReset(false);
    setError(null);

    try {
      const res = await apiFetch(`/api/admin/companies/${emp.id}/users`);
      const data = await res.json();
      if (res.ok) {
        const usersList = data.usuarios || [];
        setUsuariosEmpresa(usersList);
        if (usersList.length > 0) {
          setUsuarioAResetear(usersList[0].username);
        }
      } else {
        setError(data.error || "No se pudieron cargar los usuarios.");
      }
    } catch (err: any) {
      setError(err.message || "Error conectando con la empresa.");
    } finally {
      setCargandoUsuariosEmpresa(false);
    }
  };

  const handleResetearClaveEmpresa = async (targetUsername?: string, directPassword?: string) => {
    if (!empresaUsuariosModal) return;
    const userToReset = targetUsername || usuarioAResetear;
    if (!userToReset) {
      setError("Por favor selecciona un usuario a resetear.");
      return;
    }

    const passwordToSend = directPassword !== undefined ? directPassword : (claveResetManual.trim() || "admin123");

    setGuardando(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/admin/companies/${empresaUsuariosModal.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: userToReset,
          newPassword: passwordToSend
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al resetear contraseña.");
      }

      setResetExito({
        username: data.username,
        nombre: data.nombre,
        nuevaClave: data.nuevaClave
      });
      setSuccess(`¡Contraseña del usuario '${data.username}' restablecida con éxito a: ${data.nuevaClave}!`);
      setClaveResetManual("");
    } catch (err: any) {
      setError(err.message || "Error al restablecer la contraseña.");
    } finally {
      setGuardando(false);
    }
  };

  const handleGenerarNuevaKey = async (empresaId: string, plan: string) => {
    setGenerandoKey(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/admin/companies/${empresaId}/generate-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al generar clave");
      
      setSuccess("Nueva clave criptográfica de activación generada.");
      cargarEmpresas();
    } catch (err: any) {
      setError(err.message || "Error al generar clave");
    } finally {
      setGenerandoKey(false);
    }
  };

  const handleCambiarEstado = async (id: string, estadoActual: "activa" | "suspendida") => {
    const nuevoEstado = estadoActual === "activa" ? "suspendida" : "activa";
    const accion = nuevoEstado === "activa" ? "Activar" : "Suspender";
    
    if (id === "default" && nuevoEstado === "suspendida") {
      alert("No se puede suspender la empresa Elena Farma (default) por seguridad.");
      return;
    }

    if (!confirm(`¿Está seguro que desea ${accion} la empresa ${id}? ${nuevoEstado === "suspendida" ? "Los usuarios de esta empresa no podrán iniciar sesión." : ""}`)) {
      return;
    }

    setError(null);
    setSuccess(null);
    try {
      const res = await apiFetch(`/api/admin/companies/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al cambiar el estado.");
      }

      setSuccess(`Estado de la empresa actualizado a: ${nuevoEstado.toUpperCase()}`);
      cargarEmpresas();
    } catch (err: any) {
      setError(err.message || "Error al cambiar estado.");
    }
  };

  const confirmarEliminarEmpresa = async () => {
    if (!empresaAEliminar) return;
    const { id, nombre } = empresaAEliminar;

    if (codigoConfirmacion !== id) {
      alert("Confirmación fallida. El código de empresa ingresado no coincide.");
      return;
    }

    setError(null);
    setSuccess(null);
    try {
      const res = await apiFetch(`/api/admin/companies/${id}`, {
        method: "DELETE"
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al eliminar empresa.");
      }

      setSuccess(`La empresa "${nombre}" ha sido eliminada permanentemente del sistema.`);
      setEmpresaAEliminar(null);
      setCodigoConfirmacion("");
      cargarEmpresas();
    } catch (err: any) {
      setError(err.message || "Error al eliminar la empresa.");
    }
  };

  // Función de Acceso de Soporte Técnico / Impersonación Invisible
  const handleAccesoSoporte = async (emp: Empresa) => {
    setCargandoSoporteId(emp.id);
    setError(null);
    try {
      const res = await apiFetch(`/api/admin/companies/${emp.id}/impersonate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo iniciar el modo de soporte técnico.");
      }

      // Guardar el tenant y usuario impersonado en localStorage
      localStorage.setItem("tenant_id", emp.id);
      localStorage.setItem("elena_sesion", JSON.stringify(data.user));
      localStorage.setItem("elena_active_tab", "config_impresion"); // Por defecto llevar a configuración de impresión o dashboard

      if (onImpersonate) {
        onImpersonate(data.user, emp.id);
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      setError(err.message || "Error al ingresar a la empresa.");
    } finally {
      setCargandoSoporteId(null);
    }
  };

  // Filtrado reactivo
  const empresasFiltradas = empresas.filter(emp => {
    const matchTexto = 
      emp.id.toLowerCase().includes(filtroTexto.toLowerCase()) ||
      emp.nombre.toLowerCase().includes(filtroTexto.toLowerCase()) ||
      emp.rif.toLowerCase().includes(filtroTexto.toLowerCase()) ||
      (emp.contacto && emp.contacto.toLowerCase().includes(filtroTexto.toLowerCase())) ||
      (emp.ciudad && emp.ciudad.toLowerCase().includes(filtroTexto.toLowerCase()));

    const matchEstado = filtroEstado === "todos" 
      ? true 
      : filtroEstado === "activa" 
        ? emp.estado === "activa" 
        : emp.estado === "suspendida";

    const matchRubro = filtroRubro === "todos" 
      ? true 
      : emp.rubro === filtroRubro;

    return matchTexto && matchEstado && matchRubro;
  });

  // Métricas Maestras de Gestión SaaS
  const totalEmpresas = empresas.length;
  const empresasActivas = empresas.filter(e => e.estado === "activa").length;
  const empresasSuspendidas = empresas.filter(e => e.estado === "suspendida").length;
  const totalProductosConsolidados = empresas.reduce((sum, e) => sum + (e.productosContador || 0), 0);
  const totalVentasConsolidadas = empresas.reduce((sum, e) => sum + (e.totalVentasUSD || 0), 0);
  
  // Ingresos Mensuales Recurrentes (MRR Estimado)
  const mrrEstimado = empresas
    .filter(e => e.estado === "activa" && e.licencia?.plan === "MENSUAL")
    .reduce((sum, e) => sum + (e.licencia?.precioMensualUSD || 0), 0);

  // Recaudación Total en Pagos Registrados
  const totalPagosRecaudadosUSD = empresas.reduce((sum, e) => {
    const pagosEmpresa = e.licencia?.historialPagos?.reduce((pSum, p) => pSum + (p.montoUSD || 0), 0) || 0;
    return sum + pagosEmpresa;
  }, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Cabecera Principal */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 sm:px-8 py-4.5 flex flex-wrap items-center justify-between gap-4 shadow-xl sticky top-0 z-40">
        <div className="flex items-center gap-3.5">
          <div className="bg-gradient-to-br from-amber-400 to-amber-600 p-2.5 rounded-2xl shadow-lg shadow-amber-500/20 text-slate-950">
            <Building2 className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-white">
                ELENA <span className="text-amber-400">HUB CONTROL</span>
              </h1>
              <span className="text-[10px] bg-amber-500/10 text-amber-400 font-black px-2 py-0.5 rounded-md uppercase border border-amber-500/30">
                Master SaaS Panel
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Panel Integral de Administración de Empresas, Licencias y Cobranzas
            </p>
          </div>
        </div>

        {/* Pestañas de Navegación del Panel Maestro */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveTab("empresas")}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-2 cursor-pointer ${
              activeTab === "empresas"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Building2 className="w-4 h-4" />
            Empresas ({totalEmpresas})
          </button>
          <button
            onClick={() => setActiveTab("licencias")}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-2 cursor-pointer ${
              activeTab === "licencias"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Key className="w-4 h-4" />
            Licencias
          </button>
          <button
            onClick={() => setActiveTab("cobranzas")}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-2 cursor-pointer ${
              activeTab === "cobranzas"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Cobranzas ($MRR)
          </button>
          <button
            onClick={() => {
              setActiveTab("alertas");
              cargarAlertas();
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-2 cursor-pointer relative ${
              activeTab === "alertas"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Bell className="w-4 h-4" />
            Alertas
            {alertasStats.criticas > 0 ? (
              <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full animate-pulse">
                {alertasStats.criticas}
              </span>
            ) : alertasStats.total > 0 ? (
              <span className="bg-amber-500/20 text-amber-400 text-[9px] font-black px-1.5 py-0.5 rounded-full border border-amber-500/40">
                {alertasStats.total}
              </span>
            ) : null}
          </button>
          <button
            onClick={() => setActiveTab("respaldos_cloud")}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-2 cursor-pointer ${
              activeTab === "respaldos_cloud"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Cloud className="w-4 h-4" />
            Monitor Nube
          </button>
          <button
            onClick={() => {
              setActiveTab("seguridad");
              cargarPerfilSeguridad();
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-2 cursor-pointer ${
              activeTab === "seguridad"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Lock className="w-4 h-4" />
            Seguridad Clave
          </button>
        </div>

        {/* Perfil SuperAdmin y Botón Salir */}
        <div className="flex items-center gap-3">
          <button
            onClick={cargarEmpresas}
            title="Refrescar métricas"
            className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${cargando ? "animate-spin text-amber-400" : ""}`} />
          </button>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 bg-rose-950/40 hover:bg-rose-900 border border-rose-800/60 hover:border-rose-500 text-rose-200 px-4 py-2.5 rounded-xl text-xs font-black transition uppercase tracking-wider cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Salir
          </button>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
        
        {/* Banner de Mensajes y Alertas */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-rose-950/40 border border-rose-800/80 p-4 rounded-2xl flex items-start gap-3.5 text-xs text-rose-300 shadow-lg shadow-rose-950/30"
            >
              <ShieldAlert className="w-5 h-5 shrink-0 text-rose-400" />
              <div className="flex-1">
                <p className="font-black uppercase tracking-wider mb-0.5">Fallo de Operación</p>
                <p>{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-rose-400 hover:text-white transition">
                <X className="w-4.5 h-4.5" />
              </button>
            </motion.div>
          )}

          {success && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-emerald-950/40 border border-emerald-800/80 p-4 rounded-2xl flex items-start gap-3.5 text-xs text-emerald-300 shadow-lg shadow-emerald-950/30"
            >
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
              <div className="flex-1">
                <p className="font-black uppercase tracking-wider mb-0.5">Operación Exitosa</p>
                <p>{success}</p>
              </div>
              <button onClick={() => setSuccess(null)} className="text-emerald-400 hover:text-white transition">
                <X className="w-4.5 h-4.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bento Grid de Estadísticas Financieras y del Ecosistema */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Card 1: MRR */}
          <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-3xl flex items-center gap-4.5 shadow-lg relative overflow-hidden">
            <div className="absolute right-0 top-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="bg-amber-500/10 p-3.5 rounded-2xl text-amber-400 border border-amber-500/20">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                Ingreso Mensual (MRR)
              </p>
              <p className="text-2xl font-black text-white">${mrrEstimado.toFixed(2)}</p>
              <p className="text-[10px] text-emerald-400 font-bold mt-0.5">
                Recurrente en suscripciones activas
              </p>
            </div>
          </div>

          {/* Card 2: Recaudación Total */}
          <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-3xl flex items-center gap-4.5 shadow-lg">
            <div className="bg-emerald-500/10 p-3.5 rounded-2xl text-emerald-400 border border-emerald-500/20">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                Recaudado Histórico
              </p>
              <p className="text-2xl font-black text-white">${totalPagosRecaudadosUSD.toFixed(2)}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Pagos de licencias registrados
              </p>
            </div>
          </div>

          {/* Card 3: Empresas y Clientes */}
          <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-3xl flex items-center gap-4.5 shadow-lg">
            <div className="bg-indigo-500/10 p-3.5 rounded-2xl text-indigo-400 border border-indigo-500/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                Clientes Conectados
              </p>
              <p className="text-2xl font-black text-white">{totalEmpresas}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                <span className="text-emerald-400 font-bold">{empresasActivas} al día</span> • <span className="text-rose-400 font-bold">{empresasSuspendidas} cortados</span>
              </p>
            </div>
          </div>

          {/* Card 4: Volumen Transaccional */}
          <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-3xl flex items-center gap-4.5 shadow-lg">
            <div className="bg-purple-500/10 p-3.5 rounded-2xl text-purple-400 border border-purple-500/20">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                Ventas de Clientes (GMV)
              </p>
              <p className="text-2xl font-black text-white">${totalVentasConsolidadas.toFixed(0)}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {totalProductosConsolidados} productos en inventario
              </p>
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* VISTA 1: GESTIÓN DE EMPRESAS Y CATÁLOGO MULTI-TENANT */}
        {/* ---------------------------------------------------- */}
        {activeTab === "empresas" && (
          <div className="space-y-6">
            {/* Barra de Búsqueda y Botón Registrar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 p-3.5 rounded-2xl border border-slate-800">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por ID, RIF, nombre comercial, contacto o ciudad..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold text-slate-200 placeholder-slate-600 outline-none transition"
                  value={filtroTexto}
                  onChange={(e) => setFiltroTexto(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs font-bold text-slate-300 py-2.5 px-3 rounded-xl outline-none"
                >
                  <option value="todos">Todos los Estados</option>
                  <option value="activa">Solo Activas</option>
                  <option value="suspendida">Solo Suspendidas</option>
                </select>

                <select
                  value={filtroRubro}
                  onChange={(e) => setFiltroRubro(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs font-bold text-slate-300 py-2.5 px-3 rounded-xl outline-none"
                >
                  <option value="todos">Todos los Rubros</option>
                  <option value="FARMACIA">Farmacias</option>
                  <option value="SUPERMERCADO">Supermercados / Bodegón</option>
                  <option value="FERRETERIA">Ferreterías</option>
                  <option value="ROPA_CALZADO">Ropa & Calzado</option>
                </select>

                <button
                  onClick={() => setMostrarModalCrear(true)}
                  className="bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  <Plus className="w-4 h-4 stroke-[3px]" />
                  Nueva Empresa
                </button>
              </div>
            </div>

            {/* Listado de Tarjetas de Empresas */}
            {cargando ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Cargando Ecosistema...</p>
              </div>
            ) : empresasFiltradas.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-16 text-center">
                <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-md font-bold uppercase tracking-wider text-slate-300">No se encontraron empresas</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Ajusta los filtros de búsqueda o registra una nueva empresa para iniciar su base de datos aislada.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {empresasFiltradas.map((emp) => {
                  const lic = emp.licencia;
                  const diasRestantes = lic?.fechaVencimiento
                    ? Math.ceil((new Date(lic.fechaVencimiento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                    : 0;

                  return (
                    <div 
                      key={emp.id}
                      className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 transition flex flex-col justify-between shadow-lg relative group"
                    >
                      {/* Estado y Plan de Licencia */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                          {emp.rubro || "FARMACIA"}
                        </span>
                        
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${emp.estado === "activa" ? "bg-emerald-500" : "bg-rose-500"}`} />
                          <span className={`text-[10px] font-black uppercase tracking-wider ${emp.estado === "activa" ? "text-emerald-400" : "text-rose-400"}`}>
                            {emp.estado}
                          </span>
                        </div>
                      </div>

                      {/* Info de la Empresa */}
                      <div className="space-y-3">
                        <div className="flex items-start gap-3.5">
                          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-amber-400 shrink-0">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div className="space-y-0.5 flex-1 min-w-0">
                            <h4 className="text-sm font-black text-white leading-tight uppercase tracking-tight truncate" title={emp.nombre}>
                              {emp.nombre}
                            </h4>
                            <div className="flex items-center gap-2 text-[10px] font-mono">
                              <span className="text-slate-400 font-bold">ID: <strong className="text-amber-400">{emp.id}</strong></span>
                              <span className="text-slate-600">•</span>
                              <span className="text-slate-400 font-bold">RIF: {emp.rif}</span>
                            </div>
                            {emp.contacto && (
                              <p className="text-[10px] text-slate-400 truncate">
                                Contacto: <strong className="text-slate-200">{emp.contacto}</strong>
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Caja de Estado de Licencia */}
                        <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3 space-y-1.5">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold text-slate-400 uppercase tracking-wider">Plan: <strong className="text-white">{lic?.plan || "MENSUAL"}</strong></span>
                            <span className={`font-black uppercase px-2 py-0.5 rounded text-[9px] ${
                              lic?.plan === "VITALICIA" ? "bg-purple-950/60 text-purple-300 border border-purple-800" :
                              diasRestantes > 5 ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800" :
                              diasRestantes > 0 ? "bg-amber-950/60 text-amber-300 border border-amber-800" :
                              "bg-rose-950/60 text-rose-300 border border-rose-800"
                            }`}>
                              {lic?.plan === "VITALICIA" ? "Vitalicia" : diasRestantes > 0 ? `${diasRestantes} días restantes` : "Vencida"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>Cuota: <strong>${lic?.precioMensualUSD || 25} USD/mes</strong></span>
                            <span>Vence: <strong>{lic?.fechaVencimiento ? new Date(lic.fechaVencimiento).toLocaleDateString() : "Ilimitada"}</strong></span>
                          </div>
                        </div>

                        {/* Métricas de DB Local */}
                        <div className="grid grid-cols-3 gap-2 text-center bg-slate-950/40 p-2.5 rounded-2xl border border-slate-800/60 text-[10px]">
                          <div>
                            <p className="text-slate-500 font-bold uppercase text-[9px]">Productos</p>
                            <p className="font-black text-white mt-0.5">{emp.productosContador || 0}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 font-bold uppercase text-[9px]">Ventas</p>
                            <p className="font-black text-white mt-0.5">{emp.ventasContador || 0}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 font-bold uppercase text-[9px]">Facturado</p>
                            <p className="font-black text-emerald-400 mt-0.5">${(emp.totalVentasUSD || 0).toFixed(0)}</p>
                          </div>
                        </div>

                        {/* Contacto & Ubicación */}
                        <div className="space-y-1 text-xs text-slate-400 pt-1">
                          {emp.telefono && (
                            <div className="flex items-center gap-2 text-[11px]">
                              <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                              <span className="truncate">{emp.telefono}</span>
                            </div>
                          )}
                          {emp.direccion && (
                            <div className="flex items-center gap-2 text-[11px]">
                              <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                              <span className="truncate" title={emp.direccion}>{emp.ciudad ? `${emp.ciudad}, ` : ""}{emp.direccion}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Botonera de Acciones Rápidas */}
                      <div className="flex items-center gap-2 mt-4 pt-3.5 border-t border-slate-800">
                        {/* Botón Cobrar */}
                        <button
                          onClick={() => {
                            setEmpresaPago(emp);
                            setPagoMontoUSD(String(emp.licencia?.precioMensualUSD || 25));
                            setPagoPeriodoMeses(1);
                          }}
                          className="flex-1 py-2 px-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
                          title="Registrar pago y renovar suscripción"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          Cobrar
                        </button>

                        {/* Botón Acceso de Soporte Técnico Invisible */}
                        <button
                          onClick={() => handleAccesoSoporte(emp)}
                          disabled={cargandoSoporteId === emp.id}
                          className="py-2 px-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/30"
                          title="Acceder a esta empresa en Modo Soporte Técnico / Fantasma para configurar impresoras, sucursales y cajeros sin clave"
                        >
                          {cargandoSoporteId === emp.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Wrench className="w-3.5 h-3.5" />
                          )}
                          <span>Soporte</span>
                        </button>

                        {/* Botón Gestión de Usuarios y Reset de Clave */}
                        <button
                          onClick={() => handleAbrirUsuariosEmpresa(emp)}
                          className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-sky-400 hover:text-white rounded-xl transition cursor-pointer"
                          title="Gestionar Usuarios y Resetear Claves de Acceso"
                        >
                          <UserCog className="w-4 h-4" />
                        </button>

                        {/* Botón Clave de Licencia */}
                        <button
                          onClick={() => setEmpresaLicenciaModal(emp)}
                          className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-amber-400 rounded-xl transition cursor-pointer"
                          title="Ver y Gestionar Clave de Licencia"
                        >
                          <Key className="w-4 h-4" />
                        </button>

                        {/* Botón Editar */}
                        <button
                          onClick={() => {
                            setEmpresaEdicion(emp);
                            setEditRif(emp.rif);
                            setEditNombre(emp.nombre);
                            setEditContacto(emp.contacto || "");
                            setEditTelefono(emp.telefono || "");
                            setEditEmail(emp.email || "");
                            setEditCiudad(emp.ciudad || "");
                            setEditDireccion(emp.direccion || "");
                            setEditRubro(emp.rubro || "FARMACIA");
                            setEditPlan(emp.licencia?.plan || "MENSUAL");
                            setEditPrecioUSD(emp.licencia?.precioMensualUSD || 25);
                          }}
                          className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl transition cursor-pointer"
                          title="Editar Datos de la Empresa y Plan"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {/* Botón Suspender / Activar */}
                        <button
                          onClick={() => handleCambiarEstado(emp.id, emp.estado)}
                          className={`p-2 border rounded-xl transition cursor-pointer ${
                            emp.estado === "activa"
                              ? "bg-slate-950 hover:bg-rose-950/40 border-slate-800 hover:border-rose-800 text-slate-400 hover:text-rose-400"
                              : "bg-emerald-950/40 border-emerald-800 text-emerald-400 hover:bg-emerald-900"
                          }`}
                          title={emp.estado === "activa" ? "Suspender Empresa" : "Activar Empresa"}
                        >
                          {emp.estado === "activa" ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                        </button>

                        {/* Botón Eliminar */}
                        <button
                          onClick={() => {
                            if (emp.id === "default") {
                              alert("La empresa principal (default) no puede ser eliminada.");
                              return;
                            }
                            setEmpresaAEliminar(emp);
                            setCodigoConfirmacion("");
                          }}
                          className="p-2 bg-slate-950 hover:bg-rose-950/80 border border-slate-800 hover:border-rose-900 text-slate-600 hover:text-rose-400 rounded-xl transition cursor-pointer"
                          title="Eliminar Empresa Permanentemente"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* VISTA 2: GESTIÓN DE LICENCIAS Y CLAVES CRIPTOGRÁFICAS */}
        {/* ---------------------------------------------------- */}
        {activeTab === "licencias" && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Key className="w-5 h-5 text-amber-400" />
                  Control de Licencias y Claves de Activación
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Emite claves de activación para tus clientes, define planes de cobro y controla accesos.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="pb-3 px-3">Empresa</th>
                    <th className="pb-3 px-3">Plan</th>
                    <th className="pb-3 px-3">Estado Licencia</th>
                    <th className="pb-3 px-3">Fecha Vencimiento</th>
                    <th className="pb-3 px-3">Clave de Activación</th>
                    <th className="pb-3 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {empresas.map((emp) => {
                    const lic = emp.licencia;
                    const dias = lic?.fechaVencimiento 
                      ? Math.ceil((new Date(lic.fechaVencimiento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                      : 0;

                    return (
                      <tr key={emp.id} className="hover:bg-slate-950/40 transition">
                        <td className="py-3.5 px-3">
                          <p className="font-black text-white">{emp.nombre}</p>
                          <p className="text-[10px] text-slate-500 font-mono">ID: {emp.id}</p>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20">
                            {lic?.plan || "MENSUAL"}
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            lic?.plan === "VITALICIA" ? "bg-purple-950 text-purple-300 border border-purple-800" :
                            dias > 5 ? "bg-emerald-950 text-emerald-300 border border-emerald-800" :
                            dias > 0 ? "bg-amber-950 text-amber-300 border border-amber-800" :
                            "bg-rose-950 text-rose-300 border border-rose-800"
                          }`}>
                            {lic?.plan === "VITALICIA" ? "Vitalicia" : dias > 0 ? `${dias} Días (${lic?.estado})` : "Vencida"}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-slate-300">
                          {lic?.fechaVencimiento ? new Date(lic.fechaVencimiento).toLocaleDateString() : "Ilimitada"}
                        </td>
                        <td className="py-3.5 px-3">
                          {lic?.claveActivacion ? (
                            <div className="flex items-center gap-2">
                              <code className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 font-mono text-[10px] text-slate-300 select-all">
                                {lic.claveActivacion}
                              </code>
                              <button
                                onClick={() => handleCopiarClave(lic.claveActivacion!)}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                                title="Copiar Clave"
                              >
                                {copiadoKey === lic.claveActivacion ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic text-[11px]">Sin clave generada</span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleAbrirUsuariosEmpresa(emp)}
                              className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-sky-400 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1"
                              title="Gestionar Usuarios y Resetear Claves"
                            >
                              <UserCog className="w-3 h-3" />
                              <span>Claves</span>
                            </button>
                            <button
                              onClick={() => handleAccesoSoporte(emp)}
                              disabled={cargandoSoporteId === emp.id}
                              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1"
                              title="Acceder a esta empresa en Modo Soporte"
                            >
                              {cargandoSoporteId === emp.id ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Wrench className="w-3 h-3" />
                              )}
                              <span>Soporte</span>
                            </button>
                            <button
                              onClick={() => handleGenerarNuevaKey(emp.id, lic?.plan || "MENSUAL")}
                              disabled={generandoKey}
                              className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-amber-400 rounded-xl text-[10px] font-bold uppercase tracking-wider transition cursor-pointer"
                            >
                              Regenerar Clave
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* VISTA 3: CONTROL DE COBRANZAS E HISTORIAL DE PAGOS */}
        {/* ---------------------------------------------------- */}
        {activeTab === "cobranzas" && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-400" />
                  Módulo de Cobranzas y Recibos Digitales
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Control de mensualidades recibidas por Zelle, Pago Móvil, Efectivo y Cripto.
                </p>
              </div>

              <div className="bg-emerald-950/40 border border-emerald-800/80 px-4 py-2 rounded-2xl flex items-center gap-3 text-xs text-emerald-300">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-emerald-400">Total Recaudado</p>
                  <p className="text-base font-black text-white">${totalPagosRecaudadosUSD.toFixed(2)} USD</p>
                </div>
              </div>
            </div>

            {/* Listado de Pagos Históricos */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Historial de Cobros Recibidos</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      <th className="pb-3 px-3">Fecha</th>
                      <th className="pb-3 px-3">Empresa</th>
                      <th className="pb-3 px-3">Monto USD</th>
                      <th className="pb-3 px-3">Método</th>
                      <th className="pb-3 px-3">Referencia</th>
                      <th className="pb-3 px-3">Período Renovado</th>
                      <th className="pb-3 px-3">Registrado Por</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {empresas.flatMap(e => (e.licencia?.historialPagos || []).map(p => ({ ...p, empresaNombre: e.nombre }))).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500 italic">
                          Aún no has registrado pagos de suscripción. Haz clic en el botón "Cobrar" en cualquiera de tus empresas.
                        </td>
                      </tr>
                    ) : (
                      empresas.flatMap(e => (e.licencia?.historialPagos || []).map(p => ({ ...p, empresaNombre: e.nombre })))
                        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                        .map((pago: any) => (
                          <tr key={pago.id} className="hover:bg-slate-950/40 transition">
                            <td className="py-3 px-3 text-slate-300 font-mono text-[11px]">
                              {new Date(pago.fecha).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-3 font-bold text-white">
                              {pago.empresaNombre}
                            </td>
                            <td className="py-3 px-3 font-black text-emerald-400 text-sm">
                              ${pago.montoUSD.toFixed(2)}
                            </td>
                            <td className="py-3 px-3">
                              <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[10px] font-bold text-slate-300 uppercase">
                                {pago.metodoPago}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                              {pago.referencia || "S/R"}
                            </td>
                            <td className="py-3 px-3 text-slate-300">
                              {pago.periodoMeses} mes(es) hasta {new Date(pago.fechaFin).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-3 text-slate-400 text-[11px]">
                              {pago.registradoPor || "SuperAdmin"}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* VISTA: CENTRO DE ALERTAS Y NOTIFICACIONES INTELIGENTES */}
        {/* ---------------------------------------------------- */}
        {activeTab === "alertas" && (
          <div className="space-y-6">
            {/* Cabecera del Centro de Alertas */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Bell className="w-5 h-5 text-amber-400" />
                    Centro de Alertas & Notificaciones Operativas
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Supervisión en tiempo real de cuotas en Supabase, vencimientos de licencias y errores de sincronización.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={cargarAlertas}
                    disabled={cargandoAlertas}
                    className="px-4 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${cargandoAlertas ? "animate-spin text-amber-400" : ""}`} />
                    Actualizar Diagnóstico
                  </button>
                </div>
              </div>

              {/* Tarjetas de Resumen de Alertas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Alertas</span>
                    <Bell className="w-4 h-4 text-slate-400" />
                  </div>
                  <p className="text-2xl font-black text-white mt-1.5">{alertasStats.total}</p>
                  <p className="text-[10px] text-slate-500 mt-1">Incidentes registrados</p>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-rose-900/40">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-400">Críticas</span>
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                  </div>
                  <p className="text-2xl font-black text-rose-400 mt-1.5">{alertasStats.criticas}</p>
                  <p className="text-[10px] text-rose-400/70 mt-1">Requieren acción inmediata</p>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-amber-900/40">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Advertencias</span>
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  </div>
                  <p className="text-2xl font-black text-amber-400 mt-1.5">{alertasStats.advertencias}</p>
                  <p className="text-[10px] text-amber-400/70 mt-1">Por vencer o de cuota</p>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-indigo-900/40">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Uso Supabase</span>
                    <HardDrive className="w-4 h-4 text-indigo-400" />
                  </div>
                  <p className="text-2xl font-black text-indigo-400 mt-1.5">
                    {supabaseStats ? `${supabaseStats.porcentajeUso}%` : "0%"}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {supabaseStats ? `${(supabaseStats.tamanoTotalBytes / (1024 * 1024)).toFixed(1)} MB / 1 GB` : "Plan Gratuito"}
                  </p>
                </div>
              </div>

              {/* Barra de progreso de cuota de Supabase */}
              {supabaseStats && (
                <div className="mt-6 bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-indigo-400" />
                      Espacio Utilizado en Supabase Storage (Bucket: <strong className="text-white font-mono">{supabaseStats.bucket}</strong>)
                    </span>
                    <span className={`font-black font-mono ${supabaseStats.porcentajeUso > 80 ? "text-rose-400" : supabaseStats.porcentajeUso > 50 ? "text-amber-400" : "text-emerald-400"}`}>
                      {(supabaseStats.tamanoTotalBytes / (1024 * 1024)).toFixed(2)} MB / 1,024 MB ({supabaseStats.porcentajeUso}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        supabaseStats.porcentajeUso > 80
                          ? "bg-rose-500"
                          : supabaseStats.porcentajeUso > 50
                          ? "bg-amber-500"
                          : "bg-indigo-500"
                      }`}
                      style={{ width: `${Math.max(2, supabaseStats.porcentajeUso)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>{supabaseStats.totalArchivos} archivos de respaldo almacenados en total</span>
                    <span>{supabaseStats.totalEmpresasRespaldadas} de {empresas.length} empresas respaldadas en la nube</span>
                  </div>
                </div>
              )}
            </div>

            {/* Lista de Alertas Detalladas con Filtro */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Filtrar por Severidad:</span>
                  <div className="flex gap-1.5">
                    {["todos", "CRITICO", "ADVERTENCIA", "INFO"].map((niv) => (
                      <button
                        key={niv}
                        onClick={() => setFiltroNivelAlerta(niv)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                          filtroNivelAlerta === niv
                            ? "bg-amber-500 text-slate-950 shadow-sm"
                            : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                        }`}
                      >
                        {niv === "todos" ? "Todas" : niv === "CRITICO" ? "Críticas" : niv === "ADVERTENCIA" ? "Advertencias" : "Informativas"}
                      </button>
                    ))}
                  </div>
                </div>

                <span className="text-xs text-slate-500">
                  Mostrando {alertas.filter(a => filtroNivelAlerta === "todos" || a.nivel === filtroNivelAlerta).length} alerta(s)
                </span>
              </div>

              <div className="space-y-3">
                {alertas.filter(a => filtroNivelAlerta === "todos" || a.nivel === filtroNivelAlerta).length === 0 ? (
                  <div className="py-12 text-center text-slate-500 bg-slate-950/60 rounded-2xl border border-dashed border-slate-800">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                    <p className="text-sm font-bold text-white">¡Todo el ecosistema opera con normalidad!</p>
                    <p className="text-xs text-slate-400 mt-1">No hay alertas activas para el filtro seleccionado.</p>
                  </div>
                ) : (
                  alertas
                    .filter(a => filtroNivelAlerta === "todos" || a.nivel === filtroNivelAlerta)
                    .map((alerta) => (
                      <div
                        key={alerta.id}
                        className={`p-4 rounded-2xl border transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                          alerta.nivel === "CRITICO"
                            ? "bg-rose-950/20 border-rose-800/60 hover:border-rose-500"
                            : alerta.nivel === "ADVERTENCIA"
                            ? "bg-amber-950/20 border-amber-800/60 hover:border-amber-500"
                            : "bg-indigo-950/20 border-indigo-800/60 hover:border-indigo-500"
                        }`}
                      >
                        <div className="flex items-start gap-3.5 flex-1">
                          <div className="mt-0.5">
                            {alerta.nivel === "CRITICO" ? (
                              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
                            ) : alerta.nivel === "ADVERTENCIA" ? (
                              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                            ) : (
                              <Info className="w-5 h-5 text-indigo-400 shrink-0" />
                            )}
                          </div>
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                                  alerta.nivel === "CRITICO"
                                    ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                                    : alerta.nivel === "ADVERTENCIA"
                                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                    : "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                                }`}
                              >
                                {alerta.nivel}
                              </span>
                              <h4 className="text-sm font-bold text-white">{alerta.titulo}</h4>
                              {alerta.empresaNombre && (
                                <span className="text-[10px] text-slate-400 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                                  {alerta.empresaNombre}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">{alerta.mensaje}</p>
                            <p className="text-[10px] text-slate-500 font-mono">
                              Registrado: {new Date(alerta.fecha).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {alerta.accionRecomendada && (
                          <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                            {alerta.tipo.includes("LICENCIA") && alerta.empresaId ? (
                              <button
                                onClick={() => {
                                  const emp = empresas.find(e => e.id === alerta.empresaId);
                                  if (emp) {
                                    setEmpresaPago(emp);
                                    setPagoMontoUSD(String(emp.licencia?.precioMensualUSD || 25));
                                  }
                                }}
                                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                {alerta.accionRecomendada}
                              </button>
                            ) : (
                              <span className="text-[11px] font-bold text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                                Acción: {alerta.accionRecomendada}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* VISTA: SEGURIDAD Y CLAVE DE SUPERADMINISTRADOR       */}
        {/* ---------------------------------------------------- */}
        {activeTab === "seguridad" && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
              <div className="border-b border-slate-800 pb-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Lock className="w-5 h-5 text-amber-400" />
                    Seguridad y Credenciales del Super Administrador
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Asigna tu propia contraseña maestra profesional protegida con cifrado criptográfico bcrypt.
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-300">
                    {securityProfile?.hasCustomPassword ? "Clave Personalizada Activa" : "Usando Clave Inicial"}
                  </span>
                </div>
              </div>

              {/* Formulario de Cambio de Contraseña y Datos */}
              <form onSubmit={handleCambiarPassword} className="space-y-5">
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                  <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    <UserCheck className="w-4 h-4" />
                    Información de Identidad
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">
                        Nombre del Administrador
                      </label>
                      <input
                        type="text"
                        placeholder="Super Administrador Global"
                        className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl py-2.5 px-3.5 text-xs font-bold text-white outline-none transition"
                        value={adminNombreEdit}
                        onChange={(e) => setAdminNombreEdit(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">
                        Email para Notificaciones
                      </label>
                      <input
                        type="email"
                        placeholder="ejemplo@correo.com"
                        className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl py-2.5 px-3.5 text-xs font-bold text-white outline-none transition"
                        value={adminEmailEdit}
                        onChange={(e) => setAdminEmailEdit(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                  <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    <KeyRound className="w-4 h-4" />
                    Asignar Nueva Contraseña Maestra
                  </h4>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">
                        Contraseña Actual (Si estás usando la inicial: super123)
                      </label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl py-2.5 px-3.5 text-xs font-bold text-white outline-none transition font-mono"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">
                          Nueva Contraseña Maestra (Mínimo 6 caracteres)*
                        </label>
                        <input
                          type="password"
                          required
                          placeholder="Tu nueva clave segura..."
                          className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl py-2.5 px-3.5 text-xs font-bold text-white outline-none transition font-mono"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">
                          Confirmar Nueva Contraseña*
                        </label>
                        <input
                          type="password"
                          required
                          placeholder="Repite la nueva clave..."
                          className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl py-2.5 px-3.5 text-xs font-bold text-white outline-none transition font-mono"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-300/90 leading-relaxed flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <strong className="text-white font-bold block mb-0.5">Seguridad Criptográfica:</strong>
                    La contraseña se almacena con hash irreversible <code className="text-amber-200 font-mono">bcrypt (cost factor 10)</code> en el servidor local. Nadie, ni siquiera inspeccionando el archivo de configuración, podrá leer tu contraseña en texto plano.
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={guardandoSeguridad}
                    className="px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
                  >
                    <Lock className="w-4 h-4" />
                    {guardandoSeguridad ? "Guardando Cifrado..." : "Guardar Nueva Contraseña Maestra"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* VISTA 4: MONITOR DE RESPALDOS EN LA NUBE SUPABASE    */}
        {/* ---------------------------------------------------- */}
        {activeTab === "respaldos_cloud" && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Cloud className="w-5 h-5 text-indigo-400" />
                  Monitor Global de Respaldos en Supabase Cloud
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Monitorea el estado de copias de seguridad de cada empresa y descarga respaldos de soporte técnico.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href="https://supabase.com/dashboard/project/nhbdegzkbjvesccthlxg/storage/buckets/backups-elena"
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  Abrir Consola Supabase
                </a>
              </div>
            </div>

            {/* Barra de cuota Supabase */}
            {supabaseStats && (
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex flex-wrap justify-between items-center text-xs gap-2">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <Database className="w-4 h-4 text-indigo-400" />
                    <span>Almacenamiento Consumido en Bucket: <code className="text-amber-400 font-mono">{supabaseStats.bucket}</code></span>
                  </div>
                  <span className="font-black font-mono text-emerald-400">
                    {(supabaseStats.tamanoTotalBytes / (1024 * 1024)).toFixed(2)} MB utilizados de 1,024 MB ({supabaseStats.porcentajeUso}%)
                  </span>
                </div>
                <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(2, supabaseStats.porcentajeUso)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Plan Gratuito de Supabase: 1 GB de almacenamiento Storage sin costo</span>
                  <span>{supabaseStats.totalArchivos} archivos de respaldo acumulados</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {empresas.map((emp) => (
                <div key={emp.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-black text-white uppercase">{emp.nombre}</h4>
                      <p className="text-[10px] text-slate-500 font-mono">Bucket path: 📁 backups-elena/{emp.id}/</p>
                    </div>
                    <Cloud className="w-5 h-5 text-indigo-400" />
                  </div>

                  <div className="space-y-2 text-xs text-slate-400 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                    <div className="flex justify-between">
                      <span>Aislamiento:</span>
                      <strong className="text-emerald-400 font-mono">Activo (Multi-Tenant)</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Cifrado:</span>
                      <strong className="text-slate-300">AES-256 SSL</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Frecuencia:</span>
                      <strong className="text-slate-300">Cierre de Caja + Manual</strong>
                    </div>
                  </div>

                  <div className="pt-1 flex gap-2">
                    <button
                      onClick={async () => {
                        try {
                          const res = await apiFetch(`/api/supabase/backups?tenantId=${emp.id}`);
                          const data = await res.json();
                          alert(`Empresa "${emp.nombre}" tiene ${data.length} respaldo(s) en la nube.`);
                        } catch (e: any) {
                          alert(`Error consultando respaldos de ${emp.nombre}: ${e.message}`);
                        }
                      }}
                      className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition text-center cursor-pointer"
                    >
                      Verificar Archivos
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* ==================================================== */}
      {/* MODAL: REGISTRAR PAGO / COBRAR LICENCIA             */}
      {/* ==================================================== */}
      <AnimatePresence>
        {empresaPago && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl shadow-black/80"
            >
              <div className="bg-slate-950 px-6 py-4.5 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-400" />
                  Registrar Cobranza de Suscripción
                </h3>
                <button onClick={() => setEmpresaPago(null)} className="text-slate-400 hover:text-white transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRegistrarCobro} className="p-6 space-y-4">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Cliente a renovar:</p>
                    <p className="text-base font-black text-white mt-0.5">{empresaPago.nombre}</p>
                    <p className="text-[10px] text-slate-500 font-mono">RIF: {empresaPago.rif} • ID: {empresaPago.id}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase">Tarifa Actual</span>
                    <span className="text-sm font-black text-emerald-400 font-mono">${empresaPago.licencia?.precioMensualUSD || 25} USD/mes</span>
                  </div>
                </div>

                {/* Botones de Paquetes Rápidos */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">
                    Seleccionar Tarifa / Paquete Rápido
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[
                      { nombre: "Básico", valor: 10 },
                      { nombre: "Estándar", valor: 15 },
                      { nombre: "Pro", valor: 25 },
                      { nombre: "Plus", valor: 35 },
                      { nombre: "Empresarial", valor: 50 }
                    ].map((pkg) => (
                      <button
                        key={pkg.valor}
                        type="button"
                        onClick={() => {
                          setPagoMontoUSD(String(pkg.valor * pagoPeriodoMeses));
                        }}
                        className={`py-2 px-1 rounded-xl text-[10px] font-black uppercase transition border flex flex-col items-center cursor-pointer ${
                          Number(pagoMontoUSD) === pkg.valor * pagoPeriodoMeses
                            ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                        }`}
                      >
                        <span>${pkg.valor}</span>
                        <span className="text-[8px] font-normal text-slate-400 truncate">{pkg.nombre}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">
                      Monto a Cobrar en USD ($)*
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="25.00"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-2xl py-3 px-4 text-base font-black text-emerald-400 outline-none transition font-mono"
                      value={pagoMontoUSD}
                      onChange={(e) => setPagoMontoUSD(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">
                      Meses a Renovar*
                    </label>
                    <select
                      value={pagoPeriodoMeses}
                      onChange={(e) => {
                        const m = Number(e.target.value);
                        setPagoPeriodoMeses(m);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-2xl py-3 px-4 text-xs font-bold text-white outline-none transition"
                    >
                      <option value={1}>1 Mes (+30 días)</option>
                      <option value={3}>3 Meses (+90 días)</option>
                      <option value={6}>6 Meses (+180 días)</option>
                      <option value={12}>1 Año (+365 días)</option>
                    </select>
                  </div>
                </div>

                {/* Opción para actualizar tarifa pactada de la empresa */}
                <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800/80 flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="chkActualizarTarifa"
                    checked={pagoActualizarTarifa}
                    onChange={(e) => setPagoActualizarTarifa(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700 cursor-pointer accent-emerald-500"
                  />
                  <label htmlFor="chkActualizarTarifa" className="text-[11px] text-slate-300 cursor-pointer">
                    <strong className="text-emerald-400">Actualizar precio de la empresa:</strong> Guardar este valor ${(Number(pagoMontoUSD) / (pagoPeriodoMeses || 1)).toFixed(2)} USD/mes como la nueva tarifa fija de la empresa.
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">
                      Método de Cobro*
                    </label>
                    <select
                      value={pagoMetodo}
                      onChange={(e) => setPagoMetodo(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-2xl py-3 px-4 text-xs font-bold text-white outline-none transition uppercase"
                    >
                      <option value="PAGO_MOVIL">Pago Móvil</option>
                      <option value="ZELLE">Zelle (USD)</option>
                      <option value="EFECTIVO_USD">Efectivo USD ($)</option>
                      <option value="TRANSFERENCIA_BS">Transferencia Bancaria (Bs)</option>
                      <option value="BINANCE_USDT">Binance USDT</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">
                      Referencia Bancaria
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: 123456 / Ref Zelle"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-2xl py-3 px-4 text-xs font-bold text-white outline-none transition font-mono uppercase"
                      value={pagoReferencia}
                      onChange={(e) => setPagoReferencia(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">
                    Nota u Observación
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Pago adelantado de mensualidad mes de Agosto"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-2xl py-3 px-4 text-xs font-bold text-white outline-none transition"
                    value={pagoNota}
                    onChange={(e) => setPagoNota(e.target.value)}
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEmpresaPago(null)}
                    className="px-5 py-3 rounded-2xl border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={guardando}
                    className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black uppercase tracking-wider cursor-pointer transition flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                  >
                    {guardando ? "Procesando..." : "Confirmar Cobro y Renovar"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================================================== */}
      {/* MODAL: VER / GESTIONAR LICENCIA Y CLAVE CRIPTO       */}
      {/* ==================================================== */}
      <AnimatePresence>
        {empresaLicenciaModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl shadow-black/80"
            >
              <div className="bg-slate-950 px-6 py-4.5 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Key className="w-5 h-5 text-amber-400" />
                  Licencia de {empresaLicenciaModal.nombre}
                </h3>
                <button onClick={() => setEmpresaLicenciaModal(null)} className="text-slate-400 hover:text-white transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Clave de Activación Oficial (Entregar al Cliente)
                  </label>
                  <div className="flex items-center gap-2 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                    <code className="text-xs font-mono font-bold text-amber-400 flex-1 break-all select-all">
                      {empresaLicenciaModal.licencia?.claveActivacion || "Sin Clave Generada"}
                    </code>
                    {empresaLicenciaModal.licencia?.claveActivacion && (
                      <button
                        onClick={() => handleCopiarClave(empresaLicenciaModal.licencia!.claveActivacion!)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-[10px] font-black uppercase flex items-center gap-1 transition"
                      >
                        {copiadoKey === empresaLicenciaModal.licencia.claveActivacion ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        Copiar
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Plan Actual:</span>
                    <strong className="text-white uppercase">{empresaLicenciaModal.licencia?.plan || "MENSUAL"}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tarifa Acordada:</span>
                    <strong className="text-emerald-400">${empresaLicenciaModal.licencia?.precioMensualUSD || 25} USD/mes</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Vencimiento:</span>
                    <strong className="text-white font-mono">{empresaLicenciaModal.licencia?.fechaVencimiento ? new Date(empresaLicenciaModal.licencia.fechaVencimiento).toLocaleDateString() : "Sin Límite"}</strong>
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEmpresaLicenciaModal(null)}
                    className="px-5 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================================================== */}
      {/* MODAL: CREAR NUEVA EMPRESA                          */}
      {/* ==================================================== */}
      <AnimatePresence>
        {mostrarModalCrear && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl shadow-black/80 my-8"
            >
              <div className="bg-slate-950 px-6 py-4.5 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Plus className="w-4.5 h-4.5 text-amber-500 stroke-[3px]" />
                  Registrar Nueva Empresa (Tenant Aislado)
                </h3>
                <button onClick={() => setMostrarModalCrear(false)} className="text-slate-400 hover:text-white transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCrearEmpresa} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">
                      Código ID Único (Slug)*
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: farma-salud"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-2xl py-3 px-4 text-xs font-bold text-white placeholder-slate-600 outline-none transition uppercase tracking-wider"
                      value={nuevoId}
                      onChange={(e) => setNuevoId(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">
                      RIF Fiscal (SENIAT)*
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: J-12345678-9"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-2xl py-3 px-4 text-xs font-bold text-white placeholder-slate-600 outline-none transition uppercase tracking-wider font-mono"
                      value={nuevoRif}
                      onChange={(e) => setNuevoRif(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">
                    Nombre Comercial o Razón Social*
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Inversiones Farmasalud C.A."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-2xl py-3 px-4 text-xs font-bold text-white placeholder-slate-600 outline-none transition"
                    value={nuevoNombre}
                    onChange={(e) => setNuevoNombre(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">
                      Rubro del Negocio*
                    </label>
                    <select
                      value={nuevoRubro}
                      onChange={(e) => setNuevoRubro(e.target.value as TipoRubroNegocio)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-2xl py-3 px-4 text-xs font-bold text-white outline-none transition"
                    >
                      <option value="FARMACIA">Farmacia / Salud (Lotes + Vencimiento)</option>
                      <option value="SUPERMERCADO">Supermercado / Bodegón (Balanzas)</option>
                      <option value="FERRETERIA">Ferretería / Materiales (Decimales)</option>
                      <option value="ROPA_CALZADO">Boutique / Calzados (Tallas + Colores)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">
                      Plan de Suscripción*
                    </label>
                    <select
                      value={nuevoPlan}
                      onChange={(e) => {
                        const p = e.target.value as TipoPlanLicencia;
                        setNuevoPlan(p);
                        if (p === "TRIAL") setNuevoPrecioUSD(0);
                        else if (p === "ANUAL") setNuevoPrecioUSD(240);
                        else if (p === "VITALICIA") setNuevoPrecioUSD(0);
                        else setNuevoPrecioUSD(25);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-2xl py-3 px-4 text-xs font-bold text-white outline-none transition"
                    >
                      <option value="MENSUAL">Mensual ($25 USD)</option>
                      <option value="TRIAL">Prueba Gratis (15 Días)</option>
                      <option value="ANUAL">Anual ($240 USD)</option>
                      <option value="VITALICIA">Licencia Vitalicia</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">
                      Nombre de Contacto / Dueño
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Dr. Manuel Gómez"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-2xl py-3 px-4 text-xs font-bold text-white placeholder-slate-600 outline-none transition"
                      value={nuevoContacto}
                      onChange={(e) => setNuevoContacto(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">
                      Teléfono Móvil / WhatsApp
                    </label>
                    <input
                      type="text"
                      placeholder="0414-1234567"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-2xl py-3 px-4 text-xs font-bold text-white placeholder-slate-600 outline-none transition"
                      value={nuevoTelefono}
                      onChange={(e) => setNuevoTelefono(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">
                      Ciudad / Estado
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Valencia, Carabobo"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-2xl py-3 px-4 text-xs font-bold text-white placeholder-slate-600 outline-none transition"
                      value={nuevaCiudad}
                      onChange={(e) => setNuevaCiudad(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">
                      Contraseña Usuario 'admin'*
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Defecto: admin"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-2xl py-3 px-4 text-xs font-bold text-white placeholder-slate-600 outline-none transition"
                      value={nuevoPassAdmin}
                      onChange={(e) => setNuevoPassAdmin(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">
                    Dirección Comercial
                  </label>
                  <textarea
                    placeholder="Av. Bolívar, Centro Comercial..."
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-2xl py-3 px-4 text-xs font-bold text-white placeholder-slate-600 outline-none transition resize-none"
                    value={nuevaDireccion}
                    onChange={(e) => setNuevaDireccion(e.target.value)}
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setMostrarModalCrear(false)}
                    className="px-5 py-3 rounded-2xl border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={guardando}
                    className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider cursor-pointer transition flex items-center gap-2 shadow-lg shadow-amber-500/20"
                  >
                    {guardando ? "Creando DB..." : "Registrar Empresa"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================================================== */}
      {/* MODAL: EDITAR EMPRESA                                */}
      {/* ==================================================== */}
      <AnimatePresence>
        {empresaEdicion && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl shadow-black/80"
            >
              <div className="bg-slate-950 px-6 py-4.5 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Edit3 className="w-4.5 h-4.5 text-amber-500" />
                  Editar Empresa: <span className="text-amber-400">{empresaEdicion.nombre}</span>
                </h3>
                <button onClick={() => setEmpresaEdicion(null)} className="text-slate-400 hover:text-white transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditarEmpresa} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">
                      Código ID (Inmutable)
                    </label>
                    <input
                      type="text"
                      disabled
                      className="w-full bg-slate-950/50 border border-slate-900 rounded-2xl py-3 px-4 text-xs font-bold text-slate-500 cursor-not-allowed font-mono uppercase"
                      value={empresaEdicion.id}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">
                      RIF Fiscal*
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-2xl py-3 px-4 text-xs font-bold text-white outline-none transition uppercase tracking-wider font-mono"
                      value={editRif}
                      onChange={(e) => setEditRif(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">
                    Nombre Comercial*
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-2xl py-3 px-4 text-xs font-bold text-white outline-none transition"
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">
                      Persona de Contacto
                    </label>
                    <input
                      type="text"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-2xl py-3 px-4 text-xs font-bold text-white outline-none transition"
                      value={editContacto}
                      onChange={(e) => setEditContacto(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">
                      Teléfono Móvil
                    </label>
                    <input
                      type="text"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-2xl py-3 px-4 text-xs font-bold text-white outline-none transition"
                      value={editTelefono}
                      onChange={(e) => setEditTelefono(e.target.value)}
                    />
                  </div>
                </div>

                {/* Plan y Tarifa Mensual */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 pl-1">
                        Tipo de Plan*
                      </label>
                      <select
                        value={editPlan}
                        onChange={(e) => setEditPlan(e.target.value as TipoPlanLicencia)}
                        className="w-full bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-xl py-2.5 px-3 text-xs font-bold text-white outline-none transition uppercase"
                      >
                        <option value="MENSUAL">Mensual</option>
                        <option value="TRIMESTRAL">Trimestral</option>
                        <option value="SEMESTRAL">Semestral</option>
                        <option value="ANUAL">Anual</option>
                        <option value="PERSONALIZADO">Personalizado</option>
                        <option value="TRIAL">Prueba (Trial)</option>
                        <option value="VITALICIA">Vitalicia</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 pl-1">
                        Tarifa Mensual ($ USD)*
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-xl py-2.5 px-3 text-xs font-black text-emerald-400 outline-none transition font-mono"
                        value={editPrecioUSD}
                        onChange={(e) => setEditPrecioUSD(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1 pl-1">
                      Tarifas Rápidas:
                    </span>
                    <div className="flex gap-2">
                      {[10, 15, 25, 35, 50].map((pr) => (
                        <button
                          key={pr}
                          type="button"
                          onClick={() => setEditPrecioUSD(pr)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black font-mono border transition cursor-pointer ${
                            editPrecioUSD === pr
                              ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          ${pr}/mes
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">
                    Dirección Comercial
                  </label>
                  <textarea
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-2xl py-3 px-4 text-xs font-bold text-white outline-none transition resize-none"
                    value={editDireccion}
                    onChange={(e) => setEditDireccion(e.target.value)}
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEmpresaEdicion(null)}
                    className="px-5 py-3 rounded-2xl border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={guardando}
                    className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider cursor-pointer transition flex items-center gap-2"
                  >
                    {guardando ? "Guardando..." : "Guardar Cambios"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================================================== */}
      {/* MODAL: GESTIÓN DE USUARIOS Y RESETEO DE CLAVES      */}
      {/* ==================================================== */}
      <AnimatePresence>
        {empresaUsuariosModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl shadow-black/80 my-8"
            >
              <div className="bg-slate-950 px-6 py-4.5 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-2xl">
                    <UserCog className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-white">
                      Usuarios y Reseteo de Claves
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      Empresa: <strong className="text-sky-400">{empresaUsuariosModal.nombre}</strong> (ID: {empresaUsuariosModal.id})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setEmpresaUsuariosModal(null);
                    setResetExito(null);
                  }}
                  className="text-slate-400 hover:text-white transition p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Banner informativo */}
                <div className="bg-sky-950/30 border border-sky-800/40 rounded-2xl p-4 flex items-start gap-3">
                  <KeyRound className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-300 space-y-1">
                    <p className="font-bold text-white">¿El cliente olvidó su contraseña de acceso?</p>
                    <p className="text-slate-400 text-[11px]">
                      Como SuperAdmin puedes restablecer la contraseña de cualquier usuario de esta empresa con <strong>1 solo clic</strong> a la clave estándar (<code className="text-amber-400 font-mono font-bold bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">admin123</code>) o escribir una clave personalizada.
                    </p>
                  </div>
                </div>

                {/* Tarjeta de Éxito y Copiado de Credenciales */}
                {resetExito && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-emerald-950/50 border border-emerald-500/40 rounded-2xl p-5 space-y-3"
                  >
                    <div className="flex items-center gap-2 text-emerald-400 font-black text-xs uppercase tracking-wider">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>¡Contraseña Restablecida Exitosamente!</span>
                    </div>

                    <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800/80 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Empresa:</span>
                        <strong className="text-white">{empresaUsuariosModal.nombre}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Usuario:</span>
                        <strong className="text-sky-400 font-mono font-bold">{resetExito.username}</strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Nueva Contraseña:</span>
                        <code className="bg-emerald-500/20 text-emerald-300 font-mono font-black px-2.5 py-1 rounded-lg border border-emerald-500/30 text-sm select-all">
                          {resetExito.nuevaClave}
                        </code>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const texto = `👋 Hola! Te compartimos tus nuevas credenciales de acceso para Elena POS:\n\n🏢 Empresa: ${empresaUsuariosModal?.nombre}\n👤 Usuario: ${resetExito.username}\n🔑 Contraseña: ${resetExito.nuevaClave}\n\n👉 Puedes iniciar sesión y luego cambiarla si lo deseas.`;
                        navigator.clipboard.writeText(texto);
                        setCopiadoReset(true);
                        setTimeout(() => setCopiadoReset(false), 3000);
                      }}
                      className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
                    >
                      {copiadoReset ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>¡Credenciales Copiadas para WhatsApp!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copiar Mensaje para Enviar al Cliente (WhatsApp)</span>
                        </>
                      )}
                    </button>
                  </motion.div>
                )}

                {/* Lista de Usuarios de la Empresa */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 mb-3 flex items-center justify-between">
                    <span>Usuarios Registrados en esta Empresa ({usuariosEmpresa.length})</span>
                    <button
                      onClick={() => handleAbrirUsuariosEmpresa(empresaUsuariosModal)}
                      className="text-[10px] text-slate-400 hover:text-sky-400 flex items-center gap-1 font-normal transition"
                    >
                      <RefreshCw className={`w-3 h-3 ${cargandoUsuariosEmpresa ? "animate-spin" : ""}`} />
                      Refrescar
                    </button>
                  </h4>

                  {cargandoUsuariosEmpresa ? (
                    <div className="py-8 text-center text-slate-500 flex flex-col items-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-sky-400" />
                      <p className="text-xs">Cargando usuarios desde la base de datos...</p>
                    </div>
                  ) : usuariosEmpresa.length === 0 ? (
                    <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-center text-slate-500 text-xs">
                      No se encontraron usuarios registrados en esta empresa.
                    </div>
                  ) : (
                    <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden divide-y divide-slate-850">
                      {usuariosEmpresa.map((u) => (
                        <div key={u.username} className="p-3.5 flex items-center justify-between hover:bg-slate-900/50 transition">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sky-400 font-black text-xs uppercase">
                              {u.username.substring(0, 2)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-xs">{u.nombre || u.username}</span>
                                <span className="font-mono text-[11px] text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                                  @{u.username}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                <span className="uppercase font-semibold text-slate-400">{u.rol}</span>
                                {u.departamento && <span>• {u.departamento}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setUsuarioAResetear(u.username);
                                handleResetearClaveEmpresa(u.username, "admin123");
                              }}
                              disabled={guardando}
                              className="py-1.5 px-3 bg-amber-500/10 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/30 rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5"
                              title="Resetear inmediatamente a la clave 'admin123'"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>1-Clic (admin123)</span>
                            </button>

                            <button
                              onClick={() => {
                                setUsuarioAResetear(u.username);
                              }}
                              className={`py-1.5 px-2.5 rounded-xl text-[10px] font-bold uppercase transition cursor-pointer border ${
                                usuarioAResetear === u.username
                                  ? "bg-sky-500/20 border-sky-500 text-sky-300"
                                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                              }`}
                              title="Elegir este usuario para escribir contraseña personalizada"
                            >
                              Elegir
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Formulario de Reseteo Personalizado */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-300">
                    Establecer Contraseña Manual
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 pl-1">
                        Usuario a Modificar*
                      </label>
                      <select
                        value={usuarioAResetear}
                        onChange={(e) => setUsuarioAResetear(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 focus:border-sky-500 rounded-xl py-2.5 px-3 text-xs font-bold text-white outline-none transition"
                      >
                        {usuariosEmpresa.map((u) => (
                          <option key={u.username} value={u.username}>
                            @{u.username} ({u.nombre || u.rol})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 pl-1">
                        Nueva Contraseña
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: clave2025 (o vacío para 'admin123')"
                        className="w-full bg-slate-900 border border-slate-700 focus:border-sky-500 rounded-xl py-2 px-3 text-xs font-mono font-bold text-white placeholder-slate-600 outline-none transition"
                        value={claveResetManual}
                        onChange={(e) => setClaveResetManual(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleResetearClaveEmpresa()}
                      disabled={guardando || !usuarioAResetear}
                      className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition cursor-pointer flex items-center gap-2 shadow-md shadow-sky-500/20"
                    >
                      {guardando ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <KeyRound className="w-3.5 h-3.5" />
                      )}
                      <span>Guardar Nueva Contraseña</span>
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setEmpresaUsuariosModal(null);
                      setResetExito(null);
                    }}
                    className="px-5 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================================================== */}
      {/* MODAL: ELIMINAR EMPRESA                             */}
      {/* ==================================================== */}
      <AnimatePresence>
        {empresaAEliminar && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-8 shadow-2xl relative"
            >
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-14 h-14 rounded-full bg-rose-950/40 border border-rose-800/50 flex items-center justify-center text-rose-400 mb-4 animate-pulse">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-black text-white uppercase tracking-wider">¿Eliminar Empresa?</h3>
                <p className="text-slate-400 text-xs mt-3 leading-relaxed">
                  ADVERTENCIA: Esto borrará permanentemente la empresa{" "}
                  <strong className="text-white font-mono">"{empresaAEliminar.nombre}"</strong>{" "}
                  junto con toda su base de datos local. Esta acción es <span className="text-rose-400 font-bold underline">irreversible</span>.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center">
                    Escriba el código exacto: <strong className="text-amber-400 font-mono font-bold select-all bg-slate-950 px-2 py-1 rounded border border-slate-800">"{empresaAEliminar.id}"</strong>
                  </label>
                  <input
                    type="text"
                    placeholder="Escriba el ID aquí..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-2xl py-3 px-4 text-center text-xs font-mono uppercase tracking-wider text-white outline-none transition"
                    value={codigoConfirmacion}
                    onChange={(e) => setCodigoConfirmacion(e.target.value)}
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setEmpresaAEliminar(null);
                      setCodigoConfirmacion("");
                    }}
                    className="flex-1 py-3.5 rounded-2xl border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={confirmarEliminarEmpresa}
                    disabled={codigoConfirmacion !== empresaAEliminar.id}
                    className={`flex-1 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider cursor-pointer transition ${
                      codigoConfirmacion === empresaAEliminar.id
                        ? "bg-rose-600 hover:bg-rose-500 text-white"
                        : "bg-slate-800 text-slate-600 cursor-not-allowed"
                    }`}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
