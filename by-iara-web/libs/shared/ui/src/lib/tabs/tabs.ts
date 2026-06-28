import { Component, computed, input, output } from '@angular/core';

export interface TabOption {
  label: string;
  value: string;
}

@Component({
  selector: 'byiara-tabs',
  imports: [],
  templateUrl: './tabs.html',
  styleUrl: './tabs.css',
})
export class Tabs {
  tabs = input.required<ReadonlyArray<TabOption>>();
  activeValue = input.required<string>();
  ariaLabel = input('Tabs');
  activeValueChange = output<string>();

  protected readonly activeIndex = computed(() => {
    const index = this.tabs().findIndex((tab) => tab.value === this.activeValue());

    return index >= 0 ? index : 0;
  });

  protected tabId(index: number): string {
    return `byiara-tab-${index}`;
  }

  protected selectTab(value: string): void {
    if (value !== this.activeValue()) {
      this.activeValueChange.emit(value);
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        this.moveActiveTab(-1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.moveActiveTab(1);
        break;
      case 'Home':
        event.preventDefault();
        this.selectTabAt(0);
        break;
      case 'End':
        event.preventDefault();
        this.selectTabAt(this.tabs().length - 1);
        break;
    }
  }

  private moveActiveTab(step: 1 | -1): void {
    const tabCount = this.tabs().length;

    if (tabCount === 0) {
      return;
    }

    this.selectTabAt((this.activeIndex() + step + tabCount) % tabCount);
  }

  private selectTabAt(index: number): void {
    const tab = this.tabs()[index];

    if (tab) {
      this.selectTab(tab.value);
    }
  }
}
