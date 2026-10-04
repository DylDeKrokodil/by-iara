package com.byiara.api.guide.domain

import java.util.UUID

class GuideNotFoundException(id: UUID) : RuntimeException("Guide $id was not found")

class DuplicateGuideSlugException(locale: String, slug: String) :
    RuntimeException("${if (locale == "pt-PT") "Portuguese" else "English"} URL slug \"$slug\" is already in use")

class InvalidGuideException(message: String) : RuntimeException(message)

class InvalidGuideImageException(message: String) : RuntimeException(message)
