package com.example.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color

@Composable
fun QRCodeCanvas(data: String, modifier: Modifier = Modifier) {
    Canvas(modifier = modifier) {
        val size = this.size.width
        val modules = 21
        val cellSize = size / modules

        // Finder patterns (7x7) at (0,0), (modules-7,0), and (0,modules-7)
        fun drawFinderPattern(x: Int, y: Int) {
            // Outer black square
            drawRect(
                color = Color(0xFF1E1E1E),
                topLeft = Offset(x * cellSize, y * cellSize),
                size = Size(cellSize * 7, cellSize * 7)
            )
            // Inner white square
            drawRect(
                color = Color.White,
                topLeft = Offset((x + 1) * cellSize, (y + 1) * cellSize),
                size = Size(cellSize * 5, cellSize * 5)
            )
            // Center black square
            drawRect(
                color = Color(0xFF1E1E1E),
                topLeft = Offset((x + 2) * cellSize, (y + 2) * cellSize),
                size = Size(cellSize * 3, cellSize * 3)
            )
        }

        // Draw background
        drawRect(color = Color.White)

        // Draw the 3 finder patterns
        drawFinderPattern(0, 0)
        drawFinderPattern(modules - 7, 0)
        drawFinderPattern(0, modules - 7)

        // Small alignment pattern at bottom-right
        drawRect(
            color = Color(0xFF1E1E1E),
            topLeft = Offset((modules - 9) * cellSize, (modules - 9) * cellSize),
            size = Size(cellSize * 2, cellSize * 2)
        )

        // Timing patterns (horizontal & vertical lines connecting finder patterns)
        for (i in 7 until modules - 7) {
            if (i % 2 == 0) {
                drawRect(
                    color = Color(0xFF1E1E1E),
                    topLeft = Offset(i * cellSize, 6 * cellSize),
                    size = Size(cellSize, cellSize)
                )
                drawRect(
                    color = Color(0xFF1E1E1E),
                    topLeft = Offset(6 * cellSize, i * cellSize),
                    size = Size(cellSize, cellSize)
                )
            }
        }

        // Deterministic modules based on string data hash
        val hash = data.hashCode()
        for (r in 0 until modules) {
            for (c in 0 until modules) {
                // Skip finder patterns areas
                if ((r < 8 && c < 8) || (r < 8 && c >= modules - 8) || (r >= modules - 8 && c < 8)) {
                    continue
                }
                // Skip timing patterns lines
                if (r == 6 || c == 6) {
                    continue
                }
                // Skip alignment pattern area
                if (r >= modules - 10 && r < modules - 7 && c >= modules - 10 && c < modules - 7) {
                    continue
                }

                // Mathematical deterministic generation of QR data modules
                val isDark = ((r * 13 + c * 37 + hash) % 3 == 0) || ((r + c + hash) % 5 == 0)
                if (isDark) {
                    drawRect(
                        color = Color(0xFF1E1E1E),
                        topLeft = Offset(c * cellSize, r * cellSize),
                        size = Size(cellSize, cellSize)
                    )
                }
            }
        }
    }
}
