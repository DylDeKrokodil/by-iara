import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ServicesApi } from '../services-api';
import { ServiceInput } from '../service.models';

@Component({
  selector: 'byiara-service-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './service-form.html',
  styleUrl: './service-form.css',
})
export class ServiceForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ServicesApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected serviceId: string | null = null;

  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
    active: [true],
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
        this.form.patchValue({
          name: service.name,
          description: service.description ?? '',
          active: service.active,
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
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    const raw = this.form.getRawValue();
    const input: ServiceInput = {
      name: raw.name,
      description: raw.description,
      active: raw.active,
      variants: raw.variants.map((variant) => ({
        durationMinutes: variant['durationMinutes'],
        priceCents: Math.round(variant['priceEuros'] * 100),
        active: variant['active'],
      })),
    };

    const id = this.serviceId;
    const request = id ? this.api.update(id, input) : this.api.create(input);

    request.subscribe({
      next: () => this.router.navigateByUrl('/services'),
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.error.set(
          err.status === 409
            ? 'A service with this name already exists.'
            : 'Could not save the service.',
        );
      },
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
      priceEuros: [value?.priceEuros ?? 0, [Validators.required, Validators.min(0)]],
      active: [value?.active ?? true],
    });
  }
}
