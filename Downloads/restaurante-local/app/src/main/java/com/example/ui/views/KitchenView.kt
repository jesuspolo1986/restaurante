package com.example.ui.views

import android.media.AudioManager
import android.media.ToneGenerator
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.*
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.Order
import com.example.ui.RestaurantViewModel
import java.text.SimpleDateFormat
import java.util.*
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun KitchenView(
    viewModel: RestaurantViewModel,
    modifier: Modifier = Modifier
) {
    val scope = rememberCoroutineScope()
    val orders by viewModel.orders.collectAsState()
    val kitchenOrders = remember(orders) {
        orders.filter { it.status == "PREPARING" || it.status == "CONFIRMED" }
    }

    var previousOrderIds by remember { mutableStateOf(emptySet<Int>()) }
    var activeNotification by remember { mutableStateOf<Order?>(null) }
    var notificationProgress by remember { mutableStateOf(1f) }
    var notificationItemsText by remember { mutableStateOf("") }
    val processingOrderIds = remember { mutableStateListOf<Int>() }

    var isInitialLoading by remember { mutableStateOf(true) }
    LaunchedEffect(Unit) {
        delay(1000)
        isInitialLoading = false
    }

    LaunchedEffect(kitchenOrders) {
        val currentIds = kitchenOrders.map { it.id }.toSet()
        val newIds = currentIds.filter { it !in previousOrderIds }
        if (newIds.isNotEmpty() && previousOrderIds.isNotEmpty()) {
            val newestId = newIds.last()
            val newestOrder = kitchenOrders.find { it.id == newestId }
            if (newestOrder != null) {
                try {
                    val toneGen = ToneGenerator(AudioManager.STREAM_MUSIC, 100)
                    toneGen.startTone(ToneGenerator.TONE_CDMA_ALERT_CALL_GUARD, 350)
                } catch (e: Exception) {
                    // Ignore if tone generation fails
                }
                activeNotification = newestOrder
            }
        }
        previousOrderIds = currentIds
    }

    LaunchedEffect(activeNotification) {
        if (activeNotification != null) {
            val orderId = activeNotification!!.id
            try {
                val orderItems = viewModel.getItemsForOrder(orderId).first()
                notificationItemsText = orderItems.joinToString(", ") { "${it.quantity}x ${it.productName}" }
            } catch (e: Exception) {
                notificationItemsText = "Nuevo pedido recibido"
            }

            // Smooth progress countdown over 5 seconds
            val duration = 5000L
            val step = 50L
            val totalSteps = duration / step
            for (i in 0..totalSteps) {
                notificationProgress = 1f - (i.toFloat() / totalSteps)
                delay(step)
            }
            activeNotification = null
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        if (isInitialLoading) {
            KitchenLoadingSkeleton()
        } else {
            Column(
                modifier = modifier
                    .fillMaxSize()
                    .background(Color(0xFF121212)) // Professional KDS Dark Background
                    .padding(16.dp)
            ) {
                // KDS Header
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Pantalla de Cocina (KDS)",
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.ExtraBold,
                            color = Color.White
                        )
                        Text(
                            text = "Monitoreo de pedidos pendientes en tiempo real",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color.LightGray
                        )
                    }
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF00796B))
                    ) {
                        Text(
                            text = "PENDIENTES: ${kitchenOrders.size}",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                        )
                    }
                }

                if (kitchenOrders.isEmpty()) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .weight(1f),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                imageVector = Icons.Default.CheckCircle,
                                contentDescription = "Todo preparado",
                                tint = Color(0xFF4CAF50),
                                modifier = Modifier.size(80.dp)
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                text = "¡Cocina al Día!",
                                style = MaterialTheme.typography.headlineSmall,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            Text(
                                text = "No hay órdenes pendientes en este momento",
                                style = MaterialTheme.typography.bodyMedium,
                                color = Color.Gray
                            )
                        }
                    }
                } else {
                    LazyVerticalGrid(
                        columns = GridCells.Adaptive(minSize = 300.dp),
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                        modifier = Modifier
                            .fillMaxSize()
                            .weight(1f)
                    ) {
                        items(kitchenOrders, key = { it.id }) { order ->
                            KitchenOrderCard(
                                order = order,
                                viewModel = viewModel,
                                isProcessing = order.id in processingOrderIds,
                                onCompleteClick = {
                                    scope.launch {
                                        processingOrderIds.add(order.id)
                                        viewModel.updateOrderStatus(order.id, "READY")
                                        delay(500) // smooth delay for exit transition
                                        processingOrderIds.remove(order.id)
                                    }
                                }
                            )
                        }
                    }
                }
            }
        }

        // Floating Notification overlay with enter/exit slide + fade
        AnimatedVisibility(
            visible = activeNotification != null,
            enter = slideInVertically(initialOffsetY = { -it }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { -it }) + fadeOut(),
            modifier = Modifier
                .align(Alignment.TopCenter)
                .padding(16.dp)
        ) {
            activeNotification?.let { order ->
                NewOrderNotificationBanner(
                    order = order,
                    itemsText = notificationItemsText,
                    progress = notificationProgress,
                    onDismiss = { activeNotification = null }
                )
            }
        }
    }
}

