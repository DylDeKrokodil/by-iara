import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ServicesApi } from '../services-api';
import {
  Service,
  ServiceFaq,
  ServiceInput,
  ServiceLocale,
  ServiceTranslation,
} from '../service.models';
import {
  Alert,
  Button,
  PageHeader,
  Switch,
  TabOption,
  Tabs,
  TextField,
  ToastService,
} from '@by-iara/shared-ui';

type TranslationFormKey = 'ptPT' | 'enUS';
type ContentFormTab = 'basics' | 'pageContent' | 'faqs';
interface PackOfferFormValue {
  durationMinutes: number;
  sessionCount: number;
  priceEuros: number;
  validityDays: number | null;
  active: boolean;
}

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const languageTabs: ReadonlyArray<TabOption> = [
  { label: 'Portuguese (pt-PT)', value: 'ptPT' },
  { label: 'English (en-US)', value: 'enUS' },
];

const contentTabs: ReadonlyArray<TabOption> = [
  { label: 'Basics', value: 'basics' },
  { label: 'Page content', value: 'pageContent' },
  { label: 'FAQs', value: 'faqs' },
];

function isTranslationFormKey(value: string): value is TranslationFormKey {
  return value === 'ptPT' || value === 'enUS';
}

function isContentFormTab(value: string): value is ContentFormTab {
  return value === 'basics' || value === 'pageContent' || value === 'faqs';
}

