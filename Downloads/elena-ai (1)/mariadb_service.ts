import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import { 
  Producto, 
  Cliente, 
  Proveedor, 
  Venta, 
  CierreZ, 
  LogActividad, 
  Pedido,
  CategoriaComercial
} from "./src/types";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const CONFIG_FILE = path.join(DATA_DIR, "mariadb_config.json");

export interface MariaDBConfig {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
  enabled: boolean;
}

const DEFAULT_CONFIG: MariaDBConfig = {
  host: "localhost",
  port: 3306,
  user: "root",
  password: "",
  database: "elena_pro",
  enabled: false
};

// Ensure data dir exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Read config
export function getMariaDBConfig(): MariaDBConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, "utf8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Error leyendo configuracion MariaDB:", err);
  }
  return { ...DEFAULT_CONFIG };
}

// Save config
export function saveMariaDBConfig(config: MariaDBConfig): void {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
  } catch (err) {
    console.error("Error guardando configuracion MariaDB:", err);
  }
}

// Pool instance cache
let pool: mysql.Pool | null = null;

// Get connection pool
export async function getMariaDBPool(): Promise<mysql.Pool | null> {
  const config = getMariaDBConfig();
  if (!config.enabled) {
    return null;
  }

  if (pool) {
    return pool;
  }

  try {
    pool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password || "",
      database: config.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      multipleStatements: true
    });
    // Test pool connection
    const conn = await pool.getConnection();
    conn.release();
    console.log(`[MariaDB] Pool de conexiones establecido con éxito en ${config.host}:${config.port}`);
    return pool;
  } catch (err: any) {
    console.log(`[MariaDB] Nota: El servidor SQL no está activo en este entorno de pruebas online o local (${config.host}:${config.port}). Detalle: ${err?.message || err}. El sistema operará de manera segura usando el almacenamiento local JSON.`);
    pool = null;
    return null;
  }
}

// Reset pool (e.g. if config changes)
export async function resetMariaDBPool(): Promise<void> {
  if (pool) {
    try {
      await pool.end();
    } catch (err) {
      console.error("[MariaDB] Error cerrando el pool anterior:", err);
    }
    pool = null;
  }
}

// Test connection with specific config (for verification UI)
export async function testMariaDBConnection(config: Omit<MariaDBConfig, 'enabled'>): Promise<{ success: boolean; message: string }> {
  let connection: mysql.Connection | null = null;
  try {
    // Intentamos conectar primero sin base de datos para ver si el servidor responde
    connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password || ""
    });

    // Intentamos crear la base de datos si no existe
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\``);
    await connection.end();
    connection = null;

    // Ahora intentamos conectar a la base de datos específica
    connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password || "",
      database: config.database
    });

    await connection.end();
    connection = null;
    return { success: true, message: "¡Conexión establecida con éxito! Base de datos creada o lista para usar." };
  } catch (err: any) {
    console.error("[MariaDB] Fallo en test de conexión:", err);
    return { success: false, message: err.message || "Error desconocido al conectar." };
  } finally {
    if (connection) {
      try { await connection.end(); } catch {}
    }
  }
}

