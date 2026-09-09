package com.example.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.BuildConfig
import com.example.data.Category
import com.example.data.Order
import com.example.data.OrderItem
import com.example.data.Product
import com.example.data.RestaurantConfig
import com.example.data.RestaurantDatabase
import com.example.data.RestaurantRepository
import com.example.network.LocalWebServer
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.auth.userProfileChangeRequest
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

sealed class AuthState {
    object Unauthenticated : AuthState()
    data class Authenticated(val email: String, val role: String) : AuthState()
}

class RestaurantViewModel(application: Application) : AndroidViewModel(application) {
    private val database = RestaurantDatabase.getDatabase(application)
    val repository = RestaurantRepository(database)
    private var webServer: LocalWebServer? = null

    // Authentication States
    private val firebaseAuth by lazy { FirebaseAuth.getInstance() }
    private val _authState = MutableStateFlow<AuthState>(AuthState.Unauthenticated)
    val authState: StateFlow<AuthState> = _authState.asStateFlow()

    // Demo Mode Status
    var isDemoMode: Boolean = true
        private set

    private val sharedPrefs = application.getSharedPreferences("gastro_local_auth_prefs", android.content.Context.MODE_PRIVATE)

    // UI States
    private val _currentMode = MutableStateFlow("CLIENT") // Default to CLIENT or will be overridden by role
    val currentMode: StateFlow<String> = _currentMode.asStateFlow()

    private val _serverUrl = MutableStateFlow("")
    val serverUrl: StateFlow<String> = _serverUrl.asStateFlow()

    private val _isServerActive = MutableStateFlow(false)
    val isServerActive: StateFlow<Boolean> = _isServerActive.asStateFlow()

    // Client Cart State
    private val _cart = MutableStateFlow<Map<Product, Int>>(emptyMap())
    val cart: StateFlow<Map<Product, Int>> = _cart.asStateFlow()

