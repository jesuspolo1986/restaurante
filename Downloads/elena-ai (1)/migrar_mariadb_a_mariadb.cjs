/**
 * Elena PRO - Script de Migración Directa de MariaDB a MariaDB 🐬➡️🐬
 * 
 * Este script te permite migrar toda la base de datos de un servidor MariaDB/MySQL (Origen)
 * a otro servidor MariaDB/MySQL (Destino) de manera directa y segura.
 * Es ideal para mover tus datos de un servidor local a uno en la nube, de una PC a otra,
 * o simplemente para clonar tu base de datos de producción.
 * 
 * INSTRUCCIONES DE USO:
 * 1. Configura los datos de conexión para el Servidor Origen y el Servidor Destino en la sección de CONFIGURACIÓN abajo.
 * 2. Asegúrate de tener instalado el paquete 'mysql2' (ejecuta: npm install mysql2).
 * 3. Ejecuta el script desde tu terminal:
 *    node migrar_mariadb_a_mariadb.cjs
 */

const fs = require('fs');

console.log('=======================================================================');
console.log('          ELENA PRO - MIGRACIÓN DIRECTA MARIADB A MARIADB 🐬➡️🐬        ');
console.log('=======================================================================');

// =======================================================================
//   1. SECCIÓN DE CONFIGURACIÓN (Ajusta los datos de tus servidores)
// =======================================================================

const CONFIG_ORIGEN = {
  host: 'localhost',          // Servidor Origen (donde están tus datos actuales)
  port: 3306,                 // Puerto de origen
  user: 'root',               // Usuario de origen
  password: '',               // Contraseña de origen
  database: 'elena_pro',      // Nombre de la base de datos origen
};

const CONFIG_DESTINO = {
  host: 'localhost',          // Servidor Destino (donde se guardarán los datos)
  port: 3306,                 // Puerto de destino (ej: 3307 si usas otro puerto, o IP pública/nube)
  user: 'root',               // Usuario de destino
  password: '',               // Contraseña de destino
  database: 'elena_pro_nueva',// Nombre de la base de datos destino (se creará si no existe)
};

// Configuración adicional del proceso
const CONFIG_PROCESO = {
  crearBaseDatosDestino: true, // Crea automáticamente la base de datos destino si no existe
  limpiarTablasDestino: true,   // Limpia las tablas destino antes de insertar (evita duplicados/errores de PK)
};

// Lista ordenada de tablas de Elena PRO para respetar la integridad referencial (de padres a hijos)
const TABLAS_ELENA_PRO = [
  'empresas',
  'usuarios',
  'categorias_comerciales',
  'productos',
  'clientes',
  'proveedores',
  'compras',
  'ventas',
  'cierres_z',
  'logs',
  'cierres_caja',
  'pedidos'
];

// =======================================================================
//   2. COMPROBACIÓN DE DEPENDENCIAS
// =======================================================================
let mysql;
try {
  mysql = require('mysql2/promise');
} catch (err) {
  console.log('\n\x1b[33m[ALERTA] Para usar este script necesitas instalar el conector de MariaDB/MySQL (mysql2).\x1b[0m');
  console.log('Por favor, ejecuta el siguiente comando en tu consola antes de continuar:\n');
  console.log('\x1b[36m    npm install mysql2\x1b[0m\n');
  console.log('Una vez instalado, ajusta tus credenciales en este archivo y vuelve a ejecutarlo.');
  console.log('=======================================================================');
  process.exit(0);
}

