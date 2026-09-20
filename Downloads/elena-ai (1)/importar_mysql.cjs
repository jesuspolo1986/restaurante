/**
 * Elena PRO - Script de Importación de Inventario desde MySQL 🐬🔋
 * 
 * Este script te permite conectar Elena PRO directamente con una base de datos MySQL anterior
 * (de sistemas como Saint, Valery, Premium, o cualquier software administrativo) para extraer
 * el catálogo de productos de forma automática y cargarlo en Elena PRO.
 * 
 * Instrucciones de Uso:
 * 1. Abre este archivo con un editor de texto y configura las credenciales de tu base de datos MySQL en la sección de CONFIGURACIÓN.
 * 2. Define qué columnas de tu tabla MySQL representan el código, nombre, costo, precio y stock.
 * 3. Ejecuta en la terminal de tu proyecto:
 *    node importar_mysql.cjs [id_de_la_empresa]
 *    (Ejemplo: "node importar_mysql.cjs default" para Elena Farma C.A.)
 */

const fs = require('fs');
const path = require('path');

const EMPRESA_ID = process.argv[2] || 'default';
const RUTA_DB = path.join(__dirname, 'data', `db_${EMPRESA_ID}.json`);

console.log('=======================================================================');
console.log('             ELENA PRO - IMPORTADOR DIRECTO DESDE MYSQL 🐬             ');
console.log('=======================================================================');

// =======================================================================
//   1. SECCIÓN DE CONFIGURACIÓN DE TU BASE DE DATOS MYSQL (Ajusta aquí)
// =======================================================================
const CONFIG_MYSQL = {
  host: 'localhost',      // Dirección del servidor MySQL (ej: 'localhost' o IP de la red)
  port: 3306,             // Puerto por defecto de MySQL
  user: 'root',           // Usuario de la base de datos
  password: '',           // Contraseña de la base de datos
  database: 'mi_sistema_anterior', // Nombre de la base de datos donde están los productos
  
  // Nombre de la tabla de productos de tu sistema anterior
  tabla_productos: 'productos',

  // MAPEO DE COLUMNAS: Ajusta el nombre de las columnas reales en tu tabla de MySQL
  mapeo_columnas: {
    codigo: 'codigo',              // Columna del código de barras (ej: 'codigo', 'cod_barra', 'barcode')
    nombre: 'nombre',              // Columna del nombre del producto (ej: 'nombre', 'descripcion', 'art_descrip')
    categoria: 'categoria',        // Columna de categoría/rubro (ej: 'categoria', 'grupo_id', 'departamento')
    precio_compra: 'precio_compra',// Columna del costo/compra (ej: 'costo', 'precio_costo', 'precio_compra')
    precio_venta: 'precio_venta',  // Columna del precio de venta (ej: 'precio', 'precio_publico', 'precio_venta')
    stock: 'stock'                 // Columna de la existencia/stock (ej: 'existencia', 'stock', 'cantidad')
  },

  // Consulta SQL Personalizada (Opcional):
  // Si tu base de datos requiere JOINs o filtros especiales, puedes descomentar la siguiente línea
  // y usar una consulta pura. Si se define, se ignorará la 'tabla_productos' y el 'mapeo_columnas'.
  consulta_personalizada: null, // "SELECT codigo_barra AS codigo, descrip AS nombre, 'MEDICAMENTO' AS categoria, costo AS precio_compra, precio1 AS precio_venta, existencia AS stock FROM tabla_articulos WHERE existencia > 0"
};

// =======================================================================
//   2. COMPROBACIÓN DE DEPENDENCIAS (Verifica si mysql2 está instalado)
// =======================================================================
let mysql;
try {
  mysql = require('mysql2/promise');
} catch (err) {
  console.log('\n\x1b[33m[ALERTA] Para usar este importador necesitas instalar el conector de MySQL.\x1b[0m');
  console.log('Por favor, ejecuta el siguiente comando en tu consola antes de continuar:\n');
  console.log('\x1b[36m    npm install mysql2\x1b[0m\n');
  console.log('Una vez instalado, configura las credenciales dentro de este archivo y vuelve a ejecutarlo.');
  console.log('=======================================================================');
  process.exit(0);
}

