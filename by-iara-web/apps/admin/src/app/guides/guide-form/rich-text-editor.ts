import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  inject,
  Input,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Subscription } from 'rxjs';
import { MediaApi } from '../../media/media-api';
import { MediaAsset } from '../../media/media.models';
import { contentImageAdminUrl } from '../guide-content';

export interface GuideImageUploadRequest {
  file: File;
  alt: string;
}

export interface GuideLibraryImageRequest {
  image: MediaAsset;
  alt: string;
}

@Component({
  selector: 'byiara-rich-text-editor',
  template: `
    <div class="toolbar" role="toolbar" aria-label="Guide formatting">
      <button
        type="button"
        aria-label="Bold"
        title="Bold"
        (click)="format('bold')"
      >
        <strong>B</strong>
      </button>
      <button
        type="button"
        aria-label="Italic"
        title="Italic"
        (click)="format('italic')"
      >
        <em>I</em>
      </button>
      <button
        type="button"
        aria-label="Underline"
        title="Underline"
        (click)="format('underline')"
      >
        <u>U</u>
      </button>
      <span class="divider" aria-hidden="true"></span>
      <button
        type="button"
        aria-label="Paragraph"
        title="Paragraph"
        (click)="format('paragraph')"
      >
        P
      </button>
      <button
        type="button"
        aria-label="Heading 2"
        title="Heading 2"
        (click)="format('h2')"
      >
        H2
      </button>
      <button
        type="button"
        aria-label="Heading 3"
        title="Heading 3"
        (click)="format('h3')"
      >
        H3
      </button>
      <button
        type="button"
        aria-label="Heading 4"
        title="Heading 4"
        (click)="format('h4')"
      >
        H4
      </button>
      <span class="divider" aria-hidden="true"></span>
      <button
        type="button"
        aria-label="Bullet list"
        title="Bullet list"
        (click)="format('bullet')"
      >
        • List
      </button>
      <button
        type="button"
        aria-label="Numbered list"
        title="Numbered list"
        (click)="format('ordered')"
      >
        1. List
      </button>
      <button
        type="button"
        aria-label="Quote"
        title="Quote"
        (click)="format('quote')"
      >
        Quote
      </button>
      <span class="divider" aria-hidden="true"></span>
      <button
        type="button"
        aria-label="Insert link"
        title="Insert link"
        (click)="openPanel('link')"
      >
        Link
      </button>
      <button
        type="button"
        aria-label="Insert image URL"
        title="Insert image URL"
        (click)="openPanel('image')"
      >
        Image
      </button>
      <button
        type="button"
        aria-label="Choose image from library"
        title="Choose image from library"
        (click)="libraryRequested.emit()"
      >
        Library
      </button>
      <button
        type="button"
        aria-label="Upload image"
        title="Upload image"
        (click)="openPanel('upload')"
      >
        Upload
      </button>
      <button
        type="button"
        aria-label="Undo"
        title="Undo"
        (click)="format('undo')"
      >
        ↶
      </button>
      <button
        type="button"
        aria-label="Redo"
        title="Redo"
        (click)="format('redo')"
      >
        ↷
      </button>
    </div>
    @if (panel) {
      <div class="insert-panel">
        <div class="insert-panel-heading">
          <strong>{{
            panel === 'link' ? 'Add a link' : 'Add an image'
          }}</strong>
          <button
            type="button"
            class="close-panel"
            aria-label="Close insert options"
            (click)="closePanel()"
          >
            ×
          </button>
        </div>
        @if (panel === 'link') {
          <label for="guide-link-url">Link URL</label>
          <input
            id="guide-link-url"
            type="url"
            autocomplete="url"
            placeholder="https://example.com"
            [value]="linkUrl"
            (input)="linkUrl = inputValue($event)"
            (keydown.enter)="submitPanel($event)"
          />
          @if (!hasTextSelection) {
            <label for="guide-link-text">Link text</label>
            <input
              id="guide-link-text"
              type="text"
              placeholder="Text to display"
              [value]="linkText"
              (input)="linkText = inputValue($event)"
              (keydown.enter)="submitPanel($event)"
            />
          }
        } @else {
          @if (panel === 'image') {
            <label for="guide-image-url">Image URL</label>
            <input
              id="guide-image-url"
              type="url"
              placeholder="https://example.com/image.jpg"
              [value]="imageUrl"
              (input)="imageUrl = inputValue($event)"
              (keydown.enter)="submitPanel($event)"
            />
          } @else if (panel === 'upload') {
            <label for="guide-image-file"
              >Image file <span>(JPEG or PNG, up to 10 MB)</span></label
            >
            <input
              id="guide-image-file"
              type="file"
              accept="image/jpeg,image/png"
              (change)="chooseFile($event)"
            />
            @if (localPreviewUrl) {
              <img
                class="image-preview"
                [src]="localPreviewUrl"
                alt="Selected image preview"
              />
            }
          } @else if (panel === 'library') {
            <p class="selected-file">Selected library image</p>
            @if (localPreviewUrl) {
              <img
                class="image-preview"
                [src]="localPreviewUrl"
                alt="Selected library image preview"
              />
            }
          }
          <label for="guide-image-alt"
            >Image description <span>(required for accessibility)</span></label
          >
          <input
            id="guide-image-alt"
            type="text"
            placeholder="Describe what the image shows"
            [value]="imageAlt"
            (input)="imageAlt = inputValue($event)"
            (keydown.enter)="submitPanel($event)"
          />
        }
        @if (panelError) {
          <p class="panel-error" role="alert">{{ panelError }}</p>
        }
        <div class="insert-actions">
          <button
            type="button"
            (click)="closePanel()"
            [disabled]="imageUploading"
          >
            Cancel
          </button>
          <button
            type="button"
            class="insert-confirm"
            [disabled]="imageUploading"
            (click)="submitPanel($event)"
          >
            {{
              imageUploading
                ? 'Uploading…'
                : panel === 'link'
                  ? 'Insert link'
                  : 'Insert image'
            }}
          </button>
        </div>
      </div>
    }
    <div #content class="content" aria-label="Guide content"></div>
  `,
  styles: [
    `
      :host {
        display: block;
        border: 1px solid #d8d2ca;
        border-radius: 10px;
        overflow: hidden;
        background: white;
      }
      .toolbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 4px;
        padding: 8px;
        border-bottom: 1px solid #e8e3dc;
        background: #faf8f5;
      }
      .toolbar button {
        border: 0;
        border-radius: 5px;
        padding: 6px 9px;
        background: transparent;
        cursor: pointer;
        font: inherit;
      }
      .toolbar button:hover,
      .toolbar button:focus-visible {
        background: #eee8df;
      }
      .divider {
        width: 1px;
        height: 22px;
        margin: 0 4px;
        background: #d8d2ca;
      }
      .insert-panel {
        display: grid;
        gap: 8px;
        padding: 14px 16px;
        border-bottom: 1px solid #e8e3dc;
        background: #faf8f5;
      }
      .insert-panel-heading,
      .insert-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .insert-panel label {
        font-weight: 600;
        font-size: 0.875rem;
      }
      .insert-panel label span,
      .selected-file {
        color: #5c554e;
        font-weight: 400;
      }
      .insert-panel input {
        box-sizing: border-box;
        width: 100%;
        min-height: 40px;
        padding: 8px 10px;
        border: 1px solid #a69d94;
        border-radius: 6px;
        background: white;
        color: #27211d;
        font: inherit;
      }
      .insert-panel input:focus-visible,
      .insert-panel button:focus-visible {
        outline: 2px solid #76634c;
        outline-offset: 2px;
      }
      .insert-panel button {
        min-height: 40px;
        padding: 8px 12px;
        border: 1px solid #a69d94;
        border-radius: 6px;
        background: white;
        color: #27211d;
        font: inherit;
        cursor: pointer;
      }
      .insert-panel button:disabled {
        opacity: 0.6;
        cursor: wait;
      }
      .insert-panel .insert-confirm {
        border-color: #7f3044;
        background: #a8405a;
        color: white;
      }
      .insert-panel .close-panel {
        min-width: 40px;
        font-size: 1.25rem;
      }
      .insert-actions {
        justify-content: flex-end;
        margin-top: 4px;
      }
      .panel-error {
        margin: 0;
        color: #a42b2b;
        font-size: 0.875rem;
      }
      .image-preview {
        display: block;
        max-width: min(100%, 340px);
        max-height: 180px;
        object-fit: contain;
        border: 1px solid #d8d2ca;
        border-radius: 6px;
        background: white;
      }
      .selected-file {
        margin: 0;
        font-size: 0.875rem;
      }
      .toolbar button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .content {
        min-height: 360px;
      }
      :host ::ng-deep .tiptap {
        min-height: 360px;
        padding: 18px 22px;
        outline: none;
        line-height: 1.65;
      }
      :host ::ng-deep .tiptap:focus-visible {
        box-shadow: inset 0 0 0 2px #76634c;
      }
      :host ::ng-deep .tiptap p {
        margin: 0 0 1em;
      }
      :host ::ng-deep .tiptap ul,
      :host ::ng-deep .tiptap ol {
        padding-left: 1.5em;
        margin: 0 0 1em;
      }
      :host ::ng-deep .tiptap ul {
        list-style: disc;
      }
      :host ::ng-deep .tiptap ol {
        list-style: decimal;
      }
      :host ::ng-deep .tiptap h2,
      :host ::ng-deep .tiptap h3,
      :host ::ng-deep .tiptap h4 {
        font-weight: 700;
        margin: 1.3em 0 0.5em;
      }
      :host ::ng-deep .tiptap blockquote {
        border-left: 3px solid #b4a38c;
        margin: 1em 0;
        padding-left: 1em;
      }
      :host ::ng-deep .tiptap img {
        max-width: 100%;
        height: auto;
      }
      :host ::ng-deep .content-image-node {
        display: block;
      }
      :host ::ng-deep .content-image-error {
        display: block;
        padding: 12px;
        border: 1px solid #d8d2ca;
        border-radius: 6px;
        color: #a42b2b;
      }
    `,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RichTextEditor),
      multi: true,
    },
  ],
})
export class RichTextEditor
  implements ControlValueAccessor, AfterViewInit, OnDestroy
{
  private readonly mediaApi = inject(MediaApi);
  private readonly imageExtension = Image.extend({
    addNodeView:
      () =>
      ({ node }) => {
        const container = document.createElement('span');
        container.className = 'content-image-node';
        const image = document.createElement('img');
        const source = String(node.attrs['src'] ?? '');
        image.alt = String(node.attrs['alt'] ?? '');
        container.append(image);
        const adminUrl = contentImageAdminUrl(source);
        let objectUrl: string | null = null;
        const subscription = adminUrl
          ? this.mediaApi.download(adminUrl).subscribe({
              next: (blob) => {
                objectUrl = URL.createObjectURL(blob);
                image.src = objectUrl;
              },
              error: () => {
                const status = document.createElement('span');
                status.className = 'content-image-error';
                status.setAttribute('role', 'status');
                status.textContent =
                  'Image preview unavailable. Try refreshing the guide.';
                image.replaceWith(status);
              },
            })
          : null;
        if (!adminUrl) image.src = source;
        return {
          dom: container,
          update: (updatedNode) =>
            updatedNode.type === node.type &&
            updatedNode.attrs['src'] === node.attrs['src'] &&
            updatedNode.attrs['alt'] === node.attrs['alt'],
          destroy: () => {
            subscription?.unsubscribe();
            if (objectUrl) URL.revokeObjectURL(objectUrl);
          },
        };
      },
  });
  @Output() readonly libraryRequested = new EventEmitter<void>();
  @Input() imageUploading = false;
  @Output() readonly fileSelected = new EventEmitter<GuideImageUploadRequest>();
  @Output() readonly libraryImageSelected =
    new EventEmitter<GuideLibraryImageRequest>();
  @ViewChild('content') private content!: ElementRef<HTMLElement>;
  protected editor?: Editor;
  protected panel: 'link' | 'image' | 'upload' | 'library' | null = null;
  protected panelError = '';
  protected linkUrl = '';
  protected linkText = '';
  protected imageUrl = '';
  protected imageAlt = '';
  protected selectedFile: File | null = null;
  protected libraryImage: MediaAsset | null = null;
  protected localPreviewUrl: string | null = null;
  protected hasTextSelection = false;
  private libraryPreview?: Subscription;
  private value = '';
  private disabled = false;
  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  ngAfterViewInit(): void {
    this.editor = new Editor({
      element: this.content.nativeElement,
      extensions: [
        StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
        this.imageExtension,
      ],
      content: this.value,
      editable: !this.disabled,
      editorProps: {
        attributes: {
          id: 'guide-rich-content',
          'aria-labelledby': 'guide-rich-content-label',
          role: 'textbox',
          'aria-multiline': 'true',
        },
      },
      onUpdate: ({ editor }) =>
        this.onChange(editor.isEmpty ? '' : editor.getHTML()),
      onBlur: () => this.onTouched(),
    });
  }

  ngOnDestroy(): void {
    this.editor?.destroy();
    this.releaseLocalPreview();
  }
  writeValue(value: string | null): void {
    this.value = value ?? '';
    this.editor?.commands.setContent(this.value, {
      emitUpdate: false,
    });
  }
  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(disabled: boolean): void {
    this.disabled = disabled;
    this.editor?.setEditable(!disabled);
  }

  protected format(action: string): void {
    const editor = this.editor;
    if (!editor) return;
    switch (action) {
      case 'bold':
        editor.chain().focus().toggleBold().run();
        break;
      case 'italic':
        editor.chain().focus().toggleItalic().run();
        break;
      case 'underline':
        editor.chain().focus().toggleUnderline().run();
        break;
      case 'paragraph':
        editor.chain().focus().setParagraph().run();
        break;
      case 'h2':
        editor.chain().focus().toggleHeading({ level: 2 }).run();
        break;
      case 'h3':
        editor.chain().focus().toggleHeading({ level: 3 }).run();
        break;
      case 'h4':
        editor.chain().focus().toggleHeading({ level: 4 }).run();
        break;
      case 'bullet':
        editor.chain().focus().toggleBulletList().run();
        break;
      case 'ordered':
        editor.chain().focus().toggleOrderedList().run();
        break;
      case 'quote':
        editor.chain().focus().toggleBlockquote().run();
        break;
      case 'undo':
        editor.chain().focus().undo().run();
        break;
      case 'redo':
        editor.chain().focus().redo().run();
        break;
    }
  }

  protected openPanel(panel: 'link' | 'image' | 'upload'): void {
    if (this.imageUploading) return;
    this.releaseLocalPreview();
    this.panel = panel;
    this.panelError = '';
    this.selectedFile = null;
    this.libraryImage = null;
    this.imageAlt = '';
    this.hasTextSelection = Boolean(
      this.editor && !this.editor.state.selection.empty,
    );
    this.linkText = '';
    this.linkUrl = '';
    this.imageUrl = '';
    this.focusPanelInput();
  }

  prepareLibraryImage(image: MediaAsset): void {
    this.releaseLocalPreview();
    this.panel = 'library';
    this.libraryImage = image;
    this.selectedFile = null;
    this.imageAlt = '';
    this.panelError = '';
    this.focusPanelInput();
    this.libraryPreview = this.mediaApi.download(image.url).subscribe({
      next: (blob) => {
        this.localPreviewUrl = URL.createObjectURL(blob);
      },
      error: () => {
        this.panelError =
          'Could not load the image preview. You can still insert the image.';
      },
    });
  }

  protected closePanel(): void {
    if (this.imageUploading) return;
    this.releaseLocalPreview();
    this.panel = null;
    this.selectedFile = null;
    this.libraryImage = null;
    this.panelError = '';
    this.editor?.commands.focus();
  }

  protected inputValue(event: Event): string {
    this.panelError = '';
    return (event.target as HTMLInputElement).value;
  }

  protected submitPanel(event: Event): void {
    event.preventDefault();
    if (!this.editor || this.imageUploading) return;
    if (this.panel === 'link') {
      const url = this.linkUrl.trim();
      if (!/^(https?:\/\/|mailto:)/i.test(url)) {
        this.panelError =
          'Enter a valid link beginning with https:// or mailto:.';
        return;
      }
      if (!this.hasTextSelection && !this.linkText.trim()) {
        this.panelError = 'Enter the text that will display for this link.';
        return;
      }
      if (this.hasTextSelection)
        this.editor.chain().focus().setLink({ href: url }).run();
      else
        this.editor
          .chain()
          .focus()
          .insertContent({
            type: 'text',
            text: this.linkText.trim(),
            marks: [{ type: 'link', attrs: { href: url } }],
          })
          .run();
      this.closePanel();
      return;
    }
    const alt = this.imageAlt.trim();
    if (!alt) {
      this.panelError = 'Describe the image before adding it.';
      return;
    }
    if (this.panel === 'image') {
      const url = this.imageUrl.trim();
      if (!/^(https:\/\/|\/api\/guides\/images\/)/i.test(url)) {
        this.panelError = 'Enter an image URL beginning with https://.';
        return;
      }
      this.insertUploadedImage(url, alt);
      this.closePanel();
    } else if (this.panel === 'upload') {
      if (!this.selectedFile) {
        this.panelError = 'Choose a JPEG or PNG image.';
        return;
      }
      this.fileSelected.emit({ file: this.selectedFile, alt });
    } else if (this.panel === 'library' && this.libraryImage) {
      this.libraryImageSelected.emit({ image: this.libraryImage, alt });
    }
  }

  showImageError(message: string): void {
    this.panelError = message;
  }

  insertUploadedImage(url: string, alt: string): void {
    this.editor?.chain().focus().setImage({ src: url, alt }).run();
    this.releaseLocalPreview();
    this.panel = null;
    this.selectedFile = null;
    this.libraryImage = null;
    this.panelError = '';
  }

  protected chooseFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.releaseLocalPreview();
    this.selectedFile = null;
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      this.panelError = 'Use a JPEG or PNG image.';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.panelError = 'The original image must be 10 MB or smaller.';
      return;
    }
    this.selectedFile = file;
    this.localPreviewUrl = URL.createObjectURL(file);
    this.panelError = '';
  }

  private releaseLocalPreview(): void {
    this.libraryPreview?.unsubscribe();
    this.libraryPreview = undefined;
    if (this.localPreviewUrl) URL.revokeObjectURL(this.localPreviewUrl);
    this.localPreviewUrl = null;
  }

  private focusPanelInput(): void {
    setTimeout(() => {
      this.content.nativeElement.parentElement
        ?.querySelector<HTMLInputElement>('.insert-panel input')
        ?.focus();
    });
  }
}
