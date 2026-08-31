import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import {
  Button,
  Card,
  ConfirmationModal,
  DetailList,
  ToastService,
} from '@by-iara/shared-ui';
import { CalendarFeedApi } from './calendar-feed-api';
import { CalendarFeedLinks, CalendarFeedStatus } from './calendar-feed.models';

@Component({
  selector: 'byiara-calendar-sync',
  imports: [Button, Card, ConfirmationModal, DetailList],
  templateUrl: './calendar-sync.html',
  styleUrl: './calendar-sync.css',
})
export class CalendarSync implements OnInit {
  private readonly api = inject(CalendarFeedApi);
  private readonly toast = inject(ToastService);

  protected readonly status = signal<CalendarFeedStatus | null>(null);
  protected readonly links = signal<CalendarFeedLinks | null>(null);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  @ViewChild('confirmRegenerateModal')
  private confirmRegenerateModal!: ConfirmationModal;

  @ViewChild('confirmDisconnectModal')
  private confirmDisconnectModal!: ConfirmationModal;

  ngOnInit(): void {
    this.load();
  }

  protected openRegenerateConfirmation(): void {
    this.confirmRegenerateModal.open();
  }

  protected openDisconnectConfirmation(): void {
    this.confirmDisconnectModal.open();
  }

  protected regenerate(): void {
    if (this.submitting()) return;

    this.submitting.set(true);
    this.error.set(null);
    this.api.regenerate().subscribe({
      next: (links) => {
        this.links.set(links);
        this.submitting.set(false);
        this.load();
        this.toast.show(
          'Calendar link ready - copy it into your iPhone now.',
          'success',
        );
      },
      error: () => this.handleError('Could not generate a calendar link.'),
    });
  }

  protected disconnect(): void {
    if (this.submitting()) return;

    this.submitting.set(true);
    this.error.set(null);
    this.api.revoke().subscribe({
      next: () => {
        this.links.set(null);
        this.submitting.set(false);
        this.load();
        this.toast.show('Calendar sync disconnected.', 'success');
      },
      error: () => this.handleError('Could not disconnect calendar sync.'),
    });
  }

  protected copy(url: string): void {
    navigator.clipboard.writeText(url).then(
      () => this.toast.show('Copied to clipboard', 'success'),
      () =>
        this.toast.show(
          'Could not copy automatically - select and copy the link manually.',
          'error',
        ),
    );
  }

  protected formatDate(value: string | null): string {
    if (!value) {
      return '';
    }

    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: 'Europe/Brussels',
    }).format(new Date(value));
  }

  private load(): void {
    this.api.status().subscribe({
      next: (status) => this.status.set(status),
      error: () => this.error.set('Could not load calendar sync status.'),
    });
  }

  private handleError(message: string): void {
    this.submitting.set(false);
    this.error.set(message);
    this.toast.show(message, 'error');
  }
}
