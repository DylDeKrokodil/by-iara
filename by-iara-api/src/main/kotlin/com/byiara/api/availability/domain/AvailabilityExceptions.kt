package com.byiara.api.availability.domain

import java.util.UUID

class AvailabilityRuleNotFoundException(id: UUID) :
    RuntimeException("Availability rule $id was not found")

class AvailabilityBlockNotFoundException(id: UUID) :
    RuntimeException("Availability block $id was not found")

class InvalidAvailabilityRuleException(message: String) :
    RuntimeException(message)

class InvalidAvailabilityBlockException(message: String) :
    RuntimeException(message)
