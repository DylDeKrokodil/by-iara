import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import { ConfirmationModal, ToastService } from '@by-iara/shared-ui';
import { CalendarSync } from './calendar-sync';
import { CalendarFeedApi } from './calendar-feed-api';
import { CalendarFeedLinks, CalendarFeedStatus } from './calendar-feed.models';

// jsdom doesn't implement <dialog> show/close; ConfirmationModal calls these directly.
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
  this.removeAttribute('open');
};

describe('CalendarSync', () => {
  let fixture: ComponentFixture<CalendarSync>;
  let api: {
    status: ReturnType<typeof vi.fn>;
    regenerate: ReturnType<typeof vi.fn>;
    revoke: ReturnType<typeof vi.fn>;
  };
  let toast: { show: ReturnType<typeof vi.fn> };

  const inactive: CalendarFeedStatus = { active: false, createdAt: null };
  const active: CalendarFeedStatus = {
    active: true,
    createdAt: '2026-07-01T10:00:00.000Z',
  };
  const links: CalendarFeedLinks = {
    httpsUrl: 'http://localhost:4201/api/calendar-feed/abc123.ics',
    webcalUrl: 'webcal://localhost:4201/api/calendar-feed/abc123.ics',
  };

  async function setUp(initialStatus: CalendarFeedStatus) {
    api = {
      status: vi.fn(() => of(initialStatus)),
      regenerate: vi.fn(() => of(links)),
      revoke: vi.fn(() => of(undefined)),
    };
    toast = { show: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [CalendarSync],
      providers: [
        { provide: CalendarFeedApi, useValue: api },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CalendarSync);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function clickButtonWithText(text: string): void {
    const buttons = fixture.debugElement.queryAll(By.css('byiara-button button'));
    const match = buttons.find((button) =>
      (button.nativeElement as HTMLElement).textContent?.includes(text),
    );
    if (!match) {
      throw new Error(`No button found with text "${text}"`);
    }
    match.nativeElement.click();
  }

  /** Bypasses the native <dialog> entirely - exercises the (confirmed) binding directly. */
  function confirmModal(index: number): void {
    const modals = fixture.debugElement.queryAll(By.directive(ConfirmationModal));
    modals[index].triggerEventHandler('confirmed', undefined);
  }

  it('loads status on init and shows a generate action when inactive', async () => {
    await setUp(inactive);

    expect(api.status).toHaveBeenCalled();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Generate link');
    expect(compiled.textContent).not.toContain('Connected since');
  });

  it('shows connected status and management actions when active', async () => {
    await setUp(active);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Connected since');
    expect(compiled.textContent).toContain('Regenerate link');
    expect(compiled.textContent).toContain('Disconnect');
  });

  it('generating a link calls the api and displays the returned url once', async () => {
    await setUp(inactive);

    clickButtonWithText('Generate link');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.regenerate).toHaveBeenCalled();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain(links.httpsUrl);
    expect(compiled.textContent).toContain("won't be shown again");
  });

  it('copy writes the displayed link to the clipboard and shows a toast', async () => {
    await setUp(inactive);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    clickButtonWithText('Generate link');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    clickButtonWithText('Copy link');
    await fixture.whenStable();

    expect(writeText).toHaveBeenCalledWith(links.httpsUrl);
    expect(toast.show).toHaveBeenCalledWith('Copied to clipboard', 'success');
  });

  it('regenerating asks for confirmation before calling the api', async () => {
    await setUp(active);

    clickButtonWithText('Regenerate link');
    fixture.detectChanges();
    expect(api.regenerate).not.toHaveBeenCalled();

    confirmModal(0);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.regenerate).toHaveBeenCalled();
  });

  it('disconnecting asks for confirmation, then calls revoke and reloads status', async () => {
    await setUp(active);
    api.status.mockReturnValue(of(inactive));

    clickButtonWithText('Disconnect');
    fixture.detectChanges();
    expect(api.revoke).not.toHaveBeenCalled();

    confirmModal(1);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.revoke).toHaveBeenCalled();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Generate link');
  });

  it('shows an error toast when regenerate fails', async () => {
    await setUp(inactive);
    api.regenerate.mockReturnValue(throwError(() => new Error('boom')));

    clickButtonWithText('Generate link');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(toast.show).toHaveBeenCalledWith(
      'Could not generate a calendar link.',
      'error',
    );
  });

  it('shows an error toast when disconnect fails', async () => {
    await setUp(active);
    api.revoke.mockReturnValue(throwError(() => new Error('boom')));

    clickButtonWithText('Disconnect');
    fixture.detectChanges();
    confirmModal(1);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(toast.show).toHaveBeenCalledWith(
      'Could not disconnect calendar sync.',
      'error',
    );
  });

  it('shows a recoverable error message when the initial status load fails', async () => {
    api = {
      status: vi.fn(() => throwError(() => new Error('offline'))),
      regenerate: vi.fn(() => of(links)),
      revoke: vi.fn(() => of(undefined)),
    };
    toast = { show: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [CalendarSync],
      providers: [
        { provide: CalendarFeedApi, useValue: api },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CalendarSync);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Could not load calendar sync status.',
    );
  });
});