    // Database Observables
    val categories: StateFlow<List<Category>> = repository.allCategories
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val products: StateFlow<List<Product>> = repository.allProducts
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val orders: StateFlow<List<Order>> = repository.allOrders
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val config: StateFlow<RestaurantConfig?> = repository.config
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    init {
        // Initialize Web Server
        webServer = LocalWebServer(application, repository)

        // Initialize Firebase safely if credentials are valid, otherwise use Demo Mode
        try {
            val apiKey = try { BuildConfig.FIREBASE_API_KEY } catch (e: Exception) { "" }
            val appId = try { BuildConfig.FIREBASE_APPLICATION_ID } catch (e: Exception) { "" }
            val projectId = try { BuildConfig.FIREBASE_PROJECT_ID } catch (e: Exception) { "" }

            val hasValidConfig = apiKey.isNotEmpty() && 
                    !apiKey.contains("PLACEHOLDER") && 
                    appId.isNotEmpty() && 
                    !appId.contains("PLACEHOLDER") &&
                    projectId.isNotEmpty() && 
                    !projectId.contains("PLACEHOLDER")

            if (hasValidConfig) {
                if (FirebaseApp.getApps(application).isEmpty()) {
                    val options = FirebaseOptions.Builder()
                        .setApiKey(apiKey)
                        .setApplicationId(appId)
                        .setProjectId(projectId)
                        .build()
                    FirebaseApp.initializeApp(application, options)
                }
                isDemoMode = false
            } else {
                isDemoMode = true
            }
        } catch (e: Exception) {
            e.printStackTrace()
            isDemoMode = true
        }
        
        viewModelScope.launch {
            // Seed database with beautiful defaults
            repository.seedDatabaseIfEmpty()
            
            // Sync initial server state
            config.collect { conf ->
                if (conf != null) {
                    if (conf.isServerActive && !_isServerActive.value) {
                        startServer()
                    }
                }
            }
        }

        // Listen to Firebase Auth changes only if not in Demo Mode
        if (!isDemoMode) {
            try {
                firebaseAuth.addAuthStateListener { auth ->
                    val user = auth.currentUser
                    if (user == null) {
                        _authState.value = AuthState.Unauthenticated
                    } else {
                        val role = determineUserRole(user)
                        _authState.value = AuthState.Authenticated(user.email ?: "", role)
                        _currentMode.value = role // Auto-redirect to their corresponding role view
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
                isDemoMode = true
            }
        }
    }

    private fun determineUserRole(user: FirebaseUser): String {
        val displayName = user.displayName
        if (!displayName.isNullOrBlank()) {
            return displayName
        }
        
        // Fallback email role identification for backward compatibility or direct inputs
        val email = user.email ?: ""
        return getMockUserRole(email) ?: "CLIENT"
    }

    private fun saveMockUser(email: String, role: String) {
        sharedPrefs.edit().putString(email.lowercase().trim(), role).apply()
    }

    fun getMockUserRole(email: String): String? {
        val normalized = email.lowercase().trim()
        if (normalized == "admin@gastro.com") return "ADMIN"
        if (normalized == "cocina@gastro.com" || normalized == "kitchen@gastro.com") return "KITCHEN"
        if (normalized == "cliente@gastro.com" || normalized == "client@gastro.com") return "CLIENT"
        
        return sharedPrefs.getString(normalized, null)
    }

    fun signIn(email: String, password: String, onSuccess: () -> Unit, onError: (String) -> Unit) {
        if (isDemoMode) {
            val role = getMockUserRole(email)
            if (role != null) {
                _authState.value = AuthState.Authenticated(email, role)
                _currentMode.value = role
                onSuccess()
            } else {
                // For convenience in demo mode, if the user tries to login with a non-existent email
                // but types a specific password or pattern, we can let them login or explain how to use preset accounts
                if (email.contains("admin", ignoreCase = true)) {
                    _authState.value = AuthState.Authenticated(email, "ADMIN")
                    _currentMode.value = "ADMIN"
                    onSuccess()
                } else if (email.contains("cocina", ignoreCase = true) || email.contains("kitchen", ignoreCase = true)) {
                    _authState.value = AuthState.Authenticated(email, "KITCHEN")
                    _currentMode.value = "KITCHEN"
                    onSuccess()
                } else {
                    _authState.value = AuthState.Authenticated(email, "CLIENT")
                    _currentMode.value = "CLIENT"
                    onSuccess()
                }
            }
        } else {
            firebaseAuth.signInWithEmailAndPassword(email, password)
                .addOnSuccessListener {
                    onSuccess()
                }
                .addOnFailureListener { exception ->
                    onError(exception.localizedMessage ?: "Error desconocido al iniciar sesión")
                }
        }
    }

    fun signUp(email: String, password: String, role: String, onSuccess: () -> Unit, onError: (String) -> Unit) {
        if (isDemoMode) {
            saveMockUser(email, role)
            _authState.value = AuthState.Authenticated(email, role)
            _currentMode.value = role
            onSuccess()
        } else {
            firebaseAuth.createUserWithEmailAndPassword(email, password)
                .addOnSuccessListener { authResult ->
                    val user = authResult.user
                    if (user != null) {
                        val profileUpdates = userProfileChangeRequest {
                            displayName = role
                        }
                        user.updateProfile(profileUpdates)
                            .addOnCompleteListener { task ->
                                if (task.isSuccessful) {
                                    _authState.value = AuthState.Authenticated(user.email ?: email, role)
                                    _currentMode.value = role
                                    onSuccess()
                                } else {
                                    onError(task.exception?.localizedMessage ?: "Error al asignar el rol del perfil")
                                }
                            }
                    } else {
                        onError("No se pudo crear el usuario")
                    }
                }
                .addOnFailureListener { exception ->
                    onError(exception.localizedMessage ?: "Error al registrar el usuario")
                }
        }
    }

    fun signOut() {
        if (!isDemoMode) {
            try {
                firebaseAuth.signOut()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
        _authState.value = AuthState.Unauthenticated
    }

    fun setMode(mode: String) {
        _currentMode.value = mode
    }

    // Web Server Management
    fun toggleServer() {
        viewModelScope.launch {
            val currentConf = config.value ?: RestaurantConfig()
            val newActiveState = !currentConf.isServerActive
            
            if (newActiveState) {
                startServer()
            } else {
                stopServer()
            }
            
            repository.updateConfig(currentConf.copy(isServerActive = newActiveState))
        }
    }

    private fun startServer() {
        viewModelScope.launch {
            val ip = webServer?.getLocalIpAddress() ?: "127.0.0.1"
            val url = webServer?.start(8080) ?: "Error"
            _serverUrl.value = url
            _isServerActive.value = true
        }
    }

    private fun stopServer() {
        webServer?.stop()
        _serverUrl.value = ""
        _isServerActive.value = false
    }

    // Cart Management (Client Mode)
    fun addToCart(product: Product) {
        val currentMap = _cart.value.toMutableMap()
        val qty = currentMap[product] ?: 0
        if (qty < product.stock) {
            currentMap[product] = qty + 1
            _cart.value = currentMap
        }
    }

    fun removeFromCart(product: Product) {
        val currentMap = _cart.value.toMutableMap()
        val qty = currentMap[product] ?: 0
        if (qty > 1) {
            currentMap[product] = qty - 1
        } else {
            currentMap.remove(product)
        }
        _cart.value = currentMap
    }

    fun clearCart() {
        _cart.value = emptyMap()
    }

    // Flow for order items
    fun getItemsForOrder(orderId: Int): Flow<List<OrderItem>> {
        return repository.getItemsForOrder(orderId)
    }

    // Place local order
    fun placeLocalOrder(
        tableNumber: String,
        orderType: String,
        paymentMethod: String,
        paymentStatus: String,
        notes: String,
        onSuccess: () -> Unit
    ) {
        viewModelScope.launch {
            val itemsList = _cart.value.map { Pair(it.key, it.value) }
            if (itemsList.isNotEmpty()) {
                repository.placeOrder(
                    tableNumber = if (orderType == "DINE_IN") tableNumber else "Para llevar",
                    orderType = orderType,
                    paymentMethod = paymentMethod,
                    paymentStatus = paymentStatus,
                    notes = notes,
                    items = itemsList
                )
                clearCart()
                onSuccess()
            }
        }
    }

    // Order status actions
    fun updateOrderStatus(orderId: Int, newStatus: String) {
        viewModelScope.launch {
            repository.updateOrderStatus(orderId, newStatus)
        }
    }

    fun updateOrderPaymentStatus(orderId: Int, newPaymentStatus: String) {
        viewModelScope.launch {
            repository.updateOrderPaymentStatus(orderId, newPaymentStatus)
        }
    }

    fun collectOrderPayment(orderId: Int, paymentMethodBreakdown: String, newStatus: String? = null) {
        viewModelScope.launch {
            val orderList = orders.value
            val order = orderList.find { it.id == orderId }
            if (order != null) {
                val updatedOrder = order.copy(
                    paymentMethod = paymentMethodBreakdown,
                    paymentStatus = "PAID",
                    status = newStatus ?: order.status
                )
                repository.updateOrder(updatedOrder)
            }
        }
    }

    fun deleteOrder(orderId: Int) {
        viewModelScope.launch {
            repository.deleteOrder(orderId)
        }
    }

    // Config parameters
    fun updateExchangeRate(rate: Double) {
        viewModelScope.launch {
            val currentConf = config.value ?: RestaurantConfig()
            repository.updateConfig(currentConf.copy(exchangeRateBs = rate))
        }
    }

    // Inventory CRUD
    fun addCategory(name: String, iconName: String) {
        viewModelScope.launch {
            repository.insertCategory(Category(name = name, iconName = iconName))
        }
    }

    fun deleteCategory(categoryId: Int) {
        viewModelScope.launch {
            repository.deleteCategory(categoryId)
        }
    }

    fun addProduct(name: String, description: String, priceUsd: Double, categoryId: Int, stock: Int, imageUri: String) {
        viewModelScope.launch {
            repository.insertProduct(
                Product(
                    name = name,
                    description = description,
                    priceUsd = priceUsd,
                    categoryId = categoryId,
                    stock = stock,
                    imageUri = imageUri
                )
            )
        }
    }

    fun editProduct(product: Product) {
        viewModelScope.launch {
            repository.updateProduct(product)
        }
    }

    fun deleteProduct(productId: Int) {
        viewModelScope.launch {
            repository.deleteProduct(productId)
        }
    }

    override fun onCleared() {
        super.onCleared()
        stopServer()
    }
}
