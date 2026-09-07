import { NgTemplateOutlet } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { ToastContainerComponent } from '@by-iara/shared-ui';
import {
  SidebarGroupId,
  SidebarItemId,
  SidebarPreferences,
} from './sidebar-preferences';

interface NavigationItem {
  readonly id: SidebarItemId;
  readonly label: string;
  readonly route: string;
}

interface NavigationGroup {
  readonly id: SidebarGroupId;
  readonly label: string;
  readonly items: ReadonlyArray<NavigationItem>;
}

const dashboardItem: NavigationItem = {
  id: 'dashboard',
  label: 'Dashboard',
  route: '/dashboard',
};

const navigationGroups: ReadonlyArray<NavigationGroup> = [
  {
    id: 'appointments',
    label: 'Appointments',
    items: [
      { id: 'reservations', label: 'Reservations', route: '/reservations' },
      { id: 'customers', label: 'Customers', route: '/customers' },
      { id: 'availability', label: 'Availability', route: '/availability' },
    ],
  },
  {
    id: 'catalogue',
    label: 'Catalogue',
    items: [
      { id: 'services', label: 'Services', route: '/services' },
      { id: 'packs', label: 'Packs', route: '/packs' },
      { id: 'discounts', label: 'Discounts', route: '/discounts' },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    items: [
      { id: 'guides', label: 'Guides', route: '/guides' },
      { id: 'images', label: 'Images', route: '/images' },
    ],
  },
  {
    id: 'business',
    label: 'Business',
    items: [
      { id: 'reports', label: 'Reports', route: '/reports' },
      { id: 'settings', label: 'Settings', route: '/settings' },
    ],
  },
];

const navigationItems: ReadonlyArray<NavigationItem> = [
  dashboardItem,
  ...navigationGroups.flatMap((group) => group.items),
];

@Component({
  selector: 'byiara-admin-layout',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    ToastContainerComponent,
  ],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css',
})
export class AdminLayout {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly sidebarPreferences = inject(SidebarPreferences);

  protected readonly admin = this.auth.admin;

  protected readonly isCollapsed = signal(false);
  protected readonly isMobileMenuOpen = signal(false);
  protected readonly dashboardItem = dashboardItem;
  protected readonly navigationGroups = navigationGroups;
  protected readonly navigationItems = navigationItems;

  constructor() {
    this.expandGroupForCurrentRoute();
    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd,
        ),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.expandGroupForCurrentRoute());
  }

  protected toggleGroup(id: SidebarGroupId): void {
    this.sidebarPreferences.toggleGroup(id);
  }

  protected isGroupOpen(id: SidebarGroupId): boolean {
    return this.sidebarPreferences.openGroupIds().has(id);
  }

  protected toggleCollapse(): void {
    this.isCollapsed.update((value) => !value);
  }

  protected toggleMobileMenu(): void {
    if (!this.isMobileMenuOpen()) {
      this.isCollapsed.set(false);
    }
    this.isMobileMenuOpen.update((val) => !val);
  }

  protected closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  private expandGroupForCurrentRoute(): void {
    const activeGroup = navigationGroups.find((group) =>
      group.items.some(
        (item) =>
          this.router.url === item.route ||
          this.router.url.startsWith(`${item.route}/`),
      ),
    );
    if (activeGroup) {
      this.sidebarPreferences.openGroup(activeGroup.id);
    }
  }

  protected logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
