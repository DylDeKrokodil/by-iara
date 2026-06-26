package com.byiara.api

import com.byiara.api.auth.config.AdminAuthProperties
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.boot.runApplication

@SpringBootApplication
@EnableConfigurationProperties(AdminAuthProperties::class)
class ByIaraApiApplication

fun main(args: Array<String>) {
	runApplication<ByIaraApiApplication>(*args)
}
