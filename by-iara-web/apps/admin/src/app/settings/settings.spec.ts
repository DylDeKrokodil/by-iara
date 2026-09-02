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
      get: vi.fn(() => of({ appointmentBufferMinutes: 15 })),
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

  it('loads the current appointment buffer', () => {
    const input = fixture.nativeElement.querySelector(
      '#appointment-buffer',
    ) as HTMLInputElement;

    expect(settingsApi.get).toHaveBeenCalledOnce();
    expect(input.value).toBe('15');
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
    });
    expect(toast.show).toHaveBeenCalledWith('Settings saved.', 'success');
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
    settingsApi.get.mockReturnValueOnce(
      throwError(() => new Error('offline')),
    );
    const failedFixture = TestBed.createComponent(Settings);
    failedFixture.detectChanges();

    expect(failedFixture.nativeElement.textContent).toContain(
      'Could not load settings.',
    );
    expect(failedFixture.nativeElement.textContent).toContain('Try again');
  });
});
