import json
import re

client_menu_code = r'''    # RETORNA EL HTML DEL MENÚ DIGITAL DEL CLIENTE (Elegante, Responsivo, Estilo M3)
    def get_client_menu_html(self, db, categories_json, products_json, exchange_rate):
        restaurant_name = db["config"].get("restaurantName", "GastroLocal")
        restaurant_slogan = db["config"].get("restaurantSlogan", "Menú Digital & Autoservicio")
        restaurant_logo = db["config"].get("restaurantLogo", "")
        restaurant_rif = db["config"].get("restaurantRif", "J-00000000-0")
        restaurant_address = db["config"].get("restaurantAddress", "")
        restaurant_phone = db["config"].get("restaurantPhone", "")
        pago_movil = db["config"].get("pagoMovil", {
            "bank": "",
            "phone": "",
            "idNumber": "",
            "accountName": ""
        })
        pm_json = json.dumps(pago_movil, ensure_ascii=False)

        logo_header_html = f'<img src="{restaurant_logo}" class="w-full h-full object-contain" alt="Logo">' if restaurant_logo else '<span class="material-icons text-xl">restaurant</span>'

        return f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{restaurant_name} - Menú Digital</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet" />
    <style>
        body {{ font-family: 'Inter', sans-serif; }}
        .scrollbar-none::-webkit-scrollbar {{ display: none; }}
        .scrollbar-none {{ -ms-overflow-style: none; scrollbar-width: none; }}
    </style>
</head>
<body class="bg-[#fef7ff] text-[#1d1b20] pb-28 font-sans antialiased">
    <!-- Header Principal -->
    <header class="bg-[#6750a4] text-white shadow-md sticky top-0 z-40">
        <div class="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white overflow-hidden shrink-0 border border-white/20 shadow-inner">
                    {logo_header_html}
                </div>
                <div class="flex flex-col">
                    <h1 class="text-base sm:text-lg font-black tracking-tight leading-tight">{restaurant_name}</h1>
                    <span class="text-[10px] sm:text-[11px] font-medium text-[#eaddff] leading-none mt-0.5">{restaurant_slogan}</span>
                </div>
            </div>
            
            <div class="flex items-center gap-2">
                <!-- Botón Llamar al Mozo / Cuenta -->
                <button onclick="openTableCallModal()" class="bg-white/10 hover:bg-white/20 text-[#eaddff] hover:text-white px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 border border-white/10 active:scale-95">
                    <span class="material-icons text-sm text-amber-300">notifications</span>
                    <span class="hidden sm:inline">Mozo</span>
                </button>
                
                <!-- Identificador de Mesa -->
                <div class="bg-[#21005d] text-[#eaddff] px-3 py-1.5 rounded-xl text-xs font-black tracking-wide flex items-center gap-1.5 border border-white/10 shadow-sm">
                    <span class="material-icons text-xs text-[#d0bcff]">table_restaurant</span>
                    <span id="display-table-number" class="uppercase">Mesa ?</span>
                </div>
            </div>
        </div>

        <!-- Barra de Tasa y Búsqueda Rápida -->
        <div class="bg-[#4f378b] px-4 py-2 text-white">
            <div class="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
                <div class="flex items-center gap-2 text-xs text-[#eaddff]">
                    <span class="material-icons text-sm text-emerald-400">payments</span>
                    <span>Tasa oficial: <strong class="text-white font-mono">{exchange_rate:.2f} Bs/$</strong></span>
                </div>
                
                <!-- Buscador de Platos -->
                <div class="relative w-full sm:w-64">
                    <span class="material-icons absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300 text-sm">search</span>
                    <input type="text" id="menu-search-input" placeholder="Buscar plato o bebida..." 
                           oninput="handleSearchInput(this.value)"
                           class="w-full bg-white/10 text-white placeholder:text-purple-200 text-xs rounded-xl pl-8 pr-7 py-1.5 border border-white/20 focus:outline-none focus:bg-white/20">
                    <button id="menu-search-clear" onclick="clearSearch()" class="hidden absolute right-2 top-1/2 -translate-y-1/2 text-purple-200 hover:text-white">
                        <span class="material-icons text-xs">close</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- Categorías (Chips con Scroll Horizontal) -->
        <div class="bg-[#f3edf7] border-b border-[#e7e0ec] py-2.5 px-4 overflow-x-auto scrollbar-none">
            <div class="max-w-4xl mx-auto flex items-center gap-2" id="categories-bar">
                <button onclick="filterCategory('ALL')" class="category-chip active shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm bg-[#6750a4] text-white">
                    Todos
                </button>
            </div>
        </div>
    </header>

    <!-- Contenido Principal (Catálogo de Platos) -->
    <main class="max-w-4xl mx-auto px-4 py-6">
        <div id="products-container" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <!-- Rellenado dinámicamente por JavaScript -->
        </div>
    </main>

    <!-- Barra Flotante de Carrito / Footer -->
    <div id="cart-footer" class="hidden fixed bottom-0 left-0 right-0 bg-[#f3edf7] border-t border-[#e7e0ec] shadow-2xl p-4 z-40 backdrop-blur-lg bg-opacity-95">
        <div class="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div class="flex flex-col cursor-pointer" onclick="openOrderModal()">
                <span class="text-xs text-[#49454f] font-medium" id="cart-count">0 artículos</span>
                <div class="text-lg font-black text-[#6750a4]" id="cart-total">$0.00 / 0.00 Bs</div>
            </div>
            <button onclick="openOrderModal()" class="bg-[#6750a4] hover:bg-[#523e85] text-white font-bold px-6 py-3 rounded-2xl text-sm shadow-lg shadow-purple-900/20 flex items-center gap-2 transition active:scale-95">
                <span class="material-icons text-base">shopping_cart_checkout</span>
                <span>Ver Carrito / Pedir</span>
            </button>
        </div>
    </div>

    <!-- Modal de Detalle y Modificadores de Producto (Zoom / Extras) -->
    <div id="image-modal" class="hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div class="relative bg-slate-900 aspect-video flex items-center justify-center overflow-hidden shrink-0">
                <img id="image-modal-img" src="" alt="" class="w-full h-full object-cover">
                <button onclick="closeImageModal()" class="absolute top-3 right-3 bg-black/50 hover:bg-black/80 text-white rounded-full p-2 transition">
                    <span class="material-icons text-base">close</span>
                </button>
                <div id="image-modal-stock" class="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-md text-emerald-400 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/30">
                    Disponible
                </div>
            </div>
            
            <div class="p-6 overflow-y-auto space-y-4">
                <div>
                    <h3 id="image-modal-title" class="text-xl font-black text-slate-900">Nombre del Plato</h3>
                    <p id="image-modal-desc" class="text-xs text-slate-500 mt-1">Descripción detallada</p>
                    <div id="image-modal-price" class="text-lg font-black text-purple-700 mt-2">$0.00 / 0.00 Bs</div>
                </div>

                <!-- Sección de Modificadores / Extras -->
                <div id="image-modal-modifiers-section" class="hidden border-t border-slate-100 pt-3">
                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Personaliza tu plato (Extras)</label>
                    <div id="image-modal-modifiers-list" class="space-y-2">
                        <!-- Rellenado dinámico con checkboxes -->
                    </div>
                </div>

                <!-- Selector de Cantidad en Modal -->
                <div class="border-t border-slate-100 pt-3 flex items-center justify-between">
                    <span class="text-xs font-bold text-slate-600">Cantidad:</span>
                    <div class="flex items-center gap-3 bg-slate-100 p-1.5 rounded-2xl">
                        <button onclick="modalChangeQty(-1)" class="w-8 h-8 rounded-xl bg-white text-slate-700 font-black flex items-center justify-center shadow-sm active:scale-95">-</button>
                        <span id="image-modal-qty" class="text-sm font-black text-slate-900 px-2">1</span>
                        <button onclick="modalChangeQty(1)" class="w-8 h-8 rounded-xl bg-purple-600 text-white font-black flex items-center justify-center shadow-sm active:scale-95">+</button>
                    </div>
                </div>
            </div>

            <div class="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4">
                <div class="flex flex-col">
                    <span class="text-[10px] text-slate-400 uppercase font-bold">Total con extras</span>
                    <span id="image-modal-total-calc" class="text-base font-black text-purple-700">$0.00</span>
                </div>
                <button onclick="confirmAddClientModalProduct()" class="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-3 rounded-2xl text-sm shadow-md transition flex items-center gap-2 active:scale-95">
                    <span class="material-icons text-base">add_shopping_cart</span>
                    <span>Agregar al Pedido</span>
                </button>
            </div>
        </div>
    </div>

    <!-- Modal de Confirmación y Envío de Pedido -->
    <div id="order-modal" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl flex flex-col max-h-[92vh]">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div class="flex items-center gap-2">
                    <span class="material-icons text-purple-600">shopping_bag</span>
                    <h3 class="text-lg font-black text-slate-900">Tu Pedido</h3>
                </div>
                <button onclick="closeOrderModal()" class="text-slate-400 hover:text-slate-600 p-1">
                    <span class="material-icons">close</span>
                </button>
            </div>

            <div class="overflow-y-auto space-y-4 flex-1 pr-1">
                <!-- Lista de Productos en el Carrito (ESTO ERA LO QUE NO APARECÍA) -->
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Platos y Bebidas seleccionados</label>
                    <div id="modal-order-items-summary" class="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                        <!-- Rellenado dinámicamente con los items del pedido -->
                    </div>
                </div>

                <!-- Selección / Confirmación de Mesa -->
                <div class="bg-purple-50 p-3.5 rounded-2xl border border-purple-100">
                    <label class="block text-xs font-bold text-purple-900 mb-1">Mesa o Ubicación:</label>
                    <input type="text" id="order-table-input" placeholder="Ej: Mesa 1, Barra, Terraza" 
                           class="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-600">
                </div>

                <!-- Notas para Cocina -->
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">Instrucciones especiales para cocina:</label>
                    <textarea id="order-notes" rows="2" placeholder="Ej: Sin cebolla, salsa aparte, bien cocido..."
                              class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-purple-600 resize-none"></textarea>
                </div>

                <!-- Método de Pago -->
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">¿Cómo deseas pagar?</label>
                    <select id="order-payment-method" onchange="togglePagoMovilRefBox()" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-600">
                        <option value="CASH_USD">💵 Efectivo USD ($)</option>
                        <option value="CASH_BS">💵 Efectivo Bolívares (Bs)</option>
                        <option value="PAGO_MOVIL">📱 Pago Móvil (Venezuela)</option>
                        <option value="PUNTO">💳 Punto de Venta / Tarjeta</option>
                        <option value="ZELLE">⚡ Zelle</option>
                        <option value="OTROS">🔄 Otro método / Por definir</option>
                    </select>
                </div>

                <!-- Recuadro informativo de Pago Móvil -->
                <div id="client-pm-info-box" class="hidden bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 space-y-2">
                    <div class="text-xs font-bold text-emerald-900 flex items-center justify-between">
                        <span>Datos de Pago Móvil:</span>
                        <button type="button" onclick="copyPagoMovilDetails()" class="text-[10px] text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded-lg font-bold">Copiar</button>
                    </div>
                    <div class="text-[11px] text-emerald-800 font-mono space-y-0.5" id="client-pm-details-text">
                        <div><strong>Banco:</strong> {pago_movil.get('bank', 'N/A')}</div>
                        <div><strong>Teléfono:</strong> {pago_movil.get('phone', 'N/A')}</div>
                        <div><strong>C.I / RIF:</strong> {pago_movil.get('idNumber', 'N/A')}</div>
                    </div>
                    <input type="text" id="order-pm-ref" placeholder="Nº de Referencia (últimos 4 u 8 dígitos)"
                           class="w-full bg-white border border-emerald-300 rounded-xl px-3 py-1.5 text-xs font-mono font-bold focus:outline-none focus:border-emerald-600">
                </div>

                <!-- Total a Pagar -->
                <div class="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between">
                    <div>
                        <span class="text-[10px] text-slate-400 block font-bold">TOTAL A PAGAR</span>
                        <span id="order-modal-total-usd" class="text-lg font-black text-amber-400">$0.00</span>
                    </div>
                    <div class="text-right">
                        <span class="text-[10px] text-slate-400 block font-bold">EN BOLÍVARES</span>
                        <span id="order-modal-total-bs" class="text-sm font-bold text-slate-200">0.00 Bs</span>
                    </div>
                </div>
            </div>

            <!-- Botones de Acción -->
            <div class="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                <button type="button" onclick="closeOrderModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-2xl text-xs font-bold transition">
                    Seguir pidiendo
                </button>
                <button type="button" id="btn-submit-order" onclick="submitOrder()" class="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-2xl text-xs font-black shadow-lg shadow-purple-900/30 transition active:scale-95 flex items-center justify-center gap-1">
                    <span>Enviar a Cocina</span>
                    <span class="material-icons text-sm">send</span>
                </button>
            </div>
        </div>
    </div>

    <!-- Modal de Llamado de Mozo / Cuenta -->
    <div id="table-call-modal" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
            <div class="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
                <span class="material-icons text-3xl">room_service</span>
            </div>
            <div>
                <h3 class="text-lg font-black text-slate-900">Atención en Mesa</h3>
                <p class="text-xs text-slate-500 mt-1">¿En qué podemos ayudarte?</p>
            </div>
            <div class="space-y-2">
                <button onclick="sendTableCall('WAITER_CALL')" class="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-2xl text-xs transition flex items-center justify-center gap-2 shadow-sm">
                    <span class="material-icons text-sm">hail</span>
                    <span>Llamar al Camarero / Mozo</span>
                </button>
                <button onclick="sendTableCall('BILL_REQUEST')" class="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-2xl text-xs transition flex items-center justify-center gap-2 shadow-sm">
                    <span class="material-icons text-sm">receipt_long</span>
                    <span>Solicitar la Cuenta</span>
                </button>
                <button onclick="closeTableCallModal()" class="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 rounded-2xl text-xs transition">
                    Cancelar
                </button>
            </div>
        </div>
    </div>

    <!-- Toast Notification -->
    <div id="toast" class="hidden fixed bottom-24 left-4 right-4 max-w-sm mx-auto bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center justify-between text-xs font-bold transition-all z-50 border border-slate-700">
        <span id="toast-message">Mensaje</span>
        <span class="material-icons text-emerald-400 text-sm">check_circle</span>
    </div>

    <!-- SCRIPTS JAVASCRIPT DEL CLIENTE -->
    <script>
        const categories = {categories_json};
        const products = {products_json};
        const exchangeRate = {exchange_rate};
        const pagoMovilConfig = {pm_json};
        
        // Estructura de items en carrito: cartId, productId, productName, quantity, priceUsd, selectedModifiers, unitTotalUsd
        let cartItems = [];
        let currentCategory = 'ALL';
        let searchQuery = '';
        let tableNumber = "Mesa 1";
        
        // Estado del modal de plato activo
        let activeModalProduct = null;
        let activeModalQty = 1;

        // Inicialización
        document.addEventListener('DOMContentLoaded', () => {{
            // Leer número de mesa desde la URL (ej: /?table=3)
            const urlParams = new URLSearchParams(window.location.search);
            const tableParam = urlParams.get('table');
            if (tableParam) {{
                tableNumber = isNaN(tableParam) ? tableParam : `Mesa ${{tableParam}}`;
            }}
            
            const displayTable = document.getElementById('display-table-number');
            if (displayTable) displayTable.textContent = tableNumber;
            const inputTable = document.getElementById('order-table-input');
            if (inputTable) inputTable.value = tableNumber;

            renderCategoriesBar();
            renderProductsGrid();
            updateCartUI();
        }});

        // Toast de notificación
        function showToast(message, isSuccess = true) {{
            const toast = document.getElementById('toast');
            const toastMsg = document.getElementById('toast-message');
            if (!toast || !toastMsg) return;
            toastMsg.textContent = message;
            toast.classList.remove('hidden');
            setTimeout(() => {{
                toast.classList.add('hidden');
            }}, 2500);
        }}

        // Renderizado de barra de categorías
        function renderCategoriesBar() {{
            const bar = document.getElementById('categories-bar');
            if (!bar) return;
            
            let html = `
                <button onclick="filterCategory('ALL')" class="category-chip shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${{currentCategory === 'ALL' ? 'bg-[#6750a4] text-white' : 'bg-white text-slate-700 border border-slate-200'}}">
                    Todos
                </button>
            `;
            
            categories.forEach(c => {{
                const isActive = currentCategory === String(c.id);
                html += `
                    <button onclick="filterCategory('${{c.id}}')" class="category-chip shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${{isActive ? 'bg-[#6750a4] text-white' : 'bg-white text-slate-700 border border-slate-200'}}">
                        ${{c.name}}
                    </button>
                `;
            }});
            
            bar.innerHTML = html;
        }}

        function filterCategory(catId) {{
            currentCategory = catId;
            renderCategoriesBar();
            renderProductsGrid();
        }}

        function handleSearchInput(val) {{
            searchQuery = (val || '').trim().toLowerCase();
            const clearBtn = document.getElementById('menu-search-clear');
            if (clearBtn) {{
                if (searchQuery) clearBtn.classList.remove('hidden');
                else clearBtn.classList.add('hidden');
            }}
            renderProductsGrid();
        }}

        function clearSearch() {{
            const input = document.getElementById('menu-search-input');
            if (input) input.value = '';
            handleSearchInput('');
        }}

        // Renderizado de la cuadrícula de productos
        function renderProductsGrid() {{
            const container = document.getElementById('products-container');
            if (!container) return;

            let filtered = products.filter(p => {{
                const matchCat = (currentCategory === 'ALL') || (String(p.categoryId) === String(currentCategory));
                const matchSearch = !searchQuery || (p.name && p.name.toLowerCase().includes(searchQuery)) || (p.description && p.description.toLowerCase().includes(searchQuery));
                return matchCat && matchSearch;
            }});

            if (filtered.length === 0) {{
                container.innerHTML = `
                    <div class="col-span-full text-center py-12 text-slate-400">
                        <span class="material-icons text-5xl block mb-2 text-slate-300">search_off</span>
                        <p class="text-sm font-bold">No se encontraron platos disponibles</p>
                    </div>
                `;
                return;
            }}

            container.innerHTML = filtered.map(p => {{
                const priceBs = (p.priceUsd * exchangeRate).toFixed(2);
                const hasStock = (p.stock === undefined || p.stock === null || p.stock > 0);
                const hasModifiers = p.modifiers && Array.isArray(p.modifiers) && p.modifiers.length > 0;
                
                // Buscar cantidad actual en el carrito
                const totalInCart = cartItems.filter(item => item.productId === p.id).reduce((sum, item) => sum + item.quantity, 0);

                const imageHtml = p.imageUrl 
                    ? `<img src="${{p.imageUrl}}" alt="${{p.name}}" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105">`
                    : `<div class="w-full h-full flex items-center justify-center text-slate-300 bg-slate-100"><span class="material-icons text-4xl">restaurant</span></div>`;

                return `
                    <div class="group bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                        <div class="relative aspect-video bg-slate-100 cursor-pointer overflow-hidden" onclick="openProductModal(${{p.id}})">
                            ${{imageHtml}}
                            ${{hasModifiers ? `<span class="absolute top-2.5 left-2.5 bg-purple-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/20">Personalizable</span>` : ''}}
                            ${{!hasStock ? `<div class="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs font-black uppercase tracking-wider">Agotado</div>` : ''}}
                        </div>

                        <div class="p-4 flex-1 flex flex-col justify-between">
                            <div>
                                <h3 class="font-black text-slate-900 text-sm sm:text-base leading-snug cursor-pointer" onclick="openProductModal(${{p.id}})">${{p.name}}</h3>
                                ${{p.description ? `<p class="text-slate-500 text-xs mt-1 line-clamp-2">${{p.description}}</p>` : ''}}
                            </div>

                            <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                                <div class="flex flex-col">
                                    <span class="text-sm font-black text-purple-700 font-mono">$${{p.priceUsd.toFixed(2)}}</span>
                                    <span class="text-[11px] font-semibold text-slate-400 font-mono">${{priceBs}} Bs</span>
                                </div>

                                ${{hasStock ? `
                                    <div class="flex items-center gap-1.5">
                                        ${{totalInCart > 0 ? `
                                            <button onclick="decrementProductSimple(${{p.id}})" class="w-7 h-7 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center active:scale-95 transition">-</button>
                                            <span class="text-xs font-black text-purple-900 px-1.5">${{totalInCart}}</span>
                                        ` : ''}}
                                        <button onclick="handleCardAddClick(${{p.id}})" class="bg-[#6750a4] hover:bg-[#523e85] text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 shadow-sm active:scale-95 transition">
                                            <span class="material-icons text-xs">add</span>
                                            <span>${{totalInCart > 0 ? 'Más' : 'Agregar'}}</span>
                                        </button>
                                    </div>
                                ` : `
                                    <span class="text-xs font-bold text-slate-400">No disponible</span>
                                `}}
                            </div>
                        </div>
                    </div>
                `;
            }}).join('');
        }}

        // Manejo de clic en botón rápido de tarjeta
        function handleCardAddClick(productId) {{
            const prod = products.find(p => p.id === productId);
            if (!prod) return;

            // Si tiene modificadores / extras, abrimos el modal para que los elija
            if (prod.modifiers && prod.modifiers.length > 0) {{
                openProductModal(productId);
            }} else {{
                // Si es un producto simple, lo agregamos directo al carrito
                addSimpleProductToCart(prod);
            }}
        }}

        function addSimpleProductToCart(prod) {{
            // Buscar si ya existe el item simple en el carrito
            const existing = cartItems.find(item => item.productId === prod.id && (!item.selectedModifiers || item.selectedModifiers.length === 0));
            if (existing) {{
                existing.quantity += 1;
            }} else {{
                cartItems.push({{
                    cartId: Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                    productId: prod.id,
                    productName: prod.name,
                    quantity: 1,
                    priceUsd: prod.priceUsd,
                    selectedModifiers: [],
                    unitTotalUsd: prod.priceUsd
                }});
            }}
            updateCartUI();
            renderProductsGrid();
            showToast(`Agregado: ${{prod.name}}`);
        }}

        function decrementProductSimple(productId) {{
            // Buscar el último item agregado de ese producto
            const index = cartItems.map(item => item.productId).lastIndexOf(productId);
            if (index !== -1) {{
                if (cartItems[index].quantity > 1) {{
                    cartItems[index].quantity -= 1;
                }} else {{
                    cartItems.splice(index, 1);
                }}
            }}
            updateCartUI();
            renderProductsGrid();
        }}

        // Modal de Producto (Detalle, Zoom y Extras)
        function openProductModal(productId) {{
            const prod = products.find(p => p.id === productId);
            if (!prod) return;
            
            activeModalProduct = prod;
            activeModalQty = 1;

            const modal = document.getElementById('image-modal');
            const img = document.getElementById('image-modal-img');
            const title = document.getElementById('image-modal-title');
            const desc = document.getElementById('image-modal-desc');
            const price = document.getElementById('image-modal-price');
            const stock = document.getElementById('image-modal-stock');
            const qty = document.getElementById('image-modal-qty');
            const modSection = document.getElementById('image-modal-modifiers-section');
            const modList = document.getElementById('image-modal-modifiers-list');

            if (img) img.src = prod.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';
            if (title) title.textContent = prod.name;
            if (desc) desc.textContent = prod.description || 'Delicioso plato preparado al momento con los mejores ingredientes.';
            if (price) price.textContent = `$${{prod.priceUsd.toFixed(2)}} / ${{(prod.priceUsd * exchangeRate).toFixed(2)}} Bs`;
            if (stock) stock.textContent = (prod.stock !== undefined && prod.stock !== null) ? `Stock: ${{prod.stock}} disponibles` : 'Disponible';
            if (qty) qty.textContent = "1";

            // Modificadores / Extras
            if (prod.modifiers && prod.modifiers.length > 0 && modSection && modList) {{
                modSection.classList.remove('hidden');
                modList.innerHTML = prod.modifiers.map((m, idx) => `
                    <label class="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:bg-purple-50/50 cursor-pointer transition">
                        <div class="flex items-center gap-2">
                            <input type="checkbox" name="modal-modifier" value="${{idx}}" onchange="recalcModalTotal()" class="w-4 h-4 text-purple-600 rounded focus:ring-purple-500">
                            <span class="text-xs font-bold text-slate-800">${{m.name}}</span>
                        </div>
                        <span class="text-xs font-black text-purple-700 font-mono">+ $${{m.priceUsd.toFixed(2)}}</span>
                    </label>
                `).join('');
            }} else if (modSection) {{
                modSection.classList.add('hidden');
            }}

            recalcModalTotal();
            if (modal) modal.classList.remove('hidden');
        }}

        function closeImageModal() {{
            const modal = document.getElementById('image-modal');
            if (modal) modal.classList.add('hidden');
            activeModalProduct = null;
        }}

        function modalChangeQty(delta) {{
            activeModalQty = Math.max(1, activeModalQty + delta);
            const qty = document.getElementById('image-modal-qty');
            if (qty) qty.textContent = activeModalQty;
            recalcModalTotal();
        }}

        function recalcModalTotal() {{
            if (!activeModalProduct) return;
            let unitTotal = activeModalProduct.priceUsd;
            
            const checkboxes = document.querySelectorAll('input[name="modal-modifier"]:checked');
            checkboxes.forEach(cb => {{
                const modIdx = parseInt(cb.value, 10);
                if (activeModalProduct.modifiers && activeModalProduct.modifiers[modIdx]) {{
                    unitTotal += activeModalProduct.modifiers[modIdx].priceUsd;
                }}
            }});

            const fullTotal = unitTotal * activeModalQty;
            const calc = document.getElementById('image-modal-total-calc');
            if (calc) {{
                calc.textContent = `$${{fullTotal.toFixed(2)}} / ${{(fullTotal * exchangeRate).toFixed(2)}} Bs`;
            }}
        }}

        function confirmAddClientModalProduct() {{
            if (!activeModalProduct) return;
            
            let selectedMods = [];
            let unitTotal = activeModalProduct.priceUsd;

            const checkboxes = document.querySelectorAll('input[name="modal-modifier"]:checked');
            checkboxes.forEach(cb => {{
                const modIdx = parseInt(cb.value, 10);
                if (activeModalProduct.modifiers && activeModalProduct.modifiers[modIdx]) {{
                    const m = activeModalProduct.modifiers[modIdx];
                    selectedMods.push({{ name: m.name, priceUsd: m.priceUsd }});
                    unitTotal += m.priceUsd;
                }}
            }});

            cartItems.push({{
                cartId: Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                productId: activeModalProduct.id,
                productName: activeModalProduct.name,
                quantity: activeModalQty,
                priceUsd: activeModalProduct.priceUsd,
                selectedModifiers: selectedMods,
                unitTotalUsd: unitTotal
            }});

            updateCartUI();
            renderProductsGrid();
            closeImageModal();
            showToast(`Agregado al carrito: ${{activeModalProduct.name}}`);
        }}

        // Actualización de la barra flotante y estado del carrito
        function updateCartUI() {{
            const totalCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
            const totalUsd = cartItems.reduce((sum, item) => sum + (item.unitTotalUsd * item.quantity), 0);
            const totalBs = (totalUsd * exchangeRate).toFixed(2);

            const footer = document.getElementById('cart-footer');
            const countEl = document.getElementById('cart-count');
            const totalEl = document.getElementById('cart-total');

            if (totalCount > 0) {{
                if (footer) footer.classList.remove('hidden');
                if (countEl) countEl.textContent = `${{totalCount}} ${{totalCount === 1 ? 'artículo' : 'artículos'}} en el carrito`;
                if (totalEl) totalEl.textContent = `$${{totalUsd.toFixed(2)}} / ${{totalBs}} Bs`;
            }} else {{
                if (footer) footer.classList.add('hidden');
            }}
        }}

        // Modal de Pedido / Carrito (Renderiza la lista completa de platos)
        function openOrderModal() {{
            if (cartItems.length === 0) {{
                showToast("El carrito está vacío. Agrega platos para pedir.");
                return;
            }}

            const modal = document.getElementById('order-modal');
            const summaryContainer = document.getElementById('modal-order-items-summary');
            
            // Rellenar lista de items en el modal
            if (summaryContainer) {{
                summaryContainer.innerHTML = cartItems.map((item, idx) => {{
                    const itemTotalUsd = (item.unitTotalUsd * item.quantity).toFixed(2);
                    const itemTotalBs = (item.unitTotalUsd * item.quantity * exchangeRate).toFixed(2);
                    const modsText = (item.selectedModifiers && item.selectedModifiers.length > 0)
                        ? item.selectedModifiers.map(m => `+ ${{m.name}}`).join(', ')
                        : '';

                    return `
                        <div class="flex items-center justify-between bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                            <div class="flex-1 pr-2">
                                <h4 class="text-xs font-black text-slate-900 leading-tight">${{item.productName}}</h4>
                                ${{modsText ? `<p class="text-[10px] text-purple-700 font-medium leading-tight mt-0.5">${{modsText}}</p>` : ''}}
                                <span class="text-[11px] font-black text-purple-900 font-mono mt-0.5 block">$${{itemTotalUsd}} / ${{itemTotalBs}} Bs</span>
                            </div>

                            <div class="flex items-center gap-2 shrink-0">
                                <div class="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-sm">
                                    <button onclick="changeCartItemQty(${{idx}}, -1)" class="w-6 h-6 rounded-lg text-slate-700 font-black text-xs hover:bg-slate-100 flex items-center justify-center">-</button>
                                    <span class="text-xs font-black text-purple-900 px-2 font-mono">${{item.quantity}}</span>
                                    <button onclick="changeCartItemQty(${{idx}}, 1)" class="w-6 h-6 rounded-lg bg-purple-600 text-white font-black text-xs hover:bg-purple-700 flex items-center justify-center">+</button>
                                </div>
                                <button onclick="removeCartItem(${{idx}})" class="text-rose-400 hover:text-rose-600 p-1">
                                    <span class="material-icons text-base">delete</span>
                                </button>
                            </div>
                        </div>
                    `;
                }}).join('');
            }}

            // Actualizar totales en el modal
            const totalUsd = cartItems.reduce((sum, item) => sum + (item.unitTotalUsd * item.quantity), 0);
            const totalBs = (totalUsd * exchangeRate).toFixed(2);

            const totalUsdEl = document.getElementById('order-modal-total-usd');
            const totalBsEl = document.getElementById('order-modal-total-bs');
            if (totalUsdEl) totalUsdEl.textContent = `$${{totalUsd.toFixed(2)}}`;
            if (totalBsEl) totalBsEl.textContent = `${{totalBs}} Bs`;

            togglePagoMovilRefBox();
            if (modal) modal.classList.remove('hidden');
        }}

        function closeOrderModal() {{
            const modal = document.getElementById('order-modal');
            if (modal) modal.classList.add('hidden');
        }}

        function changeCartItemQty(index, delta) {{
            if (cartItems[index]) {{
                cartItems[index].quantity += delta;
                if (cartItems[index].quantity <= 0) {{
                    cartItems.splice(index, 1);
                }}
            }}
            updateCartUI();
            renderProductsGrid();
            if (cartItems.length === 0) {{
                closeOrderModal();
            }} else {{
                openOrderModal();
            }}
        }}

        function removeCartItem(index) {{
            if (cartItems[index]) {{
                cartItems.splice(index, 1);
            }}
            updateCartUI();
            renderProductsGrid();
            if (cartItems.length === 0) {{
                closeOrderModal();
            }} else {{
                openOrderModal();
            }}
        }}

        function togglePagoMovilRefBox() {{
            const method = document.getElementById('order-payment-method').value;
            const box = document.getElementById('client-pm-info-box');
            if (box) {{
                if (method === 'PAGO_MOVIL') box.classList.remove('hidden');
                else box.classList.add('hidden');
            }}
        }}

        function copyPagoMovilDetails() {{
            const text = `Pago Móvil:\\nBanco: ${{pagoMovilConfig.bank || 'N/A'}}\\nTeléfono: ${{pagoMovilConfig.phone || 'N/A'}}\\nRIF/CI: ${{pagoMovilConfig.idNumber || 'N/A'}}`;
            if (navigator.clipboard && navigator.clipboard.writeText) {{
                navigator.clipboard.writeText(text).then(() => showToast("Datos de Pago Móvil copiados"));
            }} else {{
                showToast("Datos copiados");
            }}
        }}

        // Envío del Pedido al Backend
        function submitOrder() {{
            if (cartItems.length === 0) {{
                showToast("Tu carrito está vacío.");
                return;
            }}

            const tableInput = document.getElementById('order-table-input');
            const finalTable = (tableInput && tableInput.value.trim()) ? tableInput.value.trim() : tableNumber;
            const notes = document.getElementById('order-notes').value.trim();
            const paymentMethod = document.getElementById('order-payment-method').value;
            const pmRef = document.getElementById('order-pm-ref') ? document.getElementById('order-pm-ref').value.trim() : '';

            const btn = document.getElementById('btn-submit-order');
            if (btn) {{
                btn.disabled = true;
                btn.innerHTML = `<span class="material-icons text-sm animate-spin">sync</span> <span>Enviando a Cocina...</span>`;
            }}

            // Construir payload con modificadores
            const itemsPayload = cartItems.map(item => ({{
                productId: item.productId,
                quantity: item.quantity,
                priceUsd: item.priceUsd,
                selectedModifiers: item.selectedModifiers || [],
                unitTotalUsd: item.unitTotalUsd
            }}));

            const payload = {{
                tableNumber: finalTable,
                items: itemsPayload,
                orderType: "DINE_IN",
                paymentMethod: paymentMethod,
                paymentRef: pmRef,
                notes: notes
            }};

            fetch('/api/order', {{
                method: 'POST',
                headers: {{ 'Content-Type': 'application/json' }},
                body: JSON.stringify(payload)
            }})
            .then(res => res.json())
            .then(data => {{
                if (btn) {{
                    btn.disabled = false;
                    btn.innerHTML = `<span>Enviar a Cocina</span><span class="material-icons text-sm">send</span>`;
                }}

                if (data.status === 'success') {{
                    cartItems = [];
                    updateCartUI();
                    renderProductsGrid();
                    closeOrderModal();
                    
                    alert(`✅ ¡PEDIDO #${{data.orderId}} ENVIADO CON ÉXITO!\\n\\nTu comanda ha sido enviada directamente a cocina para preparación.`);
                }} else {{
                    alert("❌ No se pudo enviar el pedido: " + (data.message || "Error desconocido"));
                }}
            }})
            .catch(err => {{
                if (btn) {{
                    btn.disabled = false;
                    btn.innerHTML = `<span>Enviar a Cocina</span><span class="material-icons text-sm">send</span>`;
                }}
                console.error("Error al enviar pedido:", err);
                alert("⚠️ Error de conexión al enviar el pedido a la PC principal.");
            }});
        }}

        // Llamado de Mozo / Cuenta
        function openTableCallModal() {{
            const modal = document.getElementById('table-call-modal');
            if (modal) modal.classList.remove('hidden');
        }}

        function closeTableCallModal() {{
            const modal = document.getElementById('table-call-modal');
            if (modal) modal.classList.add('hidden');
        }}

        function sendTableCall(type) {{
            const tableInput = document.getElementById('order-table-input');
            const finalTable = (tableInput && tableInput.value.trim()) ? tableInput.value.trim() : tableNumber;

            fetch('/api/client/table-call', {{
                method: 'POST',
                headers: {{ 'Content-Type': 'application/json' }},
                body: JSON.stringify({{ tableNumber: finalTable, type: type }})
            }})
            .then(res => res.json())
            .then(data => {{
                closeTableCallModal();
                if (data.status === 'success') {{
                    if (type === 'WAITER_CALL') {{
                        alert("🔔 ¡Llamado enviado!\\nUn camarero se acercará a tu mesa en breve.");
                    }} else {{
                        alert("🧾 ¡Solicitud enviada!\\nEl mozo te llevará la cuenta a tu mesa.");
                    }}
                }} else {{
                    alert("No se pudo enviar la solicitud: " + (data.message || "Error"));
                }}
            }})
            .catch(err => {{
                closeTableCallModal();
                alert("Error de conexión al llamar al mozo.");
            }});
        }}
    </script>
</body>
</html>"""
'''

with open('gastro_local_pc_server.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

func_start = -1
func_end = -1
for idx, line in enumerate(lines):
    if 'def get_client_menu_html(' in line:
        func_start = idx
    if 'def get_ticket_html(' in line:
        func_end = idx
        break

assert func_start != -1 and func_end != -1

new_lines = lines[:func_start] + [client_menu_code + "\n\n"] + lines[func_end:]
new_content = "".join(new_lines)

with open('gastro_local_pc_server.py', 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f"SUCCESS: Replaced get_client_menu_html cleanly. New line count: {len(new_lines)}")



