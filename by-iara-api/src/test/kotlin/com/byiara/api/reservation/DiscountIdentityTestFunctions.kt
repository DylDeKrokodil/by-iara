package com.byiara.api.reservation

object DiscountIdentityTestFunctions {
    @JvmStatic
    fun normalize(email: String): String = com.byiara.api.discount.domain.DiscountCustomerIdentity.fromEmail(email)
}
