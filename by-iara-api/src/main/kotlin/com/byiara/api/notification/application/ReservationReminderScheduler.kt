package com.byiara.api.notification.application

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

@Component
@ConditionalOnProperty(
    prefix = "by-iara.reminders",
    name = ["scheduler-enabled"],
    havingValue = "true",
    matchIfMissing = true,
)
class ReservationReminderScheduler(
    private val reminderService: ReservationReminderService,
) {
    @Scheduled(fixedDelayString = "\${by-iara.reminders.poll-interval-ms:60000}")
    fun dispatchDueReminders() {
        reminderService.dispatchDue()
    }
}
