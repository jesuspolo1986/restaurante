/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  FileText, 
  Plus, 
  Trash2, 
  Edit, 
  Download, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Image as ImageIcon,
  User,
  Phone,
  MapPin,
  Calendar,
  X,
  FileDown,
  Printer,
  Coins,
  ShieldAlert,
  Briefcase,
  Tag,
  Filter,
  UserCheck,
  Wrench,
  UserPlus,
  Sliders,
  ArrowUpDown,
  AlertCircle,
  Hash,
  FolderPlus,
  Folder
} from "lucide-react";
import { apiFetch } from "../utils/api";
import { Pedido, Empleado, Usuario } from "../types";
import { jsPDF } from "jspdf";
import ThermalPedidoModal from "./ThermalPedidoModal";

const DEPARTAMENTOS_PRESET = [
  "General",
  "Bordado",
  "Diseño Gráfico",
  "Imprenta",
  "Costura",
  "Sublimación",
  "Corte y Confección",
  "Otros"
];

interface PedidosProps {
  usuario?: Usuario | null;
}

export default function Pedidos({ usuario }: PedidosProps = {}) {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(false);

  // Form states
  const [id, setId] = useState("");
  const [codigoPedido, setCodigoPedido] = useState("");
  const [nombres, setNombres] = useState(""); 
  const [apellidos, setApellidos] = useState(""); 
  const [cedula, setCedula] = useState(""); 
  const [telefono, setTelefono] = useState(""); 
  const [direccion, setDireccion] = useState(""); 
  const [descripcion, setDescripcion] = useState(""); 
  const [estado, setEstado] = useState<Pedido["estado"]>("Pendiente"); 
  const [fechaPedido, setFechaPedido] = useState(() => new Date().toISOString().split("T")[0]);
  const [fechaEntregaEstimada, setFechaEntregaEstimada] = useState(""); 
  const [fechaEntregado, setFechaEntregado] = useState(""); 
  const [imagenes, setImagenes] = useState<string[]>([]); 

  // Assignment and Department fields
  const [asignadoA, setAsignadoA] = useState("");
  const [departamentoServicio, setDepartamentoServicio] = useState("General");
  const [notasOperativas, setNotasOperativas] = useState("");
  const [listaUsuarios, setListaUsuarios] = useState<{ username: string; nombre: string; rol: string; departamento?: string }[]>([]);
  const [listaEmpleados, setListaEmpleados] = useState<Empleado[]>([]);

  // Dynamic departments states
  const [departamentos, setDepartamentos] = useState<string[]>(DEPARTAMENTOS_PRESET);
  const [mostrarModalDepartamentos, setMostrarModalDepartamentos] = useState(false);
  const [nuevoDptoNombre, setNuevoDptoNombre] = useState("");
  const [guardandoDpto, setGuardandoDpto] = useState(false);
  const [errorDpto, setErrorDpto] = useState("");

  // Employee modal states
  const [mostrarModalEmpleados, setMostrarModalEmpleados] = useState(false);
  const [nuevoEmpNombre, setNuevoEmpNombre] = useState("");
  const [nuevoEmpCargo, setNuevoEmpCargo] = useState("");
  const [nuevoEmpDep, setNuevoEmpDep] = useState("General");
  const [guardandoEmp, setGuardandoEmp] = useState(false);
  const [errorEmp, setErrorEmp] = useState("");
  
  // Financial States
  const [montoTotal, setMontoTotal] = useState<number>(0);
  const [anticipo, setAnticipo] = useState<number>(0);
  const [metodoPagoAnticipo, setMetodoPagoAnticipo] = useState<string>("EFECTIVO_USD");
  const [metodoPagoSaldo, setMetodoPagoSaldo] = useState<string>("EFECTIVO_USD");
  const [anticipoRegistrado, setAnticipoRegistrado] = useState<boolean>(false);
  const [saldoRegistrado, setSaldoRegistrado] = useState<boolean>(false);

  // Role detection & Department binding
  const [currentUser] = useState(() => {
    const cached = localStorage.getItem("elena_sesion");
    return cached ? JSON.parse(cached) : null;
  });

  const usuarioEfectivo = usuario || currentUser;
  const esTrabajo = usuarioEfectivo?.rol === "trabajo";
  const esAdmin = usuarioEfectivo?.rol === "administrador" || usuarioEfectivo?.rol === "superadmin" || usuarioEfectivo?.username?.toLowerCase() === "admin";
  const departamentoUsuario = usuarioEfectivo?.departamento || "";

  // Search and filters
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("");
  const [filtroAsignado, setFiltroAsignado] = useState<string>("");
  const [filtroDepartamento, setFiltroDepartamento] = useState<string>(() => {
    // Si el usuario tiene departamento asignado, prefiltrar por defecto
    return departamentoUsuario || "";
  });
  const [filtroFechaRango, setFiltroFechaRango] = useState<"todos" | "hoy" | "semana" | "mes" | "urgente_entrega" | "atrasados">("todos");
  const [filtroSaldo, setFiltroSaldo] = useState<"todos" | "con_saldo" | "saldados">("todos");
  const [ordenarPedidos, setOrdenarPedidos] = useState<"fecha_desc" | "fecha_asc" | "entrega_asc" | "monto_desc" | "saldo_desc">("fecha_desc");
  const [mostrarFiltrosAvanzados, setMostrarFiltrosAvanzados] = useState(false);

  // Thermal modal states
  const [pedidoParaImprimir, setPedidoParaImprimir] = useState<Pedido | null>(null);
  const [mostrarModalTermico, setMostrarModalTermico] = useState(false);

  const limpiarFiltros = () => {
    setBusqueda("");
    setFiltroEstado("");
    setFiltroAsignado("");
    setFiltroDepartamento(departamentoUsuario && !esAdmin ? departamentoUsuario : "");
    setFiltroFechaRango("todos");
    setFiltroSaldo("todos");
    setOrdenarPedidos("fecha_desc");
  };

  // UI state
  const [editando, setEditando] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<Pedido | null>(null);

  const pedidosAnterioresRef = useRef<string[]>([]);

  // Función para reproducir el timbre de campana ("ding-dong" cristalino) usando la API de Web Audio
  const reproducirSonidoNotificacion = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      // Primera nota (frecuencia alta, sonido cristalino)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // Re5
      gain1.gain.setValueAtTime(0.12, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.6);

      // Segunda nota un poco desfasada para el efecto "ding-dong" de campana de recepción
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(880, ctx.currentTime); // La5
        gain2.gain.setValueAtTime(0.12, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.8);
      }, 120);

    } catch (err) {
      console.warn("No se pudo reproducir el sonido:", err);
    }
  };

  useEffect(() => {
    cargarPedidos();
    cargarUsuarios();
    cargarEmpleados();
    cargarDepartamentos();

    // Polling silencioso en segundo plano cada 10 segundos para nuevos pedidos
    const interval = setInterval(() => {
      cargarPedidosSilencioso();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const cargarDepartamentos = async () => {
    try {
      const res = await apiFetch("/api/departamentos-pedidos");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setDepartamentos(data);
        }
      }
    } catch (err) {
      console.error("Error cargando departamentos de pedidos:", err);
    }
  };

  const agregarDepartamento = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!nuevoDptoNombre.trim()) {
      setErrorDpto("Escriba el nombre del nuevo departamento o área");
      return;
    }
    setGuardandoDpto(true);
    setErrorDpto("");
    try {
      const res = await apiFetch("/api/departamentos-pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nuevoDptoNombre.trim() })
      });
      if (res.ok) {
        await cargarDepartamentos();
        setDepartamentoServicio(nuevoDptoNombre.trim());
        setNuevoEmpDep(nuevoDptoNombre.trim());
        setNuevoDptoNombre("");
        setErrorDpto("");
        setMostrarModalDepartamentos(false);
      } else {
        const errData = await res.json();
        setErrorDpto(errData.error || "Error al registrar el departamento");
      }
    } catch (err) {
      setErrorDpto("Error de conexión al guardar el departamento");
    } finally {
      setGuardandoDpto(false);
    }
  };

  const eliminarDepartamento = async (nombreDpto: string) => {
    if (nombreDpto.toLowerCase() === "general") {
      alert("El departamento 'General' no puede ser eliminado");
      return;
    }
    if (!confirm(`¿Desea eliminar el departamento '${nombreDpto}' de la lista de selección?`)) return;
    try {
      const res = await apiFetch(`/api/departamentos-pedidos/${encodeURIComponent(nombreDpto)}`, {
        method: "DELETE"
      });
      if (res.ok) {
        await cargarDepartamentos();
        if (departamentoServicio === nombreDpto) {
          setDepartamentoServicio("General");
        }
      } else {
        const errData = await res.json();
        alert(errData.error || "No se pudo eliminar el departamento");
      }
    } catch (err) {
      console.error("Error al eliminar departamento:", err);
    }
  };

  const cargarUsuarios = async () => {
    try {
      const res = await apiFetch("/api/usuarios");
      if (res.ok) {
        const data = await res.json();
        setListaUsuarios(data);
      }
    } catch (err) {
      console.error("Error cargando lista de usuarios:", err);
    }
  };

  const cargarEmpleados = async () => {
    try {
      const res = await apiFetch("/api/empleados");
      if (res.ok) {
        const data = await res.json();
        setListaEmpleados(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error cargando lista de empleados:", err);
    }
  };

  const agregarEmpleado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoEmpNombre.trim()) {
      setErrorEmp("Escriba el nombre real del empleado u operador");
      return;
    }
    setGuardandoEmp(true);
    setErrorEmp("");
    try {
      const res = await apiFetch("/api/empleados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nuevoEmpNombre.trim(),
          cargo: nuevoEmpCargo.trim(),
          departamento: nuevoEmpDep
        })
      });
      if (res.ok) {
        await cargarEmpleados();
        setAsignadoA(nuevoEmpNombre.trim());
        if (nuevoEmpDep && nuevoEmpDep !== "General") {
          setDepartamentoServicio(nuevoEmpDep);
        }
        setNuevoEmpNombre("");
        setNuevoEmpCargo("");
        setErrorEmp("");
        setMostrarModalEmpleados(false);
      } else {
        const errData = await res.json();
        setErrorEmp(errData.error || "Error al registrar el empleado");
      }
    } catch (err) {
      setErrorEmp("Error de conexión al guardar el empleado");
    } finally {
      setGuardandoEmp(false);
    }
  };

  const eliminarEmpleado = async (empId: string) => {
    if (!confirm("¿Desea eliminar este empleado del catálogo de asignaciones?")) return;
    try {
      const res = await apiFetch(`/api/empleados/${empId}`, { method: "DELETE" });
      if (res.ok) {
        cargarEmpleados();
      }
    } catch (err) {
      console.error("Error al eliminar empleado:", err);
    }
  };

  const cargarPedidos = async () => {
    setCargando(true);
    try {
      const res = await apiFetch("/api/pedidos");
      if (res.ok) {
        const data = await res.json();
        setPedidos(data);
        // Inicializar los IDs para no sonar en el primer renderizado
        pedidosAnterioresRef.current = data.map((p: Pedido) => p.id);
      }
    } catch (err) {
      console.error("Error cargando pedidos:", err);
    } finally {
      setCargando(false);
    }
  };

  const cargarPedidosSilencioso = async () => {
    try {
      const res = await apiFetch("/api/pedidos");
      if (res.ok) {
        const data: Pedido[] = await res.json();
        
        // Si ya teníamos cargados previamente, comparamos si hay IDs nuevos
        if (pedidosAnterioresRef.current.length > 0) {
          const nuevos = data.filter(p => !pedidosAnterioresRef.current.includes(p.id));
          if (nuevos.length > 0) {
            reproducirSonidoNotificacion();
          }
        }
        
        // Actualizar referencia de IDs conocidos y el estado de la UI
        pedidosAnterioresRef.current = data.map(p => p.id);
        setPedidos(data);
      }
    } catch (err) {
      console.error("Error en refresco silencioso de pedidos:", err);
    }
  };

  const cambiarEstadoRapido = async (pedido: Pedido, nuevoEstado: Pedido["estado"]) => {
    try {
      const res = await apiFetch("/api/pedidos/guardar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...pedido,
          estado: nuevoEstado,
          fecha_entregado: nuevoEstado === "Entregado" ? (pedido.fecha_entregado || new Date().toISOString().split("T")[0]) : undefined
        })
      });
      if (res.ok) {
        // Recargar con refresco silencioso de inmediato para mantener sincronizado
        await cargarPedidosSilencioso();
      } else {
        const errData = await res.json();
        alert(`Error: ${errData.error || "No se pudo actualizar el estado"}`);
      }
    } catch (err) {
      console.error("Error actualizando estado rápido:", err);
    }
  };

  const limpiarFormulario = () => {
    setId("");
    setCodigoPedido("");
    setNombres("");
    setApellidos("");
    setCedula("");
    setTelefono("");
    setDireccion("");
    setDescripcion("");
    setEstado("Pendiente");
    setFechaPedido(new Date().toISOString().split("T")[0]);
    setFechaEntregaEstimada("");
    setFechaEntregado("");
    setImagenes([]);
    setAsignadoA("");
    setDepartamentoServicio("General");
    setNotasOperativas("");
    setMontoTotal(0);
    setAnticipo(0);
    setMetodoPagoAnticipo("EFECTIVO_USD");
    setMetodoPagoSaldo("EFECTIVO_USD");
    setAnticipoRegistrado(false);
    setSaldoRegistrado(false);
    setEditando(false);
  };

  const handleEdit = (pedido: Pedido) => {
    setId(pedido.id);
    setCodigoPedido(pedido.codigo_pedido || "");
    setNombres(pedido.nombres);
    setApellidos(pedido.apellidos || "");
    setCedula(pedido.cedula);
    setTelefono(pedido.telefono);
    setDireccion(pedido.direccion || "");
    setDescripcion(pedido.descripcion);
    setEstado(pedido.estado);
    setFechaPedido(pedido.fecha_pedido);
    setFechaEntregaEstimada(pedido.fecha_entrega_estimada || "");
    setFechaEntregado(pedido.fecha_entregado || "");
    setImagenes(pedido.imagenes || []);
    setAsignadoA(pedido.asignado_a || "");
    setDepartamentoServicio(pedido.departamento_servicio || "General");
    setNotasOperativas(pedido.notas_operativas || "");
    setMontoTotal(pedido.monto_total);
    setAnticipo(pedido.anticipo);
    setMetodoPagoAnticipo(pedido.metodo_pago_anticipo || "EFECTIVO_USD");
    setMetodoPagoSaldo(pedido.metodo_pago_saldo || "EFECTIVO_USD");
    setAnticipoRegistrado(!!pedido.anticipo_registrado);
    setSaldoRegistrado(!!pedido.saldo_registrado);
    setEditando(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEliminar = async (pedidoId: string) => {
    if (!window.confirm("¿Está seguro de eliminar este registro de pedido?")) return;
    try {
      const res = await apiFetch(`/api/pedidos/${pedidoId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        cargarPedidos();
        if (id === pedidoId) limpiarFormulario();
      }
    } catch (err) {
      console.error("Error eliminando pedido:", err);
    }
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombres || !cedula || !telefono || !descripcion) {
      alert("Por favor complete los campos obligatorios: Nombres, Cédula, Teléfono y Descripción");
      return;
    }

    try {
      const res = await apiFetch("/api/pedidos/guardar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: id || undefined,
          codigo_pedido: codigoPedido || undefined,
          nombres,
          apellidos,
          cedula,
          telefono,
          direccion,
          descripcion,
          estado,
          fecha_pedido: fechaPedido,
          fecha_entrega_estimada: fechaEntregaEstimada || undefined,
          fecha_entregado: estado === "Entregado" ? (fechaEntregado || new Date().toISOString().split("T")[0]) : undefined,
          imagenes,
          monto_total: montoTotal,
          anticipo,
          metodo_pago_anticipo: metodoPagoAnticipo,
          metodo_pago_saldo: metodoPagoSaldo,
          anticipo_registrado: anticipoRegistrado,
          saldo_registrado: saldoRegistrado,
          asignado_a: asignadoA || undefined,
          departamento_servicio: departamentoServicio || undefined,
          notas_operativas: notasOperativas || undefined
        })
      });

      if (res.ok) {
        alert("Pedido / Trabajo guardado con éxito.");
        cargarPedidos();
        limpiarFormulario();
      } else {
        const errData = await res.json();
        alert(`Error: ${errData.error || "No se pudo guardar el pedido"}`);
      }
    } catch (err) {
      console.error("Error guardando pedido:", err);
    }
  };

  // Image Upload handler (base64 conversion)
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      procesarArchivos(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      procesarArchivos(e.target.files);
    }
  };

  const procesarArchivos = (files: FileList) => {
    const list = Array.from(files);
    list.forEach(file => {
      if (!file.type.startsWith("image/")) {
        alert("Únicamente se permiten archivos de imagen (récipes, fórmulas).");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setImagenes(prev => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removerImagen = (index: number) => {
    setImagenes(prev => prev.filter((_, i) => i !== index));
  };

  // Abrir Modal de Impresión Térmica Directa (58mm / 80mm / Común)
  const abrirImpresionTermica = (pedido: Pedido) => {
    setPedidoParaImprimir(pedido);
    setMostrarModalTermico(true);
  };

  // PDF Ticket / Receipt Generator using jsPDF with Custom Header from Thermal Settings
  const descargarTicketPDF = (pedido: Pedido) => {
    const tituloCabecera = localStorage.getItem("thermal_cabecera_titulo") || "CONTROL DE TRABAJOS Y PEDIDOS";
    const rifCabecera = localStorage.getItem("thermal_cabecera_rif") || "";
    const telefonoCabecera = localStorage.getItem("thermal_cabecera_telefono") || "";
    const direccionCabecera = localStorage.getItem("thermal_cabecera_direccion") || "";
    const mensajePie = localStorage.getItem("thermal_pie_mensaje") || "¡Gracias por su preferencia!\nConserve este ticket para retirar su trabajo.";
    const anchoPapel = (localStorage.getItem("thermal_papel_ancho") as "58" | "80") || "58";
    
    const is58 = anchoPapel === "58";
    const pageWidth = is58 ? 58 : 80;
    const centerX = pageWidth / 2;

    const doc = new jsPDF({
      unit: "mm",
      format: [pageWidth, 185]
    });

    let currentY = 8;

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(is58 ? 9 : 11);
    doc.text(tituloCabecera, centerX, currentY, { align: "center" });
    currentY += 4;

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(is58 ? 6 : 7);
    if (rifCabecera) {
      doc.text(`RIF: ${rifCabecera}`, centerX, currentY, { align: "center" });
      currentY += 3.5;
    }
    if (telefonoCabecera) {
      doc.text(`Telf: ${telefonoCabecera}`, centerX, currentY, { align: "center" });
      currentY += 3.5;
    }
    if (direccionCabecera) {
      const dirLines = doc.splitTextToSize(direccionCabecera, pageWidth - 10);
      dirLines.forEach((l: string) => {
        doc.text(l, centerX, currentY, { align: "center" });
        currentY += 3.5;
      });
    }

    doc.text("-".repeat(is58 ? 32 : 44), centerX, currentY, { align: "center" });
    currentY += 4;

    const codigo = pedido.codigo_pedido || pedido.id.slice(-6).toUpperCase();
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(is58 ? 8.5 : 10);
    doc.text(`CÓDIGO DE RETIRO: ${codigo}`, centerX, currentY, { align: "center" });
    currentY += 4.5;

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(is58 ? 6.5 : 7.5);
    doc.text(`Fecha Emisión: ${pedido.fecha_pedido}`, 5, currentY);
    currentY += 3.5;
    if (pedido.fecha_entrega_estimada) {
      doc.text(`Entrega Estimada: ${pedido.fecha_entrega_estimada}`, 5, currentY);
      currentY += 3.5;
    }
    doc.text(`Cliente: ${pedido.nombres} ${pedido.apellidos || ""}`, 5, currentY);
    currentY += 3.5;
    doc.text(`Cédula/RIF: ${pedido.cedula}`, 5, currentY);
    currentY += 3.5;
    doc.text(`Teléfono: ${pedido.telefono}`, 5, currentY);
    currentY += 3.5;
    if (pedido.departamento_servicio) {
      doc.text(`Área/Depto: ${pedido.departamento_servicio}`, 5, currentY);
      currentY += 3.5;
    }
    if (pedido.asignado_a) {
      doc.text(`Asignado a: ${pedido.asignado_a}`, 5, currentY);
      currentY += 3.5;
    }

    doc.text("-".repeat(is58 ? 32 : 44), centerX, currentY, { align: "center" });
    currentY += 4;

    doc.setFont("Helvetica", "bold");
    doc.text("DESCRIPCIÓN DEL TRABAJO:", 5, currentY);
    currentY += 3.5;
    doc.setFont("Helvetica", "normal");
    const descLines = doc.splitTextToSize(pedido.descripcion, pageWidth - 10);
    descLines.forEach((line: string) => {
      doc.text(line, 5, currentY);
      currentY += 3.5;
    });

    currentY += 1.5;
    doc.text("-".repeat(is58 ? 32 : 44), centerX, currentY, { align: "center" });
    currentY += 4;

    const saldo = pedido.monto_total - pedido.anticipo;
    doc.setFont("Helvetica", "bold");
    doc.text(`Estado: ${pedido.estado.toUpperCase()}`, 5, currentY);
    currentY += 4;
    doc.text(`Total Presupuestado: $${pedido.monto_total.toFixed(2)}`, 5, currentY);
    currentY += 4;
    doc.text(`Anticipo Recibido: $${pedido.anticipo.toFixed(2)}`, 5, currentY);
    currentY += 4;
    doc.text(`Saldo Restante: $${saldo.toFixed(2)}`, 5, currentY);
    currentY += 5;

    doc.text("-".repeat(is58 ? 32 : 44), centerX, currentY, { align: "center" });
    currentY += 4;

    doc.setFont("Helvetica", "italic");
    doc.setFontSize(is58 ? 5.5 : 6.5);
    const pieLines = doc.splitTextToSize(mensajePie || "Presente este ticket o su código al retirar.", pageWidth - 10);
    pieLines.forEach((line: string) => {
      doc.text(line, centerX, currentY, { align: "center" });
      currentY += 3.2;
    });

    doc.save(`ticket_pedido_${codigo}.pdf`);
  };

  // Filter and Search logic
  const pedidosFiltrados = pedidos.filter(p => {
    // Restricción de visibilidad por departamento para usuarios asignados a un área de trabajo
    if (!esAdmin && departamentoUsuario) {
      const perteneceMiDepto = p.departamento_servicio && p.departamento_servicio.toLowerCase() === departamentoUsuario.toLowerCase();
      const asignadoAMi = p.asignado_a && (
        p.asignado_a.toLowerCase().includes(usuarioEfectivo?.nombre?.toLowerCase() || "") || 
        p.asignado_a.toLowerCase().includes(usuarioEfectivo?.username?.toLowerCase() || "")
      );
      if (!perteneceMiDepto && !asignadoAMi) {
        return false;
      }
    }

    const term = busqueda.trim().toLowerCase();
    const coincideBusqueda = 
      (p.codigo_pedido && p.codigo_pedido.toLowerCase().includes(term)) ||
      p.id.toLowerCase().includes(term) ||
      p.nombres.toLowerCase().includes(term) ||
      (p.apellidos && p.apellidos.toLowerCase().includes(term)) ||
      p.cedula.toLowerCase().includes(term) ||
      p.telefono.toLowerCase().includes(term) ||
      p.descripcion.toLowerCase().includes(term) ||
      (p.asignado_a && p.asignado_a.toLowerCase().includes(term)) ||
      (p.departamento_servicio && p.departamento_servicio.toLowerCase().includes(term));

    const coincideEstado = filtroEstado ? p.estado === filtroEstado : true;
    const coincideAsignado = filtroAsignado ? (p.asignado_a && p.asignado_a.toLowerCase().includes(filtroAsignado.toLowerCase())) : true;
    const coincideDepartamento = filtroDepartamento ? (p.departamento_servicio === filtroDepartamento) : true;

    // Filtro Rango de Fecha / Vencimiento
    if (filtroFechaRango !== "todos") {
      const hoyStr = new Date().toISOString().split("T")[0];
      const fechaPed = p.fecha_pedido ? p.fecha_pedido.split("T")[0] : "";
      const fechaEntEst = p.fecha_entrega_estimada ? p.fecha_entrega_estimada.split("T")[0] : "";

      if (filtroFechaRango === "hoy") {
        if (fechaPed !== hoyStr) return false;
      } else if (filtroFechaRango === "semana") {
        const dPed = new Date(fechaPed || 0);
        const sieteDiasAtras = new Date();
        sieteDiasAtras.setDate(sieteDiasAtras.getDate() - 7);
        if (dPed < sieteDiasAtras) return false;
      } else if (filtroFechaRango === "mes") {
        const dPed = new Date(fechaPed || 0);
        const treintaDiasAtras = new Date();
        treintaDiasAtras.setDate(treintaDiasAtras.getDate() - 30);
        if (dPed < treintaDiasAtras) return false;
      } else if (filtroFechaRango === "urgente_entrega") {
        if (!fechaEntEst || p.estado === "Entregado") return false;
        const dHoy = new Date(hoyStr);
        const dEnt = new Date(fechaEntEst);
        const diffDays = Math.ceil((dEnt.getTime() - dHoy.getTime()) / (1000 * 3600 * 24));
        if (diffDays < 0 || diffDays > 2) return false;
      } else if (filtroFechaRango === "atrasados") {
        if (!fechaEntEst || p.estado === "Entregado") return false;
        if (fechaEntEst >= hoyStr) return false;
      }
    }

    // Filtro Saldo
    const saldo = (p.monto_total || 0) - (p.anticipo || 0);
    if (filtroSaldo === "con_saldo" && saldo <= 0) return false;
    if (filtroSaldo === "saldados" && saldo > 0) return false;

    return coincideBusqueda && coincideEstado && coincideAsignado && coincideDepartamento;
  });

  // Sorting
  const pedidosOrdenados = [...pedidosFiltrados].sort((a, b) => {
    if (ordenarPedidos === "fecha_desc") {
      return new Date(b.fecha_pedido || 0).getTime() - new Date(a.fecha_pedido || 0).getTime();
    }
    if (ordenarPedidos === "fecha_asc") {
      return new Date(a.fecha_pedido || 0).getTime() - new Date(b.fecha_pedido || 0).getTime();
    }
    if (ordenarPedidos === "entrega_asc") {
      if (!a.fecha_entrega_estimada) return 1;
      if (!b.fecha_entrega_estimada) return -1;
      return new Date(a.fecha_entrega_estimada).getTime() - new Date(b.fecha_entrega_estimada).getTime();
    }
    if (ordenarPedidos === "monto_desc") {
      return (b.monto_total || 0) - (a.monto_total || 0);
    }
    if (ordenarPedidos === "saldo_desc") {
      const saldoA = (a.monto_total || 0) - (a.anticipo || 0);
      const saldoB = (b.monto_total || 0) - (b.anticipo || 0);
      return saldoB - saldoA;
    }
    return 0;
  });

  // Calculate statistics
  const countPendientes = pedidos.filter(p => p.estado === "Pendiente").length;
  const countProceso = pedidos.filter(p => p.estado === "En Proceso").length;
  const countTerminados = pedidos.filter(p => p.estado === "Terminado").length;
  const countEntregados = pedidos.filter(p => p.estado === "Entregado").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Trabajos y Pedidos</h1>
          <p className="text-sm text-slate-500">
            Registro, control financiero, abonos, trabajos especiales y récipes adjuntos de pedidos.
          </p>
        </div>
        <button
          onClick={cargarPedidos}
          className="self-start inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 rounded-2xl text-xs font-black transition-all cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" /> Sincronizar Listado
        </button>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 text-white p-5 rounded-[2rem] shadow-sm relative overflow-hidden">
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Pendiente</p>
          <h3 className="text-3xl font-black mt-2">{countPendientes}</h3>
          <div className="absolute right-4 bottom-4 opacity-10"><Clock className="w-12 h-12" /></div>
        </div>
        <div className="bg-white border border-slate-100 p-5 rounded-[2rem] shadow-sm relative overflow-hidden">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">En Proceso</p>
          <h3 className="text-3xl font-black text-slate-800 mt-2">{countProceso}</h3>
          <div className="absolute right-4 bottom-4 opacity-5 text-indigo-600"><Sparkles className="w-12 h-12" /></div>
        </div>
        <div className="bg-white border border-slate-100 p-5 rounded-[2rem] shadow-sm relative overflow-hidden">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Terminado</p>
          <h3 className="text-3xl font-black text-slate-800 mt-2">{countTerminados}</h3>
          <div className="absolute right-4 bottom-4 opacity-5 text-indigo-600"><CheckCircle2 className="w-12 h-12" /></div>
        </div>
        <div className="bg-white border border-slate-100 p-5 rounded-[2rem] shadow-sm relative overflow-hidden">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Entregado</p>
          <h3 className="text-3xl font-black text-slate-800 mt-2">{countEntregados}</h3>
          <div className="absolute right-4 bottom-4 opacity-5 text-indigo-600"><FileText className="w-12 h-12" /></div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Editor / Form */}
        {!esTrabajo && (
          <div className="lg:col-span-5 bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">
                  {editando ? "Editar Trabajo / Pedido" : "Nuevo Trabajo / Pedido"}
                </h3>
              </div>
              {codigoPedido && (
                <span className="bg-indigo-600 text-white font-black text-xs px-2.5 py-1 rounded-xl shadow-xs flex items-center gap-1 font-mono tracking-wider">
                  <Hash className="w-3.5 h-3.5" />
                  {codigoPedido}
                </span>
              )}
            </div>

            <form onSubmit={handleGuardar} className="space-y-4">
              {/* Cliente */}
              <div className="bg-slate-50/60 p-4 rounded-3xl border border-slate-100 space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  Datos del Cliente
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Cédula *</label>
                    <input
                      type="text"
                      required
                      placeholder="V-12345678"
                      className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs outline-none transition"
                      value={cedula}
                      onChange={(e) => setCedula(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Teléfono *</label>
                    <input
                      type="text"
                      required
                      placeholder="0412-5555555"
                      className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs outline-none transition"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Nombres *</label>
                    <input
                      type="text"
                      required
                      placeholder="Nombre Cliente"
                      className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs outline-none transition"
                      value={nombres}
                      onChange={(e) => setNombres(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Apellidos</label>
                    <input
                      type="text"
                      placeholder="Apellido Cliente"
                      className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs outline-none transition"
                      value={apellidos}
                      onChange={(e) => setApellidos(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Dirección</label>
                  <input
                    type="text"
                    placeholder="Dirección fiscal o habitación"
                    className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs outline-none transition"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                  />
                </div>
              </div>

              {/* Pedido / Requerimiento */}
              <div className="bg-slate-50/60 p-4 rounded-3xl border border-slate-100 space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  Detalles del Trabajo / Pedido
                </h4>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                    Especificación de Medicamento, Concentración o Trabajo / Pedido *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Ej: Preparación de Fórmula Magistral dermatológica con ácido salicílico al 2% o apartado de aminas."
                    className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs outline-none transition resize-none"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Fecha Pedido</label>
                    <input
                      type="date"
                      className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs outline-none transition"
                      value={fechaPedido}
                      onChange={(e) => setFechaPedido(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Entrega Estimada</label>
                    <input
                      type="date"
                      className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs outline-none transition"
                      value={fechaEntregaEstimada}
                      onChange={(e) => setFechaEntregaEstimada(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Asignación y Operativa */}
              <div className="bg-slate-50/60 p-4 rounded-3xl border border-slate-100 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-600" /> Asignación y Trabajo Operativo
                  </h4>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setErrorDpto("");
                        setNuevoDptoNombre("");
                        setMostrarModalDepartamentos(true);
                      }}
                      className="text-[10px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-xl transition flex items-center gap-1 cursor-pointer border border-purple-200/50"
                      title="Agregar o gestionar departamentos y áreas de trabajo"
                    >
                      <FolderPlus className="w-3 h-3" />
                      <span>+ Departamentos</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMostrarModalEmpleados(true)}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-xl transition flex items-center gap-1 cursor-pointer border border-indigo-200/50"
                      title="Agregar o gestionar nombres reales de empleados u operadores"
                    >
                      <UserPlus className="w-3 h-3" />
                      <span>+ Nombres de Empleados</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Área / Departamento</label>
                      <button
                        type="button"
                        onClick={() => {
                          setErrorDpto("");
                          setNuevoDptoNombre("");
                          setMostrarModalDepartamentos(true);
                        }}
                        className="text-[9px] font-bold text-purple-600 hover:text-purple-800 hover:underline cursor-pointer"
                      >
                        + Gestionar Dptos
                      </button>
                    </div>
                    <div className="flex gap-1.5">
                      <select
                        className="flex-1 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-2.5 py-2 text-xs outline-none transition font-medium"
                        value={departamentoServicio}
                        onChange={(e) => {
                          if (e.target.value === "__NUEVO_DPTO__") {
                            setErrorDpto("");
                            setNuevoDptoNombre("");
                            setMostrarModalDepartamentos(true);
                          } else {
                            setDepartamentoServicio(e.target.value);
                          }
                        }}
                      >
                        {departamentos.map(dep => (
                          <option key={dep} value={dep}>{dep}</option>
                        ))}
                        <option value="__NUEVO_DPTO__" className="font-bold text-purple-600">
                          ➕ + Agregar nuevo departamento...
                        </option>
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          setErrorDpto("");
                          setNuevoDptoNombre("");
                          setMostrarModalDepartamentos(true);
                        }}
                        className="p-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl border border-purple-200/60 transition cursor-pointer flex items-center justify-center shrink-0"
                        title="Agregar o gestionar departamentos"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Asignado a (Operador / Empleado)</label>
                    <div className="relative">
                      <input
                        type="text"
                        list="empleados-sugeridos"
                        placeholder="Ej: Juan (Bordador) o Pedro (Diseñador)"
                        className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs outline-none transition font-medium pr-7"
                        value={asignadoA}
                        onChange={(e) => setAsignadoA(e.target.value)}
                      />
                      {asignadoA && (
                        <button
                          type="button"
                          onClick={() => setAsignadoA("")}
                          className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                          title="Limpiar asignación"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <datalist id="empleados-sugeridos">
                      {listaEmpleados.map(e => (
                        <option key={e.id} value={e.nombre} />
                      ))}
                      {listaUsuarios.map(u => (
                        <option key={`usr_${u.username}`} value={u.nombre || u.username} />
                      ))}
                    </datalist>

                    {/* Quick selector pills of real employee names */}
                    {listaEmpleados.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5 pt-0.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase self-center mr-0.5">Selección rápida:</span>
                        {listaEmpleados.slice(0, 6).map(emp => (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() => {
                              setAsignadoA(emp.nombre);
                              if (emp.departamento && emp.departamento !== "General") {
                                setDepartamentoServicio(emp.departamento);
                              }
                            }}
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                              asignadoA === emp.nombre
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                                : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50"
                            }`}
                          >
                            {emp.nombre}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                    Notas Operativas / Instrucciones Técnicas
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Instrucciones técnicas (ej: Hilo dorado #40, tipografía Arial 5cm, logo en manga derecha)"
                    className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs outline-none transition resize-none text-xs"
                    value={notasOperativas}
                    onChange={(e) => setNotasOperativas(e.target.value)}
                  />
                </div>
              </div>

              {/* Financiero */}
              <div className="bg-slate-50/60 p-4 rounded-3xl border border-slate-100 space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  Presupuesto y Control de Pagos
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Monto Total ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs outline-none transition font-bold"
                      value={montoTotal || ""}
                      onChange={(e) => setMontoTotal(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Anticipo Recibido ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs outline-none transition font-bold"
                      value={anticipo || ""}
                      onChange={(e) => setAnticipo(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Pago Anticipo</label>
                    <select
                      className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-2 py-2 text-xs outline-none transition"
                      value={metodoPagoAnticipo}
                      onChange={(e) => setMetodoPagoAnticipo(e.target.value)}
                    >
                      <option value="EFECTIVO_USD">Efectivo USD</option>
                      <option value="ZELLE">Zelle USD</option>
                      <option value="EFECTIVO_BS">Efectivo BS</option>
                      <option value="PUNTO">Punto de Venta BS</option>
                      <option value="PAGO_MOVIL">Pago Móvil BS</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Pago Saldo Final</label>
                    <select
                      className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-2 py-2 text-xs outline-none transition"
                      value={metodoPagoSaldo}
                      onChange={(e) => setMetodoPagoSaldo(e.target.value)}
                    >
                      <option value="EFECTIVO_USD">Efectivo USD</option>
                      <option value="ZELLE">Zelle USD</option>
                      <option value="EFECTIVO_BS">Efectivo BS</option>
                      <option value="PUNTO">Punto de Venta BS</option>
                      <option value="PAGO_MOVIL">Pago Móvil BS</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Saldo por Cancelar:</span>
                  <span className="text-sm font-black text-indigo-600">
                    ${Math.max(0, Number((montoTotal - anticipo).toFixed(2))).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* DragnDrop Récipe */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">
                  Adjuntar Récipe Médico / Documentos
                </label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleFileDrop}
                  className={`border-2 border-dashed rounded-3xl p-4 text-center cursor-pointer transition-all relative ${
                    dragOver ? "border-indigo-500 bg-indigo-50/50" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex flex-col items-center gap-1.5">
                    <ImageIcon className="w-7 h-7 text-slate-400 group-hover:text-slate-500" />
                    <p className="text-[10px] text-slate-500 font-bold">Arrastra o haz clic para subir récipe</p>
                    <p className="text-[8px] text-slate-400">Archivos JPG, PNG permitidos</p>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="recipe-file-input"
                  />
                  <label htmlFor="recipe-file-input" className="absolute inset-0 cursor-pointer block w-full h-full" />
                </div>

                {imagenes.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {imagenes.map((img, idx) => (
                      <div key={idx} className="relative group rounded-xl overflow-hidden aspect-square border border-slate-100 shadow-sm">
                        <img src={img} alt="récipe" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removerImagen(idx)}
                          className="absolute top-1 right-1 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full transition shadow"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Estado */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Estado del Trabajo</label>
                <div className="grid grid-cols-4 gap-2">
                  {(["Pendiente", "En Proceso", "Terminado", "Entregado"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setEstado(st)}
                      className={`py-2 px-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition text-center ${
                        estado === st 
                          ? "bg-indigo-600 text-white shadow shadow-indigo-900/20" 
                          : "bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-100"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Acciones */}
              <div className="flex gap-3 pt-3">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition cursor-pointer shadow-md shadow-indigo-900/20"
                >
                  {editando ? "Guardar Cambios" : "Guardar Trabajo/Pedido"}
                </button>
                <button
                  type="button"
                  onClick={limpiarFormulario}
                  className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-bold transition cursor-pointer"
                >
                  Limpiar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* List & Filters */}
        <div className={`${esTrabajo ? "lg:col-span-12" : "lg:col-span-7"} bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm space-y-4 min-h-[500px]`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-50 pb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">
                Historial de Trabajos y Pedidos
              </h3>
              <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full uppercase">
                {pedidosOrdenados.length} Registros
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMostrarFiltrosAvanzados(!mostrarFiltrosAvanzados)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer ${
                  mostrarFiltrosAvanzados || filtroFechaRango !== "todos" || filtroSaldo !== "todos" || ordenarPedidos !== "fecha_desc"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                Filtros Detallados
              </button>

              {(busqueda || filtroEstado || filtroAsignado || filtroDepartamento || filtroFechaRango !== "todos" || filtroSaldo !== "todos" || ordenarPedidos !== "fecha_desc") && (
                <button
                  type="button"
                  onClick={limpiarFiltros}
                  className="px-2.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3 h-3" /> Limpiar
                </button>
              )}
            </div>
          </div>

          {/* Banner de Área de Trabajo Asignada */}
          {!esAdmin && departamentoUsuario && (
            <div className="bg-purple-50 border border-purple-200/80 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse"></span>
                <span className="text-purple-900 font-black uppercase tracking-wider text-[11px]">
                  Área Asignada: {departamentoUsuario}
                </span>
                <span className="text-purple-700 text-[11px] font-medium hidden sm:inline">
                  • Mostrando únicamente los trabajos de tu departamento
                </span>
              </div>
              <span className="text-[10px] font-bold bg-white text-purple-700 px-2 py-0.5 rounded-lg border border-purple-200 shadow-xs">
                Filtro Exclusivo
              </span>
            </div>
          )}

          {/* Buscador & Filtros Principales */}
          <div className="space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="relative sm:col-span-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por código (ej: PED-0001), cliente, cédula..."
                  className="w-full bg-slate-50 border border-slate-100 focus:border-indigo-500 rounded-2xl py-2 pl-9 pr-3 text-xs outline-none transition font-medium"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>

              <div>
                <select
                  className="w-full bg-slate-50 border border-slate-100 focus:border-indigo-500 rounded-2xl py-2 px-3 text-xs outline-none transition font-medium"
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                >
                  <option value="">Estado (Todos)</option>
                  <option value="Pendiente">⏳ Pendiente</option>
                  <option value="En Proceso">⚙️ En Proceso</option>
                  <option value="Terminado">✅ Terminado</option>
                  <option value="Entregado">📦 Entregado</option>
                </select>
              </div>

              <div>
                <select
                  disabled={!esAdmin && Boolean(departamentoUsuario)}
                  className={`w-full border rounded-2xl py-2 px-3 text-xs outline-none transition font-medium ${
                    !esAdmin && Boolean(departamentoUsuario)
                      ? "bg-purple-50 border-purple-200 text-purple-900 font-bold cursor-not-allowed"
                      : "bg-slate-50 border-slate-100 focus:border-indigo-500 text-slate-900"
                  }`}
                  value={filtroDepartamento}
                  onChange={(e) => setFiltroDepartamento(e.target.value)}
                >
                  <option value="">Departamento {!esAdmin && departamentoUsuario ? `(${departamentoUsuario})` : "(Todos)"}</option>
                  {departamentos.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Asignado:</span>
                <input
                  type="text"
                  placeholder="Filtrar por empleado u operador..."
                  className="bg-slate-50 border border-slate-100 focus:border-indigo-500 rounded-xl py-1.5 px-2.5 text-xs outline-none transition w-full font-medium"
                  value={filtroAsignado}
                  onChange={(e) => setFiltroAsignado(e.target.value)}
                />
              </div>

              {currentUser && (
                <button
                  onClick={() => {
                    const miNombre = currentUser.nombre || currentUser.username;
                    if (filtroAsignado === miNombre) {
                      setFiltroAsignado("");
                    } else {
                      setFiltroAsignado(miNombre);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer ${
                    filtroAsignado === (currentUser.nombre || currentUser.username)
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Mis Trabajos Asignados
                </button>
              )}
            </div>

            {/* Panel de Filtros Detallados Desplegable */}
            {mostrarFiltrosAvanzados && (
              <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider ml-1">Fecha / Plazo</label>
                  <select
                    className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-2.5 text-[11px] font-bold text-slate-700 outline-none mt-0.5"
                    value={filtroFechaRango}
                    onChange={(e) => setFiltroFechaRango(e.target.value as any)}
                  >
                    <option value="todos">Cualquier Fecha</option>
                    <option value="hoy">Registrados Hoy</option>
                    <option value="semana">Últimos 7 Días</option>
                    <option value="mes">Últimos 30 Días</option>
                    <option value="urgente_entrega">🚨 Entrega Urgente (≤ 48h)</option>
                    <option value="atrasados">⚠️ Atrasados / Plazo Vencido</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider ml-1">Estado de Pago</label>
                  <select
                    className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-2.5 text-[11px] font-bold text-slate-700 outline-none mt-0.5"
                    value={filtroSaldo}
                    onChange={(e) => setFiltroSaldo(e.target.value as any)}
                  >
                    <option value="todos">Todos los Pagos</option>
                    <option value="con_saldo">💳 Saldo Pendiente por Cobrar</option>
                    <option value="saldados">✅ Pagados al 100%</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider ml-1">Ordenar Por</label>
                  <select
                    className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-2.5 text-[11px] font-bold text-indigo-700 outline-none mt-0.5"
                    value={ordenarPedidos}
                    onChange={(e) => setOrdenarPedidos(e.target.value as any)}
                  >
                    <option value="fecha_desc">Más Recientes Primero</option>
                    <option value="fecha_asc">Más Antiguos Primero</option>
                    <option value="entrega_asc">Entrega Más Próxima</option>
                    <option value="monto_desc">Mayor Monto Total ($)</option>
                    <option value="saldo_desc">Mayor Saldo Deudor ($)</option>
                  </select>
                </div>
              </div>
            )}
          </div>
 
          {/* List Table */}
          <div className="overflow-y-auto max-h-[600px] space-y-3 pr-1 scrollbar-thin">
            {cargando ? (
              <p className="text-xs text-slate-400 text-center py-10">Cargando registros...</p>
            ) : pedidosOrdenados.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-10">No se encontraron pedidos con los filtros aplicados.</p>
            ) : (
              pedidosOrdenados.map((p) => {
                const saldo = p.monto_total - p.anticipo;
                return (
                  <div
                    key={p.id}
                    onClick={() => setPedidoSeleccionado(pedidoSeleccionado?.id === p.id ? null : p)}
                    className={`p-4 rounded-3xl border transition cursor-pointer flex flex-col gap-3 hover:shadow-md hover:bg-slate-50/40 ${
                      pedidoSeleccionado?.id === p.id 
                        ? "border-indigo-500 bg-indigo-50/10" 
                        : "border-slate-100 bg-white"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="bg-indigo-600 text-white font-mono font-black text-[10px] px-2 py-0.5 rounded-md flex items-center gap-0.5 tracking-wider shadow-xs">
                            <Hash className="w-3 h-3" />
                            {p.codigo_pedido || p.id.slice(-6).toUpperCase()}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900">
                            {p.nombres} {p.apellidos || ""}
                          </h4>
                          <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            CI: {p.cedula}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold text-[9px] flex items-center gap-1">
                            <Tag className="w-3 h-3"/> {p.departamento_servicio || "General"}
                          </span>
                          
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[9px] flex items-center gap-1 ${
                            p.asignado_a 
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-100" 
                              : "bg-slate-100 text-slate-500"
                          }`}>
                            <UserCheck className="w-3 h-3"/> {p.asignado_a ? `Asignado: ${p.asignado_a}` : "Sin asignar"}
                          </span>
                        </div>

                        <p className="text-[10px] text-slate-500 mt-1 line-clamp-1 font-medium">
                          {p.descripcion}
                        </p>
                      </div>

                      <select
                        value={p.estado}
                        onClick={(e) => e.stopPropagation()}
                        onChange={async (e) => {
                          e.stopPropagation();
                          await cambiarEstadoRapido(p, e.target.value as Pedido["estado"]);
                        }}
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 border-0 outline-none cursor-pointer focus:ring-1 focus:ring-indigo-500 font-sans transition-all shadow-sm ${
                          p.estado === "Pendiente" ? "bg-amber-100 text-amber-800 hover:bg-amber-200" :
                          p.estado === "En Proceso" ? "bg-indigo-100 text-indigo-800 animate-pulse hover:bg-indigo-200" :
                          p.estado === "Terminado" ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" :
                          "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        <option value="Pendiente" className="bg-white text-slate-800 normal-case font-bold">Pendiente</option>
                        <option value="En Proceso" className="bg-white text-slate-800 normal-case font-bold">En Proceso</option>
                        <option value="Terminado" className="bg-white text-slate-800 normal-case font-bold">Terminado</option>
                        <option value="Entregado" className="bg-white text-slate-800 normal-case font-bold">Entregado</option>
                      </select>
                    </div>

                    <div className="flex flex-wrap gap-y-2 justify-between items-center pt-2 border-t border-slate-50 text-[10px]">
                      <div className="flex gap-4">
                        <span className="text-slate-400 font-medium flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> Pedido: {p.fecha_pedido}
                        </span>
                        {p.fecha_entrega_estimada && (
                          <span className="text-slate-400 font-medium flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> Entrega: {p.fecha_entrega_estimada}
                          </span>
                        )}
                      </div>
                      {!esTrabajo && (
                        <div className="flex gap-2.5 items-center">
                          <span className="text-slate-400 font-bold uppercase text-[9px]">Saldo:</span>
                          <span className={`font-black rounded-lg px-2 py-0.5 text-[10px] ${
                            saldo <= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                          }`}>
                            ${saldo.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Detailed section when selected */}
                    {pedidoSeleccionado?.id === p.id && (
                      <div className="mt-3 pt-3 border-t border-slate-100 text-xs space-y-3 bg-slate-50/50 p-3 rounded-2xl">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                          <div className="space-y-1.5">
                            <p className="font-bold text-slate-800">Detalles Cliente & Asignación:</p>
                            <p className="text-slate-500 flex items-center gap-1"><Hash className="w-3.5 h-3.5 text-slate-400" /> Código de Retiro: <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">{p.codigo_pedido || p.id}</span></p>
                            <p className="text-slate-500 flex items-center gap-1"><User className="w-3.5 h-3.5 text-slate-400" /> {p.nombres} {p.apellidos || ""}</p>
                            <p className="text-slate-500 flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-slate-400" /> {p.telefono}</p>
                            <p className="text-slate-500 flex items-center gap-1"><Tag className="w-3.5 h-3.5 text-slate-400" /> Área: <span className="font-bold text-slate-800">{p.departamento_servicio || "General"}</span></p>
                            <p className="text-slate-500 flex items-center gap-1"><UserCheck className="w-3.5 h-3.5 text-slate-400" /> Responsable: <span className="font-bold text-indigo-700">{p.asignado_a || "Sin Asignar"}</span></p>
                          </div>
                          {!esTrabajo && (
                            <div className="space-y-1.5">
                              <p className="font-bold text-slate-800">Desglose Presupuestario:</p>
                              <p className="text-slate-500 flex justify-between"><span>Monto Total:</span> <span className="font-bold text-slate-900">${p.monto_total.toFixed(2)}</span></p>
                              <p className="text-slate-500 flex justify-between"><span>Anticipo:</span> <span className="font-bold text-indigo-600">${p.anticipo.toFixed(2)} ({p.metodo_pago_anticipo || "N/A"})</span></p>
                              <p className="text-slate-500 flex justify-between"><span>Pendiente:</span> <span className="font-bold text-rose-600">${saldo.toFixed(2)}</span></p>
                            </div>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <p className="font-bold text-slate-800">Especificación / Descripción del Trabajo:</p>
                          <p className="text-slate-600 font-medium bg-white p-2.5 rounded-xl border border-slate-100 leading-relaxed text-[11px]">
                            {p.descripcion}
                          </p>
                        </div>

                        {p.notas_operativas && (
                          <div className="bg-amber-50/80 border border-amber-200/60 p-2.5 rounded-xl space-y-1">
                            <p className="font-bold text-amber-900 text-[10px] uppercase flex items-center gap-1">
                              <Wrench className="w-3 h-3 text-amber-600" /> Instrucciones Técnicas / Notas Operativas:
                            </p>
                            <p className="text-amber-800 text-[11px] font-medium leading-relaxed">
                              {p.notas_operativas}
                            </p>
                          </div>
                        )}

                        {p.imagenes && p.imagenes.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="font-bold text-slate-800">Documentación / Récipes:</p>
                            <div className="flex gap-2">
                              {p.imagenes.map((img, idx) => (
                                <a key={idx} href={img} target="_blank" rel="noopener noreferrer" className="relative group rounded-xl overflow-hidden aspect-square border border-slate-100 shadow-sm w-12 h-12">
                                  <img src={img} alt="récipe" className="w-full h-full object-cover" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 justify-end pt-2 border-t border-slate-100/60">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEdit(p); }}
                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition flex items-center gap-1.5 font-bold uppercase tracking-wider text-[9px] cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" /> Editar
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); abrirImpresionTermica(p); }}
                            className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl transition flex items-center gap-1.5 font-bold uppercase tracking-wider text-[9px] cursor-pointer"
                            title="Imprimir en impresora térmica de 58mm / 80mm o estándar"
                          >
                            <Printer className="w-3.5 h-3.5" /> Imprimir Térmico / POS
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); descargarTicketPDF(p); }}
                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition flex items-center gap-1.5 font-bold uppercase tracking-wider text-[9px] cursor-pointer"
                            title="Descargar comprobante en formato PDF"
                          >
                            <FileDown className="w-3.5 h-3.5" /> PDF
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEliminar(p.id); }}
                            className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl transition flex items-center gap-1.5 font-bold uppercase tracking-wider text-[9px] cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Eliminar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal de Gestión de Empleados / Operadores */}
      {mostrarModalEmpleados && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-5 relative">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-base font-black text-slate-900">Catálogo de Empleados y Operadores</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Agregue nombres reales para asignar trabajos de producción</p>
                </div>
              </div>
              <button
                onClick={() => setMostrarModalEmpleados(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario Agregar Nuevo Empleado */}
            <form onSubmit={agregarEmpleado} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
              <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">+ Agregar Nuevo Empleado / Operador</h4>
              
              {errorEmp && (
                <div className="bg-rose-50 text-rose-700 p-2.5 rounded-xl text-xs font-bold border border-rose-200">
                  {errorEmp}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Nombre Real (Ej: Juan - Bordador)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Juan Perez (Bordador) o Pedro Rodríguez"
                    value={nuevoEmpNombre}
                    onChange={(e) => setNuevoEmpNombre(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Cargo / Especialidad</label>
                  <input
                    type="text"
                    placeholder="Ej: Bordador, Diseñador, Costurera"
                    value={nuevoEmpCargo}
                    onChange={(e) => setNuevoEmpCargo(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-black text-slate-500 uppercase">Área Predeterminada</label>
                    <button
                      type="button"
                      onClick={() => {
                        setErrorDpto("");
                        setNuevoDptoNombre("");
                        setMostrarModalDepartamentos(true);
                      }}
                      className="text-[9px] font-bold text-purple-600 hover:text-purple-800 hover:underline cursor-pointer"
                    >
                      + Nuevo dpto
                    </button>
                  </div>
                  <select
                    value={nuevoEmpDep}
                    onChange={(e) => setNuevoEmpDep(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-2.5 py-2 text-xs font-bold outline-none"
                  >
                    {departamentos.map(dep => (
                      <option key={dep} value={dep}>{dep}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={guardandoEmp}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2.5 rounded-xl text-xs uppercase tracking-wider transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                {guardandoEmp ? "Guardando..." : "Guardar e Integrar Empleado"}
              </button>
            </form>

            {/* Lista de Empleados Registrados */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider flex justify-between items-center">
                <span>Empleados Registrados</span>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                  {listaEmpleados.length} Registros
                </span>
              </h4>

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
                {listaEmpleados.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No hay empleados registrados. Agregue el primero arriba.</p>
                ) : (
                  listaEmpleados.map(emp => (
                    <div key={emp.id} className="pt-1.5 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-900">{emp.nombre}</p>
                        <p className="text-[10px] text-slate-500">
                          {emp.cargo ? `${emp.cargo} • ` : ""}{emp.departamento || "General"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setAsignadoA(emp.nombre);
                            if (emp.departamento && emp.departamento !== "General") {
                              setDepartamentoServicio(emp.departamento);
                            }
                            setMostrarModalEmpleados(false);
                          }}
                          className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer"
                        >
                          Seleccionar
                        </button>
                        <button
                          type="button"
                          onClick={() => eliminarEmpleado(emp.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded transition cursor-pointer"
                          title="Eliminar empleado"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Gestión de Departamentos y Áreas de Trabajo */}
      {mostrarModalDepartamentos && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-5 relative">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-100">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Departamentos y Áreas</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Gestiona y agrega áreas para clasificar trabajos y pedidos</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMostrarModalDepartamentos(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario Agregar Nuevo Departamento */}
            <form onSubmit={agregarDepartamento} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
              <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">+ Agregar Nuevo Departamento</h4>
              
              {errorDpto && (
                <div className="bg-rose-50 text-rose-700 p-2.5 rounded-xl text-xs font-bold border border-rose-200">
                  {errorDpto}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                  Nombre del Área / Departamento
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Ej: Serigrafía, Ploteo, Grabado Láser, Joyería..."
                    value={nuevoDptoNombre}
                    onChange={(e) => setNuevoDptoNombre(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 focus:border-purple-500 rounded-xl px-3 py-2 text-xs font-bold outline-none transition"
                  />
                  <button
                    type="submit"
                    disabled={guardandoDpto}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-black px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition shadow-sm cursor-pointer disabled:opacity-50 whitespace-nowrap"
                  >
                    {guardandoDpto ? "..." : "+ Agregar"}
                  </button>
                </div>
              </div>
            </form>

            {/* Lista de Departamentos Registrados */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                  Departamentos Activos
                </h4>
                <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200/50 px-2.5 py-0.5 rounded-full font-black">
                  {departamentos.length} Registros
                </span>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
                {departamentos.map(dep => {
                  const esBase = dep.toLowerCase() === "general";
                  const totalEnDpto = pedidos.filter(p => (p.departamento_servicio || "General").toLowerCase() === dep.toLowerCase()).length;
                  const seleccionado = departamentoServicio.toLowerCase() === dep.toLowerCase();

                  return (
                    <div key={dep} className="pt-2 pb-1 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Folder className="w-3.5 h-3.5 text-purple-500" />
                        <div>
                          <span className="font-bold text-slate-900">{dep}</span>
                          {esBase && (
                            <span className="ml-2 text-[9px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded">
                              Base
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 font-medium mr-1" title="Pedidos asociados a esta área">
                          {totalEnDpto} {totalEnDpto === 1 ? "pedido" : "pedidos"}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setDepartamentoServicio(dep);
                            setNuevoEmpDep(dep);
                            setMostrarModalDepartamentos(false);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${
                            seleccionado
                              ? "bg-purple-600 text-white shadow-xs"
                              : "bg-purple-50 text-purple-700 hover:bg-purple-100"
                          }`}
                        >
                          {seleccionado ? "Activo" : "Seleccionar"}
                        </button>
                        {!esBase && (
                          <button
                            type="button"
                            onClick={() => eliminarDepartamento(dep)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded transition cursor-pointer"
                            title={`Eliminar departamento '${dep}'`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Impresión Térmica Directa (58mm / 80mm / Común / PDF) */}
      <ThermalPedidoModal
        pedido={pedidoParaImprimir}
        isOpen={mostrarModalTermico}
        onClose={() => {
          setMostrarModalTermico(false);
          setPedidoParaImprimir(null);
        }}
      />
    </div>
  );
}
