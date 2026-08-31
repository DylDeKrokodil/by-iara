package com.byiara.api.pack.domain

import java.time.OffsetDateTime
import java.util.UUID

interface PackRepository {
    fun createPending(pack: NewCustomerPack): CustomerPack
    fun findUsableForUpdate(packId: UUID, customerId: UUID, serviceId: UUID, durationMinutes: Int): CustomerPack?
    fun addRedemption(packId: UUID, reservationId: UUID)
    fun listUsable(customerId: UUID, serviceId: UUID?, durationMinutes: Int?, now: OffsetDateTime): List<CustomerPack>
    fun listAll(): List<CustomerPack>
    fun activateForOriginatingReservation(reservationId: UUID, now: OffsetDateTime): Boolean
    fun consumeReservation(reservationId: UUID)
    fun releaseReservation(reservationId: UUID)
    fun forfeitReservation(reservationId: UUID)
}
