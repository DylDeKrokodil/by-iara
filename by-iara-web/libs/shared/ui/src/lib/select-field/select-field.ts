import {
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

export interface SelectFieldOption {
  label: string;
  value: string;
}

@Component({
  selector: 'byiara-select-field',
  imports: [],
  templateUrl: './select-field.html',
  styleUrl: './select-field.css',
})
export class SelectField {
  private static nextId = 0;

  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly instanceId = SelectField.nextId++;

  label = input.required<string>();
  options = input.required<ReadonlyArray<SelectFieldOption>>();
  value = input.required<string>();
  valueChange = output<string>();

  protected readonly open = signal(false);
  protected readonly activeIndex = signal(0);
  protected readonly labelId = `byiara-select-field-label-${this.instanceId}`;
  protected readonly listboxId = `byiara-select-field-listbox-${this.instanceId}`;
  protected readonly activeOptionId = computed(() => (
    this.open() && this.options()[this.activeIndex()]
      ? this.optionId(this.activeIndex())
      : null
  ));
  protected readonly selectedOption = computed(() => (
    this.options().find((option) => option.value === this.value()) ?? this.options()[0] ?? null
  ));
  protected readonly selectedLabel = computed(() => this.selectedOption()?.label ?? '');

  @HostListener('document:click', ['$event.target'])
  protected onDocumentClick(target: EventTarget | null): void {
    if (target instanceof Node && !this.elementRef.nativeElement.contains(target)) {
      this.closeDropdown();
    }
  }

  protected optionId(index: number): string {
    return `${this.listboxId}-option-${index}`;
  }

  protected toggleDropdown(): void {
    if (this.open()) {
      this.closeDropdown();
      return;
    }

    this.openDropdown();
  }

  protected selectOption(option: SelectFieldOption): void {
    if (option.value !== this.value()) {
      this.valueChange.emit(option.value);
    }

    this.closeDropdown();
  }

  protected activateOption(index: number): void {
    this.activeIndex.set(index);
  }

  protected onTriggerKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.openDropdown();
        this.moveActiveOption(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.openDropdown();
        this.moveActiveOption(-1);
        break;
      case 'Home':
        if (this.open()) {
          event.preventDefault();
          this.activeIndex.set(0);
        }
        break;
      case 'End':
        if (this.open()) {
          event.preventDefault();
          this.activeIndex.set(Math.max(this.options().length - 1, 0));
        }
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!this.open()) {
          this.openDropdown();
          return;
        }

        this.selectActiveOption();
        break;
      case 'Escape':
        this.closeDropdown();
        break;
      case 'Tab':
        this.closeDropdown();
        break;
    }
  }

  private openDropdown(): void {
    this.activeIndex.set(this.selectedIndex());
    this.open.set(true);
  }

  private closeDropdown(): void {
    this.open.set(false);
  }

  private selectedIndex(): number {
    const selectedIndex = this.options().findIndex((option) => option.value === this.value());

    return selectedIndex >= 0 ? selectedIndex : 0;
  }

  private moveActiveOption(step: 1 | -1): void {
    const optionsLength = this.options().length;

    if (optionsLength === 0) {
      this.activeIndex.set(0);
      return;
    }

    this.activeIndex.update((current) => (current + step + optionsLength) % optionsLength);
  }

  private selectActiveOption(): void {
    const option = this.options()[this.activeIndex()];

    if (option) {
      this.selectOption(option);
    }
  }
}
