import { Component, inject } from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { AuthService } from '../core/auth.service';

interface NavItem {
  label: string;
  path: string;
}

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

  // Add a page: create its component + a child route, then one entry here.
  protected readonly navItems: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Reservations', path: '/reservations' },
    { label: 'Services', path: '/services' },
    { label: 'Availability', path: '/availability' },
    { label: 'Regions', path: '/regions' },
  ];

  protected logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
