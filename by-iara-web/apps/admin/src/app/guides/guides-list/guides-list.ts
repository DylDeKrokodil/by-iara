import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import {
  ActionMenu,
  ActionMenuItem,
  Alert,
  Button,
  ConfirmationModal,
  DataTable,
  DataTableColumn,
  EmptyState,
  PageHeader,
  SelectField,
  StatusChip,
  TextField,
  ToastService,
} from '@by-iara/shared-ui';
import { GuidesApi } from '../guides-api';
import {
  Guide,
  GuideInput,
  GuideSort,
  GuideStatus,
  GuideSortDirection,
  guideStatusLabel,
} from '../guide.models';
import { DataTableSort } from '@by-iara/shared-ui';

type StatusFilter = 'ALL' | GuideStatus;

const statusFilters: ReadonlyArray<{ label: string; value: StatusFilter }> = [
  { label: 'All statuses', value: 'ALL' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Published', value: 'PUBLISHED' },
  { label: 'Archived', value: 'ARCHIVED' },
];

const columns: ReadonlyArray<DataTableColumn> = [
  { key: 'selected', label: 'Select', fit: true },
  { key: 'TITLE', label: 'Guide', sortable: true },
  { key: 'STATUS', label: 'Status', sortable: true, fit: true },
  { key: 'PUBLISHED_AT', label: 'Published', sortable: true, fit: true },
  { key: 'UPDATED_AT', label: 'Updated', sortable: true, fit: true },
  { key: 'actions', label: 'Actions', fit: true },
];

@Component({
  selector: 'byiara-guides-list',
  imports: [
    ActionMenu,
    Alert,
    Button,
    ConfirmationModal,
    DataTable,
    EmptyState,
    PageHeader,
    ReactiveFormsModule,
    SelectField,
    StatusChip,
    TextField,
  ],
  templateUrl: './guides-list.html',
  styleUrl: './guides-list.css',
})
export class GuidesList implements OnInit {
  private readonly api = inject(GuidesApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private requestId = 0;

  protected readonly guides = signal<Guide[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly query = signal('');
  protected readonly status = signal<StatusFilter>('ALL');
  protected readonly sort = signal<GuideSort>('UPDATED_AT');
  protected readonly direction = signal<GuideSortDirection>('DESC');
  protected readonly selectedIds = signal<ReadonlySet<string>>(new Set());
  protected readonly archiveTargets = signal<Guide[]>([]);
  protected readonly hasFilters = computed(
    () => Boolean(this.query()) || this.status() !== 'ALL',
  );
  protected readonly allVisibleSelected = computed(
    () =>
      this.guides().length > 0 &&
      this.guides().every((guide) => this.selectedIds().has(guide.id)),
  );
  protected readonly selectedCount = computed(() => this.selectedIds().size);
  protected readonly statusFilters = statusFilters;
  protected readonly columns = columns;
  protected readonly guideStatusLabel = guideStatusLabel;

  @ViewChild('archiveModal') private archiveModal!: ConfirmationModal;

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((value) => {
        this.query.set(value.trim());
        this.reload();
      });
    this.reload();
  }

  protected reload(): void {
    const requestId = ++this.requestId;
    const status = this.status();
    this.loading.set(true);
    this.error.set(null);
    this.api
      .list({
        status: status === 'ALL' ? undefined : status,
        query: this.query() || undefined,
        sort: this.sort(),
        direction: this.direction(),
      })
      .subscribe({
        next: (guides) => {
          if (requestId !== this.requestId) return;
          this.guides.set(guides);
          this.selectedIds.set(new Set());
          this.loading.set(false);
        },
        error: () => {
          if (requestId !== this.requestId) return;
          this.error.set('Could not load guides.');
          this.loading.set(false);
        },
      });
  }

  protected setStatus(value: string): void {
    if (!['ALL', 'DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(value)) return;
    this.status.set(value as StatusFilter);
    this.reload();
  }

  protected clearFilters(): void {
    this.searchControl.setValue('', { emitEvent: false });
    this.query.set('');
    this.status.set('ALL');
    this.reload();
  }

  protected onSortChange(sort: DataTableSort): void {
    if (!['UPDATED_AT', 'PUBLISHED_AT', 'TITLE', 'STATUS'].includes(sort.key)) {
      return;
    }
    this.sort.set(sort.key as GuideSort);
    this.direction.set(sort.direction === 'asc' ? 'ASC' : 'DESC');
    this.reload();
  }

  protected toggleGuide(id: string, checked: boolean): void {
    const selected = new Set(this.selectedIds());
    if (checked) selected.add(id);
    else selected.delete(id);
    this.selectedIds.set(selected);
  }

  protected toggleAll(checked: boolean): void {
    this.selectedIds.set(
      checked ? new Set(this.guides().map((guide) => guide.id)) : new Set(),
    );
  }

  protected updateSelectedStatus(status: GuideStatus): void {
    const ids = [...this.selectedIds()];
    if (!ids.length) return;
    this.api.updateStatus(ids, status).subscribe({
      next: () => {
        this.toast.show(
          `${ids.length} guide${ids.length === 1 ? '' : 's'} updated.`,
          'success',
        );
        this.reload();
      },
      error: () =>
        this.toast.show('Could not update the selected guides.', 'error'),
    });
  }

  protected updateStatus(guide: Guide, status: GuideStatus): void {
    this.api.updateStatus([guide.id], status).subscribe({
      next: () => {
        this.toast.show(
          `Guide marked as ${guideStatusLabel(status).toLowerCase()}.`,
          'success',
        );
        this.reload();
      },
      error: () => this.toast.show('Could not update the guide.', 'error'),
    });
  }

  protected requestArchive(guides: Guide[]): void {
    this.archiveTargets.set(guides);
    this.archiveModal.open();
  }

  protected requestArchiveSelected(): void {
    const ids = this.selectedIds();
    this.requestArchive(this.guides().filter((guide) => ids.has(guide.id)));
  }

  protected confirmArchive(): void {
    const targets = this.archiveTargets();
    if (!targets.length) return;
    this.api
      .updateStatus(
        targets.map((guide) => guide.id),
        'ARCHIVED',
      )
      .subscribe({
        next: () => {
          this.toast.show(
            `${targets.length} guide${targets.length === 1 ? '' : 's'} archived.`,
            'success',
          );
          this.archiveTargets.set([]);
          this.reload();
        },
        error: () => {
          this.toast.show('Could not archive the selected guides.', 'error');
          this.archiveTargets.set([]);
        },
      });
  }

  protected duplicate(guide: Guide): void {
    this.api
      .get(guide.id)
      .pipe(switchMap((source) => this.api.create(this.duplicateInput(source))))
      .subscribe({
        next: () => {
          this.toast.show('Guide duplicated as a draft.', 'success');
          this.reload();
        },
        error: () => this.toast.show('Could not duplicate the guide.', 'error'),
      });
  }

  protected actionsFor(guide: Guide): ReadonlyArray<ActionMenuItem> {
    const actions: ActionMenuItem[] = [
      { id: 'edit', label: 'Edit guide', icon: 'edit' },
      { id: 'preview', label: 'Preview guide', icon: 'preview' },
      { id: 'duplicate', label: 'Duplicate guide', icon: 'duplicate' },
    ];

    if (guide.status === 'DRAFT') {
      actions.push({ id: 'publish', label: 'Publish guide', icon: 'publish' });
    } else if (guide.status === 'PUBLISHED') {
      actions.push({
        id: 'unpublish',
        label: 'Unpublish guide',
        icon: 'unpublish',
      });
    }

    if (guide.status !== 'ARCHIVED') {
      actions.push({
        id: 'archive',
        label: 'Archive guide',
        icon: 'archive',
        tone: 'danger',
      });
    }

    return actions;
  }

  protected handleAction(guide: Guide, action: string): void {
    switch (action) {
      case 'edit':
        void this.router.navigate(['/guides', guide.id]);
        break;
      case 'preview':
        void this.router.navigate(['/guides', guide.id, 'preview']);
        break;
      case 'duplicate':
        this.duplicate(guide);
        break;
      case 'publish':
        this.updateStatus(guide, 'PUBLISHED');
        break;
      case 'unpublish':
        this.updateStatus(guide, 'DRAFT');
        break;
      case 'archive':
        this.requestArchive([guide]);
        break;
    }
  }

  protected statusTone(status: GuideStatus): 'success' | 'warning' | 'muted' {
    if (status === 'PUBLISHED') return 'success';
    if (status === 'DRAFT') return 'warning';
    return 'muted';
  }

  protected formatDate(value: string | null): string {
    if (!value) return '—';
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  private duplicateInput(source: Guide): GuideInput {
    return {
      status: 'DRAFT',
      author: source.author,
      publishedAt: null,
      translations: {
        'pt-PT': {
          ...source.translations['pt-PT'],
          slug: '',
          title: `${source.translations['pt-PT'].title} (cópia)`,
        },
        'en-US': {
          ...source.translations['en-US'],
          slug: '',
          title: `${source.translations['en-US'].title} (copy)`,
        },
      },
      categories: [...source.categories],
      tags: [...source.tags],
      relatedServiceIds: [...source.relatedServiceIds],
    };
  }
}
