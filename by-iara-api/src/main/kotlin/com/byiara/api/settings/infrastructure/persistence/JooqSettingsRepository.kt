package com.byiara.api.settings.infrastructure.persistence

import com.byiara.api.settings.domain.SettingsRepository
import org.jooq.DSLContext
import org.jooq.impl.DSL.field
import org.jooq.impl.DSL.name
import org.jooq.impl.DSL.table
import org.springframework.stereotype.Repository
import java.time.OffsetDateTime
import java.time.ZoneOffset

@Repository
class JooqSettingsRepository(
    private val dsl: DSLContext,
) : SettingsRepository {
    private val settings = table(name("application_settings"))
    private val settingKey = field(name("application_settings", "setting_key"), String::class.java)
    private val settingValue = field(name("application_settings", "setting_value"), String::class.java)
    private val updatedAt = field(name("application_settings", "updated_at"), OffsetDateTime::class.java)

    override fun findValue(key: String): String? =
        dsl.select(settingValue)
            .from(settings)
            .where(settingKey.eq(key))
            .fetchOne(settingValue)

    override fun upsertValue(key: String, value: String) {
        dsl.insertInto(settings)
            .columns(settingKey, settingValue, updatedAt)
            .values(key, value, OffsetDateTime.now(ZoneOffset.UTC))
            .onConflict(settingKey)
            .doUpdate()
            .set(settingValue, value)
            .set(updatedAt, OffsetDateTime.now(ZoneOffset.UTC))
            .execute()
    }
}
