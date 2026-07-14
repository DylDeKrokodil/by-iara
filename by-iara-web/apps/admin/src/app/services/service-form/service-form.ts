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
import { Service, ServiceInput, ServiceLocale } from '../service.models';
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

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const languageTabs: ReadonlyArray<TabOption> = [
  { label: 'Portuguese (pt-PT)', value: 'ptPT' },
  { label: 'English (en-US)', value: 'enUS' },
];

function isTranslationFormKey(value: string): value is TranslationFormKey {
  return value === 'ptPT' || value === 'enUS';
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
  protected readonly languageTabs = languageTabs;
  protected serviceId: string | null = null;

  protected readonly form = this.fb.nonNullable.group({
    translations: this.fb.nonNullable.group({
      ptPT: this.translationGroup(true),
      enUS: this.translationGroup(false),
    }),
    active: [true],
    featured: [false],
    variants: this.fb.array([this.variantGroup()]),
  });

  get variants(): FormArray {
    return this.form.get('variants') as FormArray;
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
            },
            enUS: {
              slug: enTranslation.slug,
              name: enTranslation.name,
              description: enTranslation.description ?? '',
            },
          },
          active: service.active,
          featured: service.featured,
        });
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
      },
    };
    if (raw.translations.enUS['name'].trim()) {
      translations['en-US'] = {
        slug: raw.translations.enUS['slug'].trim() || undefined,
        name: raw.translations.enUS['name'],
        description: raw.translations.enUS['description'] || null,
      };
    }
    const input: ServiceInput = {
      name: translations['pt-PT'].name,
      description: translations['pt-PT'].description,
      active: raw.active,
      featured: raw.featured,
      translations,
      variants: raw.variants.map((variant) => ({
        durationMinutes: variant['durationMinutes'],
        priceCents: Math.round(variant['priceEuros'] * 100),
        active: variant['active'],
      })),
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

  private activateFirstInvalidLanguageTab(): void {
    if (this.form.get(['translations', 'ptPT'])?.invalid) {
      this.activeLanguageTab.set('ptPT');
      return;
    }

    if (this.form.get(['translations', 'enUS'])?.invalid) {
      this.activeLanguageTab.set('enUS');
    }
  }

  private translationFor(
    service: Service,
    locale: ServiceLocale,
    fallbackToBase: boolean,
  ): { slug: string; name: string; description: string | null } {
    return (
      service.translations?.[locale] ??
      (fallbackToBase
        ? {
            slug: service.slug,
            name: service.name,
            description: service.description,
          }
        : { slug: '', name: '', description: null })
    );
  }

  private translationGroup(
    required: boolean,
    value?: { slug: string; name: string; description: string | null },
  ): FormGroup {
    return this.fb.nonNullable.group({
      slug: [
        value?.slug ?? '',
        [Validators.maxLength(140), Validators.pattern(slugPattern)],
      ],
      name: [value?.name ?? '', required ? Validators.required : []],
      description: [value?.description ?? ''],
    });
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
}
