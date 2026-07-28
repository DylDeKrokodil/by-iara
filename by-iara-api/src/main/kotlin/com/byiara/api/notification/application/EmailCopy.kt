package com.byiara.api.notification.application

import com.byiara.api.discount.domain.Discount
import com.byiara.api.discount.domain.CreatedDiscount
import com.byiara.api.discount.domain.DiscountRecipient
import com.byiara.api.discount.domain.DiscountScope
import com.byiara.api.discount.domain.DiscountValueType
import com.byiara.api.reservation.domain.Reservation
import com.byiara.api.reservation.domain.ReservationLocale
import com.byiara.api.reservation.domain.ReservationStatus
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import java.util.Locale

data class EmailAttachment(
    val filename: String,
    val contentType: String,
    val content: ByteArray,
)

/** htmlBody is null only where an email has no HTML version (none currently -- kept for flexibility). */
data class EmailContent(
    val subject: String,
    val body: String,
    val htmlBody: String? = null,
    val attachments: List<EmailAttachment> = emptyList(),
)

/**
 * Subject/body copy for reservation emails, kept separate from send logic so wording
 * changes don't touch ReservationEmailService. Every email also gets an HTML version
 * matching the website's look, since that's what the recipient actually sees the brand
 * through; the plain-text body remains as the multipart/alternative fallback.
 */
object EmailCopy {
    fun customerPackAccess(
        customerName: String,
        accessUrl: String,
        locale: String,
        expiresInMinutes: Long,
    ): EmailContent = if (locale == "pt") {
        EmailContent(
            subject = "Aceda ao seu pack Iara Gouveia",
            body = """
                Olá $customerName,

                Use este link seguro para marcar a próxima sessão do seu pack:
                $accessUrl

                O link expira em $expiresInMinutes minutos.
            """.trimIndent(),
            htmlBody = htmlDocument(
                lang = "pt",
                title = "Aceda ao seu pack",
                bodyHtml = """
                    <h1 style="$headingStyle">Aceda ao seu pack</h1>
                    <p style="$paragraphStyle">Olá ${escapeHtml(customerName)}, use o botão abaixo para marcar a próxima sessão incluída no seu pack.</p>
                    ${detailsCard(listOf("Link seguro" to "Válido durante $expiresInMinutes minutos"))}
                    ${ctaButton("Marcar próxima sessão", accessUrl)}
                    <p style="margin:24px 0 0; font-size:13px; line-height:1.5; color:$TEXT_MUTED;">Se não pediu este link, pode ignorar este email.</p>
                """.trimIndent(),
            ),
        )
    } else {
        EmailContent(
            subject = "Access your Iara Gouveia pack",
            body = """
                Hi $customerName,

                Use this secure link to book your next pack session:
                $accessUrl

                The link expires in $expiresInMinutes minutes.
            """.trimIndent(),
            htmlBody = htmlDocument(
                lang = "en",
                title = "Access your pack",
                bodyHtml = """
                    <h1 style="$headingStyle">Access your pack</h1>
                    <p style="$paragraphStyle">Hi ${escapeHtml(customerName)}, use the button below to book the next session included in your pack.</p>
                    ${detailsCard(listOf("Secure link" to "Valid for $expiresInMinutes minutes"))}
                    ${ctaButton("Book next session", accessUrl)}
                    <p style="margin:24px 0 0; font-size:13px; line-height:1.5; color:$TEXT_MUTED;">If you did not request this link, you can safely ignore this email.</p>
                """.trimIndent(),
            ),
        )
    }

    /** Always English: single internal recipient list, not tied to any customer's locale. */
    fun newReservationAlert(reservation: Reservation, zoneId: ZoneId, adminUrl: String): EmailContent {
        val whenText = formatDateTime(reservation, zoneId, Locale.forLanguageTag("en-US"))
        val reviewUrl = "$adminUrl/reservations/${urlEncode(reservation.id.toString())}"

        val rows = buildList {
            add("Service" to "${escapeHtml(reservation.serviceName)} (${reservation.durationMinutes} min)")
            add("When" to whenText)
            add("Customer" to escapeHtml(reservation.customer.name))
            add("Email" to escapeHtml(reservation.customer.email))
            reservation.customer.phone?.let { add("Phone" to escapeHtml(it)) }
            add("Notes" to escapeHtml(reservation.notes ?: "-"))
        }

        return EmailContent(
            subject = "New booking: ${reservation.serviceName} on $whenText",
            body = """
                A new reservation was just requested.

                Service: ${reservation.serviceName} (${reservation.durationMinutes} min)
                When: $whenText
                Customer: ${reservation.customer.name} <${reservation.customer.email}>${reservation.customer.phone?.let { ", $it" } ?: ""}
                Notes: ${reservation.notes ?: "-"}

                Review it here: $reviewUrl
            """.trimIndent(),
            htmlBody = htmlDocument(
                lang = "en",
                title = "New booking request",
                bodyHtml = """
                    <h1 style="$headingStyle">New booking request</h1>
                    <p style="$paragraphStyle">A new reservation was just requested.</p>
                    ${detailsCard(rows)}
                    ${ctaButton("Review this booking", reviewUrl)}
                """.trimIndent(),
            ),
        )
    }

