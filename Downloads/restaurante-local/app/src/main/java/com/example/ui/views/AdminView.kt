package com.example.ui.views

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import android.net.Uri
import java.io.File
import java.io.FileOutputStream
import com.example.data.Category
import com.example.data.Order
import com.example.data.OrderItem
import com.example.data.Product
import com.example.data.RestaurantConfig
import com.example.ui.RestaurantViewModel
import com.example.ui.components.ProductImage
import com.example.ui.components.QRCodeCanvas
import kotlinx.coroutines.flow.collectLatest
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminView(
    viewModel: RestaurantViewModel,
    modifier: Modifier = Modifier
) {
    var selectedSubTab by remember { mutableStateOf("PEDIDOS") } // "PEDIDOS", "MENU", "VENTAS", "SETTINGS"
    val categories by viewModel.categories.collectAsState()
    val products by viewModel.products.collectAsState()
    val orders by viewModel.orders.collectAsState()
    val config by viewModel.config.collectAsState()

    Scaffold(
        topBar = {
            SecondaryTabRow(
                selectedTabIndex = when (selectedSubTab) {
                    "PEDIDOS" -> 0
                    "MENU" -> 1
                    "VENTAS" -> 2
                    else -> 3
                },
                modifier = Modifier.fillMaxWidth(),
                containerColor = MaterialTheme.colorScheme.surface
            ) {
                Tab(
                    selected = selectedSubTab == "PEDIDOS",
                    onClick = { selectedSubTab = "PEDIDOS" },
                    text = {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(Icons.Default.ReceiptLong, contentDescription = null, modifier = Modifier.size(18.dp))
                            Text("Pedidos (${orders.count { it.status != "SERVED" && it.status != "CANCELLED" }})")
                        }
                    }
                )
                Tab(
                    selected = selectedSubTab == "MENU",
                    onClick = { selectedSubTab = "MENU" },
                    text = {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(Icons.Default.RestaurantMenu, contentDescription = null, modifier = Modifier.size(18.dp))
                            Text("Menú & Stock")
                        }
                    }
                )
                Tab(
                    selected = selectedSubTab == "VENTAS",
                    onClick = { selectedSubTab = "VENTAS" },
                    text = {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(Icons.Default.TrendingUp, contentDescription = null, modifier = Modifier.size(18.dp))
                            Text("Resumen Ventas")
                        }
                    }
                )
                Tab(
                    selected = selectedSubTab == "SETTINGS",
                    onClick = { selectedSubTab = "SETTINGS" },
                    text = {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(Icons.Default.Settings, contentDescription = null, modifier = Modifier.size(18.dp))
                            Text("Servidor & Tasa")
                        }
                    }
                )
            }
        },
        modifier = modifier
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            when (selectedSubTab) {
                "PEDIDOS" -> AdminOrdersTab(viewModel, orders)
                "MENU" -> AdminMenuTab(viewModel, categories, products)
                "VENTAS" -> AdminSalesTab(viewModel, orders)
                "SETTINGS" -> AdminSettingsTab(viewModel, config)
            }
        }
    }
}

// ---------------- PEDIDOS SUB-TAB ----------------
@Composable
fun AdminOrdersTab(
    viewModel: RestaurantViewModel,
    orders: List<Order>
) {
    var orderFilter by remember { mutableStateOf("PENDING") } // "PENDING", "PREPARING_READY", "HISTORIAL"
    var activePaymentOrder by remember { mutableStateOf<Order?>(null) }

    val filteredOrders = remember(orders, orderFilter) {
        when (orderFilter) {
            "PENDING" -> orders.filter { it.status == "PENDING" }
            "PREPARING_READY" -> orders.filter {
                it.status == "PREPARING" || it.status == "READY" || (it.status == "SERVED" && it.paymentStatus != "PAID")
            }
            else -> orders.filter {
                (it.status == "SERVED" && it.paymentStatus == "PAID") || it.status == "CANCELLED"
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Filter Buttons Row
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            FilterChip(
                selected = orderFilter == "PENDING",
                onClick = { orderFilter = "PENDING" },
                label = { Text("Por Confirmar (${orders.count { it.status == "PENDING" }})") },
                leadingIcon = { Icon(Icons.Default.Pending, contentDescription = null, modifier = Modifier.size(16.dp)) }
            )
            FilterChip(
                selected = orderFilter == "PREPARING_READY",
                onClick = { orderFilter = "PREPARING_READY" },
                label = { Text("Cocina (${orders.count { it.status == "PREPARING" || it.status == "READY" || (it.status == "SERVED" && it.paymentStatus != "PAID") }})") },
                leadingIcon = { Icon(Icons.Default.SoupKitchen, contentDescription = null, modifier = Modifier.size(16.dp)) }
            )
            FilterChip(
                selected = orderFilter == "HISTORIAL",
                onClick = { orderFilter = "HISTORIAL" },
                label = { Text("Historial") },
                leadingIcon = { Icon(Icons.Default.History, contentDescription = null, modifier = Modifier.size(16.dp)) }
            )
        }

        if (filteredOrders.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .weight(1f),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        imageVector = Icons.Default.Inbox,
                        contentDescription = "Sin pedidos",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f),
                        modifier = Modifier.size(72.dp)
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "No hay pedidos en esta sección",
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .weight(1f),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(filteredOrders, key = { it.id }) { order ->
                    OrderCard(order, viewModel, onCollectPayment = { activePaymentOrder = it })
                }
            }
        }
    }

    activePaymentOrder?.let { order ->
        val config by viewModel.config.collectAsState()
        val exchangeRate = config?.exchangeRateBs ?: 42.5
        PaymentCollectionDialog(
            order = order,
            exchangeRate = exchangeRate,
            onDismiss = { activePaymentOrder = null },
            onConfirmPayment = { breakdown ->
                viewModel.collectOrderPayment(order.id, breakdown)
                activePaymentOrder = null
            }
        )
    }
}

