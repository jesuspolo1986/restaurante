package com.example.ui.views

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
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
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.example.data.Category
import com.example.data.Product
import com.example.ui.RestaurantViewModel
import com.example.ui.components.ProductImage

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClientView(
    viewModel: RestaurantViewModel,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val categories by viewModel.categories.collectAsState()
    val products by viewModel.products.collectAsState()
    val cart by viewModel.cart.collectAsState()
    val config by viewModel.config.collectAsState()
    val orders by viewModel.orders.collectAsState()

    var selectedCategoryId by remember { mutableStateOf<Int?>(null) }
    var searchQuery by remember { mutableStateOf("") }
    
    // UI Dialog states
    var expandedProduct by remember { mutableStateOf<Product?>(null) }
    var showCheckoutDialog by remember { mutableStateOf(false) }
    var showWaitingStatusDialog by remember { mutableStateOf(false) }
    var activeWaitingOrderId by remember { mutableStateOf<Long?>(null) }
    var lastSubmittedReference by remember { mutableStateOf("") }
    var showSuccessToast by remember { mutableStateOf(false) }

    val rate = config?.exchangeRateBs ?: 42.5

    // Track real-time status of the active order
    val currentActiveOrder = remember(orders, activeWaitingOrderId) {
        if (activeWaitingOrderId != null) {
            orders.find { it.id.toLong() == activeWaitingOrderId }
        } else null
    }

    val isPagoMovilValidated = remember(currentActiveOrder) {
        currentActiveOrder?.paymentStatus == "PAID" || 
        currentActiveOrder?.status == "PREPARING" || 
        currentActiveOrder?.status == "READY"
    }

    // Filtering logic
    val filteredProducts = remember(products, selectedCategoryId, searchQuery) {
        products.filter { prod ->
            val matchesCategory = selectedCategoryId == null || prod.categoryId == selectedCategoryId
            val matchesSearch = prod.name.contains(searchQuery, ignoreCase = true) || 
                                prod.description.contains(searchQuery, ignoreCase = true)
            matchesCategory && matchesSearch
        }
    }

    Scaffold(
        topBar = {
            Column(
                modifier = Modifier
                    .background(MaterialTheme.colorScheme.surface)
                    .padding(bottom = 8.dp)
            ) {
                // Digital Menu Header
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Menú Digital Auto-servicio",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.ExtraBold,
                            color = MaterialTheme.colorScheme.primary
                        )
                        Text(
                            text = "Toca las fotos para ampliarlas en grande",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    
                    // Live Exchange Rate display
                    Card(
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f)),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text(
                            text = "Tasa: $1 = ${String.format("%.2f", rate)} Bs",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                        )
                    }
                }

                // Active Order Floating Chip Banner if order is being tracked
                if (activeWaitingOrderId != null) {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 4.dp)
                            .clickable { showWaitingStatusDialog = true },
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = if (isPagoMovilValidated) Color(0xFFE8F5E9) else Color(0xFFFFF8E1)
                        ),
                        border = androidx.compose.foundation.BorderStroke(
                            1.dp,
                            if (isPagoMovilValidated) Color(0xFF81C784) else Color(0xFFFFD54F)
                        )
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 12.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Icon(
                                    imageVector = if (isPagoMovilValidated) Icons.Default.CheckCircle else Icons.Default.HourglassTop,
                                    contentDescription = null,
                                    tint = if (isPagoMovilValidated) Color(0xFF2E7D32) else Color(0xFFF57F17),
                                    modifier = Modifier.size(18.dp)
                                )
                                Column {
                                    Text(
                                        text = "Orden #$activeWaitingOrderId",
                                        style = MaterialTheme.typography.labelSmall,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.Gray
                                    )
                                    Text(
                                        text = if (isPagoMovilValidated) "Pago Móvil Validado" else "En espera por confirmar Pago Móvil",
                                        style = MaterialTheme.typography.bodySmall,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = if (isPagoMovilValidated) Color(0xFF1B5E20) else Color(0xFFE65100)
                                    )
                                }
                            }
                            Text(
                                text = "Ver detalles >",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                }

                // Search Bar
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    placeholder = { Text("Buscar plato, bebida, postre...", fontSize = 14.sp) },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, modifier = Modifier.size(18.dp)) },
                    trailingIcon = {
                        if (searchQuery.isNotEmpty()) {
                            IconButton(onClick = { searchQuery = "" }) {
                                Icon(Icons.Default.Clear, contentDescription = "Limpiar", modifier = Modifier.size(16.dp))
                            }
                        }
                    },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                        .height(52.dp)
                )

                Spacer(modifier = Modifier.height(10.dp))

                // Horizontal Categories Scroller
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    contentPadding = PaddingValues(horizontal = 16.dp),
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
                            label = { Text(cat.name) }
                        )
                    }
                }
            }
        },
        modifier = modifier
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            // Products List
            if (filteredProducts.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            imageVector = Icons.Default.SearchOff,
                            contentDescription = "Sin resultados",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.3f),
                            modifier = Modifier.size(64.dp)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            "No encontramos productos disponibles",
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(bottom = 90.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 16.dp, vertical = 10.dp)
                ) {
                    items(filteredProducts, key = { it.id }) { product ->
                        val qty = cart[product] ?: 0
                        val priceBs = product.priceUsd * rate
                        val isOutOfStock = product.stock <= 0

                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { expandedProduct = product },
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                // Product Image with interactive zoom cue
                                Box(
                                    modifier = Modifier
                                        .size(76.dp)
                                        .clip(RoundedCornerShape(12.dp))
                                        .clickable { expandedProduct = product }
                                ) {
                                    ProductImage(
                                        imageUri = product.imageUri,
                                        modifier = Modifier.fillMaxSize()
                                    )
                                    // Subtle zoom overlay hint
                                    Box(
                                        modifier = Modifier
                                            .align(Alignment.BottomEnd)
                                            .background(Color.Black.copy(alpha = 0.5f), RoundedCornerShape(topStart = 8.dp))
                                            .padding(3.dp)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.ZoomIn,
                                            contentDescription = "Ampliar imagen",
                                            tint = Color.White,
                                            modifier = Modifier.size(12.dp)
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.width(14.dp))

                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = product.name,
                                        fontWeight = FontWeight.ExtraBold,
                                        style = MaterialTheme.typography.titleMedium,
                                        modifier = Modifier.clickable { expandedProduct = product }
                                    )
                                    Text(
                                        text = product.description.ifEmpty { "Deliciosa especialidad de la casa preparada al momento." },
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        maxLines = 2,
                                        overflow = TextOverflow.Ellipsis,
                                        modifier = Modifier
                                            .padding(top = 2.dp)
                                            .clickable { expandedProduct = product }
                                    )
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column {
                                            Text(
                                                text = "$${String.format("%.2f", product.priceUsd)}",
                                                fontWeight = FontWeight.Black,
                                                color = MaterialTheme.colorScheme.primary,
                                                style = MaterialTheme.typography.titleMedium
                                            )
                                            Text(
                                                text = "${String.format("%.2f", priceBs)} Bs",
                                                style = MaterialTheme.typography.bodySmall,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                fontWeight = FontWeight.Medium
                                            )
                                        }

                                        // Cart Controls on Card
                                        if (isOutOfStock) {
                                            Box(
                                                modifier = Modifier
                                                    .clip(RoundedCornerShape(8.dp))
                                                    .background(MaterialTheme.colorScheme.error.copy(alpha = 0.1f))
                                                    .padding(horizontal = 8.dp, vertical = 4.dp)
                                            ) {
                                                Text(
                                                    "Agotado",
                                                    color = MaterialTheme.colorScheme.error,
                                                    fontWeight = FontWeight.Bold,
                                                    style = MaterialTheme.typography.bodySmall
                                                )
                                            }
                                        } else if (qty > 0) {
                                            Row(
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                                                modifier = Modifier
                                                    .clip(RoundedCornerShape(8.dp))
                                                    .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.1f))
                                                    .padding(2.dp)
                                            ) {
                                                IconButton(
                                                    onClick = { viewModel.removeFromCart(product) },
                                                    modifier = Modifier.size(28.dp)
                                                ) {
                                                    Icon(Icons.Default.Remove, contentDescription = "Quitar", tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(16.dp))
                                                }
                                                Text(
                                                    text = "$qty",
                                                    fontWeight = FontWeight.ExtraBold,
                                                    color = MaterialTheme.colorScheme.primary,
                                                    style = MaterialTheme.typography.bodyMedium
                                                )
                                                IconButton(
                                                    onClick = { viewModel.addToCart(product) },
                                                    modifier = Modifier.size(28.dp)
                                                ) {
                                                    Icon(Icons.Default.Add, contentDescription = "Agregar", tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(16.dp))
                                                }
                                            }
                                        } else {
                                            Button(
                                                onClick = { viewModel.addToCart(product) },
                                                shape = RoundedCornerShape(8.dp),
                                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                                                modifier = Modifier.height(34.dp)
                                            ) {
                                                Icon(Icons.Default.AddShoppingCart, contentDescription = null, modifier = Modifier.size(14.dp))
                                                Spacer(modifier = Modifier.width(4.dp))
                                                Text("Agregar", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Floating Cart Footer
            val cartItemCount = cart.values.sum()
            val cartTotalUsd = cart.entries.sumOf { it.key.priceUsd * it.value }
            val cartTotalBs = cartTotalUsd * rate

            AnimatedVisibility(
                visible = cartItemCount > 0,
                enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
                exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
                modifier = Modifier.align(Alignment.BottomCenter)
            ) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primary),
                    elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .padding(16.dp)
                            .fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "$cartItemCount " + (if (cartItemCount == 1) "plato seleccionado" else "platos seleccionados"),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.8f),
                                fontWeight = FontWeight.Medium
                            )
                            Text(
                                text = "$${String.format("%.2f", cartTotalUsd)} / ${String.format("%.2f", cartTotalBs)} Bs",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Black,
                                color = MaterialTheme.colorScheme.onPrimary
                            )
                        }

                        Button(
                            onClick = { showCheckoutDialog = true },
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.onPrimary, contentColor = MaterialTheme.colorScheme.primary),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Icon(Icons.Default.ShoppingBasket, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Confirmar Pedido", fontWeight = FontWeight.Black)
                        }
                    }
                }
            }

            // Toast feedback
            AnimatedVisibility(
                visible = showSuccessToast,
                enter = fadeIn() + expandVertically(),
                exit = fadeOut() + shrinkVertically(),
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = 16.dp)
            ) {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF2E7D32)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 20.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color.White)
                        Text(
                            "¡Pedido registrado con éxito!",
                            color = Color.White,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }
    }

    // 1. LIGHTBOX: MODAL DE IMAGEN EXPANDIDA EN PANTALLA COMPLETA
    expandedProduct?.let { product ->
        val priceBs = product.priceUsd * rate
        val categoryName = categories.find { it.id == product.categoryId }?.name ?: "Especialidad"

        Dialog(onDismissRequest = { expandedProduct = null }) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(modifier = Modifier.fillMaxWidth()) {
                    // Header with close button
                    Box(modifier = Modifier.fillMaxWidth()) {
                        // Big expanded image
                        ProductImage(
                            imageUri = product.imageUri,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(260.dp)
                        )
                        IconButton(
                            onClick = { expandedProduct = null },
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .padding(8.dp)
                                .background(Color.Black.copy(alpha = 0.5f), CircleShape)
                        ) {
                            Icon(Icons.Default.Close, contentDescription = "Cerrar", tint = Color.White)
                        }
                    }

                    Column(modifier = Modifier.padding(20.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.Top
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = product.name,
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Black
                                )
                                Surface(
                                    color = MaterialTheme.colorScheme.primaryContainer,
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.padding(top = 4.dp)
                                ) {
                                    Text(
                                        text = categoryName,
                                        style = MaterialTheme.typography.labelSmall,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                                    )
                                }
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text(
                                    text = "$${String.format("%.2f", product.priceUsd)}",
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Black,
                                    color = MaterialTheme.colorScheme.primary
                                )
                                Text(
                                    text = "${String.format("%.2f", priceBs)} Bs",
                                    style = MaterialTheme.typography.bodySmall,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.secondary
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = product.description.ifEmpty { "Deliciosa especialidad elaborada artesanalmente con ingredientes frescos y sazón criolla tradicional." },
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            lineHeight = 20.sp
                        )

                        Spacer(modifier = Modifier.height(12.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Disponibilidad en cocina:", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                            Text(
                                text = if (product.stock > 0) "${product.stock} disponibles" else "Agotado",
                                fontWeight = FontWeight.Bold,
                                color = if (product.stock > 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error,
                                style = MaterialTheme.typography.bodySmall
                            )
                        }

                        Spacer(modifier = Modifier.height(20.dp))

                        // Actions: Continuar en el Menú vs Agregar
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            OutlinedButton(
                                onClick = { expandedProduct = null },
                                modifier = Modifier
                                    .weight(1f)
                                    .height(48.dp),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Text("Continuar en Menú", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            }

                            Button(
                                onClick = {
                                    viewModel.addToCart(product)
                                    expandedProduct = null
                                },
                                enabled = product.stock > 0,
                                modifier = Modifier
                                    .weight(1f)
                                    .height(48.dp),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                            ) {
                                Icon(Icons.Default.AddShoppingCart, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Agregar al Pedido", fontWeight = FontWeight.Black, fontSize = 12.sp)
                            }
                        }
                    }
                }
            }
        }
    }

    // 2. MODAL DE CONFIRMACIÓN DE PEDIDO vs CONTINUAR PIDIENDO
    if (showCheckoutDialog) {
        var orderType by remember { mutableStateOf("DINE_IN") } // "DINE_IN", "TAKEAWAY"
        var tableNumber by remember { mutableStateOf("") }
        var paymentMethod by remember { mutableStateOf("Pago Móvil") }
        val paymentMethods = listOf("Pago Móvil", "Efectivo Bs", "Punto de Venta", "Efectivo $", "Zelle", "Crédito")
        var expandedPaymentDropdown by remember { mutableStateOf(false) }
        var paymentRefInput by remember { mutableStateOf("") }
        var notes by remember { mutableStateOf("") }
        var tableError by remember { mutableStateOf(false) }
        var refError by remember { mutableStateOf(false) }

        val totalUsd = cart.entries.sumOf { it.key.priceUsd * it.value }
        val totalBs = totalUsd * rate
        val isPagoMovil = paymentMethod == "Pago Móvil" || paymentMethod.contains("Pago", ignoreCase = true)

        Dialog(onDismissRequest = { showCheckoutDialog = false }) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                shape = RoundedCornerShape(22.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                LazyColumn(
                    modifier = Modifier
                        .padding(20.dp)
                        .fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    "Confirmar tu Pedido",
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Black
                                )
                                Text(
                                    "Revisa tus platos antes de enviar",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            IconButton(onClick = { showCheckoutDialog = false }) {
                                Icon(Icons.Default.Close, contentDescription = "Cerrar")
                            }
                        }
                    }

                    // Desglose de Platos
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.25f)),
                            shape = RoundedCornerShape(14.dp)
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Text(
                                    "Platos en tu Orden (${cart.values.sum()} items):",
                                    fontWeight = FontWeight.Bold,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.primary
                                )
                                Spacer(modifier = Modifier.height(6.dp))
                                cart.forEach { entry ->
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(vertical = 2.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text(
                                            "${entry.value}x ${entry.key.name}",
                                            style = MaterialTheme.typography.bodySmall,
                                            fontWeight = FontWeight.SemiBold
                                        )
                                        Text(
                                            "$${String.format("%.2f", entry.key.priceUsd * entry.value)}",
                                            style = MaterialTheme.typography.bodySmall,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // Ubicación: Mesa vs Para Llevar
                    item {
                        Text(
                            text = "¿Dónde comerás?",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Button(
                                onClick = { orderType = "DINE_IN" },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (orderType == "DINE_IN") MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
                                    contentColor = if (orderType == "DINE_IN") MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            ) {
                                Icon(Icons.Default.Restaurant, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("En Mesa", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                            Button(
                                onClick = { 
                                    orderType = "TAKEAWAY"
                                    tableError = false
                                },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (orderType == "TAKEAWAY") MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
                                    contentColor = if (orderType == "TAKEAWAY") MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            ) {
                                Icon(Icons.Default.TakeoutDining, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Para Llevar", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }

                    // Número de Mesa si es DINE_IN
                    if (orderType == "DINE_IN") {
                        item {
                            OutlinedTextField(
                                value = tableNumber,
                                onValueChange = { 
                                    tableNumber = it
                                    if (it.isNotBlank()) tableError = false
                                },
                                label = { Text("Número de Mesa *") },
                                placeholder = { Text("Ej: Mesa 4") },
                                isError = tableError,
                                supportingText = if (tableError) { { Text("Ingresa tu número de mesa para llevar el pedido", color = MaterialTheme.colorScheme.error) } } else null,
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }

                    // Selector de Método de Pago
                    item {
                        ExposedDropdownMenuBox(
                            expanded = expandedPaymentDropdown,
                            onExpandedChange = { expandedPaymentDropdown = !expandedPaymentDropdown }
                        ) {
                            OutlinedTextField(
                                value = paymentMethod,
                                onValueChange = {},
                                readOnly = true,
                                label = { Text("Método de Pago") },
                                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedPaymentDropdown) },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .menuAnchor()
                            )
                            ExposedDropdownMenu(
                                expanded = expandedPaymentDropdown,
                                onDismissRequest = { expandedPaymentDropdown = false }
                            ) {
                                paymentMethods.forEach { method ->
                                    DropdownMenuItem(
                                        text = { Text(method) },
                                        onClick = {
                                            paymentMethod = method
                                            expandedPaymentDropdown = false
                                        }
                                    )
                                }
                            }
                        }
                    }

                    // BLOQUE INTERACTIVO DE PAGO MÓVIL: DATOS BANCARIOS Y REFERENCIA
                    if (isPagoMovil) {
                        item {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.25f)),
                                border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.3f))
                            ) {
                                Column(
                                    modifier = Modifier.padding(14.dp),
                                    verticalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                            Icon(Icons.Default.AccountBalance, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(18.dp))
                                            Text("Datos para Pago Móvil", fontWeight = FontWeight.Black, style = MaterialTheme.typography.titleSmall)
                                        }
                                        Button(
                                            onClick = {
                                                val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                                val clip = ClipData.newPlainText(
                                                    "Pago Móvil",
                                                    "PAGO MÓVIL:\nBanco: Banesco\nTeléfono: 0414-1234567\nCédula/RIF: V-12345678\nTitular: Restaurante Local C.A.\nMonto: ${String.format("%.2f", totalBs)} Bs"
                                                )
                                                clipboard.setPrimaryClip(clip)
                                                Toast.makeText(context, "¡Datos copiados al portapapeles!", Toast.LENGTH_SHORT).show()
                                            },
                                            shape = RoundedCornerShape(8.dp),
                                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                                            modifier = Modifier.height(30.dp)
                                        ) {
                                            Icon(Icons.Default.ContentCopy, contentDescription = null, modifier = Modifier.size(12.dp))
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Text("Copiar Datos", fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                        }
                                    }

                                    // Bank detail labels
                                    Column(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(10.dp))
                                            .padding(10.dp),
                                        verticalArrangement = Arrangement.spacedBy(4.dp)
                                    ) {
                                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                            Text("Banco:", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                                            Text("Banesco", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodySmall)
                                        }
                                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                            Text("Teléfono:", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                                            Text("0414-1234567", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodySmall, fontFamily = FontFamily.Monospace)
                                        }
                                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                            Text("Cédula / RIF:", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                                            Text("V-12345678", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodySmall, fontFamily = FontFamily.Monospace)
                                        }
                                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                            Text("Titular:", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                                            Text("Restaurante Local C.A.", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodySmall)
                                        }
                                        HorizontalDivider(color = Color.LightGray.copy(alpha = 0.4f), modifier = Modifier.padding(vertical = 2.dp))
                                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                            Text("Monto a transferir:", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold)
                                            Text("${String.format("%.2f", totalBs)} Bs", fontWeight = FontWeight.Black, color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.bodyMedium)
                                        }
                                    }

                                    // Payment Reference Input Field
                                    OutlinedTextField(
                                        value = paymentRefInput,
                                        onValueChange = { 
                                            paymentRefInput = it
                                            if (it.isNotBlank()) refError = false
                                        },
                                        label = { Text("Número de Referencia de Pago Móvil *") },
                                        placeholder = { Text("Ej: 123456 (últimos dígitos)") },
                                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                        isError = refError,
                                        supportingText = if (refError) { { Text("Ingresa la referencia para que el cajero valide tu pago", color = MaterialTheme.colorScheme.error) } } else null,
                                        singleLine = true,
                                        modifier = Modifier.fillMaxWidth()
                                    )
                                }
                            }
                        }
                    }

                    // Notas para la cocina
                    item {
                        OutlinedTextField(
                            value = notes,
                            onValueChange = { notes = it },
                            label = { Text("Notas especiales para cocina") },
                            placeholder = { Text("Ej: sin cebolla, salsa aparte...") },
                            maxLines = 2,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    // Resumen Total
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f))
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text("Total USD:", style = MaterialTheme.typography.bodyMedium)
                                    Text("$${String.format("%.2f", totalUsd)}", fontWeight = FontWeight.Bold)
                                }
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(top = 4.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text("Total en Bolívares (Bs):", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                                    Text("${String.format("%.2f", totalBs)} Bs", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Black, color = MaterialTheme.colorScheme.primary)
                                }
                            }
                        }
                    }

                    // DOS BOTONES EXPLÍCITOS: CONTINUAR PIDIENDO vs CONFIRMAR Y ENVIAR
                    item {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                            Button(
                                onClick = {
                                    if (orderType == "DINE_IN" && tableNumber.isBlank()) {
                                        tableError = true
                                        return@Button
                                    }
                                    if (isPagoMovil && paymentRefInput.isBlank()) {
                                        refError = true
                                        return@Button
                                    }

                                    val finalPaymentMethod = if (isPagoMovil && paymentRefInput.isNotBlank()) {
                                        "Pago Móvil (Ref: ${paymentRefInput.trim()})"
                                    } else {
                                        paymentMethod
                                    }

                                    val finalNotes = if (isPagoMovil && paymentRefInput.isNotBlank()) {
                                        if (notes.isNotBlank()) "$notes | Ref Pago: ${paymentRefInput.trim()}" else "Ref Pago: ${paymentRefInput.trim()}"
                                    } else {
                                        notes
                                    }

                                    lastSubmittedReference = paymentRefInput.trim()

                                    viewModel.placeLocalOrder(
                                        tableNumber = tableNumber.trim(),
                                        orderType = orderType,
                                        paymentMethod = finalPaymentMethod,
                                        paymentStatus = if (isPagoMovil) "PENDING_CONFIRMATION" else "UNPAID",
                                        notes = finalNotes,
                                        onSuccess = { createdOrderId ->
                                            showCheckoutDialog = false
                                            if (isPagoMovil) {
                                                activeWaitingOrderId = createdOrderId
                                                showWaitingStatusDialog = true
                                            } else {
                                                showSuccessToast = true
                                                android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                                                    showSuccessToast = false
                                                }, 3000)
                                            }
                                        }
                                    )
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(50.dp),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                            ) {
                                Icon(Icons.Default.Send, contentDescription = null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("CONFIRMAR Y ENVIAR PEDIDO", fontWeight = FontWeight.Black)
                            }

                            OutlinedButton(
                                onClick = { showCheckoutDialog = false },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(46.dp),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Icon(Icons.Default.ArrowBack, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Continuar Pidiendo (Volver al Menú)", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
    }

    // 3. MODAL DE ESTADO EN TIEMPO REAL: ESPERA POR CONFIRMAR / PAGO MÓVIL VALIDADO
    if (showWaitingStatusDialog && activeWaitingOrderId != null) {
        Dialog(onDismissRequest = { showWaitingStatusDialog = false }) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(
                    modifier = Modifier
                        .padding(24.dp)
                        .fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    if (isPagoMovilValidated) {
                        // Estado Validado
                        Box(
                            modifier = Modifier
                                .size(72.dp)
                                .background(Color(0xFFE8F5E9), CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.CheckCircle,
                                contentDescription = null,
                                tint = Color(0xFF2E7D32),
                                modifier = Modifier.size(48.dp)
                            )
                        }

                        Surface(
                            color = Color(0xFFE8F5E9),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text(
                                text = "VERIFICACIÓN COMPLETADA",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Black,
                                color = Color(0xFF1B5E20),
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                            )
                        }

                        Text(
                            text = "Pago Móvil Validado",
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Black,
                            color = Color(0xFF1B5E20),
                            textAlign = TextAlign.Center
                        )

                        Text(
                            text = "¡Tu pago móvil ha sido validado con éxito por administración! Tu pedido #$activeWaitingOrderId ya está en preparación en cocina.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center
                        )

                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFE8F5E9).copy(alpha = 0.5f)),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.Center
                            ) {
                                Icon(Icons.Default.OutdoorGrill, contentDescription = null, tint = Color(0xFF2E7D32))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Cocina preparando tu orden", fontWeight = FontWeight.Bold, color = Color(0xFF1B5E20))
                            }
                        }

                        Button(
                            onClick = { showWaitingStatusDialog = false },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                        ) {
                            Text("Continuar Pidiendo / Menú", fontWeight = FontWeight.Black)
                        }

                    } else {
                        // Estado en espera
                        Box(
                            modifier = Modifier
                                .size(72.dp)
                                .background(Color(0xFFFFF8E1), CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.HourglassTop,
                                contentDescription = null,
                                tint = Color(0xFFF57F17),
                                modifier = Modifier.size(44.dp)
                            )
                        }

                        Surface(
                            color = Color(0xFFFFF8E1),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text(
                                text = "VERIFICACIÓN EN CURSO",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Black,
                                color = Color(0xFFE65100),
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                            )
                        }

                        Text(
                            text = "En espera por confirmar Pago Móvil",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Black,
                            textAlign = TextAlign.Center
                        )

                        Text(
                            text = "Hemos recibido tu orden y comprobante de pago. El administrador está validando la transferencia en este momento.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center
                        )

                        // Order card details
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Column(
                                modifier = Modifier.padding(12.dp),
                                verticalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Número de Orden:", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                                    Text("#$activeWaitingOrderId", fontWeight = FontWeight.Black, style = MaterialTheme.typography.bodySmall)
                                }
                                if (lastSubmittedReference.isNotBlank()) {
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text("Referencia enviada:", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                                        Text(lastSubmittedReference, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace, style = MaterialTheme.typography.bodySmall)
                                    }
                                }
                                currentActiveOrder?.let { o ->
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text("Monto:", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                                        Text("${String.format("%.2f", o.totalUsd * rate)} Bs", fontWeight = FontWeight.Black, color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.bodySmall)
                                    }
                                }
                            }
                        }

                        Text(
                            text = "Esta pantalla se actualizará a Pago Móvil Validado automáticamente cuando el administrador lo apruebe.",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color.Gray,
                            textAlign = TextAlign.Center
                        )

                        Button(
                            onClick = { showWaitingStatusDialog = false },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                        ) {
                            Icon(Icons.Default.RestaurantMenu, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Continuar Pidiendo en el Menú", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}
