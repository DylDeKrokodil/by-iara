import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  imports: [RouterModule],
  selector: 'byiara-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected title = 'admin';
}
