/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TipoRubroNegocio = 'FARMACIA' | 'FERRETERIA' | 'SUPERMERCADO' | 'ROPA_CALZADO' | 'GENERAL';

export type UnidadMedida = 'UND' | 'KG' | 'G' | 'MTS' | 'CM' | 'LTS' | 'ML' | 'PAR' | 'BULTO' | 'ROLLO' | 'CAJA' | 'DOCENA' | 'DOC' | 'CJ' | 'BLT' | 'PQTE';

export interface VarianteProducto {
  id: string;
  sku: string;
  talla?: string; // Ej: "38", "40", "S", "M", "L", "XL", "1/2 pulgada"
  color?: string; // Ej: "Negro", "Azul", "Blanco"
  stock: number;
  codigo_barra?: string;
  precio_adicional?: number;
}

export interface PerfilNegocio {
  rubro: TipoRubroNegocio;
  nombreComercio: string;
  slogan?: string;
  habilitarPreciosMayor: boolean; // Precios Detal, Mayor y Especial/Técnico
  habilitarDecimales: boolean; // Para metros, kilos, litros
  habilitarBalanzas: boolean; // Decodificador de códigos de balanza (20XXXXX / 21XXXXX)
  habilitarVariantes: boolean; // Matriz Talla x Color para prendas/calzados
  habilitarLotesVencimiento: boolean; // Lotes y fechas de caducidad
  habilitarUbicaciones: boolean; // Pasillo, Estante, Gaveta
  monedaSimbolo: string;
  tarifaDefault: 'detal' | 'mayor' | 'especial';
}

export interface CategoriaComercial {
  id: string;
  nombre: string;
  descripcion?: string;
  rubro?: TipoRubroNegocio;
}

export interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  categoria: 'MEDICAMENTO' | 'EXENTO' | 'GRAVADO_16';
  rubro?: TipoRubroNegocio;
  unidad_medida?: UnidadMedida;
  permite_decimales?: boolean;
  
  // Esquema de Precios
  precio_compra: number;
  precio_venta: number; // Tarifa Detal / PVP 1
  precio_mayor?: number; // Tarifa Mayorista / PVP 2
  precio_especial?: number; // Tarifa Técnico / Contratista / PVP 3
  
  stock: number;
  stock_tienda?: number; // Stock disponible en mostrador / piso de venta
  stock_almacen?: number; // Stock en reserva / depósito / almacén central
  stock_minimo?: number;
  unidades_bulto?: number;
  costo_bulto?: number;
  ganancia_perc?: number;
  se_vende_por_peso?: boolean;
  categoria_comercial?: string; // Categoría comercial/departamento dinámico
  ubicacion?: string; // Ej: "Pasillo 3 - Estante B - Gaveta 14"
  ubicacion_tienda?: string; // Ej: "Mostrador 1 / Pasillo A"
  ubicacion_almacen?: string; // Ej: "Galpón Central - Rack D-04"
  marca?: string;
  modelo?: string;
  
  // Variantes (Ropa, Calzados, Medidas)
  tiene_variantes?: boolean;
  variantes?: VarianteProducto[];
  
  // Datos específicos Farmacia / Alimentos perecederos
  principio_activo?: string;
  laboratorio?: string;
  lote?: string;
  fecha_vencimiento?: string;
  requiere_receta?: boolean;
  
  // Código Balanza (Supermercados/Charcutería)
  codigo_balanza?: string; // Código PLU
  
  atributos?: Record<string, string>; // Atributos dinámicos adicionales
}

export interface Cliente {
  cedula: string;
  nombre: string;
  apellido: string;
  telefono: string;
  direccion: string;
  saldo_pendiente: number;
  dias_ultimo_pago?: number;
  tarifa_preferencial?: 'detal' | 'mayor' | 'especial';
}

export interface Proveedor {
  id: string;
  rif: string;
  razon_social: string;
  telefono: string;
  correo: string;
  direccion: string;
  dias_credito: number;
  saldo: number;
  rubro_principal?: TipoRubroNegocio;
}

export interface FacturaCompra {
  id: string;
  proveedor_id: string;
  numero_factura: string;
  numero_control?: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  tipo_pago: 'CONTADO' | 'CREDITO';
  subtotal: number;
  iva: number;
  total: number;
  monto_pendiente: number;
  estado: 'PENDIENTE' | 'PAGADA';
  destino_ingreso?: 'ALMACEN' | 'TIENDA'; // ¿Mercancía recibida entra a Depósito Central o a Piso de Venta?
}

