import fs from "fs";
import path from "path";
import { uploadBackupToSupabase } from "../../supabase_backup_service";

/**
 * Elena Memory-Store & High-Concurrency Write Manager
 * 
 * Ventajas:
 * 1. Cero I/O bloqueante en lecturas (respuestas en <0.5ms desde memoria RAM).
 * 2. Cola FIFO atómica por Tenant (elimina Race Conditions entre múltiples cajas).
 * 3. Escritura Asíncrona con Debounce inteligente (Batch Flushes).
 * 4. Respaldo Automático en Background hacia Supabase Storage por lotes o cierres.
 */

interface TenantCacheEntry {
  data: any;
  lastLoaded: number;
  dirty: boolean;
  writePromise: Promise<void>;
  flushTimer: NodeJS.Timeout | null;
}

const tenantCache = new Map<string, TenantCacheEntry>();

// Configuración de I/O y Ráfagas
const DEBOUNCE_FLUSH_MS = 600; // Agrupa escrituras ocurridas en una ventana de 600ms
const SUPABASE_AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000; // Sincronización automática cloud cada 5 min si hubo cambios
const dirtyTenantsForCloudSync = new Set<string>();

/**
 * Obtiene los datos de la base de datos de un tenant desde la memoria RAM.
 * Si no está en memoria, la carga del disco una sola vez.
 */
export function getCachedTenantDB(
  tenantId: string, 
  filePath: string, 
  fallbackLoader: () => any
): any {
  let entry = tenantCache.get(tenantId);

  if (!entry) {
    let loadedData: any;
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf8");
        loadedData = JSON.parse(raw);
      } else {
        loadedData = fallbackLoader();
      }
    } catch (e) {
      console.error(`[MemoryStore] Error cargando DB para tenant "${tenantId}":`, e);
      loadedData = fallbackLoader();
    }

    entry = {
      data: loadedData,
      lastLoaded: Date.now(),
      dirty: false,
      writePromise: Promise.resolve(),
      flushTimer: null
    };
    tenantCache.set(tenantId, entry);
  }

  return entry.data;
}

/**
 * Actualiza los datos en la memoria RAM de forma inmediata y agenda
 * una escritura asíncrona segura y sin colisiones en el disco.
 */
export function updateCachedTenantDB(
  tenantId: string,
  filePath: string,
  newData: any,
  options: { immediate?: boolean } = {}
) {
  let entry = tenantCache.get(tenantId);
  if (!entry) {
    entry = {
      data: newData,
      lastLoaded: Date.now(),
      dirty: true,
      writePromise: Promise.resolve(),
      flushTimer: null
    };
    tenantCache.set(tenantId, entry);
  } else {
    entry.data = newData;
    entry.dirty = true;
  }

  dirtyTenantsForCloudSync.add(tenantId);

  if (options.immediate) {
    if (entry.flushTimer) {
      clearTimeout(entry.flushTimer);
      entry.flushTimer = null;
    }
    flushTenantToDisk(tenantId, filePath, true);
    return;
  }

  // Agendamiento con Debounce
  if (!entry.flushTimer) {
    entry.flushTimer = setTimeout(() => {
      if (entry) {
        entry.flushTimer = null;
      }
      flushTenantToDisk(tenantId, filePath, false);
    }, DEBOUNCE_FLUSH_MS);
  }
}

/**
 * Escribe los datos en memoria al disco usando una cola secuencial atómica (Mutex FIFO).
 */
export function flushTenantToDisk(
  tenantId: string,
  filePath: string,
  sync = false
): Promise<void> {
  const entry = tenantCache.get(tenantId);
  if (!entry || !entry.dirty) return Promise.resolve();

  // Serializar el estado actual en memoria
  const jsonString = JSON.stringify(entry.data, null, 2);
  entry.dirty = false;

  if (sync) {
    try {
      // Escritura atómica a archivo temporal primero para evitar archivos corruptos si se apaga el servidor
      const tempPath = `${filePath}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, jsonString, "utf8");
      fs.renameSync(tempPath, filePath);
    } catch (err) {
      console.error(`[MemoryStore] Error en escritura atómica síncrona para "${tenantId}":`, err);
    }
    return Promise.resolve();
  }

  // Ejecución en Cola Asíncrona Secuencial
  entry.writePromise = entry.writePromise.then(async () => {
    try {
      const tempPath = `${filePath}.tmp.${Date.now()}`;
      await fs.promises.writeFile(tempPath, jsonString, "utf8");
      await fs.promises.rename(tempPath, filePath);
    } catch (err) {
      console.error(`[MemoryStore] Error en flush asíncrono para tenant "${tenantId}":`, err);
    }
  });

  return entry.writePromise;
}

/**
 * Fuerza el guardado inmediato de todas las empresas en memoria.
 * Ideal para cierres de servidor limpios o antes de respaldos.
 */
export async function flushAllTenantsToDisk(dataDir: string) {
  const promises: Promise<void>[] = [];
  for (const [tenantId, entry] of tenantCache.entries()) {
    if (entry.dirty) {
      const filePath = path.join(dataDir, `db_${tenantId}.json`);
      promises.push(flushTenantToDisk(tenantId, filePath, false));
    }
  }
  await Promise.all(promises);
}

/**
 * Invalidar o recargar caché de un tenant (útil tras restaurar un respaldo de Supabase)
 */
export function invalidateTenantCache(tenantId: string) {
  const entry = tenantCache.get(tenantId);
  if (entry && entry.flushTimer) {
    clearTimeout(entry.flushTimer);
  }
  tenantCache.delete(tenantId);
}

// Loop en segundo plano para sincronizar cambios a Supabase Storage periódicamente
setInterval(async () => {
  if (dirtyTenantsForCloudSync.size === 0) return;

  const tenantsToSync = Array.from(dirtyTenantsForCloudSync);
  dirtyTenantsForCloudSync.clear();

  for (const tenantId of tenantsToSync) {
    try {
      const dataDir = process.env.DATA_DIR || path.join(process.cwd(), "data");
      const filePath = path.join(dataDir, `db_${tenantId}.json`);
      // Aseguramos que esté guardado en disco antes de subir
      await flushTenantToDisk(tenantId, filePath, false);

      if (fs.existsSync(filePath)) {
        uploadBackupToSupabase(
          tenantId,
          filePath,
          "AUTOMATICO",
          "system_scheduler",
          tenantId
        ).then(res => {
          if (res.success) {
            console.log(`[Supabase Auto-Sync] Sincronización en lote exitosa para empresa "${tenantId}".`);
          }
        }).catch(e => {
          console.warn(`[Supabase Auto-Sync] No se pudo auto-sincronizar "${tenantId}":`, e.message);
        });
      }
    } catch (err) {
      console.error(`[Supabase Auto-Sync] Error general para "${tenantId}":`, err);
    }
  }
}, SUPABASE_AUTO_SYNC_INTERVAL_MS);
