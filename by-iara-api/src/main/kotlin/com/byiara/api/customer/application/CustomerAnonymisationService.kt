package com.byiara.api.customer.application

import com.byiara.api.customer.domain.CustomerAnonymisationRepository
import com.byiara.api.customer.domain.CustomerNotFoundException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.OffsetDateTime
import java.util.UUID

@Service
class CustomerAnonymisationService(
    private val repository: CustomerAnonymisationRepository,
) {
    @Transactional
    fun anonymise(customerId: UUID, performedBy: String) {
        if (!repository.anonymise(customerId, performedBy, OffsetDateTime.now())) {
            throw CustomerNotFoundException(customerId)
        }
    }
}
