package com.byiara.api.catalog.application

import com.byiara.api.catalog.domain.InvalidServiceImageException
import org.springframework.stereotype.Component
import java.awt.Color
import java.awt.RenderingHints
import java.awt.image.BufferedImage
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import javax.imageio.IIOImage
import javax.imageio.ImageIO
import javax.imageio.ImageWriteParam

data class OptimizedServiceImage(
    val contentType: String,
    val width: Int,
    val height: Int,
    val data: ByteArray,
)

@Component
class ServiceImageProcessor {
    fun optimize(input: ByteArray): OptimizedServiceImage {
        if (input.isEmpty()) throw InvalidServiceImageException("Choose an image to upload")
        if (input.size > MAX_INPUT_BYTES) {
            throw InvalidServiceImageException("The original image must be 10 MB or smaller")
        }

        val source = decodeValidated(input)

        val scale = minOf(1.0, MAX_WIDTH.toDouble() / source.width, MAX_HEIGHT.toDouble() / source.height)
        val width = (source.width * scale).toInt().coerceAtLeast(1)
        val height = (source.height * scale).toInt().coerceAtLeast(1)
        val optimized = BufferedImage(width, height, BufferedImage.TYPE_INT_RGB)
        optimized.createGraphics().use { graphics ->
            graphics.color = Color.WHITE
            graphics.fillRect(0, 0, width, height)
            graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC)
            graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY)
            graphics.drawImage(source, 0, 0, width, height, null)
        }

        val output = ByteArrayOutputStream()
        val writer = ImageIO.getImageWritersByFormatName("jpeg").next()
        ImageIO.createImageOutputStream(output).use { imageOutput ->
            writer.output = imageOutput
            val parameters = writer.defaultWriteParam.apply {
                compressionMode = ImageWriteParam.MODE_EXPLICIT
                compressionQuality = JPEG_QUALITY
            }
            writer.write(null, IIOImage(optimized, null, null), parameters)
        }
        writer.dispose()

        return OptimizedServiceImage("image/jpeg", width, height, output.toByteArray())
    }

    private fun decodeValidated(input: ByteArray): BufferedImage =
        ImageIO.createImageInputStream(ByteArrayInputStream(input)).use { imageInput ->
            val readers = ImageIO.getImageReaders(imageInput)
            if (!readers.hasNext()) throw InvalidServiceImageException("Use a valid JPEG or PNG image")
            val reader = readers.next()
            try {
                reader.input = imageInput
                if (reader.formatName.lowercase() !in setOf("jpeg", "jpg", "png")) {
                    throw InvalidServiceImageException("Use a valid JPEG or PNG image")
                }
                val width = reader.getWidth(0)
                val height = reader.getHeight(0)
                if (width <= 0 || height <= 0 || width.toLong() * height > MAX_PIXELS) {
                    throw InvalidServiceImageException("The image dimensions are too large")
                }
                reader.read(0)
            } catch (exception: InvalidServiceImageException) {
                throw exception
            } catch (_: Exception) {
                throw InvalidServiceImageException("Use a valid JPEG or PNG image")
            } finally {
                reader.dispose()
            }
        }

    private inline fun <T : java.awt.Graphics2D, R> T.use(block: (T) -> R): R =
        try {
            block(this)
        } finally {
            dispose()
        }

    private companion object {
        const val MAX_INPUT_BYTES = 10 * 1024 * 1024
        const val MAX_PIXELS = 40_000_000L
        const val MAX_WIDTH = 1600
        const val MAX_HEIGHT = 1200
        const val JPEG_QUALITY = 0.82f
    }
}
