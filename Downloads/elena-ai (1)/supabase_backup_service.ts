import { createClient, SupabaseClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Configuración por defecto o tomada del entorno
const DEFAULT_SUPABASE_URL = process.env.SUPABASE_URL || "https://nhbdegzkbjvesccthlxg.supabase.co";
const DEFAULT_SUPABASE_KEY = process.env.SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oYmRlZ3prYmp2ZXNjY3RobHhnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njk2Mjc2NiwiZXhwIjoyMTAyNTM4NzY2fQ.NV5SHA4ebKH-GHDDQC1VxxLWHeintVUQWSML0DYyBOs";
export const BUCKET_NAME = "backups-elena";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const CONFIG_FILE = path.join(DATA_DIR, "supabase_config.json");

export interface SupabaseBackupConfig {
  url: string;
  key: string;
  bucket: string;
  autoUploadOnBackup: boolean;
  retentionDays: number;
}

export function getSupabaseConfig(): SupabaseBackupConfig {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
      return {
        url: data.url || DEFAULT_SUPABASE_URL,
        key: data.key || DEFAULT_SUPABASE_KEY,
        bucket: data.bucket || BUCKET_NAME,
        autoUploadOnBackup: data.autoUploadOnBackup ?? true,
        retentionDays: data.retentionDays || 30
      };
    } catch (e) {
      console.error("[Supabase Config] Error leyendo supabase_config.json:", e);
    }
  }
  return {
    url: DEFAULT_SUPABASE_URL,
    key: DEFAULT_SUPABASE_KEY,
    bucket: BUCKET_NAME,
    autoUploadOnBackup: true,
    retentionDays: 30
  };
}

export function saveSupabaseConfig(config: Partial<SupabaseBackupConfig>) {
  const current = getSupabaseConfig();
  const updated: SupabaseBackupConfig = {
    url: (config.url && config.url.trim()) ? config.url.trim() : current.url,
    key: (config.key && config.key.trim()) ? config.key.trim() : current.key,
    bucket: (config.bucket && config.bucket.trim()) ? config.bucket.trim() : current.bucket,
    autoUploadOnBackup: config.autoUploadOnBackup !== undefined ? !!config.autoUploadOnBackup : current.autoUploadOnBackup,
    retentionDays: config.retentionDays ? Number(config.retentionDays) : current.retentionDays
  };

  const dataDir = path.dirname(CONFIG_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), "utf8");
  // Reset cached client
  cachedClient = null;
  return updated;
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;
  const config = getSupabaseConfig();
  if (!config.url || !config.key) return null;

  try {
    cachedClient = createClient(config.url, config.key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    return cachedClient;
  } catch (err) {
    console.error("[Supabase Client] Error al inicializar cliente:", err);
    return null;
  }
}

/**
 * Asegura que el bucket de respaldos exista (intenta crearlo si no existe)
 */
export async function ensureBackupBucket(customBucket?: string): Promise<{ success: boolean; created?: boolean; message?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, message: "Cliente Supabase no configurado." };

  const config = getSupabaseConfig();
  const bucketName = customBucket || config.bucket;

  try {
    const { data: buckets, error } = await client.storage.listBuckets();
    if (error) {
      // Si la API key no tiene permisos globales para listBuckets (ej. RLS o clave anon),
      // intentamos hacer createBucket directamente o comprobar acceso
      const { data: createData, error: createError } = await client.storage.createBucket(bucketName, {
        public: false
      });

      if (createError) {
        // Si el error es que ya existe ("Bucket already exists" o similar), lo consideramos válido
        if (createError.message?.toLowerCase().includes("already exists") || (createError as any).statusCode === "409" || (createError as any).status === 409) {
          return { success: true, created: false, message: `Bucket "${bucketName}" verificado.` };
        }
        return { 
          success: false, 
          message: `El bucket "${bucketName}" no existe en tu proyecto de Supabase. Créalo manualmente en el panel de Supabase (Storage > New bucket > nombre: "${bucketName}") o usa una API Key con rol de servicio (service_role). Detalle: ${createError.message}` 
        };
      }
      return { success: true, created: true, message: `Bucket "${bucketName}" creado con éxito.` };
    }

    const bucketExists = buckets?.some(b => b.name === bucketName);
    if (!bucketExists) {
      const { error: createError } = await client.storage.createBucket(bucketName, {
        public: false
      });
      if (createError) {
        if (createError.message?.toLowerCase().includes("already exists") || (createError as any).statusCode === "409" || (createError as any).status === 409) {
          return { success: true, created: false, message: `Bucket "${bucketName}" verificado.` };
        }
        return {
          success: false,
          message: `No se pudo crear automáticamente el bucket "${bucketName}". Ve a tu panel de Supabase > Storage > Crear nuevo bucket con el nombre "${bucketName}". Detalle: ${createError.message}`
        };
      }
      return { success: true, created: true, message: `Bucket "${bucketName}" creado exitosamente.` };
    }
    return { success: true, created: false, message: `Bucket "${bucketName}" listo.` };
  } catch (err: any) {
    return { success: false, message: err.message || "Error al verificar bucket." };
  }
}

