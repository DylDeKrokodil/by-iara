import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  dismissing?: boolean;
}

const TOAST_EXIT_DURATION_MS = 140;

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  public readonly toasts = signal<Toast[]>([]);
  private readonly autoDismissTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();
  private readonly removalTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();

  public show(
    message: string,
    type: 'success' | 'error' | 'info' = 'info',
    duration = 3000,
  ): void {
    const id = Math.random().toString(36).substring(2, 9);
    const toast: Toast = { id, message, type };

    this.toasts.update((curr) => [...curr, toast]);

    const timer = setTimeout(() => {
      this.remove(id);
    }, duration);
    this.autoDismissTimers.set(id, timer);
  }

  public remove(id: string): void {
    const toast = this.toasts().find((item) => item.id === id);
    if (!toast || toast.dismissing) return;

    this.clearTimer(this.autoDismissTimers, id);
    if (prefersReducedMotion()) {
      this.removeImmediately(id);
      return;
    }

    this.toasts.update((current) =>
      current.map((item) =>
        item.id === id ? { ...item, dismissing: true } : item,
      ),
    );
    const timer = setTimeout(
      () => this.removeImmediately(id),
      TOAST_EXIT_DURATION_MS,
    );
    this.removalTimers.set(id, timer);
  }

  private removeImmediately(id: string): void {
    this.clearTimer(this.autoDismissTimers, id);
    this.clearTimer(this.removalTimers, id);
    this.toasts.update((current) => current.filter((toast) => toast.id !== id));
  }

  private clearTimer(
    timers: Map<string, ReturnType<typeof setTimeout>>,
    id: string,
  ): void {
    const timer = timers.get(id);
    if (timer !== undefined) clearTimeout(timer);
    timers.delete(id);
  }
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
