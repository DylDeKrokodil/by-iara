package com.byiara.api.notification.application

import org.springframework.beans.factory.annotation.Value
import org.springframework.mail.SimpleMailMessage
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.resilience.annotation.Retryable
import org.springframework.stereotype.Component

/**
 * A separate bean, deliberately with only this one method: @Retryable is Spring AOP
 * proxy advice, so it only applies across bean boundaries -- a self-invoked call from
 * another method in the same class would silently skip retrying.
 *
 * maxRetries counts retries only (not the initial attempt), so 2 here means 3 total
 * attempts, with ~1s then ~2s between them. Spring Framework 7's native resilience
 * support has no @Recover equivalent -- once retries are exhausted the last exception
 * just propagates, so the caller (ReservationEmailService) is responsible for catching
 * it and logging the failure.
 */
@Component
class MailTransport(
    private val mailSender: JavaMailSender,
    @Value("\${by-iara.notifications.from-address}")
    private val fromAddress: String,
) {
    @Retryable(maxRetries = 2, delay = 1000, multiplier = 2.0)
    fun send(recipient: String, content: EmailContent) {
        mailSender.send(
            SimpleMailMessage().apply {
                setFrom(fromAddress)
                setTo(recipient)
                setSubject(content.subject)
                setText(content.body)
            },
        )
    }
}
