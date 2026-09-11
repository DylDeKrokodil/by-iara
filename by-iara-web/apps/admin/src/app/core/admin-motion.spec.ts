import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminMotion } from './admin-motion';

describe('AdminMotion', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });

  it('reports the current reduced-motion preference', () => {
    stubReducedMotion(false);
    const motion = TestBed.inject(AdminMotion);

    expect(motion.prefersReducedMotion()).toBe(false);

    stubReducedMotion(true);
    expect(motion.prefersReducedMotion()).toBe(true);
  });
});

function stubReducedMotion(matches: boolean): void {
  vi.stubGlobal('matchMedia', () => ({ matches }));
}
