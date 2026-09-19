package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AdminPanelSettings
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.AuthState
import com.example.ui.RestaurantViewModel
import com.example.ui.theme.MyApplicationTheme
import com.example.ui.views.AdminView
import com.example.ui.views.AuthView
import com.example.ui.views.ClientView
import com.example.ui.views.KitchenView

class MainActivity : ComponentActivity() {
    private val viewModel: RestaurantViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MyApplicationTheme {
                val authState by viewModel.authState.collectAsState()

                when (val state = authState) {
                    is AuthState.Unauthenticated -> {
                        AuthView(viewModel = viewModel, modifier = Modifier.fillMaxSize())
                    }
                    is AuthState.Authenticated -> {
                        val currentMode by viewModel.currentMode.collectAsState()
                        val userRole = state.role

                        Scaffold(
                            bottomBar = {
                                // Only show bottom navigation bar to ADMIN users to supervise the different views
                                if (userRole == "ADMIN") {
                                    NavigationBar(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .windowInsetsPadding(WindowInsets.navigationBars),
                                        containerColor = MaterialTheme.colorScheme.surface,
                                        tonalElevation = 8.dp
                                    ) {
                                        NavigationBarItem(
                                            selected = currentMode == "ADMIN",
                                            onClick = { viewModel.setMode("ADMIN") },
                                            icon = { Icon(Icons.Default.AdminPanelSettings, contentDescription = "Administración") },
                                            label = { Text("Admin") },
                                            colors = NavigationBarItemDefaults.colors(
                                                selectedIconColor = MaterialTheme.colorScheme.primary,
                                                selectedTextColor = MaterialTheme.colorScheme.primary,
                                                indicatorColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f)
                                            )
                                        )
                                        NavigationBarItem(
                                            selected = currentMode == "KITCHEN",
                                            onClick = { viewModel.setMode("KITCHEN") },
                                            icon = { Icon(Icons.Default.Restaurant, contentDescription = "Cocina (KDS)") },
                                            label = { Text("Cocina") },
                                            colors = NavigationBarItemDefaults.colors(
                                                selectedIconColor = MaterialTheme.colorScheme.primary,
                                                selectedTextColor = MaterialTheme.colorScheme.primary,
                                                indicatorColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f)
                                            )
                                        )
                                        NavigationBarItem(
                                            selected = currentMode == "CLIENT",
                                            onClick = { viewModel.setMode("CLIENT") },
                                            icon = { Icon(Icons.Default.MenuBook, contentDescription = "Cliente") },
                                            label = { Text("Menú") },
                                            colors = NavigationBarItemDefaults.colors(
                                                selectedIconColor = MaterialTheme.colorScheme.primary,
                                                selectedTextColor = MaterialTheme.colorScheme.primary,
                                                indicatorColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f)
                                            )
                                        )
                                    }
                                }
                            },
                            modifier = Modifier.fillMaxSize()
                        ) { innerPadding ->
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(innerPadding)
                            ) {
                                // Enforce user's actual role views if not admin
                                val activeMode = if (userRole == "ADMIN") currentMode else userRole

                                Box(modifier = Modifier.fillMaxSize()) {
                                    when (activeMode) {
                                        "ADMIN" -> AdminView(
                                            viewModel = viewModel,
                                            modifier = Modifier.fillMaxSize()
                                        )
                                        "KITCHEN" -> KitchenView(
                                            viewModel = viewModel,
                                            modifier = Modifier.fillMaxSize()
                                        )
                                        "CLIENT" -> ClientView(
                                            viewModel = viewModel,
                                            modifier = Modifier.fillMaxSize()
                                        )
                                    }

                                    // Floating button to log out and demonstrate switching of accounts/roles
                                    Box(
                                        modifier = Modifier
                                            .fillMaxSize()
                                            .padding(16.dp),
                                        contentAlignment = Alignment.TopEnd
                                    ) {
                                        Button(
                                            onClick = { viewModel.signOut() },
                                            colors = ButtonDefaults.buttonColors(
                                                containerColor = MaterialTheme.colorScheme.error.copy(alpha = 0.85f),
                                                contentColor = MaterialTheme.colorScheme.onError
                                            ),
                                            shape = RoundedCornerShape(12.dp),
                                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp),
                                            modifier = Modifier.height(36.dp)
                                        ) {
                                            Row(
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                                            ) {
                                                Icon(
                                                    imageVector = Icons.Default.Logout,
                                                    contentDescription = "Salir",
                                                    modifier = Modifier.size(16.dp)
                                                )
                                                Text(
                                                    text = "Salir (${userRole.lowercase().replaceFirstChar { it.uppercase() }})",
                                                    fontSize = 11.sp,
                                                    fontWeight = FontWeight.Bold
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
