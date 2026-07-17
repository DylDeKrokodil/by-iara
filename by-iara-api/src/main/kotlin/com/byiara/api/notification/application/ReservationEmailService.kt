package com.byiara.api.notification.application

import com.byiara.api.auth.domain.AdminCredentialsRepository
import com.byiara.api.notification.domain.EmailLogRepository
import com.byiara.api.notification.domain.EmailStatus
import com.byiara.api.notification.domain.EmailType
import com.byiara.api.notification.domain.NewEmailLog
import com.byiara.api.reservation.domain.Reservation
import com.byiara.api.reservation.domain.ReservationStatus
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.time.ZoneId
import java.util.UUID

@Service
class ReservationEmailService(
    private val mailTransport: MailTransport,
    private val emailLogRepository: EmailLogRepository,
    private val adminCredentialsRepository: AdminCredentialsRepository,
    @Value("\${by-iara.timezone:Europe/Brussels}")
    private val timezoneIdStr: String,
    @Value("\${by-iara.admin-url}")
    private val adminUrl: String,
    @Value("\${by-iara.business-phone:}")
    private val businessPhone: String,
) {
    private val zoneId: ZoneId get() = ZoneId.of(timezoneIdStr)

    /**
     * Never throws: a mail failure must never affect the reservation write that
     * triggered it. The outer runCatching guards everything before/around the send
     * (e.g. the admin lookup); sendAndLog guards the send itself and always records
     * the outcome, since MailTransport has no recovery hook of its own.
     */
    fun notifyAdminsOfNewReservation(reservation: Reservation) {
        runCatching {
            val recipients = adminCredentialsRepository.findActiveEmails()
            if (recipients.isEmpty()) return@runCatching

            val content = EmailCopy.newReservationAlert(reservation, zoneId, adminUrl)
            recipients.forEach { sendAndLog(it, content, reservation.id, EmailType.NEW_RESERVATION) }
        }.onFailure { log.error("Failed to notify admins of new reservation {}", reservation.id, it) }
    }

    fun notifyCustomerOfDecision(reservation: Reservation) {
        runCatching {
            val content = EmailCopy.reservationDecision(reservation, zoneId, businessPhone) ?: return@runCatching
            val type = when (reservation.status) {
                ReservationStatus.CONFIRMED -> EmailType.RESERVATION_CONFIRMED
                ReservationStatus.REJECTED -> EmailType.RESERVATION_REJECTED
                ReservationStatus.CANCELLED -> EmailType.RESERVATION_CANCELLED
                else -> return@runCatching
            }
            sendAndLog(reservation.customer.email, content, reservation.id, type)
        }.onFailure { log.error("Failed to notify customer of decision for reservation {}", reservation.id, it) }
    }

    private fun sendAndLog(recipient: String, content: EmailContent, reservationId: UUID?, type: EmailType) {
        try {
            mailTransport.send(recipient, content)
            emailLogRepository.record(NewEmailLog(reservationId, recipient, type, EmailStatus.SENT, null))
        } catch (e: Exception) {
            log.error("Giving up sending {} email to {} for reservation {} after retries", type, recipient, reservationId, e)
            emailLogRepository.record(NewEmailLog(reservationId, recipient, type, EmailStatus.FAILED, e.message))
        }
    }

    companion object {
        private val log = LoggerFactory.getLogger(ReservationEmailService::class.java)
    }
}
