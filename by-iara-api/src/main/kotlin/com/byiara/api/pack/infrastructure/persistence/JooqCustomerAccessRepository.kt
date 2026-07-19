package com.byiara.api.pack.infrastructure.persistence

import com.byiara.api.pack.domain.CustomerAccessRepository
import com.byiara.api.pack.domain.CustomerAccessTokenType
import com.byiara.api.pack.domain.NewCustomerAccessToken
import com.byiara.api.reservation.domain.Customer
import org.jooq.DSLContext
import org.jooq.impl.DSL.currentOffsetDateTime
import org.jooq.impl.DSL.field
import org.jooq.impl.DSL.name
import org.jooq.impl.DSL.table
import org.springframework.stereotype.Repository
import java.time.OffsetDateTime
import java.util.UUID

@Repository
class JooqCustomerAccessRepository(private val dsl: DSLContext) : CustomerAccessRepository {
    private val customers = table(name("customers"))
    private val cId = field(name("customers", "id"), UUID::class.java)
    private val cName = field(name("customers", "name"), String::class.java)
    private val cEmail = field(name("customers", "email"), String::class.java)
    private val cPhone = field(name("customers", "phone"), String::class.java)

    private val tokens = table(name("customer_access_tokens"))
    private val tCustomerId = field(name("customer_access_tokens", "customer_id"), UUID::class.java)
    private val tHash = field(name("customer_access_tokens", "token_hash"), String::class.java)
    private val tType = field(name("customer_access_tokens", "token_type"), String::class.java)
    private val tExpiresAt = field(name("customer_access_tokens", "expires_at"), OffsetDateTime::class.java)
    private val tUsedAt = field(name("customer_access_tokens", "used_at"), OffsetDateTime::class.java)
    private val tCreatedAt = field(name("customer_access_tokens", "created_at"), OffsetDateTime::class.java)

    override fun findCustomerByEmail(email: String): Customer? = dsl
        .select(cId, cName, cEmail, cPhone)
        .from(customers)
        .where(cEmail.eq(email.trim().lowercase()))
        .fetchOne(::mapCustomer)

    override fun createToken(token: NewCustomerAccessToken) {
        dsl.insertInto(tokens)
            .columns(tCustomerId, tHash, tType, tExpiresAt)
            .values(token.customerId, token.tokenHash, token.type.name, token.expiresAt)
            .execute()
    }

    override fun hasRecentMagicLink(customerId: UUID, createdAfter: OffsetDateTime): Boolean =
        dsl.fetchExists(
            dsl.selectOne().from(tokens).where(
                tCustomerId.eq(customerId)
                    .and(tType.eq(CustomerAccessTokenType.MAGIC_LINK.name))
                    .and(tCreatedAt.gt(createdAfter)),
            ),
        )

    override fun consumeMagicLink(tokenHash: String, now: OffsetDateTime): Customer? {
        val customerId = dsl.update(tokens)
            .set(tUsedAt, currentOffsetDateTime())
            .where(
                tHash.eq(tokenHash)
                    .and(tType.eq(CustomerAccessTokenType.MAGIC_LINK.name))
                    .and(tUsedAt.isNull)
                    .and(tExpiresAt.gt(now)),
            )
            .returning(tCustomerId)
            .fetchOne(tCustomerId)
            ?: return null
        return findCustomerById(customerId)
    }

    override fun findSession(tokenHash: String, now: OffsetDateTime): Customer? {
        val customerId = dsl.select(tCustomerId)
            .from(tokens)
            .where(
                tHash.eq(tokenHash)
                    .and(tType.eq(CustomerAccessTokenType.SESSION.name))
                    .and(tUsedAt.isNull)
                    .and(tExpiresAt.gt(now)),
            )
            .fetchOne(tCustomerId)
            ?: return null
        return findCustomerById(customerId)
    }

    private fun findCustomerById(id: UUID): Customer? = dsl
        .select(cId, cName, cEmail, cPhone)
        .from(customers)
        .where(cId.eq(id))
        .fetchOne(::mapCustomer)

    private fun mapCustomer(record: org.jooq.Record): Customer = Customer(
        id = record.get(cId),
        name = record.get(cName),
        email = record.get(cEmail),
        phone = record.get(cPhone),
    )
}
