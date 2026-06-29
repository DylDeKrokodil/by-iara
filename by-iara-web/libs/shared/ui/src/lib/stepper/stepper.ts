import { Component, computed, input, output } from '@angular/core';

export interface StepperStep {
  readonly id: string;
  readonly label: string;
  /** When true the step cannot be opened yet. */
  readonly disabled?: boolean;
}

/**
 * Horizontal step indicator. Owns the look and the completed/selected styling;
 * the host decides which steps are reachable (via `disabled`) and reacts to
 * `stepSelect`.
 */
@Component({
  selector: 'byiara-stepper',
  imports: [],
  templateUrl: './stepper.html',
  styleUrl: './stepper.css',
})
export class Stepper {
  steps = input.required<ReadonlyArray<StepperStep>>();
  current = input.required<string>();
  ariaLabel = input<string>('');
  stepSelect = output<string>();

  protected readonly currentIndex = computed(() =>
    this.steps().findIndex((step) => step.id === this.current()),
  );

  protected onSelect(step: StepperStep): void {
    if (!step.disabled) {
      this.stepSelect.emit(step.id);
    }
  }
}
