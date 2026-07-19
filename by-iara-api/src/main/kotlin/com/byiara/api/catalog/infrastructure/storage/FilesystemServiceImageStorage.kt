package com.byiara.api.catalog.infrastructure.storage

import com.byiara.api.catalog.domain.ServiceImageStorage
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.nio.file.AtomicMoveNotSupportedException
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardCopyOption

@Component
class FilesystemServiceImageStorage(
    @Value("\${by-iara.media.storage-root}") storageRoot: String,
) : ServiceImageStorage {
    private val root = Path.of(storageRoot).toAbsolutePath().normalize()

    override fun write(key: String, data: ByteArray) {
        val target = resolve(key)
        Files.createDirectories(target.parent)
        val temporary = Files.createTempFile(target.parent, ".upload-", ".tmp")
        try {
            Files.write(temporary, data)
            try {
                Files.move(
                    temporary,
                    target,
                    StandardCopyOption.ATOMIC_MOVE,
                    StandardCopyOption.REPLACE_EXISTING,
                )
            } catch (_: AtomicMoveNotSupportedException) {
                Files.move(temporary, target, StandardCopyOption.REPLACE_EXISTING)
            }
        } finally {
            Files.deleteIfExists(temporary)
        }
    }

    override fun read(key: String): ByteArray? {
        val path = resolve(key)
        return if (Files.isRegularFile(path)) Files.readAllBytes(path) else null
    }

    override fun delete(key: String) {
        Files.deleteIfExists(resolve(key))
    }

    private fun resolve(key: String): Path {
        val path = root.resolve(key).normalize()
        require(path.startsWith(root)) { "Invalid service image storage key" }
        return path
    }
}
