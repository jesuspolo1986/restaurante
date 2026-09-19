package com.example.data

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface CategoryDao {
    @Query("SELECT * FROM categories ORDER BY id ASC")
    fun getAllCategories(): Flow<List<Category>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCategory(category: Category): Long

    @Update
    suspend fun updateCategory(category: Category)

    @Query("DELETE FROM categories WHERE id = :id")
    suspend fun deleteCategoryById(id: Int)
}

@Dao
interface ProductDao {
    @Query("SELECT * FROM products ORDER BY name ASC")
    fun getAllProducts(): Flow<List<Product>>

    @Query("SELECT * FROM products WHERE categoryId = :categoryId ORDER BY name ASC")
    fun getProductsByCategory(categoryId: Int): Flow<List<Product>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProduct(product: Product): Long

    @Update
    suspend fun updateProduct(product: Product)

    @Query("DELETE FROM products WHERE id = :id")
    suspend fun deleteProductById(id: Int)

    @Query("UPDATE products SET stock = :newStock WHERE id = :productId")
    suspend fun updateStock(productId: Int, newStock: Int)
}

@Dao
interface OrderDao {
    @Query("SELECT * FROM orders ORDER BY timestamp DESC")
    fun getAllOrders(): Flow<List<Order>>

    @Query("SELECT * FROM orders WHERE status = :status ORDER BY timestamp DESC")
    fun getOrdersByStatus(status: String): Flow<List<Order>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrder(order: Order): Long

    @Update
    suspend fun updateOrder(order: Order)

    @Query("UPDATE orders SET status = :status WHERE id = :orderId")
    suspend fun updateOrderStatus(orderId: Int, status: String)

    @Query("UPDATE orders SET paymentStatus = :paymentStatus WHERE id = :orderId")
    suspend fun updateOrderPaymentStatus(orderId: Int, paymentStatus: String)

    @Query("DELETE FROM orders WHERE id = :id")
    suspend fun deleteOrderById(id: Int)
}

@Dao
interface OrderItemDao {
    @Query("SELECT * FROM order_items WHERE orderId = :orderId")
    fun getItemsForOrder(orderId: Int): Flow<List<OrderItem>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrderItem(orderItem: OrderItem): Long

    @Query("DELETE FROM order_items WHERE orderId = :orderId")
    suspend fun deleteItemsForOrder(orderId: Int)
}

@Dao
interface RestaurantConfigDao {
    @Query("SELECT * FROM restaurant_config WHERE id = 1 LIMIT 1")
    fun getConfigFlow(): Flow<RestaurantConfig?>

    @Query("SELECT * FROM restaurant_config WHERE id = 1 LIMIT 1")
    suspend fun getConfig(): RestaurantConfig?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveConfig(config: RestaurantConfig)
}