@Composable
fun KitchenLoadingSkeleton() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF121212))
            .padding(16.dp)
    ) {
        // Skeleton Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Box(
                    modifier = Modifier
                        .width(220.dp)
                        .height(32.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color.White.copy(alpha = 0.05f))
                )
                Spacer(modifier = Modifier.height(8.dp))
                Box(
                    modifier = Modifier
                        .width(180.dp)
                        .height(16.dp)
                        .clip(RoundedCornerShape(4.dp))
                        .background(Color.White.copy(alpha = 0.05f))
                )
            }
            Box(
                modifier = Modifier
                    .width(130.dp)
                    .height(40.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color.White.copy(alpha = 0.05f))
            )
        }

        // Grid of Skeleton cards
        LazyVerticalGrid(
            columns = GridCells.Adaptive(minSize = 300.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            items(6) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E))
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Box(
                                modifier = Modifier
                                    .width(100.dp)
                                    .height(24.dp)
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(Color.White.copy(alpha = 0.05f))
                            )
                            Box(
                                modifier = Modifier
                                    .width(80.dp)
                                    .height(20.dp)
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(Color.White.copy(alpha = 0.05f))
                            )
                        }
                        Spacer(modifier = Modifier.height(16.dp))
                        repeat(3) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(24.dp)
                                        .clip(RoundedCornerShape(4.dp))
                                        .background(Color.White.copy(alpha = 0.05f))
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth(0.7f)
                                        .height(18.dp)
                                        .clip(RoundedCornerShape(4.dp))
                                        .background(Color.White.copy(alpha = 0.05f))
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(20.dp))
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(Color.White.copy(alpha = 0.05f))
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun NewOrderNotificationBanner(
    order: Order,
    itemsText: String,
    progress: Float,
    onDismiss: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 8.dp, vertical = 4.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = Color(0xFF1B5E20) // Deep lush KDS Green
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.NotificationsActive,
                        contentDescription = null,
                        tint = Color(0xFFFFD54F),
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = "¡NUEVA ORDEN RECIBIDA!",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.ExtraBold,
                            color = Color.White
                        )
                        Text(
                            text = "Para: ${order.tableNumber.uppercase()}",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Bold,
                            color = Color.White.copy(alpha = 0.9f)
                        )
                    }
                }
                
                IconButton(onClick = onDismiss) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Cerrar",
                        tint = Color.White
                    )
                }
            }
            
            if (itemsText.isNotEmpty()) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = itemsText,
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.White.copy(alpha = 0.8f),
                    maxLines = 2,
                    fontWeight = FontWeight.Medium
                )
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            LinearProgressIndicator(
                progress = { progress },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(4.dp)
                    .clip(RoundedCornerShape(2.dp)),
                color = Color(0xFFFFD54F),
                trackColor = Color.White.copy(alpha = 0.2f)
            )
        }
    }
}