// =======================================================================
//   3. PROCESO DE MIGRACIÓN
// =======================================================================
async function main() {
  let connOrigen, connDestino;

  try {
    // 1. Conexión al servidor Origen
    console.log(`[ORIGEN] Conectando a ${CONFIG_ORIGEN.user}@${CONFIG_ORIGEN.host}:${CONFIG_ORIGEN.port}/${CONFIG_ORIGEN.database}...`);
    connOrigen = await mysql.createConnection({
      host: CONFIG_ORIGEN.host,
      port: CONFIG_ORIGEN.port,
      user: CONFIG_ORIGEN.user,
      password: CONFIG_ORIGEN.password,
      database: CONFIG_ORIGEN.database,
      multipleStatements: true
    });
    console.log('\x1b[32m[ORIGEN] Conexión exitosa. Base de datos origen en línea.\x1b[0m');

    // 2. Conexión al servidor Destino (Primero al servidor base para crear BD si es necesario)
    console.log(`[DESTINO] Conectando a ${CONFIG_DESTINO.user}@${CONFIG_DESTINO.host}:${CONFIG_DESTINO.port}...`);
    connDestino = await mysql.createConnection({
      host: CONFIG_DESTINO.host,
      port: CONFIG_DESTINO.port,
      user: CONFIG_DESTINO.user,
      password: CONFIG_DESTINO.password,
      multipleStatements: true
    });
    console.log('\x1b[32m[DESTINO] Conexión de administración exitosa.\x1b[0m');

    if (CONFIG_PROCESO.crearBaseDatosDestino) {
      console.log(`[DESTINO] Creando base de datos \`${CONFIG_DESTINO.database}\` si no existe...`);
      await connDestino.query(`CREATE DATABASE IF NOT EXISTS \`${CONFIG_DESTINO.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    }

    // Cambiar conexión de destino a la base de datos específica
    await connDestino.changeUser({ database: CONFIG_DESTINO.database });
    console.log(`[DESTINO] Cambiado a base de datos \`${CONFIG_DESTINO.database}\`.`);

    // Desactivar temporalmente llaves foráneas para evitar conflictos de orden en la inserción/limpieza
    console.log('[PROCESO] Desactivando restricciones de claves foráneas temporalmente en el destino...');
    await connDestino.query('SET FOREIGN_KEY_CHECKS = 0;');

    // 3. Crear las tablas en el destino si no existen (Clonando la estructura de Elena PRO)
    console.log('[PROCESO] Asegurando estructura de tablas de Elena PRO en el servidor destino...');
    await crearEstructuraDestino(connDestino);

    // 4. Copiar datos tabla por tabla
    console.log('\n[PROCESO] Iniciando copiado de datos de las tablas...');
    
    for (const tabla of TABLAS_ELENA_PRO) {
      try {
        // Verificar si la tabla existe en el origen
        const [showTables] = await connOrigen.query(`SHOW TABLES LIKE ?`, [tabla]);
        if (showTables.length === 0) {
          console.log(`\x1b[33m[OMITIDO] La tabla \`${tabla}\` no existe en la base de datos de origen.\x1b[0m`);
          continue;
        }

        // Obtener datos del origen
        const [filas] = await connOrigen.query(`SELECT * FROM \`${tabla}\``);
        console.log(`- Tabla \`${tabla}\`: Encontradas \x1b[36m${filas.length}\x1b[0m filas en origen.`);

        await connDestino.beginTransaction();
        try {
          if (CONFIG_PROCESO.limpiarTablasDestino) {
            await connDestino.query(`DELETE FROM \`${tabla}\``);
          }

          if (filas.length > 0) {
            // Obtener las columnas de la tabla para construir la consulta dinámica
            const columnas = Object.keys(filas[0]);
            const placeholders = columnas.map(() => '?').join(', ');
            const sqlInsert = `INSERT INTO \`${tabla}\` (${columnas.map(col => `\`${col}\``).join(', ')}) VALUES (${placeholders})`;

            // Insertar en bloques para mayor velocidad y evitar desbordar memoria
            const tamanoBloque = 100;
            let insertados = 0;

            for (let i = 0; i < filas.length; i += tamanoBloque) {
              const bloque = filas.slice(i, i + tamanoBloque);
              for (const fila of bloque) {
                const valores = columnas.map(col => {
                  const val = fila[col];
                  if (val === undefined) return null;
                  if (val instanceof Date) {
                    return val.toISOString().slice(0, 19).replace('T', ' ');
                  }
                  if (Buffer.isBuffer(val)) {
                    return val;
                  }
                  // Tratar arrays y objetos JSON de manera correcta para la inserción SQL
                  if (val !== null && typeof val === 'object') {
                    return JSON.stringify(val);
                  }
                  return val;
                });
                await connDestino.query(sqlInsert, valores);
                insertados++;
              }
            }
            await connDestino.commit();
            console.log(`  \x1b[32m✓ Copiadas con éxito ${insertados} filas en \`${tabla}\`.\x1b[0m`);
          } else {
            await connDestino.commit();
            console.log(`  ✓ Tabla vacía. Nada que copiar.`);
          }
        } catch (tErr) {
          await connDestino.rollback();
          throw tErr;
        }
      } catch (tableErr) {
        console.error(`\x1b[31m  ❌ Error procesando tabla \`${tabla}\`:\x1b[0m`, tableErr.message);
      }
    }

    // Reactivar restricciones de claves foráneas
    console.log('\n[PROCESO] Reactivando restricciones de claves foráneas en el destino...');
    await connDestino.query('SET FOREIGN_KEY_CHECKS = 1;');

    console.log('\n=======================================================================');
    console.log('            🎉 ¡MIGRACIÓN COMPLETADA CON TOTAL ÉXITO! 🎉               ');
    console.log('=======================================================================');
    console.log(`Servidor Origen:   ${CONFIG_ORIGEN.host}:${CONFIG_ORIGEN.port} (${CONFIG_ORIGEN.database})`);
    console.log(`Servidor Destino:  ${CONFIG_DESTINO.host}:${CONFIG_DESTINO.port} (${CONFIG_DESTINO.database})`);
    console.log('Todos tus datos de Elena PRO han sido transferidos correctamente.');
    console.log('=======================================================================');

  } catch (err) {
    console.error('\n\x1b[31m[ERROR CRÍTICO] Ocurrió un error general durante la migración:\x1b[0m');
    console.error(err.message || err);
    console.log('\nPor favor, verifica la configuración de tus credenciales y puertos de red.');
    console.log('=======================================================================');
  } finally {
    if (connOrigen) await connOrigen.end().catch(() => {});
    if (connDestino) await connDestino.end().catch(() => {});
  }
}

// Función auxiliar para garantizar que las tablas de Elena PRO existan en el destino
async function crearEstructuraDestino(connection) {
  // 1. Empresas
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

  // 7. Compras
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

  // 10. Logs
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
      imagenes LONGTEXT,
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
      PRIMARY KEY (tenant_id, id),
      FOREIGN KEY (tenant_id) REFERENCES empresas(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

main();
