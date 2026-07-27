package com.byiara.api.customer.domain

interface CustomerQueryRepository {
    fun searchByEmailPrefix(emailPrefix: String, limit: Int, offset: Int): List<CustomerSearchResult>

    fun countByEmailPrefix(emailPrefix: String): Int
}
