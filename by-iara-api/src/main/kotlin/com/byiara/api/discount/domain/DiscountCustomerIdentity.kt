package com.byiara.api.discount.domain

/**
 * A promotion-only identity. Contact emails remain untouched, while common alias
 * forms resolve to one customer for usage limits and unique-client capacity.
 */
object DiscountCustomerIdentity {
    fun fromEmail(email: String): String {
        val normalized = email.trim().lowercase()
        val separator = normalized.lastIndexOf('@')
        if (separator <= 0 || separator == normalized.lastIndex) return normalized

        val domain = normalized.substring(separator + 1)
        var local = normalized.substring(0, separator).substringBefore('+')
        val canonicalDomain = if (domain == "gmail.com" || domain == "googlemail.com") {
            local = local.replace(".", "")
            "gmail.com"
        } else {
            domain
        }
        return "$local@$canonicalDomain"
    }
}
