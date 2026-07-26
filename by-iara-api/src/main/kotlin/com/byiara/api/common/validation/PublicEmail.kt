package com.byiara.api.common.validation

/**
 * Requires a fully qualified public domain while @Email handles the address
 * structure. This prevents incomplete domains such as `person@gmail`.
 */
const val PUBLIC_EMAIL_DOMAIN_PATTERN =
    """^[^@\s]+@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+(?:[A-Za-z]{2,63}|xn--[A-Za-z0-9-]{2,59})$"""