@Composable
fun KitchenOrderCard(
    order: Order,
    viewModel: RestaurantViewModel,
    isProcessing: Boolean,
    onCompleteClick: () -> Unit
) {
    val items by viewModel.getItemsForOrder(order.id).collectAsState(initial = emptyList())
    
    val timeElapsed = remember(order.timestamp) {
        val diffMs = System.currentTimeMillis() - order.timestamp
        val diffMins = diffMs / 1000 / 60
        if (diffMins <= 0) "Hace un momento" else "Hace $diffMins min"
    }

    val isAlertTime = remember(order.timestamp) {
        val diffMs = System.currentTimeMillis() - order.timestamp
        diffMs > 10 * 60 * 1000 // Flag orders pending more than 10 mins in red
    }

    val isFresh = remember(order.timestamp) {
        System.currentTimeMillis() - order.timestamp < 60 * 1000
    }

    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val borderAlpha by infiniteTransition.animateFloat(
        initialValue = 0.2f,
        targetValue = 1.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "alpha"
    )

    val cardAlpha by animateFloatAsState(
        targetValue = if (isProcessing) 0.3f else 1.0f,
        animationSpec = tween(durationMillis = 500),
        label = "cardAlpha"
    )

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .alpha(cardAlpha)
            .then(
                if (isFresh) {
                    Modifier.border(
                        width = 2.dp,
                        color = Color(0xFFFF9100).copy(alpha = borderAlpha),
                        shape = RoundedCornerShape(16.dp)
                    )
                } else Modifier
            ),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isFresh) Color(0xFF251E1C) else Color(0xFF1E1E1E) // Premium dark slate card with subtle highlight if fresh
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            if (isFresh) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 12.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color(0xFFFF9100).copy(alpha = 0.15f * borderAlpha))
                        .padding(vertical = 4.dp, horizontal = 8.dp),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Restaurant,
                        contentDescription = null,
                        tint = Color(0xFFFF9100),
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "¡NUEVO PEDIDO RECIBIDO!",
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.ExtraBold,
                        color = Color(0xFFFF9100),
                        letterSpacing = 1.sp
                    )
                }
            }

            // Card Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = order.tableNumber.uppercase(),
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Black,
                    color = if (order.orderType == "TAKEAWAY") Color(0xFFFFB300) else Color(0xFF26A69A),
                    fontSize = 22.sp
                )

                // Elapsed Timer Badge
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(if (isAlertTime) Color(0xFFD32F2F).copy(alpha = 0.2f) else Color.White.copy(alpha = 0.05f))
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Timer,
                        contentDescription = "Tiempo",
                        tint = if (isAlertTime) Color(0xFFE53935) else Color.LightGray,
                        modifier = Modifier.size(14.dp)
                    )
                    Text(
                        text = timeElapsed,
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = if (isAlertTime) Color(0xFFE53935) else Color.LightGray
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))
            Divider(color = Color.White.copy(alpha = 0.08f))
            Spacer(modifier = Modifier.height(12.dp))

            // Large typography itemized list
            Column(
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.weight(1f, fill = false)
            ) {
                items.forEach { item ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // High-contrast quantity circle
                        Box(
                            contentAlignment = Alignment.Center,
                            modifier = Modifier
                                .size(32.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(Color(0xFFFF6F00).copy(alpha = 0.15f))
                        ) {
                            Text(
                                text = "${item.quantity}",
                                style = MaterialTheme.typography.bodyLarge,
                                fontWeight = FontWeight.Black,
                                color = Color(0xFFFF8F00),
                                fontSize = 18.sp
                            )
                        }
                        
                        Spacer(modifier = Modifier.width(12.dp))

                        Text(
                            text = item.productName,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            fontSize = 18.sp
                        )
                    }
                }
            }

            // Client special instructions
            if (order.notes.isNotEmpty()) {
                Spacer(modifier = Modifier.height(16.dp))
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color(0xFFE53935).copy(alpha = 0.06f))
                        .padding(10.dp)
                ) {
                    Column {
                        Text(
                            "INSTRUCCIONES:",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Black,
                            color = Color(0xFFEF5350)
                        )
                        Text(
                            text = order.notes,
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Medium,
                            color = Color.White
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
            Divider(color = Color.White.copy(alpha = 0.08f))
            Spacer(modifier = Modifier.height(16.dp))

            // Large Ready Action Button
            Button(
                onClick = onCompleteClick,
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (isProcessing) Color(0xFF1B5E20) else Color(0xFF2E7D32)
                ),
                shape = RoundedCornerShape(12.dp),
                enabled = !isProcessing,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp)
            ) {
                if (isProcessing) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = Color.White,
                        strokeWidth = 2.5.dp
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "COMPLETANDO...",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Black,
                        color = Color.White,
                        letterSpacing = 1.2.sp
                    )
                } else {
                    Icon(
                        imageVector = Icons.Default.Restaurant,
                        contentDescription = null,
                        tint = Color.White
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "PEDIDO LISTO",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Black,
                        color = Color.White,
                        letterSpacing = 1.2.sp
                    )
                }
            }
        }
    }
}