    /** Matches the language the customer booked in. Null if the status isn't a customer-facing decision. */
    fun reservationDecision(
        reservation: Reservation,
        zoneId: ZoneId,
        businessPhone: String = "",
        businessAddress: String = "",
    ): EmailContent? {
        val locale = when (reservation.locale) {
            ReservationLocale.PT -> Locale.forLanguageTag("pt-PT")
            ReservationLocale.EN -> Locale.forLanguageTag("en-US")
        }
        val whenText = formatDateTime(reservation, zoneId, locale)

        return when (reservation.status) {
            ReservationStatus.CONFIRMED -> confirmed(
                reservation,
                whenText,
                businessPhone.trim(),
                businessAddress.trim(),
            )
            ReservationStatus.REJECTED -> rejected(reservation, whenText)
            ReservationStatus.CANCELLED -> cancelled(reservation, whenText)
            else -> null
        }
    }

    fun reservationRescheduled(
        previous: Reservation,
        updated: Reservation,
        zoneId: ZoneId,
    ): EmailContent {
        val locale = when (updated.locale) {
            ReservationLocale.PT -> Locale.forLanguageTag("pt-PT")
            ReservationLocale.EN -> Locale.forLanguageTag("en-US")
        }
        val previousWhen = formatDateTime(previous, zoneId, locale)
        val newWhen = formatDateTime(updated, zoneId, locale)
        val pending = updated.status == ReservationStatus.PENDING

        return when (updated.locale) {
            ReservationLocale.PT -> EmailContent(
                subject = "A sua marcação foi reagendada",
                body = """
                    Olá ${updated.customer.name},

                    A sua marcação de ${updated.serviceName} foi reagendada.

                    Data anterior: $previousWhen
                    Nova data: $newWhen

                    ${if (pending) "O pedido continua a aguardar confirmação." else "A sua marcação continua confirmada."}

                    Se esta nova data não for conveniente, contacte-nos.
                    Iara Gouveia
                """.trimIndent(),
                htmlBody = htmlDocument(
                    lang = "pt",
                    title = "A sua marcação foi reagendada",
                    bodyHtml = """
                        <h1 style="$headingStyle">A sua marcação foi reagendada</h1>
                        <p style="$paragraphStyle">Olá ${escapeHtml(updated.customer.name)}, alterámos a data da sua sessão de <strong>${escapeHtml(updated.serviceName)}</strong>.</p>
                        ${detailsCard(listOf("Data anterior" to previousWhen, "Nova data" to newWhen))}
                        <p style="$paragraphStyle">${if (pending) "O pedido continua a aguardar confirmação." else "A sua marcação continua confirmada."}</p>
                        <p style="$paragraphStyle; margin:0;">Se esta nova data não for conveniente, contacte-nos.</p>
                    """.trimIndent(),
                ),
            )
            ReservationLocale.EN -> EmailContent(
                subject = "Your booking has been rescheduled",
                body = """
                    Hi ${updated.customer.name},

                    Your ${updated.serviceName} booking has been rescheduled.

                    Previous time: $previousWhen
                    New time: $newWhen

                    ${if (pending) "Your request is still awaiting confirmation." else "Your booking remains confirmed."}

                    Please contact us if the new time does not work for you.
                    Iara Gouveia
                """.trimIndent(),
                htmlBody = htmlDocument(
                    lang = "en",
                    title = "Your booking has been rescheduled",
                    bodyHtml = """
                        <h1 style="$headingStyle">Your booking has been rescheduled</h1>
                        <p style="$paragraphStyle">Hi ${escapeHtml(updated.customer.name)}, we changed the time of your <strong>${escapeHtml(updated.serviceName)}</strong> session.</p>
                        ${detailsCard(listOf("Previous time" to previousWhen, "New time" to newWhen))}
                        <p style="$paragraphStyle">${if (pending) "Your request is still awaiting confirmation." else "Your booking remains confirmed."}</p>
                        <p style="$paragraphStyle; margin:0;">Please contact us if the new time does not work for you.</p>
                    """.trimIndent(),
                ),
            )
        }
    }

