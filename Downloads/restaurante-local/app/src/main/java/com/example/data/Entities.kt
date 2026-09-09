package com.example.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "categories")
data class Category(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val name: String,
    val iconName: String // "restaurant", "wine_bar", "cake", "local_pizza", "fastfood", "coffee"
)

@Entity(tableName = "products")
data class Product(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val name: String,
    val description: String,
    val priceUsd: Double,
    val categoryId: Int,
    val stock: Int,
    val imageUri: String = "", // Can store local image Uri or simulated web image
    val isAvailable: Boolean = true
)

@Entity(tableName = "orders")
data class Order(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val tableNumber: String, // "Mesa 1", "Mesa 2", etc., or "Para llevar"
    val status: String, // "PENDING" (Pendiente), "PREPARING" (En cocina), "READY" (Listo), "SERVED" (Entregado), "CANCELLED" (Cancelado)
    val totalUsd: Double,
    val paymentMethod: String, // "Pago Móvil", "Efectivo Bs", "Punto de Venta", "Efectivo $", "Zelle", "Crédito"
    val paymentStatus: String, // "UNPAID" (No pagado), "PENDING_CONFIRMATION" (Por confirmar), "PAID" (Pagado)
    val orderType: String, // "DINE_IN" (En mesa), "TAKEAWAY" (Para llevar)
    val timestamp: Long = System.currentTimeMillis(),
    val notes: String = ""
)

@Entity(tableName = "order_items")
data class OrderItem(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val orderId: Int,
    val productId: Int,
    val productName: String,
    val quantity: Int,
    val priceUsd: Double
)

@Entity(tableName = "restaurant_config")
data class RestaurantConfig(
    @PrimaryKey val id: Int = 1,
    val exchangeRateBs: Double = 40.0, // Pre-configured exchange rate (e.g., 40.0 Bs/$)
    val isServerActive: Boolean = false
)
