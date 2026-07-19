package com.byiara.api.pack.domain

import com.byiara.api.reservation.domain.Customer
import java.time.OffsetDateTime
import java.util.UUID

enum class CustomerAccessTokenType { MAGIC_LINK, SESSION }

data class NewCustomerAccessToken(
    val customerId: UUID,
    val tokenHash: String,
    val type: CustomerAccessTokenType,
    val expiresAt: OffsetDateTime,
)

interface CustomerAccessRepository {
    fun findCustomerByEmail(email: String): Customer?
    fun createToken(token: NewCustomerAccessToken)
    fun hasRecentMagicLink(customerId: UUID, createdAfter: OffsetDateTime): Boolean
    fun consumeMagicLink(tokenHash: String, now: OffsetDateTime): Customer?
    fun findSession(tokenHash: String, now: OffsetDateTime): Customer?
}
