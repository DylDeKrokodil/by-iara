import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Alert, Button, PageHeader, TabOption, Tabs } from '@by-iara/shared-ui';
import { GuidesApi } from '../guides-api';
import { Guide, GuideImageType, GuideLocale } from '../guide.models';

const tabs: ReadonlyArray<TabOption> = [
  { label: 'Portuguese', value: 'pt-PT' },
  { label: 'English', value: 'en-US' },
];

@Component({
  selector: 'byiara-guide-preview',
  imports: [Alert, Button, PageHeader, Tabs],
  templateUrl: './guide-preview.html',
  styleUrl: './guide-preview.css',
})
export class GuidePreview implements OnInit {
  private readonly api = inject(GuidesApi);
  private readonly route = inject(ActivatedRoute);

  protected readonly guide = signal<Guide | null>(null);
  protected readonly locale = signal<GuideLocale>('pt-PT');
  protected readonly error = signal<string | null>(null);
  protected readonly tabs = tabs;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.api.get(id).subscribe({
      next: (guide) => this.guide.set(guide),
      error: () => this.error.set('Could not load the guide preview.'),
    });
  }

  protected setLocale(value: string): void {
    if (value === 'pt-PT' || value === 'en-US') this.locale.set(value);
  }

  protected imageUrl(type: GuideImageType): string | null {
    const guide = this.guide();
    if (!guide?.images[type]) return null;
    return guide.status === 'PUBLISHED'
      ? (guide.images[type]?.url ?? null)
      : `/api/admin/guides/${guide.id}/images/${type}`;
  }
}
