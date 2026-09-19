package com.example.ui.views

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.RestaurantViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AuthView(
    viewModel: RestaurantViewModel,
    modifier: Modifier = Modifier
) {
    val authState by viewModel.authState.collectAsState()
    val focusManager = LocalFocusManager.current

    var isLoginMode by remember { mutableStateOf(true) }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var selectedRole by remember { mutableStateOf("CLIENT") } // "ADMIN", "KITCHEN", "CLIENT"
    var isPasswordVisible by remember { mutableStateOf(false) }

    var errorMessage by remember { mutableStateOf<String?>(null) }
    var isLoading by remember { mutableStateOf(false) }

    // Clear error message when switching mode
    LaunchedEffect(isLoginMode) {
        errorMessage = null
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFF0F172A), // Slate 900
                        Color(0xFF020617)  // Slate 950
                    )
                )
            )
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .widthIn(max = 450.dp)
                .windowInsetsPadding(WindowInsets.safeDrawing),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // App Branding Header
            Icon(
                imageOf(selectedRole),
                contentDescription = "GastroLocal Logo",
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier
                    .size(72.dp)
                    .background(
                        color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.2f),
                        shape = RoundedCornerShape(20.dp)
                    )
                    .padding(16.dp)
            )

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "GastroLocal",
                style = MaterialTheme.typography.headlineLarge.copy(
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = (-1).sp
                ),
                color = Color.White,
                textAlign = TextAlign.Center
            )

            Text(
                text = "Sistema de Gestión Gastronómica con Roles",
                style = MaterialTheme.typography.bodyMedium,
                color = Color(0xFF94A3B8), // Slate 400
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 4.dp, bottom = 24.dp)
            )

            // Form Card
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("auth_card"),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(
                    containerColor = Color(0xFF1E293B) // Slate 800
                ),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp)
                ) {
                    Text(
                        text = if (isLoginMode) "Iniciar Sesión" else "Crear Cuenta",
                        style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                        color = Color.White,
                        modifier = Modifier.padding(bottom = 16.dp)
                    )

                    // Error Box if any
                    errorMessage?.let { error ->
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 16.dp)
                                .background(
                                    color = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.2f),
                                    shape = RoundedCornerShape(12.dp)
                                )
                                .border(
                                    width = 1.dp,
                                    color = MaterialTheme.colorScheme.error.copy(alpha = 0.5f),
                                    shape = RoundedCornerShape(12.dp)
                                )
                                .padding(12.dp)
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.Error,
                                    contentDescription = "Error",
                                    tint = MaterialTheme.colorScheme.error
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = error,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onErrorContainer
                                )
                            }
                        }
                    }

                    // Email Field
                    OutlinedTextField(
                        value = email,
                        onValueChange = { email = it },
                        label = { Text("Correo Electrónico") },
                        placeholder = { Text("ejemplo@gastro.com") },
                        singleLine = true,
                        leadingIcon = {
                            Icon(Icons.Default.Email, contentDescription = "Email Icon", tint = Color(0xFF64748B))
                        },
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Email,
                            imeAction = ImeAction.Next
                        ),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedBorderColor = MaterialTheme.colorScheme.primary,
                            unfocusedBorderColor = Color(0xFF475569),
                            focusedLabelColor = MaterialTheme.colorScheme.primary,
                            unfocusedLabelColor = Color(0xFF94A3B8)
                        ),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 12.dp)
                            .testTag("email_input")
                    )

                    // Password Field
                    OutlinedTextField(
                        value = password,
                        onValueChange = { password = it },
                        label = { Text("Contraseña") },
                        singleLine = true,
                        leadingIcon = {
                            Icon(Icons.Default.Lock, contentDescription = "Lock Icon", tint = Color(0xFF64748B))
                        },
                        trailingIcon = {
                            IconButton(onClick = { isPasswordVisible = !isPasswordVisible }) {
                                Icon(
                                    imageVector = if (isPasswordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                    contentDescription = if (isPasswordVisible) "Ocultar Contraseña" else "Mostrar Contraseña",
                                    tint = Color(0xFF94A3B8)
                                )
                            }
                        },
                        visualTransformation = if (isPasswordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Password,
                            imeAction = ImeAction.Done
                        ),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedBorderColor = MaterialTheme.colorScheme.primary,
                            unfocusedBorderColor = Color(0xFF475569),
                            focusedLabelColor = MaterialTheme.colorScheme.primary,
                            unfocusedLabelColor = Color(0xFF94A3B8)
                        ),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 16.dp)
                            .testTag("password_input")
                    )

                    // Role Selector for Signup Mode
                    AnimatedVisibility(
                        visible = !isLoginMode,
                        enter = expandVertically() + fadeIn(),
                        exit = shrinkVertically() + fadeOut()
                    ) {
                        Column(modifier = Modifier.padding(bottom = 16.dp)) {
                            Text(
                                text = "Selecciona tu Rol de Acceso:",
                                style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold),
                                color = Color.White,
                                modifier = Modifier.padding(bottom = 8.dp)
                            )

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                val roles = listOf(
                                    Triple("ADMIN", "Admin", Icons.Default.AdminPanelSettings),
                                    Triple("KITCHEN", "Cocina", Icons.Default.Restaurant),
                                    Triple("CLIENT", "Cliente", Icons.Default.MenuBook)
                                )

                                roles.forEach { (role, label, icon) ->
                                    val isSelected = selectedRole == role
                                    Box(
                                        modifier = Modifier
                                            .weight(1f)
                                            .height(56.dp)
                                            .clip(RoundedCornerShape(12.dp))
                                            .background(
                                                if (isSelected) MaterialTheme.colorScheme.primaryContainer
                                                else Color(0xFF0F172A)
                                            )
                                            .border(
                                                width = 1.dp,
                                                color = if (isSelected) MaterialTheme.colorScheme.primary else Color(0xFF334155),
                                                shape = RoundedCornerShape(12.dp)
                                            )
                                            .clickable { selectedRole = role }
                                            .padding(4.dp),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                            Icon(
                                                imageVector = icon,
                                                contentDescription = label,
                                                tint = if (isSelected) MaterialTheme.colorScheme.primary else Color(0xFF94A3B8),
                                                modifier = Modifier.size(18.dp)
                                            )
                                            Text(
                                                text = label,
                                                style = MaterialTheme.typography.bodySmall.copy(
                                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                                ),
                                                color = if (isSelected) MaterialTheme.colorScheme.onPrimaryContainer else Color(0xFF94A3B8),
                                                fontSize = 11.sp
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Action Button
                    Button(
                        onClick = {
                            focusManager.clearFocus()
                            if (email.isBlank() || password.isBlank()) {
                                errorMessage = "Por favor, completa todos los campos."
                                return@Button
                            }
                            if (password.length < 6) {
                                errorMessage = "La contraseña debe tener al menos 6 caracteres."
                                return@Button
                            }

                            isLoading = true
                            errorMessage = null

                            if (isLoginMode) {
                                viewModel.signIn(
                                    email = email.trim(),
                                    password = password,
                                    onSuccess = {
                                        isLoading = false
                                    },
                                    onError = { error ->
                                        isLoading = false
                                        errorMessage = translateFirebaseError(error)
                                    }
                                )
                            } else {
                                viewModel.signUp(
                                    email = email.trim(),
                                    password = password,
                                    role = selectedRole,
                                    onSuccess = {
                                        isLoading = false
                                    },
                                    onError = { error ->
                                        isLoading = false
                                        errorMessage = translateFirebaseError(error)
                                    }
                                )
                            }
                        },
                        enabled = !isLoading,
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp)
                            .testTag("submit_button"),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.primary,
                            disabledContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.5f)
                        )
                    ) {
                        if (isLoading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(24.dp),
                                color = Color.White,
                                strokeWidth = 2.dp
                            )
                        } else {
                            Text(
                                text = if (isLoginMode) "Iniciar Sesión" else "Registrar y Activar",
                                style = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.Bold),
                                color = Color.White
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Switch Mode Clickable Text
                    Text(
                        text = if (isLoginMode) "¿No tienes una cuenta? Regístrate aquí" else "¿Ya tienes cuenta? Inicia sesión",
                        style = MaterialTheme.typography.bodyMedium.copy(
                            color = MaterialTheme.colorScheme.primary,
                            fontWeight = FontWeight.SemiBold
                        ),
                        textAlign = TextAlign.Center,
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable(enabled = !isLoading) { isLoginMode = !isLoginMode }
                            .padding(vertical = 4.dp)
                    )
                }
            }

            // Explanatory Note footer
            Spacer(modifier = Modifier.height(24.dp))
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = if (viewModel.isDemoMode) Color(0xFF0369A1).copy(alpha = 0.15f) else Color(0xFF0F172A).copy(alpha = 0.8f)
                ),
                border = if (viewModel.isDemoMode) {
                    androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF0EA5E9).copy(alpha = 0.4f))
                } else null,
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    if (viewModel.isDemoMode) {
                        Text(
                            text = "📱 Modo Demostración Local Activado",
                            style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold),
                            color = Color(0xFF38BDF8),
                            modifier = Modifier.padding(bottom = 6.dp)
                        )
                        Text(
                            text = "Usa estas cuentas rápidas para probar cada rol:\n" +
                                   "• Admin: admin@gastro.com\n" +
                                   "• Cocina: cocina@gastro.com\n" +
                                   "• Cliente: cliente@gastro.com\n" +
                                   "Contraseña: cualquiera (mín. 6 caracteres). También puedes registrar cuentas nuevas con el rol que desees.",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFFE2E8F0),
                            lineHeight = 16.sp
                        )
                    } else {
                        Text(
                            text = "💡 Guía de Demostración de Roles:",
                            style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold),
                            color = Color.White,
                            modifier = Modifier.padding(bottom = 4.dp)
                        )
                        Text(
                            text = "• Administrador: Acceso total al panel de ventas, inventario, tasas de cambio y cambio de vistas supervisor.\n" +
                                   "• Cocina: Acceso bloqueado únicamente al panel de visualización KDS (Pantalla de Cocina) en tiempo real.\n" +
                                   "• Cliente: Modo de auto-servicio para pedidos, adición al carrito de compras y envío de comandas directas.",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFF94A3B8),
                            lineHeight = 16.sp
                        )
                    }
                }
            }
        }
    }
}

// Helper to determine the icon based on selected role
private fun imageOf(role: String) = when (role) {
    "ADMIN" -> Icons.Default.AdminPanelSettings
    "KITCHEN" -> Icons.Default.Restaurant
    else -> Icons.Default.MenuBook
}

// Helper to translate Firebase Auth common errors to Spanish
private fun translateFirebaseError(error: String): String {
    return when {
        error.contains("INVALID_LOGIN_CREDENTIALS") || error.contains("wrong-password") || error.contains("user-not-found") -> {
            "Credenciales incorrectas. Verifica el correo y la contraseña."
        }
        error.contains("email-already-in-use") -> {
            "Este correo electrónico ya está registrado con otra cuenta."
        }
        error.contains("invalid-email") -> {
            "El formato del correo electrónico no es válido."
        }
        error.contains("network-request-failed") -> {
            "Error de red. Verifica tu conexión a internet."
        }
        else -> error
    }
}
