package com.byiara.api.notification.application

import com.byiara.api.discount.domain.CreatedDiscount
import com.byiara.api.notification.domain.EmailLogRepository
import com.byiara.api.notification.domain.EmailStatus
import com.byiara.api.notification.domain.EmailType
import com.byiara.api.notification.domain.NewEmailLog
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service

@Service
class DiscountEmailService(
    private val mailTransport: MailTransport,
    private val emailLogRepository: EmailLogRepository,
    @Value("\${by-iara.website-url}") private val websiteUrl: String,
) {
    fun sendPersonalDiscount(created: CreatedDiscount): EmailStatus {
        val recipient = requireNotNull(created.recipient) { "A personal discount recipient is required" }
        val code = requireNotNull(created.generatedCode) { "A generated personal discount code is required" }
        return try {
            val content = EmailCopy.personalDiscount(recipient, created.discount, code, websiteUrl)
            mailTransport.send(recipient.email, content)
            emailLogRepository.record(
                NewEmailLog(recipient.reservationId, recipient.email, EmailType.PERSONAL_DISCOUNT, EmailStatus.SENT, null),
            )
            EmailStatus.SENT
        } catch (exception: Exception) {
            log.error("Failed to send personal discount {} to {}", created.discount.id, recipient.email, exception)
            emailLogRepository.record(
                NewEmailLog(
                    recipient.reservationId,
                    recipient.email,
                    EmailType.PERSONAL_DISCOUNT,
                    EmailStatus.FAILED,
                    exception.message,
                ),
            )
            EmailStatus.FAILED
        }
    }

    companion object {
        private val log = LoggerFactory.getLogger(DiscountEmailService::class.java)
    }
}
