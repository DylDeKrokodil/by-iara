import { Component, inject, signal } from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'byiara-admin-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css',
})
export class AdminLayout {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly admin = this.auth.admin;

  protected readonly isCollapsed = signal(false);
  protected readonly isMobileMenuOpen = signal(false);

  protected toggleCollapse(): void {
    this.isCollapsed.update((val) => !val);
  }

  protected toggleMobileMenu(): void {
    this.isMobileMenuOpen.update((val) => !val);
  }

  protected closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  protected logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