    fun reservationCompleted(
        reservation: Reservation,
        googleReviewUrl: String,
        personalDiscount: CreatedDiscount? = null,
        websiteUrl: String = "",
    ): EmailContent {
        val portuguese = reservation.locale == ReservationLocale.PT
        val reviewText = googleReviewUrl.takeIf(String::isNotBlank)?.let {
            if (portuguese) {
                "\n\nSe gostou da sua visita, pode ajudar-nos a crescer partilhando a sua experiência no Google. " +
                    "O seu apoio faz uma grande diferença para o nosso pequeno negócio e ajuda mais pessoas a conhecer o nosso trabalho." +
                    "\n\nAjudar a Iara Gouveia a crescer: $it"
            } else {
                "\n\nIf you enjoyed your visit, you can help us grow by sharing your experience on Google. " +
                    "Your support makes a real difference to our small business and helps more people discover our work." +
                    "\n\nHelp Iara Gouveia grow: $it"
            }
        }.orEmpty()
        val reviewHtml = googleReviewUrl.takeIf(String::isNotBlank)?.let {
            val message = if (portuguese) {
                "Se gostou da sua visita, pode ajudar-nos a crescer partilhando a sua experiência no Google. O seu apoio faz uma grande diferença para o nosso pequeno negócio e ajuda mais pessoas a conhecer o nosso trabalho."
            } else {
                "If you enjoyed your visit, you can help us grow by sharing your experience on Google. Your support makes a real difference to our small business and helps more people discover our work."
            }
            """
                <p style="$paragraphStyle">$message</p>
                ${ctaButton(if (portuguese) "Ajudar a Iara Gouveia a crescer" else "Help Iara Gouveia grow", it)}
            """.trimIndent()
        }.orEmpty()
        val discountSection = personalDiscount?.let { completionDiscountSection(it, portuguese, websiteUrl) }
        return when (reservation.locale) {
            ReservationLocale.PT -> EmailContent(
                subject = "Ajude-nos a crescer",
                body = """
                    Olá ${reservation.customer.name},

                    Obrigada por escolher a Iara Gouveia para a sua sessão de ${reservation.serviceName}.

                    Esperamos que tenha desfrutado da experiência.$reviewText${discountSection?.first.orEmpty()}

                    Com carinho,
                    Iara Gouveia
                """.trimIndent(),
                htmlBody = htmlDocument(
                    lang = "pt",
                    title = "Ajude-nos a crescer",
                    bodyHtml = """
                        <h1 style="$headingStyle">Ajude-nos a crescer</h1>
                        <p style="$paragraphStyle">Olá ${escapeHtml(reservation.customer.name)}, obrigada por escolher a Iara Gouveia para a sua sessão de <strong>${escapeHtml(reservation.serviceName)}</strong>.</p>
                        <p style="$paragraphStyle">Esperamos que tenha desfrutado da experiência.</p>
                        $reviewHtml
                        ${discountSection?.second.orEmpty()}
                        <p style="$paragraphStyle; margin:0;">Com carinho,<br><strong>Iara Gouveia</strong></p>
                    """.trimIndent(),
                ),
            )
            ReservationLocale.EN -> EmailContent(
                subject = "Help us grow",
                body = """
                    Hi ${reservation.customer.name},

                    Thank you for choosing Iara Gouveia for your ${reservation.serviceName} session.

                    We hope you enjoyed your experience.$reviewText${discountSection?.first.orEmpty()}

                    With care,
                    Iara Gouveia
                """.trimIndent(),
                htmlBody = htmlDocument(
                    lang = "en",
                    title = "Help us grow",
                    bodyHtml = """
                        <h1 style="$headingStyle">Help us grow</h1>
                        <p style="$paragraphStyle">Hi ${escapeHtml(reservation.customer.name)}, thank you for choosing Iara Gouveia for your <strong>${escapeHtml(reservation.serviceName)}</strong> session.</p>
                        <p style="$paragraphStyle">We hope you enjoyed your experience.</p>
                        $reviewHtml
                        ${discountSection?.second.orEmpty()}
                        <p style="$paragraphStyle; margin:0;">With care,<br><strong>Iara Gouveia</strong></p>
                    """.trimIndent(),
                ),
            )
        }
    }

    private fun completionDiscountSection(
        created: CreatedDiscount,
        portuguese: Boolean,
        websiteUrl: String,
    ): Pair<String, String> {
        val discount = created.discount
        val code = requireNotNull(created.generatedCode)
        val benefit = formatDiscountBenefit(discount)
        val expires = discount.endsAt.format(
            DateTimeFormatter.ofPattern("dd MMM yyyy", if (portuguese) Locale.forLanguageTag("pt-PT") else Locale.ENGLISH),
        )
        val scope = if (discount.scope == DiscountScope.ALL_SERVICES) {
            if (portuguese) "qualquer sessão individual" else "any individual session"
        } else if (portuguese) "outra sessão deste serviço" else "another session of this service"
        val text = if (portuguese) """

            Temos também uma oferta para a sua próxima visita: $benefit de desconto em $scope.
            Código pessoal: $code
            Válido até: $expires
            Utilização única e associado ao seu endereço de email.
            Marcar: $websiteUrl
        """.trimIndent() else """

            We also have something for your next visit: $benefit off $scope.
            Personal code: $code
            Valid until: $expires
            One-time use and tied to your email address.
            Book: $websiteUrl
        """.trimIndent()
        val html = if (portuguese) """
            <h2 style="$subheadingStyle">Uma oferta para a sua próxima visita</h2>
            <p style="$paragraphStyle">Use o seu desconto pessoal de <strong>${escapeHtml(benefit)}</strong> em ${escapeHtml(scope)}.</p>
            ${detailsCard(listOf("Código pessoal" to escapeHtml(code), "Validade" to escapeHtml(expires), "Utilização" to "Única"))}
            ${websiteUrl.takeIf(String::isNotBlank)?.let { ctaButton("Marcar uma sessão", it) }.orEmpty()}
        """.trimIndent() else """
            <h2 style="$subheadingStyle">Something for your next visit</h2>
            <p style="$paragraphStyle">Use your personal <strong>${escapeHtml(benefit)}</strong> discount on ${escapeHtml(scope)}.</p>
            ${detailsCard(listOf("Personal code" to escapeHtml(code), "Valid until" to escapeHtml(expires), "Usage" to "One time"))}
            ${websiteUrl.takeIf(String::isNotBlank)?.let { ctaButton("Book a session", it) }.orEmpty()}
        """.trimIndent()
        return text to html
    }

