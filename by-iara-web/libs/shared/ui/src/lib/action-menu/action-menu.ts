import {
  Component,
  ElementRef,
  HostListener,
  input,
  output,
  signal,
  ViewChild,
} from '@angular/core';

export type ActionMenuIcon =
  | 'archive'
  | 'duplicate'
  | 'edit'
  | 'preview'
  | 'publish'
  | 'unpublish'
  | 'void';

export interface ActionMenuItem {
  id: string;
  label: string;
  icon: ActionMenuIcon;
  tone?: 'default' | 'danger';
  disabled?: boolean;
}

@Component({
  selector: 'byiara-action-menu',
  templateUrl: './action-menu.html',
  styleUrl: './action-menu.css',
})
export class ActionMenu {
  items = input.required<ReadonlyArray<ActionMenuItem>>();
  ariaLabel = input('Actions');
  triggerTooltip = input('More actions');
  actionSelected = output<string>();

  protected readonly open = signal(false);
  protected readonly menuTop = signal(0);
  protected readonly menuLeft = signal(0);

  @ViewChild('trigger') private trigger?: ElementRef<HTMLButtonElement>;
  @ViewChild('menu') private menu?: ElementRef<HTMLElement>;

  protected toggle(event: MouseEvent): void {
    event.stopPropagation();
    if (this.open()) {
      this.close();
    } else {
      this.openMenu(event.detail === 0);
    }
  }

  protected select(item: ActionMenuItem): void {
    if (item.disabled) return;
    this.close();
    this.actionSelected.emit(item.id);
  }

  protected onMenuKeydown(event: KeyboardEvent): void {
    const buttons = this.menuButtons();
    if (!buttons.length) return;
    const currentIndex = buttons.indexOf(
      document.activeElement as HTMLButtonElement,
    );

    if (event.key === 'Escape') {
      event.preventDefault();
      this.close(true);
      return;
    }

    let nextIndex: number | null = null;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight')
      nextIndex = (currentIndex + 1) % buttons.length;
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
    }
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = buttons.length - 1;

    if (nextIndex !== null) {
      event.preventDefault();
      buttons[nextIndex]?.focus();
    }
  }

  @HostListener('document:click')
  protected onDocumentClick(): void {
    this.close();
  }

  @HostListener('document:keydown', ['$event'])
  protected onDocumentKeydown(event: KeyboardEvent): void {
    if (this.open()) this.onMenuKeydown(event);
  }

  @HostListener('window:resize')
  @HostListener('document:scroll')
  protected onViewportChange(): void {
    this.close();
  }

  private openMenu(focusFirstItem: boolean): void {
    const menu = this.menu?.nativeElement;
    const trigger = this.trigger?.nativeElement;
    if (!menu || !trigger) return;

    menu.showPopover();
    this.open.set(true);

    const triggerRect = trigger.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const viewportPadding = 8;
    const gap = 6;
    const left = Math.min(
      window.innerWidth - menuRect.width - viewportPadding,
      Math.max(viewportPadding, triggerRect.right - menuRect.width),
    );
    const fitsBelow =
      triggerRect.bottom + gap + menuRect.height <=
      window.innerHeight - viewportPadding;
    const top = fitsBelow
      ? triggerRect.bottom + gap
      : Math.max(viewportPadding, triggerRect.top - menuRect.height - gap);

    this.menuLeft.set(left);
    this.menuTop.set(top);
    if (focusFirstItem) this.menuButtons()[0]?.focus();
  }

  private close(restoreFocus = false): void {
    if (!this.open()) return;
    const menu = this.menu?.nativeElement;
    if (menu?.matches(':popover-open')) menu.hidePopover();
    this.open.set(false);
    if (restoreFocus) this.trigger?.nativeElement.focus();
  }

  private menuButtons(): HTMLButtonElement[] {
    return Array.from(
      this.menu?.nativeElement.querySelectorAll<HTMLButtonElement>(
        '.action-menu-item:not(:disabled)',
      ) ?? [],
    );
  }
}
