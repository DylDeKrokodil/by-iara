import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Route,
  ViewTransitionInfo,
} from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminMotion } from './admin-motion';

describe('AdminMotion', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });

  it('animates pointer navigation between different pages', () => {
    stubReducedMotion(false);
    const motion = TestBed.inject(AdminMotion);
    const info = transitionInfo({ path: 'dashboard' }, { path: 'services' });
    motion.initialize();

    document.dispatchEvent(new Event('pointerdown'));
    motion.configureRouteTransition(info);

    expect(info.transition.skipTransition).not.toHaveBeenCalled();
  });

  it('skips keyboard and same-page route transitions', () => {
    stubReducedMotion(false);
    const motion = TestBed.inject(AdminMotion);
    const route = { path: 'availability' };
    motion.initialize();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    const keyboardInfo = transitionInfo(
      { path: 'dashboard' },
      { path: 'services' },
    );
    motion.configureRouteTransition(keyboardInfo);
    expect(keyboardInfo.transition.skipTransition).toHaveBeenCalledOnce();

    document.dispatchEvent(new Event('pointerdown'));
    const samePageInfo = transitionInfo(route, route);
    motion.configureRouteTransition(samePageInfo);
    expect(samePageInfo.transition.skipTransition).toHaveBeenCalledOnce();
  });

  it('skips route transitions when reduced motion is requested', () => {
    stubReducedMotion(true);
    const motion = TestBed.inject(AdminMotion);
    const info = transitionInfo({ path: 'dashboard' }, { path: 'services' });

    motion.configureRouteTransition(info);

    expect(info.transition.skipTransition).toHaveBeenCalledOnce();
  });
});

function stubReducedMotion(matches: boolean): void {
  vi.stubGlobal('matchMedia', () => ({ matches }));
}

function transitionInfo(from: Route, to: Route): ViewTransitionInfo {
  return {
    from: { firstChild: null, routeConfig: from } as ActivatedRouteSnapshot,
    to: { firstChild: null, routeConfig: to } as ActivatedRouteSnapshot,
    transition: {
      skipTransition: vi.fn(),
    } as unknown as ViewTransition,
  };
}
