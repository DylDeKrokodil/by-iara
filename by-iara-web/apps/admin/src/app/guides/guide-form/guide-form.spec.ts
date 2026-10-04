import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FormGroup } from '@angular/forms';
import { provideRouter, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastService } from '@by-iara/shared-ui';
import { ServicesApi } from '../../services/services-api';
import { MediaApi } from '../../media/media-api';
import { GuidesApi } from '../guides-api';
import { Guide, GuideInput } from '../guide.models';
import { GuideForm } from './guide-form';
import { RichTextEditor } from './rich-text-editor';

describe('GuideForm', () => {
  let fixture: ComponentFixture<GuideForm>;
  let create: ReturnType<typeof vi.fn>;
  let update: ReturnType<typeof vi.fn>;
  let uploadContentImage: ReturnType<typeof vi.fn>;
  let uploadImage: ReturnType<typeof vi.fn>;

  function field(label: string): HTMLInputElement | HTMLTextAreaElement {
    const host = [
      ...fixture.nativeElement.querySelectorAll('byiara-text-field'),
    ].find((element: Element) =>
      element
        .querySelector('label > span')
        ?.textContent?.trim()
        .startsWith(label),
    );
    const input = host?.querySelector('input, textarea');
    if (!input) throw new Error(`Missing ${label} field`);
    return input as HTMLInputElement | HTMLTextAreaElement;
  }

  function enter(label: string, value: string): void {
    const input = field(label);
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  }

  function selectLanguage(label: string): void {
    const tab = [
      ...fixture.nativeElement.querySelectorAll(
        '[aria-label="Guide language"] button',
      ),
    ].find((button: Element) =>
      button.textContent?.includes(label),
    ) as HTMLButtonElement;
    tab.click();
    fixture.detectChanges();
  }

  function setContent(language: 'ptPT' | 'enUS', html: string): void {
    const form = (fixture.componentInstance as unknown as { form: FormGroup })
      .form;
    form.get(`translations.${language}.blocks.0.text`)?.setValue(html);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    create = vi.fn((input: GuideInput) =>
      of({ id: 'guide-id', images: {}, ...input } as Guide),
    );
    update = vi.fn((id: string, input: GuideInput) =>
      of({ id, images: {}, ...input } as Guide),
    );
    uploadContentImage = vi.fn(() =>
      of({ id: 'image-id', url: 'https://example.com/image.jpg' }),
    );
    uploadImage = vi.fn(() => of({}));
    await TestBed.configureTestingModule({
      imports: [GuideForm],
      providers: [
        provideRouter([]),
        {
          provide: GuidesApi,
          useValue: { create, update, uploadContentImage, uploadImage },
        },
        { provide: ServicesApi, useValue: { list: () => of([]) } },
        { provide: MediaApi, useValue: {} },
        { provide: ToastService, useValue: { show: vi.fn() } },
      ],
    }).compileComponents();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(GuideForm);
    fixture.detectChanges();
  });

  it('keeps guide fields separate for each language', () => {
    enter('Title', 'Título português');
    enter('URL slug', 'titulo-portugues');
    enter('Summary', 'Resumo português');
    setContent('ptPT', '<p>Parágrafo português</p>');
    fixture.nativeElement
      .querySelector('[aria-label="Guide editor section"] button:nth-child(2)')
      .click();
    fixture.detectChanges();
    enter('SEO title', 'SEO português');
    enter('Meta description', 'Descrição portuguesa');

    selectLanguage('English');
    expect(field('SEO title').value).toBe('');
    expect(field('Meta description').value).toBe('');
    enter('SEO title', 'English SEO');
    fixture.nativeElement
      .querySelector('[aria-label="Guide editor section"] button:first-child')
      .click();
    fixture.detectChanges();
    expect(field('Title').value).toBe('');
    expect(field('URL slug').value).toBe('');
    expect(field('Summary').value).toBe('');
    expect(fixture.nativeElement.querySelector('.tiptap')?.textContent).toBe(
      '',
    );
    enter('Title', 'English title');
    enter('Summary', 'English summary');

    selectLanguage('Portuguese');
    expect(field('Title').value).toBe('Título português');
    expect(field('URL slug').value).toBe('titulo-portugues');
    expect(field('Summary').value).toBe('Resumo português');
    expect(
      fixture.nativeElement.querySelector('.tiptap')?.textContent,
    ).toContain('Parágrafo português');
    fixture.nativeElement
      .querySelector('[aria-label="Guide editor section"] button:nth-child(2)')
      .click();
    fixture.detectChanges();
    expect(field('SEO title').value).toBe('SEO português');
    expect(field('Meta description').value).toBe('Descrição portuguesa');
  });

  it('saves an incomplete guide as a draft', () => {
    const button = [...fixture.nativeElement.querySelectorAll('button')].find(
      (item: HTMLButtonElement) => item.textContent?.includes('Save as draft'),
    ) as HTMLButtonElement;
    button.click();

    expect(create).toHaveBeenCalledOnce();
    const input = create.mock.calls[0][0] as GuideInput;
    expect(input.status).toBe('DRAFT');
    expect(input.author).toBe('');
    expect(input.translations['pt-PT'].title).toBe('');
    expect(input.translations['en-US'].title).toBe('');
  });

  it('retries image syncing on the same guide after a partial save', () => {
    uploadImage.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { message: 'Invalid image' },
          }),
      ),
    );
    const image = fixture.nativeElement.querySelector(
      '#guide-cover-image',
    ) as HTMLInputElement;
    const file = new File(['image'], 'cover.png', { type: 'image/png' });
    Object.defineProperty(image, 'files', {
      configurable: true,
      value: [file],
    });
    image.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    const save = [...fixture.nativeElement.querySelectorAll('button')].find(
      (item: HTMLButtonElement) => item.textContent?.includes('Save as draft'),
    ) as HTMLButtonElement;
    save.click();
    fixture.detectChanges();

    expect(create).toHaveBeenCalledOnce();
    expect(uploadImage).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.textContent).toContain(
      'Guide details were saved, but an image change failed.',
    );

    save.click();
    expect(create).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledOnce();
  });

  it('saves formatted guide content in one rich text block', () => {
    const form = (fixture.componentInstance as unknown as { form: FormGroup })
      .form;
    form
      .get('translations.ptPT.blocks.0.text')
      ?.setValue('<p>Paragraph text</p><ul><li>Bullet</li></ul>');

    const button = [...fixture.nativeElement.querySelectorAll('button')].find(
      (item: HTMLButtonElement) => item.textContent?.includes('Save as draft'),
    ) as HTMLButtonElement;
    button.click();

    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.calls[0][0].translations['pt-PT'].blocks[0]).toEqual({
      type: 'RICH_TEXT',
      text: '<p>Paragraph text</p><ul><li>Bullet</li></ul>',
    });
  });

  it('accepts pasted headings and lists through the editor', () => {
    const editor = fixture.debugElement.query(By.directive(RichTextEditor))
      .componentInstance as RichTextEditor & {
      editor: { commands: { insertContent: (html: string) => void } };
    };
    editor.editor.commands.insertContent(
      '<h2>Welcome</h2><ul><li>First</li><li>Second</li></ul>',
    );

    const form = (fixture.componentInstance as unknown as { form: FormGroup })
      .form;
    expect(form.get('translations.ptPT.blocks.0.text')?.value).toContain(
      '<h2>Welcome</h2>',
    );
    expect(form.get('translations.ptPT.blocks.0.text')?.value).toContain(
      '<ul>',
    );
    selectLanguage('English');
    expect(fixture.nativeElement.querySelector('.tiptap')?.textContent).toBe(
      '',
    );
    selectLanguage('Portuguese');
    expect(
      fixture.nativeElement.querySelector('.tiptap')?.textContent,
    ).toContain('First');
  });

  it('turns typed content into a bullet list with the toolbar', () => {
    const editor = fixture.debugElement.query(By.directive(RichTextEditor))
      .componentInstance as RichTextEditor & {
      editor: { commands: { insertContent: (html: string) => void } };
    };
    editor.editor.commands.insertContent('First item');
    (
      fixture.nativeElement.querySelector(
        '[aria-label="Bullet list"]',
      ) as HTMLButtonElement
    ).click();
    const form = (fixture.componentInstance as unknown as { form: FormGroup })
      .form;
    expect(form.get('translations.ptPT.blocks.0.text')?.value).toContain(
      '<ul>',
    );
    expect(form.get('translations.ptPT.blocks.0.text')?.value).toContain(
      '<li>',
    );
  });

  it('uses inline link and image fields with specific validation messages', () => {
    const prompt = vi.spyOn(window, 'prompt');
    (
      fixture.nativeElement.querySelector(
        '[aria-label="Insert link"]',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    const linkUrl = fixture.nativeElement.querySelector(
      '#guide-link-url',
    ) as HTMLInputElement;
    linkUrl.value = 'bad-link';
    linkUrl.dispatchEvent(new Event('input'));
    (
      fixture.nativeElement.querySelector(
        '.insert-confirm',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('.panel-error').textContent,
    ).toContain('valid link');

    linkUrl.value = 'https://example.com';
    linkUrl.dispatchEvent(new Event('input'));
    const linkText = fixture.nativeElement.querySelector(
      '#guide-link-text',
    ) as HTMLInputElement;
    linkText.value = 'Details';
    linkText.dispatchEvent(new Event('input'));
    (
      fixture.nativeElement.querySelector(
        '.insert-confirm',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.tiptap a')?.textContent).toBe(
      'Details',
    );

    (
      fixture.nativeElement.querySelector(
        '[aria-label="Insert image URL"]',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    (
      fixture.nativeElement.querySelector(
        '.insert-confirm',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('.panel-error').textContent,
    ).toContain('Describe the image');
    expect(prompt).not.toHaveBeenCalled();
    prompt.mockRestore();
  });

  it('creates a draft before uploading an image into a new guide', () => {
    const editor = fixture.debugElement.query(By.directive(RichTextEditor))
      .componentInstance as RichTextEditor;
    editor.fileSelected.emit({
      file: new File(['image'], 'room.png', { type: 'image/png' }),
      alt: 'Relaxing treatment room',
    });
    fixture.detectChanges();

    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.calls[0][0].status).toBe('DRAFT');
    expect(uploadContentImage).toHaveBeenCalledOnce();
    expect(uploadContentImage.mock.calls[0][0]).toBe('guide-id');
    expect(update).toHaveBeenCalledOnce();
    expect(
      update.mock.calls[0][1].translations['pt-PT'].blocks[0].text,
    ).toContain('Relaxing treatment room');
    const form = (fixture.componentInstance as unknown as { form: FormGroup })
      .form;
    expect(form.get('translations.ptPT.blocks.0.text')?.value).toContain(
      'alt="Relaxing treatment room"',
    );
  });

  it('saves an uploaded image after a failed publish attempt', () => {
    const publish = [...fixture.nativeElement.querySelectorAll('button')].find(
      (item: HTMLButtonElement) =>
        item.textContent?.includes('Save and publish'),
    ) as HTMLButtonElement;
    publish.click();
    fixture.detectChanges();

    const editor = fixture.debugElement.query(By.directive(RichTextEditor))
      .componentInstance as RichTextEditor;
    editor.fileSelected.emit({
      file: new File(['image'], 'room.png', { type: 'image/png' }),
      alt: 'Treatment room',
    });

    expect(create).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledOnce();
    expect(update.mock.calls[0][1].status).toBe('DRAFT');
    expect(
      update.mock.calls[0][1].translations['pt-PT'].blocks[0].text,
    ).toContain('Treatment room');
  });

  it('keeps legacy blocks intact when only metadata changes', () => {
    const legacyBlocks: Guide['translations']['pt-PT']['blocks'] = [
      { type: 'PARAGRAPH', text: 'Opening text' },
      { type: 'CALL_TO_ACTION', actionLabel: 'Book now', actionUrl: '/book' },
    ];
    const component = fixture.componentInstance as unknown as {
      guideId: string | null;
      currentGuide: { set: (guide: Guide) => void };
      patchTranslation: (
        language: 'ptPT',
        translation: Guide['translations']['pt-PT'],
      ) => void;
    };
    component.guideId = 'guide-id';
    const translation: Guide['translations']['pt-PT'] = {
      slug: 'original',
      title: 'Original',
      excerpt: 'Summary',
      seoTitle: 'SEO',
      metaDescription: 'Description',
      blocks: legacyBlocks,
      faqs: [],
    };
    component.currentGuide.set({
      id: 'guide-id',
      status: 'DRAFT',
      author: 'Iara',
      publishedAt: null,
      createdAt: '',
      updatedAt: '',
      translations: { 'pt-PT': translation, 'en-US': translation },
      categories: [],
      tags: [],
      relatedServiceIds: [],
      images: {},
    });
    component.patchTranslation('ptPT', translation);
    enter('Author', 'New author');
    const save = [...fixture.nativeElement.querySelectorAll('button')].find(
      (item: HTMLButtonElement) => item.textContent?.includes('Save as draft'),
    ) as HTMLButtonElement;
    save.click();

    expect(update.mock.calls[0][1].translations['pt-PT'].blocks).toEqual(
      legacyBlocks,
    );
  });

  it('keeps an uploaded image in its original language if the tab changes', () => {
    const pendingImage = new Subject<{ id: string; url: string }>();
    uploadContentImage.mockReturnValueOnce(pendingImage.asObservable());
    const editor = fixture.debugElement.query(By.directive(RichTextEditor))
      .componentInstance as RichTextEditor;
    editor.fileSelected.emit({
      file: new File(['image'], 'room.png', { type: 'image/png' }),
      alt: 'Portuguese image',
    });
    selectLanguage('English');
    pendingImage.next({ id: 'image-id', url: 'https://example.com/room.jpg' });
    fixture.detectChanges();

    const form = (fixture.componentInstance as unknown as { form: FormGroup })
      .form;
    expect(form.get('translations.ptPT.blocks.0.text')?.value).toContain(
      'Portuguese image',
    );
    expect(form.get('translations.enUS.blocks.0.text')?.value).toBe('');
  });

  it('requires complete content before publishing', () => {
    const button = [...fixture.nativeElement.querySelectorAll('button')].find(
      (item: HTMLButtonElement) =>
        item.textContent?.includes('Save and publish'),
    ) as HTMLButtonElement;
    button.click();
    fixture.detectChanges();

    expect(create).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain(
      'Enter the author name before publishing.',
    );

    enter('Author', 'Iara');
    button.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Enter the Portuguese title.',
    );
  });

  it('treats whitespace as missing text and shows the matching field error', () => {
    enter('Author', '   ');
    const button = [...fixture.nativeElement.querySelectorAll('button')].find(
      (item: HTMLButtonElement) =>
        item.textContent?.includes('Save and publish'),
    ) as HTMLButtonElement;
    button.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Enter the author name before publishing.',
    );
    expect(field('Author').closest('label')?.textContent).toContain(
      'Enter the author name.',
    );
  });

  it('opens the language and section containing the publish error', () => {
    const form = (fixture.componentInstance as unknown as { form: FormGroup })
      .form;
    form.patchValue({
      author: 'Iara',
      translations: {
        ptPT: {
          title: 'Guia',
          excerpt: 'Resumo',
          seoTitle: 'SEO PT',
          metaDescription: 'Descrição',
        },
        enUS: {
          title: 'Guide',
          excerpt: 'Summary',
          metaDescription: 'Description',
        },
      },
    });
    form.get('translations.ptPT.blocks.0.text')?.setValue('Texto');
    form.get('translations.enUS.blocks.0.text')?.setValue('Text');
    fixture.detectChanges();

    const button = [...fixture.nativeElement.querySelectorAll('button')].find(
      (item: HTMLButtonElement) =>
        item.textContent?.includes('Save and publish'),
    ) as HTMLButtonElement;
    button.click();
    fixture.detectChanges();

    expect(create).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain(
      'Enter the English SEO title.',
    );
    expect(
      fixture.nativeElement
        .querySelector('[aria-label="Guide language"] button:nth-child(2)')
        ?.getAttribute('aria-selected'),
    ).toBe('true');
    expect(
      fixture.nativeElement
        .querySelector(
          '[aria-label="Guide editor section"] button:nth-child(2)',
        )
        ?.getAttribute('aria-selected'),
    ).toBe('true');
  });

  it('shows the matching inline error for empty guide content', () => {
    const form = (fixture.componentInstance as unknown as { form: FormGroup })
      .form;
    form.patchValue({
      author: 'Iara',
      translations: {
        ptPT: {
          title: 'Guia',
          excerpt: 'Resumo',
          seoTitle: 'SEO',
          metaDescription: 'Descrição',
        },
        enUS: {
          title: 'Guide',
          excerpt: 'Summary',
          seoTitle: 'SEO',
          metaDescription: 'Description',
        },
      },
    });
    fixture.detectChanges();

    const button = [...fixture.nativeElement.querySelectorAll('button')].find(
      (item: HTMLButtonElement) =>
        item.textContent?.includes('Save and publish'),
    ) as HTMLButtonElement;
    button.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Enter the Portuguese guide content.',
    );
    expect(
      fixture.nativeElement.querySelector('.rich-editor-field .field-error')
        ?.textContent,
    ).toContain('Enter guide content.');
  });
});
