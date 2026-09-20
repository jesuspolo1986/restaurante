import React, { useState, useEffect } from "react";
import { 
  Users, 
  UserPlus, 
  Edit2, 
  Trash2, 
  ShieldAlert, 
  ShieldCheck, 
  RefreshCw, 
  Key, 
  CheckCircle2, 
  AlertTriangle,
  Lock,
  UserCheck,
  CheckSquare,
  Square,
  Sliders
} from "lucide-react";
import { apiFetch } from "../utils/api";
import { ModuloSistema } from "../types";

interface UserListEntry {
  username: string;
  nombre: string;
  rol: "administrador" | "cajero" | "trabajo";
  departamento?: string;
  modulosPermitidos?: ModuloSistema[];
}

const MODULOS_DISPONIBLES: { id: ModuloSistema; label: string; desc: string; defectoCajero?: boolean; defectoTrabajo?: boolean }[] = [
  { id: "pos", label: "Punto de Venta (POS)", desc: "Cobrar, emitir facturas, notas y vueltos multimoneda", defectoCajero: true },
  { id: "creditos", label: "Clientes & Créditos", desc: "Gestión de deudores, cuentas por cobrar y abonos", defectoCajero: true },
  { id: "pedidos", label: "Trabajos y Pedidos", desc: "Órdenes de trabajo, estados y entregas", defectoCajero: true, defectoTrabajo: true },
  { id: "inventario", label: "Inventario de Productos", desc: "Ver stock, precios, lotes y vencimientos" },
  { id: "almacen", label: "Almacén & Traslados", desc: "Transferencias entre tienda y bodega", defectoCajero: true },
  { id: "sucursales", label: "Multi-Sucursal", desc: "Ver inventario de otras sedes y traslados", defectoCajero: true },
  { id: "compras", label: "Entrada de Mercancía", desc: "Registrar compras a proveedores y actualizar costos" },
  { id: "proveedores", label: "Proveedores", desc: "Directorio de proveedores y cuentas por pagar" },
  { id: "cierre", label: "Cierres & Libro de Ventas", desc: "Cortes X / Z y reportes SENIAT" },
  { id: "reportes", label: "Análisis & Estadísticas", desc: "Ganancias, rentabilidad y ventas por período" },
  { id: "config_impresion", label: "Impresión Térmica", desc: "Configuración de tickets 58/80mm", defectoCajero: true },
  { id: "respaldos", label: "Copias de Seguridad", desc: "Descargar y restaurar base de datos" },
  { id: "elena", label: "Elena AI Asistente", desc: "Consultas inteligentes del negocio", defectoCajero: true },
  { id: "dashboard", label: "Dashboard / Pizarra", desc: "Métricas principales en tiempo real" }
];

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<UserListEntry[]>([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);

  // Form State
  const [username, setUsername] = useState("");
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState<"administrador" | "cajero" | "trabajo">("cajero");
  const [departamento, setDepartamento] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [modulosSeleccionados, setModulosSeleccionados] = useState<ModuloSistema[]>([
    "pos", "creditos", "pedidos", "almacen", "sucursales", "config_impresion", "elena"
  ]);
  const [editando, setEditando] = useState(false);

  // Estado para el PIN de Supervisor
  const [pinSupervisor, setPinSupervisor] = useState<string>("");
  const [mostrarPin, setMostrarPin] = useState<boolean>(false);
  const [nuevoPinInput, setNuevoPinInput] = useState<string>("");
  const [mensajePin, setMensajePin] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);
  const [actualizandoPin, setActualizandoPin] = useState<boolean>(false);

  useEffect(() => {
    cargarUsuarios();
    cargarPinSupervisor();
  }, []);

  const cargarPinSupervisor = async () => {
    try {
      const res = await apiFetch("/api/usuarios/obtener-pin-supervisor");
      if (res.ok) {
        const data = await res.json();
        setPinSupervisor(data.pin);
      }
    } catch (err) {
      console.error("Error al cargar PIN de supervisor:", err);
    }
  };

  const restablecerPinSupervisor = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensajePin(null);
    if (!nuevoPinInput.trim() || nuevoPinInput.trim().length < 4) {
      setMensajePin({ tipo: "error", texto: "El PIN debe tener al menos 4 dígitos/caracteres." });
      return;
    }

    setActualizandoPin(true);
    try {
      const res = await apiFetch("/api/usuarios/forzar-pin-supervisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinNuevo: nuevoPinInput.trim() })
      });

      if (res.ok) {
        setMensajePin({ tipo: "exito", texto: "PIN de Autorización del Supervisor actualizado exitosamente." });
        setPinSupervisor(nuevoPinInput.trim());
        setNuevoPinInput("");
      } else {
        const data = await res.json();
        setMensajePin({ tipo: "error", texto: data.error || "No se pudo actualizar el PIN." });
      }
    } catch (err) {
      console.error(err);
      setMensajePin({ tipo: "error", texto: "Error de conexión con el servidor." });
    } finally {
      setActualizandoPin(false);
    }
  };

  const cargarUsuarios = async () => {
    setCargando(true);
    setMensaje(null);
    try {
      const res = await apiFetch("/api/usuarios");
      if (res.ok) {
        const data = await res.json();
        setUsuarios(data);
      } else {
        setMensaje({ tipo: "error", texto: "No se pudo obtener la lista de usuarios." });
      }
    } catch (err) {
      console.error(err);
      setMensaje({ tipo: "error", texto: "Error de conexión con el servidor." });
    } finally {
      setCargando(false);
    }
  };

  const handleCambioRol = (nuevoRol: "administrador" | "cajero" | "trabajo") => {
    setRol(nuevoRol);
    if (nuevoRol === "administrador") {
      setModulosSeleccionados(MODULOS_DISPONIBLES.map(m => m.id));
    } else if (nuevoRol === "trabajo") {
      setModulosSeleccionados(["pedidos"]);
    } else {
      setModulosSeleccionados(
        MODULOS_DISPONIBLES.filter(m => m.defectoCajero).map(m => m.id)
      );
    }
  };

  const toggleModulo = (modId: ModuloSistema) => {
    if (rol === "administrador") return; // Los administradores tienen acceso total
    setModulosSeleccionados(prev => {
      if (prev.includes(modId)) {
        return prev.filter(id => id !== modId);
      } else {
        return [...prev, modId];
      }
    });
  };

  const seleccionarTodosLosModulos = () => {
    setModulosSeleccionados(MODULOS_DISPONIBLES.map(m => m.id));
  };

  const deseleccionarTodosLosModulos = () => {
    setModulosSeleccionados([]);
  };

  const limpiarFormulario = () => {
    setUsername("");
    setNombre("");
    setRol("cajero");
    setDepartamento("");
    setModulosSeleccionados(MODULOS_DISPONIBLES.filter(m => m.defectoCajero).map(m => m.id));
    setContrasena("");
    setEditando(false);
  };

  const iniciarEdicion = (u: UserListEntry) => {
    setUsername(u.username);
    setNombre(u.nombre);
    setRol(u.rol);
    setDepartamento(u.departamento || "");
    if (u.rol === "administrador") {
      setModulosSeleccionados(MODULOS_DISPONIBLES.map(m => m.id));
    } else if (Array.isArray(u.modulosPermitidos) && u.modulosPermitidos.length > 0) {
      setModulosSeleccionados(u.modulosPermitidos);
    } else if (u.rol === "trabajo") {
      setModulosSeleccionados(["pedidos"]);
    } else {
      setModulosSeleccionados(MODULOS_DISPONIBLES.filter(m => m.defectoCajero).map(m => m.id));
    }
    setContrasena(""); // Dejar en blanco para no cambiarla
    setEditando(true);
  };

  const guardarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);

    // Validaciones
    const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, "");
    if (!cleanUsername) {
      setMensaje({ tipo: "error", texto: "El nombre de usuario no puede estar vacío." });
      return;
    }

    if (!nombre.trim()) {
      setMensaje({ tipo: "error", texto: "El nombre completo es requerido." });
      return;
    }

    if (!editando && (!contrasena || contrasena.trim() === "")) {
      setMensaje({ tipo: "error", texto: "La contraseña es requerida para nuevos usuarios." });
      return;
    }

    if (rol !== "administrador" && modulosSeleccionados.length === 0) {
      setMensaje({ tipo: "error", texto: "Debes habilitar al menos un módulo de trabajo para este usuario." });
      return;
    }

    try {
      const res = await apiFetch("/api/usuarios/guardar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: cleanUsername,
          nombre: nombre.trim(),
          rol,
          departamento: departamento.trim() || undefined,
          contrasena: contrasena.trim() !== "" ? contrasena.trim() : undefined,
          modulosPermitidos: rol === "administrador" ? MODULOS_DISPONIBLES.map(m => m.id) : modulosSeleccionados
        })
      });

      if (res.ok) {
        setMensaje({
          tipo: "exito",
          texto: editando 
            ? `Permisos y datos del usuario "${cleanUsername}" actualizados exitosamente.`
            : `Usuario "${cleanUsername}" creado con sus módulos asignados con éxito.`
        });
        limpiarFormulario();
        cargarUsuarios();
      } else {
        const data = await res.json();
        setMensaje({ tipo: "error", texto: data.error || "Error al guardar el usuario." });
      }
    } catch (err) {
      console.error(err);
      setMensaje({ tipo: "error", texto: "Error al conectar con el servidor." });
    }
  };

  const eliminarUsuario = async (uName: string) => {
    if (uName.toLowerCase() === "admin") {
      alert("No se puede eliminar el usuario administrador maestro (admin).");
      return;
    }

    const confirmar = window.confirm(
      `¿Estás seguro de que deseas eliminar permanentemente el usuario "${uName}"?\n\nEste usuario perderá acceso inmediato al sistema.`
    );
    if (!confirmar) return;

    setMensaje(null);
    try {
      const res = await apiFetch(`/api/usuarios/eliminar/${uName}`, {
        method: "DELETE"
      });

      if (res.ok) {
        setMensaje({ tipo: "exito", texto: `Usuario "${uName}" eliminado con éxito.` });
        if (username === uName) {
          limpiarFormulario();
        }
        cargarUsuarios();
      } else {
        const data = await res.json();
        setMensaje({ tipo: "error", texto: data.error || "No se pudo eliminar el usuario." });
      }
    } catch (err) {
      console.error(err);
      setMensaje({ tipo: "error", texto: "Error al conectar con el servidor." });
    }
  };

  return (
    <div className="space-y-6" id="usuarios-modulo">
      {/* Encabezado Principal */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-950 tracking-tight uppercase">Control de Usuarios y Permisos</h1>
              <p className="text-xs text-slate-500 font-medium">Habilita o deshabilita módulos y áreas de trabajo para cada cajero o empleado</p>
            </div>
          </div>
        </div>
        
        <button
          onClick={cargarUsuarios}
          disabled={cargando}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 font-black text-xs uppercase tracking-wider rounded-2xl transition cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${cargando ? "animate-spin" : ""}`} />
          Sincronizar
        </button>
      </div>

      {/* Alertas */}
      {mensaje && (
        <div className={`p-4 rounded-2xl border flex items-start gap-3 shadow-sm ${
          mensaje.tipo === "exito" 
            ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
            : "bg-rose-50 border-rose-100 text-rose-800"
        }`}>
          {mensaje.tipo === "exito" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div>
            <h4 className="text-sm font-bold">{mensaje.tipo === "exito" ? "Operación Exitosa" : "Atención"}</h4>
            <p className="text-xs mt-1 font-medium">{mensaje.texto}</p>
          </div>
        </div>
      )}

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Formulario de Registro / Edición con Selector de Módulos */}
        <div className="lg:col-span-6 bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
            <UserPlus className="w-5 h-5 text-indigo-500" />
            <h3 className="font-black text-slate-900 text-sm uppercase tracking-wide">
              {editando ? `Editar Acceso: @${username}` : "Registrar Nuevo Usuario / Cajero"}
            </h3>
          </div>

          <form onSubmit={guardarUsuario} className="space-y-4">
            {/* Input Username */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                Nombre de Usuario (Login)
              </label>
              <input
                type="text"
                disabled={editando}
                placeholder="ej: carlos.caja1"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                className="w-full bg-slate-50 text-slate-900 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-medium outline-none focus:border-indigo-500 focus:bg-white disabled:opacity-60 transition"
              />
            </div>

            {/* Input Nombre Completo */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                Nombre Completo (Pantalla)
              </label>
              <input
                type="text"
                placeholder="ej: Carlos Pérez"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full bg-slate-50 text-slate-900 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-medium outline-none focus:border-indigo-500 focus:bg-white transition"
              />
            </div>

            {/* Selector de Rol */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                Rol / Tipo de Cuenta
              </label>
              <select
                value={rol}
                disabled={username.toLowerCase() === "admin"}
                onChange={(e) => handleCambioRol(e.target.value as any)}
                className="w-full bg-slate-50 text-slate-900 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-wider outline-none focus:border-indigo-500 focus:bg-white transition"
              >
                <option value="cajero">Cajero POS (Permisos Personalizables)</option>
                <option value="trabajo">Área de Trabajo / Producción (Órdenes y Pedidos)</option>
                <option value="administrador">Administrador Local (Control Total)</option>
              </select>
            </div>

            {/* Departamento / Área de Producción Asignada */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-baseline">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  Departamento / Área Asignada {rol === "trabajo" ? "(Filtro Exclusivo de Trabajo)" : "(Opcional)"}
                </label>
                <span className="text-[9px] text-indigo-600 font-bold">
                  {rol === "trabajo" ? "Solo verá sus pedidos" : "Para asignaciones"}
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  list="departamentos-sugeridos"
                  placeholder="ej: Bordado, Costura, Diseño Gráfico, Imprenta..."
                  value={departamento}
                  onChange={(e) => setDepartamento(e.target.value)}
                  className="w-full bg-slate-50 text-slate-900 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-medium outline-none focus:border-indigo-500 focus:bg-white transition"
                />
                <datalist id="departamentos-sugeridos">
                  <option value="Bordado" />
                  <option value="Costura" />
                  <option value="Diseño Gráfico" />
                  <option value="Imprenta" />
                  <option value="Sublimación" />
                  <option value="Corte & Confección" />
                  <option value="Estampado" />
                  <option value="General" />
                </datalist>
              </div>
              <p className="text-[10px] text-slate-500">
                Si se asigna un departamento, al iniciar sesión el usuario solo visualizará los pedidos correspondientes a esa área.
              </p>
            </div>

            {/* Input Contraseña */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-baseline">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  Contraseña de Acceso
                </label>
                {editando && (
                  <span className="text-[9px] text-amber-500 font-bold">
                    (Dejar en blanco para conservar actual)
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="password"
                  placeholder={editando ? "Nueva contraseña (opcional)" : "Ingrese contraseña segura"}
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  className="w-full bg-slate-50 text-slate-900 border border-slate-200 rounded-2xl px-4 py-3 pr-10 text-xs font-medium outline-none focus:border-indigo-500 focus:bg-white transition"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
              </div>
            </div>

            {/* SECCIÓN DE HABILITAR / DESHABILITAR MÓDULOS */}
            <div className="pt-2 space-y-3">
              <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                <div className="flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  <label className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Módulos y Permisos Habilitados
                  </label>
                </div>
                {rol !== "administrador" && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={seleccionarTodosLosModulos}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg transition"
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      onClick={deseleccionarTodosLosModulos}
                      className="text-[10px] font-bold text-slate-500 hover:text-slate-700 bg-slate-100 px-2 py-1 rounded-lg transition"
                    >
                      Ninguno
                    </button>
                  </div>
                )}
              </div>

              {rol === "administrador" ? (
                <div className="bg-indigo-50 border border-indigo-100 p-3.5 rounded-2xl flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0" />
                  <p className="text-xs text-indigo-900 font-bold">
                    El Administrador tiene acceso total e ilimitado a todos los módulos y configuraciones del sistema.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1 border border-slate-100 p-2.5 rounded-2xl bg-slate-50/50">
                  {MODULOS_DISPONIBLES.map((mod) => {
                    const estaActivo = modulosSeleccionados.includes(mod.id);
                    return (
                      <div
                        key={mod.id}
                        onClick={() => toggleModulo(mod.id)}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition cursor-pointer select-none ${
                          estaActivo 
                            ? "bg-white border-indigo-200 shadow-sm" 
                            : "bg-slate-100/60 border-slate-200/60 opacity-60 hover:opacity-100"
                        }`}
                      >
                        <div className="mt-0.5 shrink-0 text-indigo-600">
                          {estaActivo ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-[11px] font-black uppercase tracking-tight truncate ${
                            estaActivo ? "text-slate-900" : "text-slate-500"
                          }`}>
                            {mod.label}
                          </p>
                          <p className="text-[9px] text-slate-400 leading-tight line-clamp-1">
                            {mod.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Acciones del Formulario */}
            <div className="pt-3 flex gap-3">
              {editando && (
                <button
                  type="button"
                  onClick={limpiarFormulario}
                  className="w-1/3 py-3 border border-slate-200 text-slate-600 hover:bg-slate-50 font-black text-xs uppercase tracking-wider rounded-2xl transition cursor-pointer"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                className={`flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md shadow-indigo-600/15 transition cursor-pointer`}
              >
                {editando ? "Guardar Cambios de Permisos" : "Crear Usuario con Permisos"}
              </button>
            </div>
          </form>
        </div>

        {/* Listado de Usuarios y sus permisos asignados */}
        <div className="lg:col-span-6 bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4 justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-500" />
              <h3 className="font-black text-slate-900 text-sm uppercase tracking-wide">
                Usuarios Registrados ({usuarios.length})
              </h3>
            </div>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {cargando && usuarios.length === 0 ? (
              <div className="text-center py-8 text-slate-400 font-medium text-xs">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                Cargando usuarios...
              </div>
            ) : usuarios.length === 0 ? (
              <div className="text-center py-8 text-slate-400 font-medium text-xs">
                No hay usuarios registrados en esta empresa.
              </div>
            ) : (
              usuarios.map((u) => {
                const isAdmin = u.username.toLowerCase() === "admin";
                const numModulos = u.rol === "administrador" ? MODULOS_DISPONIBLES.length : (u.modulosPermitidos?.length ?? 0);

                return (
                  <div 
                    key={u.username}
                    className={`border rounded-2xl p-4 transition ${
                      username === u.username ? "bg-indigo-50/30 border-indigo-200" : "bg-slate-50/50 border-slate-200/80 hover:bg-white"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-black text-slate-900">@{u.username}</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            u.rol === "administrador"
                              ? "bg-indigo-100 text-indigo-800"
                              : u.rol === "trabajo"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-200 text-slate-700"
                          }`}>
                            {u.rol === "administrador" ? "Administrador" : u.rol === "trabajo" ? "Área Trabajo" : "Cajero"}
                          </span>
                          {u.departamento && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-purple-50 border border-purple-200 text-purple-700">
                              Área: {u.departamento}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 font-bold mt-0.5">{u.nombre}</p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => iniciarEdicion(u)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition cursor-pointer"
                          title="Editar módulos y permisos"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {!isAdmin ? (
                          <button
                            onClick={() => eliminarUsuario(u.username)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                            title="Eliminar usuario"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <div className="p-2 text-slate-300" title="Usuario de sistema maestro. No se puede eliminar.">
                            <Key className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Módulos Habilitados para este usuario */}
                    <div className="mt-3 pt-2.5 border-t border-slate-200/60">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                        <span>Módulos asignados:</span>
                        <span className="font-mono text-indigo-600 font-black">{numModulos} activos</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {u.rol === "administrador" ? (
                          <span className="text-[9px] bg-indigo-100/70 text-indigo-800 font-black px-2 py-0.5 rounded-md uppercase">
                            Acceso Total (14 Módulos)
                          </span>
                        ) : (u.modulosPermitidos && u.modulosPermitidos.length > 0) ? (
                          u.modulosPermitidos.map(modId => {
                            const modInfo = MODULOS_DISPONIBLES.find(m => m.id === modId);
                            return (
                              <span key={modId} className="text-[9px] bg-white border border-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded-md">
                                {modInfo?.label || modId}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-[9px] text-rose-500 font-bold italic">
                            Sin módulos asignados (Acceso restringido)
                          </span>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Sección Recuperación y Gestión del PIN del Supervisor */}
      <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm space-y-6" id="gestion-pin-supervisor">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm uppercase tracking-wide">
                PIN de Autorización del Supervisor
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Este PIN es requerido para autorizar devoluciones, anulaciones y arqueos ciegos
              </p>
            </div>
          </div>
        </div>

        {mensajePin && (
          <div className={`p-4 rounded-2xl border flex items-start gap-3 shadow-sm ${
            mensajePin.tipo === "exito" 
              ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
              : "bg-rose-50 border-rose-100 text-rose-800"
          }`}>
            {mensajePin.tipo === "exito" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-xs font-bold">{mensajePin.texto}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="bg-slate-50/50 border border-slate-100 p-5 rounded-2xl space-y-4">
            <div className="space-y-1">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">PIN Actual Registrado</h4>
              <p className="text-[11px] text-slate-500 font-medium">
                Como administrador, puedes visualizar el PIN de supervisor activo en caso de olvido.
              </p>
            </div>

            <div className="flex items-center gap-3 bg-white border border-slate-200 p-3 rounded-2xl max-w-xs">
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider">PIN:</span>
              <span className="font-mono text-base font-black tracking-widest text-indigo-950 flex-1">
                {mostrarPin ? pinSupervisor : "••••"}
              </span>
              <button
                type="button"
                onClick={() => setMostrarPin(!mostrarPin)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-500 cursor-pointer select-none px-2 py-1 bg-indigo-50 rounded-lg transition"
              >
                {mostrarPin ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </div>

          <form onSubmit={restablecerPinSupervisor} className="bg-slate-50/50 border border-slate-100 p-5 rounded-2xl space-y-4">
            <div className="space-y-1">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Cambiar PIN del Supervisor</h4>
              <p className="text-[11px] text-slate-500 font-medium">
                Ingresa un PIN nuevo de al menos 4 dígitos para actualizar la clave de autorizaciones.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 space-y-1.5 w-full">
                <input
                  type="password"
                  maxLength={8}
                  placeholder="Nuevo PIN (ej: 4321)"
                  value={nuevoPinInput}
                  onChange={(e) => setNuevoPinInput(e.target.value.replace(/\D/g, ""))}
                  className="w-full bg-white text-slate-900 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold tracking-wider outline-none focus:border-indigo-500 transition"
                />
              </div>
              <button
                type="submit"
                disabled={actualizandoPin}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider py-3.5 px-6 rounded-2xl shadow-md transition whitespace-nowrap cursor-pointer"
              >
                {actualizandoPin ? "Guardando..." : "Asignar Nuevo PIN"}
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  );
}