export interface CloudBackupItem {
  name: string;
  id?: string;
  updated_at?: string;
  created_at?: string;
  last_accessed_at?: string;
  metadata?: Record<string, any>;
  sizeBytes?: number;
  empresa_id: string;
  tipo: string;
  storagePath: string;
}

/**
 * Sube un archivo de respaldo JSON a Supabase Storage organizado por empresa
 * Ruta: [empresa_id]/[tipo_backup]/backup_db_[empresa_id]_[timestamp].json
 */
export async function uploadBackupToSupabase(
  tenantId: string,
  backupFilePath: string,
  tipo: "AUTOMATICO" | "MANUAL" | "CIERRE_CAJA" = "MANUAL",
  usuario = "admin",
  empresaNombre = ""
): Promise<{ success: boolean; path?: string; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: "Credenciales de Supabase no configuradas." };
  }

  if (!fs.existsSync(backupFilePath)) {
    return { success: false, error: `El archivo local no existe: ${backupFilePath}` };
  }

  const config = getSupabaseConfig();
  const filename = path.basename(backupFilePath);
  const fileBuffer = fs.readFileSync(backupFilePath);
  const fileSize = fs.statSync(backupFilePath).size;

  // Asegurar o intentar crear el bucket primero
  await ensureBackupBucket(config.bucket);

  // Ruta ordenada: [empresa_id]/[tipo]/[nombre_archivo]
  const tipoFolder = tipo.toLowerCase();
  const storagePath = `${tenantId}/${tipoFolder}/${filename}`;

  try {
    // 1. Subir a Supabase Storage
    let uploadRes = await client.storage
      .from(config.bucket)
      .upload(storagePath, fileBuffer, {
        contentType: "application/json",
        upsert: true
      });

    // Si da "Bucket not found", intentamos crearlo una vez más y reintentar
    if (uploadRes.error && uploadRes.error.message?.toLowerCase().includes("bucket not found")) {
      const bucketCreation = await ensureBackupBucket(config.bucket);
      if (bucketCreation.success) {
        uploadRes = await client.storage
          .from(config.bucket)
          .upload(storagePath, fileBuffer, {
            contentType: "application/json",
            upsert: true
          });
      }
    }

    if (uploadRes.error) {
      console.error("[Supabase Storage] Error subiendo respaldo:", uploadRes.error);
      const isBucketNotFound = uploadRes.error.message?.toLowerCase().includes("bucket not found");
      const isRlsError = uploadRes.error.message?.toLowerCase().includes("row-level security") || 
                         uploadRes.error.message?.toLowerCase().includes("policy") || 
                         (uploadRes.error as any).statusCode === "403" ||
                         (uploadRes.error as any).status === 400;

      let errorMessage = uploadRes.error.message;
      if (isBucketNotFound) {
        errorMessage = `El Bucket "${config.bucket}" no existe en tu proyecto de Supabase. Créalo en Supabase > Storage > New bucket llamado "${config.bucket}".`;
      } else if (isRlsError) {
        errorMessage = `Permiso denegado (RLS en Supabase Storage). Solución recomendada: Ve a tu panel de Supabase > Project Settings > API y copia la clave "service_role (secret)" en los ajustes de Supabase de Elena POS, o crea una política que permita INSERT/SELECT en el bucket "${config.bucket}".`;
      }
      return { success: false, error: errorMessage };
    }

    console.log(`[Supabase Storage] Respaldo subido con éxito: ${storagePath} (${fileSize} bytes)`);

    // 2. Intentar registrar en la tabla historial_respaldos si existe
    try {
      let stats = { productos: 0, ventas: 0, clientes: 0 };
      try {
        const parsed = JSON.parse(fileBuffer.toString("utf8"));
        stats.productos = parsed.productos?.length || 0;
        stats.ventas = parsed.ventas?.length || 0;
        stats.clientes = parsed.clientes?.length || 0;
      } catch (e) {}

      await client.from("historial_respaldos").insert({
        empresa_id: tenantId,
        empresa_nombre: empresaNombre || tenantId,
        archivo_nombre: filename,
        archivo_path: storagePath,
        tipo,
        tamano_bytes: fileSize,
        total_productos: stats.productos,
        total_ventas: stats.ventas,
        total_clientes: stats.clientes,
        usuario_generador: usuario
      });
    } catch (dbErr) {
      // Si la tabla no existe en la BD Postgres, no interrumpe el respaldo en Storage
      console.warn("[Supabase DB] Historial no registrado en tabla (Storage OK):", dbErr);
    }

    return { success: true, path: storagePath };
  } catch (err: any) {
    console.error("[Supabase Storage] Excepción al subir respaldo:", err);
    return { success: false, error: err.message || "Error desconocido al subir a Supabase." };
  }
}

