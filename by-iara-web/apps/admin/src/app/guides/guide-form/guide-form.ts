import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe, Location } from '@angular/common';
import {
  Component,
  DestroyRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
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
  ValidationMessages,
  touchedError,
} from '@by-iara/shared-ui';
import { apiErrorMessage } from '../../core/api-error-message';
import { Service } from '../../services/service.models';
import { ServicesApi } from '../../services/services-api';
import { MediaApi } from '../../media/media-api';
import { MediaAsset } from '../../media/media.models';
import { MediaPicker } from '../../media/media-picker/media-picker';
import { MediaImageField } from '../../media/media-image-field/media-image-field';
import { GuidesApi } from '../guides-api';
import {
  Guide,
  GuideBlock,
  GuideContentImage,
  GuideImageType,
  GuideInput,
  GuideStatus,
  GuideTranslation,
} from '../guide.models';
import { EditorActionBar } from '../../layout/editor-action-bar/editor-action-bar';
import {
  guideBlocksToHtml,
  richTextHasContent,
  richTextImageIssue,
} from '../guide-content';
import {
  GuideImageUploadRequest,
  GuideLibraryImageRequest,
  RichTextEditor,
} from './rich-text-editor';
import {
  firstGuideValidationIssue,
  GuideEditorSection,
} from './guide-validation';

type LanguageTab = 'ptPT' | 'enUS';
type EditorTab = GuideEditorSection;

