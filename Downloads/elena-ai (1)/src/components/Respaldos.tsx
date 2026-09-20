import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  HardDrive, 
  FolderSync, 
  Download, 
  RefreshCw, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  FileJson, 
  Plus, 
  Database, 
  Info,
  Server,
  Check,
  X,
  Upload,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  FileText,
  PlayCircle,
  Cloud
} from "lucide-react";
import { apiFetch } from "../utils/api";
import SupabaseBackupPanel from "./SupabaseBackupPanel";

interface BackupFile {
  filename: string;
  size: number;
  createdAt: string;
}

interface BackupConfig {
  rutaSecundaria: string;
  autoRespaldarEnVenta: boolean;
  ultimoRespaldo: string;
}

// Meta-data of target tables we support for external migrations
const TARGET_TABLES_METADATA = [
  {
    id: "productos",
    name: "Catálogo de Productos / Inventario",
    icon: Database,
    description: "Catálogo maestro de medicamentos, cosméticos, y productos de tu farmacia/local.",
    columns: [
      { id: "id", label: "ID Único (Opcional, se autogenera si no se asocia)", required: false, type: "string", autoMatches: ["id", "prod_id", "codigo", "codigo_barra"] },
      { id: "codigo", label: "Código de Barras / Código Interno", required: true, type: "string", autoMatches: ["codigo", "codigo_barra", "barcode", "cod", "cod_bar", "cod_barra"] },
      { id: "nombre", label: "Descripción / Nombre del Producto", required: true, type: "string", autoMatches: ["nombre", "descripcion", "descrip", "name", "articulo", "art_descrip"] },
      { id: "categoria", label: "Categoría / Rubro", required: true, type: "string", autoMatches: ["categoria", "rubro", "grupo", "departamento", "family", "subgrupo"] },
      { id: "precio_compra", label: "Precio de Compra (Costo USD)", required: false, type: "number", autoMatches: ["precio_compra", "costo", "costo_usd", "precio_costo", "compra"] },
      { id: "precio_venta", label: "Precio de Venta al Público (USD)", required: true, type: "number", autoMatches: ["precio_venta", "precio", "p_venta", "precio_publico", "precio1"] },
      { id: "stock", label: "Stock / Existencia Actual", required: true, type: "number", autoMatches: ["stock", "existencia", "cantidad", "cant", "stock_actual"] },
      { id: "unidades_bulto", label: "Unidades por Bulto / Caja", required: false, type: "number", autoMatches: ["unidades_bulto", "bulto", "empaque", "unidades_caja"] },
      { id: "costo_bulto", label: "Costo por Bulto", required: false, type: "number", autoMatches: ["costo_bulto", "costo_bulto_usd", "precio_bulto"] },
      { id: "ganancia_perc", label: "Porcentaje de Ganancia (%)", required: false, type: "number", defaultValue: 30, autoMatches: ["ganancia_perc", "margen", "utilidad"] },
      { id: "se_vende_por_peso", label: "Se vende por peso (0 = No, 1 = Sí)", required: false, type: "number", defaultValue: 0, autoMatches: ["por_peso", "se_vende_por_peso", "pesado", "balanza"] }
    ]
  },
  {
    id: "clientes",
    name: "Directorio de Clientes",
    icon: ShieldCheck,
    description: "Cuentas de clientes, historial de crédito y datos de contacto.",
    columns: [
      { id: "cedula", label: "Cédula de Identidad / RIF", required: true, type: "string", autoMatches: ["cedula", "rif", "dni", "ci", "identificacion", "id_cliente"] },
      { id: "nombre", label: "Nombre", required: true, type: "string", autoMatches: ["nombre", "first_name", "nombre_cliente", "names"] },
      { id: "apellido", label: "Apellido", required: true, type: "string", autoMatches: ["apellido", "last_name", "apellidos"] },
      { id: "telefono", label: "Teléfono de Contacto", required: false, type: "string", autoMatches: ["telefono", "celular", "phone", "tel"] },
      { id: "direccion", label: "Dirección de Domicilio", required: false, type: "string", autoMatches: ["direccion", "address", "domicilio"] },
      { id: "saldo_pendiente", label: "Saldo Pendiente (Deuda USD)", required: false, type: "number", defaultValue: 0, autoMatches: ["saldo_pendiente", "deuda", "saldo", "balance"] }
    ]
  },
  {
    id: "proveedores",
    name: "Proveedores",
    icon: HardDrive,
    description: "Laboratorios, droguerías y distribuidores de mercancía.",
    columns: [
      { id: "id", label: "ID Único del Proveedor (Opcional)", required: false, type: "string", autoMatches: ["id", "id_proveedor", "codigo_prov"] },
      { id: "rif", label: "RIF del Proveedor", required: true, type: "string", autoMatches: ["rif", "rif_proveedor", "nit", "tax_id"] },
      { id: "razon_social", label: "Razón Social / Nombre Comercial", required: true, type: "string", autoMatches: ["razon_social", "nombre", "proveedor", "descripcion", "company"] },
      { id: "telefono", label: "Teléfono", required: false, type: "string", autoMatches: ["telefono", "tel", "phone"] },
      { id: "correo", label: "Correo Electrónico", required: false, type: "string", autoMatches: ["correo", "email", "mail"] },
      { id: "direccion", label: "Dirección Fiscal", required: false, type: "string", autoMatches: ["direccion", "address"] },
      { id: "dias_credito", label: "Días de Crédito Otorgados", required: false, type: "number", defaultValue: 0, autoMatches: ["dias_credito", "credito_dias", "dias_pago"] },
      { id: "saldo", label: "Saldo Pendiente (Tu deuda con ellos)", required: false, type: "number", defaultValue: 0, autoMatches: ["saldo", "deuda", "balance"] }
    ]
  },
  {
    id: "categorias_comerciales",
    name: "Rubros / Categorías",
    icon: FolderSync,
    description: "Rubros y subcategorías comerciales de los productos.",
    columns: [
      { id: "id", label: "Código de Categoría", required: true, type: "string", autoMatches: ["id", "id_categoria", "codigo_cat"] },
      { id: "nombre", label: "Nombre de la Categoría", required: true, type: "string", autoMatches: ["nombre", "categoria", "descripcion", "name"] },
      { id: "descripcion", label: "Descripción Ampliada", required: false, type: "string", autoMatches: ["descripcion", "detalle", "info"] }
    ]
  }
];