/**
 * Sube el archivo maestro de empresas (companies.json) o la config de superadmin a Supabase Storage
 */
export async function uploadGlobalMasterToSupabase(
  filename: "companies.json" | "superadmin_config.json",
  localFilePath: string
): Promise<{ success: boolean; path?: string; error?: string }> {
  const client = getSupabaseClient();
  if (!client || !fs.existsSync(localFilePath)) return { success: false };

  const config = getSupabaseConfig();
  const fileBuffer = fs.readFileSync(localFilePath);
  const storagePath = `_global_master_/${filename}`;

  try {
    const uploadRes = await client.storage
      .from(config.bucket)
      .upload(storagePath, fileBuffer, {
        contentType: "application/json",
        upsert: true
      });

    if (uploadRes.error) {
      return { success: false, error: uploadRes.error.message };
    }
    return { success: true, path: storagePath };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Recupera el archivo maestro global (companies.json o superadmin_config.json) desde Supabase Storage
 */
export async function downloadGlobalMasterFromSupabase(
  filename: "companies.json" | "superadmin_config.json"
): Promise<{ success: boolean; content?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false };

  const config = getSupabaseConfig();
  const storagePath = `_global_master_/${filename}`;

  try {
    const { data, error } = await client.storage
      .from(config.bucket)
      .download(storagePath);

    if (error || !data) return { success: false };
    const text = await data.text();
    return { success: true, content: text };
  } catch (err) {
    return { success: false };
  }
}

/**
 * Auto-recuperación al iniciar el servidor (Render Deploy / Reinicio):
 * Si las empresas o bases de datos de clientes no existen o están en estado inicial,
 * restaura automáticamente la copia más reciente desde Supabase Storage.
 */
export async function autoRestoreAllFromSupabaseCloud(dataDir: string): Promise<{
  restoredCompanies: boolean;
  restoredSuperAdmin: boolean;
  restoredTenants: string[];
}> {
  const result = {
    restoredCompanies: false,
    restoredSuperAdmin: false,
    restoredTenants: [] as string[]
  };

  const client = getSupabaseClient();
  if (!client) {
    console.log("[Supabase Auto-Recovery] Cliente Supabase no disponible. Se omitió auto-recuperación.");
    return result;
  }

  const config = getSupabaseConfig();
  const companiesPath = path.join(dataDir, "companies.json");
  const superadminPath = path.join(dataDir, "superadmin_config.json");

  // 1. Recuperar y fusionar companies.json desde _global_master_
  try {
    const remoteCompanies = await downloadGlobalMasterFromSupabase("companies.json");
    if (remoteCompanies.success && remoteCompanies.content) {
      try {
        const remoteList = JSON.parse(remoteCompanies.content);
        if (Array.isArray(remoteList) && remoteList.length > 0) {
          let localList: any[] = [];
          if (fs.existsSync(companiesPath)) {
            try {
              localList = JSON.parse(fs.readFileSync(companiesPath, "utf8"));
            } catch (e) {
              localList = [];
            }
          }
          if (!Array.isArray(localList)) localList = [];

          let changed = false;
          for (const rem of remoteList) {
            const idx = localList.findIndex((l: any) => l.id.toLowerCase() === rem.id.toLowerCase());
            if (idx >= 0) {
              localList[idx] = { ...localList[idx], ...rem };
            } else {
              localList.push(rem);
              changed = true;
            }
          }

          if (changed || !fs.existsSync(companiesPath)) {
            fs.writeFileSync(companiesPath, JSON.stringify(localList, null, 2), "utf8");
            result.restoredCompanies = true;
            console.log(`[Supabase Auto-Recovery] ✓ Maestro companies.json sincronizado (${localList.length} empresas registradas).`);
          }
        }
      } catch (parseErr) {
        console.warn("[Supabase Auto-Recovery] Error parseando companies.json remoto:", parseErr);
      }
    }
  } catch (e) {
    console.warn("[Supabase Auto-Recovery] Nota al chequear companies.json en nube:", e);
  }

  // 2. Recuperar superadmin_config.json
  try {
    const remoteSuperAdmin = await downloadGlobalMasterFromSupabase("superadmin_config.json");
    if (remoteSuperAdmin.success && remoteSuperAdmin.content) {
      if (!fs.existsSync(superadminPath)) {
        fs.writeFileSync(superadminPath, remoteSuperAdmin.content, "utf8");
        result.restoredSuperAdmin = true;
        console.log("[Supabase Auto-Recovery] ✓ Configuración de SuperAdmin restaurada exitosamente desde la nube.");
      }
    }
  } catch (e) {
    console.warn("[Supabase Auto-Recovery] Nota al chequear superadmin_config.json en nube:", e);
  }

  // 3. AUTO-DESCUBRIMIENTO Y RECUPERACIÓN DE TODAS LAS EMPRESAS EN STORAGE
  try {
    const { data: rootFolders, error: listErr } = await client.storage
      .from(config.bucket)
      .list("", { limit: 100 });

    if (!listErr && rootFolders) {
      let companies: any[] = [];
      if (fs.existsSync(companiesPath)) {
        try {
          companies = JSON.parse(fs.readFileSync(companiesPath, "utf8"));
        } catch (e) {
          companies = [];
        }
      }
      if (!Array.isArray(companies)) companies = [];

      for (const item of rootFolders) {
        const tenantId = item.name;
        // Omitir archivos del sistema o carpetas ocultas
        if (!tenantId || tenantId.startsWith("_") || tenantId.startsWith(".") || tenantId.endsWith(".json")) continue;

        const tenantDBFile = path.join(dataDir, `db_${tenantId}.json`);
        const backups = await listCloudBackups(tenantId);

        if (backups && backups.length > 0) {
          const latestBackup = backups[0];

          // Si el archivo local no existe o está vacío
          let needRestore = false;
          if (!fs.existsSync(tenantDBFile)) {
            needRestore = true;
          } else {
            try {
              const stat = fs.statSync(tenantDBFile);
              if (stat.size < 50) needRestore = true;
            } catch (e) {
              needRestore = true;
            }
          }

          if (needRestore) {
            const downloadRes = await downloadBackupFromSupabase(latestBackup.storagePath);
            if (downloadRes.success && downloadRes.content) {
              fs.writeFileSync(tenantDBFile, downloadRes.content, "utf8");
              result.restoredTenants.push(tenantId);
              console.log(`[Supabase Auto-Recovery] ✓ Base de datos de empresa (${tenantId}) restaurada desde copia cloud (${latestBackup.name}).`);
            }
          }

          // Si la empresa no está registrada en companies.json, auto-registrarla
          const existingComp = companies.find((c: any) => c.id.toLowerCase() === tenantId.toLowerCase());
          if (!existingComp) {
            let compName = tenantId === "lacasadelsoldado" ? "La Casa del Soldado" : tenantId;
            let compRif = "J-50148729-3";
            let compRubro = "GENERAL";
            let compTel = "+58 (212) 000-0000";
            let compEmail = `contacto@${tenantId}.com`;
            let compDir = "Sede Principal";

            if (fs.existsSync(tenantDBFile)) {
              try {
                const parsedDB = JSON.parse(fs.readFileSync(tenantDBFile, "utf8"));
                if (parsedDB.perfilNegocio) {
                  if (parsedDB.perfilNegocio.nombreComercio) compName = parsedDB.perfilNegocio.nombreComercio;
                  if (parsedDB.perfilNegocio.rif) compRif = parsedDB.perfilNegocio.rif;
                  if (parsedDB.perfilNegocio.rubro) compRubro = parsedDB.perfilNegocio.rubro;
                  if (parsedDB.perfilNegocio.telefono) compTel = parsedDB.perfilNegocio.telefono;
                  if (parsedDB.perfilNegocio.email) compEmail = parsedDB.perfilNegocio.email;
                  if (parsedDB.perfilNegocio.direccion) compDir = parsedDB.perfilNegocio.direccion;
                }
              } catch (e) {}
            }

            companies.push({
              id: tenantId,
              rif: compRif,
              nombre: compName,
              contacto: "Administrador",
              telefono: compTel,
              email: compEmail,
              direccion: compDir,
              ciudad: "Venezuela",
              creadaEn: new Date().toISOString(),
              estado: "activa",
              rubro: compRubro,
              licencia: {
                plan: "VITALICIA",
                estado: "ACTIVA",
                fechaInicio: "2026-01-01T00:00:00.000Z",
                fechaVencimiento: "2036-12-31T23:59:59.000Z",
                precioMensualUSD: 0,
                diasGracia: 5,
                bloqueoAutomatico: false,
                claveActivacion: `ELENA-PRO-VITALICIA-${tenantId.toUpperCase()}`,
                historialPagos: []
              }
            });

            fs.writeFileSync(companiesPath, JSON.stringify(companies, null, 2), "utf8");
            result.restoredCompanies = true;
            console.log(`[Supabase Auto-Recovery] ✓ Empresa auto-registrada en maestro: ${compName} (${tenantId})`);
          }
        }
      }

      // 4. Asegurar que _global_master_ esté 100% actualizado en Supabase
      if (fs.existsSync(companiesPath)) {
        uploadGlobalMasterToSupabase("companies.json", companiesPath).catch(() => {});
      }
      if (fs.existsSync(superadminPath)) {
        uploadGlobalMasterToSupabase("superadmin_config.json", superadminPath).catch(() => {});
      }
    }
  } catch (e) {
    console.warn("[Supabase Auto-Recovery] Nota al auto-descubrir empresas en nube:", e);
  }

  return result;
}

/**
 * Lista todos los respaldos en la nube para una empresa específica
 */
export async function listCloudBackups(tenantId: string): Promise<CloudBackupItem[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  const config = getSupabaseConfig();
  const results: CloudBackupItem[] = [];

  const folders = ["", "automatico", "manual", "cierre_caja"];

  for (const folder of folders) {
    try {
      const folderPath = folder ? `${tenantId}/${folder}` : tenantId;
      const { data, error } = await client.storage
        .from(config.bucket)
        .list(folderPath, {
          limit: 50,
          sortBy: { column: "created_at", order: "desc" }
        });

      if (!error && data) {
        for (const item of data) {
          if (item.name && item.name.endsWith(".json")) {
            const isAutomatic = item.name.includes("backup_") || folder === "automatico";
            const isManual = folder === "manual";
            const isCierre = folder === "cierre_caja";
            const tipoFinal = isManual ? "MANUAL" : isCierre ? "CIERRE_CAJA" : "AUTOMATICO";

            results.push({
              name: item.name,
              id: item.id,
              created_at: item.created_at,
              updated_at: item.updated_at,
              sizeBytes: item.metadata?.size || 0,
              empresa_id: tenantId,
              tipo: tipoFinal,
              storagePath: `${folderPath}/${item.name}`
            });
          }
        }
      }
    } catch (err) {
      console.error(`[Supabase Storage] Error listando ${folder}:`, err);
    }
  }

  // Ordenar los más recientes primero
  return results.sort((a, b) => {
    const timeA = new Date(a.created_at || 0).getTime();
    const timeB = new Date(b.created_at || 0).getTime();
    return timeB - timeA;
  });
}

/**
 * Descarga el contenido JSON de un respaldo desde Supabase Storage
 */
export async function downloadBackupFromSupabase(
  storagePath: string
): Promise<{ success: boolean; content?: string; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: "Credenciales de Supabase no configuradas." };

  const config = getSupabaseConfig();

  try {
    const { data, error } = await client.storage
      .from(config.bucket)
      .download(storagePath);

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: "El archivo no contiene datos." };
    }

    const text = await data.text();
    return { success: true, content: text };
  } catch (err: any) {
    return { success: false, error: err.message || "Error al descargar de Supabase." };
  }
}

