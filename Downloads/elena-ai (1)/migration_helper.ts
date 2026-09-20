import initSqlJs from "sql.js";
import mysql from "mysql2/promise";
import path from "path";

export interface ColumnMapping {
  [targetColumn: string]: string; // target -> source
}

export interface TableMapping {
  sourceTable: string;
  targetTable: string;
  columns: ColumnMapping;
  defaultValues?: { [key: string]: any };
}

export interface MigrationConfig {
  clearTarget: boolean;
  tables: TableMapping[];
}

export interface MigrationTableResult {
  name: string;
  rowsFound: number;
  rowsMigrated: number;
  rowsFailed: number;
  errors: string[];
}

export interface MigrationSummary {
  success: boolean;
  tables: MigrationTableResult[];
  error?: string;
}

// Order of tables to ensure referential integrity (foreign keys) during insertion
export const TABLE_INSERTION_ORDER = [
  "empresas",
  "usuarios",
  "categorias_comerciales",
  "clientes",
  "proveedores",
  "productos",
  "compras",
  "ventas",
  "cierres_z",
  "cierres_caja",
  "pedidos",
  "logs"
];

/**
 * Parses a values string from an INSERT INTO statement character by character.
 * Handles nested commas, single/double quotes, and escaped characters.
 */
export function parseSqlInsertValues(valuesStr: string): string[][] {
  const allTuples: string[][] = [];
  let currentTuple: string[] = [];
  let currentValue = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escape = false;
  let depth = 0;

  for (let i = 0; i < valuesStr.length; i++) {
    const char = valuesStr[i];

    if (escape) {
      currentValue += char;
      escape = false;
      continue;
    }

    if (char === "\\") {
      escape = true;
      currentValue += char;
      continue;
    }

    if (char === "'" && !inDoubleQuote) {
      if (inSingleQuote && i + 1 < valuesStr.length && valuesStr[i + 1] === "'") {
        currentValue += "'";
        i++; // skip second single quote
        continue;
      }
      inSingleQuote = !inSingleQuote;
      currentValue += char;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      currentValue += char;
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote) {
      if (char === "(") {
        depth++;
        if (depth === 1) {
          currentTuple = [];
          currentValue = "";
        } else {
          currentValue += char;
        }
        continue;
      }

      if (char === ")") {
        depth--;
        if (depth === 0) {
          currentTuple.push(currentValue.trim());
          allTuples.push(currentTuple);
          currentTuple = [];
          currentValue = "";
        } else {
          currentValue += char;
        }
        continue;
      }

      if (char === "," && depth === 1) {
        currentTuple.push(currentValue.trim());
        currentValue = "";
        continue;
      }
    }

    if (depth > 0) {
      currentValue += char;
    }
  }

  // Clean values (strip outer quotes, translate NULLs)
  return allTuples.map(row => 
    row.map(val => {
      let cleaned = val.trim();
      if (cleaned.toUpperCase() === "NULL") {
        return null as any;
      }
      // Strip wrapping quotes
      if ((cleaned.startsWith("'") && cleaned.endsWith("'")) || (cleaned.startsWith('"') && cleaned.endsWith('"'))) {
        cleaned = cleaned.slice(1, -1);
        // Unescape internal quotes
        cleaned = cleaned.replace(/\\'/g, "'").replace(/\\"/g, '"');
      }
      return cleaned;
    })
  );
}

/**
 * Parses SQL file text and extracts tables, columns, row counts and sample rows.
 */
