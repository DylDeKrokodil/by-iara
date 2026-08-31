import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'byiara-site-intro',
  templateUrl: './site-intro.component.html',
  styleUrl: './site-intro.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
  },
})
export class SiteIntroComponent {}
