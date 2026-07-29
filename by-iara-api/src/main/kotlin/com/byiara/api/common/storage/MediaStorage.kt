package com.byiara.api.common.storage

interface MediaStorage {
    fun write(key: String, data: ByteArray)
    fun read(key: String): ByteArray?
    fun delete(key: String)
}