@Component({
  selector: 'byiara-service-form',
  imports: [
    ReactiveFormsModule,
    Alert,
    Button,
    PageHeader,
    Switch,
    Tabs,
    TextField,
  ],
  templateUrl: './service-form.html',
  styleUrl: './service-form.css',
})
export class ServiceForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ServicesApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly activeLanguageTab = signal<TranslationFormKey>('ptPT');
  protected readonly activeContentTab = signal<ContentFormTab>('basics');
  protected readonly languageTabs = languageTabs;
  protected readonly contentTabs = contentTabs;
  protected serviceId: string | null = null;

  protected readonly form = this.fb.nonNullable.group({
    translations: this.fb.nonNullable.group({
      ptPT: this.translationGroup(true),
      enUS: this.translationGroup(false),
    }),
    active: [true],
    featured: [false],
    sortOrder: [0, [Validators.min(0)]],
    variants: this.fb.array([this.variantGroup()]),
    packOffers: this.fb.array([]),
  });

  get variants(): FormArray {
    return this.form.get('variants') as FormArray;
  }

  get packOffers(): FormArray {
    return this.form.get('packOffers') as FormArray;
  }

  get editing(): boolean {
    return this.serviceId !== null;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      return;
    }

    this.serviceId = id;
    this.api.get(id).subscribe({
      next: (service) => {
        const ptTranslation = this.translationFor(service, 'pt-PT', true);
        const enTranslation = this.translationFor(service, 'en-US', false);
        this.form.patchValue({
          translations: {
            ptPT: {
              slug: ptTranslation.slug,
              name: ptTranslation.name,
              description: ptTranslation.description ?? '',
              treatmentDescription: ptTranslation.treatmentDescription ?? '',
              suitableFor: ptTranslation.suitableFor ?? '',
              sessionDescription: ptTranslation.sessionDescription ?? '',
            },
            enUS: {
              slug: enTranslation.slug,
              name: enTranslation.name,
              description: enTranslation.description ?? '',
              treatmentDescription: enTranslation.treatmentDescription ?? '',
              suitableFor: enTranslation.suitableFor ?? '',
              sessionDescription: enTranslation.sessionDescription ?? '',
            },
          },
          active: service.active,
          featured: service.featured,
          sortOrder: service.sortOrder,
        });
        this.setFaqs('ptPT', ptTranslation.faqs);
        this.setFaqs('enUS', enTranslation.faqs);
        this.variants.clear();
        service.variants.forEach((variant) =>
          this.variants.push(
            this.variantGroup({
              durationMinutes: variant.durationMinutes,
              priceEuros: variant.price.amountCents / 100,
              active: variant.active,
            }),
          ),
        );
        if (this.variants.length === 0) {
          this.variants.push(this.variantGroup());
        }
        this.packOffers.clear();
        service.packOffers.forEach((offer) =>
          this.packOffers.push(
            this.packOfferGroup({
              durationMinutes: offer.durationMinutes,
              sessionCount: offer.sessionCount,
              priceEuros: offer.price.amountCents / 100,
              validityDays: offer.validityDays,
              active: offer.active,
            }),
          ),
        );
      },
      error: () => this.error.set('Could not load the service.'),
    });
  }

  protected addVariant(): void {
    this.variants.push(this.variantGroup());
  }

  protected removeVariant(index: number): void {
    if (this.variants.length > 1) {
      this.variants.removeAt(index);
    }
  }

  protected addPackOffer(): void {
    const firstDuration = Number(
      this.variants.at(0)?.get('durationMinutes')?.value ?? 60,
    );
    this.packOffers.push(
      this.packOfferGroup({
        durationMinutes: firstDuration,
        sessionCount: 4,
        priceEuros: 0,
        validityDays: 365,
        active: true,
      }),
    );
  }

  protected removePackOffer(index: number): void {
    this.packOffers.removeAt(index);
  }

  protected faqsFor(key: TranslationFormKey): FormArray {
    return this.form.get(['translations', key, 'faqs']) as FormArray;
  }

  protected addFaq(key: TranslationFormKey): void {
    this.faqsFor(key).push(this.faqGroup());
  }

  protected removeFaq(key: TranslationFormKey, index: number): void {
    this.faqsFor(key).removeAt(index);
  }

  protected submit(): void {
    if (this.submitting()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.activateFirstInvalidLanguageTab();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    const raw = this.form.getRawValue();
    const translations: ServiceInput['translations'] = {
      'pt-PT': {
        slug: raw.translations.ptPT['slug'].trim() || undefined,
        name: raw.translations.ptPT['name'],
        description: raw.translations.ptPT['description'] || null,
        treatmentDescription:
          raw.translations.ptPT['treatmentDescription'] || null,
        suitableFor: raw.translations.ptPT['suitableFor'] || null,
        sessionDescription: raw.translations.ptPT['sessionDescription'] || null,
        faqs: raw.translations.ptPT['faqs'].map((faq: ServiceFaq) => ({
          question: faq['question'],
          answer: faq['answer'],
        })),
      },
    };
    if (raw.translations.enUS['name'].trim()) {
      translations['en-US'] = {
        slug: raw.translations.enUS['slug'].trim() || undefined,
        name: raw.translations.enUS['name'],
        description: raw.translations.enUS['description'] || null,
        treatmentDescription:
          raw.translations.enUS['treatmentDescription'] || null,
        suitableFor: raw.translations.enUS['suitableFor'] || null,
        sessionDescription: raw.translations.enUS['sessionDescription'] || null,
        faqs: raw.translations.enUS['faqs'].map((faq: ServiceFaq) => ({
          question: faq['question'],
          answer: faq['answer'],
        })),
      };
    }
    const input: ServiceInput = {
      name: translations['pt-PT'].name,
      description: translations['pt-PT'].description,
      active: raw.active,
      featured: raw.featured,
      sortOrder: Number(raw.sortOrder),
      translations,
      variants: raw.variants.map((variant) => ({
        durationMinutes: variant['durationMinutes'],
        priceCents: Math.round(variant['priceEuros'] * 100),
        active: variant['active'],
      })),
      packOffers: (raw.packOffers as PackOfferFormValue[]).map(
        (offer, index) => ({
          durationMinutes: Number(offer.durationMinutes),
          sessionCount: Number(offer.sessionCount),
          priceCents: Math.round(Number(offer.priceEuros) * 100),
          validityDays: offer.validityDays ? Number(offer.validityDays) : null,
          active: offer.active,
          sortOrder: index,
        }),
      ),
    };

    const id = this.serviceId;
    const request = id ? this.api.update(id, input) : this.api.create(input);

    request.subscribe({
      next: () => {
        const actionMsg = id ? 'updated' : 'created';
        this.toast.show(
          `Service "${input.name}" ${actionMsg} successfully.`,
          'success',
        );
        this.router.navigateByUrl('/services');
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        const errMsg =
          err.status === 409
            ? 'A service with this URL slug already exists.'
            : 'Could not save the service.';
        this.toast.show(errMsg, 'error');
        this.error.set(errMsg);
      },
    });
  }

  protected translationNameInvalid(key: TranslationFormKey): boolean {
    const control = this.form.get(['translations', key, 'name']);
    return !!control?.invalid && !!control?.touched;
  }

  protected translationSlugError(key: TranslationFormKey): string | null {
    const control = this.form.get(['translations', key, 'slug']);
    if (!control?.touched || !control.errors) {
      return null;
    }

    return control.hasError('maxlength')
      ? 'URL slug must be 140 characters or fewer'
      : 'Use lowercase letters, numbers, and single hyphens only';
  }

  protected setActiveLanguageTab(value: string): void {
    if (!isTranslationFormKey(value)) {
      return;
    }

    this.activeLanguageTab.set(value);
  }

  protected setActiveContentTab(value: string): void {
    if (isContentFormTab(value)) {
      this.activeContentTab.set(value);
    }
  }

  private activateFirstInvalidLanguageTab(): void {
    if (this.form.get(['translations', 'ptPT'])?.invalid) {
      this.activeLanguageTab.set('ptPT');
      this.activateInvalidContentTab('ptPT');
      return;
    }

    if (this.form.get(['translations', 'enUS'])?.invalid) {
      this.activeLanguageTab.set('enUS');
      this.activateInvalidContentTab('enUS');
    }
  }

  private activateInvalidContentTab(key: TranslationFormKey): void {
    const faqs = this.form.get(['translations', key, 'faqs']);
    this.activeContentTab.set(faqs?.invalid ? 'faqs' : 'basics');
  }

  private translationFor(
    service: Service,
    locale: ServiceLocale,
    fallbackToBase: boolean,
  ): ServiceTranslation {
    return (
      service.translations?.[locale] ??
      (fallbackToBase
        ? {
            slug: service.slug,
            name: service.name,
            description: service.description,
            treatmentDescription: null,
            suitableFor: null,
            sessionDescription: null,
            faqs: [],
          }
        : {
            slug: '',
            name: '',
            description: null,
            treatmentDescription: null,
            suitableFor: null,
            sessionDescription: null,
            faqs: [],
          })
    );
  }

  private translationGroup(
    required: boolean,
    value?: ServiceTranslation,
  ): FormGroup {
    return this.fb.nonNullable.group({
      slug: [
        value?.slug ?? '',
        [Validators.maxLength(140), Validators.pattern(slugPattern)],
      ],
      name: [value?.name ?? '', required ? Validators.required : []],
      description: [value?.description ?? ''],
      treatmentDescription: [value?.treatmentDescription ?? ''],
      suitableFor: [value?.suitableFor ?? ''],
      sessionDescription: [value?.sessionDescription ?? ''],
      faqs: this.fb.array((value?.faqs ?? []).map((faq) => this.faqGroup(faq))),
    });
  }

  private faqGroup(value?: ServiceFaq): FormGroup {
    return this.fb.nonNullable.group({
      question: [value?.question ?? '', Validators.required],
      answer: [value?.answer ?? '', Validators.required],
    });
  }

  private setFaqs(key: TranslationFormKey, faqs: ServiceFaq[]): void {
    const controls = this.faqsFor(key);
    controls.clear();
    faqs.forEach((faq) => controls.push(this.faqGroup(faq)));
  }

  private variantGroup(value?: {
    durationMinutes: number;
    priceEuros: number;
    active: boolean;
  }): FormGroup {
    return this.fb.nonNullable.group({
      durationMinutes: [
        value?.durationMinutes ?? 60,
        [Validators.required, Validators.min(1)],
      ],
      priceEuros: [
        value?.priceEuros ?? 0,
        [Validators.required, Validators.min(0)],
      ],
      active: [value?.active ?? true],
    });
  }

  private packOfferGroup(value?: {
    durationMinutes: number;
    sessionCount: number;
    priceEuros: number;
    validityDays: number | null;
    active: boolean;
  }): FormGroup {
    return this.fb.nonNullable.group({
      durationMinutes: [
        value?.durationMinutes ?? 60,
        [Validators.required, Validators.min(1)],
      ],
      sessionCount: [
        value?.sessionCount ?? 4,
        [Validators.required, Validators.min(2)],
      ],
      priceEuros: [
        value?.priceEuros ?? 0,
        [Validators.required, Validators.min(0.01)],
      ],
      validityDays: [value?.validityDays ?? 365, [Validators.min(1)]],
      active: [value?.active ?? true],
    });
  }
}
