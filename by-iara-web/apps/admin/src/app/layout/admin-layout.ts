import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
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
import { SidebarItemId, SidebarPreferences } from './sidebar-preferences';

interface NavigationItem {
  readonly id: SidebarItemId;
  readonly label: string;
  readonly route: string;
}

const navigationItems: ReadonlyArray<NavigationItem> = [
  { id: 'dashboard', label: 'Dashboard', route: '/dashboard' },
  { id: 'reservations', label: 'Reservations', route: '/reservations' },
  { id: 'reports', label: 'Reports', route: '/reports' },
  { id: 'services', label: 'Services', route: '/services' },
  { id: 'guides', label: 'Guides', route: '/guides' },
  { id: 'images', label: 'Images', route: '/images' },
  { id: 'customers', label: 'Customers', route: '/customers' },
  { id: 'packs', label: 'Packs', route: '/packs' },
  { id: 'discounts', label: 'Discounts', route: '/discounts' },
  { id: 'availability', label: 'Availability', route: '/availability' },
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
  protected readonly isMoreOpen = signal(false);
  protected readonly customizingFavorites = signal(false);
  protected readonly favoriteItems = computed(() => {
    const favoriteIds = this.sidebarPreferences.favoriteIds();
    return navigationItems.filter((item) => favoriteIds.has(item.id));
  });
  protected readonly moreItems = computed(() => {
    const favoriteIds = this.sidebarPreferences.favoriteIds();
    return navigationItems.filter((item) => !favoriteIds.has(item.id));
  });

  constructor() {
    this.expandMoreForCurrentRoute();
    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd,
        ),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.expandMoreForCurrentRoute());
  }

  protected toggleMore(): void {
    if (this.isCollapsed()) {
      this.isCollapsed.set(false);
      this.isMoreOpen.set(true);
      return;
    }
    this.isMoreOpen.update((value) => !value);
  }

  protected toggleCollapse(): void {
    this.isCollapsed.update((value) => !value);
    if (this.isCollapsed()) {
      this.customizingFavorites.set(false);
      this.isMoreOpen.set(false);
    }
  }

  protected toggleFavoriteCustomization(): void {
    this.customizingFavorites.update((value) => !value);
    if (this.customizingFavorites()) {
      this.isMoreOpen.set(true);
    }
  }

  protected toggleFavorite(id: SidebarItemId): void {
    this.sidebarPreferences.toggleFavorite(id);
  }

  protected isFavorite(id: SidebarItemId): boolean {
    return this.sidebarPreferences.favoriteIds().has(id);
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

  private expandMoreForCurrentRoute(): void {
    const currentItem = navigationItems.find(
      (item) =>
        this.router.url === item.route ||
        this.router.url.startsWith(`${item.route}/`),
    );
    if (currentItem && !this.isFavorite(currentItem.id)) {
      this.isMoreOpen.set(true);
    }
  }

  protected logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
