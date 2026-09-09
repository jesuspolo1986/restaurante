package com.example.ui.theme

import android.os.Build
import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext

private val DarkColorScheme =
  darkColorScheme(
    primary = DarkOrange,
    secondary = DarkAmber,
    tertiary = DarkTeal,
    background = CulinaryDarkBg,
    surface = CulinarySurfaceDark,
    surfaceVariant = CulinarySurfaceDark,
    outline = SleekBorderLight,
    primaryContainer = Color(0xFF4F378B),
    onPrimaryContainer = Color(0xFFEADDFF),
    error = SleekError
  )

private val LightColorScheme =
  lightColorScheme(
    primary = OrangePrimary,
    secondary = AmberSecondary,
    tertiary = TealTertiary,
    background = CulinaryLightBg,
    surface = CulinarySurfaceLight,
    surfaceVariant = SleekSurfaceVariant,
    outline = SleekBorderLight,
    primaryContainer = SleekPrimaryContainer,
    onPrimaryContainer = SleekOnPrimaryContainer,
    error = SleekError
  )

@Composable
fun MyApplicationTheme(
  darkTheme: Boolean = isSystemInDarkTheme(),
  // Set dynamicColor to false to consistently enforce our customized theme
  dynamicColor: Boolean = false,
  content: @Composable () -> Unit,
) {
  val colorScheme =
    when {
      dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
        val context = LocalContext.current
        if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
      }

      darkTheme -> DarkColorScheme
      else -> LightColorScheme
    }

  MaterialTheme(colorScheme = colorScheme, typography = Typography, content = content)
}
