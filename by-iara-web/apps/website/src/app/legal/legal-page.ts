import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LanguageService } from '../i18n/language.service';
import {
  BOOKING_POLICY,
  BUSINESS_DETAILS,
  getBookingRetentionLabel,
  getLegalFormLabel,
  getWhatsAppHref,
  isBusinessDetailMissing,
  REQUIRED_LEGAL_DETAIL_KEYS,
} from './business-details';
import { LEGAL_CONTENT, LegalDocumentKey } from './legal-content';

interface DetailRow {
  readonly label: string;
  readonly value: string;
  readonly missing: boolean;
  readonly href?: string;
  readonly opensNewWindow?: boolean;
}

@Component({
  selector: 'byiara-legal-page',
  imports: [],
  templateUrl: './legal-page.html',
  styleUrl: './legal-page.css',
})
export class LegalPage {
  private readonly route = inject(ActivatedRoute);
  protected readonly language = inject(LanguageService);

  protected readonly documentKey = this.route.snapshot.data[
    'legalDocument'
  ] as LegalDocumentKey;
  protected readonly content = computed(
    () => LEGAL_CONTENT[this.language.current().locale][this.documentKey],
  );
  protected readonly opensNewWindow = computed(() =>
    this.language.current().locale === 'pt-PT'
      ? 'abre numa nova janela'
      : 'opens in a new window',
  );
  protected readonly hasMissingDetails = computed(() =>
    [
      ...REQUIRED_LEGAL_DETAIL_KEYS,
      ...(this.documentKey === 'privacy'
        ? (['bookingRetention'] as const)
        : []),
    ].some(isBusinessDetailMissing),
  );

  protected readonly detailRows = computed<readonly DetailRow[]>(() => {
    const portuguese = this.language.current().locale === 'pt-PT';
    const missingValue = this.content().missingValue;
    const address = BUSINESS_DETAILS.registeredAddress.join(', ');
    const paymentLabels = portuguese
      ? {
          cash: 'Numerário',
          mbWay: 'MB WAY',
          bankTransfer: 'Transferência bancária',
        }
      : { cash: 'Cash', mbWay: 'MB WAY', bankTransfer: 'Bank transfer' };
    const payments = BUSINESS_DETAILS.inPersonPaymentMethods
      .map((method) => paymentLabels[method])
      .join(', ');

    const rows: DetailRow[] = [
      this.row(
        portuguese ? 'Nome legal' : 'Legal name',
        BUSINESS_DETAILS.legalName,
        missingValue,
      ),
      this.row(
        portuguese ? 'Forma jurídica' : 'Legal form',
        getLegalFormLabel(
          this.language.current().locale,
          BUSINESS_DETAILS.legalForm,
        ),
        missingValue,
      ),
      this.row('NIF/NIPC', BUSINESS_DETAILS.taxId, missingValue),
      this.row(
        portuguese ? 'Sede / morada registada' : 'Registered address',
        address,
        missingValue,
      ),
      this.row(
        'Email',
        BUSINESS_DETAILS.email,
        missingValue,
        this.mailto(BUSINESS_DETAILS.email),
      ),
      this.row(
        portuguese ? 'Contacto de privacidade' : 'Privacy contact',
        BUSINESS_DETAILS.privacyEmail,
        missingValue,
        this.mailto(BUSINESS_DETAILS.privacyEmail),
      ),
      this.row(
        'WhatsApp',
        BUSINESS_DETAILS.phone,
        missingValue,
        getWhatsAppHref(BUSINESS_DETAILS.phone),
        true,
      ),
    ];

    if (this.documentKey === 'bookingTerms') {
      rows.push(
        this.row(
          portuguese
            ? 'Meios de pagamento presencial'
            : 'In-person payment methods',
          payments,
          missingValue,
        ),
        this.row(
          portuguese ? 'Antecedência para cancelamento' : 'Cancellation notice',
          portuguese
            ? `${BOOKING_POLICY.cancellationNoticeHours} horas`
            : `${BOOKING_POLICY.cancellationNoticeHours} hours`,
          missingValue,
        ),
        this.row(
          portuguese
            ? 'Cancelamentos tardios repetidos'
            : 'Repeated late cancellations',
          portuguese
            ? `Pode ser exigido um sinal de ${this.formatEuros(BOOKING_POLICY.repeatedLateCancellationDepositCents)}, deduzido no preço da sessão`
            : `A ${this.formatEuros(BOOKING_POLICY.repeatedLateCancellationDepositCents)} deposit may be required and deducted from the session price`,
          missingValue,
        ),
      );
    }

    if (this.documentKey === 'privacy') {
      rows.push(
        this.row(
          portuguese
            ? 'Período operacional de conservação'
            : 'Operational retention period',
          getBookingRetentionLabel(
            this.language.current().locale,
            BUSINESS_DETAILS.bookingRetention,
          ),
          missingValue,
        ),
      );
    }

    if (this.documentKey === 'legalNotice') {
      rows.push(
        this.row(
          portuguese ? 'Entidade RAL' : 'ADR body',
          BUSINESS_DETAILS.adrEntityName,
          missingValue,
          BUSINESS_DETAILS.adrEntityUrl || undefined,
        ),
      );
    }

    return rows;
  });

  protected sectionId(index: number): string {
    return `legal-section-${index}`;
  }

  private row(
    label: string,
    value: string,
    missingValue: string,
    href?: string,
    opensNewWindow = false,
  ): DetailRow {
    const missing = value.trim().length === 0;
    return {
      label,
      value: missing ? missingValue : value,
      missing,
      href: missing ? undefined : href,
      opensNewWindow,
    };
  }

  private mailto(value: string): string | undefined {
    return value ? `mailto:${value}` : undefined;
  }

  private formatEuros(cents: number): string {
    return `€${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
  }
}
