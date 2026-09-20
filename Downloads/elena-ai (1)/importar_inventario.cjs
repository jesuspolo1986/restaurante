/**
 * Elena PRO - Script de Importación de Inventario desde CSV 💊
 * 
 * Este script te permite importar masivamente el inventario de tus clientes (desde Excel/CSV) 
 * directamente a la base de datos de Elena PRO (db_*.json).
 * 
 * Instrucciones de uso:
 * 1. Exporta el inventario del cliente desde su sistema anterior o Excel a formato CSV (delimitado por comas o punto y coma).
 * 2. Asegúrate de que las columnas coincidan con las siguientes (en cualquier orden, usando estos encabezados):
 *    codigo, nombre, categoria, precio_compra, precio_venta, stock
 * 3. Coloca el archivo con el nombre "inventario.csv" en la raíz de esta carpeta.
 * 4. Ejecuta en la consola: node importar_inventario.js [id_de_la_empresa]
 *    (Ejemplo: "node importar_inventario.js default" para Elena Farma C.A.)
 */

const fs = require('fs');
const path = require('path');

// Configuración por defecto
const NOMBRE_ARCHIVO_CSV = 'inventario.csv';
const EMPRESA_ID = process.argv[2] || 'default'; // Si no se pasa parámetro, usa default
const RUTA_DB = path.join(__dirname, 'data', `db_${EMPRESA_ID}.json`);

console.log('=======================================================================');
console.log('              ELENA PRO - IMPORTADOR MASIVO DE INVENTARIO              ');
console.log('=======================================================================');

// 1. Verificar si existe la base de datos de destino
if (!fs.existsSync(RUTA_DB)) {
  console.error(`\x1b[31m[ERROR] No se encontró el archivo de base de datos para la empresa: "${EMPRESA_ID}"\x1b[0m`);
  console.log(`Buscando en: ${RUTA_DB}`);
  console.log('Asegúrate de que la empresa esté registrada en el sistema.');
  process.exit(1);
}

// 2. Verificar si existe el archivo CSV
const rutaCSV = path.join(__dirname, NOMBRE_ARCHIVO_CSV);
if (!fs.existsSync(rutaCSV)) {
  console.log(`\n\x1b[33m[INFO] No se encontró el archivo "${NOMBRE_ARCHIVO_CSV}" en la raíz.\x1b[0m`);
  console.log('Creando una plantilla de ejemplo llamada "inventario_plantilla.csv"...');
  
  const plantillaContenido = `codigo,nombre,categoria,precio_compra,precio_venta,stock
750100200300,Atamel Forte 650mg,MEDICAMENTO,1.20,1.80,50
750400500600,Gatorade 500ml,EXENTO,1.00,1.50,120
750700800900,Crema Dental Colgate,GRAVADO_16,2.10,3.20,35
`;
  fs.writeFileSync(path.join(__dirname, 'inventario_plantilla.csv'), plantillaContenido, 'utf8');
  console.log('\x1b[32m¡Plantilla creada con éxito! Abre "inventario_plantilla.csv" para ver el formato.\x1b[0m');
  console.log('Rellena la plantilla con los productos del cliente, guárdala como "inventario.csv" y vuelve a correr este script.');
  process.exit(0);
}

