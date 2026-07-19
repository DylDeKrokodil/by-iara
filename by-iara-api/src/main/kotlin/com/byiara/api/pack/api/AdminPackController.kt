package com.byiara.api.pack.api

import com.byiara.api.pack.domain.CustomerPack
import com.byiara.api.pack.domain.PackRepository
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.time.OffsetDateTime
import java.util.UUID

data class AdminCustomerPackResponse(
    val id: UUID,
    val customerName: String,
    val customerEmail: String,
    val status: String,
    val serviceName: String,
    val durationMinutes: Int,
    val totalSessions: Int,
    val remainingSessions: Int,
    val priceCents: Long,
    val currency: String,
    val activatedAt: OffsetDateTime?,
    val expiresAt: OffsetDateTime?,
    val originatingReservationId: UUID,
)

@RestController
@RequestMapping("/api/admin/packs")
class AdminPackController(private val repository: PackRepository) {
    @GetMapping
    fun list(): List<AdminCustomerPackResponse> = repository.listAll().map(CustomerPack::toAdminResponse)
}

private fun CustomerPack.toAdminResponse() = AdminCustomerPackResponse(
    id, customerName, customerEmail, status.name, serviceName, durationMinutes,
    totalSessions, remainingSessions, price.amountCents, price.currency,
    activatedAt, expiresAt, originatingReservationId,
)