    private fun formatDiscountBenefit(discount: Discount): String = when (discount.valueType) {
        DiscountValueType.PERCENTAGE -> "${java.math.BigDecimal(discount.valueAmount).movePointLeft(2).stripTrailingZeros().toPlainString()}%"
        DiscountValueType.FIXED_AMOUNT -> String.format(Locale.US, "€%.2f", discount.valueAmount / 100.0)
    }

    fun personalDiscount(
        recipient: DiscountRecipient,
        discount: Discount,
        code: String,
        websiteUrl: String,
    ): EmailContent {
        val portuguese = recipient.locale.equals("pt", ignoreCase = true)
        val benefit = when (discount.valueType) {
            DiscountValueType.PERCENTAGE -> "${discount.valueAmount / 100.0}%"
            DiscountValueType.FIXED_AMOUNT -> String.format(Locale.US, "€%.2f", discount.valueAmount / 100.0)
        }
        val scope = if (discount.scope == DiscountScope.ALL_SERVICES) {
            if (portuguese) "qualquer sessão individual" else "any individual session"
        } else if (portuguese) "sessões individuais selecionadas" else "selected individual sessions"
        val uses = if (discount.maxUsesPerCustomer == 1) {
            if (portuguese) "Utilização única" else "One-time use"
        } else if (portuguese) "Até ${discount.maxUsesPerCustomer} utilizações" else "Up to ${discount.maxUsesPerCustomer} uses"
        val expires = discount.endsAt.format(DateTimeFormatter.ofPattern("dd MMM yyyy", if (portuguese) Locale.forLanguageTag("pt-PT") else Locale.ENGLISH))
        val button = websiteUrl.takeIf(String::isNotBlank)?.let {
            ctaButton(if (portuguese) "Marcar uma sessão" else "Book a session", it)
        }.orEmpty()
        return if (portuguese) EmailContent(
            subject = "Um desconto pessoal para a sua próxima visita",
            body = """
                Olá ${recipient.name},

                Preparámos um desconto pessoal de $benefit para $scope.

                Código: $code
                Validade: até $expires
                $uses. Este código está associado ao seu endereço de email.

                Marcar: $websiteUrl
                Iara Gouveia
            """.trimIndent(),
            htmlBody = htmlDocument(
                lang = "pt",
                title = "O seu desconto pessoal",
                bodyHtml = """
                    <h1 style="$headingStyle">Um presente para a sua próxima visita</h1>
                    <p style="$paragraphStyle">Olá ${escapeHtml(recipient.name)}, preparámos um desconto pessoal de <strong>${escapeHtml(benefit)}</strong> para ${escapeHtml(scope)}.</p>
                    ${detailsCard(listOf("Código" to escapeHtml(code), "Validade" to escapeHtml(expires), "Utilização" to escapeHtml(uses)))}
                    <p style="$paragraphStyle">Introduza este código durante a marcação com o endereço de email onde recebeu esta mensagem.</p>
                    $button
                """.trimIndent(),
            ),
        ) else EmailContent(
            subject = "A personal discount for your next visit",
            body = """
                Hi ${recipient.name},

                We have prepared a personal $benefit discount for $scope.

                Code: $code
                Valid until: $expires
                $uses. This code is tied to your email address.

                Book: $websiteUrl
                Iara Gouveia
            """.trimIndent(),
            htmlBody = htmlDocument(
                lang = "en",
                title = "Your personal discount",
                bodyHtml = """
                    <h1 style="$headingStyle">A little something for your next visit</h1>
                    <p style="$paragraphStyle">Hi ${escapeHtml(recipient.name)}, we have prepared a personal <strong>${escapeHtml(benefit)}</strong> discount for ${escapeHtml(scope)}.</p>
                    ${detailsCard(listOf("Code" to escapeHtml(code), "Valid until" to escapeHtml(expires), "Usage" to escapeHtml(uses)))}
                    <p style="$paragraphStyle">Enter this code during booking using the email address where you received this message.</p>
                    $button
                """.trimIndent(),
            ),
        )
    }

