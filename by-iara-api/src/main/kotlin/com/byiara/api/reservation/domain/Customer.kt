package com.byiara.api.reservation.domain

import java.util.UUID

data class Customer(
    val id: UUID,
    val name: String,
    val email: String,
    val phone: String?,
)

data class CustomerDetails(
    val name: String,
    val email: String,
    val phone: String?,
)
