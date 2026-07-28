package com.byiara.api.notification.application

import com.byiara.api.auth.domain.AdminCredentialsRepository
import com.byiara.api.discount.domain.CreatedDiscount
import com.byiara.api.calendar.application.ReservationIcsBuilder
import com.byiara.api.notification.domain.EmailLogRepository
import com.byiara.api.notification.domain.EmailStatus
import com.byiara.api.notification.domain.EmailType
import com.byiara.api.notification.domain.NewEmailLog
import com.byiara.api.reservation.domain.Reservation
import com.byiara.api.reservation.domain.ReservationLocale
import com.byiara.api.reservation.domain.ReservationStatus
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.time.OffsetDateTime
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
    @Value("\${by-iara.business-address:}")
    private val businessAddress: String,
    @Value("\${by-iara.business-email}")
    private val businessEmail: String,
    @Value("\${by-iara.google-review-url:}")
    private val googleReviewUrl: String,
    @Value("\${by-iara.website-url}")
    private val websiteUrl: String,
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
            var content = EmailCopy.reservationDecision(
                reservation,
                zoneId,
                businessPhone,
                businessAddress,
            ) ?: return@runCatching
            val type = when (reservation.status) {
                ReservationStatus.CONFIRMED -> {
                    val filename = when (reservation.locale) {
                        ReservationLocale.PT -> "by-iara-marcacao.ics"
                        ReservationLocale.EN -> "by-iara-appointment.ics"
                    }
                    content = content.copy(
                        attachments = listOf(
                            EmailAttachment(
                                filename = filename,
                                contentType = "text/calendar; charset=UTF-8; method=REQUEST",
                                content = ReservationIcsBuilder.buildAppointment(
                                    reservation,
                                    OffsetDateTime.now(),
                                    businessAddress,
                                    businessEmail,
                                ).toByteArray(Charsets.UTF_8),
                            ),
                        ),
                    )
                    EmailType.RESERVATION_CONFIRMED
                }
                ReservationStatus.REJECTED -> EmailType.RESERVATION_REJECTED
                ReservationStatus.CANCELLED -> EmailType.RESERVATION_CANCELLED
                else -> return@runCatching
            }
            sendAndLog(reservation.customer.email, content, reservation.id, type)
        }.onFailure { log.error("Failed to notify customer of decision for reservation {}", reservation.id, it) }
    }

    fun notifyCustomerOfReschedule(previous: Reservation, updated: Reservation) {
        runCatching {
            var content = EmailCopy.reservationRescheduled(previous, updated, zoneId)
            if (updated.status == ReservationStatus.CONFIRMED) {
                val filename = when (updated.locale) {
                    ReservationLocale.PT -> "by-iara-marcacao.ics"
                    ReservationLocale.EN -> "by-iara-appointment.ics"
                }
                content = content.copy(
                    attachments = listOf(
                        EmailAttachment(
                            filename = filename,
                            contentType = "text/calendar; charset=UTF-8; method=REQUEST",
                            content = ReservationIcsBuilder.buildAppointment(
                                updated,
                                OffsetDateTime.now(),
                                businessAddress,
                                businessEmail,
                            ).toByteArray(Charsets.UTF_8),
                        ),
                    ),
                )
            }
            sendAndLog(
                updated.customer.email,
                content,
                updated.id,
                EmailType.RESERVATION_RESCHEDULED,
            )
        }.onFailure { log.error("Failed to notify customer of reschedule for reservation {}", updated.id, it) }
    }

    fun notifyCustomerOfCompletion(reservation: Reservation, discount: CreatedDiscount? = null) {
        runCatching {
            val content = EmailCopy.reservationCompleted(
                reservation,
                googleReviewUrl.trim(),
                discount,
                websiteUrl.trim(),
            )
            sendAndLog(
                reservation.customer.email,
                content,
                reservation.id,
                EmailType.RESERVATION_COMPLETED,
            )
        }.onFailure { log.error("Failed to notify customer of completion for reservation {}", reservation.id, it) }
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
