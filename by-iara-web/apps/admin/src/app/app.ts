import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AdminMotion } from './core/admin-motion';

@Component({
  imports: [RouterModule],
  selector: 'byiara-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly adminMotion = inject(AdminMotion);
  protected title = 'admin';

  constructor() {
    this.adminMotion.initialize();
  }
}
