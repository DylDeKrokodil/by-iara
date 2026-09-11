import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, startWith, switchMap } from 'rxjs';
import {
  Alert,
  AnnouncementCard,
  Button,
  ConfirmationModal,
  EmptyState,
  PageHeader,
  TabOption,
  Tabs,
  TextField,
  touchedError,
} from '@by-iara/shared-ui';
import { Popup, PopupContent, PopupsApi } from './popups-api';

type PopupLanguageTab = 'ptPT' | 'enUS';

const languageTabs: ReadonlyArray<TabOption> = [
  { label: 'Portuguese (pt-PT)', value: 'ptPT' },
  { label: 'English (en-US)', value: 'enUS' },
];

function isPopupLanguageTab(value: string): value is PopupLanguageTab {
  return value === 'ptPT' || value === 'enUS';
}

@Component({
  selector: 'byiara-popups',
  imports: [
    ReactiveFormsModule,
    Alert,
    AnnouncementCard,
    Button,
    ConfirmationModal,
    EmptyState,
    PageHeader,
    Tabs,
    TextField,
  ],
  templateUrl: './popups.html',
  styleUrl: './popups.css',
})
export class Popups {
  private readonly api = inject(PopupsApi);
  private readonly element: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly editor = viewChild<ElementRef<HTMLElement>>('editor');
  private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');
  private readonly confirmation = viewChild.required(ConfirmationModal);
  protected readonly items = signal<Popup[]>([]);
  protected readonly active = computed(() =>
    this.items().find((item) => item.active),
  );
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly status = signal('');
  protected readonly formOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly activeLanguageTab = signal<PopupLanguageTab>('ptPT');
  protected readonly languageTabs = languageTabs;
  protected readonly previewEnglish = computed(
    () => this.activeLanguageTab() === 'enUS',
  );
  protected readonly pending = signal<Popup | null>(null);
  protected readonly replacementMessage = computed(
    () =>
      `Enable “${this.pending()?.content.name ?? ''}”? This replaces whichever popup is currently active. Only one popup can be shown on the website.`,
  );
  protected readonly form = this.fb.group({
    name: [
      '',
      [Validators.required, Validators.pattern(/\S/), Validators.maxLength(80)],
    ],
    titlePt: [
      '',
      [Validators.required, Validators.pattern(/\S/), Validators.maxLength(80)],
    ],
    titleEn: [
      '',
      [Validators.required, Validators.pattern(/\S/), Validators.maxLength(80)],
    ],
    bodyPt: [
      '',
      [
        Validators.required,
        Validators.pattern(/\S/),
        Validators.maxLength(240),
      ],
    ],
    bodyEn: [
      '',
      [
        Validators.required,
        Validators.pattern(/\S/),
        Validators.maxLength(240),
      ],
    ],
    action: this.fb.control<PopupContent['action']>('book'),
  });
  protected readonly draft = toSignal(
    this.form.valueChanges.pipe(startWith(this.form.getRawValue())),
    { initialValue: this.form.getRawValue() },
  );
  protected readonly previewTitle = computed(
    () =>
      (this.previewEnglish() ? this.draft().titleEn : this.draft().titlePt) ||
      (this.previewEnglish()
        ? 'A moment just for you'
        : 'Um momento só para si'),
  );
  protected readonly previewBody = computed(
    () =>
      (this.previewEnglish() ? this.draft().bodyEn : this.draft().bodyPt) ||
      (this.previewEnglish()
        ? 'Your message will appear here. Keep it short, personal and helpful.'
        : 'A sua mensagem aparece aqui. Escreva algo breve, pessoal e útil.'),
  );
  protected readonly previewAction = computed(() => {
    const actions = this.previewEnglish()
      ? {
          book: 'Book a session',
          services: 'Explore massages',
          packs: 'Explore packs',
        }
      : {
          book: 'Marcar uma sessão',
          services: 'Explorar massagens',
          packs: 'Conhecer os packs',
        };
    return actions[this.draft().action ?? 'book'];
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api
      .list()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (items) => this.items.set(items),
        error: () =>
          this.error.set('Popups could not be loaded. Please try again.'),
      });
  }

  protected edit(popup: Popup | null): void {
    this.editingId.set(popup?.id ?? null);
    this.activeLanguageTab.set('ptPT');
    this.form.reset(
      popup?.content ?? {
        name: '',
        titlePt: '',
        titleEn: '',
        bodyPt: '',
        bodyEn: '',
        action: 'book',
      },
    );
    this.formOpen.set(true);
    this.error.set('');
    this.focusAfterRender('editor');
  }

  protected closeEditor(): void {
    this.formOpen.set(false);
    this.focusAfterRender('heading');
  }

  protected fieldError(name: keyof PopupContent): string | null {
    return touchedError(this.form.controls[name], {
      required: 'This field is required.',
      pattern: 'Enter a message, not just spaces.',
      maxlength: name.startsWith('body')
        ? 'Keep the message within 240 characters.'
        : 'Keep this within 80 characters.',
    });
  }

  protected setActiveLanguageTab(value: string): void {
    if (isPopupLanguageTab(value)) {
      this.activeLanguageTab.set(value);
    }
  }

  protected save(): void {
    this.form.markAllAsTouched();
    if (this.busy()) return;
    if (this.form.invalid) {
      if (this.form.controls.name.valid) {
        this.activateFirstInvalidLanguageTab();
      }
      afterNextRender(
        () =>
          this.element.nativeElement
            .querySelector<HTMLElement>('[aria-invalid="true"]')
            ?.focus(),
        { injector: this.injector },
      );
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.status.set('');
    this.api
      .save(this.editingId(), this.form.getRawValue())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (popup) => {
          this.items.update((items) => [
            popup,
            ...items.filter((item) => item.id !== popup.id),
          ]);
          this.status.set(
            popup.active
              ? 'Changes saved. This popup is live.'
              : 'Popup saved. Enable it when you are ready.',
          );
          this.closeEditor();
        },
        error: () =>
          this.error.set(
            'The popup could not be saved. Your changes are still here; please try again.',
          ),
      });
  }

  private activateFirstInvalidLanguageTab(): void {
    if (
      this.form.controls.titlePt.invalid ||
      this.form.controls.bodyPt.invalid
    ) {
      this.activeLanguageTab.set('ptPT');
      return;
    }

    if (
      this.form.controls.titleEn.invalid ||
      this.form.controls.bodyEn.invalid
    ) {
      this.activeLanguageTab.set('enUS');
    }
  }

  protected toggle(popup: Popup): void {
    if (this.busy()) return;
    if (popup.active) this.publish(popup, false);
    else {
      this.pending.set(popup);
      this.confirmation().open();
    }
  }

  protected confirmActivation(): void {
    const popup = this.pending();
    if (popup) this.publish(popup, true);
    this.pending.set(null);
  }

  private publish(popup: Popup, active: boolean): void {
    this.busy.set(true);
    this.error.set('');
    this.status.set('');
    this.api
      .setActive(popup.id, active)
      .pipe(
        switchMap(() => this.api.list()),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (items) => {
          this.items.set(items);
          this.status.set(
            active
              ? `“${popup.content.name}” is enabled. It replaces the previous active popup.`
              : `“${popup.content.name}” is disabled.`,
          );
        },
        error: () =>
          this.error.set(
            'The latest publication state could not be confirmed. Refresh the list before trying again.',
          ),
      });
  }

  private focusAfterRender(target: 'editor' | 'heading'): void {
    afterNextRender(
      () =>
        (target === 'editor'
          ? this.editor()
          : this.heading()
        )?.nativeElement.focus(),
      { injector: this.injector },
    );
  }
}