export default function Respaldos() {
  const [subTab, setSubTab] = useState<"json" | "supabase" | "mariadb" | "custom_migration">("json");
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [config, setConfig] = useState<BackupConfig>({
    rutaSecundaria: "",
    autoRespaldarEnVenta: false,
    ultimoRespaldo: ""
  });
  const [cargandoBackups, setCargandoBackups] = useState(false);
  const [guardandoConfig, setGuardandoConfig] = useState(false);
  const [creandoBackup, setCreandoBackup] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "exito" | "error" | "info"; texto: string } | null>(null);

  // MariaDB Specific State
  const [dbConfig, setDbConfig] = useState({
    host: "localhost",
    port: 3306,
    user: "root",
    password: "",
    database: "elena_pro",
    enabled: false
  });
  const [probandoConexion, setProbandoConexion] = useState(false);
  const [guardandoDbConfig, setGuardandoDbConfig] = useState(false);
  const [migrandoDb, setMigrandoDb] = useState(false);
  const [migrationLog, setMigrationLog] = useState<string[]>([]);
  const [dbTablesStatus, setDbTablesStatus] = useState<{
    connected: boolean;
    database?: string;
    tables: { name: string; count: number }[];
    error?: string;
  } | null>(null);
  const [cargandoTablasStatus, setCargandoTablasStatus] = useState(false);

  // --- Estados de Migración Personalizada (SQL / SQLite) ---
  const [migrateFile, setMigrateFile] = useState<File | null>(null);
  const [analyzingFile, setAnalyzingFile] = useState(false);
  const [sourceData, setSourceData] = useState<{ type: "sql" | "sqlite"; tables: any[] } | null>(null);
  const [selectedTables, setSelectedTables] = useState<{ [targetTable: string]: { enabled: boolean; sourceTable: string; columns: { [targetCol: string]: string }; defaultValues?: { [key: string]: any } } }>({});
  const [expandedTargetTable, setExpandedTargetTable] = useState<string | null>("productos");
  const [executingCustomMigrate, setExecutingCustomMigrate] = useState(false);
  const [customMigrateLog, setCustomMigrateLog] = useState<string[]>([]);
  const [customMigrateResult, setCustomMigrateResult] = useState<any>(null);
  const [clearTarget, setClearTarget] = useState(false);
  const [base64FileContent, setBase64FileContent] = useState<string | null>(null);

  const analizarArchivoMigracion = async (file: File) => {
    setMigrateFile(file);
    setAnalyzingFile(true);
    setSourceData(null);
    setCustomMigrateResult(null);
    setCustomMigrateLog([]);
    setMensaje(null);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          if (!content) throw new Error("No se pudo leer el archivo.");
          const base64Data = content.split(",")[1];
          setBase64FileContent(base64Data);

          const res = await apiFetch("/api/migrate/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileName: file.name, fileContent: base64Data })
          });

          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || "Fallo en el análisis del archivo.");
          }

          const data = await res.json();
          setSourceData({ type: data.type, tables: data.tables });
          
          // Inicializar mapeos automatizados con inteligencia de nombres similares
          inicializarMapeosAutomáticos(data.tables);
          setMensaje({ tipo: "exito", texto: `Archivo "${file.name}" cargado y analizado con éxito. Se detectaron ${data.tables.length} tablas en el archivo de origen.` });
        } catch (innerErr: any) {
          setMensaje({ tipo: "error", texto: `Error al analizar archivo: ${innerErr.message}` });
          setSourceData(null);
        } finally {
          setAnalyzingFile(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setMensaje({ tipo: "error", texto: `Error leyendo archivo: ${err.message}` });
      setAnalyzingFile(false);
    }
  };

  const inicializarMapeosAutomáticos = (analyzedTables: any[]) => {
    const initial: any = {};
    TARGET_TABLES_METADATA.forEach(tgtTable => {
      // Buscar similitudes en nombres de tablas
      const nameMatches = [
        tgtTable.id,
        tgtTable.id.replace("_", ""),
        tgtTable.id.slice(0, -1),
        tgtTable.id === "productos" ? "articulos" : "",
        tgtTable.id === "productos" ? "items" : "",
        tgtTable.id === "productos" ? "inventario" : "",
        tgtTable.id === "clientes" ? "customers" : "",
        tgtTable.id === "proveedores" ? "providers" : "",
        tgtTable.id === "proveedores" ? "droguerias" : "",
        tgtTable.id === "categorias_comerciales" ? "categorias" : "",
        tgtTable.id === "categorias_comerciales" ? "rubros" : ""
      ].filter(Boolean);

      const matchedSource = analyzedTables.find(src => 
        nameMatches.includes(src.name.toLowerCase())
      );

      const cols: any = {};
      const defaultVals: any = {};
      
      tgtTable.columns.forEach(col => {
        if (col.defaultValue !== undefined) {
          defaultVals[col.id] = col.defaultValue;
        }
        
        if (matchedSource) {
          const foundCol = matchedSource.columns.find((c: string) => 
            col.autoMatches.includes(c.toLowerCase())
          );
          if (foundCol) {
            cols[col.id] = foundCol;
          }
        }
      });

      initial[tgtTable.id] = {
        enabled: matchedSource ? true : false,
        sourceTable: matchedSource ? matchedSource.name : "",
        columns: cols,
        defaultValues: defaultVals
      };
    });
    
    setSelectedTables(initial);
  };

  const ejecutarMigracionPersonalizada = async () => {
    if (!migrateFile || !base64FileContent) {
      setMensaje({ tipo: "error", texto: "Debe cargar un archivo de base de datos primero." });
      return;
    }

    // Preparar mapeos
    const tablesMappingList = Object.entries(selectedTables)
      .filter(([_, mapping]) => mapping.enabled && mapping.sourceTable)
      .map(([tgtTable, mapping]) => ({
        sourceTable: mapping.sourceTable,
        targetTable: tgtTable,
        columns: mapping.columns,
        defaultValues: mapping.defaultValues
      }));

    if (tablesMappingList.length === 0) {
      setMensaje({ tipo: "error", texto: "Debe habilitar al menos una tabla para realizar la migración." });
      return;
    }

    setExecutingCustomMigrate(true);
    setCustomMigrateLog(["🔄 Iniciando migración de base de datos externa...", "🛠️ Conectando con servidor MariaDB/MySQL..."]);
    setCustomMigrateResult(null);

    try {
      const res = await apiFetch("/api/migrate/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: migrateFile.name,
          fileContent: base64FileContent,
          config: {
            clearTarget,
            tables: tablesMappingList
          }
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Fallo crítico en el motor de migración externa.");
      }

      const data = await res.json();
      setCustomMigrateResult(data);
      
      const logs: string[] = [];
      if (data.success) {
        logs.push("✅ ¡Migración de datos externa completada!");
        data.tables.forEach((t: any) => {
          logs.push(`📋 Tabla [${t.name}]:`);
          logs.push(`   • Filas en origen: ${t.rowsFound}`);
          logs.push(`   • Migradas con éxito: ${t.rowsMigrated}`);
          if (t.rowsFailed > 0) {
            logs.push(`   • ⚠️ Filas fallidas: ${t.rowsFailed}`);
            t.errors.forEach((err: string) => logs.push(`     - Detalle: ${err}`));
          } else {
            logs.push(`   • ✓ Sin errores de integridad referencial`);
          }
        });
        setMensaje({ tipo: "exito", texto: "La migración de datos externos se ha completado exitosamente en MariaDB." });
      } else {
        logs.push(`❌ Error en la migración: ${data.error}`);
        setMensaje({ tipo: "error", texto: `Fallo en la migración: ${data.error}` });
      }
      setCustomMigrateLog(logs);
    } catch (err: any) {
      setMensaje({ tipo: "error", texto: err.message || "Error al procesar la migración externa." });
      setCustomMigrateLog(prev => [...prev, `❌ Error fatal: ${err.message}`]);
    } finally {
      setExecutingCustomMigrate(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    if (subTab === "mariadb") {
      cargarEstadoTablas();
    }
  }, [subTab]);

  const cargarEstadoTablas = async () => {
    setCargandoTablasStatus(true);
    try {
      const res = await apiFetch("/api/mariadb/status");
      if (res.ok) {
        const data = await res.json();
        setDbTablesStatus(data);
      }
    } catch (err) {
      console.error("Error al cargar estado de tablas de MariaDB:", err);
    } finally {
      setCargandoTablasStatus(false);
    }
  };

  const cargarDatos = async () => {
    setCargandoBackups(true);
    try {
      // Cargar archivos
      const resFiles = await apiFetch("/api/backups/list");
      if (resFiles.ok) {
        const files = await resFiles.json();
        setBackups(files);
      }

      // Cargar config backups
      const resConfig = await apiFetch("/api/backups/settings");
      if (resConfig.ok) {
        const cfg = await resConfig.json();
        setConfig(cfg);
      }

      // Cargar config MariaDB
      const resMaria = await apiFetch("/api/mariadb/settings");
      if (resMaria.ok) {
        const mcfg = await resMaria.json();
        setDbConfig(mcfg);
        if (mcfg.enabled) {
          // Cargar las tablas si el modo MariaDB está activo
          const resTables = await apiFetch("/api/mariadb/status");
          if (resTables.ok) {
            const tdata = await resTables.json();
            setDbTablesStatus(tdata);
          }
        }
      }
    } catch (err) {
      console.error("Error al cargar datos de respaldos y DB:", err);
      setMensaje({ tipo: "error", texto: "No se pudieron cargar todos los datos de configuración." });
    } finally {
      setCargandoBackups(false);
    }
  };

  const guardarConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoConfig(true);
    setMensaje(null);
    try {
      const res = await apiFetch("/api/backups/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rutaSecundaria: config.rutaSecundaria,
          autoRespaldarEnVenta: config.autoRespaldarEnVenta
        })
      });

      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
        setMensaje({ tipo: "exito", texto: "Configuración de respaldos guardada correctamente." });
      } else {
        const data = await res.json();
        setMensaje({ tipo: "error", texto: data.error || "Error al guardar la configuración." });
      }
    } catch (err) {
      console.error(err);
      setMensaje({ tipo: "error", texto: "Error de conexión al servidor." });
    } finally {
      setGuardandoConfig(false);
    }
  };

  const crearBackupAhora = async () => {
    setCreandoBackup(true);
    setMensaje(null);
    try {
      const res = await apiFetch("/api/backups/create", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setMensaje({ 
          tipo: "exito", 
          texto: `¡Respaldo local generado con éxito! ${
            data.rutaCopiada 
              ? `También se guardó una copia en tu ruta externa: ${data.rutaCopiada}` 
              : data.copiaFallida 
                ? `(Ojo: No se pudo copiar en la ruta externa/USB: ${data.copiaDetalle})`
                : ""
          }` 
        });
        cargarDatos();
      } else {
        const data = await res.json();
        setMensaje({ tipo: "error", texto: data.error || "No se pudo crear el respaldo." });
      }
    } catch (err) {
      console.error(err);
      setMensaje({ tipo: "error", texto: "Error al comunicarse con el servidor local." });
    } finally {
      setCreandoBackup(false);
    }
  };

  const [restaurandoArchivoSubido, setRestaurandoArchivoSubido] = useState(false);

  const restaurarArchivoSubido = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Resetear input para permitir seleccionar el mismo archivo si es necesario
    e.target.value = "";

    const confirmar = window.confirm(
      `⚠️ ¡RESTAURACIÓN DE ARCHIVO EXTERNO! ⚠️\n\n¿Deseas restaurar el sistema utilizando el archivo:\n"${file.name}"?\n\nEsta acción reemplazará la base de datos actual con los datos del archivo que estás cargando.\n\nEl sistema creará automáticamente un respaldo previo de seguridad antes de aplicar los cambios.`
    );

    if (!confirmar) return;

    setRestaurandoArchivoSubido(true);
    setMensaje({ tipo: "info", texto: `Leyendo y validando el archivo "${file.name}"...` });

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string;
          if (!content) {
            throw new Error("No se pudo leer el contenido del archivo.");
          }

          setMensaje({ tipo: "info", texto: "Procesando y restaurando datos en el servidor..." });

          const res = await apiFetch("/api/backups/upload-and-restore", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileContent: content,
              originalName: file.name
            })
          });

          const data = await res.json();
          if (res.ok && data.status === "success") {
            setMensaje({ tipo: "exito", texto: data.message });
            alert(`¡Restauración exitosa!\n\n${data.message}\n\nPresiona Aceptar para actualizar la pantalla.`);
            window.location.reload();
          } else {
            setMensaje({ tipo: "error", texto: data.error || "No se pudo restaurar el archivo seleccionado." });
          }
        } catch (innerErr: any) {
          console.error(innerErr);
          setMensaje({ tipo: "error", texto: "Error al procesar el archivo: " + innerErr.message });
        } finally {
          setRestaurandoArchivoSubido(false);
        }
      };

      reader.onerror = () => {
        setMensaje({ tipo: "error", texto: "Error al leer el archivo desde el disco o dispositivo USB." });
        setRestaurandoArchivoSubido(false);
      };

      reader.readAsText(file);
    } catch (err: any) {
      console.error(err);
      setMensaje({ tipo: "error", texto: "Fallo al iniciar lectura del archivo: " + err.message });
      setRestaurandoArchivoSubido(false);
    }
  };

  const restaurarBackup = async (filename: string) => {
    const confirmar = window.confirm(
      `⚠️ ¡ALERTA CRÍTICA! ⚠️\n\n¿Estás seguro de que deseas restaurar el respaldo:\n"${filename}"?\n\nEsto reemplazará TODOS los datos actuales del sistema (productos, ventas, clientes) con los datos del respaldo seleccionado.\n\nPor seguridad, el sistema creará automáticamente una copia del estado actual antes de restaurar.`
    );

    if (!confirmar) return;

    setMensaje({ tipo: "info", texto: "Restaurando base de datos, por favor espere..." });
    try {
      const res = await apiFetch("/api/backups/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename })
      });

      if (res.ok) {
        const data = await res.json();
        setMensaje({ tipo: "exito", texto: data.message || "Base de datos restaurada con éxito. Por favor refresca el navegador para aplicar todos los cambios." });
        alert("¡Restauración exitosa! Presiona OK para actualizar la página.");
        window.location.reload();
      } else {
        const data = await res.json();
        setMensaje({ tipo: "error", texto: data.error || "Fallo en la restauración del respaldo." });
      }
    } catch (err) {
      console.error(err);
      setMensaje({ tipo: "error", texto: "Error de comunicación durante la restauración." });
    }
  };

  // MariaDB specific handlers
  const probarConexionMariaDB = async () => {
    setProbandoConexion(true);
    setMensaje(null);
    try {
      const res = await apiFetch("/api/mariadb/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: dbConfig.host,
          port: dbConfig.port,
          user: dbConfig.user,
          password: dbConfig.password,
          database: dbConfig.database
        })
      });
      const data = await res.json();
      if (data.success) {
        setMensaje({ tipo: "exito", texto: data.message });
      } else {
        setMensaje({ tipo: "error", texto: `Fallo de conexión: ${data.message}` });
      }
    } catch (err) {
      console.error(err);
      setMensaje({ tipo: "error", texto: "Error al comunicarse con el servidor para la prueba." });
    } finally {
      setProbandoConexion(false);
    }
  };

  const guardarMariaDBConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoDbConfig(true);
    setMensaje(null);
    try {
      const res = await apiFetch("/api/mariadb/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dbConfig)
      });
      if (res.ok) {
        const data = await res.json();
        setDbConfig(data.config);
        setMensaje({ tipo: "exito", texto: data.message || "Configuración de MariaDB guardada con éxito." });
      } else {
        const data = await res.json();
        setMensaje({ tipo: "error", texto: data.error || "No se pudo guardar la configuración." });
      }
    } catch (err) {
      console.error(err);
      setMensaje({ tipo: "error", texto: "Error de conexión con el servidor." });
    } finally {
      setGuardandoDbConfig(false);
    }
  };

  const iniciarMigracionMariaDB = async () => {
    const confirmMsg = 
      "⚠️ ¿Deseas iniciar la migración masiva de datos a MariaDB?\n\n" +
      "Este asistente:\n" +
      "1. Creará automáticamente todas las tablas SQL necesarias.\n" +
      "2. Migrará el catálogo de productos, clientes, compras, ventas, cierres y órdenes de servicio de TODAS las empresas registradas.\n" +
      "3. No borrará tus archivos JSON locales (los mantendrá como respaldo).\n\n" +
      "¿Deseas continuar?";
      
    if (!window.confirm(confirmMsg)) {
      return;
    }

    setMigrandoDb(true);
    setMigrationLog(["Iniciando migración, por favor espere..."]);
    setMensaje(null);
    try {
      const res = await apiFetch("/api/mariadb/migrate", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setMigrationLog(data.log || []);
        setMensaje({ tipo: "exito", texto: "¡Migración masiva de JSON a SQL completada con éxito! Todos tus datos están seguros." });
      } else {
        setMigrationLog(data.log || ["Ocurrió un error inesperado durante el proceso."]);
        setMensaje({ tipo: "error", texto: "Hubo errores durante la migración. Revisa la consola o los logs del servidor." });
      }
    } catch (err: any) {
      console.error(err);
      setMensaje({ tipo: "error", texto: "Fallo de comunicación con el servicio de migración." });
    } finally {
      setMigrandoDb(false);
    }
  };

  const formatearTamaño = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const formatearFecha = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString("es-VE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
    } catch (e) {
      return iso;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Seguridad, Bases de Datos & Copias</h1>
            <p className="text-slate-500 text-xs mt-1">
              Administra el almacenamiento físico del sistema, realiza respaldos locales y migra de forma profesional a servidores MariaDB / MySQL.
            </p>
          </div>
        </div>

        {subTab === "json" && (
          <div className="flex items-center gap-3 shrink-0">
            {/* Input oculto para subir archivo JSON desde PC o USB */}
            <input
              type="file"
              id="upload-backup-file"
              accept=".json"
              className="hidden"
              onChange={restaurarArchivoSubido}
              disabled={restaurandoArchivoSubido}
            />
            <label
              htmlFor="upload-backup-file"
              className={`bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-bold text-xs uppercase tracking-wider px-4 py-3.5 rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                restaurandoArchivoSubido ? "opacity-50 pointer-events-none" : ""
              }`}
              title="Restaurar base de datos cargando un archivo .JSON desde esta PC o Pendrive"
            >
              {restaurandoArchivoSubido ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                  Restaurando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 text-indigo-600" />
                  Cargar Archivo .JSON (PC / USB)
                </>
              )}
            </label>

            <button
              onClick={crearBackupAhora}
              disabled={creandoBackup}
              className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider px-5 py-3.5 rounded-2xl shadow-lg shadow-indigo-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {creandoBackup ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  Respaldar Ahora
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Selector de Sub-Tabs */}
      <div className="flex flex-wrap sm:flex-nowrap gap-2 p-1.5 bg-slate-100/80 rounded-2xl max-w-3xl">
        <button
          onClick={() => { setSubTab("json"); setMensaje(null); }}
          className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
            subTab === "json"
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-slate-600 hover:bg-white/40"
          }`}
        >
          <FileJson className="w-4 h-4" />
          Respaldos Locales
        </button>
        <button
          onClick={() => { setSubTab("supabase"); setMensaje(null); }}
          className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
            subTab === "supabase"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-emerald-700 hover:bg-emerald-50"
          }`}
        >
          <Cloud className="w-4 h-4" />
          Nube Supabase
        </button>
        <button
          onClick={() => { setSubTab("mariadb"); setMensaje(null); }}
          className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
            subTab === "mariadb"
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-slate-600 hover:bg-white/40"
          }`}
        >
          <Server className="w-4 h-4" />
          MariaDB / SQL
        </button>
        <button
          onClick={() => { setSubTab("custom_migration"); setMensaje(null); }}
          className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
            subTab === "custom_migration"
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-slate-600 hover:bg-white/40"
          }`}
        >
          <FolderSync className="w-4 h-4" />
          Migrar SQL / SQLite
        </button>
      </div>

      {/* Alertas */}
      {mensaje && (
        <div className={`p-4 rounded-2xl border flex gap-3 text-xs font-medium leading-relaxed ${
          mensaje.tipo === "exito" 
            ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
            : mensaje.tipo === "error"
              ? "bg-rose-50 border-rose-100 text-rose-800"
              : "bg-amber-50 border-amber-100 text-amber-800"
        }`}>
          {mensaje.tipo === "exito" && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
          {mensaje.tipo === "error" && <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />}
          {mensaje.tipo === "info" && <Info className="w-5 h-5 text-amber-600 shrink-0" />}
          <div>
            <p className="font-bold">{mensaje.tipo === "exito" ? "Éxito" : mensaje.tipo === "error" ? "Error" : "Atención"}</p>
            <p className="mt-0.5">{mensaje.texto}</p>
          </div>
        </div>
      )}

      {/* Contenido según Sub-Tab */}
      {subTab === "json" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          {/* Panel Izquierdo: Configuración */}
          <div className="lg:col-span-5 space-y-6">
            <form onSubmit={guardarConfig} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
                <FolderSync className="w-5 h-5 text-indigo-600" />
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Automatización de Copias</h2>
              </div>

              {/* Checkbox Auto-respaldo */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4.5 h-4.5 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    checked={config.autoRespaldarEnVenta}
                    onChange={(e) => setConfig({ ...config, autoRespaldarEnVenta: e.target.checked })}
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800">Auto-respaldo por Venta Procesada</span>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Cada vez que un cajero procese una venta, el sistema guardará de inmediato una copia actualizada del sistema en tu disco local y en el USB.
                    </p>
                  </div>
                </label>
              </div>

              {/* Ruta Secundaria */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Ruta Secundaria Externa (USB / Carpeta Nube Local)
                </label>
                <div className="relative rounded-2xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <HardDrive className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="Ej: E:\Respaldos o D:\Elena"
                    className="block w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl text-xs outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                    value={config.rutaSecundaria}
                    onChange={(e) => setConfig({ ...config, rutaSecundaria: e.target.value })}
                  />
                </div>
                <p className="text-[9px] text-slate-400 leading-normal">
                  Inserta la letra de tu Pendrive (como <code className="bg-slate-100 px-1 rounded">E:\Respaldos</code> o <code className="bg-slate-100 px-1 rounded">F:\</code>) o la ruta de tu carpeta de sincronización local gratuita (como <code className="bg-slate-100 px-1 rounded">C:\Users\Nombre\Google Drive\ElenaRespaldos</code>).
                </p>
              </div>

              {/* Información sobre Rotación de Últimos 15 y Backup al Salir */}
              <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/60 space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4.5 h-4.5 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-800">Rotación Automática Activa</span>
                </div>
                <p className="text-[10px] text-slate-600 leading-relaxed">
                  El sistema ahora realiza un <strong>respaldo de seguridad automático cada vez que cierras sesión</strong>.
                </p>
                <p className="text-[10px] text-slate-600 leading-relaxed">
                  Para optimizar tu pendrive o almacenamiento, el sistema <strong>mantiene únicamente los últimos 15 respaldos</strong>. Las copias de seguridad más antiguas se irán depurando automáticamente de forma invisible.
                </p>
              </div>

              {/* Guardar Ajustes */}
              <button
                type="submit"
                disabled={guardandoConfig}
                className="w-full bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-black text-xs uppercase tracking-wider py-3 px-4 rounded-2xl transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {guardandoConfig ? "Guardando..." : "Guardar Configuración"}
              </button>
            </form>

            {/* Tarjeta de Información Educativa */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 rounded-3xl space-y-4 shadow-lg shadow-indigo-950/20">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-indigo-300" />
                <h3 className="text-xs font-black uppercase tracking-wider text-indigo-200">¿Cómo funciona la nube gratis?</h3>
              </div>
              
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Puedes sincronizar los respaldos en la nube sin pagar nada instalando programas oficiales gratuitos en tu computadora:
              </p>

              <ul className="space-y-2 text-[10px] text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="bg-indigo-500/30 text-indigo-300 rounded-full w-4.5 h-4.5 flex items-center justify-center shrink-0">1</span>
                  <span>Instala <strong>Google Drive para Ordenadores</strong> o <strong>Dropbox</strong>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-indigo-500/30 text-indigo-300 rounded-full w-4.5 h-4.5 flex items-center justify-center shrink-0">2</span>
                  <span>Configura para sincronizar la carpeta de base de datos de tu PC (<code className="text-indigo-200">C:\ElenaPRO\data</code>) o coloca dicha ruta en la sección de "Ruta Secundaria" de arriba.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-indigo-500/30 text-indigo-300 rounded-full w-4.5 h-4.5 flex items-center justify-center shrink-0">3</span>
                  <span>¡Listo! Tus respaldos se subirán automáticamente a internet en tiempo real de forma invisible y segura.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Panel Derecho: Historial de Respaldos */}
          <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col h-[520px]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <FileJson className="w-5 h-5 text-indigo-600" />
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Historial de Respaldos Guardados</h2>
              </div>
              <button
                onClick={cargarDatos}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-500 transition flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Actualizar
              </button>
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-3 scrollbar-thin">
              {cargandoBackups && backups.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  <p className="text-xs">Cargando lista de respaldos...</p>
                </div>
              ) : backups.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 text-center p-6">
                  <Database className="w-10 h-10 text-slate-300" />
                  <div>
                    <p className="text-xs font-bold text-slate-600">No hay respaldos generados aún</p>
                    <p className="text-[10px] mt-1 text-slate-400">Haz clic en el botón de arriba para generar tu primer respaldo de seguridad local.</p>
                  </div>
                </div>
              ) : (
                backups.map((b, idx) => (
                  <div key={`${b.filename}-${idx}`} className="p-4 rounded-2xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <FileJson className="w-4 h-4 text-slate-400 shrink-0" />
                        <h4 className="text-[11px] font-bold text-slate-700 truncate" title={b.filename}>
                          {b.filename}
                        </h4>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400 font-mono">
                        <span>Tamaño: {formatearTamaño(b.size)}</span>
                        <span>•</span>
                        <span>Fecha: {formatearFecha(b.createdAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Botón Descargar */}
                      <a
                        href={`/api/backups/download/${b.filename}`}
                        className="p-2.5 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-100 text-slate-500 hover:text-indigo-600 rounded-xl transition cursor-pointer"
                        title="Descargar archivo JSON"
                      >
                        <Download className="w-4 h-4" />
                      </a>

                      {/* Botón Restaurar */}
                      <button
                        onClick={() => restaurarBackup(b.filename)}
                        className="px-3 py-2 bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-100 text-slate-600 hover:text-amber-600 rounded-xl font-bold text-[10px] uppercase tracking-wider transition cursor-pointer flex items-center gap-1"
                        title="Restaurar base de datos a este estado"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Restaurar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : subTab === "supabase" ? (
        <SupabaseBackupPanel />
      ) : subTab === "mariadb" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          {/* Panel Izquierdo: Configuración de MariaDB */}
          <div className="lg:col-span-5 space-y-6">
            <form onSubmit={guardarMariaDBConfig} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
                <Server className="w-5 h-5 text-indigo-600" />
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Configuración del Servidor SQL</h2>
              </div>

              {/* Estado de Conexión */}
              <div className={`p-4 rounded-2xl border flex items-center gap-3.5 ${
                dbConfig.enabled 
                  ? "bg-emerald-50/75 border-emerald-100 text-emerald-800" 
                  : "bg-slate-50 border-slate-100 text-slate-600"
              }`}>
                <div className={`w-3 h-3 rounded-full shrink-0 ${dbConfig.enabled ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                <div className="text-xs">
                  <p className="font-bold">
                    {dbConfig.enabled ? "CONEXIÓN MODO MARIADB / SQL ACTIVO" : "SISTEMA EN MODO JSON LOCAL"}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {dbConfig.enabled 
                      ? `Sincronizando todas las operaciones de forma directa y transaccional con la base de datos "${dbConfig.database}".` 
                      : "La información se lee y escribe únicamente de forma local en archivos db_*.json de tu computadora."}
                  </p>
                </div>
              </div>

              {/* Host & Port */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Host / IP Servidor</label>
                  <input
                    type="text"
                    required
                    placeholder="localhost o 127.0.0.1"
                    className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                    value={dbConfig.host}
                    onChange={(e) => setDbConfig({ ...dbConfig, host: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Puerto</label>
                  <input
                    type="number"
                    required
                    placeholder="3306"
                    className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                    value={dbConfig.port}
                    onChange={(e) => setDbConfig({ ...dbConfig, port: parseInt(e.target.value) || 3306 })}
                  />
                </div>
              </div>

              {/* User & Password */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Usuario SQL</label>
                  <input
                    type="text"
                    required
                    placeholder="root"
                    className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                    value={dbConfig.user}
                    onChange={(e) => setDbConfig({ ...dbConfig, user: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Contraseña SQL</label>
                  <input
                    type="password"
                    placeholder="Contraseña"
                    className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                    value={dbConfig.password}
                    onChange={(e) => setDbConfig({ ...dbConfig, password: e.target.value })}
                  />
                </div>
              </div>

              {/* Database Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Nombre de la Base de Datos</label>
                <input
                  type="text"
                  required
                  placeholder="elena_pro"
                  className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  value={dbConfig.database}
                  onChange={(e) => setDbConfig({ ...dbConfig, database: e.target.value })}
                />
              </div>

              {/* Habilitar / Activar toggle */}
              <div className="p-3.5 bg-indigo-50/40 border border-indigo-100/50 rounded-2xl flex items-start gap-3">
                <input
                  type="checkbox"
                  id="enabled_db_mariadb"
                  className="w-4.5 h-4.5 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                  checked={dbConfig.enabled}
                  onChange={(e) => setDbConfig({ ...dbConfig, enabled: e.target.checked })}
                />
                <label htmlFor="enabled_db_mariadb" className="text-xs cursor-pointer">
                  <span className="font-bold text-slate-800">Activar sincronización y motor MariaDB / SQL</span>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Al marcar esta casilla, el sistema intentará conectarse a MariaDB en cada consulta y mantendrá sincronizada toda la base de datos de manera automatizada.
                  </p>
                </label>
              </div>

              {/* Botonera */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={probarConexionMariaDB}
                  disabled={probandoConexion}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] uppercase tracking-wider py-3 rounded-2xl transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {probandoConexion ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Probando...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Probar Conexión
                    </>
                  )}
                </button>
                <button
                  type="submit"
                  disabled={guardandoDbConfig}
                  className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-[11px] uppercase tracking-wider py-3 rounded-2xl transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {guardandoDbConfig ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>

          {/* Panel Derecho: Migración de datos & Auditoría de Tablas */}
          <div className="lg:col-span-7 space-y-6 flex flex-col h-[650px]">
            {/* 1. Auditoría de Tablas en Tiempo Real */}
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col h-[280px]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2">
                  <Database className="w-4.5 h-4.5 text-indigo-600" />
                  <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">Tablas Creadas en MariaDB</h2>
                </div>
                <div className="flex items-center gap-2">
                  {cargandoTablasStatus && <RefreshCw className="w-3.5 h-3.5 text-indigo-600 animate-spin" />}
                  <button
                    onClick={cargarEstadoTablas}
                    type="button"
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-500 transition flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Refrescar Estado
                  </button>
                </div>
              </div>

              {/* Contenedor de Estado */}
              <div className="flex-1 overflow-y-auto mt-3 pr-1 scrollbar-thin">
                {!dbConfig.enabled ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center py-4">
                    <AlertTriangle className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="text-[11px] font-bold text-slate-600">Sincronización MariaDB Desactivada</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 max-w-sm">
                      Activa la casilla de la izquierda y presiona "Guardar Cambios" para conectar e inicializar el monitor de tablas.
                    </p>
                  </div>
                ) : dbTablesStatus === null ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 py-4">
                    <RefreshCw className="w-5 h-5 animate-spin text-slate-300 mb-1" />
                    <p className="text-[10px]">Cargando estado de la base de datos...</p>
                  </div>
                ) : !dbTablesStatus.connected ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center py-4">
                    <X className="w-8 h-8 text-rose-500 mb-2" />
                    <p className="text-[11px] font-bold text-rose-700">Error de conexión con MariaDB</p>
                    <p className="text-[10px] text-slate-500 mt-1 max-w-sm px-4">
                      {dbTablesStatus.error || "No se pudo conectar al servidor SQL. Verifica las credenciales, host, usuario y puerto."}
                    </p>
                  </div>
                ) : dbTablesStatus.tables.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center py-4">
                    <Server className="w-8 h-8 text-indigo-300 mb-2" />
                    <p className="text-[11px] font-bold text-slate-600">Base de datos vacía</p>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-sm">
                      La conexión fue exitosa pero no se encontraron tablas creadas. Presiona el botón de abajo para migrar tus datos locales a SQL.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono bg-indigo-50/50 px-3 py-1.5 rounded-lg border border-indigo-100/40">
                      <span>Base de datos activa: <strong className="text-slate-700">{dbTablesStatus.database}</strong></span>
                      <span>Total de tablas: <strong className="text-slate-700">{dbTablesStatus.tables.length}</strong></span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {dbTablesStatus.tables.map((table, idx) => (
                        <div key={`${table.name}-${idx}`} className="p-2.5 bg-slate-50 border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/10 rounded-xl transition flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="block text-[10.5px] font-bold text-slate-700 truncate" title={table.name}>
                              {table.name}
                            </span>
                            <span className="text-[9px] text-slate-400 uppercase font-mono">Tabla SQL</span>
                          </div>
                          <div className="bg-white border border-slate-100 px-2 py-1 rounded-lg text-right shrink-0">
                            <span className="block text-[10px] font-mono font-black text-indigo-600">
                              {table.count === -1 ? "N/A" : table.count}
                            </span>
                            <span className="block text-[8px] text-slate-400 uppercase tracking-wider">Filas</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Asistente de Migración de datos */}
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2">
                  <FolderSync className="w-4.5 h-4.5 text-indigo-600" />
                  <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">Sincronizar Datos Locales a MariaDB</h2>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 mt-2.5 leading-normal shrink-0">
                Mueve tus datos actuales (productos, clientes, compras, ventas, cierres, órdenes de servicio) desde archivos JSON locales hacia el servidor MariaDB / MySQL.
              </p>

              <button
                type="button"
                onClick={async () => {
                  await iniciarMigracionMariaDB();
                  await cargarEstadoTablas(); // Recargar tablas tras migración exitosa
                }}
                disabled={migrandoDb || !dbConfig.enabled}
                className="mt-3.5 w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider py-3 px-4 rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                {migrandoDb ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Ejecutando Migración... por favor espere
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4 text-indigo-400" />
                    Iniciar Migración de JSON a SQL Ahora
                  </>
                )}
              </button>

              {/* Consola de Logs de Migración */}
              <div className="mt-3.5 flex-1 flex flex-col min-h-0 bg-slate-950 rounded-2xl border border-slate-900 overflow-hidden">
                <div className="bg-slate-900 px-4 py-1.5 text-[10px] font-mono text-slate-400 border-b border-slate-950 flex items-center justify-between">
                  <span>CONSOLA DEL ASISTENTE</span>
                  {migrandoDb && <span className="animate-pulse text-indigo-400">● PROCESANDO</span>}
                </div>
                <div className="flex-1 p-3 overflow-y-auto font-mono text-[9.5px] text-indigo-300 space-y-1 scrollbar-thin select-text">
                  {migrationLog.length === 0 ? (
                    <span className="text-slate-600 italic">Consola inactiva. Presiona el botón de arriba para iniciar la migración y ver los registros detallados aquí.</span>
                  ) : (
                    migrationLog.map((line, idx) => (
                      <div key={idx} className={
                        line.startsWith("❌") 
                          ? "text-rose-400 font-bold" 
                          : line.startsWith("✓") 
                            ? "text-emerald-400" 
                            : line.startsWith("⚠") 
                              ? "text-amber-400" 
                              : "text-indigo-200"
                      }>
                        {line}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6 animate-fadeIn">
          {/* Encabezado del Asistente */}
          <div className="pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <FolderSync className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Asistente de Migración de SQL / SQLite Externo</h2>
                <p className="text-slate-500 text-[11px] mt-0.5 animate-pulse">
                  Carga un archivo de respaldo de tu sistema anterior (.sql o .db / .sqlite) y mapea las columnas de forma gráfica directamente a MariaDB.
                </p>
              </div>
            </div>
          </div>

          {/* Paso 1: Subir Archivo */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-4">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">1. Selecciona o arrastra el archivo de origen</h3>
              <div 
                className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/5 rounded-2xl p-6 text-center transition cursor-pointer relative"
                onClick={() => document.getElementById("external-db-upload")?.click()}
              >
                <input 
                  type="file" 
                  id="external-db-upload" 
                  accept=".sql,.db,.sqlite" 
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) analizarArchivoMigracion(file);
                  }}
                />
                <Upload className="w-8 h-8 text-indigo-500 mx-auto mb-3" />
                <span className="block text-xs font-bold text-slate-700">
                  {migrateFile ? migrateFile.name : "Subir archivo .SQL o .DB / .SQLite"}
                </span>
                <span className="block text-[10px] text-slate-400 mt-1 max-w-xs mx-auto leading-normal">
                  Soporta dumps SQL planos de Saint, Valery, Premium, etc., o archivos de bases de datos SQLite.
                </span>
                {migrateFile && (
                  <div className="mt-2 text-[9px] font-mono text-indigo-600 bg-indigo-50/80 inline-block px-2.5 py-1 rounded-full border border-indigo-100">
                    Tamaño: {formatearTamaño(migrateFile.size)}
                  </div>
                )}
              </div>

              {analyzingFile && (
                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-3">
                  <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
                  <div className="text-[11px] text-indigo-800 font-bold">
                    Analizando tablas y columnas de la base de datos... por favor, espere.
                  </div>
                </div>
              )}

              {/* Resumen del archivo analizado */}
              {sourceData && (
                <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between text-xs border-b border-slate-200/50 pb-2">
                    <span className="font-bold text-slate-700">Origen Detectado:</span>
                    <span className="font-mono text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                      {sourceData.type === "sql" ? "Script SQL (.sql)" : "Base de datos SQLite (.db)"}
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto scrollbar-thin pr-1">
                    <span className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Tablas encontradas:</span>
                    {sourceData.tables.map((tbl, idx) => (
                      <div key={`${tbl.name}-${idx}`} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200/40 text-[10.5px]">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5 truncate">
                          <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {tbl.name}
                        </span>
                        <div className="flex items-center gap-2 shrink-0 text-[9px] font-mono text-slate-500">
                          <span>{tbl.columns.length} col</span>
                          <span>•</span>
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded font-black text-slate-700">{tbl.rowCount} filas</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ajustes generales */}
              <div className="bg-indigo-50/30 border border-indigo-100/50 p-4 rounded-2xl space-y-3">
                <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Ajustes del Proceso</h4>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="w-4.5 h-4.5 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    checked={clearTarget}
                    onChange={(e) => setClearTarget(e.target.checked)}
                  />
                  <div>
                    <span className="text-[11px] font-bold text-slate-800">Limpiar registros destino antes de migrar</span>
                    <p className="text-[9.5px] text-slate-500 mt-0.5 leading-normal">
                      Borrará de forma segura únicamente los productos, clientes, etc. del active tenant antes de insertar los nuevos para evitar duplicados.
                    </p>
                  </div>
                </label>
              </div>

              <button
                type="button"
                disabled={executingCustomMigrate || !sourceData}
                onClick={ejecutarMigracionPersonalizada}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider py-3.5 rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-slate-900/10"
              >
                {executingCustomMigrate ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Migrando base de datos externa...
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-4 h-4 text-emerald-400" />
                    Iniciar Migración a MariaDB Ahora
                  </>
                )}
              </button>
            </div>

            {/* Paso 2: Mapeo Visual */}
            <div className="lg:col-span-7 space-y-4">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">2. Mapeo de Tablas y Columnas (Visual Wizard)</h3>
              
              {!sourceData ? (
                <div className="h-[400px] border border-dashed border-slate-200 bg-slate-50/50 rounded-2xl flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <FolderSync className="w-12 h-12 text-slate-300 mb-2.5" />
                  <p className="text-[11px] font-bold text-slate-600">Ningún archivo cargado todavía</p>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-xs">
                    Sube un script SQL o archivo SQLite en el panel de la izquierda. El sistema analizará las tablas automáticamente para que puedas mapear su estructura aquí.
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5 max-h-[600px] overflow-y-auto pr-1.5 scrollbar-thin">
                  {TARGET_TABLES_METADATA.map((target) => {
                    const isExpanded = expandedTargetTable === target.id;
                    const mapping = selectedTables[target.id] || { enabled: false, sourceTable: "", columns: {} };
                    const TargetIcon = target.icon;

                    return (
                      <div key={target.id} className={`p-4 rounded-2xl border transition bg-white ${
                        mapping.enabled 
                          ? "border-indigo-100 shadow-sm hover:shadow-md" 
                          : "border-slate-200/60 opacity-75 hover:opacity-100"
                      }`}>
                        {/* Cabecera de Tabla Target */}
                        <div className="flex items-center justify-between gap-3 select-none">
                          <div className="flex items-center gap-3 min-w-0">
                            <input 
                              type="checkbox"
                              className="w-4.5 h-4.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer shrink-0"
                              checked={mapping.enabled}
                              onChange={(e) => {
                                setSelectedTables({
                                  ...selectedTables,
                                  [target.id]: { ...mapping, enabled: e.target.checked }
                                });
                                if (e.target.checked) setExpandedTargetTable(target.id);
                              }}
                            />
                            <div 
                              className="cursor-pointer min-w-0 flex-1"
                              onClick={() => {
                                setSelectedTables({
                                  ...selectedTables,
                                  [target.id]: { ...mapping, enabled: true }
                                });
                                setExpandedTargetTable(isExpanded ? null : target.id);
                              }}
                            >
                              <div className="flex items-center gap-1.5">
                                <TargetIcon className="w-4 h-4 text-indigo-600 shrink-0" />
                                <span className="text-[11.5px] font-black text-slate-800 truncate">{target.name}</span>
                              </div>
                              <span className="block text-[9px] text-slate-400 mt-0.5 truncate">{target.description}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {mapping.enabled && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] text-slate-400 uppercase font-bold">Desde tabla:</span>
                                <select 
                                  className="px-2.5 py-1 text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold rounded-lg outline-none cursor-pointer"
                                  value={mapping.sourceTable}
                                  onChange={(e) => {
                                    const srcTblName = e.target.value;
                                    const srcTbl = sourceData.tables.find(t => t.name === srcTblName);
                                    
                                    // Auto-map columns if changed source table
                                    const newCols: any = {};
                                    if (srcTbl) {
                                      target.columns.forEach(col => {
                                        const foundCol = srcTbl.columns.find((c: string) => 
                                          col.autoMatches.includes(c.toLowerCase())
                                        );
                                        if (foundCol) newCols[col.id] = foundCol;
                                      });
                                    }

                                    setSelectedTables({
                                      ...selectedTables,
                                      [target.id]: { ...mapping, sourceTable: srcTblName, columns: newCols, enabled: srcTblName ? true : false }
                                    });
                                  }}
                                >
                                  <option value="">[Seleccionar tabla origen]</option>
                                  {sourceData.tables.map((t, idx) => (
                                    <option key={`${t.name}-${idx}`} value={t.name}>{t.name} ({t.rowCount} filas)</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            <button 
                              type="button"
                              onClick={() => setExpandedTargetTable(isExpanded ? null : target.id)}
                              className="p-1 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-400 transition cursor-pointer"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Mapeo de Columnas Ampliado */}
                        {isExpanded && mapping.enabled && mapping.sourceTable && (
                          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3.5 animate-slideDown">
                            <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-slate-400">
                              <span>Columna Elena PRO</span>
                              <div className="flex items-center gap-1"><ArrowRight className="w-3 h-3 text-slate-300" /><span>Asociar con Campo Origen</span></div>
                            </div>

                            <div className="space-y-2">
                              {target.columns.map((col) => {
                                const selectedSourceCol = mapping.columns[col.id] || "";
                                const srcTableObj = sourceData.tables.find(t => t.name === mapping.sourceTable);
                                const sampleVal = srcTableObj?.sampleRows?.[0]?.[selectedSourceCol];

                                return (
                                  <div key={col.id} className="grid grid-cols-2 gap-4 items-center p-2 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/5 transition">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[10.5px] font-bold text-slate-800 truncate" title={col.label}>{col.id}</span>
                                        {col.required && <span className="text-[9px] text-rose-500 font-bold bg-rose-50 border border-rose-100 px-1 py-0.2 rounded-md">Requerido</span>}
                                      </div>
                                      <p className="text-[8.5px] text-slate-400 mt-0.5 truncate">{col.label}</p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <select 
                                        className="flex-1 px-2 py-1 text-[10px] bg-white border border-slate-200 text-slate-700 rounded-lg outline-none cursor-pointer"
                                        value={selectedSourceCol}
                                        onChange={(e) => {
                                          setSelectedTables({
                                            ...selectedTables,
                                            [target.id]: {
                                              ...mapping,
                                              columns: {
                                                ...mapping.columns,
                                                [col.id]: e.target.value
                                              }
                                            }
                                          });
                                        }}
                                      >
                                        <option value="">-- Ignorar o No mapeado --</option>
                                        {srcTableObj?.columns.map((c, idx) => (
                                          <option key={`${c}-${idx}`} value={c}>{c}</option>
                                        ))}
                                      </select>

                                      {/* Mini Vista Previa de Datos de Muestra */}
                                      {selectedSourceCol && sampleVal !== undefined && (
                                        <div className="hidden sm:block shrink-0 max-w-[80px] bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 truncate text-[8.5px] text-slate-500 font-mono" title={`Muestra: ${sampleVal}`}>
                                          Ej: {String(sampleVal)}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Consola de logs de la migración externa */}
          {customMigrateLog.length > 0 && (
            <div className="pt-4 border-t border-slate-100 shrink-0">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2.5">3. Logs de la Transacción Externa</h3>
              <div className="h-[180px] bg-slate-950 rounded-2xl border border-slate-900 overflow-hidden flex flex-col">
                <div className="bg-slate-900 px-4 py-1.5 text-[10px] font-mono text-slate-400 border-b border-slate-950 flex items-center justify-between shrink-0">
                  <span>MIGRACIÓN INTEGRAL EN EJECUCIÓN</span>
                  {executingCustomMigrate && <span className="animate-pulse text-indigo-400">● MIGRANDO</span>}
                </div>
                <div className="flex-1 p-3 overflow-y-auto font-mono text-[9.5px] text-indigo-300 space-y-1 scrollbar-thin select-text">
                  {customMigrateLog.map((line, idx) => (
                    <div key={idx} className={
                      line.startsWith("❌") 
                        ? "text-rose-400 font-bold" 
                        : line.startsWith("✅") || line.includes("éxito") || line.includes("completada")
                          ? "text-emerald-400" 
                          : line.startsWith("📋") 
                            ? "text-slate-100 font-bold"
                            : line.startsWith("⚠") 
                              ? "text-amber-400" 
                              : "text-indigo-200"
                    }>
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