    private fun cancelled(reservation: Reservation, whenText: String): EmailContent {
        val name = reservation.customer.name
        val message = reservation.cancellationMessage ?: when (reservation.locale) {
            ReservationLocale.PT -> "Infelizmente, foi necessário cancelar a sua reserva."
            ReservationLocale.EN -> "Unfortunately, we had to cancel your booking."
        }
        val rows = listOf("Service" to escapeHtml(reservation.serviceName), "When" to whenText)

        return when (reservation.locale) {
            ReservationLocale.PT -> EmailContent(
                subject = "A sua reserva foi cancelada",
                body = """
                    Olá $name,

                    A sua reserva foi cancelada:

                    Serviço: ${reservation.serviceName}
                    Data: $whenText

                    Motivo: $message

                    Contacte-nos se desejar ajuda a marcar outro horário.
                    Iara Gouveia
                """.trimIndent(),
                htmlBody = htmlDocument(
                    lang = "pt",
                    title = "A sua reserva foi cancelada",
                    bodyHtml = """
                        <h1 style="$headingStyle">A sua reserva foi cancelada</h1>
                        <p style="$paragraphStyle">Olá ${escapeHtml(name)}, infelizmente foi necessário cancelar a sua reserva:</p>
                        ${detailsCard(listOf("Serviço" to rows[0].second, "Data" to rows[1].second))}
                        <p style="$paragraphStyle"><strong>Motivo:</strong><br />${escapeHtml(message)}</p>
                        <p style="$paragraphStyle; margin:0;">Contacte-nos se desejar ajuda a marcar outro horário.</p>
                    """.trimIndent(),
                ),
            )
            ReservationLocale.EN -> EmailContent(
                subject = "Your booking has been cancelled",
                body = """
                    Hi $name,

                    Your booking has been cancelled:

                    Service: ${reservation.serviceName}
                    When: $whenText

                    Reason: $message

                    Please contact us if you would like help booking another time.
                    Iara Gouveia
                """.trimIndent(),
                htmlBody = htmlDocument(
                    lang = "en",
                    title = "Your booking has been cancelled",
                    bodyHtml = """
                        <h1 style="$headingStyle">Your booking has been cancelled</h1>
                        <p style="$paragraphStyle">Hi ${escapeHtml(name)}, unfortunately we had to cancel your booking:</p>
                        ${detailsCard(rows)}
                        <p style="$paragraphStyle"><strong>Reason:</strong><br />${escapeHtml(message)}</p>
                        <p style="$paragraphStyle; margin:0;">Please contact us if you would like help booking another time.</p>
                    """.trimIndent(),
                ),
            )
        }
    }

