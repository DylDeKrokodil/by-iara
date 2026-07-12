package com.byiara.api.notification.infrastructure.persistence

import com.byiara.api.notification.domain.EmailLog
import com.byiara.api.notification.domain.EmailLogRepository
import com.byiara.api.notification.domain.EmailStatus
import com.byiara.api.notification.domain.EmailType
import com.byiara.api.notification.domain.NewEmailLog
import org.jooq.DSLContext
import org.jooq.impl.DSL.field
import org.jooq.impl.DSL.name
import org.jooq.impl.DSL.table
import org.springframework.stereotype.Repository
import java.time.OffsetDateTime
import java.util.UUID

@Repository
class JooqEmailLogRepository(
    private val dsl: DSLContext,
) : EmailLogRepository {
    private val emailLogs = table(name("email_logs"))
    private val id = field(name("id"), UUID::class.java)
    private val reservationId = field(name("reservation_id"), UUID::class.java)
    private val recipient = field(name("recipient"), String::class.java)
    private val emailType = field(name("email_type"), String::class.java)
    private val status = field(name("status"), String::class.java)
    private val errorMessage = field(name("error_message"), String::class.java)
    private val createdAt = field(name("created_at"), OffsetDateTime::class.java)

    override fun record(log: NewEmailLog): EmailLog {
        val record = dsl
            .insertInto(emailLogs)
            .columns(reservationId, recipient, emailType, status, errorMessage)
            .values(log.reservationId, log.recipient, log.emailType.name, log.status.name, log.errorMessage)
            .returning(id, createdAt)
            .fetchOne()!!

        return EmailLog(
            id = record.get(id),
            reservationId = log.reservationId,
            recipient = log.recipient,
            emailType = log.emailType,
            status = log.status,
            errorMessage = log.errorMessage,
            createdAt = record.get(createdAt),
        )
    }
}
