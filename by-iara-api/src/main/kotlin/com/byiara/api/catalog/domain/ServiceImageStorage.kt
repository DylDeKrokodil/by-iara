package com.byiara.api.catalog.domain

interface ServiceImageStorage {
    fun write(key: String, data: ByteArray)

    fun read(key: String): ByteArray?

    fun delete(key: String)
}
