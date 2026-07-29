package com.byiara.api.media.application

import com.byiara.api.common.storage.MediaStorage
import com.byiara.api.media.domain.MediaAsset
import com.byiara.api.media.domain.MediaRepository
import org.slf4j.LoggerFactory
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.stereotype.Component
import org.springframework.transaction.support.TransactionTemplate
import org.springframework.context.annotation.Profile
import java.security.MessageDigest

@Component
@Profile("!test")
class LegacyMediaReconciler(
    private val repository: MediaRepository,
    private val storage: MediaStorage,
    private val transactions: TransactionTemplate,
) : ApplicationRunner {
    private val logger = LoggerFactory.getLogger(javaClass)

    override fun run(args: ApplicationArguments) {
        val unverified = repository.findUnverified()
        if (unverified.isEmpty()) return

        var merged = 0
        var verified = 0
        unverified.forEach { asset ->
            val bytes = storage.read(asset.storageKey)
            if (bytes == null) {
                logger.warn("Could not verify missing legacy media file {}", asset.storageKey)
                return@forEach
            }
            val contentHash = bytes.sha256()
            val redundantKey = transactions.execute {
                val current = repository.findById(asset.id) ?: return@execute null
                val canonical = repository.findByHash(contentHash)
                if (canonical != null && canonical.id != current.id) {
                    repository.replaceReferences(current, canonical)
                    repository.delete(current.id)
                    merged += 1
                    current.storageKey.takeIf { it != canonical.storageKey }
                } else {
                    repository.verifyHash(current.id, contentHash)
                    verified += 1
                    null
                }
            }
            redundantKey?.let { runCatching { storage.delete(it) } }
        }
        logger.info("Verified {} legacy media assets and merged {} duplicates", verified, merged)
    }

    private fun ByteArray.sha256(): String =
        MessageDigest.getInstance("SHA-256")
            .digest(this)
            .joinToString("") { byte -> "%02x".format(byte) }
}
