package com.byiara.api.discount.domain

import java.time.OffsetDateTime
import java.util.UUID

interface DiscountRepository {
    fun create(discount: NewDiscount): Discount
    fun list(): List<Discount>
    fun findById(id: UUID): Discount?
    fun findByCodeHash(codeHash: String, forUpdate: Boolean): Discount?
    fun findCustomerIdByEmail(email: String): UUID?
    fun findCompletedRecipientByEmail(email: String): DiscountRecipient?
    fun activeUsageCount(discountId: UUID, customerIdentityKey: String): Int
    fun activeUniqueClientCount(discountId: UUID): Int
    fun reserve(reservationId: UUID, customerId: UUID, customerIdentityKey: String, quote: DiscountQuote)
    fun transitionReservation(reservationId: UUID, target: DiscountUsageStatus, at: OffsetDateTime)
    fun updateStatus(id: UUID, status: DiscountStatus): Discount?
    fun updateFeatured(id: UUID, featured: Boolean): Discount?
    fun findFeatured(now: OffsetDateTime): Discount?
    fun usage(discountId: UUID): List<DiscountUsage>
}
