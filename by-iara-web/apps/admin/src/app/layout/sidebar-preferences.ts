import { Injectable, signal } from '@angular/core';

export const sidebarItemIds = [
  'dashboard',
  'reservations',
  'reports',
  'services',
  'guides',
  'images',
  'customers',
  'packs',
  'discounts',
  'availability',
  'settings',
] as const;

export type SidebarItemId = (typeof sidebarItemIds)[number];

const storageKey = 'byiara.admin.sidebar-favorites.v1';
const defaultFavoriteIds: ReadonlyArray<SidebarItemId> = [
  'dashboard',
  'reports',
];

@Injectable({ providedIn: 'root' })
export class SidebarPreferences {
  private readonly storedFavoriteIds = signal<ReadonlySet<SidebarItemId>>(
    this.readFavoriteIds(),
  );

  readonly favoriteIds = this.storedFavoriteIds.asReadonly();

  toggleFavorite(id: SidebarItemId): void {
    const next = new Set(this.storedFavoriteIds());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.storedFavoriteIds.set(next);
    this.persistFavoriteIds(next);
  }

  private readFavoriteIds(): ReadonlySet<SidebarItemId> {
    try {
      const stored = globalThis.localStorage?.getItem(storageKey);
      if (stored === null || stored === undefined) {
        return new Set(defaultFavoriteIds);
      }
      const parsed: unknown = JSON.parse(stored);
      if (!Array.isArray(parsed)) {
        return new Set(defaultFavoriteIds);
      }
      return new Set(parsed.filter(isSidebarItemId));
    } catch {
      return new Set(defaultFavoriteIds);
    }
  }

  private persistFavoriteIds(ids: ReadonlySet<SidebarItemId>): void {
    try {
      globalThis.localStorage?.setItem(storageKey, JSON.stringify([...ids]));
    } catch {
      // Navigation remains usable when storage is unavailable.
    }
  }
}

function isSidebarItemId(value: unknown): value is SidebarItemId {
  return (
    typeof value === 'string' &&
    (sidebarItemIds as ReadonlyArray<string>).includes(value)
  );
}