// 3. Leer y procesar el CSV
try {
  const contenido = fs.readFileSync(rutaCSV, 'utf8');
  const lineas = contenido.split(/\r?\n/).filter(linea => linea.trim() !== '');
  
  if (lineas.length <= 1) {
    console.error('\x1b[31m[ERROR] El archivo CSV está vacío o solo contiene la línea de encabezados.\x1b[0m');
    process.exit(1);
  }

  // Detectar delimitador (coma o punto y coma)
  const cabecera = lineas[0];
  const delimitador = cabecera.includes(';') ? ';' : ',';
  
  // Mapear columnas
  const columnas = cabecera.split(delimitador).map(col => col.trim().toLowerCase());
  const idxCodigo = columnas.indexOf('codigo');
  const idxNombre = columnas.indexOf('nombre');
  const idxCategoria = columnas.indexOf('categoria');
  const idxPrecioCompra = columnas.indexOf('precio_compra');
  const idxPrecioVenta = columnas.indexOf('precio_venta');
  const idxStock = columnas.indexOf('stock');

  if (idxCodigo === -1 || idxNombre === -1 || idxCategoria === -1 || idxPrecioVenta === -1 || idxStock === -1) {
    console.error('\x1b[31m[ERROR] El CSV no tiene las columnas obligatorias.\x1b[0m');
    console.log('Columnas requeridas: codigo, nombre, categoria, precio_venta, stock');
    console.log(`Columnas detectadas en tu archivo: [${columnas.join(', ')}]`);
    process.exit(1);
  }

  // Leer base de datos actual
  const dbData = JSON.parse(fs.readFileSync(RUTA_DB, 'utf8'));
  if (!dbData.productos) dbData.productos = [];

  let agregados = 0;
  let actualizados = 0;
  let errores = 0;

  for (let i = 1; i < lineas.length; i++) {
    const linea = lineas[i];
    
    // Split simple respetando comillas para nombres con comas
    let celdas = [];
    let dentroDeComillas = false;
    let celdaActual = '';
    
    for (let char of linea) {
      if (char === '"') {
        dentroDeComillas = !dentroDeComillas;
      } else if (char === delimitador && !dentroDeComillas) {
        celdas.push(celdaActual.trim());
        celdaActual = '';
      } else {
        celdaActual += char;
      }
    }
    celdas.push(celdaActual.trim());

    if (celdas.length < columnas.length) {
      console.log(`\x1b[33m[ADVERTENCIA] Saltando línea ${i + 1} por columnas insuficientes.\x1b[0m`);
      errores++;
      continue;
    }

    const codigo = celdas[idxCodigo].replace(/"/g, '');
    const nombre = celdas[idxNombre].replace(/"/g, '');
    let categoriaRaw = celdas[idxCategoria].replace(/"/g, '').toUpperCase();
    const precioCompra = parseFloat(celdas[idxPrecioCompra]?.replace(/"/g, '') || 0);
    const precioVenta = parseFloat(celdas[idxPrecioVenta].replace(/"/g, ''));
    const stock = parseInt(celdas[idxStock].replace(/"/g, '') || 0, 10);

    // Validar categoría correcta de Elena PRO
    let categoria = 'EXENTO';
    if (categoriaRaw === 'MEDICAMENTO' || categoriaRaw === 'MEDICAMENTOS') {
      categoria = 'MEDICAMENTO';
    } else if (categoriaRaw === 'GRAVADO_16' || categoriaRaw === 'GRAVADO' || categoriaRaw === 'IVA_16') {
      categoria = 'GRAVADO_16';
    } else {
      categoria = 'EXENTO';
    }

    if (!nombre || isNaN(precioVenta) || isNaN(stock)) {
      console.log(`\x1b[33m[ADVERTENCIA] Fila ${i + 1} inválida (Falta nombre, precio o stock). Saltada.\x1b[0m`);
      errores++;
      continue;
    }

    // Buscar si el producto ya existe por código de barra o código
    const indexExistente = dbData.productos.findIndex(p => p.codigo === codigo);

    const productoData = {
      id: indexExistente !== -1 ? dbData.productos[indexExistente].id : `prod_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      codigo,
      nombre,
      categoria,
      precio_compra: isNaN(precioCompra) ? 0 : precioCompra,
      precio_venta: precioVenta,
      stock,
      ganancia_perc: isNaN(precioCompra) || precioCompra === 0 ? 30 : Math.round(((precioVenta - precioCompra) / precioCompra) * 100)
    };

    if (indexExistente !== -1) {
      // Actualizar producto existente
      dbData.productos[indexExistente] = {
        ...dbData.productos[indexExistente],
        ...productoData,
        stock: dbData.productos[indexExistente].stock + stock // Sumar el stock nuevo al existente
      };
      actualizados++;
    } else {
      // Insertar nuevo producto
      dbData.productos.push(productoData);
      agregados++;
    }
  }

  // Guardar cambios en la base de datos
  fs.writeFileSync(RUTA_DB, JSON.stringify(dbData, null, 2), 'utf8');

  console.log('\n\x1b[32m¡IMPORTACIÓN COMPLETADA CON ÉXITO! 🎉\x1b[0m');
  console.log(`Empresa Destino:   ${EMPRESA_ID}`);
  console.log(`Ruta Base Datos:   ${RUTA_DB}`);
  console.log(`Nuevos Productos:  ${agregados}`);
  console.log(`Actualizados:      ${actualizados} (Se sumó el stock nuevo)`);
  console.log(`Filas con Error:   ${errores}`);
  console.log('=======================================================================');
  console.log('Los cambios ya están listos. Refresca el sistema en tu navegador.');
  
} catch (err) {
  console.error('\x1b[31m[ERROR] Ocurrió un fallo crítico leyendo el CSV:\x1b[0m', err.message);
}
