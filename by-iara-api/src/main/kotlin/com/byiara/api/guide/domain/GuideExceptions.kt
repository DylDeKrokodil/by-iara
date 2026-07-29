package com.byiara.api.guide.domain

import java.util.UUID

class GuideNotFoundException(id: UUID) : RuntimeException("Guide $id was not found")

class DuplicateGuideSlugException(locale: String, slug: String) :
    RuntimeException("A $locale guide already uses the slug \"$slug\"")

class InvalidGuideException(message: String) : RuntimeException(message)

class InvalidGuideImageException(message: String) : RuntimeException(message)
