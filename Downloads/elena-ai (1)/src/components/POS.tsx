/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard, 
  DollarSign, 
  UserCheck, 
  AlertCircle, 
  RefreshCw, 
  Printer, 
  Check, 
  CheckCircle2, 
  X,
  Layers,
  Scale,
  Shirt,
  Tag,
  Hammer,
  Store,
  Sliders,
  RotateCcw,
  FileSpreadsheet,
  History,
  FileText
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Producto, PagoMetodo, DetalleVenta, Venta, PerfilNegocio, VarianteProducto, UnidadMedida, CotizacionPresupuesto } from "../types";
import ThermalTicketModal from "./ThermalTicketModal";
import ModalSelectorVariantes from "./ModalSelectorVariantes";
import ModalDevoluciones from "./ModalDevoluciones";
import ModalCotizaciones from "./ModalCotizaciones";
import ModalKardex from "./ModalKardex";
import ModalCorteX from "./ModalCorteX";
import { apiFetch } from "../utils/api";

export interface ItemCarritoPOS {
  cartId: string;
  producto: Producto;
  cantidad: number;
  precioUnitario: number;
  tarifaAplicada: "detal" | "mayor" | "especial";
  variante?: VarianteProducto;
}

export default function POS() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [perfilNegocio, setPerfilNegocio] = useState<PerfilNegocio | null>(null);
  const [buscar, setBuscar] = useState("");
  const inputBuscarRef = useRef<HTMLInputElement>(null);
  const [carrito, setCarrito] = useState<ItemCarritoPOS[]>([]);
  const [tasa, setTasa] = useState(36.50);

  // Selector de Tarifa Activa (Detal / Mayor / Especial)
  const [tarifaActiva, setTarifaActiva] = useState<"detal" | "mayor" | "especial">("detal");

  // Filtros rápidos POS
  const [filtroCategoriaPOS, setFiltroCategoriaPOS] = useState<string>("");
  const [filtroRubroPOS, setFiltroRubroPOS] = useState<string>("");
  const [filtroSoloConStock, setFiltroSoloConStock] = useState<boolean>(false);

  // Modal de Selección de Variante (Talla / Color)
  const [productoParaVariante, setProductoParaVariante] = useState<Producto | null>(null);
  const [mostrarModalVariantes, setMostrarModalVariantes] = useState(false);

  // Estados de Resiliencia de Red / Offline Queue
  const [offlineQueue, setOfflineQueue] = useState<any[]>(() => {
    try {
      const q = localStorage.getItem("offline_sales_queue");
      return q ? JSON.parse(q) : [];
    } catch {
      return [];
    }
  });
  const [isOnline, setIsOnline] = useState(typeof window !== "undefined" ? navigator.onLine : true);
  const [sincronizando, setSincronizando] = useState(false);

  // Datos del Cliente
  const [cedula, setCedula] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [clienteExiste, setClienteExiste] = useState(false);
  const [clienteDeuda, setClienteDeuda] = useState(0);

  // Modal de Pago y Métodos
  const [mostrarPago, setMostrarPago] = useState(false);
  const [pagosRealizados, setPagosRealizados] = useState<PagoMetodo[]>([]);
  const [metodoActual, setMetodoActual] = useState<PagoMetodo["metodo"]>("PUNTO");
  const [inputMonto, setInputMonto] = useState("");
  const [inputRef, setInputRef] = useState("");
  const [descuentoUSD, setDescuentoUSD] = useState<number>(0);
  
  // Opción para cobrar sin factura en desarrollo
  const [sinFactura, setSinFactura] = useState(false);

  // Impresión Térmica
  const [ventaParaImprimir, setVentaParaImprimir] = useState<Venta | null>(null);
  const [mostrarTicketModal, setMostrarTicketModal] = useState(false);
  const [ultimoAgregado, setUltimoAgregado] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [impresoraFiscalActiva, setImpresoraFiscalActiva] = useState<boolean>(() => {
    return localStorage.getItem("thermal_impresora_fiscal_activa") !== "false";
  });

  // Diálogo de Peso (Weighed Product Dialog)
  const [mostrarDialogoPeso, setMostrarDialogoPeso] = useState(false);
  const [productoParaPeso, setProductoParaPeso] = useState<Producto | null>(null);
  const [inputGramos, setInputGramos] = useState<number | "">("");

  // Modales de Devoluciones, Cotizaciones, Kardex y Corte X
  const [mostrarModalDevoluciones, setMostrarModalDevoluciones] = useState(false);
  const [mostrarModalCotizaciones, setMostrarModalCotizaciones] = useState(false);
  const [mostrarModalKardex, setMostrarModalKardex] = useState(false);
  const [mostrarModalCorteX, setMostrarModalCorteX] = useState(false);

  const handleCargarCotizacionAlPOS = (cot: CotizacionPresupuesto) => {
    // 1. Asignar cliente
    setCedula(cot.cliente_id);
    setNombre(cot.cliente_nombre);
    setTelefono(cot.cliente_telefono || "");
    setDireccion(cot.cliente_direccion || "");
    setDescuentoUSD(cot.descuento_usd || 0);

    // 2. Cargar items al carrito buscando productos actualizados
    const nuevosItemsCarrito: ItemCarritoPOS[] = [];
    cot.items.forEach(it => {
      const prodOriginal = productos.find(p => p.id === it.producto_id);
      if (prodOriginal) {
        nuevosItemsCarrito.push({
          cartId: `${it.producto_id}-${Date.now()}-${Math.random()}`,
          producto: prodOriginal,
          cantidad: it.cantidad,
          precioUnitario: it.precio_unitario,
          tarifaAplicada: (it.tarifa_aplicada as any) || "detal"
        });
      }
    });

    if (nuevosItemsCarrito.length > 0) {
      setCarrito(nuevosItemsCarrito);
      setMensajeExito(`Presupuesto ${cot.numero_presupuesto} cargado al POS listo para facturar.`);
    } else {
      setMensajeError("No se pudieron cargar los artículos del presupuesto al carrito.");
    }
  };

  const toggleImpresoraFiscal = (value: boolean) => {
    setImpresoraFiscalActiva(value);
    localStorage.setItem("thermal_impresora_fiscal_activa", String(value));
  };

  // Limpiar indicador de producto agregado
  useEffect(() => {
    if (ultimoAgregado) {
      const timer = setTimeout(() => {
        setUltimoAgregado(null);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [ultimoAgregado]);

  // Limpiar mensaje de éxito
  useEffect(() => {
    if (mensajeExito) {
      const timer = setTimeout(() => {
        setMensajeExito(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [mensajeExito]);

  // Limpiar mensaje de error
  useEffect(() => {
    if (mensajeError) {
      const timer = setTimeout(() => {
        setMensajeError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [mensajeError]);

  // Sincronizar estado de la impresora fiscal y auto-rellenar monto exacto al abrir la ventana de pago
  useEffect(() => {
    if (mostrarPago) {
      setImpresoraFiscalActiva(localStorage.getItem("thermal_impresora_fiscal_activa") !== "false");
      const faltante = Math.max(0, Number((granTotalUSD - totalPagadoUSD).toFixed(2)));
      if (faltante > 0.005) {
        const esBs = ["PUNTO", "PAGO_MOVIL", "EFECTIVO_BS"].includes(metodoActual);
        setInputMonto(esBs ? (faltante * tasa).toFixed(2) : faltante.toFixed(2));
      }
    }
  }, [mostrarPago]);

  // Capturar tecla F1 para confirmar peso rápido
  useEffect(() => {
    if (!mostrarDialogoPeso) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F1") {
        e.preventDefault();
        confirmarAgregarPorPeso();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mostrarDialogoPeso, inputGramos, productoParaPeso]);

  useEffect(() => {
    cargarProductos();
    cargarPerfilNegocio();
    obtenerTasa();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOnline && offlineQueue.length > 0) {
      sincronizarVentasOffline();
    }
  }, [isOnline, offlineQueue]);

  const cargarPerfilNegocio = async () => {
    try {
      const res = await apiFetch("/api/perfil-negocio");
      if (res.ok) {
        const data = await res.json();
        if (data.perfil) setPerfilNegocio(data.perfil);
      }
    } catch (err) {
      console.error(err);
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

  const obtenerTasa = async () => {
    try {
      const res = await apiFetch("/api/dolar");
      const data = await res.json();
      setTasa(data.tasa);
    } catch (err) {
      console.error(err);
    }
  };

  const sincronizarVentasOffline = async () => {
    if (sincronizando || offlineQueue.length === 0) return;
    setSincronizando(true);

    try {
      const colaCopia = [...offlineQueue];
      let procesadosConExito = 0;

      for (let i = 0; i < colaCopia.length; i++) {
        const item = colaCopia[i];
        try {
          const res = await apiFetch("/api/ventas/procesar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item.payload)
          });
          if (res.ok) {
            procesadosConExito++;
          }
        } catch (err) {
          console.error("Fallo al sincronizar registro offline:", err);
          break;
        }
      }

      const restante = colaCopia.slice(procesadosConExito);
      setOfflineQueue(restante);
      localStorage.setItem("offline_sales_queue", JSON.stringify(restante));

      if (procesadosConExito > 0) {
        setMensajeExito(`¡Sincronizadas ${procesadosConExito} venta(s) guardadas en modo offline!`);
        cargarProductos();
      }
    } finally {
      setSincronizando(false);
    }
  };

  const buscarCliente = async () => {
    if (!cedula) return;
    try {
      const res = await apiFetch(`/api/clientes/${cedula}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === "success") {
          const c = data.data;
          setNombre(c.nombre);
          setApellido(c.apellido);
          setTelefono(c.telefono);
          setDireccion(c.direccion);
          setClienteDeuda(c.saldo_pendiente);
          setClienteExiste(true);
        }
      } else {
        setClienteExiste(false);
        setClienteDeuda(0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const setConsumidorFinal = () => {
    setCedula("V-99999999");
    setNombre("CONSUMIDOR");
    setApellido("FINAL");
    setTelefono("");
    setDireccion("");
    setClienteExiste(true);
    setClienteDeuda(0);
  };

  // Helper para obtener precio del producto según tarifa
  const obtenerPrecioPorTarifa = (prod: Producto, tarifa: "detal" | "mayor" | "especial") => {
    if (tarifa === "mayor" && prod.precio_mayor) return prod.precio_mayor;
    if (tarifa === "especial" && prod.precio_especial) return prod.precio_especial;
    return prod.precio_venta;
  };

  // Agregar al carrito con parámetros explícitos
  const agregarAlCarritoConParametros = (
    producto: Producto, 
    cantidad: number, 
    variante?: VarianteProducto, 
    tarifa: "detal" | "mayor" | "especial" = tarifaActiva
  ) => {
    const stockDisponible = variante ? variante.stock : producto.stock;
    if (stockDisponible <= 0) {
      setMensajeError(`No hay existencia de ${producto.nombre} ${variante ? `(Talla: ${variante.talla || ''})` : ''}`);
      return;
    }

    const precioUnitario = obtenerPrecioPorTarifa(producto, tarifa);
    const cartId = `${producto.id}_${variante?.id || 'base'}_${tarifa}`;

    setCarrito(prev => {
      const index = prev.findIndex(item => item.cartId === cartId);
      if (index >= 0) {
        const nuevaCant = Number((prev[index].cantidad + cantidad).toFixed(3));
        if (nuevaCant > stockDisponible) {
          setMensajeError(`Límite de stock alcanzado (${stockDisponible} disponibles)`);
          return prev;
        }
        const copia = [...prev];
        copia[index] = { ...copia[index], cantidad: nuevaCant };
        return copia;
      }
      return [...prev, {
        cartId,
        producto,
        cantidad,
        precioUnitario,
        tarifaAplicada: tarifa,
        variante
      }];
    });

    setUltimoAgregado(producto.nombre);
    setBuscar("");
    setTimeout(() => {
      inputBuscarRef.current?.focus();
    }, 50);
  };

  // Click principal sobre un producto
  const agregarAlCarrito = (producto: Producto) => {
    // 1. Si tiene variantes (Ropa / Calzado), abrir modal selector
    if (producto.tiene_variantes && producto.variantes && producto.variantes.length > 0) {
      setProductoParaVariante(producto);
      setMostrarModalVariantes(true);
      return;
    }

    // 2. Si se vende por peso (Balanza manual)
    if (producto.se_vende_por_peso) {
      setProductoParaPeso(producto);
      setInputGramos("");
      setMostrarDialogoPeso(true);
      return;
    }

    // 3. Venta unitaria normal
    agregarAlCarritoConParametros(producto, 1, undefined, tarifaActiva);
  };

  // Confirmar desde el diálogo de balanza manual
  const confirmarAgregarPorPeso = () => {
    if (!productoParaPeso) return;
    const gramos = Number(inputGramos) || 0;
    if (gramos <= 0) {
      setMensajeError("Debe ingresar una cantidad positiva de gramos.");
      return;
    }

    const kilogramos = Number((gramos / 1000).toFixed(3));
    if (kilogramos > productoParaPeso.stock) {
      setMensajeError(`Stock insuficiente. Solo hay ${productoParaPeso.stock.toFixed(3)} Kg disponibles.`);
      return;
    }

    agregarAlCarritoConParametros(productoParaPeso, kilogramos, undefined, tarifaActiva);
    setMostrarDialogoPeso(false);
    setProductoParaPeso(null);
  };

  // Decodificador de Código de Barras de Balanza Embebido (EAN-13: 20 o 21)
  const procesarCodigoBarraOEnter = (texto: string) => {
    const code = texto.trim();
    if (!code) return;

    // 1. Decodificador Balanza (EAN-13 embebido con prefijos 20 o 21)
    if ((code.startsWith("20") || code.startsWith("21")) && (code.length === 12 || code.length === 13)) {
      const plu = code.substring(2, 6); // ej "0145"
      const pesoGramosStr = code.substring(6, 11); // ej "00350" -> 350g
      const pesoKg = Number((parseInt(pesoGramosStr, 10) / 1000).toFixed(3));

      // Buscar producto con codigo_balanza igual a PLU o codigo igual a PLU
      const prodBalanza = productos.find(p => 
        (p.codigo_balanza && (p.codigo_balanza === plu || p.codigo_balanza === parseInt(plu, 10).toString())) ||
        p.codigo === plu ||
        p.codigo === code
      );

      if (prodBalanza && pesoKg > 0) {
        agregarAlCarritoConParametros(prodBalanza, pesoKg, undefined, tarifaActiva);
        setMensajeExito(`⚖️ Balanza detectada: ${prodBalanza.nombre} (${pesoKg} Kg)`);
        setBuscar("");
        return;
      }
    }

    // 2. Coincidencia exacta de código de barra
    const exactoPorCodigo = productos.find(p => p.codigo.trim().toLowerCase() === code.toLowerCase());
    if (exactoPorCodigo) {
      agregarAlCarrito(exactoPorCodigo);
      setBuscar("");
      return;
    }

    // 3. Si hay exactamente 1 producto filtrado en pantalla
    if (productosFiltrados.length === 1) {
      agregarAlCarrito(productosFiltrados[0]);
      setBuscar("");
      return;
    }
  };

  const cambiarCantidad = (cartId: string, delta: number) => {
    setCarrito(prev => {
      const index = prev.findIndex(item => item.cartId === cartId);
      if (index >= 0) {
        const item = prev[index];
        const stockMax = item.variante ? item.variante.stock : item.producto.stock;
        const paso = item.producto.se_vende_por_peso ? 0.05 : 1;
        const nuevaCant = Number((item.cantidad + (delta * paso)).toFixed(3));

        if (nuevaCant <= 0) {
          return prev.filter(i => i.cartId !== cartId);
        }
        if (nuevaCant > stockMax) {
          setMensajeError(`Límite de stock alcanzado (${stockMax} disponibles)`);
          return prev;
        }
        const copia = [...prev];
        copia[index] = { ...item, cantidad: nuevaCant };
        return copia;
      }
      return prev;
    });
  };

  const eliminarDelCarrito = (cartId: string) => {
    setCarrito(prev => prev.filter(item => item.cartId !== cartId));
  };

  const limpiarCarrito = () => {
    setCarrito([]);
    setPagosRealizados([]);
    setDescuentoUSD(0);
  };

  // --- CÁLCULOS MATEMÁTICOS ---
  let subtotalExentoUSD = 0;
  let subtotalGravadoUSD = 0;

  carrito.forEach(item => {
    const totalItem = item.precioUnitario * item.cantidad;
    if (item.producto.categoria === "MEDICAMENTO" || item.producto.categoria === "EXENTO") {
      subtotalExentoUSD += totalItem;
    } else {
      subtotalGravadoUSD += totalItem;
    }
  });

  const ivaUSD = subtotalGravadoUSD * 0.16;
  const totalProductosUSD = subtotalExentoUSD + subtotalGravadoUSD + ivaUSD;
  const totalConDescuentoUSD = Math.max(0, totalProductosUSD - descuentoUSD);
  const igtfUSD = 0; // IGTF desactivado por requerimiento

  const granTotalUSD = totalConDescuentoUSD + igtfUSD;
  const totalBs = granTotalUSD * tasa;

  const totalPagadoUSD = pagosRealizados.reduce((sum, p) => sum + p.montoUSD, 0);
  const totalFaltanteUSD = Math.max(0, Number((granTotalUSD - totalPagadoUSD).toFixed(2)));

  // Helper para calcular el monto exacto sugerido según el método y el saldo pendiente
  const calcularMontoSugerido = (metodo: PagoMetodo["metodo"], faltanteUSD: number) => {
    if (faltanteUSD <= 0.005) return "";
    const esBs = ["PUNTO", "PAGO_MOVIL", "EFECTIVO_BS"].includes(metodo);
    return esBs ? (faltanteUSD * tasa).toFixed(2) : faltanteUSD.toFixed(2);
  };

  // Cambiar método de pago y auto-rellenar automáticamente el monto exacto faltante
  const seleccionarMetodo = (nuevoMetodo: PagoMetodo["metodo"]) => {
    setMetodoActual(nuevoMetodo);
    const sugerido = calcularMontoSugerido(nuevoMetodo, totalFaltanteUSD);
    setInputMonto(sugerido);
  };

  const agregarPago = () => {
    const montoNum = parseFloat(inputMonto);
    if (isNaN(montoNum) || montoNum <= 0) {
      setMensajeError("Ingrese un monto numérico positivo.");
      return;
    }

    const esBs = ["PUNTO", "PAGO_MOVIL", "EFECTIVO_BS"].includes(metodoActual);
    let mUSD = 0;
    let mBS = 0;

    if (esBs) {
      mBS = montoNum;
      mUSD = Number((montoNum / tasa).toFixed(2));
    } else {
      mUSD = montoNum;
      mBS = Number((montoNum * tasa).toFixed(2));
    }

    const nuevoPago: PagoMetodo = {
      metodo: metodoActual,
      monto_original: montoNum,
      moneda: esBs ? "BS" : "USD",
      montoUSD: mUSD,
      montoBS: mBS,
      igtfUSD: 0,
      referencia: inputRef || undefined
    };

    const nuevosPagos = [...pagosRealizados, nuevoPago];
    setPagosRealizados(nuevosPagos);
    setInputRef("");

    // Calcular el saldo restante para pagos mixtos y rellenar automáticamente
    const nuevoTotalPagadoUSD = nuevosPagos.reduce((sum, p) => sum + p.montoUSD, 0);
    const nuevoFaltanteUSD = Math.max(0, Number((granTotalUSD - nuevoTotalPagadoUSD).toFixed(2)));

    if (nuevoFaltanteUSD > 0.009) {
      setInputMonto(calcularMontoSugerido(metodoActual, nuevoFaltanteUSD));
    } else {
      setInputMonto("");
    }
  };

  const eliminarPago = (index: number) => {
    const nuevosPagos = pagosRealizados.filter((_, i) => i !== index);
    setPagosRealizados(nuevosPagos);
    const nuevoTotalPagadoUSD = nuevosPagos.reduce((sum, p) => sum + p.montoUSD, 0);
    const nuevoFaltanteUSD = Math.max(0, Number((granTotalUSD - nuevoTotalPagadoUSD).toFixed(2)));
    if (nuevoFaltanteUSD > 0.009) {
      setInputMonto(calcularMontoSugerido(metodoActual, nuevoFaltanteUSD));
    }
  };

  const procesarVentaFinal = async (debeImprimir: boolean) => {
    let pagosAProcesar = [...pagosRealizados];
    const montoNumInput = parseFloat(inputMonto);

    if (!isNaN(montoNumInput) && montoNumInput > 0) {
      const esBs = ["PUNTO", "PAGO_MOVIL", "EFECTIVO_BS"].includes(metodoActual);
      let mUSD = 0;
      let mBS = 0;

      if (esBs) {
        mBS = montoNumInput;
        mUSD = Number((montoNumInput / tasa).toFixed(2));
      } else {
        mUSD = montoNumInput;
        mBS = Number((montoNumInput * tasa).toFixed(2));
      }

      pagosAProcesar.push({
        metodo: metodoActual,
        monto_original: montoNumInput,
        moneda: esBs ? "BS" : "USD",
        montoUSD: mUSD,
        montoBS: mBS,
        igtfUSD: 0,
        referencia: inputRef || undefined
      });
    }

    const totalCobradoUSD = pagosAProcesar.reduce((sum, p) => sum + p.montoUSD, 0);
    const faltanteUSD = Math.max(0, Number((granTotalUSD - totalCobradoUSD).toFixed(2)));

    if (faltanteUSD > 0.05) {
      setMensajeError(`Falta cubrir $${faltanteUSD.toFixed(2)} (Bs. ${(faltanteUSD * tasa).toFixed(2)}) del total.`);
      return;
    }

    if (!cedula) {
      setMensajeError("Debe identificar al cliente fiscalmente (Cédula/RIF)");
      return;
    }

    setPagosRealizados(pagosAProcesar);
    setInputMonto("");
    setInputRef("");

    const payload = {
      cedula,
      nombre,
      apellido,
      telefono,
      direccion,
      tasa_bcv: tasa,
      items: carrito.map(item => ({
        id: item.producto.id,
        cantidad: item.cantidad,
        variante_id: item.variante?.id,
        variante_detalle: item.variante ? `${item.variante.talla ? `Talla: ${item.variante.talla}` : ''} ${item.variante.color ? `Color: ${item.variante.color}` : ''}`.trim() : undefined,
        tarifa_aplicada: item.tarifaAplicada
      })),
      pagos: pagosAProcesar,
      monto_igtf: igtfUSD,
      sin_factura: sinFactura,
      descuento_usd: descuentoUSD
    };

    try {
      const res = await apiFetch("/api/ventas/procesar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        const ventaNueva: Venta = {
          id: data.venta_id || Math.random().toString(),
          factura_numero: data.factura_numero,
          cliente_id: cedula || "V-99999999-9",
          cliente_nombre: `${nombre} ${apellido}`.trim() || "Consumidor Final",
          tasa: tasa,
          monto_exento: subtotalExentoUSD,
          base_imponible: subtotalGravadoUSD,
          monto_iva: ivaUSD,
          monto_igtf: igtfUSD,
          total_usd: granTotalUSD,
          total_bs: totalBs,
          fecha: new Date().toISOString(),
          pagos: [...pagosAProcesar],
          items: carrito.map(item => ({
            producto_id: item.producto.id,
            nombre: `${item.producto.nombre}${item.variante ? ` (${item.variante.talla ? `Talla: ${item.variante.talla}` : ''} ${item.variante.color ? `Col: ${item.variante.color}` : ''})` : ''}`,
            cantidad: item.cantidad,
            precio_unitario: item.precioUnitario,
            categoria: item.producto.categoria,
            unidad_medida: item.producto.unidad_medida,
            variante_id: item.variante?.id,
            variante_detalle: item.variante ? `${item.variante.talla || ''} ${item.variante.color || ''}`.trim() : undefined,
            tarifa_aplicada: item.tarifaAplicada,
            atributos: item.producto.atributos
          })),
          es_cerrado_z: false,
          sin_factura: sinFactura,
          descuento_usd: descuentoUSD
        };

        if (debeImprimir) {
          setVentaParaImprimir(ventaNueva);
          setMostrarTicketModal(true);
        } else {
          setMensajeExito(`¡Venta cobrada con éxito! ${sinFactura ? "Nota de Entrega" : "Factura"}: ${data.factura_numero}`);
        }

        limpiarCarrito();
        setMostrarPago(false);
        setSinFactura(false);
        setDescuentoUSD(0);
        setCedula("");
        setNombre("");
        setApellido("");
        setTelefono("");
        setDireccion("");
        cargarProductos();

        setTimeout(() => {
          inputBuscarRef.current?.focus();
        }, 100);
      } else {
        setMensajeError(data.error || "Ocurrió un error al procesar la venta");
      }
    } catch (err) {
      console.error("Fallo de red detectado, iniciando proceso fuera de línea:", err);
      
      const tempFactura = `OFF-${Math.floor(100000 + Math.random() * 900000)}`;
      const ventaNueva: Venta = {
        id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        factura_numero: tempFactura,
        cliente_id: cedula || "V-99999999-9",
        cliente_nombre: `${nombre} ${apellido}`.trim() || "Consumidor Final",
        tasa: tasa,
        monto_exento: subtotalExentoUSD,
        base_imponible: subtotalGravadoUSD,
        monto_iva: ivaUSD,
        monto_igtf: igtfUSD,
        total_usd: granTotalUSD,
        total_bs: totalBs,
        fecha: new Date().toISOString(),
        pagos: [...pagosAProcesar],
        items: carrito.map(item => ({
          producto_id: item.producto.id,
          nombre: item.producto.nombre,
          cantidad: item.cantidad,
          precio_unitario: item.precioUnitario,
          categoria: item.producto.categoria,
          unidad_medida: item.producto.unidad_medida,
          variante_id: item.variante?.id,
          variante_detalle: item.variante ? `${item.variante.talla || ''} ${item.variante.color || ''}`.trim() : undefined,
          tarifa_aplicada: item.tarifaAplicada,
          atributos: item.producto.atributos
        })),
        es_cerrado_z: false,
        sin_factura: sinFactura,
        descuento_usd: descuentoUSD
      };

      const updatedQueue = [...offlineQueue, { payload, ventaNueva }];
      setOfflineQueue(updatedQueue);
      localStorage.setItem("offline_sales_queue", JSON.stringify(updatedQueue));

      setMensajeExito(`⚠️ Conexión perdida: Venta encolada localmente. Nro Control: ${tempFactura}`);

      if (debeImprimir) {
        setVentaParaImprimir(ventaNueva);
        setMostrarTicketModal(true);
      }

      limpiarCarrito();
      setMostrarPago(false);
      setSinFactura(false);
      setDescuentoUSD(0);
      setCedula("");
      setNombre("");
      setApellido("");
      setTelefono("");
      setDireccion("");

      setTimeout(() => {
        inputBuscarRef.current?.focus();
      }, 100);
    }
  };

  const rubrosDisponibles = Array.from(new Set(productos.map(p => p.rubro).filter(Boolean))) as string[];
  const categoriasDisponibles = Array.from(new Set(productos.map(p => p.categoria_comercial).filter(Boolean))) as string[];

  const productosFiltrados = productos.filter(p => {
    // 1. Filtro Solo con Stock
    if (filtroSoloConStock && p.stock <= 0) return false;

    // 2. Filtro Rubro
    if (filtroRubroPOS && p.rubro !== filtroRubroPOS) return false;

    // 3. Filtro Categoría Comercial
    if (filtroCategoriaPOS && p.categoria_comercial !== filtroCategoriaPOS) return false;

    // 4. Búsqueda por texto / código / atributos
    const term = buscar.trim().toLowerCase();
    if (!term) return true;

    const matchNombre = p.nombre.toLowerCase().includes(term);
    const matchCodigo = p.codigo.toLowerCase().includes(term);
    const matchMarca = p.marca ? p.marca.toLowerCase().includes(term) : false;
    const matchCatComercial = p.categoria_comercial ? p.categoria_comercial.toLowerCase().includes(term) : false;
    const matchAtributos = p.atributos
      ? Object.entries(p.atributos).some(([clave, valor]) =>
          clave.toLowerCase().includes(term) || valor.toLowerCase().includes(term)
        )
      : false;

    return matchNombre || matchCodigo || matchMarca || matchCatComercial || matchAtributos;
  });

  // Atajos de Teclado POS
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const keyUpper = e.key.toUpperCase();

      const isF1 = keyUpper === "F1" || e.code === "F1" || (e.altKey && (e.key === "1" || e.code === "Digit1"));
      const isF2 = keyUpper === "F2" || e.code === "F2" || (e.altKey && (e.key === "2" || e.code === "Digit2"));
      const isF4 = keyUpper === "F4" || e.code === "F4" || (e.altKey && (e.key === "4" || e.code === "Digit4"));
      const isF6 = keyUpper === "F6" || e.code === "F6" || (e.altKey && (e.key === "6" || e.code === "Digit6"));
      const isF8 = keyUpper === "F8" || e.code === "F8" || (e.altKey && (e.key === "8" || e.code === "Digit8"));
      const isEsc = keyUpper === "ESCAPE" || e.code === "Escape";

      if (isF1) {
        e.preventDefault();
        if (carrito.length === 0) {
          setMensajeError("El carrito está vacío. Agregue artículos antes de facturar.");
          return;
        }
        if (!mostrarPago) {
          setMostrarPago(true);
        } else if (totalFaltanteUSD <= 0.01) {
          procesarVentaFinal(impresoraFiscalActiva);
        } else {
          setMensajeError(`Debe registrar pagos para cubrir la factura. Faltante: $${totalFaltanteUSD.toFixed(2)}`);
        }
      }

      if (isF2) {
        e.preventDefault();
        if (carrito.length > 0) limpiarCarrito();
      }

      if (isF4) {
        e.preventDefault();
        setConsumidorFinal();
      }

      if (isF6) {
        e.preventDefault();
        setSinFactura(prev => !prev);
      }

      if (isF8) {
        e.preventDefault();
        setMostrarModalCorteX(true);
      }

      if (isEsc) {
        if (mostrarPago) {
          e.preventDefault();
          setMostrarPago(false);
        } else if (mostrarDialogoPeso) {
          e.preventDefault();
          setMostrarDialogoPeso(false);
          setProductoParaPeso(null);
          setTimeout(() => inputBuscarRef.current?.focus(), 50);
        } else if (mostrarModalVariantes) {
          e.preventDefault();
          setMostrarModalVariantes(false);
          setProductoParaVariante(null);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [carrito, mostrarPago, mostrarDialogoPeso, mostrarModalVariantes, totalFaltanteUSD, cedula, nombre, apellido, telefono, direccion, sinFactura, pagosRealizados, impresoraFiscalActiva]);

  return (
    <div className="flex flex-col h-full">
      {/* Barra de Atajos de Teclado Globales */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-900 text-white p-3 px-6 rounded-[1.8rem] text-[10px] font-bold mb-4 shadow-lg relative overflow-hidden shrink-0">
        <div className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-indigo-500/25 to-transparent w-48 pointer-events-none" />
        <span className="text-[9px] uppercase tracking-widest text-indigo-400 font-black flex items-center gap-1.5 mr-2">
          <span className="w-2 h-2 bg-indigo-500 rounded-full animate-ping" />
          POS {perfilNegocio?.nombreComercio || "ElenaPro"}:
        </span>
        <span className="flex items-center gap-1 bg-slate-800/80 p-1 px-2.5 rounded-xl border border-slate-700/60 shadow-inner">
          <kbd className="font-mono bg-indigo-600 px-1 py-0.5 rounded text-white font-black text-[9px]">F1</kbd> 
          <span className="text-slate-300">Cobrar</span>
        </span>
        <span className="flex items-center gap-1 bg-slate-800/80 p-1 px-2.5 rounded-xl border border-slate-700/60 shadow-inner">
          <kbd className="font-mono bg-indigo-600 px-1 py-0.5 rounded text-white font-black text-[9px]">F2</kbd> 
          <span className="text-slate-300">Vaciar</span>
        </span>
        <span className="flex items-center gap-1 bg-slate-800/80 p-1 px-2.5 rounded-xl border border-slate-700/60 shadow-inner">
          <kbd className="font-mono bg-indigo-600 px-1 py-0.5 rounded text-white font-black text-[9px]">F4</kbd> 
          <span className="text-slate-300">C. Final</span>
        </span>
        <span className="flex items-center gap-1 bg-slate-800/80 p-1 px-2.5 rounded-xl border border-slate-700/60 shadow-inner">
          <kbd className="font-mono bg-indigo-600 px-1 py-0.5 rounded text-white font-black text-[9px]">F6</kbd> 
          <span className="text-slate-300">Nota / Fact</span>
        </span>
        <span className="flex items-center gap-1 bg-slate-800/80 p-1 px-2.5 rounded-xl border border-slate-700/60 shadow-inner">
          <kbd className="font-mono bg-indigo-600 px-1 py-0.5 rounded text-white font-black text-[9px]">ESC</kbd> 
          <span className="text-slate-300">Cerrar</span>
        </span>

        {/* Botones de Acceso Rápido a Devoluciones, Cotizaciones, Kardex y Corte X */}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMostrarModalCorteX(true)}
            className="flex items-center gap-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer shadow-xs"
            title="Auditar o imprimir lectura parcial de turno (Corte X - F8)"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Corte X (F8)</span>
          </button>
          <button
            type="button"
            onClick={() => setMostrarModalDevoluciones(true)}
            className="flex items-center gap-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer"
            title="Devoluciones y Notas de Crédito con reintegro a stock"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Devoluciones (NC)</span>
          </button>
          <button
            type="button"
            onClick={() => setMostrarModalCotizaciones(true)}
            className="flex items-center gap-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer"
            title="Emitir o Cargar Presupuestos con 1 clic al POS"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Cotizaciones</span>
          </button>
          <button
            type="button"
            onClick={() => setMostrarModalKardex(true)}
            className="flex items-center gap-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer"
            title="Auditoría de Movimientos y Trazabilidad Kardex"
          >
            <History className="w-3.5 h-3.5" />
            <span>Kardex</span>
          </button>
        </div>
      </div>

      {/* Banner de Estado de Red / Cola Offline */}
      {(offlineQueue.length > 0 || !isOnline) && (
        <div className={`flex items-center justify-between p-3 px-6 rounded-2xl mb-4 text-xs font-bold shadow-md border animate-pulse shrink-0 ${
          !isOnline 
            ? "bg-rose-50 border-rose-100 text-rose-800" 
            : "bg-amber-50 border-amber-100 text-amber-800"
        }`}>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${!isOnline ? "bg-rose-600 animate-ping" : "bg-amber-500 animate-ping"}`} />
            <span>
              {!isOnline 
                ? "SISTEMA OFFLINE RESILIENTE — Se sincronizará automáticamente al reconectar" 
                : `CONEXIÓN ESTABLE — ${offlineQueue.length} venta(s) pendientes de subir.`}
            </span>
          </div>
          {offlineQueue.length > 0 && (
            <button
              onClick={sincronizarVentasOffline}
              disabled={sincronizando || !isOnline}
              className="bg-indigo-600 text-white px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition hover:bg-indigo-500"
            >
              {sincronizando ? "Sincronizando..." : "Subir Ahora"}
            </button>
          )}
        </div>
      )}

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto lg:h-[calc(100vh-220px)] items-stretch min-h-0">
        
        {/* Sección Izquierda: Catálogo, Búsqueda y Selector de Tarifas */}
        <div className="lg:col-span-5 bg-white border border-slate-100 rounded-[2.5rem] p-5 shadow-sm flex flex-col h-auto min-h-[500px] lg:h-full overflow-hidden">
          
          {/* Selector de Tarifa de Venta */}
          <div className="flex items-center justify-between bg-slate-50 p-1.5 rounded-2xl border border-slate-100 mb-3">
            <span className="text-[9px] font-black uppercase text-slate-400 ml-2">Tarifa Activa:</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setTarifaActiva("detal")}
                className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition ${
                  tarifaActiva === "detal"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-200/60"
                }`}
              >
                PVP Detal
              </button>
              <button
                type="button"
                onClick={() => setTarifaActiva("mayor")}
                className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition ${
                  tarifaActiva === "mayor"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-200/60"
                }`}
              >
                Mayorista
              </button>
              <button
                type="button"
                onClick={() => setTarifaActiva("especial")}
                className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition ${
                  tarifaActiva === "especial"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-200/60"
                }`}
              >
                Técnico / Esp.
              </button>
            </div>
          </div>

          {/* Buscador y Scanner */}
          <div className="relative mb-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              ref={inputBuscarRef}
              type="text"
              placeholder="Buscar por nombre, código de barra o ticket de balanza..."
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-2.5 pl-11 pr-4 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all font-semibold text-slate-700 text-xs"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  procesarCodigoBarraOEnter(buscar);
                }
              }}
            />
          </div>

          {/* Filtros Rápidos de Mostrador (Rubro / Categoría / Solo con Stock) */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 mb-3 px-1 text-[10px]">
            <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
              {rubrosDisponibles.length > 1 && (
                <select
                  value={filtroRubroPOS}
                  onChange={(e) => setFiltroRubroPOS(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-[10px] font-bold text-slate-600 outline-none"
                >
                  <option value="">Rubros (Todos)</option>
                  {rubrosDisponibles.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              )}

              {categoriasDisponibles.length > 0 && (
                <select
                  value={filtroCategoriaPOS}
                  onChange={(e) => setFiltroCategoriaPOS(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-[10px] font-bold text-slate-600 outline-none max-w-[130px] truncate"
                >
                  <option value="">Categorías (Todas)</option>
                  {categoriasDisponibles.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              )}

              <button
                type="button"
                onClick={() => setFiltroSoloConStock(!filtroSoloConStock)}
                className={`px-2 py-1 rounded-xl font-black uppercase tracking-wider transition flex items-center gap-1 cursor-pointer ${
                  filtroSoloConStock
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                <CheckCircle2 className="w-3 h-3" /> Con Stock
              </button>

              {(buscar || filtroRubroPOS || filtroCategoriaPOS || filtroSoloConStock) && (
                <button
                  type="button"
                  onClick={() => {
                    setBuscar("");
                    setFiltroRubroPOS("");
                    setFiltroCategoriaPOS("");
                    setFiltroSoloConStock(false);
                  }}
                  className="text-rose-600 font-bold hover:underline px-1"
                >
                  Limpiar
                </button>
              )}
            </div>

            <span className="text-[9px] font-black text-slate-400 shrink-0">
              {productosFiltrados.length} items
            </span>
          </div>

          {/* Listado de Productos */}
          <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-3 scrollbar-thin">
            {productosFiltrados.length === 0 ? (
              <p className="col-span-full text-xs text-slate-400 text-center py-12 font-medium">No se encontraron artículos en el catálogo.</p>
            ) : (
              productosFiltrados.map((p) => {
                const stockBajo = p.stock <= (p.stock_minimo || 5);
                const cartItems = carrito.filter(item => item.producto.id === p.id);
                const totalEnCarrito = cartItems.reduce((sum, item) => sum + item.cantidad, 0);
                const precioMostrado = obtenerPrecioPorTarifa(p, tarifaActiva);

                return (
                  <div
                    key={p.id}
                    onClick={() => agregarAlCarrito(p)}
                    className={`p-3 border rounded-2xl transition duration-200 cursor-pointer flex flex-col justify-between min-h-[8.5rem] group ${
                      totalEnCarrito > 0 
                        ? "border-indigo-500 bg-indigo-50/10 shadow-sm" 
                        : "border-slate-100 bg-white hover:border-indigo-500 hover:shadow-md"
                    }`}
                  >
                    <div className="min-h-0 flex-1 flex flex-col justify-between">
                      <div className="flex justify-between items-start gap-1">
                        <h3 className="font-extrabold text-slate-800 text-[11px] leading-tight group-hover:text-indigo-600 transition line-clamp-2">
                          {p.nombre}
                        </h3>
                        <div className="flex flex-col items-end gap-0.5 shrink-0">
                          <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full ${
                            p.categoria === "GRAVADO_16" ? "bg-purple-50 text-purple-700" : "bg-emerald-50 text-emerald-700"
                          }`}>
                            {p.categoria === "GRAVADO_16" ? "IVA 16%" : "EXENTO"}
                          </span>
                          {totalEnCarrito > 0 && (
                            <span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full bg-indigo-600 text-white flex items-center gap-0.5">
                              <ShoppingCart className="w-1.5 h-1.5" />
                              <span>{p.se_vende_por_peso ? `${totalEnCarrito.toFixed(3)} Kg` : `${totalEnCarrito} u.`}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 mt-1">
                        <p className="text-[9px] text-slate-400 font-mono">{p.codigo}</p>
                        {p.marca && (
                          <span className="text-[8px] font-bold text-slate-500 bg-slate-100 px-1 rounded">
                            {p.marca}
                          </span>
                        )}
                        {p.tiene_variantes && (
                          <span className="text-[8px] font-black text-purple-700 bg-purple-50 px-1 rounded">
                            Talla/Color
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-end border-t border-slate-50 pt-2 mt-2">
                      <div>
                        <div className="flex items-baseline gap-1">
                          <p className="text-xs font-black text-slate-900">${precioMostrado.toFixed(2)}</p>
                          {tarifaActiva !== "detal" && (
                            <span className="text-[8px] font-bold text-amber-600 uppercase">({tarifaActiva})</span>
                          )}
                        </div>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">Bs. {(precioMostrado * tasa).toFixed(2)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-0.5">
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-lg ${
                          stockBajo ? "bg-rose-50 text-rose-600 animate-pulse" : "bg-emerald-50 text-emerald-600"
                        }`}>
                          STK: {p.se_vende_por_peso ? `${p.stock.toFixed(2)} Kg` : `${p.stock} u.`}
                        </span>
                        {typeof p.stock_almacen === "number" && p.stock_almacen > 0 && (
                          <span className="text-[7.5px] font-bold text-amber-700 bg-amber-50 px-1 py-0.2 rounded" title="Existencia disponible en Almacén Central / Depósito">
                            📦 Alm: {p.stock_almacen}
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

        {/* Sección Derecha: Carrito y Detalle de Factura */}
        <div className="lg:col-span-7 bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm flex flex-col h-auto min-h-[500px] lg:h-full overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-50 pb-3 mb-3 shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">Factura Corriente</h2>
            </div>
            {carrito.length > 0 && (
              <button 
                onClick={limpiarCarrito}
                className="text-[10px] font-black text-rose-500 hover:bg-rose-50 px-3 py-1.5 rounded-xl uppercase tracking-wider transition flex items-center gap-1 cursor-pointer"
              >
                <span>Vaciar Carrito</span>
                <kbd className="font-mono bg-rose-50 text-rose-600 px-1 rounded text-[8px]">F2</kbd>
              </button>
            )}
          </div>

          {/* Tabla Dinámica de Items del Carrito */}
          <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin">
            {carrito.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12 text-slate-400 space-y-2">
                <ShoppingCart className="w-10 h-10 stroke-1 text-slate-300 animate-pulse" />
                <p className="text-xs font-semibold">El carrito está vacío.</p>
                <p className="text-[10px]">Seleccione un artículo del catálogo o escanee el código de barra.</p>
              </div>
            ) : (
              <table className="min-w-full text-left border-collapse table-auto">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <th className="py-2 pb-2 font-bold px-1">Artículo</th>
                    <th className="py-2 pb-2 text-center w-28 font-bold">Cantidad</th>
                    <th className="py-2 pb-2 text-right font-bold">P. Unit</th>
                    <th className="py-2 pb-2 text-center font-bold">Imp.</th>
                    <th className="py-2 pb-2 text-right font-bold">Total</th>
                    <th className="py-2 pb-2 text-center w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                  {carrito.map((item) => {
                    const esGravado = item.producto.categoria === "GRAVADO_16";
                    const precioUnitario = item.precioUnitario;
                    const impuestoUnitario = esGravado ? precioUnitario * 0.16 : 0;
                    const subtotalItem = precioUnitario * item.cantidad;
                    const totalConImpuestos = subtotalItem + (impuestoUnitario * item.cantidad);

                    return (
                      <tr key={item.cartId} className="text-xs hover:bg-slate-50/50 transition duration-150">
                        <td className="py-2.5 px-1">
                          <div>
                            <p className="font-extrabold text-slate-900 leading-snug">{item.producto.nombre}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[9px] font-mono text-slate-400">CÓD: {item.producto.codigo}</span>
                              {item.variante && (
                                <span className="text-[8px] font-black bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded">
                                  {item.variante.talla ? `Talla ${item.variante.talla}` : ""} {item.variante.color ? `• ${item.variante.color}` : ""}
                                </span>
                              )}
                              {item.tarifaAplicada !== "detal" && (
                                <span className="text-[8px] font-bold bg-amber-100 text-amber-800 px-1 rounded uppercase">
                                  {item.tarifaAplicada}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 text-center">
                          <div className="flex items-center justify-center gap-1 bg-slate-50 border border-slate-200/60 rounded-xl p-0.5 w-max mx-auto">
                            <button 
                              onClick={() => cambiarCantidad(item.cartId, -1)} 
                              className="p-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-600 transition active:scale-95"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <span className="font-black text-slate-800 text-[10px] min-w-[56px] text-center">
                              {item.producto.se_vende_por_peso ? `${item.cantidad.toFixed(3)} Kg` : `${item.cantidad} u.`}
                            </span>
                            <button 
                              onClick={() => cambiarCantidad(item.cartId, 1)} 
                              className="p-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-600 transition active:scale-95"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </td>
                        <td className="py-2.5 text-right">
                          <p className="font-extrabold text-slate-900">${precioUnitario.toFixed(2)}</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase">Bs. {(precioUnitario * tasa).toFixed(2)}</p>
                        </td>
                        <td className="py-2.5 text-center">
                          <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                            esGravado ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          }`}>
                            {esGravado ? "16%" : "Exento"}
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          <p className="font-black text-slate-950">${totalConImpuestos.toFixed(2)}</p>
                          <p className="text-[8px] font-black text-indigo-600">Bs. {(totalConImpuestos * tasa).toFixed(2)}</p>
                        </td>
                        <td className="py-2.5 text-center">
                          <button 
                            onClick={() => eliminarDelCarrito(item.cartId)} 
                            className="text-slate-300 hover:text-rose-600 transition w-7 h-7 hover:bg-rose-50 rounded-lg flex items-center justify-center mx-auto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Totales y Liquidación */}
          <div className="border-t border-slate-100 pt-3 mt-3 space-y-2 font-medium shrink-0">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Base Imponible (IVA 16%):</span>
              <span className="font-bold text-slate-700">${subtotalGravadoUSD.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Monto Exento:</span>
              <span className="font-bold text-slate-700">${subtotalExentoUSD.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Impuesto IVA (16%):</span>
              <span className="font-black text-amber-600">${ivaUSD.toFixed(2)}</span>
            </div>

            <div className="bg-slate-950 text-white p-4 rounded-[2rem] shadow-md relative overflow-hidden">
              <div className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-indigo-600/15 to-transparent w-32 pointer-events-none" />
              <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 leading-none">Total a Cobrar</p>
              <div className="flex justify-between items-end mt-1.5">
                <h3 className="text-3xl font-black leading-none">${totalProductosUSD.toFixed(2)}</h3>
                <div className="text-right leading-none">
                  <span className="text-lg font-black block text-indigo-300">Bs. {(totalProductosUSD * tasa).toFixed(2)}</span>
                  <span className="text-[7px] text-slate-400 uppercase font-bold">Tasa: Bs. {tasa.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setMostrarPago(true)}
              disabled={carrito.length === 0}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-black py-3.5 rounded-2xl transition shadow-md uppercase tracking-widest text-xs flex items-center justify-center gap-2 mt-1 cursor-pointer"
            >
              <CreditCard className="w-4 h-4" /> Procesar Pago Mixto <kbd className="font-mono bg-indigo-700 text-indigo-200 px-1.5 py-0.5 rounded text-[10px] ml-1">F1</kbd>
            </button>
          </div>
        </div>

      </div>

      {/* Modal de Selección de Variantes (Talla / Color) */}
      {mostrarModalVariantes && productoParaVariante && (
        <ModalSelectorVariantes
          isOpen={mostrarModalVariantes}
          producto={productoParaVariante}
          tarifaActiva={tarifaActiva}
          tasa={tasa}
          onClose={() => {
            setMostrarModalVariantes(false);
            setProductoParaVariante(null);
          }}
          onSelectVariante={(prod, variante, cant) => {
            agregarAlCarritoConParametros(prod, cant, variante, tarifaActiva);
          }}
        />
      )}

      {/* Modal de Balanza Manual (Peso en Gramos) */}
      <AnimatePresence>
        {mostrarDialogoPeso && productoParaPeso && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] max-w-sm w-full p-6 shadow-2xl border border-slate-100"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <Scale className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-blue-600">Venta por Peso</span>
                  <h3 className="text-sm font-black text-slate-800">{productoParaPeso.nombre}</h3>
                  <p className="text-[10px] text-slate-400 font-bold">${productoParaPeso.precio_venta.toFixed(2)} / Kg</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500">Cantidad en Gramos (g)</label>
                  <input
                    type="number"
                    autoFocus
                    placeholder="Ej: 350 para 0.350 Kg"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-base font-black text-center mt-1 outline-none focus:bg-white"
                    value={inputGramos}
                    onChange={(e) => setInputGramos(e.target.value === "" ? "" : Math.max(0, parseInt(e.target.value) || 0))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        confirmarAgregarPorPeso();
                      }
                    }}
                  />
                  {typeof inputGramos === "number" && inputGramos > 0 && (
                    <p className="text-[10px] font-bold text-center text-blue-600 mt-1">
                      Equivale a {(inputGramos / 1000).toFixed(3)} Kg • Total: ${( (inputGramos / 1000) * productoParaPeso.precio_venta ).toFixed(2)}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      setMostrarDialogoPeso(false);
                      setProductoParaPeso(null);
                    }}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-2xl text-xs uppercase"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmarAgregarPorPeso}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-2xl text-xs uppercase shadow-sm"
                  >
                    Añadir (F1)
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Pago Mixto */}
      <AnimatePresence>
        {mostrarPago && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 md:p-6">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-5xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[92vh] max-h-[660px] border border-slate-100"
            >
              {/* Bloque Fiscal - Datos del Cliente */}
              <div className="w-full md:w-72 shrink-0 border-b md:border-b-0 md:border-r border-slate-100 bg-slate-50/60 flex flex-col h-full min-h-0 max-md:max-h-[160px]">
                <div className="p-4 pb-2 border-b border-slate-100 shrink-0 bg-slate-50">
                  <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider">Identificación Fiscal</h3>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                  <button 
                    onClick={setConsumidorFinal}
                    className="w-full py-2 border-2 border-dashed border-slate-200 text-slate-500 rounded-2xl font-bold text-[10px] hover:border-indigo-400 hover:text-indigo-600 transition flex items-center justify-center gap-1.5"
                  >
                    <span>Consumidor Final (V-99999999)</span>
                    <kbd className="font-mono bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded text-[8px]">F4</kbd>
                  </button>

                  <div className="p-3 bg-indigo-50/50 border border-indigo-100/80 rounded-2xl space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-950">Cobrar sin Factura</span>
                        <span className="text-[8px] text-indigo-500 font-bold uppercase leading-none">Nota de Entrega</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={sinFactura} 
                          onChange={(e) => setSinFactura(e.target.checked)} 
                          className="sr-only peer" 
                        />
                        <div className="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-100/80 border border-slate-200 rounded-2xl space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-900">Impresora Fiscal</span>
                        <span className={`text-[8px] font-bold uppercase leading-none ${impresoraFiscalActiva ? "text-emerald-600" : "text-rose-500"}`}>
                          {impresoraFiscalActiva ? "Habilitada" : "Deshabilitada"}
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={impresoraFiscalActiva} 
                          onChange={(e) => toggleImpresoraFiscal(e.target.checked)} 
                          className="sr-only peer" 
                        />
                        <div className="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>
                  </div>

                  {clienteDeuda > 0 && (
                    <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-2xl flex items-center gap-2.5 text-xs text-amber-800">
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                      <div>
                        <p className="font-bold text-[10px]">Deuda Pendiente:</p>
                        <p className="font-black text-amber-900 text-xs">${clienteDeuda.toFixed(2)}</p>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Cédula / RIF</label>
                    <div className="flex gap-2 mt-0.5">
                      <input
                        type="text"
                        placeholder="Ej: V-12345678"
                        className="flex-1 bg-white border border-slate-200 rounded-xl py-1.5 px-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                        value={cedula}
                        onChange={(e) => setCedula(e.target.value)}
                        onBlur={buscarCliente}
                      />
                      <button 
                        onClick={buscarCliente}
                        className="bg-slate-800 text-white px-2.5 py-1.5 rounded-xl text-xs font-bold hover:bg-slate-700 transition"
                      >
                        Buscar
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Nombre</label>
                      <input
                        type="text"
                        className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-2.5 text-xs font-semibold mt-0.5 outline-none"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Apellido</label>
                      <input
                        type="text"
                        className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-2.5 text-xs font-semibold mt-0.5 outline-none"
                        value={apellido}
                        onChange={(e) => setApellido(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Teléfono</label>
                    <input
                      type="text"
                      className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-2.5 text-xs font-semibold mt-0.5 outline-none"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Dirección</label>
                    <input
                      type="text"
                      className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-2.5 text-xs font-semibold mt-0.5 outline-none"
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Bloque Central y Derecho: Métodos de Pago */}
              <div className="flex-1 flex flex-col min-h-0 bg-white">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase">Monto Total</span>
                    <h2 className="text-xl font-black text-slate-900">${granTotalUSD.toFixed(2)} <span className="text-xs font-bold text-slate-400">(Bs. {totalBs.toFixed(2)})</span></h2>
                  </div>
                  <button 
                    onClick={() => setMostrarPago(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                  {/* Selector de Método */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-black uppercase text-slate-400">Seleccionar Método de Pago</label>
                      <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                        Relleno automático activo
                      </span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {[
                        { id: "PUNTO", label: "Punto Venta", moneda: "BS" },
                        { id: "PAGO_MOVIL", label: "Pago Móvil", moneda: "BS" },
                        { id: "EFECTIVO_BS", label: "Efectivo Bs", moneda: "BS" },
                        { id: "EFECTIVO_USD", label: "Efectivo $", moneda: "USD" },
                        { id: "ZELLE", label: "Zelle", moneda: "USD" },
                        { id: "BINANCE", label: "Binance Pay", moneda: "USDT" },
                        { id: "CREDITO", label: "A Crédito", moneda: "USD" }
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => seleccionarMetodo(m.id as any)}
                          className={`p-2.5 rounded-2xl border text-center font-bold text-[10px] uppercase transition cursor-pointer active:scale-95 ${
                            metodoActual === m.id
                              ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-[1.02]"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300"
                          }`}
                        >
                          <span className="block font-black">{m.label}</span>
                          <span className="text-[8px] opacity-80 font-mono">({m.moneda})</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sección de Descuento por Pago en Divisas / Zelle / Binance / Efectivo $ */}
                  <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase text-emerald-950 flex items-center gap-1">
                          🏷️ Descuento por Pago en Divisas / Zelle / Binance / Efectivo $
                        </span>
                      </div>
                      {descuentoUSD > 0 && (
                        <span className="text-[9px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                          Ahorro: -${descuentoUSD.toFixed(2)} (-Bs. {(descuentoUSD * tasa).toFixed(2)})
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      <div className="sm:col-span-6 flex items-center gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-700">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={totalProductosUSD}
                            placeholder="Monto de descuento ($)"
                            className="w-full bg-white border border-emerald-200 rounded-xl pl-7 pr-3 py-1.5 text-xs font-black text-emerald-950 outline-none focus:ring-2 focus:ring-emerald-500"
                            value={descuentoUSD === 0 ? "" : descuentoUSD}
                            onChange={(e) => {
                              const val = Math.max(0, Math.min(totalProductosUSD, parseFloat(e.target.value) || 0));
                              setDescuentoUSD(Number(val.toFixed(2)));
                            }}
                          />
                        </div>
                        {descuentoUSD > 0 && (
                          <button
                            type="button"
                            onClick={() => setDescuentoUSD(0)}
                            className="text-[10px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-1.5 rounded-xl transition cursor-pointer"
                          >
                            Quitar
                          </button>
                        )}
                      </div>

                      {/* Accesos rápidos de descuento en divisas */}
                      <div className="sm:col-span-6 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] font-bold text-emerald-800 uppercase mr-1">Rápido:</span>
                        {[
                          { label: "5%", pct: 0.05 },
                          { label: "10%", pct: 0.10 },
                          { label: "15%", pct: 0.15 },
                          { label: "$1", fix: 1 },
                          { label: "$2", fix: 2 },
                          { label: "$5", fix: 5 }
                        ].map((d, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              if (d.pct) {
                                const desc = Number((totalProductosUSD * d.pct).toFixed(2));
                                setDescuentoUSD(desc);
                              } else if (d.fix) {
                                setDescuentoUSD(Math.min(totalProductosUSD, d.fix));
                              }
                            }}
                            className="text-[9px] font-black bg-white hover:bg-emerald-100/70 border border-emerald-200 text-emerald-800 px-2 py-1 rounded-lg transition active:scale-95 cursor-pointer shadow-xs"
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Input de Monto y Referencia */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                      <div className="sm:col-span-6">
                        <div className="flex items-center justify-between">
                          <label className="text-[9px] font-black uppercase text-slate-500">
                            Monto a Abonar ({["PUNTO", "PAGO_MOVIL", "EFECTIVO_BS"].includes(metodoActual) ? "Bs." : metodoActual === "BINANCE" ? "USDT / $" : "$"})
                          </label>
                          {totalFaltanteUSD > 0.005 && (
                            <span className="text-[8.5px] font-bold text-slate-400">
                              Pendiente: {["PUNTO", "PAGO_MOVIL", "EFECTIVO_BS"].includes(metodoActual) ? `Bs. ${(totalFaltanteUSD * tasa).toFixed(2)}` : `$${totalFaltanteUSD.toFixed(2)}`}
                            </span>
                          )}
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          placeholder={
                            ["PUNTO", "PAGO_MOVIL", "EFECTIVO_BS"].includes(metodoActual)
                              ? `Ej: ${(totalFaltanteUSD * tasa).toFixed(2)}`
                              : `Ej: ${totalFaltanteUSD.toFixed(2)}`
                          }
                          className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-black text-indigo-950 mt-1 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          value={inputMonto}
                          onChange={(e) => setInputMonto(e.target.value)}
                        />
                      </div>
                      <div className="sm:col-span-4">
                        <label className="text-[9px] font-black uppercase text-slate-400">
                          {metodoActual === "BINANCE" ? "TxID / Binance Pay ID (Opcional)" : "Referencia / Lote (Opcional)"}
                        </label>
                        <input
                          type="text"
                          placeholder={metodoActual === "BINANCE" ? "Ej: Pay ID / Orden" : "Nro Confirmación"}
                          className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold mt-1 outline-none"
                          value={inputRef}
                          onChange={(e) => setInputRef(e.target.value)}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <button
                          type="button"
                          onClick={agregarPago}
                          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-2.5 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer active:scale-95 shadow-sm"
                        >
                          + Añadir
                        </button>
                      </div>
                    </div>

                    {/* Botones de Montos Rápidos para Pagos Mixtos */}
                    {totalFaltanteUSD > 0.005 && (
                      <div className="flex items-center gap-1.5 pt-1 text-[10px]">
                        <span className="text-[9px] font-bold text-slate-400 uppercase mr-1">Rellenar rápido:</span>
                        <button
                          type="button"
                          onClick={() => {
                            const esBs = ["PUNTO", "PAGO_MOVIL", "EFECTIVO_BS"].includes(metodoActual);
                            setInputMonto(esBs ? (totalFaltanteUSD * tasa).toFixed(2) : totalFaltanteUSD.toFixed(2));
                          }}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-2 py-0.8 rounded-lg transition cursor-pointer"
                        >
                          100% Saldo Restante
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const mitadUSD = totalFaltanteUSD / 2;
                            const esBs = ["PUNTO", "PAGO_MOVIL", "EFECTIVO_BS"].includes(metodoActual);
                            setInputMonto(esBs ? (mitadUSD * tasa).toFixed(2) : mitadUSD.toFixed(2));
                          }}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2 py-0.8 rounded-lg transition cursor-pointer"
                        >
                          50% (Mitad)
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Lista de Pagos Realizados */}
                  {pagosRealizados.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase text-slate-400">Pagos Registrados</label>
                      <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 space-y-1.5">
                        {pagosRealizados.map((p, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs bg-white p-2 rounded-xl border border-slate-100">
                            <span className="font-bold text-slate-700">
                              {p.metodo} {p.referencia ? `(Ref: ${p.referencia})` : ""}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="font-black text-slate-900">${p.montoUSD.toFixed(2)} (Bs. {p.montoBS.toFixed(2)})</span>
                              <button onClick={() => eliminarPago(idx)} className="text-rose-500 hover:text-rose-700 font-bold px-1">
                                ×
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Resumen Faltante / Liquidado */}
                  <div className="p-4 bg-slate-950 text-white rounded-2xl flex justify-between items-center">
                    <div>
                      <span className="text-[9px] font-black uppercase text-indigo-400 block">Estado de Cobro</span>
                      <span className="text-xs font-bold">
                        {totalFaltanteUSD <= 0.01 ? "✅ Factura Cubierta Totalmente" : `⚠️ Faltan $${totalFaltanteUSD.toFixed(2)} (Bs. ${(totalFaltanteUSD * tasa).toFixed(2)})`}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-black uppercase text-slate-400 block">Total Pagado</span>
                      <span className="text-sm font-black text-emerald-400">${totalPagadoUSD.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Footer del Modal */}
                <div className="p-4 border-t border-slate-100 flex gap-3 bg-slate-50/50">
                  <button
                    onClick={() => setMostrarPago(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-2xl text-xs uppercase"
                  >
                    Regresar al POS
                  </button>
                  <button
                    onClick={() => procesarVentaFinal(impresoraFiscalActiva)}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-2xl text-xs uppercase shadow-md flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar & Emitir Factura</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Impresión de Ticket Térmico */}
      {mostrarTicketModal && ventaParaImprimir && (
        <ThermalTicketModal
          venta={ventaParaImprimir}
          isOpen={mostrarTicketModal}
          onClose={() => {
            setMostrarTicketModal(false);
            setVentaParaImprimir(null);
          }}
        />
      )}

      {/* Modal de Devoluciones y Notas de Crédito */}
      <ModalDevoluciones
        isOpen={mostrarModalDevoluciones}
        onClose={() => setMostrarModalDevoluciones(false)}
        tasa={tasa}
        usuarioActual={perfilNegocio?.nombreComercio ? "Cajero" : undefined}
        onDevolucionProcesada={() => {
          cargarProductos();
        }}
      />

      {/* Modal de Cotizaciones / Presupuestos */}
      <ModalCotizaciones
        isOpen={mostrarModalCotizaciones}
        onClose={() => setMostrarModalCotizaciones(false)}
        tasa={tasa}
        usuarioActual="cajero"
        onCargarAlPOS={handleCargarCotizacionAlPOS}
      />

      {/* Modal de Kardex de Movimientos */}
      <ModalKardex
        isOpen={mostrarModalKardex}
        onClose={() => setMostrarModalKardex(false)}
      />

      {/* Modal de Corte X (Lectura Parcial de Turno) */}
      <ModalCorteX
        isOpen={mostrarModalCorteX}
        onClose={() => setMostrarModalCorteX(false)}
      />
    </div>
  );
}
