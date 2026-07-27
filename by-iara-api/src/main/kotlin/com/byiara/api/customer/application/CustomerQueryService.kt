package com.byiara.api.customer.application

import com.byiara.api.customer.domain.CustomerQueryRepository
import com.byiara.api.customer.domain.CustomerSearchPage
import org.springframework.stereotype.Service

@Service
class CustomerQueryService(
    private val repository: CustomerQueryRepository,
) {
    fun search(email: String, page: Int, size: Int): CustomerSearchPage {
        val normalizedEmail = email.trim().lowercase()
        val offset = page * size
        return CustomerSearchPage(
            items = repository.searchByEmailPrefix(normalizedEmail, size, offset),
            page = page,
            size = size,
            total = repository.countByEmailPrefix(normalizedEmail),
        )
    }
}
