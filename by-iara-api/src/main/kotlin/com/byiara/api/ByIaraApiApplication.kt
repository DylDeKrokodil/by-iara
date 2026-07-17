package com.byiara.api

import com.byiara.api.auth.config.AdminAuthProperties
import com.byiara.api.auth.config.InitialAdminProperties
import com.byiara.api.calendar.config.CalendarFeedProperties
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.boot.runApplication

@SpringBootApplication
@EnableConfigurationProperties(
	AdminAuthProperties::class,
	InitialAdminProperties::class,
	CalendarFeedProperties::class,
)
class ByIaraApiApplication

fun main(args: Array<String>) {
	runApplication<ByIaraApiApplication>(*args)
}
