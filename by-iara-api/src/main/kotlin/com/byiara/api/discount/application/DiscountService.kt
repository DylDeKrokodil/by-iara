package com.byiara.api.discount.application

import com.byiara.api.catalog.domain.Money
import com.byiara.api.discount.domain.CreateDiscountCommand
import com.byiara.api.discount.domain.CreatedDiscount
import com.byiara.api.discount.domain.DiscountCustomerIdentity
import com.byiara.api.discount.domain.Discount
import com.byiara.api.discount.domain.DiscountAudience
import com.byiara.api.discount.domain.DiscountNotFoundException
import com.byiara.api.discount.domain.DiscountQuote
import com.byiara.api.discount.domain.DiscountRepository
import com.byiara.api.discount.domain.DiscountScope
import com.byiara.api.discount.domain.DiscountStatus
import com.byiara.api.discount.domain.DiscountUnavailableException
import com.byiara.api.discount.domain.DiscountUsage
import com.byiara.api.discount.domain.DiscountUsageStatus
import com.byiara.api.discount.domain.DiscountValueType
import com.byiara.api.discount.domain.InvalidDiscountException
import com.byiara.api.discount.domain.NewDiscount
import com.byiara.api.reservation.domain.Customer
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.security.MessageDigest
import java.security.SecureRandom
import java.time.OffsetDateTime
import java.util.Base64
import java.util.UUID

@Service
class DiscountService(private val repository: DiscountRepository) {
    private val secureRandom = SecureRandom()

    @Transactional
    fun create(command: CreateDiscountCommand): CreatedDiscount {
        validate(command)
        val recipient = if (command.audience == DiscountAudience.PERSONAL) {
            repository.findCompletedRecipientByEmail(requireNotNull(command.customerEmail).normalizedEmail())
                ?: throw InvalidDiscountException("No customer with a completed service has that email address")
        } else null
        val customerId = recipient?.customerId
        val generated = command.audience == DiscountAudience.PERSONAL || command.requestedCode.isNullOrBlank()
        val code = if (generated) generateCode(command.audience) else command.requestedCode.normalizedCode()
        if (repository.findByCodeHash(hash(code), forUpdate = false) != null) {
            throw InvalidDiscountException("That discount code already exists")
        }
        val created = repository.create(
            NewDiscount(
                command = command.copy(
                    name = command.name.trim(),
                    currency = command.currency?.trim()?.uppercase(),
                    customerEmail = command.customerEmail?.normalizedEmail(),
                ),
                codeHash = hash(code),
                codeHint = hint(code),
                customerId = customerId,
                publicCode = code.takeIf { command.audience == DiscountAudience.PUBLIC },
                featured = command.featured,
            ),
        )
        return CreatedDiscount(
            created,
            code.takeIf { generated || command.audience == DiscountAudience.PERSONAL },
            recipient,
        )
    }

    @Transactional(readOnly = true)
    fun list(): List<Discount> = repository.list()

    @Transactional(readOnly = true)
    fun get(id: UUID): Discount = repository.findById(id) ?: throw DiscountNotFoundException(id)

    @Transactional(readOnly = true)
    fun usage(id: UUID): List<DiscountUsage> {
        get(id)
        return repository.usage(id)
    }

    @Transactional
    fun setStatus(id: UUID, status: DiscountStatus): Discount =
        repository.updateStatus(id, status) ?: throw DiscountNotFoundException(id)

    @Transactional
    fun setFeatured(id: UUID, featured: Boolean): Discount {
        val discount = get(id)
        if (featured && (discount.audience != DiscountAudience.PUBLIC || discount.publicCode == null)) {
            throw InvalidDiscountException("Only public discounts with a displayable code can be featured")
        }
        return repository.updateFeatured(id, featured) ?: throw DiscountNotFoundException(id)
    }

    @Transactional(readOnly = true)
    fun featured(): Discount? = repository.findFeatured(OffsetDateTime.now())

    @Transactional(readOnly = true)
    fun preview(code: String, serviceId: UUID, customerEmail: String?, basePrice: Money): DiscountQuote {
        val normalizedEmail = customerEmail?.normalizedEmail()
        val customerId = normalizedEmail?.let(repository::findCustomerIdByEmail)
        val identityKey = normalizedEmail?.let(DiscountCustomerIdentity::fromEmail)
        return evaluate(code, serviceId, customerId, identityKey, basePrice, forUpdate = false)
    }

    /** Locks the campaign so capacity checks and reservation usage are atomic. */
    @Transactional
    fun prepareForReservation(code: String, serviceId: UUID, customer: Customer, basePrice: Money): DiscountQuote =
        evaluate(
            code,
            serviceId,
            customer.id,
            DiscountCustomerIdentity.fromEmail(customer.email),
            basePrice,
            forUpdate = true,
        )

    fun reserve(reservationId: UUID, customer: Customer, quote: DiscountQuote) =
        repository.reserve(
            reservationId,
            customer.id,
            DiscountCustomerIdentity.fromEmail(customer.email),
            quote,
        )

