/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Search,
  Plus, 
  Edit2, 
  Trash2, 
  RefreshCw, 
  Barcode, 
  DollarSign, 
  PieChart, 
  Percent, 
  ShieldCheck, 
  Download, 
  AlertTriangle,
  Layers,
  MapPin,
  Tag,
  Calendar,
  Scale,
  Sparkles,
  Shirt,
  Hammer,
  Store,
  ShoppingCart,
  Sliders,
  CheckCircle2,
  X,
  History
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Producto, PerfilNegocio, UnidadMedida, VarianteProducto, TipoRubroNegocio } from "../types";
import { apiFetch } from "../utils/api";
import ModalKardex from "./ModalKardex";

const UNIDADES_DISPONIBLES: { id: UnidadMedida; label: string; simbolo: string; permiteDecimales: boolean }[] = [
  { id: "UND", label: "Unidad / Pieza", simbolo: "u.", permiteDecimales: false },
  { id: "KG", label: "Kilogramos (Kg)", simbolo: "Kg", permiteDecimales: true },
  { id: "G", label: "Gramos (g)", simbolo: "g", permiteDecimales: true },
  { id: "MTS", label: "Metros Lineales (m)", simbolo: "Mts", permiteDecimales: true },
  { id: "CM", label: "Centímetros (cm)", simbolo: "cm", permiteDecimales: true },
  { id: "LTS", label: "Litros (L)", simbolo: "Lts", permiteDecimales: true },
  { id: "ML", label: "Mililitros (ml)", simbolo: "ml", permiteDecimales: true },
  { id: "PAR", label: "Pares (Calzado)", simbolo: "Par", permiteDecimales: false },
  { id: "DOC", label: "Docena (12 u.)", simbolo: "Doc", permiteDecimales: false },
  { id: "CJ", label: "Caja", simbolo: "Cja", permiteDecimales: false },
  { id: "BLT", label: "Bulto / Saco", simbolo: "Blt", permiteDecimales: false },
  { id: "PQTE", label: "Paquete", simbolo: "Pqte", permiteDecimales: false }
];