    private fun confirmed(
        reservation: Reservation,
        whenText: String,
        businessPhone: String,
        businessAddress: String,
    ): EmailContent {
        val name = reservation.customer.name
        val address = businessAddress.takeIf(String::isNotBlank)
        val googleMapsUrl = address?.let { mapsUrl("https://www.google.com/maps/search/?api=1&query=", it) }
        val appleMapsUrl = address?.let { mapsUrl("https://maps.apple.com/?q=", it) }
        val rows = buildList {
            add("Service" to escapeHtml(reservation.serviceName))
            add("When" to whenText)
            address?.let { add("Location" to escapeHtml(it)) }
        }
        val portuguesePhone = businessPhone.takeIf(String::isNotBlank)?.let { " para ${it}" }.orEmpty()
        val englishPhone = businessPhone.takeIf(String::isNotBlank)?.let { " on ${it}" }.orEmpty()
        val portugueseLocationLines = address?.let {
            listOf(
                "",
                "Local: $it",
                "Google Maps: $googleMapsUrl",
                "Apple Maps: $appleMapsUrl",
                "",
                "Adicionar ao calendário",
                "A sua aplicação de email pode mostrar uma opção para adicionar ou aceitar esta marcação. Se não aparecer, abra o ficheiro by-iara-marcacao.ics em anexo.",
            )
        }.orEmpty()
        val englishLocationLines = address?.let {
            listOf(
                "",
                "Location: $it",
                "Google Maps: $googleMapsUrl",
                "Apple Maps: $appleMapsUrl",
                "",
                "Add to your calendar",
                "Your email app may show an option to add or accept this appointment. If it does not, open the attached by-iara-appointment.ics file.",
            )
        }.orEmpty()
        val portugueseLocationHtml = address?.let {
            locationAndCalendarHtml(
                heading = "Local",
                address = it,
                googleMapsUrl = requireNotNull(googleMapsUrl),
                appleMapsUrl = requireNotNull(appleMapsUrl),
                calendarHeading = "Adicionar ao calendário",
                calendarCopy = "A sua aplicação de email pode mostrar uma opção para adicionar ou aceitar esta marcação. Se não aparecer, abra o ficheiro <strong>by-iara-marcacao.ics</strong> em anexo.",
            )
        }.orEmpty()
        val englishLocationHtml = address?.let {
            locationAndCalendarHtml(
                heading = "Location",
                address = it,
                googleMapsUrl = requireNotNull(googleMapsUrl),
                appleMapsUrl = requireNotNull(appleMapsUrl),
                calendarHeading = "Add to your calendar",
                calendarCopy = "Your email app may show an option to add or accept this appointment. If it does not, open the attached <strong>by-iara-appointment.ics</strong> file.",
            )
        }.orEmpty()
        return when (reservation.locale) {
            ReservationLocale.PT -> EmailContent(
                subject = "A sua reserva foi confirmada",
                body = (listOf(
                    "Olá $name,",
                    "",
                    "A sua reserva está confirmada:",
                    "",
                    "Serviço: ${reservation.serviceName}",
                    "Data: $whenText",
                ) + portugueseLocationLines + listOf(
                    "",
                    "Saúde e segurança",
                    "Se tiver uma lesão, condição de saúde, gravidez, cirurgia recente, medicação, alergia ou outra questão que possa afetar a massagem, terá de nos telefonar antes da marcação$portuguesePhone. Não envie dados de saúde por email nem através das notas do website.",
                    "",
                    "Cancelamentos",
                    "Comunique qualquer cancelamento ou reagendamento com pelo menos 24 horas de antecedência. O primeiro cancelamento tardio não tem penalização; em caso de cancelamentos tardios repetidos, pode ser exigido um sinal de €15, deduzido ao preço da sessão.",
                    "",
                    "Até breve!",
                    "Iara Gouveia",
                )).joinToString("\n"),
                htmlBody = htmlDocument(
                    lang = "pt",
                    title = "A sua reserva foi confirmada",
                    bodyHtml = """
                        <h1 style="$headingStyle">A sua reserva foi confirmada</h1>
                        <p style="$paragraphStyle">Olá ${escapeHtml(name)}, a sua marcação está confirmada &mdash; seguem os detalhes:</p>
                        ${detailsCard(
                            rows.mapIndexed { index, row ->
                                (if (index == 0) "Serviço" else if (index == 1) "Data" else "Local") to row.second
                            },
                            fullWidthLabels = setOf("Local"),
                        )}
                        $portugueseLocationHtml
                        <h2 style="$subheadingStyle">Saúde e segurança</h2>
                        <p style="$paragraphStyle">Se tiver uma lesão, condição de saúde, gravidez, cirurgia recente, medicação, alergia ou outra questão que possa afetar a massagem, terá de nos telefonar antes da marcação${escapeHtml(portuguesePhone)}. Não envie dados de saúde por email nem através das notas do website.</p>
                        <h2 style="$subheadingStyle">Cancelamentos</h2>
                        <p style="$paragraphStyle">Comunique qualquer cancelamento ou reagendamento com pelo menos 24 horas de antecedência. O primeiro cancelamento tardio não tem penalização; em caso de cancelamentos tardios repetidos, pode ser exigido um sinal de €15, deduzido ao preço da sessão.</p>
                        <p style="$paragraphStyle; margin:0;">Até breve!</p>
                    """.trimIndent(),
                ),
            )
            ReservationLocale.EN -> EmailContent(
                subject = "Your booking is confirmed",
                body = (listOf(
                    "Hi $name,",
                    "",
                    "Your booking is confirmed:",
                    "",
                    "Service: ${reservation.serviceName}",
                    "When: $whenText",
                ) + englishLocationLines + listOf(
                    "",
                    "Health and safety",
                    "If you have an injury, health condition, pregnancy, recent surgery, medication, allergy, or another concern that may affect your massage, you must call us before your appointment$englishPhone. Do not send health information by email or through the website notes.",
                    "",
                    "Cancellations",
                    "Please cancel or reschedule at least 24 hours in advance. The first late cancellation has no penalty; repeated late cancellations may require a €15 deposit, deducted from the session price.",
                    "",
                    "See you soon!",
                    "Iara Gouveia",
                )).joinToString("\n"),
                htmlBody = htmlDocument(
                    lang = "en",
                    title = "Your booking is confirmed",
                    bodyHtml = """
                        <h1 style="$headingStyle">Your booking is confirmed</h1>
                        <p style="$paragraphStyle">Hi ${escapeHtml(name)}, your appointment is set &mdash; here are the details:</p>
                        ${detailsCard(rows, fullWidthLabels = setOf("Location"))}
                        $englishLocationHtml
                        <h2 style="$subheadingStyle">Health and safety</h2>
                        <p style="$paragraphStyle">If you have an injury, health condition, pregnancy, recent surgery, medication, allergy, or another concern that may affect your massage, you must call us before your appointment${escapeHtml(englishPhone)}. Do not send health information by email or through the website notes.</p>
                        <h2 style="$subheadingStyle">Cancellations</h2>
                        <p style="$paragraphStyle">Please cancel or reschedule at least 24 hours in advance. The first late cancellation has no penalty; repeated late cancellations may require a €15 deposit, deducted from the session price.</p>
                        <p style="$paragraphStyle; margin:0;">See you soon!</p>
                    """.trimIndent(),
                ),
            )
        }
    }

