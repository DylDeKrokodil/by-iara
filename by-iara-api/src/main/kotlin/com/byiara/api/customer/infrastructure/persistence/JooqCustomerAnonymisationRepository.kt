package com.byiara.api.customer.infrastructure.persistence

import com.byiara.api.customer.domain.CustomerAnonymisationRepository
import org.jooq.DSLContext
import org.jooq.impl.DSL.field
import org.jooq.impl.DSL.name
import org.jooq.impl.DSL.table
import org.springframework.stereotype.Repository
import java.time.OffsetDateTime
import java.util.UUID

@Repository
class JooqCustomerAnonymisationRepository(
    private val dsl: DSLContext,
) : CustomerAnonymisationRepository {
    private val customers = table(name("customers"))
    private val customerId = field(name("customers", "id"), UUID::class.java)
    private val customerName = field(name("customers", "name"), String::class.java)
    private val customerEmail = field(name("customers", "email"), String::class.java)
    private val customerPhone = field(name("customers", "phone"), String::class.java)
    private val customerAnonymizedAt =
        field(name("customers", "anonymized_at"), OffsetDateTime::class.java)
    private val customerUpdatedAt =
        field(name("customers", "updated_at"), OffsetDateTime::class.java)

    private val reservations = table(name("reservations"))
    private val reservationId = field(name("reservations", "id"), UUID::class.java)
    private val reservationCustomerId =
        field(name("reservations", "customer_id"), UUID::class.java)
    private val reservationNotes = field(name("reservations", "notes"), String::class.java)
    private val reservationRejectionMessage =
        field(name("reservations", "rejection_message"), String::class.java)
    private val reservationCancellationMessage =
        field(name("reservations", "cancellation_message"), String::class.java)
    private val reservationUpdatedAt =
        field(name("reservations", "updated_at"), OffsetDateTime::class.java)

    private val emailLogs = table(name("email_logs"))
    private val emailLogReservationId =
        field(name("email_logs", "reservation_id"), UUID::class.java)
    private val emailLogRecipient = field(name("email_logs", "recipient"), String::class.java)
    private val emailLogErrorMessage =
        field(name("email_logs", "error_message"), String::class.java)

    private val payments = table(name("reservation_payments"))
    private val paymentReservationId =
        field(name("reservation_payments", "reservation_id"), UUID::class.java)
    private val paymentReference =
        field(name("reservation_payments", "reference"), String::class.java)
    private val paymentUpdatedAt =
        field(name("reservation_payments", "updated_at"), OffsetDateTime::class.java)

    private val reservationDiscounts = table(name("reservation_discounts"))
    private val discountCustomerId =
        field(name("reservation_discounts", "customer_id"), UUID::class.java)
    private val discountCustomerIdentityKey =
        field(name("reservation_discounts", "customer_identity_key"), String::class.java)
    private val discountUpdatedAt =
        field(name("reservation_discounts", "updated_at"), OffsetDateTime::class.java)

    private val accessTokens = table(name("customer_access_tokens"))
    private val accessTokenCustomerId =
        field(name("customer_access_tokens", "customer_id"), UUID::class.java)

    private val events = table(name("customer_anonymization_events"))
    private val eventCustomerId =
        field(name("customer_anonymization_events", "customer_id"), UUID::class.java)
    private val eventPerformedBy =
        field(name("customer_anonymization_events", "performed_by"), String::class.java)
    private val eventScopeVersion =
        field(name("customer_anonymization_events", "scope_version"), Int::class.java)
    private val eventAnonymizedAt =
        field(name("customer_anonymization_events", "anonymized_at"), OffsetDateTime::class.java)

    override fun anonymise(
        customerId: UUID,
        performedBy: String,
        anonymisedAt: OffsetDateTime,
    ): Boolean {
        val customer = dsl
            .select(customerEmail, customerAnonymizedAt)
            .from(customers)
            .where(this.customerId.eq(customerId))
            .forUpdate()
            .fetchOne()
            ?: return false

        if (customer.get(customerAnonymizedAt) != null) {
            return true
        }

        val originalEmail = customer.get(customerEmail)
        val anonymisedEmail = "anonymised+$customerId@customer.invalid"
        val anonymisedIdentityKey = "anonymised:$customerId"
        val customerReservationIds = dsl
            .select(reservationId)
            .from(reservations)
            .where(reservationCustomerId.eq(customerId))

        dsl.update(reservations)
            .set(reservationNotes, null as String?)
            .set(reservationRejectionMessage, null as String?)
            .set(reservationCancellationMessage, null as String?)
            .set(reservationUpdatedAt, anonymisedAt)
            .where(reservationCustomerId.eq(customerId))
            .execute()

        dsl.update(emailLogs)
            .set(emailLogRecipient, anonymisedEmail)
            .set(emailLogErrorMessage, null as String?)
            .where(
                emailLogReservationId.`in`(customerReservationIds)
                    .or(emailLogRecipient.equalIgnoreCase(originalEmail)),
            )
            .execute()

        dsl.update(payments)
            .set(paymentReference, null as String?)
            .set(paymentUpdatedAt, anonymisedAt)
            .where(paymentReservationId.`in`(customerReservationIds))
            .execute()

        dsl.update(reservationDiscounts)
            .set(discountCustomerIdentityKey, anonymisedIdentityKey)
            .set(discountUpdatedAt, anonymisedAt)
            .where(discountCustomerId.eq(customerId))
            .execute()

        dsl.deleteFrom(accessTokens)
            .where(accessTokenCustomerId.eq(customerId))
            .execute()

        dsl.update(customers)
            .set(customerName, "Anonymised customer")
            .set(customerEmail, anonymisedEmail)
            .set(customerPhone, null as String?)
            .set(customerAnonymizedAt, anonymisedAt)
            .set(customerUpdatedAt, anonymisedAt)
            .where(this.customerId.eq(customerId))
            .execute()

        dsl.insertInto(events)
            .columns(eventCustomerId, eventPerformedBy, eventScopeVersion, eventAnonymizedAt)
            .values(customerId, performedBy, 1, anonymisedAt)
            .execute()

        return true
    }
}