// =======================================================================
//   3. PROCESAMIENTO E IMPORTACIÓN
// =======================================================================
async function main() {
  // Verificar si existe la base de datos de Elena PRO
  if (!fs.existsSync(RUTA_DB)) {
    console.error(`\x1b[31m[ERROR] No se encontró el archivo de base de datos de Elena PRO para la empresa: "${EMPRESA_ID}"\x1b[0m`);
    console.log(`Buscando en: ${RUTA_DB}`);
    console.log('Asegúrate de haber iniciado el sistema al menos una vez para que cree los archivos base.');
    process.exit(1);
  }

  let connection;
  try {
    console.log(`[INFO] Conectando a MySQL (${CONFIG_MYSQL.user}@${CONFIG_MYSQL.host}:${CONFIG_MYSQL.port}/${CONFIG_MYSQL.database})...`);
    connection = await mysql.createConnection({
      host: CONFIG_MYSQL.host,
      port: CONFIG_MYSQL.port,
      user: CONFIG_MYSQL.user,
      password: CONFIG_MYSQL.password,
      database: CONFIG_MYSQL.database
    });
    console.log('\x1b[32m[ÉXITO] Conexión establecida con la base de datos MySQL.\x1b[0m');
  } catch (connErr) {
    console.error('\x1b[31m[ERROR] No se pudo establecer conexión con MySQL.\x1b[0m');
    console.error('Mensaje técnico:', connErr.message);
    console.log('\nPor favor, verifica:');
    console.log('1. Que tu servidor MySQL (XAMPP, WampServer, Laragon, etc.) esté ENCENDIDO.');
    console.log('2. Que el Host, Puerto, Usuario y Contraseña en este archivo sean correctos.');
    console.log('3. Que el nombre de la base de datos existat.');
    console.log('=======================================================================');
    process.exit(1);
  }

  try {
    // Definir la consulta a realizar
    let sqlQuery = '';
    if (CONFIG_MYSQL.consulta_personalizada) {
      sqlQuery = CONFIG_MYSQL.consulta_personalizada;
      console.log('[INFO] Utilizando consulta SQL personalizada...');
    } else {
      const m = CONFIG_MYSQL.mapeo_columnas;
      sqlQuery = `SELECT 
        \`${m.codigo}\` AS codigo, 
        \`${m.nombre}\` AS nombre, 
        \`${m.categoria}\` AS categoria, 
        \`${m.precio_compra}\` AS precio_compra, 
        \`${m.precio_venta}\` AS precio_venta, 
        \`${m.stock}\` AS stock 
        FROM \`${CONFIG_MYSQL.tabla_productos}\``;
      console.log(`[INFO] Consultando productos de la tabla "${CONFIG_MYSQL.tabla_productos}"...`);
    }

    const [rows] = await connection.query(sqlQuery);
    console.log(`[INFO] Se encontraron ${rows.length} registros en MySQL.`);

    if (rows.length === 0) {
      console.log('\x1b[33m[AVISO] No hay productos para importar en la base de datos de origen.\x1b[0m');
      await connection.end();
      process.exit(0);
    }

    // Leer la base de datos actual de Elena PRO
    console.log(`[INFO] Cargando base de datos destino: ${RUTA_DB}`);
    let dbData = { productos: [] };
    try {
      if (fs.existsSync(RUTA_DB)) {
        dbData = JSON.parse(fs.readFileSync(RUTA_DB, 'utf8'));
      }
    } catch (parseErr) {
      console.warn('[AVISO] No se pudo parsear el JSON de la BD actual, se iniciará con estructura limpia.');
    }
    if (!dbData.productos || !Array.isArray(dbData.productos)) {
      dbData.productos = [];
    }

    let agregados = 0;
    let actualizados = 0;
    let errores = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      const codigoRaw = row.codigo ? String(row.codigo).trim() : '';
      const nombreRaw = row.nombre ? String(row.nombre).trim() : '';
      const categoriaRaw = row.categoria ? String(row.categoria).trim().toUpperCase() : '';
      const precioCompra = parseFloat(row.precio_compra || 0);
      const precioVenta = parseFloat(row.precio_venta || 0);
      const stock = parseInt(row.stock || 0, 10);

      if (!nombreRaw || isNaN(precioVenta)) {
        errores++;
        continue;
      }

      // Validar categoría correcta de Elena PRO
      let categoria = 'EXENTO';
      if (categoriaRaw === 'MEDICAMENTO' || categoriaRaw === 'MEDICAMENTOS' || categoriaRaw === 'MED') {
        categoria = 'MEDICAMENTO';
      } else if (categoriaRaw === 'GRAVADO_16' || categoriaRaw === 'GRAVADO' || categoriaRaw === 'IVA_16' || categoriaRaw === 'IVA') {
        categoria = 'GRAVADO_16';
      } else {
        categoria = 'EXENTO';
      }

      // Buscar si el producto ya existe en Elena PRO por código de barra o código
      const indexExistente = dbData.productos.findIndex(p => p.codigo === codigoRaw && codigoRaw !== '');

      const productoData = {
        id: indexExistente !== -1 ? dbData.productos[indexExistente].id : `prod_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        codigo: codigoRaw,
        nombre: nombreRaw,
        categoria,
        precio_compra: isNaN(precioCompra) ? 0 : precioCompra,
        precio_venta: precioVenta,
        stock: stock,
        ganancia_perc: isNaN(precioCompra) || precioCompra === 0 ? 30 : Math.round(((precioVenta - precioCompra) / precioCompra) * 100)
      };

      if (indexExistente !== -1) {
        // Actualizar producto existente sumando el stock
        const stockExistente = parseInt(dbData.productos[indexExistente].stock || 0, 10);
        dbData.productos[indexExistente] = {
          ...dbData.productos[indexExistente],
          ...productoData,
          stock: stockExistente + stock // Sumar el stock nuevo al existente de forma segura
        };
        actualizados++;
      } else {
        // Agregar nuevo producto
        dbData.productos.push(productoData);
        agregados++;
      }
    }

    // Guardar cambios en el JSON de forma atómica para evitar corrupción por apagón/fallos
    const tempPath = `${RUTA_DB}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(dbData, null, 2), 'utf8');
    fs.renameSync(tempPath, RUTA_DB);

    console.log('\n=======================================================================');
    console.log('              ¡IMPORTACIÓN DESDE MYSQL COMPLETADA CON ÉXITO! 🎉         ');
    console.log('=======================================================================');
    console.log(`Empresa Destino:   ${EMPRESA_ID}`);
    console.log(`Servidor MySQL:    ${CONFIG_MYSQL.host}`);
    console.log(`Nuevos Productos:  ${agregados}`);
    console.log(`Actualizados:      ${actualizados} (Se sumó el stock nuevo al existente)`);
    console.log(`Registros Omitidos: ${errores}`);
    console.log('=======================================================================');
    console.log('Los cambios ya están listos. Inicia o refresca Elena PRO.');

  } catch (queryErr) {
    console.error('\x1b[31m[ERROR] Hubo un error procesando la consulta SQL o guardando los datos.\x1b[0m');
    console.error('Mensaje técnico:', queryErr.message);
    console.log('Por favor verifica que la tabla y los nombres de las columnas en este script sean idénticos a los de tu base de datos.');
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

main();