    private fun rejected(reservation: Reservation, whenText: String): EmailContent {
        val name = reservation.customer.name
        val rows = listOf("Service" to escapeHtml(reservation.serviceName), "When" to whenText)
        val rejectionMessage = reservation.rejectionMessage ?: return when (reservation.locale) {
            ReservationLocale.PT -> rejectedWithoutCustomMessage(reservation, whenText)
            ReservationLocale.EN -> rejectedWithoutCustomMessage(reservation, whenText)
        }
        return when (reservation.locale) {
            ReservationLocale.PT -> EmailContent(
                subject = "Não foi possível confirmar a sua reserva",
                body = """
                    Olá $name,

                    Infelizmente não foi possível confirmar o seu pedido de reserva:

                    Serviço: ${reservation.serviceName}
                    Data: $whenText

                    Motivo: $rejectionMessage

                    Por favor visite o site para escolher outro horário.
                    Iara Gouveia
                """.trimIndent(),
                htmlBody = htmlDocument(
                    lang = "pt",
                    title = "Não foi possível confirmar a sua reserva",
                    bodyHtml = """
                        <h1 style="$headingStyle">Não foi possível confirmar a sua reserva</h1>
                        <p style="$paragraphStyle">Olá ${escapeHtml(name)}, infelizmente não foi possível confirmar o seu pedido:</p>
                        ${detailsCard(listOf("Serviço" to rows[0].second, "Data" to rows[1].second))}
                        <p style="$paragraphStyle"><strong>Motivo:</strong><br />${escapeHtml(rejectionMessage)}</p>
                        <p style="$paragraphStyle; margin:0;">Por favor visite o site para escolher outro horário.</p>
                    """.trimIndent(),
                ),
            )
            ReservationLocale.EN -> EmailContent(
                subject = "We couldn't confirm your booking",
                body = """
                    Hi $name,

                    Unfortunately we couldn't confirm your booking request:

                    Service: ${reservation.serviceName}
                    When: $whenText

                    Reason: $rejectionMessage

                    Please visit the site to pick another time.
                    Iara Gouveia
                """.trimIndent(),
                htmlBody = htmlDocument(
                    lang = "en",
                    title = "We couldn't confirm your booking",
                    bodyHtml = """
                        <h1 style="$headingStyle">We couldn't confirm your booking</h1>
                        <p style="$paragraphStyle">Hi ${escapeHtml(name)}, unfortunately we couldn't confirm your booking request:</p>
                        ${detailsCard(rows)}
                        <p style="$paragraphStyle"><strong>Reason:</strong><br />${escapeHtml(rejectionMessage)}</p>
                        <p style="$paragraphStyle; margin:0;">Please visit the site to pick another time.</p>
                    """.trimIndent(),
                ),
            )
        }
    }

    /** Compatibility for historic/test reservations that predate persisted rejection messages. */
    private fun rejectedWithoutCustomMessage(reservation: Reservation, whenText: String): EmailContent {
        val fallback = when (reservation.locale) {
            ReservationLocale.PT -> "Não foi possível acomodar este pedido."
            ReservationLocale.EN -> "We were unable to accommodate this request."
        }
        return rejected(reservation.copy(rejectionMessage = fallback), whenText)
    }

    private fun formatDateTime(reservation: Reservation, zoneId: ZoneId, locale: Locale): String {
        val zoned = reservation.startsAt.atZoneSameInstant(zoneId)
        val datePart = zoned.format(DateTimeFormatter.ofLocalizedDate(FormatStyle.LONG).withLocale(locale))
        val timePart = zoned.format(DateTimeFormatter.ofLocalizedTime(FormatStyle.SHORT).withLocale(locale))
        return "$datePart, $timePart"
    }

    // Shared brand tokens, matching the website's theme.css.
    private const val DISPLAY_FONT = "Georgia, 'Times New Roman', serif"
    private const val BODY_FONT = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"
    private const val TEXT_PLUM = "#281219"
    private const val TEXT_MUTED = "#87757c"
    private const val SURFACE_TINTED = "#fff3f6"
    private const val BORDER_ROSE = "#f9dce4"
    private const val PAGE_BACKGROUND = "#f8f4f6"
    private const val PRIMARY = "#c04d68"

    private val headingStyle =
        "margin:0 0 16px 0; font-family:$DISPLAY_FONT; font-size:22px; line-height:1.3; font-weight:700; color:$TEXT_PLUM;"
    private val subheadingStyle =
        "margin:24px 0 8px 0; font-family:$DISPLAY_FONT; font-size:18px; line-height:1.4; font-weight:700; color:$TEXT_PLUM;"
    private val paragraphStyle = "margin:0 0 24px 0; font-size:16px; line-height:1.6; color:$TEXT_PLUM;"

