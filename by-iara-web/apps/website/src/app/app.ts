import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ToastContainerComponent } from '@by-iara/shared-ui';

@Component({
  imports: [RouterModule, ToastContainerComponent],
  selector: 'byiara-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected title = 'website';
}
