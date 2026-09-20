# Reglas Permanentes de Desarrollo para el Asistente AI (AGENTS.md)

## 📌 REGLA CRÍTICA: Actualización Continua de `context.md` y `contexto.md`

1. **Cada vez que se realice cualquier cambio, mejora, corrección de bugs o adición de código en el proyecto**, el Asistente de IA **DEBE** actualizar de inmediato el archivo `context.md` (y mantener sincronizado `contexto.md`).
2. En cada actualización se debe incluir:
   - Resumen del cambio en la sección **Registro de Cambios / Changelog**.
   - Modificaciones en componentes, endpoints o arquitectura si aplica.
   - Estado funcional verificado tras la compilación.

## 🛡️ Principios Arquitectónicos de Elena PRO:
- **Motor In-Memory RAM:** Toda lectura/escritura de base de datos debe pasar por `db_memory_manager.ts` para garantizar respuesta < 1 ms y consistencia ACID con Mutex FIFO.
- **Multi-Tenant Estricto:** Toda consulta debe respetar el `activeTenantId` y las rutas `data/db_<tenantId>.json`.
- **Alineación con Producción y Render:** Respetar la compatibilidad con Node.js, `esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs` y el endpoint `/api/health`.