@Composable
fun OrderCard(
    order: Order,
    viewModel: RestaurantViewModel,
    onCollectPayment: (Order) -> Unit
) {
    val config by viewModel.config.collectAsState()
    val items by viewModel.getItemsForOrder(order.id).collectAsState(initial = emptyList())
    val rate = config?.exchangeRateBs ?: 42.5
    val totalBs = order.totalUsd * rate

    val dateFormatted = remember(order.timestamp) {
        val sdf = SimpleDateFormat("hh:mm a", Locale.getDefault())
        sdf.format(Date(order.timestamp))
    }

    val isReady = order.status == "READY"

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isReady) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.45f)
            else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f)
        ),
        border = if (isReady) androidx.compose.foundation.BorderStroke(2.dp, MaterialTheme.colorScheme.primary) else null
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            // Header Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Pedido #${order.id} — ${order.tableNumber}",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Hora: $dateFormatted",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                
                // Status Badge
                Box(
                    modifier = Modifier
                        .clip(CircleShape)
                        .background(
                            when (order.status) {
                                "PENDING" -> Color(0xFFE65100).copy(alpha = 0.15f)
                                "PREPARING" -> Color(0xFF00796B).copy(alpha = 0.15f)
                                "READY" -> Color(0xFF4CAF50).copy(alpha = 0.15f)
                                "SERVED" -> Color(0xFF78909C).copy(alpha = 0.15f)
                                else -> Color(0xFFC62828).copy(alpha = 0.15f)
                            }
                        )
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = when (order.status) {
                            "PENDING" -> "Por Confirmar"
                            "PREPARING" -> "En Cocina"
                            "READY" -> "¡LISTO!"
                            "SERVED" -> "Entregado"
                            else -> "Cancelado"
                        },
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = when (order.status) {
                            "PENDING" -> Color(0xFFE65100)
                            "PREPARING" -> Color(0xFF00796B)
                            "READY" -> Color(0xFF2E7D32)
                            "SERVED" -> Color(0xFF455A64)
                            else -> Color(0xFFC62828)
                        }
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))
            Divider(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f))
            Spacer(modifier = Modifier.height(12.dp))

            // Items List
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                items.forEach { item ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "${item.quantity}x ${item.productName}",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Medium
                        )
                        Text(
                            text = "$${String.format("%.2f", item.priceUsd * item.quantity)}",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            if (order.notes.isNotEmpty()) {
                Spacer(modifier = Modifier.height(8.dp))
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.04f))
                        .padding(8.dp)
                ) {
                    Text(
                        text = "Nota: ${order.notes}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))
            Divider(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f))
            Spacer(modifier = Modifier.height(12.dp))

            // Payment and totals info
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        Icon(
                            imageVector = when {
                                order.paymentMethod.contains("Pago Móvil") -> Icons.Default.PhoneAndroid
                                order.paymentMethod.contains("Punto de Venta") -> Icons.Default.CreditCard
                                order.paymentMethod.contains("Zelle") -> Icons.Default.AccountBalance
                                else -> Icons.Default.Payments
                            },
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            text = if (order.paymentMethod.contains(":")) "Pago Mixto" else order.paymentMethod,
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                    Text(
                        text = if (order.paymentStatus == "PAID") "PAGADO" else "Por Cobrar",
                        style = MaterialTheme.typography.bodySmall,
                        color = if (order.paymentStatus == "PAID") Color(0xFF2E7D32) else Color(0xFFC62828),
                        fontWeight = FontWeight.Bold
                    )
                }

                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = "Total: $${String.format("%.2f", order.totalUsd)}",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "${String.format("%.2f", totalBs)} Bs",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            // Action Buttons
            Spacer(modifier = Modifier.height(16.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                when (order.status) {
                    "PENDING" -> {
                        Button(
                            onClick = {
                                viewModel.updateOrderStatus(order.id, "PREPARING")
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.SoupKitchen, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Confirmar & Enviar a Cocina", fontSize = 11.sp, maxLines = 1)
                        }
                        OutlinedButton(
                            onClick = { viewModel.updateOrderStatus(order.id, "CANCELLED") },
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error),
                            modifier = Modifier.width(100.dp)
                        ) {
                            Text("Rechazar")
                        }
                    }
                    "PREPARING" -> {
                        Button(
                            onClick = {
                                viewModel.updateOrderStatus(order.id, "READY")
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondary),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Terminar Preparación (Listo)", fontSize = 12.sp)
                        }
                    }
                    "READY" -> {
                        if (order.orderType == "TAKEAWAY") {
                            if (order.paymentStatus != "PAID") {
                                Button(
                                    onClick = { onCollectPayment(order) },
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE65100)),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Icon(Icons.Default.PointOfSale, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Cobrar (Para Llevar)", fontSize = 12.sp)
                                }
                            } else {
                                Button(
                                    onClick = {
                                        viewModel.updateOrderStatus(order.id, "SERVED")
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32)),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Icon(Icons.Default.LocalMall, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Entregar Pedido", fontSize = 12.sp)
                                }
                            }
                        } else {
                            Button(
                                onClick = {
                                    viewModel.updateOrderStatus(order.id, "SERVED")
                                    onCollectPayment(order.copy(status = "SERVED"))
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00796B)),
                                modifier = Modifier.weight(1f)
                            ) {
                                Icon(Icons.Default.RoomService, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Entregar a Mesa", fontSize = 12.sp)
                            }
                        }
                    }
                    "SERVED" -> {
                        if (order.paymentStatus != "PAID") {
                            Button(
                                onClick = { onCollectPayment(order) },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE65100)),
                                modifier = Modifier.weight(1f)
                            ) {
                                Icon(Icons.Default.PointOfSale, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Cobrar Cuenta (Mesa)", fontSize = 12.sp)
                            }
                        } else {
                            IconButton(
                                onClick = { viewModel.deleteOrder(order.id) },
                                modifier = Modifier.clip(CircleShape).background(MaterialTheme.colorScheme.error.copy(alpha = 0.1f))
                            ) {
                                Icon(Icons.Default.Delete, contentDescription = "Eliminar", tint = MaterialTheme.colorScheme.error)
                            }
                            Spacer(modifier = Modifier.weight(1f))
                            Text(
                                text = "Orden Finalizada & Pagada",
                                style = MaterialTheme.typography.bodyMedium,
                                color = Color(0xFF2E7D32),
                                modifier = Modifier.align(Alignment.CenterVertically),
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                    else -> {
                        IconButton(
                            onClick = { viewModel.deleteOrder(order.id) },
                            modifier = Modifier.clip(CircleShape).background(MaterialTheme.colorScheme.error.copy(alpha = 0.1f))
                        ) {
                            Icon(Icons.Default.Delete, contentDescription = "Eliminar", tint = MaterialTheme.colorScheme.error)
                        }
                        Spacer(modifier = Modifier.weight(1f))
                        Text(
                            text = "Orden Cancelada",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.error,
                            modifier = Modifier.align(Alignment.CenterVertically),
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }
    }
}

// ---------------- MENU SUB-TAB ----------------
@Composable
fun AdminMenuTab(
    viewModel: RestaurantViewModel,
    categories: List<Category>,
    products: List<Product>
) {
    var selectedCategoryId by remember { mutableStateOf<Int?>(null) }
    var showAddProductDialog by remember { mutableStateOf(false) }
    var showAddCategoryDialog by remember { mutableStateOf(false) }
    var editingProduct by remember { mutableStateOf<Product?>(null) }

    val filteredProducts = remember(products, selectedCategoryId) {
        if (selectedCategoryId == null) products else products.filter { it.categoryId == selectedCategoryId }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Buttons bar
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Button(
                onClick = { showAddProductDialog = true },
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.weight(1f)
            ) {
                Icon(Icons.Default.Add, contentDescription = null)
                Spacer(modifier = Modifier.width(4.dp))
                Text("Nuevo Producto")
            }
            Button(
                onClick = { showAddCategoryDialog = true },
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondary),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.weight(1f)
            ) {
                Icon(Icons.Default.Category, contentDescription = null)
                Spacer(modifier = Modifier.width(4.dp))
                Text("Nueva Categoría")
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Categories selector row
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            item {
                FilterChip(
                    selected = selectedCategoryId == null,
                    onClick = { selectedCategoryId = null },
                    label = { Text("Todos") }
                )
            }
            items(categories) { cat ->
                FilterChip(
                    selected = selectedCategoryId == cat.id,
                    onClick = { selectedCategoryId = cat.id },
                    label = { Text(cat.name) },
                    trailingIcon = {
                        IconButton(
                            onClick = { viewModel.deleteCategory(cat.id) },
                            modifier = Modifier.size(16.dp)
                        ) {
                            Icon(Icons.Default.Close, contentDescription = "Eliminar Categoría", modifier = Modifier.size(12.dp))
                        }
                    }
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Products List
        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            items(filteredProducts, key = { it.id }) { product ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { editingProduct = product },
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.25f))
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        ProductImage(
                            imageUri = product.imageUri,
                            modifier = Modifier.size(64.dp)
                        )
                        Spacer(modifier = Modifier.width(16.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(product.name, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                            Text(product.description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
                            Spacer(modifier = Modifier.height(4.dp))
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(16.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "$${String.format("%.2f", product.priceUsd)}",
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.primary
                                )
                                Text(
                                    text = "Stock: ${product.stock}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = if (product.stock < 5) Color(0xFFC62828) else MaterialTheme.colorScheme.onSurfaceVariant,
                                    fontWeight = if (product.stock < 5) FontWeight.Bold else FontWeight.Normal
                                )
                            }
                        }
                        IconButton(onClick = { viewModel.deleteProduct(product.id) }) {
                            Icon(Icons.Default.Delete, contentDescription = "Eliminar Producto", tint = MaterialTheme.colorScheme.error)
                        }
                    }
                }
            }
        }
    }

    // Modal dialog for Add Product
    if (showAddProductDialog) {
        ProductFormDialog(
            categories = categories,
            onDismiss = { showAddProductDialog = false },
            onSave = { name, desc, price, catId, stock, imgUri ->
                viewModel.addProduct(name, desc, price, catId, stock, imgUri)
                showAddProductDialog = false
            }
        )
    }

    // Modal dialog for Edit Product
    editingProduct?.let { product ->
        ProductFormDialog(
            product = product,
            categories = categories,
            onDismiss = { editingProduct = null },
            onSave = { name, desc, price, catId, stock, imgUri ->
                viewModel.editProduct(product.copy(name = name, description = desc, priceUsd = price, categoryId = catId, stock = stock, imageUri = imgUri))
                editingProduct = null
            }
        )
    }

    // Modal dialog for Add Category
    if (showAddCategoryDialog) {
        var catName by remember { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { showAddCategoryDialog = false },
            title = { Text("Nueva Categoría") },
            text = {
                OutlinedTextField(
                    value = catName,
                    onValueChange = { catName = it },
                    label = { Text("Nombre de la categoría") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (catName.isNotEmpty()) {
                            viewModel.addCategory(catName, "restaurant")
                            showAddCategoryDialog = false
                        }
                    }
                ) {
                    Text("Guardar")
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddCategoryDialog = false }) {
                    Text("Cancelar")
                }
            }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductFormDialog(
    product: Product? = null,
    categories: List<Category>,
    onDismiss: () -> Unit,
    onSave: (name: String, desc: String, price: Double, catId: Int, stock: Int, imgUri: String) -> Unit
) {
    val context = LocalContext.current
    var name by remember { mutableStateOf(product?.name ?: "") }
    var description by remember { mutableStateOf(product?.description ?: "") }
    var priceStr by remember { mutableStateOf(product?.priceUsd?.toString() ?: "") }
    var stockStr by remember { mutableStateOf(product?.stock?.toString() ?: "") }
    
    var selectedCategory by remember { 
        mutableStateOf(categories.find { it.id == product?.categoryId } ?: categories.firstOrNull()) 
    }
    var expandedCategoryDropdown by remember { mutableStateOf(false) }

    var imageUri by remember { mutableStateOf(product?.imageUri ?: "plato") }
    val imageOptions = listOf("pabellon", "asado", "arepa", "tequenos", "empanadas", "chicha", "papelon", "quesillo", "tresleches", "burger", "pizza", "cafe", "bebida")
    var expandedImageDropdown by remember { mutableStateOf(false) }

    val galleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri ->
        if (uri != null) {
            val localPath = saveUriToInternalStorage(context, uri)
            if (localPath.isNotEmpty()) {
                imageUri = localPath
            }
        }
    }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            LazyColumn(
                modifier = Modifier
                    .padding(20.dp)
                    .fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                item {
                    Text(
                        text = if (product == null) "Agregar Producto" else "Editar Producto",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                }

                // Interactive Image Picker Area
                item {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Box(
                            modifier = Modifier
                                .size(110.dp)
                                .clip(RoundedCornerShape(16.dp))
                                .clickable { galleryLauncher.launch("image/*") },
                            contentAlignment = Alignment.Center
                        ) {
                            ProductImage(
                                imageUri = imageUri,
                                modifier = Modifier.fillMaxSize()
                            )
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .background(Color.Black.copy(alpha = 0.3f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Edit,
                                    contentDescription = "Cambiar Foto",
                                    tint = Color.White,
                                    modifier = Modifier.size(24.dp)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        TextButton(
                            onClick = { galleryLauncher.launch("image/*") }
                        ) {
                            Icon(Icons.Default.Image, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Subir foto desde galería", style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }

                item {
                    OutlinedTextField(
                        value = name,
                        onValueChange = { name = it },
                        label = { Text("Nombre del Producto") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                item {
                    OutlinedTextField(
                        value = description,
                        onValueChange = { description = it },
                        label = { Text("Descripción") },
                        maxLines = 3,
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        OutlinedTextField(
                            value = priceStr,
                            onValueChange = { priceStr = it },
                            label = { Text("Precio USD") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            singleLine = true,
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = stockStr,
                            onValueChange = { stockStr = it },
                            label = { Text("Stock inicial") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            singleLine = true,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }

                // Category Selection
                item {
                    ExposedDropdownMenuBox(
                        expanded = expandedCategoryDropdown,
                        onExpandedChange = { expandedCategoryDropdown = !expandedCategoryDropdown }
                    ) {
                        OutlinedTextField(
                            value = selectedCategory?.name ?: "Seleccionar Categoría",
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("Categoría") },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedCategoryDropdown) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .menuAnchor()
                        )
                        ExposedDropdownMenu(
                            expanded = expandedCategoryDropdown,
                            onDismissRequest = { expandedCategoryDropdown = false }
                        ) {
                            categories.forEach { cat ->
                                DropdownMenuItem(
                                    text = { Text(cat.name) },
                                    onClick = {
                                        selectedCategory = cat
                                        expandedCategoryDropdown = false
                                    }
                                )
                            }
                        }
                    }
                }

                // Visual Representation Tag Selector
                item {
                    ExposedDropdownMenuBox(
                        expanded = expandedImageDropdown,
                        onExpandedChange = { expandedImageDropdown = !expandedImageDropdown }
                    ) {
                        OutlinedTextField(
                            value = if (imageUri.startsWith("/")) "Foto Personalizada" else imageUri.uppercase(),
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("Ilustración Visual") },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedImageDropdown) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .menuAnchor()
                        )
                        ExposedDropdownMenu(
                            expanded = expandedImageDropdown,
                            onDismissRequest = { expandedImageDropdown = false }
                        ) {
                            imageOptions.forEach { opt ->
                                DropdownMenuItem(
                                    text = { Text(opt.uppercase()) },
                                    onClick = {
                                        imageUri = opt
                                        expandedImageDropdown = false
                                    }
                                )
                            }
                        }
                    }
                }

                // Action Buttons
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        TextButton(onClick = onDismiss) {
                            Text("Cancelar")
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Button(
                            onClick = {
                                val price = priceStr.toDoubleOrNull() ?: 0.0
                                val stock = stockStr.toIntOrNull() ?: 0
                                val catId = selectedCategory?.id ?: 1
                                if (name.isNotEmpty()) {
                                    onSave(name, description, price, catId, stock, imageUri)
                                }
                            }
                        ) {
                            Text("Guardar")
                        }
                    }
                }
            }
        }
    }
}

// ---------------- SETTINGS SUB-TAB ----------------
@Composable
fun AdminSettingsTab(
    viewModel: RestaurantViewModel,
    config: RestaurantConfig?
) {
    val context = LocalContext.current
    var exchangeRateText by remember(config) { mutableStateOf(config?.exchangeRateBs?.toString() ?: "42.50") }
    val isServerActive by viewModel.isServerActive.collectAsState()
    val serverUrl by viewModel.serverUrl.collectAsState()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp)
    ) {
        item {
            Text(
                "Configuración General",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
        }

        // Card 1: Multi-moneda Tasa de cambio
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.25f))
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        "Tasa de Cambio (Moneda Local Bs / USD)",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        "Establece la tasa del dólar para calcular automáticamente los precios y pagos en Bolívares (Bs).",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(16.dp))

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        OutlinedTextField(
                            value = exchangeRateText,
                            onValueChange = { exchangeRateText = it },
                            label = { Text("Tasa de cambio Bs") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            singleLine = true,
                            prefix = { Text("Bs ") },
                            modifier = Modifier.weight(1f)
                        )
                        Button(
                            onClick = {
                                val rate = exchangeRateText.toDoubleOrNull() ?: 40.0
                                viewModel.updateExchangeRate(rate)
                            },
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Icon(Icons.Default.Save, contentDescription = null)
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Guardar")
                        }
                    }
                }
            }
        }

        // Card 2: Servidor QR Local
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.25f))
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            "Servidor de Menú QR Local",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        // Status LED
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            Box(
                                modifier = Modifier
                                    .size(10.dp)
                                    .clip(CircleShape)
                                    .background(if (isServerActive) Color(0xFF4CAF50) else Color(0xFF9E9E9E))
                            )
                            Text(
                                text = if (isServerActive) "ACTIVO" else "INACTIVO",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                color = if (isServerActive) Color(0xFF2E7D32) else Color(0xFF757575)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Al activar el servidor, los comensales que se encuentren en la misma red Wi-Fi que este dispositivo podrán ordenar de forma autónoma escaneando el código QR.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(16.dp))

                    Button(
                        onClick = { viewModel.toggleServer() },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (isServerActive) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary
                        ),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(
                            imageVector = if (isServerActive) Icons.Default.WifiOff else Icons.Default.Wifi,
                            contentDescription = null
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(if (isServerActive) "Detener Servidor QR" else "Iniciar Servidor QR")
                    }

                    if (isServerActive && serverUrl.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(20.dp))
                        Divider(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f))
                        Spacer(modifier = Modifier.height(20.dp))

                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                "¡Servidor QR Corriendo Localmente!",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = serverUrl,
                                style = MaterialTheme.typography.bodyLarge,
                                fontWeight = FontWeight.ExtraBold,
                                color = MaterialTheme.colorScheme.secondary
                            )
                            Spacer(modifier = Modifier.height(16.dp))

                            // Draw Dynamic QR Code on Canvas
                            Box(
                                modifier = Modifier
                                    .size(200.dp)
                                    .clip(RoundedCornerShape(16.dp))
                                    .background(Color.White)
                                    .padding(16.dp)
                            ) {
                                QRCodeCanvas(
                                    data = serverUrl,
                                    modifier = Modifier.fillMaxSize()
                                )
                            }

                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = "Instrucciones: Indica a los clientes que se conecten a la red Wi-Fi local y escaneen este código QR. Su navegador cargará el menú digital y sus pedidos llegarán de inmediato a la sección de Pedidos de esta tablet.",
                                style = MaterialTheme.typography.bodySmall,
                                textAlign = TextAlign.Center,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(horizontal = 8.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}

// ---------------- PAYMENT DIALOG ----------------
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PaymentCollectionDialog(
    order: Order,
    exchangeRate: Double,
    onDismiss: () -> Unit,
    onConfirmPayment: (breakdown: String) -> Unit
) {
    var cashUsd by remember { mutableStateOf("") }
    var zelleUsd by remember { mutableStateOf("") }
    var pagomovilBs by remember { mutableStateOf("") }
    var puntoBs by remember { mutableStateOf("") }
    var cashBs by remember { mutableStateOf("") }

    val totalUsd = order.totalUsd
    val totalBs = totalUsd * exchangeRate

    val cashUsdVal = cashUsd.toDoubleOrNull() ?: 0.0
    val zelleUsdVal = zelleUsd.toDoubleOrNull() ?: 0.0
    val pagomovilUsdVal = (pagomovilBs.toDoubleOrNull() ?: 0.0) / exchangeRate
    val puntoUsdVal = (puntoBs.toDoubleOrNull() ?: 0.0) / exchangeRate
    val cashBsUsdVal = (cashBs.toDoubleOrNull() ?: 0.0) / exchangeRate

    val totalEnteredUsd = cashUsdVal + zelleUsdVal + pagomovilUsdVal + puntoUsdVal + cashBsUsdVal
    val totalEnteredBs = totalEnteredUsd * exchangeRate

    val remainingUsd = (totalUsd - totalEnteredUsd).coerceAtLeast(0.0)
    val remainingBs = remainingUsd * exchangeRate

    val changeUsd = (totalEnteredUsd - totalUsd).coerceAtLeast(0.0)
    val changeBs = changeUsd * exchangeRate

    val isPaymentComplete = totalEnteredUsd >= (totalUsd - 0.01)

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Column {
                Text(
                    text = "Cobrar Pedido #${order.id}",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Ubicación: ${order.tableNumber}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        },
        text = {
            LazyColumn(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                item {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)),
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("Total a Pagar:", style = MaterialTheme.typography.bodyMedium)
                                Text(
                                    "$${String.format("%.2f", totalUsd)} / ${String.format("%.2f", totalBs)} Bs",
                                    fontWeight = FontWeight.Bold,
                                    style = MaterialTheme.typography.titleMedium,
                                    color = MaterialTheme.colorScheme.primary
                                )
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("Ingresado:", style = MaterialTheme.typography.bodySmall)
                                Text(
                                    "$${String.format("%.2f", totalEnteredUsd)} / ${String.format("%.2f", totalEnteredBs)} Bs",
                                    fontWeight = FontWeight.Medium,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = if (isPaymentComplete) Color(0xFF2E7D32) else MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            Spacer(modifier = Modifier.height(4.dp))
                            if (!isPaymentComplete) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text("Pendiente:", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
                                    Text(
                                        "$${String.format("%.2f", remainingUsd)} / ${String.format("%.2f", remainingBs)} Bs",
                                        fontWeight = FontWeight.Bold,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.error
                                    )
                                }
                            } else if (changeUsd > 0.01) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text("Cambio / Vuelto:", style = MaterialTheme.typography.bodySmall, color = Color(0xFF2E7D32))
                                    Text(
                                        "$${String.format("%.2f", changeUsd)} / ${String.format("%.2f", changeBs)} Bs",
                                        fontWeight = FontWeight.Bold,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = Color(0xFF2E7D32)
                                    )
                                }
                            }
                        }
                    }
                }

                item {
                    Text("Métodos en Dólares ($)", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                }

                item {
                    OutlinedTextField(
                        value = cashUsd,
                        onValueChange = { cashUsd = it },
                        label = { Text("Efectivo $") },
                        prefix = { Text("$ ") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                item {
                    OutlinedTextField(
                        value = zelleUsd,
                        onValueChange = { zelleUsd = it },
                        label = { Text("Zelle") },
                        prefix = { Text("$ ") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                item {
                    Text("Métodos en Bolívares (Bs - Tasa: $exchangeRate)", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                }

                item {
                    OutlinedTextField(
                        value = pagomovilBs,
                        onValueChange = { pagomovilBs = it },
                        label = { Text("Pago Móvil") },
                        prefix = { Text("Bs ") },
                        supportingText = {
                            if (pagomovilUsdVal > 0) {
                                Text("Equiv. $${String.format("%.2f", pagomovilUsdVal)}")
                            }
                        },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                item {
                    OutlinedTextField(
                        value = puntoBs,
                        onValueChange = { puntoBs = it },
                        label = { Text("Punto de Venta") },
                        prefix = { Text("Bs ") },
                        supportingText = {
                            if (puntoUsdVal > 0) {
                                Text("Equiv. $${String.format("%.2f", puntoUsdVal)}")
                            }
                        },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                item {
                    OutlinedTextField(
                        value = cashBs,
                        onValueChange = { cashBs = it },
                        label = { Text("Efectivo Bs") },
                        prefix = { Text("Bs ") },
                        supportingText = {
                            if (cashBsUsdVal > 0) {
                                Text("Equiv. $${String.format("%.2f", cashBsUsdVal)}")
                            }
                        },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (isPaymentComplete) {
                        val breakdownParts = mutableListOf<String>()
                        if (cashUsdVal > 0) breakdownParts.add("Efectivo $: $${String.format("%.2f", cashUsdVal)}")
                        if (zelleUsdVal > 0) breakdownParts.add("Zelle: $${String.format("%.2f", zelleUsdVal)}")
                        if (pagomovilUsdVal > 0) breakdownParts.add("Pago Móvil: $${String.format("%.2f", pagomovilUsdVal)}")
                        if (puntoUsdVal > 0) breakdownParts.add("Punto de Venta: $${String.format("%.2f", puntoUsdVal)}")
                        if (cashBsUsdVal > 0) breakdownParts.add("Efectivo Bs: $${String.format("%.2f", cashBsUsdVal)}")

                        if (breakdownParts.isEmpty()) {
                            breakdownParts.add(order.paymentMethod)
                        }

                        onConfirmPayment(breakdownParts.joinToString(", "))
                    }
                },
                enabled = isPaymentComplete
            ) {
                Text("Confirmar Pago")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancelar")
            }
        }
    )
}

// ---------------- SALES TAB ----------------
@Composable
fun AdminSalesTab(
    viewModel: RestaurantViewModel,
    orders: List<Order>
) {
    val config by viewModel.config.collectAsState()
    val exchangeRate = config?.exchangeRateBs ?: 42.5

    val paidOrders = remember(orders) {
        orders.filter { it.paymentStatus == "PAID" && it.status == "SERVED" }
    }

    val totalSalesUsd = remember(paidOrders) {
        paidOrders.sumOf { it.totalUsd }
    }
    val totalSalesBs = totalSalesUsd * exchangeRate

    val methodBreakdown = remember(paidOrders) {
        val breakdown = mutableMapOf<String, Double>()
        paidOrders.forEach { order ->
            val method = order.paymentMethod
            if (method.contains(":") && method.contains("$")) {
                val parts = method.split(",")
                for (part in parts) {
                    val keyValue = part.split(":")
                    if (keyValue.size == 2) {
                        val key = keyValue[0].trim()
                        val valStr = keyValue[1].replace("$", "").trim()
                        val value = valStr.toDoubleOrNull() ?: 0.0
                        breakdown[key] = (breakdown[key] ?: 0.0) + value
                    }
                }
            } else {
                val key = method.trim()
                breakdown[key] = (breakdown[key] ?: 0.0) + order.totalUsd
            }
        }
        breakdown
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Text(
                text = "Resumen de Ventas",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Card(
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.45f))
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "Total USD",
                            style = MaterialTheme.typography.titleSmall,
                            color = MaterialTheme.colorScheme.primary
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "$${String.format("%.2f", totalSalesUsd)}",
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                Card(
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.45f))
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "Total Bs",
                            style = MaterialTheme.typography.titleSmall,
                            color = MaterialTheme.colorScheme.secondary
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "${String.format("%.2f", totalSalesBs)} Bs",
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }

        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.25f))
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Ventas por Método de Pago",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    if (methodBreakdown.isEmpty()) {
                        Text(
                            text = "No hay datos de cobro disponibles",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    } else {
                        methodBreakdown.forEach { (method, amount) ->
                            val percentage = if (totalSalesUsd > 0) (amount / totalSalesUsd).toFloat() else 0f
                            Column(modifier = Modifier.padding(vertical = 4.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = method,
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.Medium
                                    )
                                    Text(
                                        text = "$${String.format("%.2f", amount)} (${String.format("%.1f", percentage * 100)}%)",
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                }
                                Spacer(modifier = Modifier.height(4.dp))
                                LinearProgressIndicator(
                                    progress = percentage,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(8.dp)
                                        .clip(RoundedCornerShape(4.dp)),
                                    color = MaterialTheme.colorScheme.primary,
                                    trackColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)
                                )
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                        }
                    }
                }
            }
        }

        item {
            Text(
                text = "Historial de Transacciones (${paidOrders.size})",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(top = 8.dp)
            )
        }

        if (paidOrders.isEmpty()) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Aún no se han registrado cobros finalizados",
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }
        } else {
            items(paidOrders) { order ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.15f))
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column {
                                Text(
                                    text = "Pedido #${order.id} — ${order.tableNumber}",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Bold
                                )
                                val sdf = SimpleDateFormat("dd/MM/yyyy hh:mm a", Locale.getDefault())
                                val dateStr = sdf.format(Date(order.timestamp))
                                Text(
                                    text = dateStr,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text(
                                    text = "$${String.format("%.2f", order.totalUsd)}",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.primary
                                )
                                Text(
                                    text = "${String.format("%.2f", order.totalUsd * exchangeRate)} Bs",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Divider(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f))
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Tipo: ${if (order.orderType == "TAKEAWAY") "Para Llevar" else "En Mesa"}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(4.dp))
                                    .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.08f))
                                    .padding(horizontal = 8.dp, vertical = 4.dp)
                            ) {
                                Text(
                                    text = order.paymentMethod,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.primary,
                                    fontWeight = FontWeight.Medium
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

private fun saveUriToInternalStorage(context: android.content.Context, uri: Uri): String {
    return try {
        val inputStream = context.contentResolver.openInputStream(uri)
        val directory = File(context.filesDir, "product_images")
        if (!directory.exists()) {
            directory.mkdirs()
        }
        val file = File(directory, "img_${System.currentTimeMillis()}.jpg")
        val outputStream = FileOutputStream(file)
        inputStream?.use { input ->
            outputStream.use { output ->
                input.copyTo(output)
            }
        }
        file.absolutePath
    } catch (e: Exception) {
        e.printStackTrace()
        ""
    }
}
