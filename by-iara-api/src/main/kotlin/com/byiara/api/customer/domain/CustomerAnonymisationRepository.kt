package com.byiara.api.customer.domain

import java.time.OffsetDateTime
import java.util.UUID

interface CustomerAnonymisationRepository {
    /**
     * Removes customer-linked personal data while retaining pseudonymous
     * operational, service, reservation, discount, pack and payment facts.
     *
     * The operation is idempotent and returns false only when the customer does
     * not exist.
     */
    fun anonymise(customerId: UUID, performedBy: String, anonymisedAt: OffsetDateTime): Boolean
}

class CustomerNotFoundException(id: UUID) :
    RuntimeException("Customer $id was not found")
