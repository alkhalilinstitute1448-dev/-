package com.alkhalel.academy.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val Gold = Color(0xFFF5A623)
private val DarkGold = Color(0xFFB8860B)
private val GoldContainer = Color(0xFFFFF3D6)
private val OnGoldContainer = Color(0xFF5C3D00)
private val SurfaceLight = Color(0xFFF8F8F8)
private val OnSurfaceLight = Color(0xFF1C1B1F)

private val LightColorScheme = lightColorScheme(
    primary = Gold,
    onPrimary = Color.Black,
    primaryContainer = GoldContainer,
    onPrimaryContainer = OnGoldContainer,
    secondary = Color(0xFF424242),
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFE0E0E0),
    onSecondaryContainer = Color(0xFF1C1B1F),
    background = SurfaceLight,
    onBackground = OnSurfaceLight,
    surface = Color.White,
    onSurface = OnSurfaceLight,
    surfaceVariant = Color(0xFFE7E0EC),
    onSurfaceVariant = Color(0xFF49454F),
    error = Color(0xFFB3261E),
    onError = Color.White
)

private val DarkColorScheme = darkColorScheme(
    primary = DarkGold,
    onPrimary = Color.Black,
    primaryContainer = Color(0xFF5C3D00),
    onPrimaryContainer = GoldContainer,
    secondary = Color(0xFFB0BEC5),
    onSecondary = Color.Black,
    background = Color(0xFF121212),
    onBackground = Color(0xFFE6E1E5),
    surface = Color(0xFF1C1B1F),
    onSurface = Color(0xFFE6E1E5),
    error = Color(0xFFF2B8B5),
    onError = Color(0xFF601410)
)

@Composable
fun AlkhalelAcademyTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}
