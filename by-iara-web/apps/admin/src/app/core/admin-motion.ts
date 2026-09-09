import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, ViewTransitionInfo } from '@angular/router';

type InputModality = 'keyboard' | 'pointer';

@Injectable({ providedIn: 'root' })
export class AdminMotion {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private inputModality: InputModality = 'pointer';
  private initialized = false;

  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    const onKeyDown = () => {
      this.inputModality = 'keyboard';
    };
    const onPointerDown = () => {
      this.inputModality = 'pointer';
    };

    this.document.addEventListener('keydown', onKeyDown, true);
    this.document.addEventListener('pointerdown', onPointerDown, true);
    this.destroyRef.onDestroy(() => {
      this.document.removeEventListener('keydown', onKeyDown, true);
      this.document.removeEventListener('pointerdown', onPointerDown, true);
    });
  }

  configureRouteTransition(info: ViewTransitionInfo): void {
    if (
      this.prefersReducedMotion() ||
      this.inputModality === 'keyboard' ||
      leafRoute(info.from).routeConfig === leafRoute(info.to).routeConfig
    ) {
      info.transition.skipTransition();
    }
  }

  prefersReducedMotion(): boolean {
    return (
      this.document.defaultView?.matchMedia('(prefers-reduced-motion: reduce)')
        .matches ?? false
    );
  }
}

export function configureAdminRouteTransition(info: ViewTransitionInfo): void {
  inject(AdminMotion).configureRouteTransition(info);
}

function leafRoute(route: ActivatedRouteSnapshot): ActivatedRouteSnapshot {
  let current = route;
  while (current.firstChild) current = current.firstChild;
  return current;
}
