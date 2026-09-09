package com.example.network

import android.content.Context
import android.net.wifi.WifiManager
import android.util.Log
import com.example.data.RestaurantRepository
import com.example.data.Product
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStream
import java.net.ServerSocket
import java.net.Socket
import java.net.NetworkInterface
import java.util.Collections
import java.util.concurrent.Executors

class LocalWebServer(
    private val context: Context,
    private val repository: RestaurantRepository
) {
    private var serverSocket: ServerSocket? = null
    private var isRunning = false
    private var executorService = Executors.newCachedThreadPool()
    private val scope = CoroutineScope(Dispatchers.IO)

    fun start(port: Int = 8080): String {
        try {
            stop()
            val ipAddress = getLocalIpAddress() ?: "127.0.0.1"
            serverSocket = ServerSocket(port)
            isRunning = true

            if (executorService.isShutdown) {
                executorService = Executors.newCachedThreadPool()
            }

            executorService.execute {
                while (isRunning) {
                    try {
                        val socket = serverSocket?.accept() ?: break
                        executorService.execute {
                            handleClient(socket)
                        }
                    } catch (e: Exception) {
                        if (isRunning) {
                            Log.e("LocalWebServer", "Error accepting connection", e)
                        }
                    }
                }
            }

            Log.d("LocalWebServer", "Server started on http://$ipAddress:$port")
            return "http://$ipAddress:$port"
        } catch (e: Exception) {
            Log.e("LocalWebServer", "Error starting server", e)
        }
        return "Error"
    }

    fun stop() {
        isRunning = false
        try {
            serverSocket?.close()
            serverSocket = null
        } catch (e: Exception) {
            Log.e("LocalWebServer", "Error stopping server socket", e)
        }
        try {
            executorService.shutdownNow()
        } catch (e: Exception) {
            Log.e("LocalWebServer", "Error shutting down executor", e)
        }
    }

    fun getLocalIpAddress(): String? {
        try {
            // Priority: Try WifiManager
            val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
            wifiManager?.connectionInfo?.let { info ->
                val ipAddress = info.ipAddress
                if (ipAddress != 0) {
                    val formattedIp = String.format(
                        "%d.%d.%d.%d",
                        ipAddress and 0xff,
                        ipAddress shr 8 and 0xff,
                        ipAddress shr 16 and 0xff,
                        ipAddress shr 24 and 0xff
                    )
                    return formattedIp
                }
            }

            // Fallback: Loop Network Interfaces
            val interfaces = Collections.list(NetworkInterface.getNetworkInterfaces())
            for (intf in interfaces) {
                val addrs = Collections.list(intf.inetAddresses)
                for (addr in addrs) {
                    if (!addr.isLoopbackAddress) {
                        val sAddr = addr.hostAddress ?: ""
                        val isIPv4 = sAddr.indexOf(':') < 0
                        if (isIPv4) return sAddr
                    }
                }
            }
        } catch (ex: Exception) {
            Log.e("LocalWebServer", "Error getting IP", ex)
        }
        return "127.0.0.1" // Default local host simulation
    }

    private fun handleClient(socket: Socket) {
        try {
            val inputStream = socket.getInputStream()
            val outputStream = socket.getOutputStream()
            val reader = BufferedReader(InputStreamReader(inputStream, "UTF-8"))
            
            val firstLine = reader.readLine() ?: return
            val parts = firstLine.split(" ")
            if (parts.size < 2) return
            val method = parts[0]
            val pathWithQuery = parts[1]
            val path = pathWithQuery.split("?")[0]

            var contentLength = 0
            var line: String?
            while (reader.readLine().also { line = it } != null) {
                if (line!!.isEmpty()) {
                    break
                }
                if (line!!.startsWith("Content-Length:", ignoreCase = true)) {
                    contentLength = line!!.substring("Content-Length:".length).trim().toIntOrNull() ?: 0
                }
            }

            if (method.equals("OPTIONS", ignoreCase = true)) {
                sendResponse(outputStream, 204, "No Content", null, ByteArray(0))
                return
            }

            if (path == "/") {
                if (method.equals("GET", ignoreCase = true)) {
                    scope.launch {
                        try {
                            val categories = repository.allCategories.first()
                            val products = repository.allProducts.first()
                            val config = repository.config.first()
                            val exchangeRate = config?.exchangeRateBs ?: 42.5

                            val html = buildMenuHtml(categories, products, exchangeRate)
                            val bytes = html.toByteArray(Charsets.UTF_8)
                            sendResponse(outputStream, 200, "OK", "text/html; charset=utf-8", bytes)
                        } catch (e: Exception) {
                            val err = "Error rendering menu: ${e.message}"
                            sendResponse(outputStream, 500, "Internal Server Error", "text/plain", err.toByteArray(Charsets.UTF_8))
                        } finally {
                            try { socket.close() } catch (ignored: Exception) {}
                        }
                    }
                    return
                } else {
                    sendResponse(outputStream, 405, "Method Not Allowed", "text/plain", "Method Not Allowed".toByteArray(Charsets.UTF_8))
                }
            } else if (path == "/api/products") {
                if (method.equals("GET", ignoreCase = true)) {
                    scope.launch {
                        try {
                            val products = repository.allProducts.first()
                            val jsonArray = JSONArray()
                            for (p in products) {
                                val jobj = JSONObject()
                                jobj.put("id", p.id)
                                jobj.put("name", p.name)
                                jobj.put("description", p.description)
                                jobj.put("priceUsd", p.priceUsd)
                                jobj.put("categoryId", p.categoryId)
                                jobj.put("stock", p.stock)
                                jobj.put("isAvailable", p.isAvailable)
                                jobj.put("imageUri", p.imageUri)
                                jsonArray.put(jobj)
                            }
                            val bytes = jsonArray.toString().toByteArray(Charsets.UTF_8)
                            sendResponse(outputStream, 200, "OK", "application/json; charset=utf-8", bytes)
                        } catch (e: Exception) {
                            sendResponse(outputStream, 500, "Internal Server Error", "text/plain", "Internal Error".toByteArray(Charsets.UTF_8))
                        } finally {
                            try { socket.close() } catch (ignored: Exception) {}
                        }
                    }
                    return
                } else {
                    sendResponse(outputStream, 405, "Method Not Allowed", "text/plain", "Method Not Allowed".toByteArray(Charsets.UTF_8))
                }
            } else if (path == "/api/images") {
                if (method.equals("GET", ignoreCase = true)) {
                    val fileParam = pathWithQuery.substringAfter("file=", "").substringBefore("&")
                    if (fileParam.isNotEmpty()) {
                        scope.launch {
                            try {
                                val directory = java.io.File(context.filesDir, "product_images")
                                val file = java.io.File(directory, fileParam)
                                if (file.exists() && file.isFile) {
                                    val bytes = file.readBytes()
                                    sendResponse(outputStream, 200, "OK", "image/jpeg", bytes)
                                } else {
                                    sendResponse(outputStream, 404, "Not Found", "text/plain", "Image Not Found".toByteArray(Charsets.UTF_8))
                                }
                            } catch (e: Exception) {
                                sendResponse(outputStream, 500, "Internal Error", "text/plain", "Server Error".toByteArray(Charsets.UTF_8))
                            } finally {
                                try { socket.close() } catch (ignored: Exception) {}
                            }
                        }
                        return
                    } else {
                        sendResponse(outputStream, 400, "Bad Request", "text/plain", "Missing file parameter".toByteArray(Charsets.UTF_8))
                    }
                } else {
                    sendResponse(outputStream, 405, "Method Not Allowed", "text/plain", "Method Not Allowed".toByteArray(Charsets.UTF_8))
                }
            } else if (path == "/api/order") {
                if (method.equals("POST", ignoreCase = true)) {
                    val bodyChars = CharArray(contentLength)
                    var read = 0
                    while (read < contentLength) {
                        val r = reader.read(bodyChars, read, contentLength - read)
                        if (r == -1) break
                        read += r
                    }
                    val requestBody = String(bodyChars)

                    scope.launch {
                        try {
                            val json = JSONObject(requestBody)
                            val tableNumber = json.optString("tableNumber", "Para llevar")
                            val orderType = json.optString("orderType", "TAKEAWAY")
                            val paymentMethod = json.optString("paymentMethod", "Efectivo $")
                            val notes = json.optString("notes", "")

                            val cartArray = json.getJSONArray("items")
                            val allProducts = repository.allProducts.first()

                            val itemsToOrder = ArrayList<Pair<Product, Int>>()
                            for (i in 0 until cartArray.length()) {
                                val cartItem = cartArray.getJSONObject(i)
                                val productId = cartItem.getInt("productId")
                                val quantity = cartItem.getInt("quantity")

                                val product = allProducts.find { it.id == productId }
                                if (product != null && product.stock >= quantity) {
                                    itemsToOrder.add(Pair(product, quantity))
                                }
                            }

                            if (itemsToOrder.isNotEmpty()) {
                                val orderId = repository.placeOrder(
                                    tableNumber = tableNumber,
                                    orderType = orderType,
                                    paymentMethod = paymentMethod,
                                    paymentStatus = "PENDING_CONFIRMATION",
                                    notes = notes,
                                    items = itemsToOrder
                                )

                                val responseJson = JSONObject()
                                responseJson.put("status", "success")
                                responseJson.put("orderId", orderId)
                                val bytes = responseJson.toString().toByteArray(Charsets.UTF_8)
                                sendResponse(outputStream, 200, "OK", "application/json; charset=utf-8", bytes)
                            } else {
                                val responseJson = JSONObject()
                                responseJson.put("status", "error")
                                responseJson.put("message", "Inventario insuficiente o carrito vacio")
                                val bytes = responseJson.toString().toByteArray(Charsets.UTF_8)
                                sendResponse(outputStream, 400, "Bad Request", "application/json; charset=utf-8", bytes)
                            }
                        } catch (e: Exception) {
                            val responseJson = JSONObject()
                            responseJson.put("status", "error")
                            responseJson.put("message", e.message ?: "Error desconocido")
                            val bytes = responseJson.toString().toByteArray(Charsets.UTF_8)
                            sendResponse(outputStream, 500, "Internal Server Error", "application/json; charset=utf-8", bytes)
                        } finally {
                            try { socket.close() } catch (ignored: Exception) {}
                        }
                    }
                    return
                } else {
                    sendResponse(outputStream, 405, "Method Not Allowed", "text/plain", "Method Not Allowed".toByteArray(Charsets.UTF_8))
                }
            } else {
                sendResponse(outputStream, 404, "Not Found", "text/plain", "Not Found".toByteArray(Charsets.UTF_8))
            }
        } catch (e: Exception) {
            Log.e("LocalWebServer", "Error handling client", e)
        } finally {
            try { socket.close() } catch (ignored: Exception) {}
        }
    }

    private fun sendResponse(
        outputStream: OutputStream,
        statusCode: Int,
        statusText: String,
        contentType: String?,
        body: ByteArray
    ) {
        try {
            val writer = outputStream.bufferedWriter(Charsets.UTF_8)
            writer.write("HTTP/1.1 $statusCode $statusText\r\n")
            writer.write("Access-Control-Allow-Origin: *\r\n")
            writer.write("Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n")
            writer.write("Access-Control-Allow-Headers: Content-Type\r\n")
            if (contentType != null) {
                writer.write("Content-Type: $contentType\r\n")
            }
            writer.write("Content-Length: ${body.size}\r\n")
            writer.write("Connection: close\r\n")
            writer.write("\r\n")
            writer.flush()

            outputStream.write(body)
            outputStream.flush()
        } catch (e: Exception) {
            Log.e("LocalWebServer", "Error sending response", e)
        }
    }


    private fun buildMenuHtml(
        categories: List<com.example.data.Category>,
        products: List<com.example.data.Product>,
        exchangeRate: Double
    ): String {
        val categoriesJson = JSONArray()
        for (cat in categories) {
            val j = JSONObject()
            j.put("id", cat.id)
            j.put("name", cat.name)
            categoriesJson.put(j)
        }

        val productsJson = JSONArray()
        for (prod in products) {
            val j = JSONObject()
            j.put("id", prod.id)
            j.put("name", prod.name)
            j.put("description", prod.description)
            j.put("priceUsd", prod.priceUsd)
            j.put("categoryId", prod.categoryId)
            j.put("stock", prod.stock)
            j.put("isAvailable", prod.isAvailable)
            j.put("imageUri", prod.imageUri)
            productsJson.put(j)
        }

        // Return a beautiful self-contained HTML page using Tailwind CSS
        return """
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Menu Digital - Restaurante Local</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
                <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
                <style>
                    body { font-family: 'Inter', sans-serif; }
                </style>
            </head>
            <body class="bg-[#fef7ff] text-[#1d1b20] pb-24 font-sans">
                <header class="bg-[#6750a4] text-white shadow-md sticky top-0 z-40">
                    <div class="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                        <div class="flex flex-col">
                            <span class="text-[11px] font-medium tracking-wider text-[#eaddff] uppercase">Autoservicio Digital</span>
                            <h1 class="text-xl font-bold tracking-tight">Restaurante Local</h1>
                        </div>
                        <div class="flex items-center gap-3">
                            <div class="text-right hidden sm:block">
                                <span class="text-xs bg-white/20 px-2 py-1 rounded-full">Tasa: ${'$'}1 = ${String.format("%.2f", exchangeRate)} Bs</span>
                            </div>
                            <div class="w-10 h-10 rounded-full bg-[#eaddff] flex items-center justify-center text-[#21005d]">
                                <span class="material-icons">person</span>
                            </div>
                        </div>
                    </div>
                </header>

                <main class="max-w-4xl mx-auto px-4 py-6 space-y-6">
                    <!-- Analysis & Recommendations Tooltip (Context Injection) -->
                    <div class="p-4 bg-[#d0e4ff] rounded-2xl flex gap-3 items-start border border-[#aac7eb]">
                        <span class="material-icons text-[#001d35]">info</span>
                        <div class="text-xs leading-relaxed text-[#001d35]">
                            <strong>Análisis Pro:</strong> El modelo local garantiza cero latencia. Se recomienda usar <strong>WebSockets</strong> para sincronización real en cocina. Implemente <strong>Conciliación Dual</strong> para pagos mixtos (Zelle/Bs).
                        </div>
                    </div>

                    <!-- Categorias -->
                    <div>
                        <div class="flex items-center justify-between mb-3">
                            <h2 class="text-sm font-medium text-[#49454f]">Categorías del Sistema</h2>
                        </div>
                        <div class="overflow-x-auto flex space-x-2 pb-2 scrollbar-none" id="categories-container">
                            <button onclick="filterCategory(0)" id="cat-btn-0" class="px-4 py-2 bg-[#6750a4] text-white rounded-full text-sm font-semibold shadow-sm shrink-0 whitespace-nowrap transition-colors">Todos</button>
                        </div>
                    </div>

                    <!-- Platos -->
                    <div>
                        <h2 class="text-lg font-bold mb-4 flex items-center gap-2 text-[#1d1b20]">
                            <span class="material-icons text-[#6750a4]">restaurant_menu</span> Nuestro Menú
                        </h2>
                        <div id="products-container" class="grid gap-4 md:grid-cols-2"></div>
                    </div>
                </main>

                <!-- Carrito Flotante -->
                <div id="cart-footer" class="fixed bottom-0 left-0 right-0 bg-[#f3edf7] border-t border-[#e7e0ec] shadow-xl px-4 py-3 hidden z-50">
                    <div class="max-w-4xl mx-auto flex items-center justify-between">
                        <div>
                            <span class="text-xs text-[#49454f] font-medium" id="cart-count">0 artículos</span>
                            <div class="text-lg font-bold text-[#6750a4]" id="cart-total">${'$'}0.00 / 0.00 Bs</div>
                        </div>
                        <button onclick="openOrderModal()" class="bg-[#6750a4] text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-[#4f378b] transition shadow-md flex items-center gap-1">
                            <span class="material-icons text-sm">shopping_cart_checkout</span> Hacer Pedido
                        </button>
                    </div>
                </div>

                <!-- Modal de Pedido -->
                <div id="order-modal" class="fixed inset-0 bg-black/60 z-50 items-center justify-center p-4 hidden flex">
                    <div class="bg-white rounded-3xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto shadow-2xl border border-[#cac4d0]">
                        <div class="flex items-center justify-between border-b border-[#e7e0ec] pb-3 mb-4">
                            <h3 class="text-lg font-bold text-[#1d1b20]">Confirmar tu Pedido</h3>
                            <button onclick="closeOrderModal()" class="text-slate-400 hover:text-[#1d1b20]">
                                <span class="material-icons">close</span>
                            </button>
                        </div>
                        
                        <div class="space-y-4">
                            <!-- Ubicacion -->
                            <div>
                                <label class="block text-xs font-semibold text-[#49454f] uppercase tracking-wider mb-1">¿Dónde comerás?</label>
                                <div class="grid grid-cols-2 gap-2">
                                    <button id="type-dinein" onclick="setOrderType('DINE_IN')" class="border-2 border-[#6750a4] bg-[#eaddff] text-[#21005d] p-3 rounded-2xl flex flex-col items-center justify-center transition">
                                        <span class="material-icons text-lg">restaurant</span>
                                        <span class="text-xs font-semibold mt-1">En la Mesa</span>
                                    </button>
                                    <button id="type-takeaway" onclick="setOrderType('TAKEAWAY')" class="border-2 border-[#cac4d0] p-3 rounded-2xl flex flex-col items-center justify-center transition text-[#49454f]">
                                        <span class="material-icons text-lg">takeout_dining</span>
                                        <span class="text-xs font-semibold mt-1">Para Llevar</span>
                                    </button>
                                </div>
                            </div>

                            <!-- Mesa -->
                            <div id="table-number-group">
                                <label class="block text-xs font-semibold text-[#49454f] uppercase tracking-wider mb-1">Número de Mesa</label>
                                <input type="text" id="input-table" placeholder="Ej. Mesa 3" class="w-full border border-[#cac4d0] rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6750a4]">
                            </div>

                            <!-- Metodo de pago -->
                            <div>
                                <label class="block text-xs font-semibold text-[#49454f] uppercase tracking-wider mb-1">Método de Pago Sugerido</label>
                                <select id="select-payment" class="w-full border border-[#cac4d0] rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6750a4] bg-white">
                                    <option value="Pago Movil">Pago Móvil</option>
                                    <option value="Efectivo Bs">Efectivo Bs</option>
                                    <option value="Punto de Venta">Punto de Venta</option>
                                    <option value="Efectivo ${'$'}">Efectivo ${'$'}</option>
                                    <option value="Zelle">Zelle</option>
                                    <option value="Credito">Crédito</option>
                                </select>
                            </div>

                            <!-- Notas -->
                            <div>
                                <label class="block text-xs font-semibold text-[#49454f] uppercase tracking-wider mb-1">Notas especiales</label>
                                <textarea id="input-notes" rows="2" placeholder="Sin cebolla, extra salsa, etc." class="w-full border border-[#cac4d0] rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6750a4]"></textarea>
                            </div>

                            <!-- Resumen del Pago -->
                            <div class="bg-[#f7f2fa] rounded-2xl p-3 border border-dashed border-[#cac4d0]">
                                <div class="flex justify-between text-xs text-[#49454f]">
                                    <span>Total USD:</span>
                                    <span class="font-bold text-[#1d1b20]" id="modal-total-usd">${'$'}0.00</span>
                                </div>
                                <div class="flex justify-between text-sm mt-1">
                                    <span class="font-medium text-[#1d1b20]">Total en Bs:</span>
                                    <span class="font-bold text-[#6750a4]" id="modal-total-bs">0.00 Bs</span>
                                </div>
                            </div>

                            <!-- Boton Enviar -->
                            <button onclick="submitOrder()" class="w-full bg-[#6750a4] text-white py-3 rounded-full font-bold hover:bg-[#4f378b] transition shadow-lg flex items-center justify-center gap-2">
                                <span class="material-icons">send</span> Enviar Pedido a Cocina
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Notificacion -->
                <div id="toast" class="fixed bottom-24 left-4 right-4 bg-slate-900 text-white px-4 py-3 rounded-full shadow-2xl flex items-center justify-between text-sm font-medium transition-all transform translate-y-32 hidden z-50">
                    <span id="toast-message">Pedido realizado con éxito</span>
                    <span class="material-icons text-amber-500">check_circle</span>
                </div>

                <script>
                    const categories = $categoriesJson;
                    const products = $productsJson;
                    const exchangeRate = $exchangeRate;

                    let cart = {}; // productId -> quantity
                    let selectedCategoryId = 0;
                    let selectedOrderType = "DINE_IN";

                    // Initialize
                    document.addEventListener('DOMContentLoaded', () => {
                        renderCategories();
                        renderProducts();
                        updateCartUI();
                    });
                     function renderCategories() {
                        const container = document.getElementById('categories-container');
                        categories.forEach(cat => {
                            const btn = document.createElement('button');
                            btn.id = `cat-btn-${'$'}{cat.id}`;
                            btn.className = "px-4 py-2 bg-white text-[#49454f] border border-[#cac4d0] rounded-full text-sm font-semibold shadow-sm shrink-0 whitespace-nowrap transition-colors";
                            btn.textContent = cat.name;
                            btn.onclick = () => filterCategory(cat.id);
                            container.appendChild(btn);
                        });
                    }

                    function filterCategory(catId) {
                        selectedCategoryId = catId;
                        document.querySelectorAll('#categories-container button').forEach(btn => {
                            btn.classList.remove('bg-[#6750a4]', 'text-white', 'border-transparent');
                            btn.classList.add('bg-white', 'text-[#49454f]', 'border-[#cac4d0]');
                        });
                        const activeBtn = document.getElementById(`cat-btn-${'$'}{catId}`);
                        if (activeBtn) {
                            activeBtn.classList.remove('bg-white', 'text-[#49454f]', 'border-[#cac4d0]');
                            activeBtn.classList.add('bg-[#6750a4]', 'text-white');
                        }
                        renderProducts();
                    }

                    function renderProducts() {
                        const container = document.getElementById('products-container');
                        container.innerHTML = "";
                        
                        const filtered = selectedCategoryId === 0 
                            ? products 
                            : products.filter(p => p.categoryId === selectedCategoryId);

                        if (filtered.length === 0) {
                            container.innerHTML = `
                                <div class="col-span-full text-center py-12 bg-white rounded-3xl border border-dashed border-[#cac4d0]">
                                    <span class="material-icons text-slate-300 text-5xl mb-2">inventory_2</span>
                                    <p class="text-slate-400 text-sm">No hay productos disponibles</p>
                                </div>
                            `;
                            return;
                        }

                        filtered.forEach(p => {
                            const qty = cart[p.id] || 0;
                            const isOutOfStock = p.stock <= 0;
                            const priceBs = (p.priceUsd * exchangeRate).toFixed(2);
                            
                            const card = document.createElement('div');
                            card.className = "bg-white p-4 rounded-3xl border border-[#cac4d0] shadow-sm flex gap-4 items-start transition-all active:scale-[0.98]";
                            
                            let controlHtml = "";
                            if (isOutOfStock) {
                                controlHtml = `<span class="text-xs bg-rose-50 text-rose-600 px-2 py-1 rounded-md font-bold">Agotado</span>`;
                            } else if (qty > 0) {
                                controlHtml = `
                                    <div class="flex items-center gap-2 bg-[#eaddff] border border-[#cac4d0] rounded-full p-1">
                                        <button onclick="decrementCart(${'$'}{p.id})" class="text-[#6750a4] hover:bg-[#eaddff] rounded-full p-1 flex items-center justify-center">
                                            <span class="material-icons text-base">remove</span>
                                        </button>
                                        <span class="text-xs font-bold text-[#21005d] px-1">${'$'}{qty}</span>
                                        <button onclick="incrementCart(${'$'}{p.id})" class="text-[#6750a4] hover:bg-[#eaddff] rounded-full p-1 flex items-center justify-center">
                                            <span class="material-icons text-base">add</span>
                                        </button>
                                    </div>
                                `;
                            } else {
                                controlHtml = `
                                    <button onclick="incrementCart(${'$'}{p.id})" class="bg-[#6750a4] text-white px-4 py-1.5 rounded-full text-xs font-semibold hover:bg-[#4f378b] transition flex items-center gap-0.5 shadow-sm">
                                        <span class="material-icons text-sm">add_shopping_cart</span> Agregar
                                    </button>
                                `;
                            }

                            let imgHtml = "";
                            if (p.imageUri && (p.imageUri.startsWith("/") || p.imageUri.includes("product_images"))) {
                                const fileName = p.imageUri.substring(p.imageUri.lastIndexOf('/') + 1);
                                imgHtml = `<img src="/api/images?file=${'$'}{encodeURIComponent(fileName)}" class="w-16 h-16 object-cover rounded-2xl shrink-0 border border-[#cac4d0]" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" /><div style="display:none;" class="w-16 h-16 bg-[#eaddff] text-[#21005d] flex items-center justify-center rounded-2xl font-bold text-2xl uppercase shrink-0 border border-[#cac4d0]">${'$'}{p.name.charAt(0)}</div>`;
                            } else if (p.imageUri && p.imageUri.trim() !== "") {
                                const emojis = {
                                    pabellon: "🍛", asado: "🍖", arepa: "🫓", tequenos: "🥖", empanadas: "🥟",
                                    chicha: "🥤", papelon: "🍹", quesillo: "🍮", tresleches: "🍰",
                                    burger: "🍔", pizza: "🍕", cafe: "☕", bebida: "🥤"
                                };
                                const emoji = emojis[p.imageUri.toLowerCase()] || "🍛";
                                imgHtml = `
                                    <div class="w-16 h-16 bg-gradient-to-tr from-[#eaddff] to-[#f3edf7] text-3xl flex items-center justify-center rounded-2xl shrink-0 border border-[#cac4d0] select-none">
                                        ${'$'}{emoji}
                                    </div>
                                `;
                            } else {
                                imgHtml = `
                                    <div class="w-16 h-16 bg-[#eaddff] text-[#21005d] flex items-center justify-center rounded-2xl font-bold text-2xl uppercase shrink-0 border border-[#cac4d0]">
                                        ${'$'}{p.name.charAt(0)}
                                    </div>
                                `;
                            }

                            card.innerHTML = `
                                ${'$'}{imgHtml}
                                <div class="flex-1 min-w-0">
                                    <div class="flex justify-between items-start gap-1">
                                        <h4 class="font-bold text-slate-800 text-sm truncate">${'$'}{p.name}</h4>
                                        <span class="text-xs text-slate-400 shrink-0">Stock: ${'$'}{p.stock}</span>
                                    </div>
                                    <p class="text-slate-500 text-xs mt-0.5 line-clamp-2">${'$'}{p.description}</p>
                                    <div class="flex items-center justify-between mt-3 gap-2">
                                        <div>
                                            <span class="text-sm font-extrabold text-slate-800">${'$'}${'$'}{p.priceUsd.toFixed(2)}</span>
                                            <span class="text-[10px] text-slate-400 block">${'$'}{priceBs} Bs</span>
                                        </div>
                                        <div>${'$'}{controlHtml}</div>
                                    </div>
                                </div>
                            `;
                            container.appendChild(card);
                        });
                    }

                    function incrementCart(productId) {
                        const product = products.find(p => p.id === productId);
                        if (!product) return;
                        const qty = cart[productId] || 0;
                        if (qty < product.stock) {
                            cart[productId] = qty + 1;
                            updateCartUI();
                            renderProducts();
                        } else {
                            showToast("¡Inventario limite alcanzado!");
                        }
                    }

                    function decrementCart(productId) {
                        const qty = cart[productId] || 0;
                        if (qty > 1) {
                            cart[productId] = qty - 1;
                        } else {
                            delete cart[productId];
                        }
                        updateCartUI();
                        renderProducts();
                    }

                    function getCartStats() {
                        let totalUsd = 0;
                        let count = 0;
                        for (const id in cart) {
                            const p = products.find(prod => prod.id == id);
                            if (p) {
                                totalUsd += p.priceUsd * cart[id];
                                count += cart[id];
                            }
                        }
                        return { totalUsd, count, totalBs: totalUsd * exchangeRate };
                    }

                    function updateCartUI() {
                        const stats = getCartStats();
                        const footer = document.getElementById('cart-footer');
                        if (stats.count > 0) {
                            footer.classList.remove('hidden');
                            document.getElementById('cart-count').textContent = `${'$'}{stats.count} ` + (stats.count === 1 ? 'producto' : 'productos');
                            document.getElementById('cart-total').textContent = `${'$'}${'$'}{stats.totalUsd.toFixed(2)} / ${'$'}{stats.totalBs.toFixed(2)} Bs`;
                        } else {
                            footer.classList.add('hidden');
                        }
                    }

                    function showToast(message, isSuccess = false) {
                        const toast = document.getElementById('toast');
                        const toastMsg = document.getElementById('toast-message');
                        toastMsg.textContent = message;
                        toast.classList.remove('hidden', 'translate-y-32', 'bg-slate-900', 'bg-emerald-600');
                        toast.classList.add(isSuccess ? 'bg-emerald-600' : 'bg-slate-900', 'translate-y-0');
                        setTimeout(() => {
                            toast.classList.add('translate-y-32');
                            setTimeout(() => toast.classList.add('hidden'), 300);
                        }, 2500);
                    }

                    function openOrderModal() {
                        const stats = getCartStats();
                        document.getElementById('modal-total-usd').textContent = `${'$'}${'$'}{stats.totalUsd.toFixed(2)}`;
                        document.getElementById('modal-total-bs').textContent = `${'$'}{stats.totalBs.toFixed(2)} Bs`;
                        document.getElementById('order-modal').classList.remove('hidden');
                    }

                    function closeOrderModal() {
                        document.getElementById('order-modal').classList.add('hidden');
                    }

                    function setOrderType(type) {
                        selectedOrderType = type;
                        const btnDine = document.getElementById('type-dinein');
                        const btnTake = document.getElementById('type-takeaway');
                        const tableGroup = document.getElementById('table-number-group');
                        
                        if (type === 'DINE_IN') {
                            btnDine.className = "border-2 border-[#6750a4] bg-[#eaddff] text-[#21005d] p-3 rounded-2xl flex flex-col items-center justify-center transition";
                            btnTake.className = "border-2 border-[#cac4d0] p-3 rounded-2xl flex flex-col items-center justify-center transition text-[#49454f]";
                            tableGroup.classList.remove('hidden');
                        } else {
                            btnTake.className = "border-2 border-[#6750a4] bg-[#eaddff] text-[#21005d] p-3 rounded-2xl flex flex-col items-center justify-center transition";
                            btnDine.className = "border-2 border-[#cac4d0] p-3 rounded-2xl flex flex-col items-center justify-center transition text-[#49454f]";
                            tableGroup.classList.add('hidden');
                            document.getElementById('input-table').value = "";
                        }
                    }

                    function submitOrder() {
                        const stats = getCartStats();
                        if (stats.count === 0) return;

                        let tableNumber = "Para llevar";
                        if (selectedOrderType === "DINE_IN") {
                            tableNumber = document.getElementById('input-table').value.trim();
                            if (!tableNumber) {
                                alert("Por favor ingresa tu numero de mesa o ubicacion.");
                                return;
                            }
                        }

                        const paymentMethod = document.getElementById('select-payment').value;
                        const notes = document.getElementById('input-notes').value.trim();

                        const itemsPayload = [];
                        for (const id in cart) {
                            itemsPayload.push({
                                productId: parseInt(id),
                                quantity: cart[id]
                            });
                        }

                        const payload = {
                            tableNumber: tableNumber,
                            orderType: selectedOrderType,
                            paymentMethod: paymentMethod,
                            notes: notes,
                            items: itemsPayload
                        };

                        fetch('/api/order', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(payload)
                        })
                        .then(res => res.json())
                        .then(data => {
                            if (data.status === 'success') {
                                closeOrderModal();
                                cart = {};
                                updateCartUI();
                                renderProducts();
                                showToast("¡Pedido enviado a cocina! Espera confirmacion.", true);
                            } else {
                                alert("Error al realizar pedido: " + data.message);
                            }
                        })
                        .catch(err => {
                            console.error(err);
                            alert("Error de conexion con el servidor del restaurante.");
                        });
                    }
                </script>
            </body>
            </html>
        """.trimIndent()
    }
}