export interface DetalleVenta {
  producto_id: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  categoria: Producto['categoria'];
  unidad_medida?: UnidadMedida;
  cant_devuelta?: number;
  variante_id?: string;
  variante_detalle?: string;
  tarifa_aplicada?: 'detal' | 'mayor' | 'especial';
  atributos?: Record<string, string>;
}

export interface PagoMetodo {
  metodo: 'PUNTO' | 'PAGO_MOVIL' | 'EFECTIVO_BS' | 'EFECTIVO_USD' | 'ZELLE' | 'BINANCE' | 'CREDITO';
  monto_original: number;
  moneda: 'BS' | 'USD';
  montoUSD: number;
  montoBS: number;
  igtfUSD: number;
  referencia?: string;
}

export interface Venta {
  id: string;
  factura_numero: string; // FAC-000001 o NOT-000001
  cliente_id: string;
  cliente_nombre: string;
  tasa: number;
  monto_exento: number;
  base_imponible: number;
  monto_iva: number;
  monto_igtf: number;
  total_usd: number;
  total_bs: number;
  fecha: string;
  pagos: PagoMetodo[];
  items: DetalleVenta[];
  es_cerrado_z: boolean;
  sin_factura?: boolean;
  descuento_usd?: number;
}

export interface CierreZ {
  id: string;
  numero_z: string;
  fecha: string;
  hora_cierre: string;
  usuario: string;
  cantidad_ventas: number;
  total_exento_usd: number;
  total_base_usd: number;
  total_iva_usd: number;
  total_igtf_usd: number;
  gran_total_usd: number;
  gran_total_bs: number;
}

export interface LogActividad {
  id: string;
  fecha: string;
  usuario: string;
  accion: string;
  detalle: string;
}

export type ModuloSistema = 
  | "dashboard" 
  | "pos" 
  | "inventario" 
  | "almacen" 
  | "sucursales" 
  | "pedidos" 
  | "creditos" 
  | "proveedores" 
  | "compras" 
  | "cierre" 
  | "reportes" 
  | "config_impresion" 
  | "respaldos" 
  | "usuarios" 
  | "elena";

export interface Usuario {
  username: string;
  nombre: string;
  rol: "superadmin" | "administrador" | "cajero" | "trabajo";
  empresaId?: string;
  modulosPermitidos?: ModuloSistema[];
  departamento?: string; // Ej: "Bordado", "Costura", "Diseño Gráfico", "Imprenta", "General"
  isImpersonating?: boolean; // Modo Soporte Técnico / Acceso Invisible
  impersonatedBy?: string;   // Usuario SuperAdmin original
}

export interface Empleado {
  id: string;
  nombre: string;
  cargo?: string;
  departamento?: string;
}

export type TipoPlanLicencia = 'TRIAL' | 'MENSUAL' | 'ANUAL' | 'VITALICIA';
export type EstadoLicencia = 'ACTIVA' | 'POR_VENCER' | 'VENCIDA' | 'SUSPENDIDA' | 'TRIAL';

export interface PagoLicencia {
  id: string;
  fecha: string;
  montoUSD: number;
  montoBS?: number;
  tasaBCV?: number;
  metodoPago: 'ZELLE' | 'PAGO_MOVIL' | 'EFECTIVO_USD' | 'TRANSFERENCIA_BS' | 'BINANCE_USDT' | 'OTRO';
  referencia: string;
  periodoMeses: number;
  fechaInicio: string;
  fechaFin: string;
  nota?: string;
  registradoPor: string;
}

export interface LicenciaEmpresa {
  plan: TipoPlanLicencia;
  estado: EstadoLicencia;
  fechaInicio: string;
  fechaVencimiento: string; // ISO String
  precioMensualUSD: number;
  diasGracia: number;
  bloqueoAutomatico: boolean;
  claveActivacion?: string;
  ultimoPago?: PagoLicencia;
  historialPagos?: PagoLicencia[];
}

export interface BackupCloudInfo {
  ultimoRespaldoFecha?: string;
  ultimoRespaldoTipo?: string;
  ultimoRespaldoBytes?: number;
  totalRespaldos?: number;
}