// Initialize tables in MariaDB
export async function createTablesIfNotExist(p: mysql.Pool): Promise<void> {
  const connection = await p.getConnection();
  try {
    console.log("[MariaDB] Inicializando tablas...");

    // 1. Empresas / Tenants
    await connection.query(`
      CREATE TABLE IF NOT EXISTS empresas (
        id VARCHAR(50) PRIMARY KEY,
        rif VARCHAR(50) NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        telefono VARCHAR(50),
        direccion TEXT,
        creadaEn VARCHAR(50),
        estado VARCHAR(20) DEFAULT 'activa',
        ventasContador INT DEFAULT 0,
        productosContador INT DEFAULT 0,
        proximo_z INT DEFAULT 1,
        tasa_bcv DECIMAL(10,4) DEFAULT 36.50,
        pin_supervisor VARCHAR(10) DEFAULT '1234'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Usuarios
    await connection.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        tenant_id VARCHAR(50) NOT NULL,
        username VARCHAR(50) NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        rol VARCHAR(20) NOT NULL,
        contrasena VARCHAR(255) NOT NULL,
        PRIMARY KEY (tenant_id, username),
        FOREIGN KEY (tenant_id) REFERENCES empresas(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Categorias Comerciales
    await connection.query(`
      CREATE TABLE IF NOT EXISTS categorias_comerciales (
        tenant_id VARCHAR(50) NOT NULL,
        id VARCHAR(50) NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        descripcion TEXT,
        PRIMARY KEY (tenant_id, id),
        FOREIGN KEY (tenant_id) REFERENCES empresas(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Productos
    await connection.query(`
      CREATE TABLE IF NOT EXISTS productos (
        tenant_id VARCHAR(50) NOT NULL,
        id VARCHAR(50) NOT NULL,
        codigo VARCHAR(100) NOT NULL,
        nombre VARCHAR(255) NOT NULL,
        categoria VARCHAR(50) NOT NULL,
        precio_compra DECIMAL(15,4) DEFAULT 0.0,
        precio_venta DECIMAL(15,4) DEFAULT 0.0,
        stock INT DEFAULT 0,
        unidades_bulto INT DEFAULT NULL,
        costo_bulto DECIMAL(15,4) DEFAULT NULL,
        ganancia_perc INT DEFAULT 30,
        se_vende_por_peso TINYINT(1) DEFAULT 0,
        categoria_comercial VARCHAR(50),
        atributos JSON DEFAULT NULL,
        PRIMARY KEY (tenant_id, id),
        FOREIGN KEY (tenant_id) REFERENCES empresas(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. Clientes
    await connection.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        tenant_id VARCHAR(50) NOT NULL,
        cedula VARCHAR(50) NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        apellido VARCHAR(100) NOT NULL,
        telefono VARCHAR(50),
        direccion TEXT,
        saldo_pendiente DECIMAL(15,4) DEFAULT 0.0,
        dias_ultimo_pago INT DEFAULT NULL,
        PRIMARY KEY (tenant_id, cedula),
        FOREIGN KEY (tenant_id) REFERENCES empresas(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 6. Proveedores
    await connection.query(`
      CREATE TABLE IF NOT EXISTS proveedores (
        tenant_id VARCHAR(50) NOT NULL,
        id VARCHAR(50) NOT NULL,
        rif VARCHAR(50) NOT NULL,
        razon_social VARCHAR(150) NOT NULL,
        telefono VARCHAR(50),
        correo VARCHAR(100),
        direccion TEXT,
        dias_credito INT DEFAULT 0,
        saldo DECIMAL(15,4) DEFAULT 0.0,
        PRIMARY KEY (tenant_id, id),
        FOREIGN KEY (tenant_id) REFERENCES empresas(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 7. Facturas Compra
    await connection.query(`
      CREATE TABLE IF NOT EXISTS compras (
        tenant_id VARCHAR(50) NOT NULL,
        id VARCHAR(50) NOT NULL,
        proveedor_id VARCHAR(50) NOT NULL,
        numero_factura VARCHAR(100) NOT NULL,
        numero_control VARCHAR(100),
        fecha_emision VARCHAR(50) NOT NULL,
        fecha_vencimiento VARCHAR(50) NOT NULL,
        tipo_pago VARCHAR(50) NOT NULL,
        subtotal DECIMAL(15,4) DEFAULT 0.0,
        iva DECIMAL(15,4) DEFAULT 0.0,
        total DECIMAL(15,4) DEFAULT 0.0,
        monto_pendiente DECIMAL(15,4) DEFAULT 0.0,
        estado VARCHAR(50) NOT NULL,
        PRIMARY KEY (tenant_id, id),
        FOREIGN KEY (tenant_id) REFERENCES empresas(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 8. Ventas
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ventas (
        tenant_id VARCHAR(50) NOT NULL,
        id VARCHAR(50) NOT NULL,
        factura_numero VARCHAR(50) NOT NULL,
        cliente_id VARCHAR(50),
        cliente_nombre VARCHAR(150),
        tasa DECIMAL(10,4) NOT NULL,
        monto_exento DECIMAL(15,4) DEFAULT 0.0,
        base_imponible DECIMAL(15,4) DEFAULT 0.0,
        monto_iva DECIMAL(15,4) DEFAULT 0.0,
        monto_igtf DECIMAL(15,4) DEFAULT 0.0,
        total_usd DECIMAL(15,4) DEFAULT 0.0,
        total_bs DECIMAL(15,4) DEFAULT 0.0,
        fecha VARCHAR(50) NOT NULL,
        es_cerrado_z TINYINT(1) DEFAULT 0,
        sin_factura TINYINT(1) DEFAULT 0,
        descuento_usd DECIMAL(15,4) DEFAULT 0.0,
        pagos JSON NOT NULL,
        items JSON NOT NULL,
        PRIMARY KEY (tenant_id, id),
        FOREIGN KEY (tenant_id) REFERENCES empresas(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 9. Cierres Z
    await connection.query(`
      CREATE TABLE IF NOT EXISTS cierres_z (
        tenant_id VARCHAR(50) NOT NULL,
        id VARCHAR(50) NOT NULL,
        numero_z VARCHAR(50) NOT NULL,
        fecha VARCHAR(50) NOT NULL,
        hora_cierre VARCHAR(50) NOT NULL,
        usuario VARCHAR(100) NOT NULL,
        cantidad_ventas INT DEFAULT 0,
        total_exento_usd DECIMAL(15,4) DEFAULT 0.0,
        total_base_usd DECIMAL(15,4) DEFAULT 0.0,
        total_iva_usd DECIMAL(15,4) DEFAULT 0.0,
        total_igtf_usd DECIMAL(15,4) DEFAULT 0.0,
        gran_total_usd DECIMAL(15,4) DEFAULT 0.0,
        gran_total_bs DECIMAL(15,4) DEFAULT 0.0,
        PRIMARY KEY (tenant_id, id),
        FOREIGN KEY (tenant_id) REFERENCES empresas(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 10. Logs Actividad
    await connection.query(`
      CREATE TABLE IF NOT EXISTS logs (
        tenant_id VARCHAR(50) NOT NULL,
        id VARCHAR(50) NOT NULL,
        fecha VARCHAR(50) NOT NULL,
        usuario VARCHAR(100) NOT NULL,
        accion VARCHAR(100) NOT NULL,
        detalle TEXT,
        PRIMARY KEY (tenant_id, id),
        FOREIGN KEY (tenant_id) REFERENCES empresas(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 11. Cierres de Caja
    await connection.query(`
      CREATE TABLE IF NOT EXISTS cierres_caja (
        tenant_id VARCHAR(50) NOT NULL,
        id VARCHAR(50) NOT NULL,
        fecha VARCHAR(50) NOT NULL,
        usuario VARCHAR(100) NOT NULL,
        monto_dolares DECIMAL(15,4) DEFAULT 0.0,
        monto_bolivares DECIMAL(15,4) DEFAULT 0.0,
        detalle JSON DEFAULT NULL,
        PRIMARY KEY (tenant_id, id),
        FOREIGN KEY (tenant_id) REFERENCES empresas(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 12. Pedidos
    await connection.query(`
      CREATE TABLE IF NOT EXISTS pedidos (
        tenant_id VARCHAR(50) NOT NULL,
        id VARCHAR(50) NOT NULL,
        nombres VARCHAR(100) NOT NULL,
        apellidos VARCHAR(100) NOT NULL,
        cedula VARCHAR(50) NOT NULL,
        telefono VARCHAR(50) NOT NULL,
        direccion TEXT,
        descripcion TEXT,
        imagenes LONGTEXT, -- Almacena array de base64 como JSON
        estado VARCHAR(50) DEFAULT 'Pendiente',
        fecha_pedido VARCHAR(50) NOT NULL,
        fecha_entrega_estimada VARCHAR(50),
        fecha_entregado VARCHAR(50),
        monto_total DECIMAL(15,4) DEFAULT 0.0,
        anticipo DECIMAL(15,4) DEFAULT 0.0,
        saldo_pendiente DECIMAL(15,4) DEFAULT 0.0,
        metodo_pago_anticipo VARCHAR(50),
        metodo_pago_saldo VARCHAR(50),
        anticipo_registrado TINYINT(1) DEFAULT 0,
        saldo_registrado TINYINT(1) DEFAULT 0,
        asignado_a VARCHAR(100) DEFAULT NULL,
        departamento_servicio VARCHAR(100) DEFAULT NULL,
        notas_operativas TEXT DEFAULT NULL,
        PRIMARY KEY (tenant_id, id),
        FOREIGN KEY (tenant_id) REFERENCES empresas(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Migraciones seguras para bases de datos existentes
    try {
      await connection.query(`ALTER TABLE productos ADD COLUMN IF NOT EXISTS atributos JSON DEFAULT NULL;`);
    } catch (e) {
      try {
        await connection.query(`ALTER TABLE productos ADD COLUMN atributos JSON DEFAULT NULL;`);
      } catch (err) {}
    }

    try {
      await connection.query(`ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS asignado_a VARCHAR(100) DEFAULT NULL;`);
      await connection.query(`ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS departamento_servicio VARCHAR(100) DEFAULT NULL;`);
      await connection.query(`ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS notas_operativas TEXT DEFAULT NULL;`);
    } catch (e) {
      try {
        await connection.query(`ALTER TABLE pedidos ADD COLUMN asignado_a VARCHAR(100) DEFAULT NULL;`);
        await connection.query(`ALTER TABLE pedidos ADD COLUMN departamento_servicio VARCHAR(100) DEFAULT NULL;`);
        await connection.query(`ALTER TABLE pedidos ADD COLUMN notas_operativas TEXT DEFAULT NULL;`);
      } catch (err) {}
    }

    console.log("[MariaDB] Todas las tablas y columnas se verificaron/crearon correctamente.");
  } catch (err) {
    console.error("[MariaDB] Error creando tablas:", err);
    throw err;
  } finally {
    connection.release();
  }
}

// Safe helper to parse JSON with fallback
function safeParseJSON<T>(str: any, fallback: T): T {
  if (str === null || str === undefined) return fallback;
  if (typeof str === "object") return str;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

// Fetch all data for a single tenant from MariaDB to emulate LocalDB
export async function loadTenantDBFromMariaDB(p: mysql.Pool, tenantId: string): Promise<any> {
  const connection = await p.getConnection();
  try {
    // Check if the tenant exists, if not, insert it first
    const [empRows]: any = await connection.query("SELECT * FROM empresas WHERE id = ?", [tenantId]);
    if (empRows.length === 0) {
      // Create company entry if missing
      const companiesFile = path.join(DATA_DIR, "companies.json");
      let companyInfo = { id: tenantId, rif: "J-00000000-0", nombre: "Elena Farmacia", telefono: "", direccion: "", creadaEn: new Date().toISOString(), estado: "activa" };
      if (fs.existsSync(companiesFile)) {
        try {
          const comps = JSON.parse(fs.readFileSync(companiesFile, "utf8"));
          const found = comps.find((c: any) => c.id === tenantId);
          if (found) companyInfo = found;
        } catch {}
      }
      await connection.query(
        "INSERT INTO empresas (id, rif, nombre, telefono, direccion, creadaEn, estado) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [companyInfo.id, companyInfo.rif, companyInfo.nombre, companyInfo.telefono ?? "", companyInfo.direccion ?? "", companyInfo.creadaEn, companyInfo.estado]
      );
    }

    const [[empInfo]]: any = await connection.query("SELECT * FROM empresas WHERE id = ?", [tenantId]);

    // Fetch individual collections
    const [productos]: any = await connection.query("SELECT * FROM productos WHERE tenant_id = ?", [tenantId]);
    const [clientes]: any = await connection.query("SELECT * FROM clientes WHERE tenant_id = ?", [tenantId]);
    const [proveedores]: any = await connection.query("SELECT * FROM proveedores WHERE tenant_id = ?", [tenantId]);
    const [compras]: any = await connection.query("SELECT * FROM compras WHERE tenant_id = ?", [tenantId]);
    const [ventas]: any = await connection.query("SELECT * FROM ventas WHERE tenant_id = ?", [tenantId]);
    const [cierresZ]: any = await connection.query("SELECT * FROM cierres_z WHERE tenant_id = ?", [tenantId]);
    const [logs]: any = await connection.query("SELECT * FROM logs WHERE tenant_id = ?", [tenantId]);
    const [usuarios]: any = await connection.query("SELECT * FROM usuarios WHERE tenant_id = ?", [tenantId]);
    const [cierresCaja]: any = await connection.query("SELECT * FROM cierres_caja WHERE tenant_id = ?", [tenantId]);
    const [categoriasComerciales]: any = await connection.query("SELECT * FROM categorias_comerciales WHERE tenant_id = ?", [tenantId]);
    const [pedidos]: any = await connection.query("SELECT * FROM pedidos WHERE tenant_id = ?", [tenantId]);

    // Convert decimal database types to JavaScript floats/ints where appropriate
    const cleanProductos = productos.map((pr: any) => ({
      ...pr,
      se_vende_por_peso: !!pr.se_vende_por_peso,
      precio_compra: parseFloat(pr.precio_compra || 0),
      precio_venta: parseFloat(pr.precio_venta || 0),
      unidades_bulto: (pr.unidades_bulto !== null && pr.unidades_bulto !== undefined) ? parseInt(pr.unidades_bulto, 10) : undefined,
      costo_bulto: (pr.costo_bulto !== null && pr.costo_bulto !== undefined) ? parseFloat(pr.costo_bulto) : undefined,
      atributos: safeParseJSON(pr.atributos, undefined)
    }));

    const cleanClientes = clientes.map((c: any) => ({
      ...c,
      saldo_pendiente: parseFloat(c.saldo_pendiente || 0)
    }));

    const cleanProveedores = proveedores.map((pv: any) => ({
      ...pv,
      saldo: parseFloat(pv.saldo || 0)
    }));

    const cleanCompras = compras.map((cp: any) => ({
      ...cp,
      subtotal: parseFloat(cp.subtotal || 0),
      iva: parseFloat(cp.iva || 0),
      total: parseFloat(cp.total || 0),
      monto_pendiente: parseFloat(cp.monto_pendiente || 0)
    }));

    const cleanVentas = ventas.map((v: any) => ({
      ...v,
      es_cerrado_z: !!v.es_cerrado_z,
      sin_factura: !!v.sin_factura,
      tasa: parseFloat(v.tasa || 36.5),
      monto_exento: parseFloat(v.monto_exento || 0),
      base_imponible: parseFloat(v.base_imponible || 0),
      monto_iva: parseFloat(v.monto_iva || 0),
      monto_igtf: parseFloat(v.monto_igtf || 0),
      total_usd: parseFloat(v.total_usd || 0),
      total_bs: parseFloat(v.total_bs || 0),
      descuento_usd: parseFloat(v.descuento_usd || 0),
      pagos: safeParseJSON(v.pagos, []),
      items: safeParseJSON(v.items, [])
    }));

    const cleanCierresZ = cierresZ.map((cz: any) => ({
      ...cz,
      total_exento_usd: parseFloat(cz.total_exento_usd || 0),
      total_base_usd: parseFloat(cz.total_base_usd || 0),
      total_iva_usd: parseFloat(cz.total_iva_usd || 0),
      total_igtf_usd: parseFloat(cz.total_igtf_usd || 0),
      gran_total_usd: parseFloat(cz.gran_total_usd || 0),
      gran_total_bs: parseFloat(cz.gran_total_bs || 0)
    }));

    const cleanCierresCaja = cierresCaja.map((cc: any) => ({
      id: cc.id,
      fecha: cc.fecha,
      usuario: cc.usuario,
      dolares: parseFloat(cc.monto_dolares || 0),
      bolivares: parseFloat(cc.monto_bolivares || 0),
      detalle: safeParseJSON(cc.detalle, null)
    }));

    const cleanPedidos = pedidos.map((pd: any) => ({
      ...pd,
      monto_total: parseFloat(pd.monto_total || 0),
      anticipo: parseFloat(pd.anticipo || 0),
      saldo_pendiente: parseFloat(pd.saldo_pendiente || 0),
      anticipo_registrado: !!pd.anticipo_registrado,
      saldo_registrado: !!pd.saldo_registrado,
      imagenes: safeParseJSON(pd.imagenes, []),
      asignado_a: pd.asignado_a || undefined,
      departamento_servicio: pd.departamento_servicio || undefined,
      notas_operativas: pd.notas_operativas || undefined
    }));

    return {
      productos: cleanProductos,
      clientes: cleanClientes,
      proveedores: cleanProveedores,
      compras: cleanCompras,
      ventas: cleanVentas,
      cierresZ: cleanCierresZ,
      logs,
      usuarios: usuarios.map((u: any) => ({ username: u.username, nombre: u.nombre, rol: u.rol, contrasena: u.contrasena })),
      cierresCaja: cleanCierresCaja,
      pin_supervisor: empInfo.pin_supervisor || "1234",
      categoriasComerciales,
      pedidos: cleanPedidos,
      proximo_z: empInfo.proximo_z || 1,
      tasa_bcv: parseFloat(empInfo.tasa_bcv || "36.50")
    };
  } catch (err) {
    console.error(`[MariaDB] Error cargando base de datos del tenant ${tenantId}:`, err);
    throw err;
  } finally {
    connection.release();
  }
}

// Save complete Tenant DB back to MariaDB (handles updates/inserts/deletions seamlessly)
export async function saveTenantDBToMariaDB(p: mysql.Pool, tenantId: string, db: any): Promise<void> {
  const connection = await p.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Update company config (proximo_z, tasa_bcv, pin_supervisor)
    await connection.query(
      `UPDATE empresas SET proximo_z = ?, tasa_bcv = ?, pin_supervisor = ? WHERE id = ?`,
      [db.proximo_z ?? 1, db.tasa_bcv ?? 36.50, db.pin_supervisor ?? "1234", tenantId]
    );

    // 2. Sync Categorías Comerciales
    if (db.categoriasComerciales) {
      await connection.query("DELETE FROM categorias_comerciales WHERE tenant_id = ?", [tenantId]);
      for (const cat of db.categoriasComerciales) {
        await connection.query(
          "INSERT INTO categorias_comerciales (tenant_id, id, nombre, descripcion) VALUES (?, ?, ?, ?)",
          [tenantId, cat.id, cat.nombre, cat.descripcion ?? null]
        );
      }
    }

    // 3. Sync Productos
    if (db.productos) {
      await connection.query("DELETE FROM productos WHERE tenant_id = ?", [tenantId]);
      for (const prod of db.productos) {
        const unidadesBultoVal = (prod.unidades_bulto !== undefined && prod.unidades_bulto !== null) ? prod.unidades_bulto : null;
        const costoBultoVal = (prod.costo_bulto !== undefined && prod.costo_bulto !== null) ? prod.costo_bulto : null;
        const gananciaVal = (prod.ganancia_perc !== undefined && prod.ganancia_perc !== null) ? prod.ganancia_perc : 30;

        await connection.query(
          `INSERT INTO productos 
          (tenant_id, id, codigo, nombre, categoria, precio_compra, precio_venta, stock, unidades_bulto, costo_bulto, ganancia_perc, se_vende_por_peso, categoria_comercial, atributos) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            tenantId, prod.id, prod.codigo ?? "", prod.nombre ?? "", prod.categoria ?? "EXENTO",
            prod.precio_compra ?? 0, prod.precio_venta ?? 0, prod.stock ?? 0,
            unidadesBultoVal, costoBultoVal,
            gananciaVal, prod.se_vende_por_peso ? 1 : 0,
            prod.categoria_comercial ?? null,
            prod.atributos ? JSON.stringify(prod.atributos) : null
          ]
        );
      }
    }

    // 4. Sync Clientes
    if (db.clientes) {
      await connection.query("DELETE FROM clientes WHERE tenant_id = ?", [tenantId]);
      for (const cli of db.clientes) {
        const diasPagoVal = (cli.dias_ultimo_pago !== undefined && cli.dias_ultimo_pago !== null) ? cli.dias_ultimo_pago : null;

        await connection.query(
          `INSERT INTO clientes (tenant_id, cedula, nombre, apellido, telefono, direccion, saldo_pendiente, dias_ultimo_pago) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [tenantId, cli.cedula, cli.nombre, cli.apellido ?? "", cli.telefono ?? null, cli.direccion ?? null, cli.saldo_pendiente ?? 0, diasPagoVal]
        );
      }
    }

    // 5. Sync Proveedores
    if (db.proveedores) {
      await connection.query("DELETE FROM proveedores WHERE tenant_id = ?", [tenantId]);
      for (const prov of db.proveedores) {
        await connection.query(
          `INSERT INTO proveedores (tenant_id, id, rif, razon_social, telefono, correo, direccion, dias_credito, saldo) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [tenantId, prov.id, prov.rif, prov.razon_social, prov.telefono ?? null, prov.correo ?? null, prov.direccion ?? null, prov.dias_credito ?? 0, prov.saldo ?? 0]
        );
      }
    }

    // 6. Sync Compras
    if (db.compras) {
      await connection.query("DELETE FROM compras WHERE tenant_id = ?", [tenantId]);
      for (const cp of db.compras) {
        await connection.query(
          `INSERT INTO compras (tenant_id, id, proveedor_id, numero_factura, numero_control, fecha_emision, fecha_vencimiento, tipo_pago, subtotal, iva, total, monto_pendiente, estado) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [tenantId, cp.id, cp.proveedor_id, cp.numero_factura, cp.numero_control ?? null, cp.fecha_emision, cp.fecha_vencimiento, cp.tipo_pago, cp.subtotal ?? 0, cp.iva ?? 0, cp.total ?? 0, cp.monto_pendiente ?? 0, cp.estado ?? "Pendiente"]
        );
      }
    }

    // 7. Sync Ventas
    if (db.ventas) {
      await connection.query("DELETE FROM ventas WHERE tenant_id = ?", [tenantId]);
      for (const v of db.ventas) {
        await connection.query(
          `INSERT INTO ventas (tenant_id, id, factura_numero, cliente_id, cliente_nombre, tasa, monto_exento, base_imponible, monto_iva, monto_igtf, total_usd, total_bs, fecha, es_cerrado_z, sin_factura, descuento_usd, pagos, items) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            tenantId, v.id, v.factura_numero, v.cliente_id ?? null, v.cliente_nombre ?? null,
            v.tasa ?? 36.5, v.monto_exento ?? 0, v.base_imponible ?? 0, v.monto_iva ?? 0, v.monto_igtf ?? 0,
            v.total_usd ?? 0, v.total_bs ?? 0, v.fecha, v.es_cerrado_z ? 1 : 0,
            v.sin_factura ? 1 : 0, v.descuento_usd ?? 0,
            JSON.stringify(v.pagos || []), JSON.stringify(v.items || [])
          ]
        );
      }
    }

    // 8. Sync Cierres Z
    if (db.cierresZ) {
      await connection.query("DELETE FROM cierres_z WHERE tenant_id = ?", [tenantId]);
      for (const cz of db.cierresZ) {
        await connection.query(
          `INSERT INTO cierres_z (tenant_id, id, numero_z, fecha, hora_cierre, usuario, cantidad_ventas, total_exento_usd, total_base_usd, total_iva_usd, total_igtf_usd, gran_total_usd, gran_total_bs) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [tenantId, cz.id, cz.numero_z, cz.fecha, cz.hora_cierre, cz.usuario, cz.cantidad_ventas ?? 0, cz.total_exento_usd ?? 0, cz.total_base_usd ?? 0, cz.total_iva_usd ?? 0, cz.total_igtf_usd ?? 0, cz.gran_total_usd ?? 0, cz.gran_total_bs ?? 0]
        );
      }
    }

    // 9. Sync Logs
    if (db.logs) {
      await connection.query("DELETE FROM logs WHERE tenant_id = ?", [tenantId]);
      for (const log of db.logs) {
        await connection.query(
          `INSERT INTO logs (tenant_id, id, fecha, usuario, accion, detalle) VALUES (?, ?, ?, ?, ?, ?)`,
          [tenantId, log.id, log.fecha, log.usuario, log.accion, log.detalle ?? null]
        );
      }
    }

    // 10. Sync Usuarios
    if (db.usuarios) {
      await connection.query("DELETE FROM usuarios WHERE tenant_id = ?", [tenantId]);
      for (const u of db.usuarios) {
        await connection.query(
          `INSERT INTO usuarios (tenant_id, username, nombre, rol, contrasena) VALUES (?, ?, ?, ?, ?)`,
          [tenantId, u.username, u.nombre, u.rol, u.contrasena]
        );
      }
    }

    // 11. Sync Cierres Caja
    if (db.cierresCaja) {
      await connection.query("DELETE FROM cierres_caja WHERE tenant_id = ?", [tenantId]);
      for (const cc of db.cierresCaja) {
        await connection.query(
          `INSERT INTO cierres_caja (tenant_id, id, fecha, usuario, monto_dolares, monto_bolivares, detalle) 
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [tenantId, cc.id, cc.fecha, cc.usuario, cc.dolares ?? 0, cc.bolivares ?? 0, cc.detalle ? JSON.stringify(cc.detalle) : null]
        );
      }
    }

    // 12. Sync Pedidos
    if (db.pedidos) {
      await connection.query("DELETE FROM pedidos WHERE tenant_id = ?", [tenantId]);
      for (const pd of db.pedidos) {
        await connection.query(
          `INSERT INTO pedidos (tenant_id, id, nombres, apellidos, cedula, telefono, direccion, descripcion, imagenes, estado, fecha_pedido, fecha_entrega_estimada, fecha_entregado, monto_total, anticipo, saldo_pendiente, metodo_pago_anticipo, metodo_pago_saldo, anticipo_registrado, saldo_registrado, asignado_a, departamento_servicio, notas_operativas) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            tenantId, pd.id, pd.nombres, pd.apellidos ?? "", pd.cedula, pd.telefono ?? "", pd.direccion ?? null, pd.descripcion ?? null,
            JSON.stringify(pd.imagenes || []), pd.estado ?? "Pendiente", pd.fecha_pedido, pd.fecha_entrega_estimada ?? null, pd.fecha_entregado ?? null,
            pd.monto_total ?? 0, pd.anticipo ?? 0, pd.saldo_pendiente ?? 0, pd.metodo_pago_anticipo ?? null, pd.metodo_pago_saldo ?? null,
            pd.anticipo_registrado ? 1 : 0, pd.saldo_registrado ? 1 : 0,
            pd.asignado_a ?? null, pd.departamento_servicio ?? null, pd.notas_operativas ?? null
          ]
        );
      }
    }

    await connection.commit();
    console.log(`[MariaDB] Base de datos del tenant ${tenantId} guardada con éxito.`);
  } catch (err) {
    await connection.rollback();
    console.error(`[MariaDB] Fallo al guardar base de datos del tenant ${tenantId}, rollback realizado:`, err);
    throw err;
  } finally {
    connection.release();
  }
}

// Migrate everything from JSON to MariaDB in one click!
export async function migrateAllJSONToMariaDB(p: mysql.Pool): Promise<{ success: boolean; log: string[] }> {
  const log: string[] = [];
  log.push("Iniciando migración masiva de JSON a MariaDB...");

  try {
    await createTablesIfNotExist(p);
    log.push("✓ Tablas creadas/verificadas en la base de datos MariaDB.");

    // Load registered companies
    const companiesFile = path.join(DATA_DIR, "companies.json");
    if (!fs.existsSync(companiesFile)) {
      throw new Error("No se encontró el archivo de empresas maestras (companies.json)");
    }

    const companies = JSON.parse(fs.readFileSync(companiesFile, "utf8"));
    log.push(`Encontradas ${companies.length} empresas registradas en el sistema local.`);

    const connection = await p.getConnection();

    try {
      for (const company of companies) {
        log.push(`Procesando empresa: ${company.nombre} (${company.id})...`);

        // Insert or update company
        await connection.query(
          `INSERT INTO empresas (id, rif, nombre, telefono, direccion, creadaEn, estado) 
          VALUES (?, ?, ?, ?, ?, ?, ?) 
          ON DUPLICATE KEY UPDATE rif=?, nombre=?, telefono=?, direccion=?, creadaEn=?, estado=?`,
          [
            company.id, company.rif, company.nombre, company.telefono, company.direccion, company.creadaEn, company.estado,
            company.rif, company.nombre, company.telefono, company.direccion, company.creadaEn, company.estado
          ]
        );

        // Read tenant's JSON database
        const dbPath = path.join(DATA_DIR, `db_${company.id}.json`);
        if (fs.existsSync(dbPath)) {
          const raw = fs.readFileSync(dbPath, "utf8");
          const db = JSON.parse(raw);
          
          log.push(`- Leyendo db_${company.id}.json con:`);
          log.push(`  * ${db.productos?.length || 0} productos`);
          log.push(`  * ${db.clientes?.length || 0} clientes`);
          log.push(`  * ${db.proveedores?.length || 0} proveedores`);
          log.push(`  * ${db.ventas?.length || 0} ventas`);
          log.push(`  * ${db.pedidos?.length || 0} pedidos`);

          // Call saveTenantDBToMariaDB for this tenant to sync everything
          await saveTenantDBToMariaDB(p, company.id, db);
          log.push(`✓ Datos de empresa "${company.id}" migrados con éxito a MariaDB.`);
        } else {
          log.push(`⚠ El archivo db_${company.id}.json no existe. Se creó una empresa vacía.`);
        }
      }
    } finally {
      connection.release();
    }

    log.push("¡MIGRACIÓN COMPLETADA CON ÉXITO! 🎉 Todos los datos están seguros en MariaDB.");
    return { success: true, log };
  } catch (err: any) {
    console.error("[MariaDB] Error en migración masiva:", err);
    log.push(`❌ ERROR CRÍTICO durante la migración: ${err.message || err}`);
    return { success: false, log };
  }
}
