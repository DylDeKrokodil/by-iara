import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import {
  Component,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, map, Observable, of, switchMap, tap } from 'rxjs';
import {
  Alert,
  Button,
  PageHeader,
  TabOption,
  Tabs,
  TextField,
  ToastService,
} from '@by-iara/shared-ui';
import { apiErrorMessage } from '../../core/api-error-message';
import { Service } from '../../services/service.models';
import { ServicesApi } from '../../services/services-api';
import { MediaApi } from '../../media/media-api';
import { MediaAsset } from '../../media/media.models';
import { MediaPicker } from '../../media/media-picker/media-picker';
import { GuidesApi } from '../guides-api';
import {
  Guide,
  GuideBlock,
  GuideBlockType,
  GuideImageType,
  GuideInput,
  GuideStatus,
  GuideTranslation,
} from '../guide.models';

type LanguageTab = 'ptPT' | 'enUS';
type EditorTab = 'content' | 'seo' | 'faqs';

const languageTabs: ReadonlyArray<TabOption> = [
  { label: 'Portuguese (pt-PT)', value: 'ptPT' },
  { label: 'English (en-US)', value: 'enUS' },
];
const editorTabs: ReadonlyArray<TabOption> = [
  { label: 'Content', value: 'content' },
  { label: 'SEO', value: 'seo' },
  { label: 'FAQs', value: 'faqs' },
];
const blockTypeOptions: ReadonlyArray<{
  label: string;
  value: GuideBlockType;
}> = [
  { label: 'Paragraph', value: 'PARAGRAPH' },
  { label: 'Heading', value: 'HEADING' },
  { label: 'Image', value: 'IMAGE' },
  { label: 'List', value: 'LIST' },
  { label: 'Quote', value: 'QUOTE' },
  { label: 'Call to action', value: 'CALL_TO_ACTION' },
];

