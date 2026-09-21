package com.example.data

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first

class RestaurantRepository(private val database: RestaurantDatabase) {
    private val categoryDao = database.categoryDao()
    private val productDao = database.productDao()
    private val orderDao = database.orderDao()
    private val orderItemDao = database.orderItemDao()
    private val configDao = database.configDao()

    val allCategories: Flow<List<Category>> = categoryDao.getAllCategories()
    val allProducts: Flow<List<Product>> = productDao.getAllProducts()
    val allOrders: Flow<List<Order>> = orderDao.getAllOrders()
    val config: Flow<RestaurantConfig?> = configDao.getConfigFlow()

    fun getProductsByCategory(categoryId: Int): Flow<List<Product>> {
        return productDao.getProductsByCategory(categoryId)
    }

    fun getItemsForOrder(orderId: Int): Flow<List<OrderItem>> {
        return orderItemDao.getItemsForOrder(orderId)
    }

    suspend fun insertCategory(category: Category) = categoryDao.insertCategory(category)
    suspend fun updateCategory(category: Category) = categoryDao.updateCategory(category)
    suspend fun deleteCategory(id: Int) = categoryDao.deleteCategoryById(id)

    suspend fun insertProduct(product: Product) = productDao.insertProduct(product)
    suspend fun updateProduct(product: Product) = productDao.updateProduct(product)
    suspend fun deleteProduct(id: Int) = productDao.deleteProductById(id)

    suspend fun updateConfig(config: RestaurantConfig) = configDao.saveConfig(config)
    suspend fun getConfig(): RestaurantConfig? = configDao.getConfig()

    suspend fun updateOrderStatus(orderId: Int, status: String) {
        orderDao.updateOrderStatus(orderId, status)
    }

    suspend fun updateOrderPaymentStatus(orderId: Int, paymentStatus: String) {
        orderDao.updateOrderPaymentStatus(orderId, paymentStatus)
    }

    suspend fun updateOrder(order: Order) {
        orderDao.updateOrder(order)
    }

    suspend fun deleteOrder(orderId: Int) {
        orderDao.deleteOrderById(orderId)
        orderItemDao.deleteItemsForOrder(orderId)
    }

    // Places a new order and decrements stocks
    suspend fun placeOrder(
        tableNumber: String,
        orderType: String,
        paymentMethod: String,
        paymentStatus: String,
        notes: String,
        items: List<Pair<Product, Int>>
    ): Long {
        var totalUsd = 0.0
        for (item in items) {
            totalUsd += item.first.priceUsd * item.second
        }

        val order = Order(
            tableNumber = tableNumber,
            status = "PENDING", // Initial state: "PENDING" (Pendiente de confirmación)
            totalUsd = totalUsd,
            paymentMethod = paymentMethod,
            paymentStatus = paymentStatus,
            orderType = orderType,
            notes = notes
        )

        val orderId = orderDao.insertOrder(order).toInt()

        for (item in items) {
            val product = item.first
            val qty = item.second
            // Insert item
            orderItemDao.insertOrderItem(
                OrderItem(
                    orderId = orderId,
                    productId = product.id,
                    productName = product.name,
                    quantity = qty,
                    priceUsd = product.priceUsd
                )
            )
            // Deduct stock immediately
            val newStock = (product.stock - qty).coerceAtLeast(0)
            productDao.updateStock(product.id, newStock)
        }

        return orderId.toLong()
    }

