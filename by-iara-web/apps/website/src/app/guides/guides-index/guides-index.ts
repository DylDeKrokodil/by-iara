import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Alert, EmptyState, Skeleton } from '@by-iara/shared-ui';
import { LanguageService } from '../../i18n/language.service';
import { Guide, GuidesApi, GuideTranslation } from '../guides-api';
import { SeoService } from '../../seo/seo.service';

@Component({
  selector: 'byiara-guides-index',
  imports: [Alert, EmptyState, RouterLink, Skeleton],
  templateUrl: './guides-index.html',
  styleUrl: './guides-index.css',
})
export class GuidesIndex implements OnInit {
  private readonly api = inject(GuidesApi);
  private readonly seo = inject(SeoService);
  protected readonly language = inject(LanguageService);
  protected readonly copy = computed(() => this.language.messages().guides);
  protected readonly guides = signal<Guide[]>([]);
  protected readonly loading = signal(true);
  protected readonly hasError = signal(false);
  protected readonly skeletons = [0, 1, 2] as const;

  ngOnInit(): void {
    this.api.list(this.language.current().locale).subscribe({
      next: (guides) => {
        this.guides.set(guides);
        this.seo.updateGuidesStructuredData(guides);
        this.loading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.loading.set(false);
      },
    });
  }

  protected translation(guide: Guide): GuideTranslation {
    return guide.translations[this.language.current().locale];
  }

  protected link(guide: Guide): string[] {
    return this.language.localizedLink('guides', this.translation(guide).slug);
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat(this.language.current().locale, {
      dateStyle: 'medium',
    }).format(new Date(value));
  }
}
