package com.byiara.api.notification.domain

interface EmailLogRepository {
    fun record(log: NewEmailLog): EmailLog
}