    // Seed initial data if database is empty
    suspend fun seedDatabaseIfEmpty() {
        val existingCategories = categoryDao.getAllCategories().first()
        if (existingCategories.isEmpty()) {
            // Seed Categories
            val catPlatosId = categoryDao.insertCategory(Category(name = "Platos Fuertes", iconName = "restaurant")).toInt()
            val catEntradasId = categoryDao.insertCategory(Category(name = "Entradas", iconName = "fastfood")).toInt()
            val catBebidasId = categoryDao.insertCategory(Category(name = "Bebidas", iconName = "wine_bar")).toInt()
            val catPostresId = categoryDao.insertCategory(Category(name = "Postres", iconName = "cake")).toInt()

            // Seed Products
            // Platos Fuertes
            productDao.insertProduct(
                Product(
                    name = "Pabellón Criollo",
                    description = "Delicioso plato tradicional venezolano con arroz blanco, caraotas negras guisadas, carne mechada jugosa y tajadas de plátano frito.",
                    priceUsd = 8.50,
                    categoryId = catPlatosId,
                    stock = 30,
                    imageUri = "pabellon"
                )
            )
            productDao.insertProduct(
                Product(
                    name = "Asado Negro",
                    description = "Muchacho redondo horneado lentamente en un almíbar de papelón caramelizado con vino tinto y especias.",
                    priceUsd = 9.50,
                    categoryId = catPlatosId,
                    stock = 25,
                    imageUri = "asado"
                )
            )
            productDao.insertProduct(
                Product(
                    name = "Arepa Reina Pepiada",
                    description = "Arepa de maíz tostada rellena de ensalada cremosa de pollo desmechado, aguacate maduro, mayonesa casera y un toque de cilantro.",
                    priceUsd = 4.50,
                    categoryId = catPlatosId,
                    stock = 100,
                    imageUri = "arepa"
                )
            )

            // Entradas
            productDao.insertProduct(
                Product(
                    name = "Tequeños de Queso (5 uds)",
                    description = "Deditos crujientes de masa rellenos de sabroso queso blanco llanero fritos al momento. Se acompañan con salsa de ajo.",
                    priceUsd = 3.50,
                    categoryId = catEntradasId,
                    stock = 60,
                    imageUri = "tequenos"
                )
            )
            productDao.insertProduct(
                Product(
                    name = "Empanaditas de Cazón (3 uds)",
                    description = "Empanadas de masa de maíz dulce rellenas de cazón (tiburón pequeño) desmechado, sofrito y frito.",
                    priceUsd = 3.00,
                    categoryId = catEntradasId,
                    stock = 40,
                    imageUri = "empanadas"
                )
            )

            // Bebidas
            productDao.insertProduct(
                Product(
                    name = "Chicha Criolla",
                    description = "Bebida tradicional cremosa hecha a base de arroz cocido con canela, servida fría con hielo y generosa leche condensada.",
                    priceUsd = 2.50,
                    categoryId = catBebidasId,
                    stock = 35,
                    imageUri = "chicha"
                )
            )
            productDao.insertProduct(
                Product(
                    name = "Papelón con Limón",
                    description = "Bebida típica ultra refrescante y natural preparada con papelón y jugo de limón fresco recién exprimido.",
                    priceUsd = 1.50,
                    categoryId = catBebidasId,
                    stock = 80,
                    imageUri = "papelon"
                )
            )

            // Postres
            productDao.insertProduct(
                Product(
                    name = "Quesillo Tradicional",
                    description = "El postre favorito: flan cremoso de leche condensada aromatizado con ron venezolano y bañado en caramelo oscuro.",
                    priceUsd = 2.80,
                    categoryId = catPostresId,
                    stock = 20,
                    imageUri = "quesillo"
                )
            )
            productDao.insertProduct(
                Product(
                    name = "Tres Leches",
                    description = "Delicioso bizcocho bañado en tres tipos de leche (evaporada, condensada y crema), decorado con merengue y canela molida.",
                    priceUsd = 3.20,
                    categoryId = catPostresId,
                    stock = 15,
                    imageUri = "tresleches"
                )
            )

            // Config por defecto (Precio promedio del dólar en Venezuela = 42.5 Bs/$)
            configDao.saveConfig(RestaurantConfig(id = 1, exchangeRateBs = 42.5, isServerActive = false))
        }
    }
}
