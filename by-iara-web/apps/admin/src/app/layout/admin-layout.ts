import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
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

  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly sidebar = viewChild<ElementRef<HTMLElement>>('sidebar');
  private readonly menuButton =
    viewChild<ElementRef<HTMLButtonElement>>('menuButton');
  protected readonly admin = this.auth.admin;
  protected readonly isMobile = signal(false);
  protected readonly navigationQuery = signal('');
  protected readonly filteredNavigationItems = computed(() => {
    const query = this.navigationQuery().trim().toLocaleLowerCase();
    return navigationItems.filter((item) =>
      item.label.toLocaleLowerCase().includes(query),
    );
  });
  protected readonly currentPage = signal('Dashboard');
  protected readonly currentGroup = signal('Workspace');
  protected readonly toolbarDate = new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date());

  protected readonly isCollapsed = signal(false);
  protected readonly isMobileMenuOpen = signal(false);
  protected readonly dashboardItem = dashboardItem;
  protected readonly navigationGroups = navigationGroups;
  protected readonly navigationItems = navigationItems;

  constructor() {
    afterNextRender(() => {
      const media = window.matchMedia('(max-width: 48rem)');
      const update = () => {
        this.isMobile.set(media.matches);
        if (!media.matches) this.isMobileMenuOpen.set(false);
      };
      update();
      media.addEventListener('change', update);
      this.destroyRef.onDestroy(() =>
        media.removeEventListener('change', update),
      );
    });
    this.expandGroupForCurrentRoute();
    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd,
        ),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.expandGroupForCurrentRoute();
        this.isMobileMenuOpen.set(false);
        this.navigationQuery.set('');
      });
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
    if (this.isMobileMenuOpen()) {
      afterNextRender(
        () => {
          this.sidebar()
            ?.nativeElement.querySelector<HTMLButtonElement>('.mobile-close')
            ?.focus();
        },
        { injector: this.injector },
      );
    }
  }

  protected closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
    if (this.isMobile()) {
      afterNextRender(() => this.menuButton()?.nativeElement.focus(), {
        injector: this.injector,
      });
    }
  }

  protected onSidebarKeydown(event: KeyboardEvent): void {
    if (!this.isMobileMenuOpen() || !this.isMobile()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeMobileMenu();
    }
    if (event.key !== 'Tab') return;
    const items = Array.from(
      this.sidebar()?.nativeElement.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled])',
      ) ?? [],
    ).filter((item) => item.getClientRects().length > 0);
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  private expandGroupForCurrentRoute(): void {
    const activeGroup = navigationGroups.find((group) =>
      group.items.some(
        (item) =>
          this.router.url === item.route ||
          this.router.url.startsWith(`${item.route}/`),
      ),
    );
    const activeItem = navigationItems.find(
      (item) =>
        this.router.url.split('?')[0] === item.route ||
        this.router.url.startsWith(`${item.route}/`),
    );
    this.currentPage.set(activeItem?.label ?? 'Dashboard');
    this.currentGroup.set(activeGroup?.label ?? 'Workspace');
    if (activeGroup) {
      this.sidebarPreferences.openGroup(activeGroup.id);
    }
  }

  protected logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
