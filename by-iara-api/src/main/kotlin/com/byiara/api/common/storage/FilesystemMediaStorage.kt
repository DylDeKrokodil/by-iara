package com.byiara.api.common.storage

import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.stereotype.Component
import java.nio.file.AtomicMoveNotSupportedException
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardCopyOption

@Component
@ConditionalOnProperty(
    prefix = "by-iara.media",
    name = ["provider"],
    havingValue = "filesystem",
    matchIfMissing = true,
)
class FilesystemMediaStorage(
    @Value("\${by-iara.media.storage-root}") storageRoot: String,
) : MediaStorage {
    private val root = Path.of(storageRoot).toAbsolutePath().normalize()

    override fun write(key: String, data: ByteArray) {
        val target = resolve(key)
        Files.createDirectories(target.parent)
        val temporary = Files.createTempFile(target.parent, ".upload-", ".tmp")
        try {
            Files.write(temporary, data)
            try {
                Files.move(temporary, target, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING)
            } catch (_: AtomicMoveNotSupportedException) {
                Files.move(temporary, target, StandardCopyOption.REPLACE_EXISTING)
            }
        } finally {
            Files.deleteIfExists(temporary)
        }
    }

    override fun read(key: String): ByteArray? =
        resolve(key).takeIf(Files::isRegularFile)?.let(Files::readAllBytes)

    override fun delete(key: String) {
        Files.deleteIfExists(resolve(key))
    }

    private fun resolve(key: String): Path {
        val path = root.resolve(key).normalize()
        require(path.startsWith(root)) { "Invalid media storage key" }
        return path
    }
}
