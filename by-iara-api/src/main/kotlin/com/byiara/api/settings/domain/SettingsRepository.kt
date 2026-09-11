package com.byiara.api.settings.domain

interface SettingsRepository {
    fun findValue(key: String): String?
    fun upsertValue(key: String, value: String)
}
