package com.byiara.api.discount.api

import com.byiara.api.discount.application.DiscountService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/discounts")
class PublicDiscountController(private val service: DiscountService) {
    @GetMapping("/featured")
    fun featured(): ResponseEntity<FeaturedDiscountResponse> =
        service.featured()?.let { ResponseEntity.ok(it.toFeaturedResponse()) }
            ?: ResponseEntity.noContent().build()
}