/**
 * Prueba la conexión con el proyecto Supabase
 */
export async function testSupabaseConnection(
  url?: string,
  key?: string,
  bucket?: string
): Promise<{ success: boolean; message: string; details?: any }> {
  const targetUrl = url || getSupabaseConfig().url;
  const targetKey = key || getSupabaseConfig().key;
  const targetBucket = bucket || getSupabaseConfig().bucket;

  if (!targetUrl || !targetKey) {
    return { success: false, message: "URL y Key son obligatorias." };
  }

  try {
    const client = createClient(targetUrl, targetKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: buckets, error } = await client.storage.listBuckets();
    if (error) {
      // Si la API key es anon y listBuckets está restringido por RLS, probamos un listado en el bucket
      const { error: listErr } = await client.storage.from(targetBucket).list("", { limit: 1 });
      if (listErr && !listErr.message.includes("not found")) {
        return { success: false, message: `Error de autenticación en Supabase: ${listErr.message}` };
      }
    }

    return {
      success: true,
      message: `¡Conexión exitosa con Supabase! Conectado a ${targetUrl}`,
      details: {
        bucket: targetBucket,
        bucketsFound: buckets?.map(b => b.name) || []
      }
    };
  } catch (err: any) {
    return { success: false, message: `Fallo de conexión: ${err.message}` };
  }
}
