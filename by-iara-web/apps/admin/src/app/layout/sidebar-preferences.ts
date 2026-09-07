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

export const sidebarGroupIds = [
  'appointments',
  'catalogue',
  'content',
  'business',
] as const;

export type SidebarGroupId = (typeof sidebarGroupIds)[number];

const storageKey = 'byiara.admin.sidebar-groups.v1';
const defaultOpenGroupIds: ReadonlyArray<SidebarGroupId> = sidebarGroupIds;

@Injectable({ providedIn: 'root' })
export class SidebarPreferences {
  private readonly storedOpenGroupIds = signal<ReadonlySet<SidebarGroupId>>(
    this.readOpenGroupIds(),
  );

  readonly openGroupIds = this.storedOpenGroupIds.asReadonly();

  toggleGroup(id: SidebarGroupId): void {
    const next = new Set(this.storedOpenGroupIds());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.updateOpenGroups(next);
  }

  openGroup(id: SidebarGroupId): void {
    if (this.storedOpenGroupIds().has(id)) {
      return;
    }
    const next = new Set(this.storedOpenGroupIds());
    next.add(id);
    this.updateOpenGroups(next);
  }

  private readOpenGroupIds(): ReadonlySet<SidebarGroupId> {
    try {
      const stored = globalThis.localStorage?.getItem(storageKey);
      if (stored === null || stored === undefined) {
        return new Set(defaultOpenGroupIds);
      }
      const parsed: unknown = JSON.parse(stored);
      if (!Array.isArray(parsed)) {
        return new Set(defaultOpenGroupIds);
      }
      return new Set(parsed.filter(isSidebarGroupId));
    } catch {
      return new Set(defaultOpenGroupIds);
    }
  }

  private updateOpenGroups(ids: ReadonlySet<SidebarGroupId>): void {
    this.storedOpenGroupIds.set(ids);
    try {
      globalThis.localStorage?.setItem(storageKey, JSON.stringify([...ids]));
    } catch {
      // Navigation remains usable when storage is unavailable.
    }
  }
}

function isSidebarGroupId(value: unknown): value is SidebarGroupId {
  return (
    typeof value === 'string' &&
    (sidebarGroupIds as ReadonlyArray<string>).includes(value)
  );
}