const languageTabs: ReadonlyArray<TabOption> = [
  { label: 'Portuguese (pt-PT)', value: 'ptPT' },
  { label: 'English (en-US)', value: 'enUS' },
];
const editorTabs: ReadonlyArray<TabOption> = [
  { label: 'Content', value: 'content' },
  { label: 'SEO', value: 'seo' },
  { label: 'FAQs', value: 'faqs' },
];
const requiredText: ValidatorFn = (control) =>
  typeof control.value === 'string' && control.value.trim()
    ? null
    : { required: true };

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
    MediaImageField,
    EditorActionBar,
    RichTextEditor,
  ],
  templateUrl: './guide-form.html',
  styleUrl: './guide-form.css',
})
export class GuideForm implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(GuidesApi);
  private readonly servicesApi = inject(ServicesApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly mediaApi = inject(MediaApi);

  @ViewChild(MediaPicker) private mediaPicker?: MediaPicker;
  @ViewChild(RichTextEditor) private richEditor?: RichTextEditor;
  private readonly location = inject(Location);

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
  private readonly originalContentHtml: Partial<Record<LanguageTab, string>> =
    {};
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
  private mediaPickerTarget:
    | GuideImageType
    | { kind: 'content'; language: LanguageTab }
    | null = null;
  protected readonly languageTabs = languageTabs;
  protected readonly editorTabs = editorTabs;

  protected readonly form = this.fb.nonNullable.group({
    status: ['DRAFT' as GuideStatus],
    author: ['', [requiredText, Validators.maxLength(160)]],
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

  protected publishError(
    control: AbstractControl | null,
    messages: ValidationMessages,
  ): string | null {
    if (this.form.controls.status.value === 'PUBLISHED') {
      return touchedError(control, messages);
    }
    return touchedError(control, { ...messages, required: '', pattern: '' });
  }

  ngOnInit(): void {
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.error.set(null));
    this.servicesApi.list({ active: true }).subscribe({
      next: (services) => this.services.set(services),
      error: () => this.services.set([]),
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.blocksFor('ptPT').push(this.blockGroup({ type: 'RICH_TEXT' }));
      this.blocksFor('enUS').push(this.blockGroup({ type: 'RICH_TEXT' }));
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
  }

  protected selectLanguage(value: string): void {
    if (value === 'ptPT' || value === 'enUS') this.activeLanguage.set(value);
  }

  protected selectEditorTab(value: string): void {
    if (value === 'content' || value === 'seo' || value === 'faqs') {
      this.activeEditorTab.set(value);
    }
  }

  protected blockFieldError(index: number, field: 'text'): string | null {
    const control = this.blocks.at(index)?.get(field);
    if (!control?.touched) return null;
    const value = String(control.value ?? '');
    if (value.length > 200_000)
      return 'Guide content must be 200,000 characters or fewer.';
    const publishing = this.form.controls.status.value === 'PUBLISHED';
    const imageIssue = richTextImageIssue(value, publishing);
    if (imageIssue === 'source')
      return 'Use an HTTPS image URL or add the image with Upload or Library.';
    if (this.form.controls.status.value !== 'PUBLISHED') return null;
    if (!richTextHasContent(value)) return 'Enter guide content.';
    if (imageIssue === 'alt') return 'Add alt text to each image.';
    return null;
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
    this.mediaPickerTarget = type;
    this.mediaPicker?.open();
  }

  protected openContentMediaPicker(): void {
    this.mediaPickerTarget = {
      kind: 'content',
      language: this.activeLanguage(),
    };
    this.mediaPicker?.open();
  }

  protected uploadContentImage(request: GuideImageUploadRequest): void {
    this.addContentImage(
      (guideId) => this.api.uploadContentImage(guideId, request.file),
      request.alt,
    );
  }

  protected useContentLibraryImage(request: GuideLibraryImageRequest): void {
    this.addContentImage(
      (guideId) => this.api.useMediaContentImage(guideId, request.image.id),
      request.alt,
    );
  }

  private addContentImage(
    upload: (guideId: string) => Observable<GuideContentImage>,
    alt: string,
    language: LanguageTab = this.activeLanguage(),
  ): void {
    if (this.submitting()) return;
    let imageInserted = false;
    this.submitting.set(true);
    this.error.set(null);
    this.ensureGuideId()
      .pipe(
        switchMap(upload),
        tap((image) => {
          if (this.activeLanguage() === language && this.richEditor) {
            this.richEditor.insertUploadedImage(image.url, alt);
          } else {
            const content = this.blocksFor(language).at(0)?.get('text');
            content?.setValue(
              `${content.value ?? ''}${guideBlocksToHtml([{ type: 'IMAGE', imageUrl: image.url, imageAlt: alt }])}`,
            );
          }
          imageInserted = true;
        }),
        switchMap(() =>
          this.currentGuide()?.status === 'DRAFT' && this.guideId
            ? this.api.update(this.guideId, {
                ...this.toInput(),
                status: 'DRAFT',
                publishedAt: null,
              })
            : of(null),
        ),
      )
      .subscribe({
        next: (guide) => {
          if (guide) {
            this.currentGuide.set(guide);
            this.form.markAsPristine();
          }
          this.submitting.set(false);
        },
        error: (error: HttpErrorResponse) => {
          const detail = apiErrorMessage(error, 'Please try again.');
          const message = imageInserted
            ? `Image inserted, but the draft could not be saved. Save as draft to keep it. ${detail}`
            : detail;
          if (!imageInserted) this.richEditor?.showImageError(message);
          this.error.set(message);
          this.submitting.set(false);
        },
      });
  }

  private ensureGuideId(): Observable<string> {
    if (this.guideId) return of(this.guideId);
    return this.api
      .create({ ...this.toInput(), status: 'DRAFT', publishedAt: null })
      .pipe(
        tap((guide) => this.rememberCreatedGuide(guide)),
        map((guide) => guide.id),
      );
  }

  private rememberCreatedGuide(guide: Guide): void {
    this.guideId = guide.id;
    this.currentGuide.set(guide);
    this.location.replaceState(`/guides/${guide.id}`);
  }

  protected chooseMediaImage(image: MediaAsset): void {
    const target = this.mediaPickerTarget;
    this.mediaPickerTarget = null;
    if (!target) return;

    if (typeof target === 'object') {
      this.activeLanguage.set(target.language);
      this.activeEditorTab.set('content');
      this.richEditor?.prepareLibraryImage(image);
      return;
    }

    const type = target;
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

  protected save(status: GuideStatus = 'DRAFT'): void {
    if (this.submitting()) return;
    const wasNew = !this.guideId;
    this.form.controls.status.setValue(status);
    if (status === 'DRAFT') this.form.controls.publishedAt.setValue('');
    if (status === 'PUBLISHED') this.form.markAllAsTouched();
    const issue = firstGuideValidationIssue(this.toInput(), {
      publishedDateInput: this.form.controls.publishedAt.value,
      hasPendingBlockImage: () => false,
    });
    if (issue) {
      if (issue.locale) {
        this.activeLanguage.set(issue.locale === 'pt-PT' ? 'ptPT' : 'enUS');
      }
      if (issue.section) this.activeEditorTab.set(issue.section);
      this.error.set(issue.message);
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    let guidePersisted = false;
    this.persistGuide()
      .pipe(
        tap((guide) => {
          guidePersisted = true;
          this.currentGuide.set(guide);
        }),
        switchMap((guide) => this.syncImages(guide)),
      )
      .subscribe({
        next: (guide) => {
          this.submitting.set(false);
          this.toast.show('Guide saved successfully.', 'success');
          if (wasNew) {
            this.router.navigate(['/guides', guide.id]);
          } else {
            this.currentGuide.set(guide);
            this.pendingImages.set({});
            this.pendingMediaImages.set({});
            this.removedImages.set(new Set());
            this.form.markAsPristine();
          }
        },
        error: (error: HttpErrorResponse) => {
          this.submitting.set(false);
          const detail = apiErrorMessage(error, 'Please try again.');
          this.error.set(
            guidePersisted
              ? `Guide details were saved, but an image change failed. Retry saving to finish. ${detail}`
              : `Could not save the guide. ${detail}`,
          );
        },
      });
  }

  protected hasUnsavedChanges(): boolean {
    if (this.form.dirty) return true;
    if (Object.keys(this.pendingImages()).length) return true;
    if (Object.keys(this.pendingMediaImages()).length) return true;
    if (this.removedImages().size) return true;

    const savedServiceIds = new Set(
      this.currentGuide()?.relatedServiceIds ?? [],
    );
    const selectedServiceIds = this.selectedServiceIds();
    return (
      savedServiceIds.size !== selectedServiceIds.size ||
      [...selectedServiceIds].some((id) => !savedServiceIds.has(id))
    );
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

  private translationGroup(): FormGroup {
    return this.fb.nonNullable.group({
      slug: [
        '',
        [
          Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
          Validators.maxLength(140),
        ],
      ],
      title: ['', [requiredText, Validators.maxLength(180)]],
      excerpt: ['', [requiredText, Validators.maxLength(600)]],
      seoTitle: ['', [requiredText, Validators.maxLength(180)]],
      metaDescription: ['', [requiredText, Validators.maxLength(320)]],
      blocks: this.fb.array([]),
      faqs: this.fb.array([]),
    });
  }

  private blockGroup(block: Partial<GuideBlock>): FormGroup {
    return this.fb.nonNullable.group({
      type: [block.type ?? 'RICH_TEXT'],
      text: [block.text ?? ''],
    });
  }

  private faqGroup(faq?: { question: string; answer: string }): FormGroup {
    return this.fb.nonNullable.group({
      question: [faq?.question ?? '', requiredText],
      answer: [faq?.answer ?? '', requiredText],
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
      slug: /^draft-[0-9a-f-]{36}$/.test(translation.slug)
        ? ''
        : translation.slug,
      title: translation.title,
      excerpt: translation.excerpt,
      seoTitle: translation.seoTitle,
      metaDescription: translation.metaDescription,
    });
    const blocks = this.blocksFor(language);
    blocks.clear();
    const contentHtml = guideBlocksToHtml(translation.blocks);
    this.originalContentHtml[language] = contentHtml;
    blocks.push(
      this.blockGroup({
        type: 'RICH_TEXT',
        text: contentHtml,
      }),
    );
    const faqs = this.faqsFor(language);
    faqs.clear();
    translation.faqs.forEach((faq) => faqs.push(this.faqGroup(faq)));
  }

  private toInput(): GuideInput {
    const value = this.form.getRawValue();
    return {
      status: value.status,
      author: value.author.trim(),
      publishedAt: this.publishedAtInput(value.status, value.publishedAt),
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
    const locale = language === 'ptPT' ? 'pt-PT' : 'en-US';
    const original = this.currentGuide()?.translations[locale];
    const contentHtml = value.blocks[0]?.text ?? '';
    return {
      slug: value.slug.trim(),
      title: value.title.trim(),
      excerpt: value.excerpt.trim(),
      seoTitle: value.seoTitle.trim(),
      metaDescription: value.metaDescription.trim(),
      blocks:
        original && contentHtml === this.originalContentHtml[language]
          ? original.blocks
          : [{ type: 'RICH_TEXT', text: contentHtml || undefined }],
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
      } else if (this.removedImages().has(type) && guide.images[type]) {
        jobs.push(this.api.removeImage(guide.id, type));
      }
    }
    if (!jobs.length) return of(guide);
    return forkJoin(jobs).pipe(switchMap(() => this.api.get(guide.id)));
  }

  private persistGuide(): Observable<Guide> {
    const input = this.toInput();
    return this.guideId
      ? this.api.update(this.guideId, input)
      : this.api
          .create(input)
          .pipe(tap((guide) => this.rememberCreatedGuide(guide)));
  }

  private publishedAtInput(status: GuideStatus, value: string): string | null {
    if (status !== 'PUBLISHED' || !value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  private commaSeparated(value: string): string[] {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private toLocalDateTime(value: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 16);
  }
}
