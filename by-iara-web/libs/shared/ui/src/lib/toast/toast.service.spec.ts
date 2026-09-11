import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('marks a toast as dismissing before removing it', () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    const service = new ToastService();

    service.show('Saved', 'success');
    const id = service.toasts()[0]?.id;
    expect(id).toBeDefined();

    service.remove(id as string);
    expect(service.toasts()[0]?.dismissing).toBe(true);

    vi.runAllTimers();
    expect(service.toasts()).toEqual([]);
  });

  it('removes immediately when reduced motion is requested', () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const service = new ToastService();

    service.show('Saved');
    service.remove(service.toasts()[0]?.id as string);

    expect(service.toasts()).toEqual([]);
  });
});