    fun release(reservationId: UUID) =
        repository.transitionReservation(reservationId, DiscountUsageStatus.RELEASED, OffsetDateTime.now())

    fun consume(reservationId: UUID) =
        repository.transitionReservation(reservationId, DiscountUsageStatus.CONSUMED, OffsetDateTime.now())

    private fun evaluate(
        rawCode: String,
        serviceId: UUID,
        customerId: UUID?,
        customerIdentityKey: String?,
        basePrice: Money,
        forUpdate: Boolean,
    ): DiscountQuote {
        val discount = repository.findByCodeHash(hash(rawCode.normalizedCode()), forUpdate)
            ?: throw DiscountUnavailableException()
        val now = OffsetDateTime.now()
        if (discount.status != DiscountStatus.ACTIVE || now.isBefore(discount.startsAt) || !now.isBefore(discount.endsAt)) {
            throw DiscountUnavailableException()
        }
        if (discount.scope == DiscountScope.SELECTED_SERVICES && serviceId !in discount.serviceIds) {
            throw DiscountUnavailableException()
        }
        if (discount.audience == DiscountAudience.PERSONAL && discount.customerId != customerId) {
            throw DiscountUnavailableException()
        }
        val customerUsage = customerIdentityKey?.let { repository.activeUsageCount(discount.id, it) } ?: 0
        if (customerIdentityKey != null && customerUsage >= discount.maxUsesPerCustomer) {
            throw DiscountUnavailableException()
        }
        val uniqueClients = repository.activeUniqueClientCount(discount.id)
        if (discount.maxUniqueClients != null && uniqueClients >= discount.maxUniqueClients &&
            customerUsage == 0
        ) {
            throw DiscountUnavailableException()
        }
        if (discount.valueType == DiscountValueType.FIXED_AMOUNT && discount.currency != basePrice.currency) {
            throw DiscountUnavailableException()
        }
        val reduction = when (discount.valueType) {
            DiscountValueType.PERCENTAGE ->
                ((basePrice.amountCents * discount.valueAmount) + 5_000L) / 10_000L
            DiscountValueType.FIXED_AMOUNT -> discount.valueAmount
        }.coerceAtMost(basePrice.amountCents)
        if (reduction <= 0L) throw DiscountUnavailableException()
        return DiscountQuote(
            discountId = discount.id,
            discountName = discount.name,
            codeHint = discount.codeHint,
            valueType = discount.valueType,
            valueAmount = discount.valueAmount,
            originalPrice = basePrice,
            discountAmount = Money(reduction, basePrice.currency),
            finalPrice = Money(basePrice.amountCents - reduction, basePrice.currency),
        )
    }

    private fun validate(command: CreateDiscountCommand) {
        if (command.name.isBlank()) throw InvalidDiscountException("Name is required")
        if (!command.startsAt.isBefore(command.endsAt)) throw InvalidDiscountException("End date must be after start date")
        if (command.valueAmount <= 0L) throw InvalidDiscountException("Discount value must be greater than zero")
        if (command.valueType == DiscountValueType.PERCENTAGE && command.valueAmount > 10_000L) {
            throw InvalidDiscountException("Percentage cannot exceed 100%")
        }
        if (command.valueType == DiscountValueType.FIXED_AMOUNT && command.currency.isNullOrBlank()) {
            throw InvalidDiscountException("Currency is required for a fixed discount")
        }
        if (command.scope == DiscountScope.SELECTED_SERVICES && command.serviceIds.isEmpty()) {
            throw InvalidDiscountException("Choose at least one service")
        }
        if (command.audience == DiscountAudience.PERSONAL && command.customerEmail.isNullOrBlank()) {
            throw InvalidDiscountException("Customer email is required for a personal discount")
        }
        if (command.featured && command.audience != DiscountAudience.PUBLIC) {
            throw InvalidDiscountException("Only public discounts can be featured")
        }
        if (command.maxUniqueClients != null && command.maxUniqueClients <= 0) {
            throw InvalidDiscountException("Maximum clients must be greater than zero")
        }
        if (command.maxUsesPerCustomer <= 0) throw InvalidDiscountException("Uses per customer must be greater than zero")
        if (!command.requestedCode.isNullOrBlank() && command.requestedCode.normalizedCode().length < 6) {
            throw InvalidDiscountException("Public codes must contain at least 6 characters")
        }
    }

    private fun generateCode(audience: DiscountAudience): String {
        val bytes = ByteArray(18).also(secureRandom::nextBytes)
        val prefix = if (audience == DiscountAudience.PERSONAL) "PERS" else "DISC"
        return "$prefix-${Base64.getUrlEncoder().withoutPadding().encodeToString(bytes).uppercase()}"
    }

    private fun hash(code: String): String = MessageDigest.getInstance("SHA-256")
        .digest(code.toByteArray(Charsets.UTF_8))
        .joinToString("") { "%02x".format(it) }

    private fun hint(code: String): String = if (code.length <= 8) code else "${code.take(4)}••••${code.takeLast(4)}"

    private fun String.normalizedCode(): String = trim().uppercase()
    private fun String.normalizedEmail(): String = trim().lowercase()
}
