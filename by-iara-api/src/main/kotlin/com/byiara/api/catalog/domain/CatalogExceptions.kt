package com.byiara.api.catalog.domain

import java.util.UUID

class ServiceNotFoundException(id: UUID) :
    RuntimeException("Service $id was not found")

class DuplicateServiceSlugException(slug: String) :
    RuntimeException("A service with slug '$slug' already exists")

class InvalidPackOfferException(message: String) : RuntimeException(message)
