import { DestroyRef, WritableSignal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface FragmentTabOptions<T extends string> {
  readonly allowedValues: readonly T[];
  readonly defaultValue: T;
  readonly destroyRef: DestroyRef;
  readonly route: ActivatedRoute;
  readonly router: Router;
  readonly state: WritableSignal<T>;
}

export function connectFragmentTab<T extends string>(
  options: FragmentTabOptions<T>,
): void {
  options.route.fragment
    .pipe(takeUntilDestroyed(options.destroyRef))
    .subscribe((fragment) => {
      const value = options.allowedValues.includes(fragment as T)
        ? (fragment as T)
        : options.defaultValue;

      options.state.set(value);

      if (fragment !== value) {
        void navigateToFragmentTab(options.router, options.route, value, true);
      }
    });
}

export function navigateToFragmentTab(
  router: Router,
  route: ActivatedRoute,
  value: string,
  replaceUrl = false,
): Promise<boolean> {
  return router.navigate([], {
    relativeTo: route,
    fragment: value,
    queryParamsHandling: 'preserve',
    replaceUrl,
  });
}