export default function Inventario() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [perfilNegocio, setPerfilNegocio] = useState<PerfilNegocio | null>(null);
  const [buscar, setBuscar] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroCategoriaComercial, setFiltroCategoriaComercial] = useState("");
  const [filtroStock, setFiltroStock] = useState<"todos" | "bajo" | "agotado">("todos");
  const [filtroRubro, setFiltroRubro] = useState<string>("");
  const [filtroMarca, setFiltroMarca] = useState<string>("");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "variantes" | "peso" | "vencimiento" | "mayor">("todos");
  const [filtroVencimiento, setFiltroVencimiento] = useState<"todos" | "vencidos" | "30dias" | "60dias" | "vigentes">("todos");
  const [filtroPrecioMin, setFiltroPrecioMin] = useState("");
  const [filtroPrecioMax, setFiltroPrecioMax] = useState("");
  const [filtroUbicacion, setFiltroUbicacion] = useState("");
  const [ordenarPor, setOrdenarPor] = useState<"nombre_asc" | "nombre_desc" | "stock_desc" | "stock_asc" | "precio_desc" | "precio_asc" | "vencimiento_asc">("nombre_asc");
  const [mostrarFiltrosAvanzados, setMostrarFiltrosAvanzados] = useState(false);
  const [productoAEliminar, setProductoAEliminar] = useState<Producto | null>(null);
  const [mostrarModalKardex, setMostrarModalKardex] = useState(false);
  const [productoParaKardex, setProductoParaKardex] = useState<Producto | null>(null);

  const hayFiltrosActivos = !!(
    buscar ||
    filtroCategoria ||
    filtroCategoriaComercial ||
    filtroStock !== "todos" ||
    filtroRubro ||
    filtroMarca ||
    filtroTipo !== "todos" ||
    filtroVencimiento !== "todos" ||
    filtroPrecioMin ||
    filtroPrecioMax ||
    filtroUbicacion ||
    ordenarPor !== "nombre_asc"
  );

  const limpiarTodosLosFiltros = () => {
    setBuscar("");
    setFiltroCategoria("");
    setFiltroCategoriaComercial("");
    setFiltroStock("todos");
    setFiltroRubro("");
    setFiltroMarca("");
    setFiltroTipo("todos");
    setFiltroVencimiento("todos");
    setFiltroPrecioMin("");
    setFiltroPrecioMax("");
    setFiltroUbicacion("");
    setOrdenarPor("nombre_asc");
  };

  // Umbral de stock mínimo configurable manualmente
  const [umbralStock, setUmbralStock] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("dashboard_umbral_stock");
      return saved ? parseInt(saved, 10) : 5;
    } catch {
      return 5;
    }
  });

  const handleUmbralChange = (val: number) => {
    const cleanVal = Math.max(0, val);
    setUmbralStock(cleanVal);
    try {
      localStorage.setItem("dashboard_umbral_stock", cleanVal.toString());
    } catch (e) {
      console.error(e);
    }
  };

  // Estado del Formulario Principal
  const [id, setId] = useState("");
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState<Producto["categoria"]>("MEDICAMENTO");
  const [rubro, setRubro] = useState<TipoRubroNegocio>("FARMACIA");
  const [unidadMedida, setUnidadMedida] = useState<UnidadMedida>("UND");
  const [permiteDecimales, setPermiteDecimales] = useState(false);
  const [categoriaComercial, setCategoriaComercial] = useState("");
  const [stock, setStock] = useState(0);
  const [stockTienda, setStockTienda] = useState<number | "">(0);
  const [stockAlmacen, setStockAlmacen] = useState<number | "">(0);
  const [stockMinimo, setStockMinimo] = useState(5);
  const [costoBulto, setCostoBulto] = useState(0);
  const [unidadesBulto, setUnidadesBulto] = useState(1);
  const [gananciaPerc, setGananciaPerc] = useState(30);
  const [precioCompra, setPrecioCompra] = useState(0);
  const [precioVenta, setPrecioVenta] = useState(0);
  const [precioMayor, setPrecioMayor] = useState<number | "">("");
  const [precioEspecial, setPrecioEspecial] = useState<number | "">("");
  const [seVendePorPeso, setSeVendePorPeso] = useState(false);
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [ubicacionTienda, setUbicacionTienda] = useState("");
  const [ubicacionAlmacen, setUbicacionAlmacen] = useState("");

  // Campos específicos por rubro
  const [principioActivo, setPrincipioActivo] = useState("");
  const [laboratorio, setLaboratorio] = useState("");
  const [lote, setLote] = useState("");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [codigoBalanza, setCodigoBalanza] = useState("");

  // Variantes (Talla x Color)
  const [tieneVariantes, setTieneVariantes] = useState(false);
  const [variantes, setVariantes] = useState<VarianteProducto[]>([]);
  const [nuevaTalla, setNuevaTalla] = useState("");
  const [nuevoColor, setNuevoColor] = useState("");
  const [nuevoStockVariante, setNuevoStockVariante] = useState(1);
  const [nuevoSkuVariante, setNuevoSkuVariante] = useState("");

  // Categorías Comerciales y Atributos Dinámicos
  const [categoriasComerciales, setCategoriasComerciales] = useState<{ id: string; nombre: string }[]>([]);
  const [nuevaCatComercial, setNuevaCatComercial] = useState("");
  const [mostrandoGestorCategorias, setMostrandoGestorCategorias] = useState(false);

  const [atributos, setAtributos] = useState<{ clave: string; valor: string }[]>([]);
  const [nuevaClaveAtributo, setNuevaClaveAtributo] = useState("");
  const [nuevoValorAtributo, setNuevoValorAtributo] = useState("");

  useEffect(() => {
    cargarProductos();
    cargarCategoriasComerciales();
    cargarPerfilNegocio();
  }, []);

  const cargarPerfilNegocio = async () => {
    try {
      const res = await apiFetch("/api/perfil-negocio");
      if (res.ok) {
        const data = await res.json();
        if (data.perfil) {
          setPerfilNegocio(data.perfil);
          setRubro(data.perfil.rubro || "FARMACIA");
        }
      }
    } catch (err) {
      console.error("Error al cargar perfil de negocio:", err);
    }
  };

  const cargarProductos = async () => {
    try {
      const res = await apiFetch("/api/productos");
      const data = await res.json();
      setProductos(data);
    } catch (err) {
      console.error(err);
    }
  };

  const cargarCategoriasComerciales = async () => {
    try {
      const res = await apiFetch("/api/categorias-comerciales");
      if (res.ok) {
        const data = await res.json();
        setCategoriasComerciales(data);
      }
    } catch (err) {
      console.error("Error cargando categorías comerciales:", err);
    }
  };

  const agregarCategoriaComercial = async () => {
    if (!nuevaCatComercial.trim()) return;
    try {
      const res = await apiFetch("/api/categorias-comerciales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nuevaCatComercial.trim() })
      });
      if (res.ok) {
        setNuevaCatComercial("");
        cargarCategoriasComerciales();
      } else {
        const data = await res.json();
        alert(data.error || "No se pudo agregar la categoría");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const eliminarCategoriaComercial = async (idCat: string) => {
    try {
      const res = await apiFetch(`/api/categorias-comerciales/${idCat}`, {
        method: "DELETE"
      });
      if (res.ok) {
        cargarCategoriasComerciales();
      } else {
        const data = await res.json();
        alert(data.error || "No se pudo eliminar la categoría");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Cálculos dinámicos matemáticos en el formulario
  useEffect(() => {
    const unidades = unidadesBulto > 0 ? unidadesBulto : 1;
    const compra = costoBulto / unidades;
    setPrecioCompra(compra);

    const margen = 1 + (gananciaPerc / 100);
    const venta = compra * margen;
    setPrecioVenta(Number(venta.toFixed(2)));
  }, [costoBulto, unidadesBulto, gananciaPerc]);

  // Si cambia la unidad de medida, verificar si permite decimales
  const handleCambioUnidad = (u: UnidadMedida) => {
    setUnidadMedida(u);
    const config = UNIDADES_DISPONIBLES.find(x => x.id === u);
    if (config) {
      setPermiteDecimales(config.permiteDecimales);
      if (u === "KG" || u === "G") {
        setSeVendePorPeso(true);
      }
    }
  };

  const agregarVariante = () => {
    if (!nuevaTalla.trim() && !nuevoColor.trim()) {
      alert("Ingrese al menos una Talla o Color para la variante");
      return;
    }
    const nuevaVar: VarianteProducto = {
      id: `v_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      talla: nuevaTalla.trim() || undefined,
      color: nuevoColor.trim() || undefined,
      stock: Math.max(0, Number(nuevoStockVariante) || 0),
      sku: nuevoSkuVariante.trim() || `${codigo}-${nuevaTalla || 'U'}-${nuevoColor || 'U'}`.toUpperCase()
    };
    const listaActualizada = [...variantes, nuevaVar];
    setVariantes(listaActualizada);
    // Recalcular stock total acumulado de variantes
    const totalStockVars = listaActualizada.reduce((acc, v) => acc + (Number(v.stock) || 0), 0);
    setStock(totalStockVars);

    setNuevaTalla("");
    setNuevoColor("");
    setNuevoStockVariante(1);
    setNuevoSkuVariante("");
  };

  const eliminarVariante = (idVar: string) => {
    const filtradas = variantes.filter(v => v.id !== idVar);
    setVariantes(filtradas);
    const totalStockVars = filtradas.reduce((acc, v) => acc + (Number(v.stock) || 0), 0);
    setStock(totalStockVars);
  };

  const seleccionarProducto = (p: Producto) => {
    setId(p.id);
    setCodigo(p.codigo);
    setNombre(p.nombre);
    setCategoria(p.categoria);
    setRubro(p.rubro || perfilNegocio?.rubro || "FARMACIA");
    setUnidadMedida(p.unidad_medida || "UND");
    setPermiteDecimales(!!p.permite_decimales);
    setCategoriaComercial(p.categoria_comercial || "");
    setStock(p.stock);
    setStockTienda(typeof p.stock_tienda === "number" ? p.stock_tienda : p.stock);
    setStockAlmacen(typeof p.stock_almacen === "number" ? p.stock_almacen : 0);
    setStockMinimo(p.stock_minimo !== undefined ? p.stock_minimo : 5);
    setPrecioCompra(p.precio_compra);
    setPrecioVenta(p.precio_venta);
    setPrecioMayor(p.precio_mayor !== undefined ? p.precio_mayor : "");
    setPrecioEspecial(p.precio_especial !== undefined ? p.precio_especial : "");
    setSeVendePorPeso(!!p.se_vende_por_peso);
    setMarca(p.marca || "");
    setModelo(p.modelo || "");
    setUbicacion(p.ubicacion || "");
    setUbicacionTienda(p.ubicacion_tienda || p.ubicacion || "");
    setUbicacionAlmacen(p.ubicacion_almacen || "");

    // Rubro específicos
    setPrincipioActivo(p.principio_activo || "");
    setLaboratorio(p.laboratorio || "");
    setLote(p.lote || "");
    setFechaVencimiento(p.fecha_vencimiento || "");
    setCodigoBalanza(p.codigo_balanza || "");

    // Variantes
    setTieneVariantes(!!p.tiene_variantes);
    setVariantes(p.variantes || []);

    // Bultos
    setCostoBulto(p.costo_bulto || p.precio_compra);
    setUnidadesBulto(p.unidades_bulto || 1);
    setGananciaPerc(p.ganancia_perc || 30);

    // Atributos dinámicos
    if (p.atributos) {
      setAtributos(
        Object.entries(p.atributos).map(([clave, valor]) => ({ clave, valor }))
      );
    } else {
      setAtributos([]);
    }
  };

  const limpiarFormulario = () => {
    setId("");
    setCodigo("");
    setNombre("");
    setCategoria("MEDICAMENTO");
    setRubro(perfilNegocio?.rubro || "FARMACIA");
    setUnidadMedida("UND");
    setPermiteDecimales(false);
    setCategoriaComercial("");
    setStock(0);
    setStockTienda(0);
    setStockAlmacen(0);
    setStockMinimo(5);
    setCostoBulto(0);
    setUnidadesBulto(1);
    setGananciaPerc(30);
    setPrecioCompra(0);
    setPrecioVenta(0);
    setPrecioMayor("");
    setPrecioEspecial("");
    setSeVendePorPeso(false);
    setMarca("");
    setModelo("");
    setUbicacion("");
    setUbicacionTienda("");
    setUbicacionAlmacen("");
    setPrincipioActivo("");
    setLaboratorio("");
    setLote("");
    setFechaVencimiento("");
    setCodigoBalanza("");
    setTieneVariantes(false);
    setVariantes([]);
    setAtributos([]);
    setNuevaClaveAtributo("");
    setNuevoValorAtributo("");
  };

  const guardarProducto = async () => {
    if (!codigo || !nombre) return alert("Código de barra y Nombre del artículo son obligatorios");

    const atributosObj: Record<string, string> = {};
    atributos.forEach(attr => {
      if (attr.clave.trim()) {
        atributosObj[attr.clave.trim()] = attr.valor;
      }
    });

    const payload = {
      id: id || undefined,
      codigo: codigo.trim(),
      nombre: nombre.trim(),
      categoria,
      rubro,
      unidad_medida: unidadMedida,
      permite_decimales: permiteDecimales,
      categoria_comercial: categoriaComercial || undefined,
      precio_compra: precioCompra,
      precio_venta: precioVenta,
      precio_mayor: precioMayor !== "" ? Number(precioMayor) : undefined,
      precio_especial: precioEspecial !== "" ? Number(precioEspecial) : undefined,
      stock: (stockTienda !== "" ? Number(stockTienda) : 0) + (stockAlmacen !== "" ? Number(stockAlmacen) : 0) || stock,
      stock_tienda: stockTienda !== "" ? Number(stockTienda) : 0,
      stock_almacen: stockAlmacen !== "" ? Number(stockAlmacen) : 0,
      stock_minimo: stockMinimo,
      costo_bulto: costoBulto,
      unidades_bulto: unidadesBulto,
      ganancia_perc: gananciaPerc,
      se_vende_por_peso: seVendePorPeso,
      marca: marca.trim() || undefined,
      modelo: modelo.trim() || undefined,
      ubicacion: ubicacionTienda.trim() || ubicacion.trim() || undefined,
      ubicacion_tienda: ubicacionTienda.trim() || undefined,
      ubicacion_almacen: ubicacionAlmacen.trim() || undefined,
      principio_activo: principioActivo.trim() || undefined,
      laboratorio: laboratorio.trim() || undefined,
      lote: lote.trim() || undefined,
      fecha_vencimiento: fechaVencimiento || undefined,
      codigo_balanza: codigoBalanza.trim() || undefined,
      tiene_variantes: tieneVariantes,
      variantes: tieneVariantes && variantes.length > 0 ? variantes : undefined,
      atributos: Object.keys(atributosObj).length > 0 ? atributosObj : undefined
    };

    try {
      const res = await apiFetch("/api/productos/guardar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert("¡Artículo guardado exitosamente en el catálogo!");
        limpiarFormulario();
        cargarProductos();
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Error al guardar el producto");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const confirmarEliminarProducto = async () => {
    if (!productoAEliminar) return;
    const idEliminar = productoAEliminar.id || productoAEliminar.codigo;
    if (!idEliminar) {
      alert("Error: El producto no tiene un identificador válido para ser eliminado.");
      setProductoAEliminar(null);
      return;
    }
    try {
      const res = await apiFetch(`/api/productos/eliminar/${idEliminar}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setProductoAEliminar(null);
        cargarProductos();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`No se pudo eliminar el producto: ${errorData.error || "Error del servidor (" + res.status + ")"}`);
      }
    } catch (err: any) {
      alert(`Error de red al intentar eliminar el producto: ${err.message || err}`);
      console.error(err);
    }
  };

  const exportarInventarioCSV = () => {
    if (productos.length === 0) {
      alert("No hay productos en el inventario para exportar.");
      return;
    }
    const headers = [
      "ID",
      "Código",
      "Descripción",
      "Rubro",
      "Categoría Fiscal",
      "Departamento",
      "Unidad Medida",
      "Marca",
      "Ubicación",
      "Stock",
      "Stock Mínimo",
      "Costo Compra ($)",
      "PVP Detal ($)",
      "PVP Mayor ($)",
      "PVP Especial ($)",
      "Inversión Total ($)",
      "Venta Estimada ($)"
    ];

    const dataRows = productos.map(p => [
      p.id,
      p.codigo,
      p.nombre,
      p.rubro || "GENERAL",
      p.categoria,
      p.categoria_comercial || "",
      p.unidad_medida || "UND",
      p.marca || "",
      p.ubicacion || "",
      p.stock,
      p.stock_minimo || 5,
      p.precio_compra.toFixed(2),
      p.precio_venta.toFixed(2),
      p.precio_mayor ? p.precio_mayor.toFixed(2) : "",
      p.precio_especial ? p.precio_especial.toFixed(2) : "",
      (p.precio_compra * p.stock).toFixed(2),
      (p.precio_venta * p.stock).toFixed(2)
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
    link.setAttribute("download", `Inventario_${perfilNegocio?.nombreComercio || 'ElenaPro'}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportarReposicionCSV = () => {
    const aReponer = productos.filter(p => p.stock <= (p.stock_minimo !== undefined ? p.stock_minimo : umbralStock));
    if (aReponer.length === 0) {
      alert("No hay productos con stock crítico para reponer.");
      return;
    }
    const headers = [
      "Código",
      "Descripción",
      "Unidad",
      "Existencia Actual",
      "Stock Mínimo",
      "Faltante Sugerido",
      "Costo Unitario ($)",
      "Precio Venta ($)",
      "Ubicación"
    ];

    const dataRows = aReponer.map(p => {
      const min = p.stock_minimo !== undefined ? p.stock_minimo : umbralStock;
      const faltante = p.stock < min ? (min - p.stock) : 0;
      return [
        p.codigo,
        p.nombre,
        p.unidad_medida || "UND",
        p.stock,
        min,
        faltante,
        p.precio_compra.toFixed(2),
        p.precio_venta.toFixed(2),
        p.ubicacion || ""
      ];
    });

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
    link.setAttribute("download", `Lista_Reposicion_${perfilNegocio?.nombreComercio || 'ElenaPro'}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- VALORIZACIÓN DE INVENTARIO ---
  const inversionTotal = productos.reduce((sum, p) => sum + (p.precio_compra * p.stock), 0);
  const ventaTotalEstimada = productos.reduce((sum, p) => sum + (p.precio_venta * p.stock), 0);

  // Listas para filtros dinámicos
  const marcasDisponibles = Array.from(new Set(productos.map(p => p.marca?.trim()).filter(Boolean))) as string[];
  const ubicacionesDisponibles = Array.from(new Set(productos.map(p => p.ubicacion?.trim()).filter(Boolean))) as string[];

  const productosFiltrados = productos.filter(p => {
    const term = buscar.trim().toLowerCase();
    const matchNombre = p.nombre.toLowerCase().includes(term);
    const matchCodigo = p.codigo.toLowerCase().includes(term);
    const matchMarca = p.marca ? p.marca.toLowerCase().includes(term) : false;
    const matchUbicacion = p.ubicacion ? p.ubicacion.toLowerCase().includes(term) : false;
    const matchPrincipio = p.principio_activo ? p.principio_activo.toLowerCase().includes(term) : false;
    const matchCatComercial = p.categoria_comercial ? p.categoria_comercial.toLowerCase().includes(term) : false;
    const matchLote = p.lote ? p.lote.toLowerCase().includes(term) : false;
    const matchAtributos = p.atributos
      ? Object.entries(p.atributos).some(([clave, valor]) =>
          clave.toLowerCase().includes(term) || valor.toLowerCase().includes(term)
        )
      : false;

    const coincideBuscar = !term || matchNombre || matchCodigo || matchMarca || matchUbicacion || matchPrincipio || matchCatComercial || matchLote || matchAtributos;
    const coincideCategoria = !filtroCategoria || p.categoria === filtroCategoria;
    const coincideCatComercial = !filtroCategoriaComercial || p.categoria_comercial === filtroCategoriaComercial;
    const coincideRubro = !filtroRubro || p.rubro === filtroRubro;
    const coincideMarca = !filtroMarca || p.marca === filtroMarca;
    const coincideUbicacion = !filtroUbicacion || p.ubicacion === filtroUbicacion;

    // Filtro por Tipo de Producto
    let coincideTipo = true;
    if (filtroTipo === "variantes") {
      coincideTipo = !!(p.tiene_variantes && p.variantes && p.variantes.length > 0);
    } else if (filtroTipo === "peso") {
      coincideTipo = !!(p.se_vende_por_peso || p.unidad_medida === "KG" || p.unidad_medida === "G");
    } else if (filtroTipo === "vencimiento") {
      coincideTipo = !!p.fecha_vencimiento;
    } else if (filtroTipo === "mayor") {
      coincideTipo = !!(p.precio_mayor && p.precio_mayor > 0);
    }

    // Filtro por Estado de Vencimiento
    let coincideVencimiento = true;
    if (filtroVencimiento !== "todos") {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const en30Dias = new Date(hoy);
      en30Dias.setDate(en30Dias.getDate() + 30);
      const en60Dias = new Date(hoy);
      en60Dias.setDate(en60Dias.getDate() + 60);

      if (!p.fecha_vencimiento) {
        coincideVencimiento = filtroVencimiento === "vigentes";
      } else {
        const fVenc = new Date(p.fecha_vencimiento + "T00:00:00");
        if (filtroVencimiento === "vencidos") {
          coincideVencimiento = fVenc < hoy;
        } else if (filtroVencimiento === "30dias") {
          coincideVencimiento = fVenc >= hoy && fVenc <= en30Dias;
        } else if (filtroVencimiento === "60dias") {
          coincideVencimiento = fVenc >= hoy && fVenc <= en60Dias;
        } else if (filtroVencimiento === "vigentes") {
          coincideVencimiento = fVenc > en60Dias;
        }
      }
    }

    // Filtro por Rango de Precios
    let coincidePrecio = true;
    if (filtroPrecioMin !== "") {
      const pMin = parseFloat(filtroPrecioMin);
      if (!isNaN(pMin) && p.precio_venta < pMin) coincidePrecio = false;
    }
    if (filtroPrecioMax !== "") {
      const pMax = parseFloat(filtroPrecioMax);
      if (!isNaN(pMax) && p.precio_venta > pMax) coincidePrecio = false;
    }

    // Filtro por Stock
    let coincideStock = true;
    const stockMin = p.stock_minimo !== undefined ? p.stock_minimo : umbralStock;
    if (filtroStock === "bajo") {
      coincideStock = p.stock > 0 && p.stock <= stockMin;
    } else if (filtroStock === "agotado") {
      coincideStock = p.stock <= 0;
    }

    return coincideBuscar && coincideCategoria && coincideCatComercial && coincideRubro && coincideMarca && coincideUbicacion && coincideTipo && coincideVencimiento && coincidePrecio && coincideStock;
  });

  // Ordenamiento Multicriterio
  const productosOrdenados = [...productosFiltrados].sort((a, b) => {
    if (ordenarPor === "nombre_asc") return a.nombre.localeCompare(b.nombre);
    if (ordenarPor === "nombre_desc") return b.nombre.localeCompare(a.nombre);
    if (ordenarPor === "stock_desc") return b.stock - a.stock;
    if (ordenarPor === "stock_asc") return a.stock - b.stock;
    if (ordenarPor === "precio_desc") return b.precio_venta - a.precio_venta;
    if (ordenarPor === "precio_asc") return a.precio_venta - b.precio_venta;
    if (ordenarPor === "vencimiento_asc") {
      if (!a.fecha_vencimiento) return 1;
      if (!b.fecha_vencimiento) return -1;
      return new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime();
    }
    return 0;
  });

  const inversionFiltrada = productosOrdenados.reduce((sum, p) => sum + (p.precio_compra * p.stock), 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Editor Lateral */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white border border-slate-100 p-6 rounded-[2.5rem] shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-50 pb-3 mb-6">
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-indigo-600" />
              <span>{id ? "Editar Artículo" : "Nuevo Artículo"}</span>
            </h2>
            <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100">
              Giro: {perfilNegocio?.rubro || "MULTI-RUBRO"}
            </span>
          </div>

          <div className="space-y-4">
            {/* Código y Rubro */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Código de Barras / SKU *</label>
                <div className="relative mt-1">
                  <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Ej: 7591234567"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-2.5 pl-9 pr-3 text-xs font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Unidad de Medida</label>
                <select
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-2.5 px-3 text-xs font-bold text-slate-700 mt-1 outline-none focus:bg-white"
                  value={unidadMedida}
                  onChange={(e) => handleCambioUnidad(e.target.value as UnidadMedida)}
                >
                  {UNIDADES_DISPONIBLES.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.label} ({u.simbolo})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Nombre del Artículo */}
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Descripción / Nombre Comercial *</label>
              <input
                type="text"
                placeholder={
                  perfilNegocio?.rubro === "FERRETERIA" ? "Ej: Cable THHN #12 Cu (Rollo x Metro)" :
                  perfilNegocio?.rubro === "ROPA_CALZADO" ? "Ej: Zapato Deportivo Air Max Runner" :
                  perfilNegocio?.rubro === "SUPERMERCADO" ? "Ej: Harina de Maíz Blanco PAN 1 Kg" :
                  "Ej: Ibuprofeno 400mg 10 Cápsulas"
                }
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-2.5 px-4 text-xs font-semibold mt-1 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>

            {/* Clasificación Fiscal y Departamento */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Régimen Fiscal</label>
                <select
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-2.5 px-3 text-xs font-semibold mt-1 outline-none focus:bg-white"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value as Producto["categoria"])}
                >
                  <option value="MEDICAMENTO">Medicamento (Exento)</option>
                  <option value="EXENTO">Exento Otros / Alimentos</option>
                  <option value="GRAVADO_16">Gravado (16% IVA)</option>
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Departamento</label>
                  <button
                    type="button"
                    onClick={() => setMostrandoGestorCategorias(true)}
                    className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-0.5"
                    title="Administrar o crear nuevos departamentos"
                  >
                    <Plus className="w-2.5 h-2.5" /> Gestionar
                  </button>
                </div>
                <select
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-2.5 px-3 text-xs font-semibold mt-1 outline-none focus:bg-white"
                  value={categoriaComercial}
                  onChange={(e) => setCategoriaComercial(e.target.value)}
                >
                  <option value="">-- Sin Departamento --</option>
                  {categoriasComerciales.map((cat) => (
                    <option key={cat.id} value={cat.nombre}>
                      {cat.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Desglose de Stock: Tienda vs Almacén y Stock Mínimo */}
            <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 space-y-3">
              <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-500">
                <span>Distribución de Inventario</span>
                <span className="text-indigo-600 font-bold">
                  Total: {((Number(stockTienda) || 0) + (Number(stockAlmacen) || 0)) || stock} {UNIDADES_DISPONIBLES.find(x => x.id === unidadMedida)?.simbolo || 'u.'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[9px] font-black uppercase text-indigo-700 block">
                    🏪 Stock Tienda
                  </label>
                  <input
                    type="number"
                    step={permiteDecimales ? "0.001" : "1"}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 px-2.5 text-xs font-black text-indigo-700 outline-none focus:border-indigo-500 mt-0.5"
                    value={stockTienda}
                    disabled={tieneVariantes}
                    onChange={(e) => {
                      const val = e.target.value === "" ? "" : Math.max(0, parseFloat(e.target.value) || 0);
                      setStockTienda(val);
                      const alm = typeof stockAlmacen === "number" ? stockAlmacen : 0;
                      setStock((typeof val === "number" ? val : 0) + alm);
                    }}
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-amber-700 block">
                    📦 Stock Almacén
                  </label>
                  <input
                    type="number"
                    step={permiteDecimales ? "0.001" : "1"}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 px-2.5 text-xs font-black text-amber-800 outline-none focus:border-amber-500 mt-0.5"
                    value={stockAlmacen}
                    disabled={tieneVariantes}
                    onChange={(e) => {
                      const val = e.target.value === "" ? "" : Math.max(0, parseFloat(e.target.value) || 0);
                      setStockAlmacen(val);
                      const tie = typeof stockTienda === "number" ? stockTienda : 0;
                      setStock(tie + (typeof val === "number" ? val : 0));
                    }}
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-slate-500 block">
                    ⚠️ Mínimo Alerta
                  </label>
                  <input
                    type="number"
                    step={permiteDecimales ? "0.001" : "1"}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 px-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-slate-400 mt-0.5"
                    value={stockMinimo}
                    onChange={(e) => setStockMinimo(Math.max(0, parseFloat(e.target.value) || 0))}
                  />
                </div>
              </div>
            </div>

            {/* Marca, Modelo y Ubicación en Tienda / Almacén */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Marca / Fabricante</label>
                <input
                  type="text"
                  placeholder="Ej: Stanley, Pfizer, Polar"
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-2 px-3 text-xs font-semibold mt-1 outline-none focus:bg-white"
                  value={marca}
                  onChange={(e) => setMarca(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Modelo / Referencia</label>
                <input
                  type="text"
                  placeholder="Ej: Mod-2026, 500mg, etc."
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-2 px-3 text-xs font-semibold mt-1 outline-none focus:bg-white"
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase text-indigo-700 ml-1">🏪 Ubicación en Tienda</label>
                <input
                  type="text"
                  placeholder="Ej: Mostrador / Pasillo 1"
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-2 px-3 text-xs font-semibold mt-1 outline-none focus:bg-white"
                  value={ubicacionTienda || ubicacion}
                  onChange={(e) => {
                    setUbicacionTienda(e.target.value);
                    setUbicacion(e.target.value);
                  }}
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-amber-700 ml-1">📦 Ubicación en Almacén</label>
                <input
                  type="text"
                  placeholder="Ej: Rack 4 - Nivel B"
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-2 px-3 text-xs font-semibold mt-1 outline-none focus:bg-white"
                  value={ubicacionAlmacen}
                  onChange={(e) => setUbicacionAlmacen(e.target.value)}
                />
              </div>
            </div>

            {/* Campos Condicionales: FARMACIA (Principio Activo, Lote, Vencimiento) */}
            {(perfilNegocio?.habilitarLotesVencimiento || rubro === "FARMACIA") && (
              <div className="bg-emerald-50/50 border border-emerald-100/60 p-3.5 rounded-2xl space-y-2.5">
                <div className="flex items-center gap-1.5 text-emerald-800 text-[10px] font-black uppercase">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Control Sanitario & Caducidad</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-bold uppercase text-slate-500">Principio Activo</label>
                    <input
                      type="text"
                      placeholder="Ej: Paracetamol 500mg"
                      className="w-full bg-white border border-slate-200 rounded-xl p-1.5 text-[11px] font-semibold outline-none"
                      value={principioActivo}
                      onChange={(e) => setPrincipioActivo(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase text-slate-500">Laboratorio</label>
                    <input
                      type="text"
                      placeholder="Ej: Calox, Genven"
                      className="w-full bg-white border border-slate-200 rounded-xl p-1.5 text-[11px] font-semibold outline-none"
                      value={laboratorio}
                      onChange={(e) => setLaboratorio(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-bold uppercase text-slate-500">N° Lote</label>
                    <input
                      type="text"
                      placeholder="LOT-2026-X"
                      className="w-full bg-white border border-slate-200 rounded-xl p-1.5 text-[11px] font-semibold outline-none font-mono"
                      value={lote}
                      onChange={(e) => setLote(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase text-slate-500">Fecha Vencimiento</label>
                    <input
                      type="date"
                      className="w-full bg-white border border-slate-200 rounded-xl p-1.5 text-[11px] font-semibold outline-none"
                      value={fechaVencimiento}
                      onChange={(e) => setFechaVencimiento(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Campos Condicionales: SUPERMERCADO (Código de Balanza) */}
            {(perfilNegocio?.habilitarBalanzas || rubro === "SUPERMERCADO") && (
              <div className="bg-blue-50/50 border border-blue-100/60 p-3 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-blue-800 text-[10px] font-black uppercase">
                    <Scale className="w-3.5 h-3.5 text-blue-600" />
                    <span>PLU / Balanza Ticket</span>
                  </div>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={seVendePorPeso}
                      onChange={(e) => setSeVendePorPeso(e.target.checked)}
                      className="w-3.5 h-3.5 text-blue-600 rounded"
                    />
                    <span className="text-[9px] font-bold text-blue-900">Venta por Peso (Kg)</span>
                  </label>
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase text-slate-500">Código PLU de Balanza (4 o 5 dígitos)</label>
                  <input
                    type="text"
                    placeholder="Ej: 0145 (para ticket 200145003502)"
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-mono font-bold outline-none"
                    value={codigoBalanza}
                    onChange={(e) => setCodigoBalanza(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Campos Condicionales: ROPA / CALZADO (Matriz de Variantes Talla x Color) */}
            {(perfilNegocio?.habilitarVariantes || rubro === "ROPA_CALZADO") && (
              <div className="bg-purple-50/50 border border-purple-100/60 p-3.5 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-purple-800 text-[10px] font-black uppercase">
                    <Shirt className="w-3.5 h-3.5 text-purple-600" />
                    <span>Matriz de Variantes (Talla / Color)</span>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={tieneVariantes}
                      onChange={(e) => setTieneVariantes(e.target.checked)}
                      className="w-3.5 h-3.5 text-purple-600 rounded"
                    />
                    <span className="text-[9px] font-bold text-purple-900">Activar Variantes</span>
                  </label>
                </div>

                {tieneVariantes && (
                  <div className="space-y-2.5 pt-1">
                    <div className="grid grid-cols-4 gap-1.5">
                      <input 
                        type="text" 
                        placeholder="Talla (38, M)" 
                        value={nuevaTalla}
                        onChange={(e) => setNuevaTalla(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg p-1.5 text-[10px] font-bold text-slate-800 outline-none"
                      />
                      <input 
                        type="text" 
                        placeholder="Color (Negro)" 
                        value={nuevoColor}
                        onChange={(e) => setNuevoColor(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg p-1.5 text-[10px] font-bold text-slate-800 outline-none"
                      />
                      <input 
                        type="number" 
                        placeholder="Stock" 
                        value={nuevoStockVariante}
                        onChange={(e) => setNuevoStockVariante(Math.max(0, parseInt(e.target.value) || 0))}
                        className="bg-white border border-slate-200 rounded-lg p-1.5 text-[10px] font-bold text-slate-800 outline-none text-center"
                      />
                      <button
                        type="button"
                        onClick={agregarVariante}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-black text-[10px] uppercase rounded-lg transition"
                      >
                        + Añadir
                      </button>
                    </div>

                    {variantes.length > 0 && (
                      <div className="bg-white rounded-xl p-2 border border-purple-100 max-h-32 overflow-y-auto space-y-1">
                        {variantes.map((v) => (
                          <div key={v.id} className="flex items-center justify-between text-[10px] bg-purple-50/70 p-1.5 rounded-lg border border-purple-100/50">
                            <span className="font-bold text-slate-700">
                              {v.talla ? `Talla ${v.talla}` : ""} {v.color ? `• ${v.color}` : ""}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-black bg-purple-200/60 text-purple-900 px-1.5 py-0.5 rounded text-[9px]">
                                {v.stock} u.
                              </span>
                              <button
                                type="button"
                                onClick={() => eliminarVariante(v.id)}
                                className="text-rose-500 hover:text-rose-700 font-black px-1"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Precios, Costos y Tarifas Múltiples */}
            <div className="bg-slate-50/80 p-4 border border-slate-100 rounded-[2rem] space-y-3">
              <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-indigo-600" /> Precios e Inteligencia de Costos
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400">Costo de Bulto / Paq. ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-semibold mt-1 outline-none"
                    value={costoBulto}
                    onChange={(e) => setCostoBulto(Math.max(0, parseFloat(e.target.value) || 0))}
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400">Unidades x Bulto</label>
                  <input
                    type="number"
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-semibold mt-1 outline-none"
                    value={unidadesBulto}
                    onChange={(e) => setUnidadesBulto(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400">Margen de Ganancia Deseado (%)</label>
                <input
                  type="number"
                  className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-semibold mt-1 outline-none"
                  value={gananciaPerc}
                  onChange={(e) => setGananciaPerc(Math.max(0, parseFloat(e.target.value) || 0))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <span className="text-[9px] font-black uppercase text-indigo-500 block">Costo Unit.</span>
                  <span className="text-sm font-black text-slate-700">${precioCompra.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-emerald-500 block">Venta Detal (PVP) *</span>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl p-1.5 text-xs font-black text-center mt-1 outline-none"
                    value={precioVenta}
                    onChange={(e) => setPrecioVenta(Math.max(0, parseFloat(e.target.value) || 0))}
                  />
                </div>
              </div>

              {/* Precios Múltiples (Mayor / Especial / Técnico) */}
              {(perfilNegocio?.habilitarPreciosMayor || rubro === "FERRETERIA" || rubro === "SUPERMERCADO" || rubro === "ROPA_CALZADO") && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="text-[9px] font-black uppercase text-amber-600 block">Precio Mayorista ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Opcional"
                      className="w-full bg-amber-50/70 text-amber-900 border border-amber-200 rounded-xl p-1.5 text-xs font-bold text-center mt-1 outline-none"
                      value={precioMayor}
                      onChange={(e) => setPrecioMayor(e.target.value === "" ? "" : Math.max(0, parseFloat(e.target.value) || 0))}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-blue-600 block">Precio Especial / Técnico ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Opcional"
                      className="w-full bg-blue-50/70 text-blue-900 border border-blue-200 rounded-xl p-1.5 text-xs font-bold text-center mt-1 outline-none"
                      value={precioEspecial}
                      onChange={(e) => setPrecioEspecial(e.target.value === "" ? "" : Math.max(0, parseFloat(e.target.value) || 0))}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Atributos Personalizados JSON */}
            <div className="bg-slate-50/50 p-3.5 border border-slate-100 rounded-[2rem] space-y-2.5">
              <div className="flex justify-between items-center">
                <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  Especificaciones Adicionales
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Propiedad (ej: Voltaje, Potencia)"
                  className="bg-white border border-slate-200 rounded-xl p-1.5 text-[10px] font-bold outline-none"
                  value={nuevaClaveAtributo}
                  onChange={(e) => setNuevaClaveAtributo(e.target.value)}
                />
                <div className="flex gap-1">
                  <input
                    type="text"
                    placeholder="Valor (ej: 110V, 50W)"
                    className="flex-1 bg-white border border-slate-200 rounded-xl p-1.5 text-[10px] font-semibold outline-none"
                    value={nuevoValorAtributo}
                    onChange={(e) => setNuevoValorAtributo(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!nuevaClaveAtributo.trim() || !nuevoValorAtributo.trim()) return;
                      const yaExiste = atributos.some(
                        a => a.clave.toLowerCase() === nuevaClaveAtributo.trim().toLowerCase()
                      );
                      if (yaExiste) {
                        alert("Esta clave ya existe");
                        return;
                      }
                      setAtributos([...atributos, { clave: nuevaClaveAtributo.trim(), valor: nuevoValorAtributo.trim() }]);
                      setNuevaClaveAtributo("");
                      setNuevoValorAtributo("");
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-2.5 rounded-xl text-xs flex items-center justify-center transition shrink-0"
                  >
                    +
                  </button>
                </div>
              </div>

              {atributos.length > 0 && (
                <div className="bg-white border border-slate-100 rounded-xl p-2 space-y-1 max-h-28 overflow-y-auto">
                  {atributos.map((attr, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[10px] bg-slate-50/60 p-1 rounded-lg">
                      <span className="font-bold text-slate-500 uppercase">{attr.clave}:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-slate-800">{attr.valor}</span>
                        <button
                          type="button"
                          onClick={() => setAtributos(atributos.filter((_, i) => i !== idx))}
                          className="text-rose-500 hover:text-rose-700 font-bold px-1"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Botones de Acción */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={guardarProducto}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3.5 rounded-2xl text-xs uppercase tracking-wider shadow-sm transition"
              >
                {id ? "Actualizar Artículo" : "Registrar en Inventario"}
              </button>
              <button
                onClick={limpiarFormulario}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-4 rounded-2xl text-xs transition"
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>

        {/* Valor de Inventario y Alertas */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-slate-100 p-5 rounded-[2rem] text-center shadow-sm">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Inversión Total Costo</p>
            <p className="text-lg font-black text-slate-800 mt-1">${inversionTotal.toFixed(2)}</p>
          </div>
          <div className="bg-white border border-slate-100 p-5 rounded-[2rem] text-center shadow-sm">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Retorno PVP Estimado</p>
            <p className="text-lg font-black text-indigo-600 mt-1">${ventaTotalEstimada.toFixed(2)}</p>
          </div>
        </div>

        {/* Umbral de Reposición */}
        <div className="bg-white border border-slate-100 p-5 rounded-[2rem] shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-50 pb-2.5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Alerta de Stock Mínimo Global</h3>
            </div>
            <span className="text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-lg">
              ≤ {umbralStock}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="50"
              value={umbralStock}
              onChange={(e) => handleUmbralChange(parseInt(e.target.value, 10) || 0)}
              className="flex-1 h-1.5 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <input
              type="number"
              min="0"
              max="999"
              value={umbralStock}
              onChange={(e) => handleUmbralChange(parseInt(e.target.value, 10) || 0)}
              className="w-14 text-center bg-white border border-slate-200 rounded-xl py-1 text-xs font-bold text-slate-800 outline-none"
            />
          </div>

          <button
            onClick={exportarReposicionCSV}
            className="w-full bg-amber-600 hover:bg-amber-500 text-white font-black text-[10px] uppercase tracking-wider py-3 px-4 rounded-2xl transition flex items-center justify-center gap-2 shadow-sm"
          >
            <Download className="w-4 h-4" /> 
            <span>Lista de Reposición ({productos.filter(p => p.stock <= (p.stock_minimo !== undefined ? p.stock_minimo : umbralStock)).length})</span>
          </button>
        </div>
      </div>

      {/* Catálogo de Inventario */}
      <div className="lg:col-span-8 space-y-4">
        {/* Buscador y Acciones */}
        <div className="bg-white border border-slate-100 p-5 rounded-3xl space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
            <div className="relative flex-1 w-full">
              <Search className="w-5 h-5 text-indigo-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="input-buscar-inventario"
                type="text"
                placeholder="Buscar por código, nombre, marca, ubicación, lote o principio activo..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-12 pr-10 outline-none font-semibold text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition shadow-inner"
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
              />
              {buscar && (
                <button
                  type="button"
                  id="btn-limpiar-busqueda-inventario"
                  onClick={() => setBuscar("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-200 transition"
                  title="Limpiar búsqueda"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex gap-2 shrink-0 w-full sm:w-auto justify-end items-center">
              <button
                type="button"
                onClick={() => setMostrarFiltrosAvanzados(!mostrarFiltrosAvanzados)}
                className={`text-xs font-black uppercase tracking-wider py-3 px-3.5 rounded-2xl transition flex items-center gap-1.5 ${
                  mostrarFiltrosAvanzados || hayFiltrosActivos
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
                title="Filtros avanzados"
              >
                <Sliders className="w-4 h-4" />
                <span>Filtros {hayFiltrosActivos ? "•" : ""}</span>
              </button>
              <button
                type="button"
                onClick={() => setMostrandoGestorCategorias(true)}
                className="bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-black uppercase tracking-wider py-3 px-3.5 rounded-2xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Crear y administrar Departamentos / Categorías"
              >
                <Layers className="w-4 h-4" />
                <span>Departamentos</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setProductoParaKardex(null);
                  setMostrarModalKardex(true);
                }}
                className="bg-cyan-50 hover:bg-cyan-100 text-cyan-700 text-xs font-black uppercase tracking-wider py-3 px-3.5 rounded-2xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Auditoría y Kardex de Movimientos"
              >
                <History className="w-4 h-4" />
                <span>Kardex</span>
              </button>
              <button
                onClick={exportarInventarioCSV}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-black uppercase tracking-wider py-3 px-4 rounded-2xl transition flex items-center justify-center gap-1.5 flex-1 sm:flex-initial"
              >
                <Download className="w-4 h-4" /> <span>Exportar CSV</span>
              </button>
              <button 
                onClick={cargarProductos}
                className="bg-slate-50 p-3.5 rounded-2xl text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition"
                title="Recargar"
              >
                <RefreshCw className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>

          {/* Barra de Filtros Primarios */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
            {/* Filtro por Rubro */}
            <div>
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider ml-1">Giro / Rubro</label>
              <select
                className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-[11px] font-bold text-slate-700 outline-none focus:bg-white mt-0.5"
                value={filtroRubro}
                onChange={(e) => setFiltroRubro(e.target.value)}
              >
                <option value="">🏢 Todos los Rubros</option>
                <option value="FARMACIA">💊 Farmacia & Salud</option>
                <option value="FERRETERIA">🔨 Ferretería & Repuestos</option>
                <option value="SUPERMERCADO">🛒 Supermercado & Víveres</option>
                <option value="ROPA_CALZADO">👕 Ropa & Calzados</option>
                <option value="GENERAL">📦 Comercio General</option>
              </select>
            </div>

            {/* Filtro por Departamento */}
            <div>
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider ml-1">Departamento</label>
              <select
                className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-[11px] font-bold text-slate-700 outline-none focus:bg-white mt-0.5"
                value={filtroCategoriaComercial}
                onChange={(e) => setFiltroCategoriaComercial(e.target.value)}
              >
                <option value="">📂 Todos los Dptos.</option>
                {categoriasComerciales.map((cat) => (
                  <option key={cat.id} value={cat.nombre}>
                    {cat.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por Nivel de Stock */}
            <div>
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider ml-1">Nivel Existencia</label>
              <select
                className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-[11px] font-bold text-slate-700 outline-none focus:bg-white mt-0.5"
                value={filtroStock}
                onChange={(e) => setFiltroStock(e.target.value as any)}
              >
                <option value="todos">📦 Todas las Existencias</option>
                <option value="bajo">⚠️ Stock Bajo (Crítico)</option>
                <option value="agotado">⛔ Stock Agotado (0)</option>
              </select>
            </div>

            {/* Ordenamiento */}
            <div>
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider ml-1">Ordenar Catálogo Por</label>
              <select
                className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-[11px] font-bold text-indigo-700 outline-none focus:bg-white mt-0.5"
                value={ordenarPor}
                onChange={(e) => setOrdenarPor(e.target.value as any)}
              >
                <option value="nombre_asc">Nombre (A - Z)</option>
                <option value="nombre_desc">Nombre (Z - A)</option>
                <option value="stock_desc">Mayor Stock Primero</option>
                <option value="stock_asc">Menor Stock Primero</option>
                <option value="precio_desc">Mayor Precio ($)</option>
                <option value="precio_asc">Menor Precio ($)</option>
                <option value="vencimiento_asc">Próximos a Vencer</option>
              </select>
            </div>
          </div>

          {/* Panel Desplegable de Filtros Avanzados */}
          <AnimatePresence>
            {mostrarFiltrosAvanzados && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-t border-slate-100 pt-3 space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                  {/* Filtro por Marca */}
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider ml-1">Marca / Fabricante</label>
                    <select
                      className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-[11px] font-bold text-slate-700 outline-none mt-0.5"
                      value={filtroMarca}
                      onChange={(e) => setFiltroMarca(e.target.value)}
                    >
                      <option value="">🏷️ Todas las Marcas</option>
                      {marcasDisponibles.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filtro por Tipo de Artículo */}
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider ml-1">Tipo de Producto</label>
                    <select
                      className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-[11px] font-bold text-slate-700 outline-none mt-0.5"
                      value={filtroTipo}
                      onChange={(e) => setFiltroTipo(e.target.value as any)}
                    >
                      <option value="todos">✨ Todos los Tipos</option>
                      <option value="variantes">👕 Con Variantes (Talla/Col)</option>
                      <option value="peso">⚖️ Por Peso (Balanza/Charc.)</option>
                      <option value="vencimiento">⏳ Con Lote y Caducidad</option>
                      <option value="mayor">🏷️ Con Precio Mayorista</option>
                    </select>
                  </div>

                  {/* Filtro por Vencimiento */}
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider ml-1">Vencimiento / Caducidad</label>
                    <select
                      className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-[11px] font-bold text-slate-700 outline-none mt-0.5"
                      value={filtroVencimiento}
                      onChange={(e) => setFiltroVencimiento(e.target.value as any)}
                    >
                      <option value="todos">⏳ Todos los Estados</option>
                      <option value="vencidos">⛔ Vencidos (Caducados)</option>
                      <option value="30dias">⚠️ Vencen en ≤ 30 días</option>
                      <option value="60dias">📅 Vencen en ≤ 60 días</option>
                      <option value="vigentes">✅ Vigentes (&gt;60 días)</option>
                    </select>
                  </div>

                  {/* Filtro por Régimen Fiscal */}
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider ml-1">Régimen Fiscal</label>
                    <select
                      className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-[11px] font-bold text-slate-700 outline-none mt-0.5"
                      value={filtroCategoria}
                      onChange={(e) => setFiltroCategoria(e.target.value)}
                    >
                      <option value="">⚖️ Todos los Regímenes</option>
                      <option value="MEDICAMENTO">Medicamento (Exento)</option>
                      <option value="EXENTO">Exento Otros</option>
                      <option value="GRAVADO_16">Gravado (16% IVA)</option>
                    </select>
                  </div>

                  {/* Rango de Precios */}
                  <div className="sm:col-span-2">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider ml-1">Rango de Precio Venta ($)</label>
                    <div className="flex items-center gap-2 mt-0.5">
                      <input
                        type="number"
                        placeholder="Mín $"
                        value={filtroPrecioMin}
                        onChange={(e) => setFiltroPrecioMin(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-[11px] font-bold text-slate-700 outline-none"
                      />
                      <span className="text-slate-400 font-bold text-xs">-</span>
                      <input
                        type="number"
                        placeholder="Máx $"
                        value={filtroPrecioMax}
                        onChange={(e) => setFiltroPrecioMax(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-[11px] font-bold text-slate-700 outline-none"
                      />
                    </div>
                  </div>

                  {/* Filtro por Ubicación */}
                  <div className="sm:col-span-2">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider ml-1">Ubicación en Almacén</label>
                    <select
                      className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-[11px] font-bold text-slate-700 outline-none mt-0.5"
                      value={filtroUbicacion}
                      onChange={(e) => setFiltroUbicacion(e.target.value)}
                    >
                      <option value="">📍 Todas las Ubicaciones</option>
                      {ubicacionesDisponibles.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Barra de Estado de Filtros y Botón Reset */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-50 text-[10px]">
            <div className="flex items-center gap-2">
              <span className="font-black bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-xl uppercase">
                Mostrando {productosOrdenados.length} de {productos.length} artículos
              </span>
              <span className="font-bold text-slate-400">
                Inversión mostrada: <strong className="text-slate-700">${inversionFiltrada.toFixed(2)}</strong>
              </span>
            </div>

            {hayFiltrosActivos && (
              <button
                type="button"
                onClick={limpiarTodosLosFiltros}
                className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-black px-3 py-1 rounded-xl transition flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpiar Filtros</span>
              </button>
            )}
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <th className="p-4 pl-6">Código</th>
                  <th className="p-4">Descripción & Propiedades</th>
                  <th className="p-4">Costo</th>
                  <th className="p-4 text-indigo-600">PVP Detal</th>
                  <th className="p-4 text-amber-600">PVP Mayor</th>
                  <th className="p-4">Existencia</th>
                  <th className="p-4 text-center pr-6">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {productosOrdenados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-slate-400 py-12 font-medium">Ningún artículo coincide con los criterios.</td>
                  </tr>
                ) : (
                  productosOrdenados.map((p) => {
                    const min = p.stock_minimo !== undefined ? p.stock_minimo : umbralStock;
                    const stockAgotado = p.stock <= 0;
                    const stockBajo = p.stock > 0 && p.stock <= min;
                    const uSimbolo = UNIDADES_DISPONIBLES.find(x => x.id === p.unidad_medida)?.simbolo || (p.se_vende_por_peso ? 'Kg' : 'u.');

                    return (
                      <tr 
                        key={p.id} 
                        className="hover:bg-slate-50/60 transition cursor-pointer"
                        onClick={() => seleccionarProducto(p)}
                      >
                        <td className="p-4 pl-6 font-mono text-slate-500 text-[11px] font-bold">
                          {p.codigo}
                          {p.codigo_balanza && (
                            <span className="block text-[9px] text-blue-600 font-mono">PLU: {p.codigo_balanza}</span>
                          )}
                        </td>
                        <td className="p-4 max-w-xs">
                          <div className="font-bold text-slate-800 text-xs leading-snug">{p.nombre}</div>
                          <div className="flex flex-wrap gap-1 mt-1.5 items-center">
                            {/* Rubro Badge */}
                            {p.rubro && p.rubro !== "GENERAL" && (
                              <span className="text-[8px] font-black bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded uppercase">
                                {p.rubro}
                              </span>
                            )}

                            {/* Departamento */}
                            {p.categoria_comercial && (
                              <span className="text-[8px] font-black bg-indigo-50 text-indigo-700 border border-indigo-100/60 px-1.5 py-0.5 rounded">
                                {p.categoria_comercial}
                              </span>
                            )}

                            {/* Marca */}
                            {p.marca && (
                              <span className="text-[8px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                                🏷️ {p.marca}
                              </span>
                            )}

                            {/* Ubicación */}
                            {p.ubicacion && (
                              <span className="text-[8px] font-bold bg-amber-50 text-amber-700 border border-amber-100/60 px-1.5 py-0.5 rounded">
                                📍 {p.ubicacion}
                              </span>
                            )}

                            {/* Principio Activo */}
                            {p.principio_activo && (
                              <span className="text-[8px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">
                                🧪 {p.principio_activo}
                              </span>
                            )}

                            {/* Variantes Badge */}
                            {p.tiene_variantes && p.variantes && p.variantes.length > 0 && (
                              <span className="text-[8px] font-black bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">
                                👕 {p.variantes.length} Variantes
                              </span>
                            )}

                            {/* Lote / Vencimiento */}
                            {p.fecha_vencimiento && (
                              <span className="text-[8px] font-bold bg-rose-50 text-rose-700 border border-rose-100 px-1.5 py-0.5 rounded">
                                ⏳ Vence: {p.fecha_vencimiento}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 font-semibold text-slate-600">${p.precio_compra.toFixed(2)}</td>
                        <td className="p-4 font-black text-indigo-600">${p.precio_venta.toFixed(2)}</td>
                        <td className="p-4 font-bold text-amber-600">
                          {p.precio_mayor ? `$${p.precio_mayor.toFixed(2)}` : <span className="text-slate-300 font-normal">—</span>}
                        </td>
                        <td className="p-4">
                          <span className={`font-black px-2.5 py-1 rounded-xl text-[10px] inline-flex items-center gap-1 ${
                            stockAgotado ? "bg-rose-100 text-rose-700" :
                            stockBajo ? "bg-amber-100 text-amber-800 animate-pulse" : 
                            "bg-emerald-50 text-emerald-700"
                          }`}>
                            {p.permite_decimales || p.se_vende_por_peso 
                              ? `${p.stock.toFixed(2)} ${uSimbolo}` 
                              : `${p.stock} ${uSimbolo}`}
                          </span>
                        </td>
                        <td className="p-4 pr-6 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-2 justify-center">
                            <button 
                              onClick={() => {
                                setProductoParaKardex(p);
                                setMostrarModalKardex(true);
                              }}
                              className="text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 p-1.5 rounded-lg transition"
                              title="Ver Kardex del Producto"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => seleccionarProducto(p)}
                              className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-lg transition"
                              title="Editar"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => setProductoAEliminar(p)}
                              className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de Confirmación de Eliminación */}
      <AnimatePresence>
        {productoAEliminar && (
          <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] max-w-md w-full p-6 shadow-2xl border border-slate-100 relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col items-center text-center p-2">
                <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 mb-4 animate-pulse">
                  <AlertTriangle className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">¿Eliminar Artículo?</h3>
                <p className="text-slate-500 text-xs mt-2 leading-relaxed">
                  ¿Está seguro de que desea eliminar permanentemente{" "}
                  <strong className="text-slate-800 font-extrabold font-mono">
                    "{productoAEliminar.nombre}"
                  </strong>{" "}
                  del catálogo de inventario?
                </p>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setProductoAEliminar(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 px-4 rounded-2xl text-xs uppercase tracking-wider transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarEliminarProducto}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-black py-3 px-4 rounded-2xl text-xs uppercase tracking-wider transition"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Kardex de Movimientos */}
      <ModalKardex
        isOpen={mostrarModalKardex}
        onClose={() => {
          setMostrarModalKardex(false);
          setProductoParaKardex(null);
        }}
        productoInicial={productoParaKardex}
      />

      {/* Modal Gestor de Departamentos / Categorías Comerciales */}
      <AnimatePresence>
        {mostrandoGestorCategorias && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-700">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Gestión de Departamentos</h3>
                    <p className="text-xs text-slate-500 font-medium">Crea o elimina departamentos para clasificar tus productos</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMostrandoGestorCategorias(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Formulario para Crear Nuevo Departamento */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 mb-6">
                <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider block mb-2">
                  Crear Nuevo Departamento / Categoría
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ej: Analgésicos, Herramientas, Charcutería, Bebidas..."
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-500"
                    value={nuevaCatComercial}
                    onChange={(e) => setNuevaCatComercial(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        agregarCategoriaComercial();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={agregarCategoriaComercial}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-black text-xs px-4 py-2.5 rounded-xl uppercase tracking-wider transition flex items-center gap-1.5 shrink-0 shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Añadir</span>
                  </button>
                </div>
              </div>

              {/* Listado de Departamentos Existentes */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Departamentos Registrados ({categoriasComerciales.length})
                  </h4>
                  <span className="text-[10px] text-slate-400 font-bold">
                    Giro: {perfilNegocio?.rubro || "GENERAL"}
                  </span>
                </div>

                {categoriasComerciales.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-xs font-bold text-slate-400">No hay departamentos personalizados creados.</p>
                    <p className="text-[10px] text-slate-400 mt-1">Escribe un nombre arriba y pulsa "Añadir".</p>
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {categoriasComerciales.map((cat) => {
                      const countProductos = productos.filter(p => p.categoria_comercial === cat.nombre).length;
                      return (
                        <div
                          key={cat.id}
                          className="flex items-center justify-between p-3 bg-slate-50 hover:bg-purple-50/50 border border-slate-100 rounded-2xl transition"
                        >
                          <div className="flex items-center gap-2.5">
                            <Tag className="w-3.5 h-3.5 text-purple-600" />
                            <div>
                              <span className="text-xs font-black text-slate-800">{cat.nombre}</span>
                              <span className="text-[10px] text-slate-400 font-medium ml-2">
                                ({countProductos} {countProductos === 1 ? 'artículo' : 'artículos'})
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`¿Eliminar el departamento "${cat.nombre}"? Los artículos asociados mantendrán su existencia pero quedarán sin departamento asignado.`)) {
                                eliminarCategoriaComercial(cat.id);
                              }
                            }}
                            className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-xl transition"
                            title="Eliminar Departamento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setMostrandoGestorCategorias(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-black px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider transition"
                >
                  Listo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
