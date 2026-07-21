package com.byiara.api.discount.application

import com.byiara.api.discount.domain.CreateDiscountCommand
import com.byiara.api.discount.domain.CreatedDiscount
import com.byiara.api.discount.domain.DiscountAudience
import com.byiara.api.discount.domain.InvalidDiscountException
import com.byiara.api.notification.application.DiscountEmailService
import com.byiara.api.notification.domain.EmailStatus
import org.springframework.stereotype.Service

data class AdminCreatedDiscount(
    val created: CreatedDiscount,
    val deliveryStatus: EmailStatus?,
)

/** Coordinates optional delivery without coupling the core discount rules to email transport. */
@Service
class DiscountAdministrationService(
    private val discountService: DiscountService,
    private val discountEmailService: DiscountEmailService,
) {
    fun create(command: CreateDiscountCommand, sendEmail: Boolean): AdminCreatedDiscount {
        if (sendEmail && command.audience != DiscountAudience.PERSONAL) {
            throw InvalidDiscountException("Email delivery is only available for personal discounts")
        }
        val created = discountService.create(command)
        val deliveryStatus = if (sendEmail) discountEmailService.sendPersonalDiscount(created) else null
        return AdminCreatedDiscount(created, deliveryStatus)
    }
}
