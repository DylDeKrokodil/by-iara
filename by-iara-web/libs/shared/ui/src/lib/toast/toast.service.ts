import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  public readonly toasts = signal<Toast[]>([]);

  public show(message: string, type: 'success' | 'error' | 'info' = 'info', duration: number = 3000): void {
    const id = Math.random().toString(36).substring(2, 9);
    const toast: Toast = { id, message, type };

    this.toasts.update((curr) => [...curr, toast]);

    setTimeout(() => {
      this.remove(id);
    }, duration);
  }

  public remove(id: string): void {
    this.toasts.update((curr) => curr.filter((t) => t.id !== id));
  }
}
