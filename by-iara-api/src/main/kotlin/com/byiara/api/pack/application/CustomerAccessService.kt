package com.byiara.api.pack.application

import com.byiara.api.notification.application.EmailCopy
import com.byiara.api.notification.application.MailTransport
import com.byiara.api.notification.domain.EmailLogRepository
import com.byiara.api.notification.domain.EmailStatus
import com.byiara.api.notification.domain.EmailType
import com.byiara.api.notification.domain.NewEmailLog
import com.byiara.api.pack.domain.CustomerAccessDeniedException
import com.byiara.api.pack.domain.CustomerAccessRepository
import com.byiara.api.pack.domain.CustomerAccessTokenType
import com.byiara.api.pack.domain.CustomerPack
import com.byiara.api.pack.domain.NewCustomerAccessToken
import com.byiara.api.pack.domain.PackRepository
import com.byiara.api.reservation.domain.Customer
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import java.security.SecureRandom
import java.time.OffsetDateTime
import java.util.Base64
import java.util.UUID

data class CustomerSession(val token: String, val customer: Customer, val packs: List<CustomerPack>)

@Service
class CustomerAccessService(
    private val repository: CustomerAccessRepository,
    private val packRepository: PackRepository,
    private val mailTransport: MailTransport,
    private val emailLogRepository: EmailLogRepository,
    @Value("\${by-iara.website-url:http://localhost:4300}") private val websiteUrl: String,
    @Value("\${by-iara.customer-access.magic-link-ttl-minutes:20}") private val magicLinkTtlMinutes: Long,
    @Value("\${by-iara.customer-access.session-ttl-days:30}") private val sessionTtlDays: Long,
) {
    private val random = SecureRandom()

    /** Always returns normally, whether the address exists or not, to prevent customer enumeration. */
    @Transactional
    fun requestLink(email: String, locale: String) {
        val customer = repository.findCustomerByEmail(email) ?: return
        if (packRepository.listUsable(customer.id, null, null, OffsetDateTime.now()).isEmpty()) return
        if (repository.hasRecentMagicLink(customer.id, OffsetDateTime.now().minusMinutes(2))) return
        sendLink(customer, locale)
    }

    @Transactional
    fun sendLink(customer: Customer, locale: String) {
        val rawToken = newToken()
        repository.createToken(
            NewCustomerAccessToken(
                customerId = customer.id,
                tokenHash = hash(rawToken),
                type = CustomerAccessTokenType.MAGIC_LINK,
                expiresAt = OffsetDateTime.now().plusMinutes(magicLinkTtlMinutes),
            ),
        )
        val normalizedLocale = if (locale == "pt") "pt" else "en"
        val bookingPath = if (normalizedLocale == "pt") "marcar" else "book"
        val link = "${websiteUrl.trimEnd('/')}/$normalizedLocale/$bookingPath?packAccess=$rawToken"
        val content = EmailCopy.customerPackAccess(customer.name, link, normalizedLocale, magicLinkTtlMinutes)
        try {
            mailTransport.send(customer.email, content)
            emailLogRepository.record(
                NewEmailLog(null, customer.email, EmailType.CUSTOMER_PACK_ACCESS, EmailStatus.SENT, null),
            )
        } catch (exception: Exception) {
            log.error("Failed to send customer pack access link to {}", customer.email, exception)
            emailLogRepository.record(
                NewEmailLog(
                    null,
                    customer.email,
                    EmailType.CUSTOMER_PACK_ACCESS,
                    EmailStatus.FAILED,
                    exception.message,
                ),
            )
        }
    }

    @Transactional
    fun exchange(magicLinkToken: String): CustomerSession {
        val customer = repository.consumeMagicLink(hash(magicLinkToken), OffsetDateTime.now())
            ?: throw CustomerAccessDeniedException()
        val sessionToken = newToken()
        repository.createToken(
            NewCustomerAccessToken(
                customerId = customer.id,
                tokenHash = hash(sessionToken),
                type = CustomerAccessTokenType.SESSION,
                expiresAt = OffsetDateTime.now().plusDays(sessionTtlDays),
            ),
        )
        return CustomerSession(
            token = sessionToken,
            customer = customer,
            packs = packRepository.listUsable(customer.id, null, null, OffsetDateTime.now()),
        )
    }

    @Transactional(readOnly = true)
    fun authenticate(sessionToken: String): Customer = repository.findSession(hash(sessionToken), OffsetDateTime.now())
        ?: throw CustomerAccessDeniedException()

    @Transactional
    fun packs(sessionToken: String, serviceId: UUID?, durationMinutes: Int?): List<CustomerPack> {
        val customer = authenticate(sessionToken)
        return packRepository.listUsable(customer.id, serviceId, durationMinutes, OffsetDateTime.now())
    }

    private fun newToken(): String = ByteArray(32).also(random::nextBytes).let {
        Base64.getUrlEncoder().withoutPadding().encodeToString(it)
    }

    private fun hash(token: String): String = MessageDigest.getInstance("SHA-256")
        .digest(token.toByteArray(StandardCharsets.UTF_8))
        .joinToString("") { "%02x".format(it) }

    companion object { private val log = LoggerFactory.getLogger(CustomerAccessService::class.java) }
}