export interface Empresa {
  id: string;
  rif: string;
  nombre: string;
  contacto?: string;
  telefono: string;
  email?: string;
  direccion: string;
  ciudad?: string;
  creadaEn: string;
  estado: "activa" | "suspendida";
  rubro?: TipoRubroNegocio;
  licencia?: LicenciaEmpresa;
  backupInfo?: BackupCloudInfo;
  ventasContador?: number;
  productosContador?: number;
  totalVentasUSD?: number;
}

export interface Pedido {
  id: string;
  codigo_pedido?: string; // Ej: PED-0001
  nombres: string;
  apellidos: string;
  cedula: string;
  telefono: string;
  direccion: string;
  descripcion: string;
  imagenes: string[]; // Base64 or URLs
  estado: "Pendiente" | "En Proceso" | "Terminado" | "Entregado";
  fecha_pedido: string;
  fecha_entrega_estimada?: string;
  fecha_entregado?: string;
  monto_total: number;
  anticipo: number;
  saldo_pendiente: number;
  metodo_pago_anticipo?: string;
  metodo_pago_saldo?: string;
  anticipo_registrado?: boolean;
  saldo_registrado?: boolean;
  asignado_a?: string;
  departamento_servicio?: string;
  notas_operativas?: string;
}

export interface Sucursal {
  id: string;
  codigo: string; // ej. SUC-01, SUC-02
  nombre: string;
  direccion: string;
  telefono: string;
  ciudad?: string;
  esPrincipal: boolean;
  activa: boolean;
  ipServidor?: string;
  fechaRegistro: string;
  cajas?: string[]; // ej. ["CAJA-01", "CAJA-02"]
}

export interface TrasladoItem {
  producto_id: string;
  codigo: string;
  nombre: string;
  categoria?: Producto['categoria'];
  cantidad: number;
  precio_costo?: number;
  precio_venta?: number;
  lote?: string;
  fecha_vencimiento?: string;
}

export interface Traslado {
  id: string;
  numero_guia: string; // ej. TRF-2026-0001
  sucursal_origen_id: string;
  sucursal_origen_nombre: string;
  sucursal_destino_id: string;
  sucursal_destino_nombre: string;
  fecha_despacho: string;
  fecha_recepcion?: string;
  estado: 'BORRADOR' | 'EN_TRANSITO' | 'RECIBIDO' | 'ANULADO';
  conductor_nombre?: string;
  vehiculo_placa?: string;
  items: TrasladoItem[];
  total_items: number;
  total_unidades: number;
  observaciones?: string;
  usuario_despacho: string;
  usuario_recepcion?: string;
  motivo?: string;
}

export interface StockSucursalItem {
  sucursal_id: string;
  sucursal_codigo: string;
  sucursal_nombre: string;
  es_actual: boolean;
  stock: number;
  disponible: boolean;
}

export type TipoMovimientoAlmacen = 'ALMACEN_A_TIENDA' | 'TIENDA_A_ALMACEN' | 'AJUSTE_ALMACEN' | 'AJUSTE_TIENDA';

export interface TrasladoInternoItem {
  producto_id: string;
  codigo: string;
  nombre: string;
  cantidad: number;
  unidad_medida?: string;
  precio_costo?: number;
  precio_venta?: number;
  lote?: string;
  fecha_vencimiento?: string;
  stock_almacen_anterior?: number;
  stock_tienda_anterior?: number;
}

export interface TrasladoInterno {
  id: string;
  numero_guia: string; // ej. TR-ALM-000001
  tipo: TipoMovimientoAlmacen;
  origen: 'ALMACEN' | 'TIENDA';
  destino: 'TIENDA' | 'ALMACEN';
  fecha: string;
  usuario: string;
  motivo: string; // ej. "Reposición de Mostrador", "Devolución por sobrante", "Reabastecimiento urgente"
  items: TrasladoInternoItem[];
  total_items: number;
  total_unidades: number;
  observaciones?: string;
}

export interface ResumenAlmacen {
  total_stock_almacen: number;
  total_stock_tienda: number;
  total_stock_global: number;
  valor_almacen_costo_usd: number;
  valor_tienda_costo_usd: number;
  valor_tienda_pvp_usd: number;
  articulos_reposicion_urgente: Producto[];
  total_traslados_realizados: number;
}

