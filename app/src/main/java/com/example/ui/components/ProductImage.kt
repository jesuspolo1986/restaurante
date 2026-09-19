package com.example.ui.components

import android.graphics.BitmapFactory
import android.util.Base64
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp

@Composable
fun ProductImage(
    imageUri: String,
    modifier: Modifier = Modifier
) {
    val isBase64 = imageUri.startsWith("data:image")
    if (isBase64) {
        val base64String = try {
            imageUri.substringAfter("base64,")
        } catch (e: Exception) {
            ""
        }
        val bitmap = try {
            val decodedBytes = Base64.decode(base64String, Base64.DEFAULT)
            BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)
        } catch (e: Exception) {
            null
        }

        if (bitmap != null) {
            Image(
                bitmap = bitmap.asImageBitmap(),
                contentDescription = "Foto del plato",
                contentScale = ContentScale.Crop,
                modifier = modifier
                    .clip(RoundedCornerShape(12.dp))
            )
            return
        }
    }

    // Support local persisted files
    if (imageUri.isNotEmpty() && !isBase64 && (imageUri.startsWith("/") || imageUri.contains("product_images"))) {
        val file = java.io.File(imageUri)
        if (file.exists()) {
            val bitmap = try {
                BitmapFactory.decodeFile(file.absolutePath)
            } catch (e: Exception) {
                null
            }
            if (bitmap != null) {
                Image(
                    bitmap = bitmap.asImageBitmap(),
                    contentDescription = "Foto del plato",
                    contentScale = ContentScale.Crop,
                    modifier = modifier
                        .clip(RoundedCornerShape(12.dp))
                )
                return
            }
        }
    }

    val (brush, icon) = getVisualAsset(imageUri)

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(brush),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = icon,
            contentDescription = "Imagen de plato",
            tint = Color.White,
            modifier = Modifier.fillMaxSize(0.55f)
        )
    }
}

private fun getVisualAsset(imageUri: String): Pair<Brush, ImageVector> {
    val cleanUri = imageUri.lowercase().trim()
    
    val brush = when {
        cleanUri.contains("pabellon") || cleanUri.contains("plato") -> {
            Brush.linearGradient(listOf(Color(0xFFE65100), Color(0xFFFF8F00)))
        }
        cleanUri.contains("asado") || cleanUri.contains("carne") -> {
            Brush.linearGradient(listOf(Color(0xFF3E2723), Color(0xFFD84315)))
        }
        cleanUri.contains("arepa") || cleanUri.contains("pan") -> {
            Brush.linearGradient(listOf(Color(0xFFFBC02D), Color(0xFFFFA000)))
        }
        cleanUri.contains("tequeno") || cleanUri.contains("queso") -> {
            Brush.linearGradient(listOf(Color(0xFFFFB300), Color(0xFFFF6F00)))
        }
        cleanUri.contains("empanada") || cleanUri.contains("pastel") -> {
            Brush.linearGradient(listOf(Color(0xFFF57C00), Color(0xFFFFD54F)))
        }
        cleanUri.contains("chicha") || cleanUri.contains("leche") -> {
            Brush.linearGradient(listOf(Color(0xFFE0F7FA), Color(0xFFB2EBF2)))
        }
        cleanUri.contains("papelon") || cleanUri.contains("limon") -> {
            Brush.linearGradient(listOf(Color(0xFF2E7D32), Color(0xFF81C784)))
        }
        cleanUri.contains("quesillo") || cleanUri.contains("flan") -> {
            Brush.linearGradient(listOf(Color(0xFF8D6E63), Color(0xFFFFB74D)))
        }
        cleanUri.contains("tresleches") || cleanUri.contains("torta") || cleanUri.contains("cake") -> {
            Brush.linearGradient(listOf(Color(0xFFEC407A), Color(0xFFF8BBD0)))
        }
        cleanUri.contains("bebida") || cleanUri.contains("refresco") || cleanUri.contains("cola") -> {
            Brush.linearGradient(listOf(Color(0xFFC62828), Color(0xFFE53935)))
        }
        cleanUri.contains("burger") || cleanUri.contains("fastfood") -> {
            Brush.linearGradient(listOf(Color(0xFFD84315), Color(0xFFFFB300)))
        }
        cleanUri.contains("pizza") -> {
            Brush.linearGradient(listOf(Color(0xFFC62828), Color(0xFFFF8F00)))
        }
        cleanUri.contains("cafe") || cleanUri.contains("coffee") -> {
            Brush.linearGradient(listOf(Color(0xFF4E342E), Color(0xFF8D6E63)))
        }
        else -> {
            Brush.linearGradient(listOf(Color(0xFF78909C), Color(0xFFCFD8DC)))
        }
    }

    val icon = when {
        cleanUri.contains("pabellon") || cleanUri.contains("plato") -> Icons.Default.Restaurant
        cleanUri.contains("asado") || cleanUri.contains("carne") -> Icons.Default.OutdoorGrill
        cleanUri.contains("arepa") || cleanUri.contains("pan") -> Icons.Default.BakeryDining
        cleanUri.contains("tequeno") || cleanUri.contains("queso") -> Icons.Default.BreakfastDining
        cleanUri.contains("empanada") || cleanUri.contains("pastel") -> Icons.Default.LunchDining
        cleanUri.contains("chicha") || cleanUri.contains("leche") -> Icons.Default.LocalBar
        cleanUri.contains("papelon") || cleanUri.contains("limon") -> Icons.Default.LocalCafe
        cleanUri.contains("quesillo") || cleanUri.contains("flan") -> Icons.Default.Cake
        cleanUri.contains("tresleches") || cleanUri.contains("torta") || cleanUri.contains("cake") -> Icons.Default.Icecream
        cleanUri.contains("bebida") || cleanUri.contains("refresco") || cleanUri.contains("cola") -> Icons.Default.SportsBar
        cleanUri.contains("burger") || cleanUri.contains("fastfood") -> Icons.Default.Fastfood
        cleanUri.contains("pizza") -> Icons.Default.LocalPizza
        cleanUri.contains("cafe") || cleanUri.contains("coffee") -> Icons.Default.Coffee
        else -> Icons.Default.RestaurantMenu
    }

    return Pair(brush, icon)
}
