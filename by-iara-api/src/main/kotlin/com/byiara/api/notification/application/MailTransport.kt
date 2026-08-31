package com.byiara.api.notification.application

import org.springframework.beans.factory.annotation.Value
import org.springframework.core.io.ByteArrayResource
import org.springframework.core.io.ClassPathResource
import org.springframework.mail.SimpleMailMessage
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.mail.javamail.MimeMessageHelper
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
    // ClassPathResource is safe to reuse across calls/retries -- getInputStream() opens a
    // fresh stream each time, unlike a raw already-consumed InputStream.
    private val logo = ClassPathResource("email/logo.png")

    @Retryable(maxRetries = 2, delay = 1000, multiplier = 2.0)
    fun send(recipient: String, content: EmailContent) {
        if (content.htmlBody != null || content.attachments.isNotEmpty()) {
            val message = mailSender.createMimeMessage()
            // Attachments need a MIXED root; the nested RELATED part keeps the inline logo
            // alongside the multipart/alternative text+html body built below.
            val multipartMode = if (content.attachments.isEmpty()) {
                MimeMessageHelper.MULTIPART_MODE_RELATED
            } else {
                MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED
            }
            val helper = MimeMessageHelper(message, multipartMode, "UTF-8")
            helper.setFrom(fromAddress)
            helper.setTo(recipient)
            helper.setSubject(content.subject)
            // Plain text first, HTML second -- MimeMessageHelper builds a multipart/alternative
            // so clients that can't (or won't) render HTML still get a readable fallback.
            if (content.htmlBody != null) {
                helper.setText(content.body, content.htmlBody)
                helper.addInline("logo", logo)
            } else {
                helper.setText(content.body)
            }
            content.attachments.forEach { attachment ->
                helper.addAttachment(
                    attachment.filename,
                    ByteArrayResource(attachment.content),
                    attachment.contentType,
                )
            }
            mailSender.send(message)
        } else {
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
}