// 1. GASTOS OPERATIVOS / SALIDAS DE CAJA CHICA
export interface GastoCajaChica {
  id: string;
  fecha: string;
  concepto: string;
  categoria_gasto: 'TRANSPORTE_LOGISTICA' | 'LIMPIEZA_INSUMOS' | 'DELIVERY' | 'ALMUERZOS_REFRIGERIOS' | 'MANTENIMIENTO' | 'SERVICIOS' | 'PROVEEDOR_MENOR' | 'OTRO';
  monto: number;
  moneda: 'USD' | 'BS';
  montoUSD: number;
  montoBS: number;
  tasa_bcv: number;
  beneficiario?: string;
  comprobante_nro?: string;
  usuario: string;
  caja?: string;
  es_cerrado_z?: boolean;
}

// 2. DEVOLUCIONES, ANULACIONES Y NOTAS DE CRÉDITO
export interface DevolucionItem {
  producto_id: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  monto_total_usd: number;
  destino_reingreso: 'TIENDA' | 'ALMACEN' | 'MERMA_DEFECTUOSO';
  motivo_item?: string;
}

export type ItemDevolucion = DevolucionItem;

export interface DevolucionNotaCredito {
  id: string;
  numero_nota_credito: string; // NC-000001
  factura_numero_original: string;
  venta_id_original: string;
  fecha: string;
  cliente_id: string;
  cliente_nombre: string;
  tipo_operacion: 'DEVOLUCION_PARCIAL' | 'ANULACION_TOTAL';
  metodo_reembolso: 'EFECTIVO_USD' | 'EFECTIVO_BS' | 'PAGO_MOVIL' | 'SALDO_A_FAVOR_CLIENTE' | 'CAMBIO_PRODUCTO';
  total_reembolso_usd: number;
  total_reembolso_bs: number;
  tasa_bcv: number;
  items: DevolucionItem[];
  motivo_general: string;
  usuario: string;
  observaciones?: string;
}

// 3. COTIZACIONES Y PRESUPUESTOS
export interface ItemCotizacion {
  producto_id: string;
  codigo: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  unidad_medida?: UnidadMedida;
  tarifa_aplicada?: 'detal' | 'mayor' | 'especial';
  subtotal: number;
}

export interface CotizacionPresupuesto {
  id: string;
  numero_presupuesto: string; // COT-000001
  fecha_emision: string;
  fecha_vencimiento: string; // Ej: vigencia de 3, 5 o 15 días
  dias_validez: number;
  cliente_id: string;
  cliente_nombre: string;
  cliente_telefono?: string;
  cliente_direccion?: string;
  items: ItemCotizacion[];
  subtotal_usd: number;
  descuento_usd?: number;
  iva_usd: number;
  total_usd: number;
  total_bs: number;
  tasa_bcv: number;
  estado: 'PENDIENTE' | 'APROBADA_FACTURADA' | 'CONVERTIDA_A_VENTA' | 'VENCIDA' | 'RECHAZADA';
  factura_generada_id?: string;
  usuario_creador: string;
  notas_condiciones?: string;
}

// 4. KARDEX DE MOVIMIENTOS POR PRODUCTO (TRAZABILIDAD TOTAL)
export type TipoMovimientoKardex = 
  | 'VENTA'
  | 'COMPRA_ENTRADA'
  | 'TRASLADO_INTERNO'
  | 'DEVOLUCION_CLIENTE'
  | 'AJUSTE_INVENTARIO'
  | 'MERMA_BAJA'
  | 'SALDO_INICIAL';

export interface MovimientoKardex {
  id: string;
  producto_id: string;
  producto_codigo: string;
  producto_nombre: string;
  fecha: string;
  tipo_movimiento: TipoMovimientoKardex;
  referencia_documento: string; // Ej: FAC-000123, TR-ALM-000005, COMP-00045, NC-000012
  ubicacion_afectada: 'TIENDA' | 'ALMACEN' | 'GLOBAL';
  cantidad_entrada: number;
  cantidad_salida: number;
  stock_anterior: number;
  stock_resultante: number;
  costo_unitario_usd?: number;
  precio_unitario_usd?: number;
  usuario: string;
  observaciones?: string;
}