export function parseSqlDump(sqlText: string) {
  const tablesMap = new Map<string, { columns: string[]; rows: any[][] }>();

  // Regular expression to find INSERT INTO statements
  // Captures: 1. table name, 2. column list (optional), 3. values block
  const insertRegex = /INSERT\s+INTO\s+[`"']?([a-zA-Z0-9_\-]+)[`"']?\s*(?:\(([^)]+)\))?\s+VALUES\s*([\s\S]*?)(?:;|\s*INSERT\s+INTO\s+|$)/gi;

  let match;
  while ((match = insertRegex.exec(sqlText)) !== null) {
    const tableName = match[1].toLowerCase();
    const colsStr = match[2];
    const valsStr = match[3];

    // Parse columns
    let columns: string[] = [];
    if (colsStr) {
      columns = colsStr.split(",").map(c => c.trim().replace(/[`"']/g, ""));
    }

    // Parse value tuples
    const parsedRows = parseSqlInsertValues(valsStr);
    if (parsedRows.length === 0) continue;

    // If no columns specified, auto-create column names (col_0, col_1, ...)
    if (columns.length === 0) {
      columns = Array.from({ length: parsedRows[0].length }, (_, idx) => `col_${idx}`);
    }

    if (!tablesMap.has(tableName)) {
      tablesMap.set(tableName, { columns, rows: [] });
    }

    const tableData = tablesMap.get(tableName)!;
    tableData.rows.push(...parsedRows);
  }

  // Build the output structure
  const tablesList: any[] = [];
  tablesMap.forEach((data, name) => {
    // Generate sample rows as objects
    const sampleRows = data.rows.slice(0, 3).map(row => {
      const obj: { [key: string]: any } = {};
      data.columns.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return obj;
    });

    tablesList.push({
      name,
      columns: data.columns,
      sampleRows,
      rowCount: data.rows.length,
      allRowsRaw: data.rows // stored to be used in migration execution
    });
  });

  return tablesList;
}

/**
 * Loads SQLite file buffer using sql.js and inspects all tables/columns.
 */
export async function parseSQLiteFile(fileBuffer: Buffer) {
  const SQL = await initSqlJs({
    locateFile: (file) => {
      return path.join(process.cwd(), "node_modules", "sql.js", "dist", file);
    }
  });

  const db = new SQL.Database(fileBuffer);
  
  // Fetch user tables
  const tablesQueryResult = db.exec(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'drizzle_%'
  `);

  if (tablesQueryResult.length === 0) {
    db.close();
    return [];
  }

  const tableNames = tablesQueryResult[0].values.map(v => v[0] as string);
  const tablesList: any[] = [];

  for (const tableName of tableNames) {
    // Fetch column details
    const colQueryResult = db.exec(`PRAGMA table_info(\`${tableName}\`)`);
    const columns: string[] = [];
    if (colQueryResult.length > 0) {
      // PRAGMA table_info returns: cid, name, type, notnull, dflt_value, pk
      colQueryResult[0].values.forEach(row => {
        columns.push(row[1] as string);
      });
    }

    // Fetch row count
    let rowCount = 0;
    try {
      const countResult = db.exec(`SELECT COUNT(*) FROM \`${tableName}\``);
      if (countResult.length > 0) {
        rowCount = countResult[0].values[0][0] as number;
      }
    } catch {}

    // Fetch sample rows (first 3)
    let sampleRows: any[] = [];
    let allRows: any[] = [];
    try {
      const rowsResult = db.exec(`SELECT * FROM \`${tableName}\``);
      if (rowsResult.length > 0) {
        const colNames = rowsResult[0].columns;
        allRows = rowsResult[0].values.map(v => {
          const obj: { [key: string]: any } = {};
          colNames.forEach((col, idx) => {
            obj[col] = v[idx];
          });
          return obj;
        });
        sampleRows = allRows.slice(0, 3);
      }
    } catch {}

    tablesList.push({
      name: tableName,
      columns,
      sampleRows,
      rowCount,
      allRows // stored to be used in migration execution
    });
  }

  db.close();
  return tablesList;
}

/**
 * Execute migration to MariaDB for the current active tenant
 */
export async function executeMigration(
  pool: mysql.Pool,
  tenantId: string,
  fileBuffer: Buffer,
  isSqlDump: boolean,
  config: MigrationConfig
): Promise<MigrationSummary> {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Load source data
    let sourceTables: any[] = [];
    if (isSqlDump) {
      const sqlText = fileBuffer.toString("utf8");
      sourceTables = parseSqlDump(sqlText);
    } else {
      sourceTables = await parseSQLiteFile(fileBuffer);
    }

    const tableResults: MigrationTableResult[] = [];

    // Map sourceTables list into a quick lookup map by name
    const sourceTablesMap = new Map<string, any>();
    sourceTables.forEach(t => {
      sourceTablesMap.set(t.name.toLowerCase(), t);
    });

    // Disable foreign key checks momentarily to allow safe clears and robust transaction insertions
    await connection.query("SET FOREIGN_KEY_CHECKS = 0");

    // 2. Perform clears in REVERSE order of tables to respect referential bounds
    if (config.clearTarget) {
      const reverseOrder = [...TABLE_INSERTION_ORDER].reverse();
      for (const targetTable of reverseOrder) {
        const mappedConfig = config.tables.find(t => t.targetTable === targetTable);
        if (mappedConfig) {
          // Clear only rows of the active tenant! Keep multi-tenancy safe and sound
          await connection.query(`DELETE FROM \`${targetTable}\` WHERE tenant_id = ?`, [tenantId]);
          console.log(`[Migrador] Limpiada tabla ${targetTable} para el tenant ${tenantId}`);
        }
      }
    }

    // Ensure our active tenant exists in 'empresas' before insertions
    const [empRows]: any = await connection.query("SELECT * FROM empresas WHERE id = ?", [tenantId]);
    if (empRows.length === 0) {
      await connection.query(
        "INSERT INTO empresas (id, rif, nombre, telefono, direccion, creadaEn, estado) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [tenantId, "J-00000000-0", "Elena Empresa Sincronizada", "", "", new Date().toISOString(), "activa"]
      );
    }

    // 3. Process tables in topological INSERTION order
    for (const targetTable of TABLE_INSERTION_ORDER) {
      // Find mapping config for this targetTable
      const mapping = config.tables.find(t => t.targetTable === targetTable);
      if (!mapping) continue;

      const sourceTableObj = sourceTablesMap.get(mapping.sourceTable.toLowerCase());
      if (!sourceTableObj) {
        tableResults.push({
          name: targetTable,
          rowsFound: 0,
          rowsMigrated: 0,
          rowsFailed: 0,
          errors: [`No se encontró la tabla origen "${mapping.sourceTable}" en el archivo subido.`]
        });
        continue;
      }

      let rowsToMigrate: any[] = [];
      if (isSqlDump) {
        // Construct array of objects from allRowsRaw and columns list
        const cols = sourceTableObj.columns;
        rowsToMigrate = sourceTableObj.allRowsRaw.map((rawRow: any[]) => {
          const obj: { [key: string]: any } = {};
          cols.forEach((col: string, idx: number) => {
            obj[col] = rawRow[idx];
          });
          return obj;
        });
      } else {
        rowsToMigrate = sourceTableObj.allRows;
      }

      let rowsMigrated = 0;
      let rowsFailed = 0;
      const errors: string[] = [];

      // Process each row
      for (const srcRow of rowsToMigrate) {
        try {
          const targetRow: { [key: string]: any } = {};

          // Apply mapping
          Object.entries(mapping.columns).forEach(([tgtCol, srcCol]) => {
            if (srcCol && srcRow[srcCol] !== undefined) {
              targetRow[tgtCol] = srcRow[srcCol];
            }
          });

          // Apply default values
          if (mapping.defaultValues) {
            Object.entries(mapping.defaultValues).forEach(([tgtCol, defaultVal]) => {
              if (targetRow[tgtCol] === undefined || targetRow[tgtCol] === null) {
                targetRow[tgtCol] = defaultVal;
              }
            });
          }

          // Enforce active tenant_id (crucial)
          targetRow.tenant_id = tenantId;

          // Format clean fields depending on database target schema types
          if (targetTable === "productos") {
            targetRow.se_vende_por_peso = targetRow.se_vende_por_peso === true || parseInt(targetRow.se_vende_por_peso) === 1 ? 1 : 0;
            targetRow.precio_compra = parseFloat(targetRow.precio_compra || 0);
            targetRow.precio_venta = parseFloat(targetRow.precio_venta || 0);
            targetRow.stock = parseInt(targetRow.stock || 0, 10);
            targetRow.unidades_bulto = (targetRow.unidades_bulto !== undefined && targetRow.unidades_bulto !== null) ? parseInt(targetRow.unidades_bulto, 10) : null;
            targetRow.costo_bulto = (targetRow.costo_bulto !== undefined && targetRow.costo_bulto !== null) ? parseFloat(targetRow.costo_bulto) : null;
            targetRow.ganancia_perc = parseInt(targetRow.ganancia_perc || 30, 10);
            if (targetRow.atributos) {
              targetRow.atributos = typeof targetRow.atributos === "string" ? targetRow.atributos : JSON.stringify(targetRow.atributos);
            } else {
              targetRow.atributos = null;
            }
          } else if (targetTable === "clientes") {
            targetRow.saldo_pendiente = parseFloat(targetRow.saldo_pendiente || 0);
            targetRow.dias_ultimo_pago = (targetRow.dias_ultimo_pago !== undefined && targetRow.dias_ultimo_pago !== null) ? parseInt(targetRow.dias_ultimo_pago, 10) : null;
          } else if (targetTable === "proveedores") {
            targetRow.dias_credito = parseInt(targetRow.dias_credito || 0, 10);
            targetRow.saldo = parseFloat(targetRow.saldo || 0);
          } else if (targetTable === "compras") {
            targetRow.subtotal = parseFloat(targetRow.subtotal || 0);
            targetRow.iva = parseFloat(targetRow.iva || 0);
            targetRow.total = parseFloat(targetRow.total || 0);
            targetRow.monto_pendiente = parseFloat(targetRow.monto_pendiente || 0);
          } else if (targetTable === "ventas") {
            targetRow.tasa = parseFloat(targetRow.tasa || 36.5);
            targetRow.monto_exento = parseFloat(targetRow.monto_exento || 0);
            targetRow.base_imponible = parseFloat(targetRow.base_imponible || 0);
            targetRow.monto_iva = parseFloat(targetRow.monto_iva || 0);
            targetRow.monto_igtf = parseFloat(targetRow.monto_igtf || 0);
            targetRow.total_usd = parseFloat(targetRow.total_usd || 0);
            targetRow.total_bs = parseFloat(targetRow.total_bs || 0);
            targetRow.descuento_usd = parseFloat(targetRow.descuento_usd || 0);
            targetRow.es_cerrado_z = targetRow.es_cerrado_z === true || parseInt(targetRow.es_cerrado_z) === 1 ? 1 : 0;
            targetRow.sin_factura = targetRow.sin_factura === true || parseInt(targetRow.sin_factura) === 1 ? 1 : 0;
            
            // Format payments & items as clean strings/JSON
            if (targetRow.pagos) {
              targetRow.pagos = typeof targetRow.pagos === "string" ? targetRow.pagos : JSON.stringify(targetRow.pagos);
            } else {
              targetRow.pagos = "[]";
            }
            if (targetRow.items) {
              targetRow.items = typeof targetRow.items === "string" ? targetRow.items : JSON.stringify(targetRow.items);
            } else {
              targetRow.items = "[]";
            }
          } else if (targetTable === "cierres_z") {
            targetRow.cantidad_ventas = parseInt(targetRow.cantidad_ventas || 0, 10);
            targetRow.total_exento_usd = parseFloat(targetRow.total_exento_usd || 0);
            targetRow.total_base_usd = parseFloat(targetRow.total_base_usd || 0);
            targetRow.total_iva_usd = parseFloat(targetRow.total_iva_usd || 0);
            targetRow.total_igtf_usd = parseFloat(targetRow.total_igtf_usd || 0);
            targetRow.gran_total_usd = parseFloat(targetRow.gran_total_usd || 0);
            targetRow.gran_total_bs = parseFloat(targetRow.gran_total_bs || 0);
          } else if (targetTable === "cierres_caja") {
            targetRow.monto_dolares = parseFloat(targetRow.monto_dolares || 0);
            targetRow.monto_bolivares = parseFloat(targetRow.monto_bolivares || 0);
            if (targetRow.detalle) {
              targetRow.detalle = typeof targetRow.detalle === "string" ? targetRow.detalle : JSON.stringify(targetRow.detalle);
            } else {
              targetRow.detalle = null;
            }
          } else if (targetTable === "pedidos") {
            targetRow.monto_total = parseFloat(targetRow.monto_total || 0);
            targetRow.anticipo = parseFloat(targetRow.anticipo || 0);
            targetRow.saldo_pendiente = parseFloat(targetRow.saldo_pendiente || 0);
            targetRow.anticipo_registrado = targetRow.anticipo_registrado === true || parseInt(targetRow.anticipo_registrado) === 1 ? 1 : 0;
            targetRow.saldo_registrado = targetRow.saldo_registrado === true || parseInt(targetRow.saldo_registrado) === 1 ? 1 : 0;
          }

          // Build dynamic insert query
          const columns = Object.keys(targetRow);
          const placeholders = columns.map(() => "?").join(", ");
          // Ensure undefined values in parameters become null
          const values = Object.values(targetRow).map(val => val ?? null);

          // We use INSERT INTO ... ON DUPLICATE KEY UPDATE to allow resume / update capabilities
          const updateAssignments = columns
            .filter(col => col !== "tenant_id" && col !== "id" && col !== "cedula" && col !== "username")
            .map(col => `\`${col}\` = VALUES(\`${col}\`)`)
            .join(", ");

          let query = `INSERT INTO \`${targetTable}\` (${columns.map(c => `\`${c}\``).join(", ")}) VALUES (${placeholders})`;
          if (updateAssignments.length > 0) {
            query += ` ON DUPLICATE KEY UPDATE ${updateAssignments}`;
          }

          await connection.query(query, values);
          rowsMigrated++;
        } catch (rowErr: any) {
          rowsFailed++;
          if (errors.length < 5) {
            errors.push(`Error en fila ${rowsMigrated + rowsFailed}: ${rowErr.message}`);
          }
        }
      }

      tableResults.push({
        name: targetTable,
        rowsFound: rowsToMigrate.length,
        rowsMigrated,
        rowsFailed,
        errors
      });
    }

    await connection.commit();

    return {
      success: true,
      tables: tableResults
    };
  } catch (err: any) {
    if (connection) {
      try { await connection.rollback(); } catch {}
    }
    console.error("[Migrador] Error general de migración:", err);
    return {
      success: false,
      tables: [],
      error: err.message || "Error fatal en el motor de migración relacional."
    };
  } finally {
    if (connection && typeof connection.release === "function") {
      try {
        await connection.query("SET FOREIGN_KEY_CHECKS = 1").catch(() => {});
        connection.release();
      } catch {}
    }
  }
}

/**
 * Execute migration to the local JSON database
 */
export async function executeLocalMigration(
  currentDB: any,
  fileBuffer: Buffer,
  isSqlDump: boolean,
  config: MigrationConfig
): Promise<{ success: boolean; tables: MigrationTableResult[]; updatedDB: any; error?: string }> {
  try {
    // 1. Load source data
    let sourceTables: any[] = [];
    if (isSqlDump) {
      const sqlText = fileBuffer.toString("utf8");
      sourceTables = parseSqlDump(sqlText);
    } else {
      sourceTables = await parseSQLiteFile(fileBuffer);
    }

    const tableResults: MigrationTableResult[] = [];

    // Map sourceTables list into a quick lookup map by name
    const sourceTablesMap = new Map<string, any>();
    sourceTables.forEach(t => {
      sourceTablesMap.set(t.name.toLowerCase(), t);
    });

    const updatedDB = { ...currentDB };

    // Mapping target tables to LocalDB structure keys
    const TABLE_TO_JSON_KEY: { [key: string]: string } = {
      usuarios: "usuarios",
      categorias_comerciales: "categoriasComerciales",
      clientes: "clientes",
      proveedores: "proveedores",
      productos: "productos",
      compras: "compras",
      ventas: "ventas",
      cierres_z: "cierresZ",
      cierres_caja: "cierresCaja",
      pedidos: "pedidos",
      logs: "logs"
    };

    // 2. Clear target tables if requested
    if (config.clearTarget) {
      for (const targetTable of TABLE_INSERTION_ORDER) {
        const mappedConfig = config.tables.find(t => t.targetTable === targetTable);
        if (mappedConfig) {
          const jsonKey = TABLE_TO_JSON_KEY[targetTable];
          if (jsonKey && updatedDB[jsonKey]) {
            updatedDB[jsonKey] = [];
            console.log(`[Migrador Local] Limpiada tabla JSON ${jsonKey}`);
          }
        }
      }
    }

    // Helper to safely parse JSON strings
    const safeParseJSON = (str: any, fallback: any = []) => {
      if (typeof str === "object") return str;
      if (!str) return fallback;
      try {
        return JSON.parse(str);
      } catch {
        return fallback;
      }
    };

    // 3. Process tables in topological order
    for (const targetTable of TABLE_INSERTION_ORDER) {
      const mapping = config.tables.find(t => t.targetTable === targetTable);
      if (!mapping) continue;

      const sourceTableObj = sourceTablesMap.get(mapping.sourceTable.toLowerCase());
      if (!sourceTableObj) {
        tableResults.push({
          name: targetTable,
          rowsFound: 0,
          rowsMigrated: 0,
          rowsFailed: 0,
          errors: [`No se encontró la tabla origen "${mapping.sourceTable}" en el archivo subido.`]
        });
        continue;
      }

      const jsonKey = TABLE_TO_JSON_KEY[targetTable];
      if (!jsonKey) continue;
      if (!updatedDB[jsonKey]) {
        updatedDB[jsonKey] = [];
      }

      let rowsToMigrate: any[] = [];
      if (isSqlDump) {
        const cols = sourceTableObj.columns;
        rowsToMigrate = sourceTableObj.allRowsRaw.map((rawRow: any[]) => {
          const obj: { [key: string]: any } = {};
          cols.forEach((col: string, idx: number) => {
            obj[col] = rawRow[idx];
          });
          return obj;
        });
      } else {
        rowsToMigrate = sourceTableObj.allRows;
      }

      let rowsMigrated = 0;
      let rowsFailed = 0;
      const errors: string[] = [];

      for (const srcRow of rowsToMigrate) {
        try {
          const targetRow: { [key: string]: any } = {};

          // Apply mapping
          Object.entries(mapping.columns).forEach(([tgtCol, srcCol]) => {
            if (srcCol && srcRow[srcCol] !== undefined) {
              targetRow[tgtCol] = srcRow[srcCol];
            }
          });

          // Apply default values
          if (mapping.defaultValues) {
            Object.entries(mapping.defaultValues).forEach(([tgtCol, defaultVal]) => {
              if (targetRow[tgtCol] === undefined || targetRow[tgtCol] === null) {
                targetRow[tgtCol] = defaultVal;
              }
            });
          }

          // Format fields
          if (targetTable === "productos") {
            targetRow.se_vende_por_peso = targetRow.se_vende_por_peso === true || parseInt(targetRow.se_vende_por_peso) === 1 ? 1 : 0;
            targetRow.precio_compra = parseFloat(targetRow.precio_compra || 0);
            targetRow.precio_venta = parseFloat(targetRow.precio_venta || 0);
            targetRow.stock = parseInt(targetRow.stock || 0, 10);
            targetRow.unidades_bulto = targetRow.unidades_bulto ? parseInt(targetRow.unidades_bulto, 10) : null;
            targetRow.costo_bulto = targetRow.costo_bulto ? parseFloat(targetRow.costo_bulto) : null;
            targetRow.ganancia_perc = parseInt(targetRow.ganancia_perc || 30, 10);
            targetRow.atributos = safeParseJSON(targetRow.atributos, null);
          } else if (targetTable === "clientes") {
            targetRow.saldo_pendiente = parseFloat(targetRow.saldo_pendiente || 0);
            targetRow.dias_ultimo_pago = targetRow.dias_ultimo_pago ? parseInt(targetRow.dias_ultimo_pago, 10) : null;
          } else if (targetTable === "proveedores") {
            targetRow.dias_credito = parseInt(targetRow.dias_credito || 0, 10);
            targetRow.saldo = parseFloat(targetRow.saldo || 0);
          } else if (targetTable === "compras") {
            targetRow.subtotal = parseFloat(targetRow.subtotal || 0);
            targetRow.iva = parseFloat(targetRow.iva || 0);
            targetRow.total = parseFloat(targetRow.total || 0);
            targetRow.monto_pendiente = parseFloat(targetRow.monto_pendiente || 0);
          } else if (targetTable === "ventas") {
            targetRow.tasa = parseFloat(targetRow.tasa || 36.5);
            targetRow.monto_exento = parseFloat(targetRow.monto_exento || 0);
            targetRow.base_imponible = parseFloat(targetRow.base_imponible || 0);
            targetRow.monto_iva = parseFloat(targetRow.monto_iva || 0);
            targetRow.monto_igtf = parseFloat(targetRow.monto_igtf || 0);
            targetRow.total_usd = parseFloat(targetRow.total_usd || 0);
            targetRow.total_bs = parseFloat(targetRow.total_bs || 0);
            targetRow.descuento_usd = parseFloat(targetRow.descuento_usd || 0);
            targetRow.es_cerrado_z = targetRow.es_cerrado_z === true || parseInt(targetRow.es_cerrado_z) === 1 ? 1 : 0;
            targetRow.sin_factura = targetRow.sin_factura === true || parseInt(targetRow.sin_factura) === 1 ? 1 : 0;
            targetRow.pagos = safeParseJSON(targetRow.pagos, []);
            targetRow.items = safeParseJSON(targetRow.items, []);
          } else if (targetTable === "cierres_z") {
            targetRow.cantidad_ventas = parseInt(targetRow.cantidad_ventas || 0, 10);
            targetRow.total_exento_usd = parseFloat(targetRow.total_exento_usd || 0);
            targetRow.total_base_usd = parseFloat(targetRow.total_base_usd || 0);
            targetRow.total_iva_usd = parseFloat(targetRow.total_iva_usd || 0);
            targetRow.total_igtf_usd = parseFloat(targetRow.total_igtf_usd || 0);
            targetRow.gran_total_usd = parseFloat(targetRow.gran_total_usd || 0);
            targetRow.gran_total_bs = parseFloat(targetRow.gran_total_bs || 0);
          } else if (targetTable === "cierres_caja") {
            targetRow.monto_dolares = parseFloat(targetRow.monto_dolares || 0);
            targetRow.monto_bolivares = parseFloat(targetRow.monto_bolivares || 0);
            targetRow.detalle = safeParseJSON(targetRow.detalle, null);
          } else if (targetTable === "pedidos") {
            targetRow.monto_total = parseFloat(targetRow.monto_total || 0);
            targetRow.anticipo = parseFloat(targetRow.anticipo || 0);
            targetRow.saldo_pendiente = parseFloat(targetRow.saldo_pendiente || 0);
            targetRow.anticipo_registrado = targetRow.anticipo_registrado === true || parseInt(targetRow.anticipo_registrado) === 1 ? 1 : 0;
            targetRow.saldo_registrado = targetRow.saldo_registrado === true || parseInt(targetRow.saldo_registrado) === 1 ? 1 : 0;
          }

          // Merge into current JSON DB array (upsert)
          // Find unique key field name based on table
          let keyField = "id";
          if (targetTable === "usuarios") keyField = "username";
          if (targetTable === "clientes") keyField = "cedula";
          if (targetTable === "proveedores" && targetRow.id === undefined && targetRow.rif) keyField = "rif";

          const keyVal = targetRow[keyField];
          if (keyVal !== undefined && keyVal !== null) {
            const idx = updatedDB[jsonKey].findIndex((item: any) => String(item[keyField]) === String(keyVal));
            if (idx >= 0) {
              updatedDB[jsonKey][idx] = { ...updatedDB[jsonKey][idx], ...targetRow };
            } else {
              updatedDB[jsonKey].push(targetRow);
            }
          } else {
            // No unique key found or generated, just push it
            updatedDB[jsonKey].push(targetRow);
          }

          rowsMigrated++;
        } catch (rowErr: any) {
          rowsFailed++;
          if (errors.length < 5) {
            errors.push(`Error en fila ${rowsMigrated + rowsFailed}: ${rowErr.message}`);
          }
        }
      }

      tableResults.push({
        name: targetTable,
        rowsFound: rowsToMigrate.length,
        rowsMigrated,
        rowsFailed,
        errors
      });
    }

    return {
      success: true,
      tables: tableResults,
      updatedDB
    };
  } catch (err: any) {
    console.error("[Migrador Local] Error general:", err);
    return {
      success: false,
      tables: [],
      error: err.message || "Error fatal en el motor de migración local JSON."
    } as any;
  }
}