@Component({
  selector: 'byiara-guide-form',
  imports: [
    Alert,
    Button,
    DatePipe,
    PageHeader,
    ReactiveFormsModule,
    Tabs,
    TextField,
    MediaPicker,
  ],
  templateUrl: './guide-form.html',
  styleUrl: './guide-form.css',
})
export class GuideForm implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(GuidesApi);
  private readonly servicesApi = inject(ServicesApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly mediaApi = inject(MediaApi);

  @ViewChild(MediaPicker) private mediaPicker?: MediaPicker;

  protected guideId: string | null = null;
  protected readonly loading = signal(false);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly activeLanguage = signal<LanguageTab>('ptPT');
  protected readonly activeEditorTab = signal<EditorTab>('content');
  protected readonly services = signal<Service[]>([]);
  protected readonly selectedServiceIds = signal<ReadonlySet<string>>(
    new Set(),
  );
  protected readonly currentGuide = signal<Guide | null>(null);
  protected readonly pendingImages = signal<
    Partial<Record<GuideImageType, File>>
  >({});
  protected readonly pendingMediaImages = signal<
    Partial<Record<GuideImageType, string>>
  >({});
  protected readonly imagePreviews = signal<
    Partial<Record<GuideImageType, string>>
  >({});
  protected readonly removedImages = signal<ReadonlySet<GuideImageType>>(
    new Set(),
  );
  protected readonly pendingBlockImages = signal<Record<string, File>>({});
  protected readonly pendingBlockMedia = signal<Record<string, string>>({});
  protected readonly blockImagePreviews = signal<Record<string, string>>({});
  private mediaPickerTarget:
    | { kind: 'guide'; type: GuideImageType }
    | { kind: 'block'; index: number }
    | null = null;
  protected readonly languageTabs = languageTabs;
  protected readonly editorTabs = editorTabs;
  protected readonly blockTypeOptions = blockTypeOptions;

  protected readonly form = this.fb.nonNullable.group({
    status: ['DRAFT' as GuideStatus],
    author: ['', [Validators.required, Validators.maxLength(160)]],
    publishedAt: [''],
    categories: [''],
    tags: [''],
    translations: this.fb.nonNullable.group({
      ptPT: this.translationGroup(),
      enUS: this.translationGroup(),
    }),
  });

  get editing(): boolean {
    return this.guideId !== null;
  }

  protected get translation(): FormGroup {
    return this.form.controls.translations.controls[this.activeLanguage()];
  }

  protected get blocks(): FormArray {
    return this.translation.controls['blocks'] as FormArray;
  }

  protected get faqs(): FormArray {
    return this.translation.controls['faqs'] as FormArray;
  }

  ngOnInit(): void {
    this.servicesApi.list({ active: true }).subscribe({
      next: (services) => this.services.set(services),
      error: () => this.services.set([]),
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.addBlock('PARAGRAPH', 'ptPT');
      this.addBlock('PARAGRAPH', 'enUS');
      return;
    }

    this.guideId = id;
    this.loading.set(true);
    this.api.get(id).subscribe({
      next: (guide) => {
        this.currentGuide.set(guide);
        this.selectedServiceIds.set(new Set(guide.relatedServiceIds));
        this.patchTranslation('ptPT', guide.translations['pt-PT']);
        this.patchTranslation('enUS', guide.translations['en-US']);
        this.form.patchValue({
          status: guide.status,
          author: guide.author,
          publishedAt: this.toLocalDateTime(guide.publishedAt),
          categories: guide.categories.join(', '),
          tags: guide.tags.join(', '),
        });
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load the guide.');
        this.loading.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    Object.values(this.imagePreviews()).forEach((url) => {
      if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
    });
    Object.values(this.blockImagePreviews()).forEach((url) =>
      URL.revokeObjectURL(url),
    );
  }

  protected selectLanguage(value: string): void {
    if (value === 'ptPT' || value === 'enUS') this.activeLanguage.set(value);
  }

  protected selectEditorTab(value: string): void {
    if (value === 'content' || value === 'seo' || value === 'faqs') {
      this.activeEditorTab.set(value);
    }
  }

  protected addBlock(
    type: GuideBlockType = 'PARAGRAPH',
    language: LanguageTab = this.activeLanguage(),
  ): void {
    this.blocksFor(language).push(this.blockGroup({ type }));
  }

  protected removeBlock(index: number): void {
    this.clearPendingBlockImage(this.blockClientId(this.blocks.at(index)));
    this.blocks.removeAt(index);
  }

  protected moveBlock(index: number, direction: -1 | 1): void {
    const target = index + direction;
    if (target < 0 || target >= this.blocks.length) return;
    const block = this.blocks.at(index);
    this.blocks.removeAt(index);
    this.blocks.insert(target, block);
  }

  protected setBlockType(index: number, value: string): void {
    if (!blockTypeOptions.some((option) => option.value === value)) return;
    const block = this.blocks.at(index);
    if (block.get('type')?.value === 'IMAGE' && value !== 'IMAGE') {
      this.clearPendingBlockImage(this.blockClientId(block));
    }
    block.get('type')?.setValue(value);
  }

  protected chooseBlockImage(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const block = this.blocks.at(index);
    const clientId = this.blockClientId(block);
    this.clearPendingBlockImage(clientId);
    this.pendingBlockImages.update((images) => ({ ...images, [clientId]: file }));
    this.blockImagePreviews.update((previews) => ({
      ...previews,
      [clientId]: URL.createObjectURL(file),
    }));
    input.value = '';
  }

  protected openBlockMediaPicker(index: number): void {
    this.mediaPickerTarget = { kind: 'block', index };
    this.mediaPicker?.open();
  }

  protected removeBlockImage(index: number): void {
    const block = this.blocks.at(index);
    this.clearPendingBlockImage(this.blockClientId(block));
    block.get('imageUrl')?.setValue('');
  }

  protected blockImagePreviewUrl(index: number): string | null {
    const block = this.blocks.at(index);
    const pending = this.blockImagePreviews()[this.blockClientId(block)];
    if (pending) return pending;
    const url = String(block.get('imageUrl')?.value ?? '').trim();
    if (!url) return null;
    const storedImage = url.match(
      /^\/api\/guides\/images\/content\/([^/]+)\/([^/?]+)/,
    );
    return storedImage
      ? `/api/admin/guides/${storedImage[1]}/content-images/${storedImage[2]}`
      : url;
  }

  protected addFaq(): void {
    this.faqs.push(this.faqGroup());
  }

  protected removeFaq(index: number): void {
    this.faqs.removeAt(index);
  }

  protected toggleRelatedService(id: string, checked: boolean): void {
    const selected = new Set(this.selectedServiceIds());
    if (checked) selected.add(id);
    else selected.delete(id);
    this.selectedServiceIds.set(selected);
  }

  protected chooseImage(type: GuideImageType, event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const previous = this.imagePreviews()[type];
    if (previous?.startsWith('blob:')) URL.revokeObjectURL(previous);
    this.pendingImages.update((images) => ({ ...images, [type]: file }));
    this.pendingMediaImages.update((images) => {
      const next = { ...images };
      delete next[type];
      return next;
    });
    this.imagePreviews.update((images) => ({
      ...images,
      [type]: URL.createObjectURL(file),
    }));
    this.removedImages.update((types) => {
      const next = new Set(types);
      next.delete(type);
      return next;
    });
  }

  protected openImageMediaPicker(type: GuideImageType): void {
    this.mediaPickerTarget = { kind: 'guide', type };
    this.mediaPicker?.open();
  }

  protected chooseMediaImage(image: MediaAsset): void {
    const target = this.mediaPickerTarget;
    this.mediaPickerTarget = null;
    if (!target) return;

    if (target.kind === 'guide') {
      const type = target.type;
      const previous = this.imagePreviews()[type];
      if (previous?.startsWith('blob:')) URL.revokeObjectURL(previous);
      this.pendingImages.update((images) => {
        const next = { ...images };
        delete next[type];
        return next;
      });
      this.pendingMediaImages.update((images) => ({
        ...images,
        [type]: image.id,
      }));
      this.removedImages.update((types) => {
        const next = new Set(types);
        next.delete(type);
        return next;
      });
      this.mediaApi.download(image.url).subscribe({
        next: (blob) =>
          this.imagePreviews.update((previews) => ({
            ...previews,
            [type]: URL.createObjectURL(blob),
          })),
      });
      return;
    }

    const block = this.blocks.at(target.index);
    if (!block) return;
    const clientId = this.blockClientId(block);
    this.clearPendingBlockImage(clientId);
    this.pendingBlockMedia.update((images) => ({
      ...images,
      [clientId]: image.id,
    }));
    this.mediaApi.download(image.url).subscribe({
      next: (blob) =>
        this.blockImagePreviews.update((previews) => ({
          ...previews,
          [clientId]: URL.createObjectURL(blob),
        })),
    });
  }

  protected removeImage(type: GuideImageType): void {
    const preview = this.imagePreviews()[type];
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
    this.pendingImages.update((images) => {
      const next = { ...images };
      delete next[type];
      return next;
    });
    this.pendingMediaImages.update((images) => {
      const next = { ...images };
      delete next[type];
      return next;
    });
    this.imagePreviews.update((images) => {
      const next = { ...images };
      delete next[type];
      return next;
    });
    this.removedImages.update((types) => new Set(types).add(type));
  }

  protected imageUrl(type: GuideImageType): string | null {
    if (this.removedImages().has(type)) return null;
    const pending = this.imagePreviews()[type];
    if (pending) return pending;
    const guide = this.currentGuide();
    if (!guide?.images[type]) return null;
    return guide.status === 'PUBLISHED'
      ? (guide.images[type]?.url ?? null)
      : `/api/admin/guides/${guide.id}/images/${type}`;
  }

  protected save(status?: GuideStatus): void {
    if (status) this.form.controls.status.setValue(status);
    this.form.markAllAsTouched();
    if (
      this.form.invalid ||
      this.hasEmptyBlockCollections() ||
      this.hasInvalidImageBlocks()
    ) {
      this.error.set(
        'Complete both languages and add alt text and a photo or URL to every image block.',
      );
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    this.persistGuide().pipe(switchMap((guide) => this.syncImages(guide))).subscribe({
      next: (guide) => {
        this.submitting.set(false);
        this.toast.show('Guide saved successfully.', 'success');
        if (!this.editing) {
          this.router.navigate(['/guides', guide.id]);
        } else {
          this.currentGuide.set(guide);
          this.pendingImages.set({});
          this.pendingMediaImages.set({});
          this.removedImages.set(new Set());
          this.clearAllPendingBlockImages();
        }
      },
      error: (error: HttpErrorResponse) => {
        this.submitting.set(false);
        this.error.set(apiErrorMessage(error, 'Could not save the guide.'));
      },
    });
  }

  protected archive(): void {
    if (!this.guideId) return;
    this.api.updateStatus([this.guideId], 'ARCHIVED').subscribe({
      next: () => {
        this.toast.show('Guide archived.', 'success');
        this.router.navigateByUrl('/guides');
      },
      error: () => this.toast.show('Could not archive the guide.', 'error'),
    });
  }

  protected blockLabel(type: GuideBlockType): string {
    return (
      blockTypeOptions.find((option) => option.value === type)?.label ?? type
    );
  }

  private translationGroup(): FormGroup {
    return this.fb.nonNullable.group({
      slug: ['', [Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
      title: ['', [Validators.required, Validators.maxLength(180)]],
      excerpt: ['', [Validators.required, Validators.maxLength(600)]],
      seoTitle: ['', [Validators.required, Validators.maxLength(180)]],
      metaDescription: ['', [Validators.required, Validators.maxLength(320)]],
      blocks: this.fb.array([]),
      faqs: this.fb.array([]),
    });
  }

  private blockGroup(block: Partial<GuideBlock>): FormGroup {
    return this.fb.nonNullable.group({
      clientId: [crypto.randomUUID()],
      type: [block.type ?? 'PARAGRAPH'],
      text: [block.text ?? ''],
      headingLevel: [block.headingLevel ?? 2],
      items: [(block.items ?? []).join('\n')],
      imageUrl: [block.imageUrl ?? ''],
      imageAlt: [block.imageAlt ?? ''],
      actionLabel: [block.actionLabel ?? ''],
      actionUrl: [block.actionUrl ?? ''],
    });
  }

  private faqGroup(faq?: { question: string; answer: string }): FormGroup {
    return this.fb.nonNullable.group({
      question: [faq?.question ?? '', Validators.required],
      answer: [faq?.answer ?? '', Validators.required],
    });
  }

  private blocksFor(language: LanguageTab): FormArray {
    return this.form.controls.translations.controls[language].controls[
      'blocks'
    ] as FormArray;
  }

  private faqsFor(language: LanguageTab): FormArray {
    return this.form.controls.translations.controls[language].controls[
      'faqs'
    ] as FormArray;
  }

  private patchTranslation(
    language: LanguageTab,
    translation: GuideTranslation,
  ): void {
    const group = this.form.controls.translations.controls[language];
    group.patchValue({
      slug: translation.slug,
      title: translation.title,
      excerpt: translation.excerpt,
      seoTitle: translation.seoTitle,
      metaDescription: translation.metaDescription,
    });
    const blocks = this.blocksFor(language);
    blocks.clear();
    translation.blocks.forEach((block) => blocks.push(this.blockGroup(block)));
    const faqs = this.faqsFor(language);
    faqs.clear();
    translation.faqs.forEach((faq) => faqs.push(this.faqGroup(faq)));
  }

  private toInput(): GuideInput {
    const value = this.form.getRawValue();
    return {
      status: value.status,
      author: value.author.trim(),
      publishedAt: value.publishedAt
        ? new Date(value.publishedAt).toISOString()
        : null,
      translations: {
        'pt-PT': this.translationInput('ptPT'),
        'en-US': this.translationInput('enUS'),
      },
      categories: this.commaSeparated(value.categories),
      tags: this.commaSeparated(value.tags),
      relatedServiceIds: [...this.selectedServiceIds()],
    };
  }

  private translationInput(language: LanguageTab): GuideTranslation {
    const value =
      this.form.controls.translations.controls[language].getRawValue();
    return {
      slug: value.slug.trim(),
      title: value.title.trim(),
      excerpt: value.excerpt.trim(),
      seoTitle: value.seoTitle.trim(),
      metaDescription: value.metaDescription.trim(),
      blocks: value.blocks.map(
        (block: {
          type: GuideBlockType;
          text: string;
          headingLevel: number;
          items: string;
          imageUrl: string;
          imageAlt: string;
          actionLabel: string;
          actionUrl: string;
        }) => ({
          type: block.type,
          text: block.text.trim() || undefined,
          headingLevel:
            block.type === 'HEADING' ? Number(block.headingLevel) : undefined,
          items:
            block.type === 'LIST'
              ? block.items
                  .split('\n')
                  .map((item) => item.trim())
                  .filter(Boolean)
              : undefined,
          imageUrl: block.imageUrl.trim() || undefined,
          imageAlt: block.imageAlt.trim() || undefined,
          actionLabel: block.actionLabel.trim() || undefined,
          actionUrl: block.actionUrl.trim() || undefined,
        }),
      ),
      faqs: value.faqs.map((faq: { question: string; answer: string }) => ({
        question: faq.question.trim(),
        answer: faq.answer.trim(),
      })),
    };
  }

  private syncImages(guide: Guide): Observable<Guide> {
    const jobs: Observable<Guide | void>[] = [];
    for (const type of ['COVER', 'SOCIAL'] as const) {
      const pending = this.pendingImages()[type];
      const mediaId = this.pendingMediaImages()[type];
      if (pending) jobs.push(this.api.uploadImage(guide.id, type, pending));
      else if (mediaId) {
        jobs.push(this.api.useMediaImage(guide.id, type, mediaId));
      }
      else if (this.removedImages().has(type) && guide.images[type]) {
        jobs.push(this.api.removeImage(guide.id, type));
      }
    }
    if (!jobs.length) return of(guide);
    return forkJoin(jobs).pipe(switchMap(() => this.api.get(guide.id)));
  }

  private persistGuide(): Observable<Guide> {
    const guideId = this.guideId;
    if (guideId) {
      return this.uploadPendingBlockImages(guideId).pipe(
        switchMap(() => this.api.update(guideId, this.toInput())),
      );
    }

    const desired = this.toInput();
    if (
      !Object.keys(this.pendingBlockImages()).length &&
      !Object.keys(this.pendingBlockMedia()).length
    ) {
      return this.api.create(desired);
    }

    return this.api.create(this.bootstrapInput(desired)).pipe(
      switchMap((guide) =>
        this.uploadPendingBlockImages(guide.id).pipe(
          switchMap(() => this.api.update(guide.id, this.toInput())),
        ),
      ),
    );
  }

  private uploadPendingBlockImages(guideId: string): Observable<void> {
    const uploads: Observable<unknown>[] = [];
    for (const language of ['ptPT', 'enUS'] as const) {
      this.blocksFor(language).controls.forEach((block) => {
        const clientId = this.blockClientId(block);
        const file = this.pendingBlockImages()[clientId];
        const mediaId = this.pendingBlockMedia()[clientId];
        if (!file && !mediaId) return;
        uploads.push(
          (file
            ? this.api.uploadContentImage(guideId, file)
            : this.api.useMediaContentImage(guideId, mediaId as string)
          ).pipe(
            tap((image) => {
              block.get('imageUrl')?.setValue(image.url);
              this.clearPendingBlockImage(clientId);
            }),
          ),
        );
      });
    }
    return uploads.length
      ? forkJoin(uploads).pipe(map(() => undefined))
      : of(undefined);
  }

  private bootstrapInput(input: GuideInput): GuideInput {
    const withoutPendingImages = (translation: GuideTranslation): GuideTranslation => ({
      ...translation,
      blocks: translation.blocks.filter(
        (block) => block.type !== 'IMAGE' || Boolean(block.imageUrl),
      ),
    });
    return {
      ...input,
      status: 'DRAFT',
      publishedAt: null,
      translations: {
        'pt-PT': withoutPendingImages(input.translations['pt-PT']),
        'en-US': withoutPendingImages(input.translations['en-US']),
      },
    };
  }

  private hasInvalidImageBlocks(): boolean {
    return (['ptPT', 'enUS'] as const).some((language) =>
      this.blocksFor(language).controls.some((block) => {
        if (block.get('type')?.value !== 'IMAGE') return false;
        const hasImage =
          Boolean(String(block.get('imageUrl')?.value ?? '').trim()) ||
          Boolean(this.pendingBlockImages()[this.blockClientId(block)]) ||
          Boolean(this.pendingBlockMedia()[this.blockClientId(block)]);
        return !hasImage || !String(block.get('imageAlt')?.value ?? '').trim();
      }),
    );
  }

  private blockClientId(block: { get(name: string): { value: unknown } | null }): string {
    return String(block.get('clientId')?.value ?? '');
  }

  private clearPendingBlockImage(clientId: string): void {
    const preview = this.blockImagePreviews()[clientId];
    if (preview) URL.revokeObjectURL(preview);
    this.pendingBlockImages.update((images) => {
      const next = { ...images };
      delete next[clientId];
      return next;
    });
    this.pendingBlockMedia.update((images) => {
      const next = { ...images };
      delete next[clientId];
      return next;
    });
    this.blockImagePreviews.update((previews) => {
      const next = { ...previews };
      delete next[clientId];
      return next;
    });
  }

  private clearAllPendingBlockImages(): void {
    Object.keys(this.blockImagePreviews()).forEach((clientId) =>
      this.clearPendingBlockImage(clientId),
    );
  }

  private commaSeparated(value: string): string[] {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private hasEmptyBlockCollections(): boolean {
    return (
      this.blocksFor('ptPT').length === 0 || this.blocksFor('enUS').length === 0
    );
  }

  private toLocalDateTime(value: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 16);
  }
}
