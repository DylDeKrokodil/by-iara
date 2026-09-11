package com.byiara.api.popup.infrastructure

import com.byiara.api.popup.domain.Popup
import com.byiara.api.popup.domain.PopupContent
import com.byiara.api.popup.domain.PopupRepository
import org.jooq.DSLContext
import org.jooq.Record
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class JooqPopupRepository(private val dsl: DSLContext) : PopupRepository {
    override fun list(): List<Popup> = dsl.fetch("$select ORDER BY p.created_at DESC, p.id").map(::map)

    override fun active(): Popup? = dsl.fetchOne("$select WHERE s.popup_id = p.id")?.let(::map)

    override fun save(id: UUID, content: PopupContent, create: Boolean): Popup? {
        val values = arrayOf<Any>(content.name, content.titlePt, content.titleEn, content.bodyPt, content.bodyEn, content.action, id)
        val count = if (create) {
            dsl.execute("INSERT INTO website_popups(name, title_pt, title_en, body_pt, body_en, action, id) VALUES (?, ?, ?, ?, ?, ?, ?)", *values)
        } else {
            dsl.execute("UPDATE website_popups SET name=?, title_pt=?, title_en=?, body_pt=?, body_en=?, action=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", *values)
        }
        return if (count == 0) null else dsl.fetchOne("$select WHERE p.id = ?", id)?.let(::map)
    }

    override fun setActive(id: UUID, active: Boolean): Boolean {
        if (!dsl.fetchExists(dsl.selectOne().from("website_popups").where("id = ?", id))) return false
        if (active) {
            dsl.execute("UPDATE website_popup_publication SET popup_id = ? WHERE singleton = TRUE", id)
        } else {
            // Disabling a stale admin row must never disable a different popup.
            dsl.execute("UPDATE website_popup_publication SET popup_id = NULL WHERE singleton = TRUE AND popup_id = ?", id)
        }
        return true
    }

    private fun map(row: Record) = Popup(
        row.get("id", UUID::class.java)!!,
        PopupContent(
            row.get("name", String::class.java)!!,
            row.get("title_pt", String::class.java)!!,
            row.get("title_en", String::class.java)!!,
            row.get("body_pt", String::class.java)!!,
            row.get("body_en", String::class.java)!!,
            row.get("action", String::class.java)!!,
        ),
        row.get("active", Boolean::class.java)!!,
    )

    private companion object {
        const val select = "SELECT p.*, COALESCE(s.popup_id = p.id, FALSE) AS active FROM website_popups p CROSS JOIN website_popup_publication s"
    }
}
