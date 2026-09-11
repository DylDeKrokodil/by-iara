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
                codeHint = if (command.audience == DiscountAudience.AUTOMATIC) "Automatic" else hint(code),
                customerId = customerId,
                publicCode = code.takeIf { command.audience == DiscountAudience.PUBLIC },
                featured = command.featured,
            ),
        )
        return CreatedDiscount(
            created,
            code.takeIf {
                command.audience != DiscountAudience.AUTOMATIC &&
                    (generated || command.audience == DiscountAudience.PERSONAL)
            },
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
        if (featured && (discount.audience == DiscountAudience.PERSONAL || (discount.audience == DiscountAudience.PUBLIC && discount.publicCode == null))) {
            throw InvalidDiscountException("Only public codes and automatic promotions can be featured")
        }
        return repository.updateFeatured(id, featured) ?: throw DiscountNotFoundException(id)
    }

    @Transactional
    fun delete(id: UUID) {
        get(id)
        if (!repository.deleteUnused(id)) {
            throw InvalidDiscountException("Used discounts cannot be deleted; archive this campaign instead")
        }
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

    @Transactional(readOnly = true)
    fun automaticPromotions(): List<Discount> = repository.findActiveAutomatic(OffsetDateTime.now())

    @Transactional
    fun prepareAutomaticForReservation(serviceId: UUID, basePrice: Money, customer: Customer): DiscountQuote? =
        automaticQuote(serviceId, basePrice, customer.email, true)

    @Transactional(readOnly = true)
    fun previewAutomatic(serviceId: UUID, basePrice: Money, email: String): DiscountQuote? =
        automaticQuote(serviceId, basePrice, email, false)

    private fun automaticQuote(serviceId: UUID, basePrice: Money, email: String, lock: Boolean): DiscountQuote? {
        val candidates = repository.findActiveAutomatic(OffsetDateTime.now())
            .filter { serviceId in it.serviceIds }.sortedBy { it.id }
        // Stable lock order prevents deadlocks when overlapping campaigns compete.
        if (lock) candidates.forEach { repository.lockCampaign(it.id) }
        val normalizedEmail = email.normalizedEmail()
        val identity = DiscountCustomerIdentity.fromEmail(normalizedEmail)
        val returning = candidates.any { it.firstTimeCustomersOnly } && repository.hasCompletedAppointments(identity)
        val now = OffsetDateTime.now()
        val eligible = candidates.mapNotNull { if (lock) repository.findById(it.id) else it }
            .filter { it.status == DiscountStatus.ACTIVE && !now.isBefore(it.startsAt) && now.isBefore(it.endsAt) }
            .filter { !it.firstTimeCustomersOnly || !returning }
            .filter { it.maxUsesPerCustomer == null || repository.activeUsageCount(it.id, identity) < it.maxUsesPerCustomer }
        return bestAutomaticQuote(eligible, serviceId, basePrice)
    }

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
        if (customerIdentityKey != null && discount.maxUsesPerCustomer != null && customerUsage >= discount.maxUsesPerCustomer) {
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
        return quote(discount, basePrice) ?: throw DiscountUnavailableException()
    }

    private fun bestAutomaticQuote(
        discounts: List<Discount>,
        serviceId: UUID,
        basePrice: Money,
    ): DiscountQuote? = discounts.asSequence()
        .filter { it.scope == DiscountScope.SELECTED_SERVICES && serviceId in it.serviceIds }
        .mapNotNull { quote(it, basePrice) }
        .maxByOrNull { it.discountAmount.amountCents }

    private fun quote(discount: Discount, basePrice: Money): DiscountQuote? {
        if (discount.valueType == DiscountValueType.FIXED_AMOUNT && discount.currency != basePrice.currency) return null
        val reduction = when (discount.valueType) {
            DiscountValueType.PERCENTAGE ->
                ((basePrice.amountCents * discount.valueAmount) + 5_000L) / 10_000L
            DiscountValueType.FIXED_AMOUNT -> discount.valueAmount
        }.coerceAtMost(basePrice.amountCents)
        if (reduction <= 0L) return null
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
        if (command.firstTimeCustomersOnly && command.audience != DiscountAudience.AUTOMATIC) {
            throw InvalidDiscountException("First-time eligibility is available for automatic promotions")
        }
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
        if (command.audience == DiscountAudience.AUTOMATIC && command.scope != DiscountScope.SELECTED_SERVICES) {
            throw InvalidDiscountException("Automatic promotions must target selected services")
        }
        if (command.audience == DiscountAudience.AUTOMATIC &&
            (command.maxUniqueClients != null || !command.customerEmail.isNullOrBlank())
        ) {
            throw InvalidDiscountException("Automatic promotions cannot limit unique clients or target a customer email")
        }
        if (command.featured && command.audience == DiscountAudience.PERSONAL) {
            throw InvalidDiscountException("Only public codes and automatic promotions can be featured")
        }
        if (command.maxUniqueClients != null && command.maxUniqueClients <= 0) {
            throw InvalidDiscountException("Maximum clients must be greater than zero")
        }
        if (command.maxUsesPerCustomer != null && command.maxUsesPerCustomer <= 0) throw InvalidDiscountException("Uses per customer must be greater than zero")
    }

    private fun generateCode(audience: DiscountAudience): String {
        val bytes = ByteArray(18).also(secureRandom::nextBytes)
        val prefix = when (audience) {
            DiscountAudience.PERSONAL -> "PERS"
            DiscountAudience.PUBLIC -> "DISC"
            DiscountAudience.AUTOMATIC -> "AUTO"
        }
        return "$prefix-${Base64.getUrlEncoder().withoutPadding().encodeToString(bytes).uppercase()}"
    }

    private fun hash(code: String): String = MessageDigest.getInstance("SHA-256")
        .digest(code.toByteArray(Charsets.UTF_8))
        .joinToString("") { "%02x".format(it) }

    private fun hint(code: String): String = if (code.length <= 8) code else "${code.take(4)}••••${code.takeLast(4)}"

    private fun String.normalizedCode(): String = trim().uppercase()
    private fun String.normalizedEmail(): String = trim().lowercase()
}
