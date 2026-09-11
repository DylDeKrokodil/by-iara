import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
} from '@angular/core';
import { Button } from '../button/button';

/** Shared presentation for the website popup and its admin preview. No automatic focus or modal semantics. */
@Component({
  selector: 'byiara-announcement-card',
  imports: [Button],
  templateUrl: './announcement-card.html',
  styleUrl: './announcement-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnouncementCard {
  title = input.required<string>();
  message = input.required<string>();
  actionLabel = input.required<string>();
  actionLink = input<readonly string[] | null>(null);
  closeLabel = input('Close announcement');
  moreLabel = input('Read more');
  lessLabel = input('Show less');
  dismissed = output<void>();
  followed = output<void>();
  protected readonly expanded = signal(false);
}
