import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { ToastService } from '@by-iara/shared-ui';
import { SettingsApi } from './settings-api';
import { Settings } from './settings';

describe('Settings', () => {
  let fixture: ComponentFixture<Settings>;
  let settingsApi: {
    get: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let toast: { show: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    settingsApi = {
      get: vi.fn(() =>
        of({
          appointmentBufferMinutes: 15,
          maxDailyBookings: 3,
          minimumBookingNoticeHours: 0,
          bookingReminderEnabled: false,
          bookingReminderHoursBefore: 24,
        }),
      ),
      update: vi.fn((input) => of(input)),
    };
    toast = { show: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [Settings, ReactiveFormsModule],
      providers: [
        { provide: SettingsApi, useValue: settingsApi },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Settings);
    fixture.detectChanges();
  });

  it('loads the current booking settings', () => {
    const input = fixture.nativeElement.querySelector(
      '#appointment-buffer',
    ) as HTMLInputElement;

    expect(settingsApi.get).toHaveBeenCalledOnce();
    expect(input.value).toBe('15');
    expect(
      (
        fixture.nativeElement.querySelector(
          '#daily-booking-limit',
        ) as HTMLInputElement
      ).value,
    ).toBe('3');
    expect(fixture.nativeElement.textContent).toContain(
      'Time between appointments',
    );
  });

  it('saves a changed appointment buffer', () => {
    const input = fixture.nativeElement.querySelector(
      '#appointment-buffer',
    ) as HTMLInputElement;
    input.value = '30';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(settingsApi.update).toHaveBeenCalledWith({
      appointmentBufferMinutes: 30,
      maxDailyBookings: 3,
      minimumBookingNoticeHours: 0,
      bookingReminderEnabled: false,
      bookingReminderHoursBefore: 24,
    });
    expect(toast.show).toHaveBeenCalledWith('Settings saved.', 'success');
  });

  it('saves an unlimited daily booking setting', () => {
    const checkbox = fixture.nativeElement.querySelector(
      '.unlimited-option input',
    ) as HTMLInputElement;
    checkbox.click();
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(settingsApi.update).toHaveBeenCalledWith({
      appointmentBufferMinutes: 15,
      maxDailyBookings: null,
      minimumBookingNoticeHours: 0,
      bookingReminderEnabled: false,
      bookingReminderHoursBefore: 24,
    });
  });

  it('enables a configurable booking reminder', () => {
    const enabled = fixture.nativeElement.querySelector(
      '.toggle-option input',
    ) as HTMLInputElement;
    enabled.click();
    fixture.detectChanges();

    const hours = fixture.nativeElement.querySelector(
      '#booking-reminder-hours',
    ) as HTMLInputElement;
    hours.value = '12';
    hours.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(settingsApi.update).toHaveBeenCalledWith({
      appointmentBufferMinutes: 15,
      maxDailyBookings: 3,
      minimumBookingNoticeHours: 0,
      bookingReminderEnabled: true,
      bookingReminderHoursBefore: 12,
    });
  });

  it('requires reminder lead time to be between 1 and 168 hours', () => {
    const enabled = fixture.nativeElement.querySelector(
      '.toggle-option input',
    ) as HTMLInputElement;
    enabled.click();

    const hours = fixture.nativeElement.querySelector(
      '#booking-reminder-hours',
    ) as HTMLInputElement;
    hours.value = '169';
    hours.dispatchEvent(new Event('input'));
    hours.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(
      (fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      'whole number from 1 to 168 hours',
    );
  });

  it('saves a configurable minimum booking notice', () => {
    const hours = fixture.nativeElement.querySelector(
      '#minimum-booking-notice',
    ) as HTMLInputElement;
    hours.value = '24';
    hours.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(settingsApi.update).toHaveBeenCalledWith({
      appointmentBufferMinutes: 15,
      maxDailyBookings: 3,
      minimumBookingNoticeHours: 24,
      bookingReminderEnabled: false,
      bookingReminderHoursBefore: 24,
    });
  });

  it('requires minimum booking notice to be a whole number within one year', () => {
    const hours = fixture.nativeElement.querySelector(
      '#minimum-booking-notice',
    ) as HTMLInputElement;
    hours.value = '8761';
    hours.dispatchEvent(new Event('input'));
    hours.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(
      (fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      'whole number from 0 to 8760 hours',
    );
  });

  it('rejects buffers outside five-minute increments', () => {
    const input = fixture.nativeElement.querySelector(
      '#appointment-buffer',
    ) as HTMLInputElement;
    input.value = '12';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    const save = fixture.nativeElement.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      'in 5-minute increments',
    );
  });

  it('offers a retry when settings cannot load', () => {
    settingsApi.get.mockReturnValueOnce(throwError(() => new Error('offline')));
    const failedFixture = TestBed.createComponent(Settings);
    failedFixture.detectChanges();

    expect(failedFixture.nativeElement.textContent).toContain(
      'Could not load settings.',
    );
    expect(failedFixture.nativeElement.textContent).toContain('Try again');
  });
});