    /**
     * Table-based, inline-styled layout (the email-safe way to do this -- Outlook desktop
     * ignores flexbox/grid and often strips <style> blocks). bodyHtml is the content-specific
     * part (heading, intro, details card, closing/button); this wraps it in the shared
     * logo header and footer chrome every email uses.
     */
    private fun htmlDocument(lang: String, title: String, bodyHtml: String): String = """
        <!DOCTYPE html>
        <html lang="$lang">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${escapeHtml(title)}</title>
        </head>
        <body style="margin:0; padding:0; background-color:$PAGE_BACKGROUND; font-family:$BODY_FONT;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:$PAGE_BACKGROUND; padding:32px 16px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background-color:#ffffff; border-radius:12px; border:1px solid #ded4d8;">
                  <tr>
                    <td style="padding:28px 40px; text-align:center; border-bottom:1px solid $BORDER_ROSE;">
                      <img src="cid:logo" width="200" height="56" alt="Iara Gouveia" style="display:block; width:200px; max-width:200px; height:auto; margin:0 auto; border:0;" />
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:32px 40px;">
                      $bodyHtml
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:18px 40px; text-align:center; background-color:$PAGE_BACKGROUND; border-radius:0 0 12px 12px;">
                      <span style="font-size:13px; color:$TEXT_MUTED;">Iara Gouveia</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
    """.trimIndent()

    /** Label/value rows in a rose-tinted rounded box. Values must already be HTML-escaped by the caller. */
    private fun detailsCard(
        rows: List<Pair<String, String>>,
        fullWidthLabels: Set<String> = emptySet(),
    ): String {
        val rowsHtml = rows.joinToString("\n") { (label, value) ->
            if (label in fullWidthLabels) {
                """
                <tr>
                  <td colspan="2" style="padding:12px 0 4px; border-top:1px solid $BORDER_ROSE;">
                    <span style="display:block; margin-bottom:4px; font-size:13px; text-transform:uppercase; letter-spacing:0.04em; color:$TEXT_MUTED;">$label</span>
                    <span style="display:block; font-size:15px; line-height:1.45; font-weight:600; color:$TEXT_PLUM; text-align:left;">$value</span>
                  </td>
                </tr>
                """.trimIndent()
            } else {
                """
                <tr>
                  <td style="padding:4px 12px 4px 0; font-size:13px; text-transform:uppercase; letter-spacing:0.04em; color:$TEXT_MUTED; white-space:nowrap;">$label</td>
                  <td style="padding:4px 0; font-size:15px; font-weight:600; color:$TEXT_PLUM; text-align:right;">$value</td>
                </tr>
                """.trimIndent()
            }
        }
        return """
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:$SURFACE_TINTED; border-radius:8px; margin-bottom:24px;">
              <tr>
                <td style="padding:20px 24px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    $rowsHtml
                  </table>
                </td>
              </tr>
            </table>
        """.trimIndent()
    }

    /** Bulletproof-ish email button: a table cell colored as the background, not CSS on the <a>. */
    private fun ctaButton(label: String, url: String): String = """
        <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:8px auto 0;">
          <tr>
            <td style="border-radius:8px; background-color:$PRIMARY;">
              <a href="${escapeHtml(url)}" style="display:inline-block; padding:12px 28px; font-family:$BODY_FONT; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none; border-radius:8px;">${escapeHtml(label)}</a>
            </td>
          </tr>
        </table>
    """.trimIndent()

    private fun locationAndCalendarHtml(
        heading: String,
        address: String,
        googleMapsUrl: String,
        appleMapsUrl: String,
        calendarHeading: String,
        calendarCopy: String,
    ): String = """
        <h2 style="$subheadingStyle">${escapeHtml(heading)}</h2>
        <p style="$paragraphStyle">
          ${escapeHtml(address)}<br />
          <a href="${escapeHtml(googleMapsUrl)}" style="color:$PRIMARY; font-weight:600;">Google Maps</a>
          &nbsp;&middot;&nbsp;
          <a href="${escapeHtml(appleMapsUrl)}" style="color:$PRIMARY; font-weight:600;">Apple Maps</a>
        </p>
        <h2 style="$subheadingStyle">${escapeHtml(calendarHeading)}</h2>
        <p style="$paragraphStyle">$calendarCopy</p>
    """.trimIndent()

    private fun mapsUrl(baseUrl: String, address: String): String =
        baseUrl + urlEncode("Iara Gouveia, $address")

    private fun urlEncode(value: String): String = URLEncoder.encode(value, StandardCharsets.UTF_8)

    /** Customer name/email/phone/notes are user-supplied -- never interpolate them into HTML unescaped. */
    private fun escapeHtml(text: String): String = text
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;")
        .replace("'", "&#39;")
}
